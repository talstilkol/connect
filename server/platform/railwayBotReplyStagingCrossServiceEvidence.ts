import { createHash } from "node:crypto";

import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
  type RailwayBotReplyStagingCrossServiceReport,
} from "./railwayBotReplyStagingCrossServiceActivation.ts";

export const railwayBotReplyStagingCrossServiceEvidencePolicyVersion =
  "connect-railway-bot-reply-staging-cross-service-evidence-v1" as const;

export interface RailwayBotReplyStagingCrossServiceEvidence {
  readonly schemaVersion: 1;
  readonly policyVersion:
    typeof railwayBotReplyStagingCrossServiceEvidencePolicyVersion;
  readonly environment: "staging";
  readonly source: "railway-api-worker-cross-service-preflight";
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly verifiedAt: string;
  readonly expiresAt: string;
  readonly activationVersion:
    typeof railwayBotReplyStagingCrossServiceActivationVersion;
  readonly checkCount: 4;
  readonly checks: RailwayBotReplyStagingCrossServiceReport["checks"];
  readonly evidenceDigest: string;
}

export interface RailwayBotReplyStagingCrossServiceEvidenceEnvironment {
  readonly APP_RELEASE_ID?: string;
  readonly APP_DEPLOYED_COMMIT_SHA?: string;
  readonly APP_DEPLOYMENT_ARTIFACT_DIGEST?: string;
  readonly BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON?: string;
}

export interface CreateRailwayBotReplyStagingCrossServiceEvidenceInput {
  readonly report: RailwayBotReplyStagingCrossServiceReport;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly lifetimeSeconds: number;
}

export interface RailwayBotReplyStagingCrossServiceEvidenceClock {
  now(): Date;
}

export type RailwayBotReplyStagingCrossServiceEvidenceReport = Readonly<
  | {
      status: "configured";
      code: "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_VERIFIED";
      releaseId: string;
      commitSha: string;
      artifactDigest: string;
      verifiedAt: string;
      expiresAt: string;
      checkCount: 4;
    }
  | {
      status:
        | "disabled"
        | "invalid"
        | "not-yet-valid"
        | "expired"
        | "mismatch";
      code:
        | "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_REQUIRED"
        | "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_INVALID"
        | "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_NOT_YET_VALID"
        | "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_EXPIRED"
        | "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_MISMATCH";
      releaseId: null;
      commitSha: null;
      artifactDigest: null;
      verifiedAt: null;
      expiresAt: null;
      checkCount: 0;
    }
>;

export type RailwayBotReplyStagingCrossServiceEvidenceErrorCode =
  | "input-invalid"
  | "clock-invalid";

export class RailwayBotReplyStagingCrossServiceEvidenceError extends Error {
  readonly code: RailwayBotReplyStagingCrossServiceEvidenceErrorCode;

  constructor(code: RailwayBotReplyStagingCrossServiceEvidenceErrorCode) {
    super(`Railway Bot reply staging cross-service evidence failed: ${code}`);
    this.name = "RailwayBotReplyStagingCrossServiceEvidenceError";
    this.code = code;
  }
}

const maximumEvidenceBytes = 8_192;
const minimumLifetimeSeconds = 60;
const maximumLifetimeSeconds = 15 * 60;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v1_[a-f0-9]{64}$/;
const evidenceKeys = Object.freeze([
  "activationVersion",
  "artifactDigest",
  "checkCount",
  "checks",
  "commitSha",
  "environment",
  "evidenceDigest",
  "expiresAt",
  "policyVersion",
  "releaseId",
  "schemaVersion",
  "source",
  "verifiedAt",
]);
const inputKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "lifetimeSeconds",
  "releaseId",
  "report",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function validReleaseIdentity(
  releaseId: unknown,
  commitSha: unknown,
  artifactDigest: unknown,
): boolean {
  return typeof releaseId === "string" && releaseIdPattern.test(releaseId) &&
    typeof commitSha === "string" && commitShaPattern.test(commitSha) &&
    typeof artifactDigest === "string" &&
    artifactDigestPattern.test(artifactDigest);
}

function checksArePassed(value: unknown): boolean {
  return Array.isArray(value) &&
    value.length === railwayBotReplyStagingCrossServiceCheckIds.length &&
    value.every((check, index) =>
      isRecord(check) && exactKeys(check, ["id", "status"]) &&
      check.id === railwayBotReplyStagingCrossServiceCheckIds[index] &&
      check.status === "passed"
    );
}

function readyReport(value: unknown): value is
  RailwayBotReplyStagingCrossServiceReport {
  return isRecord(value) &&
    exactKeys(value, [
      "activationVersion",
      "checks",
      "code",
      "passedCheckCount",
      "requiredCheckCount",
      "schemaVersion",
      "status",
    ]) && value.schemaVersion === 1 && value.status === "ready" &&
    value.code === "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED" &&
    value.activationVersion ===
      railwayBotReplyStagingCrossServiceActivationVersion &&
    value.passedCheckCount === 4 && value.requiredCheckCount === 4 &&
    checksArePassed(value.checks);
}

function canonicalEvidence(
  evidence: Omit<
    RailwayBotReplyStagingCrossServiceEvidence,
    "evidenceDigest"
  >,
): string {
  return JSON.stringify({
    schemaVersion: evidence.schemaVersion,
    policyVersion: evidence.policyVersion,
    environment: evidence.environment,
    source: evidence.source,
    releaseId: evidence.releaseId,
    commitSha: evidence.commitSha,
    artifactDigest: evidence.artifactDigest,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    activationVersion: evidence.activationVersion,
    checkCount: evidence.checkCount,
    checks: evidence.checks.map((check) => ({
      id: check.id,
      status: check.status,
    })),
  });
}

export function deriveRailwayBotReplyStagingCrossServiceEvidenceDigest(
  evidence: Omit<
    RailwayBotReplyStagingCrossServiceEvidence,
    "evidenceDigest"
  >,
): string {
  const digest = createHash("sha256")
    .update(canonicalEvidence(evidence))
    .digest("hex");
  return `bot_reply_staging_cross_service_evidence_v1_${digest}`;
}

function safeNow(
  clock: Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>,
): Date {
  try {
    const now = clock.now();
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      throw new Error("invalid-clock");
    }
    return new Date(now.getTime());
  } catch {
    throw new RailwayBotReplyStagingCrossServiceEvidenceError(
      "clock-invalid",
    );
  }
}

export function createRailwayBotReplyStagingCrossServiceEvidence(
  input: Readonly<CreateRailwayBotReplyStagingCrossServiceEvidenceInput>,
  clock: Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>,
): Readonly<RailwayBotReplyStagingCrossServiceEvidence> {
  if (
    !isRecord(input) || !exactKeys(input, inputKeys) ||
    !readyReport(input.report) ||
    !validReleaseIdentity(
      input.releaseId,
      input.commitSha,
      input.artifactDigest,
    ) || !Number.isSafeInteger(input.lifetimeSeconds) ||
    input.lifetimeSeconds < minimumLifetimeSeconds ||
    input.lifetimeSeconds > maximumLifetimeSeconds
  ) {
    throw new RailwayBotReplyStagingCrossServiceEvidenceError(
      "input-invalid",
    );
  }
  const now = safeNow(clock);
  const evidence = Object.freeze({
    schemaVersion: 1 as const,
    policyVersion:
      railwayBotReplyStagingCrossServiceEvidencePolicyVersion,
    environment: "staging" as const,
    source: "railway-api-worker-cross-service-preflight" as const,
    releaseId: input.releaseId,
    commitSha: input.commitSha,
    artifactDigest: input.artifactDigest,
    verifiedAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + input.lifetimeSeconds * 1_000,
    ).toISOString(),
    activationVersion:
      railwayBotReplyStagingCrossServiceActivationVersion,
    checkCount: 4 as const,
    checks: Object.freeze(input.report.checks.map((check) =>
      Object.freeze({ id: check.id, status: check.status })
    )),
  });
  return Object.freeze({
    ...evidence,
    evidenceDigest:
      deriveRailwayBotReplyStagingCrossServiceEvidenceDigest(evidence),
  });
}

function unavailableReport(
  status: Exclude<
    RailwayBotReplyStagingCrossServiceEvidenceReport["status"],
    "configured"
  >,
  code: Exclude<
    RailwayBotReplyStagingCrossServiceEvidenceReport["code"],
    "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_VERIFIED"
  >,
): RailwayBotReplyStagingCrossServiceEvidenceReport {
  return Object.freeze({
    status,
    code,
    releaseId: null,
    commitSha: null,
    artifactDigest: null,
    verifiedAt: null,
    expiresAt: null,
    checkCount: 0,
  });
}

export function inspectRailwayBotReplyStagingCrossServiceEvidence(
  environment: Readonly<
    RailwayBotReplyStagingCrossServiceEvidenceEnvironment
  >,
  clock: Date = new Date(),
): RailwayBotReplyStagingCrossServiceEvidenceReport {
  const raw = environment?.BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON;
  if (typeof raw !== "string" || raw.length === 0) {
    return unavailableReport(
      "disabled",
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_REQUIRED",
    );
  }
  if (
    Buffer.byteLength(raw, "utf8") > maximumEvidenceBytes ||
    !(clock instanceof Date) || !Number.isFinite(clock.getTime())
  ) {
    return unavailableReport(
      "invalid",
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_INVALID",
    );
  }
  let evidence: unknown;
  try {
    evidence = JSON.parse(raw);
  } catch {
    return unavailableReport(
      "invalid",
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_INVALID",
    );
  }
  if (
    !isRecord(evidence) || !exactKeys(evidence, evidenceKeys) ||
    evidence.schemaVersion !== 1 ||
    evidence.policyVersion !==
      railwayBotReplyStagingCrossServiceEvidencePolicyVersion ||
    evidence.environment !== "staging" ||
    evidence.source !== "railway-api-worker-cross-service-preflight" ||
    !validReleaseIdentity(
      evidence.releaseId,
      evidence.commitSha,
      evidence.artifactDigest,
    ) || !canonicalTimestamp(evidence.verifiedAt) ||
    !canonicalTimestamp(evidence.expiresAt) ||
    evidence.activationVersion !==
      railwayBotReplyStagingCrossServiceActivationVersion ||
    evidence.checkCount !== 4 || !checksArePassed(evidence.checks) ||
    typeof evidence.evidenceDigest !== "string" ||
    !evidenceDigestPattern.test(evidence.evidenceDigest)
  ) {
    return unavailableReport(
      "invalid",
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_INVALID",
    );
  }
  const verifiedAt = Date.parse(evidence.verifiedAt);
  const expiresAt = Date.parse(evidence.expiresAt);
  if (
    expiresAt <= verifiedAt ||
    expiresAt - verifiedAt > maximumLifetimeSeconds * 1_000 ||
    evidence.evidenceDigest !==
      deriveRailwayBotReplyStagingCrossServiceEvidenceDigest(
        evidence as unknown as Omit<
          RailwayBotReplyStagingCrossServiceEvidence,
          "evidenceDigest"
        >,
      )
  ) {
    return unavailableReport(
      "invalid",
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_INVALID",
    );
  }
  if (verifiedAt > clock.getTime()) {
    return unavailableReport(
      "not-yet-valid",
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_NOT_YET_VALID",
    );
  }
  if (expiresAt <= clock.getTime()) {
    return unavailableReport(
      "expired",
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_EXPIRED",
    );
  }
  if (
    evidence.releaseId !== environment.APP_RELEASE_ID ||
    evidence.commitSha !== environment.APP_DEPLOYED_COMMIT_SHA ||
    evidence.artifactDigest !==
      environment.APP_DEPLOYMENT_ARTIFACT_DIGEST
  ) {
    return unavailableReport(
      "mismatch",
      "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_MISMATCH",
    );
  }
  return Object.freeze({
    status: "configured" as const,
    code: "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_VERIFIED" as const,
    releaseId: evidence.releaseId as string,
    commitSha: evidence.commitSha as string,
    artifactDigest: evidence.artifactDigest as string,
    verifiedAt: evidence.verifiedAt as string,
    expiresAt: evidence.expiresAt as string,
    checkCount: 4 as const,
  });
}
