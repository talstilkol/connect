import type {
  RailwayBotReplyStagingCrossServiceReport,
} from "./railwayBotReplyStagingCrossServiceActivation.ts";
import {
  createRailwayBotReplyStagingCrossServiceEvidence,
  RailwayBotReplyStagingCrossServiceEvidenceError,
  type RailwayBotReplyStagingCrossServiceEvidenceClock,
} from "./railwayBotReplyStagingCrossServiceEvidence.ts";

export const railwayBotReplyStagingReleaseEvidenceIssuerVersion =
  "connect-railway-bot-reply-staging-release-evidence-issuer-v1" as const;

export interface RailwayBotReplyStagingReleaseIdentity {
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
}

export interface RailwayBotReplyStagingReleaseEvidenceIssuerInput {
  readonly expectedRelease:
    Readonly<RailwayBotReplyStagingReleaseIdentity>;
  readonly lifetimeSeconds: number;
}

export interface RailwayBotReplyStagingReleaseEvidenceIssuerDependencies {
  readonly readCurrentReleaseIdentity: () => Promise<
    Readonly<RailwayBotReplyStagingReleaseIdentity>
  >;
  readonly inspectCrossServiceActivation: () => Promise<
    RailwayBotReplyStagingCrossServiceReport
  >;
  readonly clock:
    Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>;
}

export type RailwayBotReplyStagingReleaseEvidenceIssuerResult = Readonly<
  | {
      schemaVersion: 1;
      issuerVersion:
        typeof railwayBotReplyStagingReleaseEvidenceIssuerVersion;
      status: "issued";
      code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_ISSUED";
      evidenceJson: string;
      evidenceDigest: string;
      expiresAt: string;
    }
  | {
      schemaVersion: 1;
      issuerVersion:
        typeof railwayBotReplyStagingReleaseEvidenceIssuerVersion;
      status: "blocked";
      code:
        | "BOT_REPLY_STAGING_RELEASE_ACTIVATION_REQUIRED"
        | "BOT_REPLY_STAGING_RELEASE_IDENTITY_CHANGED"
        | "BOT_REPLY_STAGING_RELEASE_DEPENDENCY_UNAVAILABLE";
      evidenceJson: null;
      evidenceDigest: null;
      expiresAt: null;
    }
>;

export type RailwayBotReplyStagingReleaseEvidenceIssuerErrorCode =
  | "input-invalid"
  | "dependencies-invalid";

export class RailwayBotReplyStagingReleaseEvidenceIssuerError extends Error {
  readonly code: RailwayBotReplyStagingReleaseEvidenceIssuerErrorCode;

  constructor(code: RailwayBotReplyStagingReleaseEvidenceIssuerErrorCode) {
    super(`Railway Bot reply release evidence issuer failed: ${code}`);
    this.name = "RailwayBotReplyStagingReleaseEvidenceIssuerError";
    this.code = code;
  }
}

const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;
const inputKeys = Object.freeze(["expectedRelease", "lifetimeSeconds"]);
const releaseIdentityKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "releaseId",
]);
const dependencyKeys = Object.freeze([
  "clock",
  "inspectCrossServiceActivation",
  "readCurrentReleaseIdentity",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index]);
}

function isReleaseIdentity(
  value: unknown,
): value is RailwayBotReplyStagingReleaseIdentity {
  return isRecord(value) && hasExactKeys(value, releaseIdentityKeys) &&
    typeof value.releaseId === "string" &&
    releaseIdPattern.test(value.releaseId) &&
    typeof value.commitSha === "string" &&
    commitShaPattern.test(value.commitSha) &&
    typeof value.artifactDigest === "string" &&
    artifactDigestPattern.test(value.artifactDigest);
}

function sameReleaseIdentity(
  left: Readonly<RailwayBotReplyStagingReleaseIdentity>,
  right: Readonly<RailwayBotReplyStagingReleaseIdentity>,
): boolean {
  return left.releaseId === right.releaseId &&
    left.commitSha === right.commitSha &&
    left.artifactDigest === right.artifactDigest;
}

function requireInput(
  input: Readonly<RailwayBotReplyStagingReleaseEvidenceIssuerInput>,
): void {
  if (
    !isRecord(input) || !hasExactKeys(input, inputKeys) ||
    !isReleaseIdentity(input.expectedRelease) ||
    !Number.isSafeInteger(input.lifetimeSeconds) ||
    input.lifetimeSeconds < 60 || input.lifetimeSeconds > 900
  ) {
    throw new RailwayBotReplyStagingReleaseEvidenceIssuerError(
      "input-invalid",
    );
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidenceIssuerDependencies
  >,
): void {
  if (
    !isRecord(dependencies) || !hasExactKeys(dependencies, dependencyKeys) ||
    typeof dependencies.readCurrentReleaseIdentity !== "function" ||
    typeof dependencies.inspectCrossServiceActivation !== "function" ||
    !isRecord(dependencies.clock) ||
    typeof dependencies.clock.now !== "function"
  ) {
    throw new RailwayBotReplyStagingReleaseEvidenceIssuerError(
      "dependencies-invalid",
    );
  }
}

function blocked(
  code: Extract<
    RailwayBotReplyStagingReleaseEvidenceIssuerResult,
    { status: "blocked" }
  >["code"],
): RailwayBotReplyStagingReleaseEvidenceIssuerResult {
  return Object.freeze({
    schemaVersion: 1 as const,
    issuerVersion: railwayBotReplyStagingReleaseEvidenceIssuerVersion,
    status: "blocked" as const,
    code,
    evidenceJson: null,
    evidenceDigest: null,
    expiresAt: null,
  });
}

export async function issueRailwayBotReplyStagingReleaseEvidence(
  input: Readonly<RailwayBotReplyStagingReleaseEvidenceIssuerInput>,
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidenceIssuerDependencies
  >,
): Promise<RailwayBotReplyStagingReleaseEvidenceIssuerResult> {
  requireInput(input);
  requireDependencies(dependencies);

  let before: Readonly<RailwayBotReplyStagingReleaseIdentity>;
  let report: RailwayBotReplyStagingCrossServiceReport;
  let after: Readonly<RailwayBotReplyStagingReleaseIdentity>;
  try {
    before = await dependencies.readCurrentReleaseIdentity();
    if (
      !isReleaseIdentity(before) ||
      !sameReleaseIdentity(before, input.expectedRelease)
    ) {
      return blocked("BOT_REPLY_STAGING_RELEASE_IDENTITY_CHANGED");
    }
    report = await dependencies.inspectCrossServiceActivation();
    after = await dependencies.readCurrentReleaseIdentity();
  } catch {
    return blocked("BOT_REPLY_STAGING_RELEASE_DEPENDENCY_UNAVAILABLE");
  }

  if (
    !isReleaseIdentity(after) ||
    !sameReleaseIdentity(before, after) ||
    !sameReleaseIdentity(after, input.expectedRelease)
  ) {
    return blocked("BOT_REPLY_STAGING_RELEASE_IDENTITY_CHANGED");
  }

  try {
    const evidence = createRailwayBotReplyStagingCrossServiceEvidence({
      report,
      releaseId: after.releaseId,
      commitSha: after.commitSha,
      artifactDigest: after.artifactDigest,
      lifetimeSeconds: input.lifetimeSeconds,
    }, dependencies.clock);
    return Object.freeze({
      schemaVersion: 1 as const,
      issuerVersion: railwayBotReplyStagingReleaseEvidenceIssuerVersion,
      status: "issued" as const,
      code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_ISSUED" as const,
      evidenceJson: JSON.stringify(evidence),
      evidenceDigest: evidence.evidenceDigest,
      expiresAt: evidence.expiresAt,
    });
  } catch (error) {
    return blocked(
      error instanceof RailwayBotReplyStagingCrossServiceEvidenceError &&
          error.code === "input-invalid"
        ? "BOT_REPLY_STAGING_RELEASE_ACTIVATION_REQUIRED"
        : "BOT_REPLY_STAGING_RELEASE_DEPENDENCY_UNAVAILABLE",
    );
  }
}
