import type {
  BotReplyStagingDurableReadResult,
  BotReplyStagingDurableRunStatusRepository,
  BotReplyStagingScenarioExecutor,
} from "./botReplyStagingDurableRunner.ts";
import type {
  BotReplyStagingLiveRunInput,
} from "./botReplyStagingLiveDriver.ts";
import {
  createBotReplyStagingQueueMessage,
  type BotReplyStagingQueueClaim,
} from "./botReplyStagingQueueMessage.ts";
import type {
  BotReplyStagingQueuePublisher,
} from "../platform/railwayBullMqBotReplyStagingQueue.ts";

export type BotReplyStagingQueuedExecutorErrorCode =
  | "BOT_REPLY_STAGING_QUEUED_CLOCK_INVALID"
  | "BOT_REPLY_STAGING_QUEUED_PUBLISH_FAILED"
  | "BOT_REPLY_STAGING_QUEUED_READ_UNAVAILABLE"
  | "BOT_REPLY_STAGING_QUEUED_RUN_CONFLICT"
  | "BOT_REPLY_STAGING_QUEUED_STATUS_INVALID"
  | "BOT_REPLY_STAGING_QUEUED_LEASE_EXPIRED";

export class BotReplyStagingQueuedExecutorError extends Error {
  readonly code: BotReplyStagingQueuedExecutorErrorCode;

  constructor(code: BotReplyStagingQueuedExecutorErrorCode) {
    super(code);
    this.name = "BotReplyStagingQueuedExecutorError";
    this.code = code;
  }
}

export interface BotReplyStagingQueuedExecutorDependencies {
  readonly clock: Readonly<{ now(): Date }>;
  readonly pollIntervalMilliseconds: number;
  readonly publisher: BotReplyStagingQueuePublisher;
  readonly runs: BotReplyStagingDurableRunStatusRepository;
  readonly wait: (milliseconds: number) => Promise<void>;
}

function fail(code: BotReplyStagingQueuedExecutorErrorCode): never {
  throw new BotReplyStagingQueuedExecutorError(code);
}

function nowMilliseconds(clock: Readonly<{ now(): Date }>): number {
  let value: Date;
  try {
    value = clock.now();
  } catch {
    fail("BOT_REPLY_STAGING_QUEUED_CLOCK_INVALID");
  }
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    fail("BOT_REPLY_STAGING_QUEUED_CLOCK_INVALID");
  }
  return value.getTime();
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function requireReadResult(
  result: BotReplyStagingDurableReadResult,
  claim: Readonly<BotReplyStagingQueueClaim>,
): BotReplyStagingDurableReadResult {
  if (!result || result.runKey !== claim.runKey) {
    fail("BOT_REPLY_STAGING_QUEUED_STATUS_INVALID");
  }
  if (result.outcome === "missing-or-conflict") {
    if (Object.keys(result).sort().join(",") !== "outcome,runKey") {
      fail("BOT_REPLY_STAGING_QUEUED_STATUS_INVALID");
    }
    fail("BOT_REPLY_STAGING_QUEUED_RUN_CONFLICT");
  }
  if (result.outcome === "running") {
    if (
      Object.keys(result).sort().join(",") !==
        "auditKey,claimVersion,leaseExpiresAt,outcome,runKey" ||
      result.auditKey !== claim.auditKey ||
      result.claimVersion !== claim.claimVersion ||
      result.leaseExpiresAt !== claim.leaseExpiresAt
    ) {
      fail("BOT_REPLY_STAGING_QUEUED_STATUS_INVALID");
    }
    return result;
  }
  if (
    result.outcome !== "completed" ||
    Object.keys(result).sort().join(",") !==
      "auditKey,claimVersion,completedAt,outcome,receipt,runKey" ||
    result.auditKey !== claim.auditKey ||
    result.claimVersion !== claim.claimVersion ||
    !isCanonicalTimestamp(result.completedAt) ||
    Date.parse(result.completedAt) > Date.parse(claim.leaseExpiresAt) ||
    typeof result.receipt !== "object" ||
    result.receipt === null ||
    Array.isArray(result.receipt)
  ) {
    fail("BOT_REPLY_STAGING_QUEUED_STATUS_INVALID");
  }
  return result;
}

function requireDependencies(
  dependencies: Readonly<BotReplyStagingQueuedExecutorDependencies>,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "clock,pollIntervalMilliseconds,publisher,runs,wait" ||
    typeof dependencies.clock?.now !== "function" ||
    !Number.isSafeInteger(dependencies.pollIntervalMilliseconds) ||
    dependencies.pollIntervalMilliseconds < 50 ||
    dependencies.pollIntervalMilliseconds > 5_000 ||
    typeof dependencies.publisher?.publish !== "function" ||
    typeof dependencies.runs?.claim !== "function" ||
    typeof dependencies.runs?.complete !== "function" ||
    typeof dependencies.runs?.read !== "function" ||
    typeof dependencies.wait !== "function"
  ) {
    throw new Error("Bot reply staging queued executor dependencies are invalid");
  }
}

export function createBotReplyStagingQueuedExecutor(
  dependencies: Readonly<BotReplyStagingQueuedExecutorDependencies>,
): BotReplyStagingScenarioExecutor {
  requireDependencies(dependencies);

  return Object.freeze({
    async execute(
      run: Readonly<BotReplyStagingLiveRunInput>,
      claim: Readonly<BotReplyStagingQueueClaim>,
    ): Promise<unknown> {
      const message = createBotReplyStagingQueueMessage(run, claim);
      try {
        await dependencies.publisher.publish(message);
      } catch {
        fail("BOT_REPLY_STAGING_QUEUED_PUBLISH_FAILED");
      }

      const leaseExpiresAt = Date.parse(message.leaseExpiresAt);
      for (;;) {
        let rawStatus: BotReplyStagingDurableReadResult;
        try {
          rawStatus = await dependencies.runs.read({
            runKey: message.run.runKey,
            requestDigest: message.requestDigest,
          });
        } catch {
          fail("BOT_REPLY_STAGING_QUEUED_READ_UNAVAILABLE");
        }
        const status = requireReadResult(rawStatus, claim);
        if (status.outcome === "completed") {
          return status.receipt;
        }

        const remainingMilliseconds =
          leaseExpiresAt - nowMilliseconds(dependencies.clock);
        if (remainingMilliseconds <= 0) {
          fail("BOT_REPLY_STAGING_QUEUED_LEASE_EXPIRED");
        }
        try {
          await dependencies.wait(Math.min(
            dependencies.pollIntervalMilliseconds,
            remainingMilliseconds,
          ));
        } catch {
          fail("BOT_REPLY_STAGING_QUEUED_READ_UNAVAILABLE");
        }
      }
    },
  });
}

export const waitForBotReplyStagingPoll = Object.freeze(
  async (milliseconds: number): Promise<void> => {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 1) {
      throw new Error("Bot reply staging poll duration is invalid");
    }
    await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  },
);
