import type {
  TeamInvitationDispatchResult,
} from "../team/teamInvitationDispatchProcessor.ts";
import {
  recordOperationalTelemetry,
  type OperationalTelemetrySink,
  type ProviderRequestTelemetry,
} from "./operationalTelemetry.ts";
import {
  createProviderRequestTelemetryScope,
  type ProviderRequestTelemetryScope,
} from "./providerRequestTelemetry.ts";

export interface TeamInvitationDeliveryTelemetryClock {
  readonly now: () => Date;
}

interface TeamInvitationDispatchProcessor {
  readonly process: (
    tenantId: unknown,
    deliveryKey: unknown,
  ) => Promise<TeamInvitationDispatchResult>;
}

function readClock(
  clock: Readonly<TeamInvitationDeliveryTelemetryClock>,
): Date | null {
  try {
    const value = clock.now();
    return value instanceof Date && Number.isFinite(value.getTime())
      ? value
      : null;
  } catch {
    return null;
  }
}

async function recordAttempt(
  sink: Readonly<OperationalTelemetrySink>,
  started: Date | null,
  completed: Date | null,
  outcome: TeamInvitationDispatchResult["outcome"] | "failed",
  providerRequests: readonly ProviderRequestTelemetry[],
): Promise<void> {
  if (
    started === null ||
    completed === null ||
    completed.getTime() < started.getTime()
  ) {
    return;
  }

  await recordOperationalTelemetry(sink, {
    version: 1,
    kind: "delivery-attempt",
    queue: "team-invitation",
    outcome,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMilliseconds: completed.getTime() - started.getTime(),
    ...(providerRequests.length === 0 ? {} : { providerRequests }),
  });
}

export function observeTeamInvitationDispatchProcessor(
  processor: Readonly<TeamInvitationDispatchProcessor>,
  sink: Readonly<OperationalTelemetrySink>,
  clock: Readonly<TeamInvitationDeliveryTelemetryClock>,
  providerRequestTelemetry: Readonly<ProviderRequestTelemetryScope> =
    createProviderRequestTelemetryScope(),
): Readonly<TeamInvitationDispatchProcessor> {
  if (
    typeof processor?.process !== "function" ||
    typeof sink?.record !== "function" ||
    typeof clock?.now !== "function" ||
    typeof providerRequestTelemetry?.run !== "function" ||
    typeof providerRequestTelemetry?.snapshot !== "function"
  ) {
    throw new Error("Team invitation delivery telemetry is invalid");
  }

  return Object.freeze({
    async process(tenantId: unknown, deliveryKey: unknown) {
      return providerRequestTelemetry.run(async () => {
        const started = readClock(clock);
        try {
          const result = await processor.process(tenantId, deliveryKey);
          await recordAttempt(
            sink,
            started,
            readClock(clock),
            result.outcome,
            providerRequestTelemetry.snapshot(),
          );
          return result;
        } catch (error) {
          await recordAttempt(
            sink,
            started,
            readClock(clock),
            "failed",
            providerRequestTelemetry.snapshot(),
          );
          throw error;
        }
      });
    },
  });
}
