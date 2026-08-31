import {
  inspectRailwayBotReplyStagingCrossServiceEvidence,
  type RailwayBotReplyStagingCrossServiceEvidenceClock,
} from "./railwayBotReplyStagingCrossServiceEvidence.ts";
import {
  railwayBotReplyStagingReleaseEvidenceIssuerVersion,
  type RailwayBotReplyStagingReleaseEvidenceIssuerResult,
  type RailwayBotReplyStagingReleaseIdentity,
} from "./railwayBotReplyStagingReleaseEvidenceIssuer.ts";

export const railwayBotReplyStagingReleaseEvidencePublisherVersion =
  "connect-railway-bot-reply-staging-release-evidence-publisher-v1" as const;

type IssuedEvidence = Extract<
  RailwayBotReplyStagingReleaseEvidenceIssuerResult,
  { status: "issued" }
>;

export interface RailwayBotReplyStagingReleaseEvidenceState {
  readonly release: Readonly<RailwayBotReplyStagingReleaseIdentity>;
  readonly version: number;
  readonly evidenceDigest: string | null;
  readonly evidenceJson: string | null;
}

export interface RailwayBotReplyStagingReleaseEvidencePublisherInput {
  readonly expectedRelease:
    Readonly<RailwayBotReplyStagingReleaseIdentity>;
  readonly expectedVersion: number;
  readonly expectedEvidenceDigest: string | null;
  readonly issuedEvidence: Readonly<IssuedEvidence>;
}

export interface RailwayBotReplyStagingReleaseEvidenceWrite {
  readonly expectedRelease:
    Readonly<RailwayBotReplyStagingReleaseIdentity>;
  readonly expectedVersion: number;
  readonly expectedEvidenceDigest: string | null;
  readonly nextEvidenceDigest: string;
  readonly nextEvidenceJson: string;
}

export type RailwayBotReplyStagingReleaseEvidenceWriteResult = Readonly<
  | {
      status: "stored";
      version: number;
    }
  | {
      status: "conflict";
      version: null;
    }
>;

export interface RailwayBotReplyStagingReleaseEvidencePublisherDependencies {
  readonly readCurrentEvidenceState: () => Promise<
    Readonly<RailwayBotReplyStagingReleaseEvidenceState>
  >;
  readonly compareAndSetEvidence: (
    write: Readonly<RailwayBotReplyStagingReleaseEvidenceWrite>,
  ) => Promise<RailwayBotReplyStagingReleaseEvidenceWriteResult>;
  readonly clock:
    Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>;
}

export type RailwayBotReplyStagingReleaseEvidencePublisherResult = Readonly<
  | {
      schemaVersion: 1;
      publisherVersion:
        typeof railwayBotReplyStagingReleaseEvidencePublisherVersion;
      status: "published";
      code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISHED";
      version: number;
      replayed: boolean;
      evidenceDigest: string;
      expiresAt: string;
    }
  | {
      schemaVersion: 1;
      publisherVersion:
        typeof railwayBotReplyStagingReleaseEvidencePublisherVersion;
      status: "blocked";
      code:
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_INVALID"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PRECONDITION_FAILED"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_WRITE_CONFLICT"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_BACK_MISMATCH"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_DEPENDENCY_UNAVAILABLE";
      version: null;
      replayed: false;
      evidenceDigest: null;
      expiresAt: null;
    }
>;

export type RailwayBotReplyStagingReleaseEvidencePublisherErrorCode =
  | "input-invalid"
  | "dependencies-invalid";

export class RailwayBotReplyStagingReleaseEvidencePublisherError
  extends Error {
  readonly code: RailwayBotReplyStagingReleaseEvidencePublisherErrorCode;

  constructor(code: RailwayBotReplyStagingReleaseEvidencePublisherErrorCode) {
    super(`Railway Bot reply release evidence publisher failed: ${code}`);
    this.name = "RailwayBotReplyStagingReleaseEvidencePublisherError";
    this.code = code;
  }
}

const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v1_[a-f0-9]{64}$/;
const maximumEvidenceVersion = 2_147_483_647;
const inputKeys = Object.freeze([
  "expectedEvidenceDigest",
  "expectedRelease",
  "expectedVersion",
  "issuedEvidence",
]);
const releaseKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "releaseId",
]);
const issuedEvidenceKeys = Object.freeze([
  "code",
  "evidenceDigest",
  "evidenceJson",
  "expiresAt",
  "issuerVersion",
  "schemaVersion",
  "status",
]);
const stateKeys = Object.freeze([
  "evidenceDigest",
  "evidenceJson",
  "release",
  "version",
]);
const writeResultKeys = Object.freeze(["status", "version"]);
const dependencyKeys = Object.freeze([
  "clock",
  "compareAndSetEvidence",
  "readCurrentEvidenceState",
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
  return isRecord(value) && hasExactKeys(value, releaseKeys) &&
    typeof value.releaseId === "string" &&
    releaseIdPattern.test(value.releaseId) &&
    typeof value.commitSha === "string" &&
    commitShaPattern.test(value.commitSha) &&
    typeof value.artifactDigest === "string" &&
    artifactDigestPattern.test(value.artifactDigest);
}

function sameRelease(
  left: Readonly<RailwayBotReplyStagingReleaseIdentity>,
  right: Readonly<RailwayBotReplyStagingReleaseIdentity>,
): boolean {
  return left.releaseId === right.releaseId &&
    left.commitSha === right.commitSha &&
    left.artifactDigest === right.artifactDigest;
}

function isIssuedEvidence(value: unknown): value is IssuedEvidence {
  return isRecord(value) && hasExactKeys(value, issuedEvidenceKeys) &&
    value.schemaVersion === 1 &&
    value.issuerVersion ===
      railwayBotReplyStagingReleaseEvidenceIssuerVersion &&
    value.status === "issued" &&
    value.code === "BOT_REPLY_STAGING_RELEASE_EVIDENCE_ISSUED" &&
    typeof value.evidenceJson === "string" &&
    typeof value.evidenceDigest === "string" &&
    evidenceDigestPattern.test(value.evidenceDigest) &&
    typeof value.expiresAt === "string";
}

function validVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 &&
    Number(value) <= maximumEvidenceVersion;
}

function validPreviousDigest(value: unknown): value is string | null {
  return value === null ||
    typeof value === "string" && evidenceDigestPattern.test(value);
}

function isState(
  value: unknown,
): value is RailwayBotReplyStagingReleaseEvidenceState {
  if (
    !isRecord(value) || !hasExactKeys(value, stateKeys) ||
    !isReleaseIdentity(value.release) || !validVersion(value.version) ||
    !validPreviousDigest(value.evidenceDigest) ||
    !(value.evidenceJson === null || typeof value.evidenceJson === "string")
  ) {
    return false;
  }
  return (value.evidenceDigest === null) === (value.evidenceJson === null);
}

function requireInput(
  input: Readonly<RailwayBotReplyStagingReleaseEvidencePublisherInput>,
): void {
  if (
    !isRecord(input) || !hasExactKeys(input, inputKeys) ||
    !isReleaseIdentity(input.expectedRelease) ||
    !validVersion(input.expectedVersion) ||
    input.expectedVersion >= maximumEvidenceVersion ||
    !validPreviousDigest(input.expectedEvidenceDigest) ||
    !isIssuedEvidence(input.issuedEvidence)
  ) {
    throw new RailwayBotReplyStagingReleaseEvidencePublisherError(
      "input-invalid",
    );
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidencePublisherDependencies
  >,
): void {
  if (
    !isRecord(dependencies) || !hasExactKeys(dependencies, dependencyKeys) ||
    typeof dependencies.readCurrentEvidenceState !== "function" ||
    typeof dependencies.compareAndSetEvidence !== "function" ||
    !isRecord(dependencies.clock) ||
    typeof dependencies.clock.now !== "function"
  ) {
    throw new RailwayBotReplyStagingReleaseEvidencePublisherError(
      "dependencies-invalid",
    );
  }
}

function blocked(
  code: Extract<
    RailwayBotReplyStagingReleaseEvidencePublisherResult,
    { status: "blocked" }
  >["code"],
): RailwayBotReplyStagingReleaseEvidencePublisherResult {
  return Object.freeze({
    schemaVersion: 1 as const,
    publisherVersion: railwayBotReplyStagingReleaseEvidencePublisherVersion,
    status: "blocked" as const,
    code,
    version: null,
    replayed: false as const,
    evidenceDigest: null,
    expiresAt: null,
  });
}

function verifyIssuedEvidence(
  input: Readonly<RailwayBotReplyStagingReleaseEvidencePublisherInput>,
  clock: Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>,
) {
  let now: Date;
  try {
    now = clock.now();
  } catch {
    return null;
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return null;
  const report = inspectRailwayBotReplyStagingCrossServiceEvidence({
    APP_RELEASE_ID: input.expectedRelease.releaseId,
    APP_DEPLOYED_COMMIT_SHA: input.expectedRelease.commitSha,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: input.expectedRelease.artifactDigest,
    BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON:
      input.issuedEvidence.evidenceJson,
  }, now);
  let embeddedDigest: unknown;
  try {
    const evidence = JSON.parse(input.issuedEvidence.evidenceJson) as unknown;
    embeddedDigest = isRecord(evidence)
      ? evidence.evidenceDigest
      : undefined;
  } catch {
    return null;
  }
  return report.status === "configured" &&
      report.code ===
        "BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_VERIFIED" &&
      embeddedDigest === input.issuedEvidence.evidenceDigest &&
      report.expiresAt === input.issuedEvidence.expiresAt
    ? report
    : null;
}

function sameStoredEvidence(
  state: Readonly<RailwayBotReplyStagingReleaseEvidenceState>,
  input: Readonly<RailwayBotReplyStagingReleaseEvidencePublisherInput>,
  version: number,
): boolean {
  return sameRelease(state.release, input.expectedRelease) &&
    state.version === version &&
    state.evidenceDigest === input.issuedEvidence.evidenceDigest &&
    state.evidenceJson === input.issuedEvidence.evidenceJson;
}

function storedEvidenceIsSelfConsistent(
  state: Readonly<RailwayBotReplyStagingReleaseEvidenceState>,
): boolean {
  if (state.evidenceJson === null || state.evidenceDigest === null) return true;
  let verifiedAt: unknown;
  let embeddedDigest: unknown;
  try {
    const evidence = JSON.parse(state.evidenceJson) as unknown;
    verifiedAt = isRecord(evidence) ? evidence.verifiedAt : undefined;
    embeddedDigest = isRecord(evidence)
      ? evidence.evidenceDigest
      : undefined;
  } catch {
    return false;
  }
  if (typeof verifiedAt !== "string") return false;
  const verificationClock = new Date(verifiedAt);
  if (!Number.isFinite(verificationClock.getTime())) return false;
  const report = inspectRailwayBotReplyStagingCrossServiceEvidence({
    APP_RELEASE_ID: state.release.releaseId,
    APP_DEPLOYED_COMMIT_SHA: state.release.commitSha,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: state.release.artifactDigest,
    BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON: state.evidenceJson,
  }, verificationClock);
  return report.status === "configured" &&
    embeddedDigest === state.evidenceDigest;
}

function published(
  input: Readonly<RailwayBotReplyStagingReleaseEvidencePublisherInput>,
  version: number,
  replayed: boolean,
): RailwayBotReplyStagingReleaseEvidencePublisherResult {
  return Object.freeze({
    schemaVersion: 1 as const,
    publisherVersion: railwayBotReplyStagingReleaseEvidencePublisherVersion,
    status: "published" as const,
    code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISHED" as const,
    version,
    replayed,
    evidenceDigest: input.issuedEvidence.evidenceDigest,
    expiresAt: input.issuedEvidence.expiresAt,
  });
}

export async function publishRailwayBotReplyStagingReleaseEvidence(
  input: Readonly<RailwayBotReplyStagingReleaseEvidencePublisherInput>,
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidencePublisherDependencies
  >,
): Promise<RailwayBotReplyStagingReleaseEvidencePublisherResult> {
  requireInput(input);
  requireDependencies(dependencies);
  if (!verifyIssuedEvidence(input, dependencies.clock)) {
    return blocked("BOT_REPLY_STAGING_RELEASE_EVIDENCE_INVALID");
  }

  let before: Readonly<RailwayBotReplyStagingReleaseEvidenceState>;
  try {
    before = await dependencies.readCurrentEvidenceState();
  } catch {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_DEPENDENCY_UNAVAILABLE",
    );
  }
  if (
    !isState(before) || !sameRelease(before.release, input.expectedRelease) ||
    !storedEvidenceIsSelfConsistent(before)
  ) {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PRECONDITION_FAILED",
    );
  }

  const nextVersion = input.expectedVersion + 1;
  if (sameStoredEvidence(before, input, nextVersion)) {
    return published(input, nextVersion, true);
  }
  if (
    before.version !== input.expectedVersion ||
    before.evidenceDigest !== input.expectedEvidenceDigest
  ) {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PRECONDITION_FAILED",
    );
  }

  let writeResult: RailwayBotReplyStagingReleaseEvidenceWriteResult;
  try {
    writeResult = await dependencies.compareAndSetEvidence(Object.freeze({
      expectedRelease: input.expectedRelease,
      expectedVersion: input.expectedVersion,
      expectedEvidenceDigest: input.expectedEvidenceDigest,
      nextEvidenceDigest: input.issuedEvidence.evidenceDigest,
      nextEvidenceJson: input.issuedEvidence.evidenceJson,
    }));
  } catch {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_DEPENDENCY_UNAVAILABLE",
    );
  }
  if (
    !isRecord(writeResult) ||
    !hasExactKeys(writeResult, writeResultKeys) ||
    writeResult.status === "conflict" && writeResult.version === null
  ) {
    return blocked("BOT_REPLY_STAGING_RELEASE_EVIDENCE_WRITE_CONFLICT");
  }
  if (
    writeResult.status !== "stored" || writeResult.version !== nextVersion
  ) {
    return blocked("BOT_REPLY_STAGING_RELEASE_EVIDENCE_WRITE_CONFLICT");
  }

  let after: Readonly<RailwayBotReplyStagingReleaseEvidenceState>;
  try {
    after = await dependencies.readCurrentEvidenceState();
  } catch {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_DEPENDENCY_UNAVAILABLE",
    );
  }
  if (
    !isState(after) || !sameStoredEvidence(after, input, nextVersion) ||
    !verifyIssuedEvidence(input, dependencies.clock)
  ) {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_BACK_MISMATCH",
    );
  }
  return published(input, nextVersion, false);
}
