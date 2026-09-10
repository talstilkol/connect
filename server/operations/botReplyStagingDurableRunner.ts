import type {
  BotReplyStagingDurableRunResult,
  BotReplyStagingLiveRunInput,
} from "./botReplyStagingLiveDriver.ts";
import {
  buildBotReplyStagingEvidenceFromReceipt,
} from "./botReplyStagingEvidenceBuilder.ts";
import {
  deriveBotReplyStagingReceiptDigest,
} from "./botReplyStagingReceiptAttestation.ts";
import {
  BotReplyStagingDurableRunnerError,
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "./botReplyStagingDurableIdentity.ts";

export {
  BotReplyStagingDurableRunnerError,
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "./botReplyStagingDurableIdentity.ts";

const auditKeyPattern = /^bot_reply_staging_audit_v1_[a-f0-9]{64}$/;

export interface BotReplyStagingDurableClaimInput {
  readonly run: Readonly<BotReplyStagingLiveRunInput>;
  readonly requestDigest: string;
  readonly auditKey: string;
  readonly claimedAt: string;
  readonly leaseExpiresAt: string;
}

export type BotReplyStagingDurableClaimResult = Readonly<
  | {
      outcome: "claimed";
      runKey: string;
      auditKey: string;
      claimVersion: number;
      leaseExpiresAt: string;
    }
  | {
      outcome: "in-progress";
      runKey: string;
    }
  | {
      outcome: "replayed";
      runKey: string;
      auditKey: string;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "conflict";
      runKey: string;
    }
>;

export interface BotReplyStagingDurableCompleteInput {
  readonly runKey: string;
  readonly requestDigest: string;
  readonly expectedClaimVersion: number;
  readonly receipt: unknown;
  readonly receiptDigest: string;
  readonly completedAt: string;
}

export type BotReplyStagingDurableCompleteResult = Readonly<
  | {
      outcome: "completed" | "replayed";
      runKey: string;
      auditKey: string;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "conflict" | "lease-expired";
      runKey: string;
    }
>;

export interface BotReplyStagingDurableRunRepository {
  claim(
    input: Readonly<BotReplyStagingDurableClaimInput>,
  ): Promise<BotReplyStagingDurableClaimResult>;
  complete(
    input: Readonly<BotReplyStagingDurableCompleteInput>,
  ): Promise<BotReplyStagingDurableCompleteResult>;
}

export interface BotReplyStagingDurableReadInput {
  readonly runKey: string;
  readonly requestDigest: string;
}

export type BotReplyStagingDurableReadResult = Readonly<
  | {
      outcome: "running";
      runKey: string;
      auditKey: string;
      claimVersion: number;
      leaseExpiresAt: string;
    }
  | {
      outcome: "completed";
      runKey: string;
      auditKey: string;
      claimVersion: number;
      completedAt: string;
      receipt: unknown;
    }
  | {
      outcome: "missing-or-conflict";
      runKey: string;
    }
>;

export interface BotReplyStagingDurableRunStatusRepository
  extends BotReplyStagingDurableRunRepository {
  read(
    input: Readonly<BotReplyStagingDurableReadInput>,
  ): Promise<BotReplyStagingDurableReadResult>;
}

export interface BotReplyStagingScenarioExecutor {
  execute(
    run: Readonly<BotReplyStagingLiveRunInput>,
    claim: Readonly<{
      runKey: string;
      auditKey: string;
      claimVersion: number;
      leaseExpiresAt: string;
    }>,
  ): Promise<unknown>;
}

export interface BotReplyStagingDurableRunnerDependencies {
  readonly leaseDurationSeconds: number;
  readonly clock: Readonly<{ now(): Date }>;
  readonly runs: BotReplyStagingDurableRunRepository;
  readonly executor: BotReplyStagingScenarioExecutor;
}

function fail(code: string): never {
  throw new BotReplyStagingDurableRunnerError(code);
}

function timestamp(clock: Readonly<{ now(): Date }>): string {
  let value: Date;
  try {
    value = clock.now();
  } catch {
    fail("BOT_REPLY_STAGING_DURABLE_CLOCK_UNAVAILABLE");
  }
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    fail("BOT_REPLY_STAGING_DURABLE_CLOCK_INVALID");
  }
  return value.toISOString();
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) {
    return false;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function requireDependencies(
  dependencies: Readonly<BotReplyStagingDurableRunnerDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "clock,executor,leaseDurationSeconds,runs" ||
    !Number.isSafeInteger(dependencies.leaseDurationSeconds) ||
    dependencies.leaseDurationSeconds < 60 ||
    dependencies.leaseDurationSeconds > 3_600 ||
    typeof dependencies.clock?.now !== "function" ||
    typeof dependencies.runs?.claim !== "function" ||
    typeof dependencies.runs?.complete !== "function" ||
    typeof dependencies.executor?.execute !== "function"
  ) {
    throw new Error("Bot reply staging durable runner dependencies are invalid");
  }
}

function requireClaimResult(
  result: BotReplyStagingDurableClaimResult,
  runKey: string,
  auditKey: string,
): BotReplyStagingDurableClaimResult {
  if (!result || result.runKey !== runKey) {
    fail("BOT_REPLY_STAGING_DURABLE_CLAIM_INVALID");
  }
  if (result.outcome === "in-progress" || result.outcome === "conflict") {
    if (Object.keys(result).sort().join(",") !== "outcome,runKey") {
      fail("BOT_REPLY_STAGING_DURABLE_CLAIM_INVALID");
    }
    return result;
  }
  if (result.outcome === "replayed") {
    if (
      Object.keys(result).sort().join(",") !==
        "auditKey,completedAt,outcome,receipt,runKey" ||
      result.auditKey !== auditKey ||
      !auditKeyPattern.test(result.auditKey) ||
      !isCanonicalTimestamp(result.completedAt)
    ) {
      fail("BOT_REPLY_STAGING_DURABLE_CLAIM_INVALID");
    }
    return result;
  }
  if (
    result.outcome !== "claimed" ||
    Object.keys(result).sort().join(",") !==
      "auditKey,claimVersion,leaseExpiresAt,outcome,runKey" ||
    result.auditKey !== auditKey ||
    !auditKeyPattern.test(result.auditKey) ||
    !Number.isSafeInteger(result.claimVersion) ||
    result.claimVersion < 1 ||
    !Number.isFinite(Date.parse(result.leaseExpiresAt))
  ) {
    fail("BOT_REPLY_STAGING_DURABLE_CLAIM_INVALID");
  }
  return result;
}

function requireCompleteResult(
  result: BotReplyStagingDurableCompleteResult,
  runKey: string,
  auditKey: string,
): Exclude<
  BotReplyStagingDurableCompleteResult,
  { outcome: "conflict" | "lease-expired" }
> {
  if (!result || result.runKey !== runKey) {
    fail("BOT_REPLY_STAGING_DURABLE_COMPLETION_INVALID");
  }
  if (result.outcome === "conflict") {
    fail("BOT_REPLY_STAGING_DURABLE_COMPLETION_CONFLICT");
  }
  if (result.outcome === "lease-expired") {
    fail("BOT_REPLY_STAGING_DURABLE_LEASE_EXPIRED");
  }
  if (
    (result.outcome !== "completed" && result.outcome !== "replayed") ||
    Object.keys(result).sort().join(",") !==
      "auditKey,completedAt,outcome,receipt,runKey" ||
    result.auditKey !== auditKey ||
    !auditKeyPattern.test(result.auditKey) ||
    !isCanonicalTimestamp(result.completedAt)
  ) {
    fail("BOT_REPLY_STAGING_DURABLE_COMPLETION_INVALID");
  }
  return result;
}

function requireClosedReceipt(
  receipt: unknown,
  run: Readonly<BotReplyStagingLiveRunInput>,
  completedAt: string,
): unknown {
  try {
    buildBotReplyStagingEvidenceFromReceipt({
      receipt,
      releaseManifest: Object.freeze({
        schemaVersion: 1,
        releaseId: run.releaseId,
        commitSha: run.commitSha,
      }),
      artifactDigest: run.artifactDigest,
      now: new Date(completedAt),
    });
  } catch {
    fail("BOT_REPLY_STAGING_DURABLE_RECEIPT_INVALID");
  }
  return receipt;
}

export function createBotReplyStagingDurableRunner(
  dependencies: Readonly<BotReplyStagingDurableRunnerDependencies>,
) {
  requireDependencies(dependencies);

  return Object.freeze({
    async run(
      run: Readonly<BotReplyStagingLiveRunInput>,
    ): Promise<BotReplyStagingDurableRunResult> {
      const claimedAt = timestamp(dependencies.clock);
      const requestDigest =
        deriveBotReplyStagingDurableRequestDigest(run);
      const auditKey = deriveBotReplyStagingDurableAuditKey(
        run.runKey,
        requestDigest,
      );
      const leaseExpiresAt = new Date(
        Date.parse(claimedAt) +
          dependencies.leaseDurationSeconds * 1_000,
      ).toISOString();

      let rawClaim;
      try {
        rawClaim = await dependencies.runs.claim({
          run,
          requestDigest,
          auditKey,
          claimedAt,
          leaseExpiresAt,
        });
      } catch {
        fail("BOT_REPLY_STAGING_DURABLE_CLAIM_UNAVAILABLE");
      }
      const claim = requireClaimResult(
        rawClaim,
        run.runKey,
        auditKey,
      );
      if (claim.outcome === "in-progress") {
        return Object.freeze({ outcome: "in-progress", runKey: run.runKey });
      }
      if (claim.outcome === "conflict") {
        fail("BOT_REPLY_STAGING_DURABLE_REQUEST_CONFLICT");
      }
      if (claim.outcome === "replayed") {
        const receipt = requireClosedReceipt(
          claim.receipt,
          run,
          claim.completedAt,
        );
        return Object.freeze({
          outcome: "replayed",
          runKey: claim.runKey,
          auditKey: claim.auditKey,
          completedAt: claim.completedAt,
          receipt,
        });
      }

      let receipt: unknown;
      try {
        receipt = await dependencies.executor.execute(run, {
          runKey: claim.runKey,
          auditKey: claim.auditKey,
          claimVersion: claim.claimVersion,
          leaseExpiresAt: claim.leaseExpiresAt,
        });
      } catch {
        fail("BOT_REPLY_STAGING_DURABLE_EXECUTION_FAILED");
      }
      const completedAt = timestamp(dependencies.clock);
      receipt = requireClosedReceipt(receipt, run, completedAt);
      let rawCompletion;
      try {
        rawCompletion = await dependencies.runs.complete({
          runKey: run.runKey,
          requestDigest,
          expectedClaimVersion: claim.claimVersion,
          receipt,
          receiptDigest: deriveBotReplyStagingReceiptDigest(receipt),
          completedAt,
        });
      } catch {
        fail("BOT_REPLY_STAGING_DURABLE_COMPLETION_UNAVAILABLE");
      }
      const completion = requireCompleteResult(
        rawCompletion,
        run.runKey,
        auditKey,
      );
      const completedReceipt = requireClosedReceipt(
        completion.receipt,
        run,
        completion.completedAt,
      );
      return Object.freeze({
        outcome: completion.outcome,
        runKey: completion.runKey,
        auditKey: completion.auditKey,
        completedAt: completion.completedAt,
        receipt: completedReceipt,
      });
    },
  });
}
