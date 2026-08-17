import {
  railwayWorkerSchedulerId,
  workerSchedulerMaximumCatchUpTicks,
  workerSchedulerMaximumLeaseSeconds,
  workerSchedulerMinimumLeaseSeconds,
  workerSchedulerOwnerKeyPattern,
  type WorkerSchedulerLeaseRepository,
} from "../../shared/domain/workerScheduler.ts";

export interface RailwayWorkerSchedulerClock {
  readonly now: () => Date;
}

export interface RailwayWorkerScheduledTask {
  readonly run: () => Promise<unknown>;
}

export interface RailwayWorkerSchedulerOptions {
  readonly ownerKey: string;
  readonly leases: WorkerSchedulerLeaseRepository;
  readonly campaigns: RailwayWorkerScheduledTask;
  readonly invitationExpirations: RailwayWorkerScheduledTask;
  readonly clock: RailwayWorkerSchedulerClock;
  readonly leaseSeconds?: number;
  readonly maximumCatchUpTicks?: number;
}

export type RailwayWorkerSchedulerResult = Readonly<{
  outcome: "completed" | "idle";
  completedTicks: number;
  lastCompletedTick: string | null;
}>;

export type RailwayWorkerSchedulerErrorCode =
  | "options-invalid"
  | "clock-invalid"
  | "lease-unavailable"
  | "task-failed"
  | "claim-lost";

export class RailwayWorkerSchedulerError extends Error {
  readonly code: RailwayWorkerSchedulerErrorCode;

  constructor(code: RailwayWorkerSchedulerErrorCode) {
    super(`Railway worker scheduler failed: ${code}`);
    this.name = "RailwayWorkerSchedulerError";
    this.code = code;
  }
}

const optionKeys = Object.freeze([
  "campaigns",
  "clock",
  "invitationExpirations",
  "leases",
  "leaseSeconds",
  "maximumCatchUpTicks",
  "ownerKey",
]);

function requireBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new RailwayWorkerSchedulerError("options-invalid");
  }

  return Number(value);
}

function requireOptions(options: Readonly<RailwayWorkerSchedulerOptions>): {
  readonly leaseSeconds: number;
  readonly maximumCatchUpTicks: number;
} {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    typeof options.ownerKey !== "string" ||
    !workerSchedulerOwnerKeyPattern.test(options.ownerKey) ||
    typeof options.leases?.claimNext !== "function" ||
    typeof options.leases?.complete !== "function" ||
    typeof options.campaigns?.run !== "function" ||
    typeof options.invitationExpirations?.run !== "function" ||
    typeof options.clock?.now !== "function"
  ) {
    throw new RailwayWorkerSchedulerError("options-invalid");
  }

  return Object.freeze({
    leaseSeconds: requireBoundedInteger(
      options.leaseSeconds ?? 120,
      workerSchedulerMinimumLeaseSeconds,
      workerSchedulerMaximumLeaseSeconds,
    ),
    maximumCatchUpTicks: requireBoundedInteger(
      options.maximumCatchUpTicks ?? workerSchedulerMaximumCatchUpTicks,
      1,
      workerSchedulerMaximumCatchUpTicks,
    ),
  });
}

function readClock(clock: RailwayWorkerSchedulerClock): Readonly<{
  observedAt: string;
  currentTick: string;
}> {
  const current = clock.now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new RailwayWorkerSchedulerError("clock-invalid");
  }

  const observedAt = current.toISOString();
  const tick = new Date(current.getTime());
  tick.setUTCSeconds(0, 0);

  return Object.freeze({
    observedAt,
    currentTick: tick.toISOString(),
  });
}

export function createRailwayWorkerScheduler(
  options: Readonly<RailwayWorkerSchedulerOptions>,
): Readonly<{ run: () => Promise<RailwayWorkerSchedulerResult> }> {
  const configuration = requireOptions(options);

  return Object.freeze({
    async run() {
      let completedTicks = 0;
      let lastCompletedTick: string | null = null;

      while (completedTicks < configuration.maximumCatchUpTicks) {
        const clock = readClock(options.clock);
        let claimResult;

        try {
          claimResult = await options.leases.claimNext({
            schedulerId: railwayWorkerSchedulerId,
            ownerKey: options.ownerKey,
            currentTick: clock.currentTick,
            observedAt: clock.observedAt,
            leaseSeconds: configuration.leaseSeconds,
            maximumCatchUpTicks: configuration.maximumCatchUpTicks,
          });
        } catch {
          throw new RailwayWorkerSchedulerError("lease-unavailable");
        }

        if (claimResult.outcome === "not-claimed") {
          break;
        }

        if (
          claimResult.outcome !== "claimed" ||
          claimResult.claim === null ||
          claimResult.claim.schedulerId !== railwayWorkerSchedulerId ||
          claimResult.claim.ownerKey !== options.ownerKey ||
          claimResult.claim.tick > clock.currentTick
        ) {
          throw new RailwayWorkerSchedulerError("lease-unavailable");
        }

        const taskResults = await Promise.allSettled([
          Promise.resolve().then(() => options.campaigns.run()),
          Promise.resolve().then(() => options.invitationExpirations.run()),
        ]);

        if (taskResults.some((result) => result.status === "rejected")) {
          throw new RailwayWorkerSchedulerError("task-failed");
        }

        const completedAt = readClock(options.clock).observedAt;
        let completion;

        try {
          completion = await options.leases.complete({
            schedulerId: railwayWorkerSchedulerId,
            ownerKey: options.ownerKey,
            fencingToken: claimResult.claim.fencingToken,
            tick: claimResult.claim.tick,
            completedAt,
          });
        } catch {
          throw new RailwayWorkerSchedulerError("lease-unavailable");
        }

        if (
          completion.outcome !== "completed" ||
          completion.completedTick !== claimResult.claim.tick
        ) {
          throw new RailwayWorkerSchedulerError("claim-lost");
        }

        completedTicks += 1;
        lastCompletedTick = completion.completedTick;
      }

      return Object.freeze({
        outcome: completedTicks === 0 ? "idle" : "completed",
        completedTicks,
        lastCompletedTick,
      });
    },
  });
}
