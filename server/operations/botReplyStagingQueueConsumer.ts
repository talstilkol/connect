import type {
  BotReplyStagingDurableCompleteResult,
  BotReplyStagingDurableRunRepository,
  BotReplyStagingScenarioExecutor,
} from "./botReplyStagingDurableRunner.ts";
import {
  buildBotReplyStagingEvidenceFromReceipt,
} from "./botReplyStagingEvidenceBuilder.ts";
import {
  deriveBotReplyStagingReceiptDigest,
} from "./botReplyStagingReceiptAttestation.ts";
import {
  parseBotReplyStagingQueueMessage,
  type BotReplyStagingQueueMessage,
} from "./botReplyStagingQueueMessage.ts";

export type BotReplyStagingQueueConsumerErrorCode =
  | "BOT_REPLY_STAGING_QUEUE_MESSAGE_INVALID"
  | "BOT_REPLY_STAGING_QUEUE_CLOCK_INVALID"
  | "BOT_REPLY_STAGING_QUEUE_LEASE_EXPIRED"
  | "BOT_REPLY_STAGING_QUEUE_EXECUTION_FAILED"
  | "BOT_REPLY_STAGING_QUEUE_RECEIPT_INVALID"
  | "BOT_REPLY_STAGING_QUEUE_COMPLETION_UNAVAILABLE"
  | "BOT_REPLY_STAGING_QUEUE_COMPLETION_CONFLICT"
  | "BOT_REPLY_STAGING_QUEUE_COMPLETION_INVALID";

export class BotReplyStagingQueueConsumerError extends Error {
  readonly code: BotReplyStagingQueueConsumerErrorCode;

  constructor(code: BotReplyStagingQueueConsumerErrorCode) {
    super(code);
    this.name = "BotReplyStagingQueueConsumerError";
    this.code = code;
  }
}

export interface BotReplyStagingQueueConsumerDependencies {
  readonly clock: Readonly<{ now(): Date }>;
  readonly executor: BotReplyStagingScenarioExecutor;
  readonly runs: BotReplyStagingDurableRunRepository;
}

function fail(code: BotReplyStagingQueueConsumerErrorCode): never {
  throw new BotReplyStagingQueueConsumerError(code);
}

function timestamp(clock: Readonly<{ now(): Date }>): string {
  let value: Date;
  try {
    value = clock.now();
  } catch {
    fail("BOT_REPLY_STAGING_QUEUE_CLOCK_INVALID");
  }
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    fail("BOT_REPLY_STAGING_QUEUE_CLOCK_INVALID");
  }
  return value.toISOString();
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function requireClosedReceipt(
  receipt: unknown,
  message: Readonly<BotReplyStagingQueueMessage>,
  completedAt: string,
): unknown {
  try {
    buildBotReplyStagingEvidenceFromReceipt({
      receipt,
      releaseManifest: Object.freeze({
        schemaVersion: 1,
        releaseId: message.run.releaseId,
        commitSha: message.run.commitSha,
      }),
      artifactDigest: message.run.artifactDigest,
      now: new Date(completedAt),
    });
  } catch {
    fail("BOT_REPLY_STAGING_QUEUE_RECEIPT_INVALID");
  }
  return receipt;
}

function requireCompletion(
  result: BotReplyStagingDurableCompleteResult,
  message: Readonly<BotReplyStagingQueueMessage>,
  receiptDigest: string,
): Exclude<
  BotReplyStagingDurableCompleteResult,
  { outcome: "conflict" | "lease-expired" }
> {
  if (!result || result.runKey !== message.run.runKey) {
    fail("BOT_REPLY_STAGING_QUEUE_COMPLETION_INVALID");
  }
  if (result.outcome === "conflict") {
    fail("BOT_REPLY_STAGING_QUEUE_COMPLETION_CONFLICT");
  }
  if (result.outcome === "lease-expired") {
    fail("BOT_REPLY_STAGING_QUEUE_LEASE_EXPIRED");
  }
  if (
    (result.outcome !== "completed" && result.outcome !== "replayed") ||
    Object.keys(result).sort().join(",") !==
      "auditKey,completedAt,outcome,receipt,runKey" ||
    result.auditKey !== message.auditKey ||
    !isCanonicalTimestamp(result.completedAt) ||
    Date.parse(result.completedAt) > Date.parse(message.leaseExpiresAt) ||
    deriveBotReplyStagingReceiptDigest(result.receipt) !== receiptDigest
  ) {
    fail("BOT_REPLY_STAGING_QUEUE_COMPLETION_INVALID");
  }
  return result;
}

function requireDependencies(
  dependencies: Readonly<BotReplyStagingQueueConsumerDependencies>,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "clock,executor,runs" ||
    typeof dependencies.clock?.now !== "function" ||
    typeof dependencies.executor?.execute !== "function" ||
    typeof dependencies.runs?.claim !== "function" ||
    typeof dependencies.runs?.complete !== "function"
  ) {
    throw new Error("Bot reply staging queue consumer dependencies are invalid");
  }
}

export function createBotReplyStagingQueueConsumer(
  dependencies: Readonly<BotReplyStagingQueueConsumerDependencies>,
) {
  requireDependencies(dependencies);

  return Object.freeze({
    async handle(rawMessage: unknown): Promise<Readonly<{
      outcome: "completed" | "replayed";
      runKey: string;
      auditKey: string;
      completedAt: string;
    }>> {
      const message = parseBotReplyStagingQueueMessage(rawMessage);
      if (message === null) {
        fail("BOT_REPLY_STAGING_QUEUE_MESSAGE_INVALID");
      }
      const startedAt = timestamp(dependencies.clock);
      if (Date.parse(startedAt) >= Date.parse(message.leaseExpiresAt)) {
        fail("BOT_REPLY_STAGING_QUEUE_LEASE_EXPIRED");
      }

      let receipt: unknown;
      try {
        receipt = await dependencies.executor.execute(message.run, {
          runKey: message.run.runKey,
          auditKey: message.auditKey,
          claimVersion: message.claimVersion,
          leaseExpiresAt: message.leaseExpiresAt,
        });
      } catch {
        fail("BOT_REPLY_STAGING_QUEUE_EXECUTION_FAILED");
      }
      const completedAt = timestamp(dependencies.clock);
      if (Date.parse(completedAt) > Date.parse(message.leaseExpiresAt)) {
        fail("BOT_REPLY_STAGING_QUEUE_LEASE_EXPIRED");
      }
      receipt = requireClosedReceipt(receipt, message, completedAt);
      const receiptDigest = deriveBotReplyStagingReceiptDigest(receipt);

      let rawCompletion: BotReplyStagingDurableCompleteResult;
      try {
        rawCompletion = await dependencies.runs.complete({
          runKey: message.run.runKey,
          requestDigest: message.requestDigest,
          expectedClaimVersion: message.claimVersion,
          receipt,
          receiptDigest,
          completedAt,
        });
      } catch {
        fail("BOT_REPLY_STAGING_QUEUE_COMPLETION_UNAVAILABLE");
      }
      const completion = requireCompletion(
        rawCompletion,
        message,
        receiptDigest,
      );
      requireClosedReceipt(
        completion.receipt,
        message,
        completion.completedAt,
      );
      return Object.freeze({
        outcome: completion.outcome,
        runKey: completion.runKey,
        auditKey: completion.auditKey,
        completedAt: completion.completedAt,
      });
    },
  });
}
