import { createHash } from "node:crypto";

import type {
  BotReplyStagingLiveRunInput,
} from "./botReplyStagingLiveDriver.ts";

const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;

export class BotReplyStagingDurableRunnerError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BotReplyStagingDurableRunnerError";
    this.code = code;
  }
}

function digest(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

export function deriveBotReplyStagingDurableRequestDigest(
  run: Readonly<BotReplyStagingLiveRunInput>,
): string {
  return digest({
    runKey: run.runKey,
    targetTenantId: run.targetTenantId,
    expectedConnectionVersion: run.expectedConnectionVersion,
    expectedPolicyVersion: run.expectedPolicyVersion,
    releaseId: run.releaseId,
    commitSha: run.commitSha,
    artifactDigest: run.artifactDigest,
    graphApiVersion: run.graphApiVersion,
    recipientFingerprint: run.recipientFingerprint,
    rateLimitMethodFingerprint: run.rateLimitMethodFingerprint,
    actorExternalUserId: run.actorExternalUserId,
  });
}

export function deriveBotReplyStagingDurableAuditKey(
  runKey: string,
  requestDigest: string,
): string {
  if (
    !runKeyPattern.test(runKey) ||
    !fingerprintPattern.test(requestDigest)
  ) {
    throw new BotReplyStagingDurableRunnerError(
      "BOT_REPLY_STAGING_DURABLE_IDENTITY_INVALID",
    );
  }
  const value = createHash("sha256")
    .update(`${runKey}\0${requestDigest}`)
    .digest("hex");
  return `bot_reply_staging_audit_v1_${value}`;
}
