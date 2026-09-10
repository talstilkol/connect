import type {
  RailwayBotReplyStagingCrossServiceReport,
} from "./railwayBotReplyStagingCrossServiceActivation.ts";
import type {
  RailwayBotReplyStagingCrossServiceEvidenceClock,
} from "./railwayBotReplyStagingCrossServiceEvidence.ts";
import {
  type BotReplyStagingReleaseEvidenceOperatorEvent,
  type PostgresBotReplyStagingReleaseEvidenceOperatorRepository,
} from "./postgresBotReplyStagingReleaseEvidenceOperatorRepository.ts";
import {
  issueRailwayBotReplyStagingReleaseEvidence,
  type RailwayBotReplyStagingReleaseIdentity,
} from "./railwayBotReplyStagingReleaseEvidenceIssuer.ts";
import {
  publishRailwayBotReplyStagingReleaseEvidence,
} from "./railwayBotReplyStagingReleaseEvidencePublisher.ts";

export const railwayBotReplyStagingReleaseEvidenceOperatorVersion =
  "connect-railway-bot-reply-staging-release-evidence-operator-v1" as const;

export const railwayBotReplyStagingReleaseEvidenceOperatorConfirmation =
  "PUBLISH_BOT_REPLY_STAGING_RELEASE_EVIDENCE" as const;

export interface RailwayBotReplyStagingReleaseEvidenceOperatorInput {
  readonly schemaVersion: 1;
  readonly confirmation:
    typeof railwayBotReplyStagingReleaseEvidenceOperatorConfirmation;
  readonly expectedRelease:
    Readonly<RailwayBotReplyStagingReleaseIdentity>;
  readonly expectedVersion: number;
  readonly expectedEvidenceDigest: string | null;
  readonly lifetimeSeconds: number;
  readonly requestedAt: string;
}

export interface RailwayBotReplyStagingReleaseEvidenceOperatorContext {
  readonly actorExternalUserId: string;
  readonly idempotencyKey: string;
}

export interface RailwayBotReplyStagingReleaseEvidenceOperatorDependencies {
  readonly repository:
    Readonly<PostgresBotReplyStagingReleaseEvidenceOperatorRepository>;
  readonly readCurrentReleaseIdentity: () => Promise<
    Readonly<RailwayBotReplyStagingReleaseIdentity>
  >;
  readonly inspectCrossServiceActivation: () => Promise<
    RailwayBotReplyStagingCrossServiceReport
  >;
  readonly readActivationAuthorization: () => Promise<
    "approved" | "blocked"
  >;
}

export type RailwayBotReplyStagingReleaseEvidenceOperatorResult = Readonly<
  | {
      schemaVersion: 1;
      operatorVersion:
        typeof railwayBotReplyStagingReleaseEvidenceOperatorVersion;
      status: "published";
      code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_PUBLISHED";
      outcome: "published" | "replayed";
      version: number;
      evidenceDigest: string;
      expiresAt: string;
      auditEventKey: string;
    }
  | {
      schemaVersion: 1;
      operatorVersion:
        typeof railwayBotReplyStagingReleaseEvidenceOperatorVersion;
      status: "blocked";
      code:
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_ACTIVATION_REQUIRED"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_REQUEST_NOT_CURRENT"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_RELEASE_NOT_READY"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_PRECONDITION_FAILED"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_WRITE_CONFLICT"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_AUDIT_READ_BACK_MISMATCH"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_DEPENDENCY_UNAVAILABLE";
      outcome: null;
      version: null;
      evidenceDigest: null;
      expiresAt: null;
      auditEventKey: null;
    }
>;

export type RailwayBotReplyStagingReleaseEvidenceOperatorErrorCode =
  | "input-invalid"
  | "context-invalid"
  | "dependencies-invalid";

export class RailwayBotReplyStagingReleaseEvidenceOperatorError extends Error {
  readonly code: RailwayBotReplyStagingReleaseEvidenceOperatorErrorCode;

  constructor(code: RailwayBotReplyStagingReleaseEvidenceOperatorErrorCode) {
    super(`Railway Bot reply release evidence operator failed: ${code}`);
    this.name = "RailwayBotReplyStagingReleaseEvidenceOperatorError";
    this.code = code;
  }
}

const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v1_[a-f0-9]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[a-f0-9]{64}$/;
const maximumVersion = 2_147_483_647;
const maximumRequestAgeMilliseconds = 5 * 60 * 1_000;
const maximumFutureSkewMilliseconds = 30 * 1_000;
const inputKeys = Object.freeze([
  "confirmation",
  "expectedEvidenceDigest",
  "expectedRelease",
  "expectedVersion",
  "lifetimeSeconds",
  "requestedAt",
  "schemaVersion",
]);
const releaseKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "releaseId",
]);
const contextKeys = Object.freeze([
  "actorExternalUserId",
  "idempotencyKey",
]);
const dependencyKeys = Object.freeze([
  "inspectCrossServiceActivation",
  "readActivationAuthorization",
  "readCurrentReleaseIdentity",
  "repository",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: unknown, expected: readonly string[]): boolean {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function validRelease(value: unknown): value is
  RailwayBotReplyStagingReleaseIdentity {
  return exactKeys(value, releaseKeys) && isRecord(value) &&
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

function validActor(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= 255 && value.trim() === value &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function requireInput(
  input: Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorInput>,
): void {
  if (
    !exactKeys(input, inputKeys) || !isRecord(input) ||
    input.schemaVersion !== 1 ||
    input.confirmation !==
      railwayBotReplyStagingReleaseEvidenceOperatorConfirmation ||
    !validRelease(input.expectedRelease) ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion < 0 || input.expectedVersion >= maximumVersion ||
    !(input.expectedEvidenceDigest === null ||
      typeof input.expectedEvidenceDigest === "string" &&
      evidenceDigestPattern.test(input.expectedEvidenceDigest)) ||
    (input.expectedVersion === 0) !==
      (input.expectedEvidenceDigest === null) ||
    !Number.isSafeInteger(input.lifetimeSeconds) ||
    input.lifetimeSeconds < 60 || input.lifetimeSeconds > 900 ||
    !canonicalTimestamp(input.requestedAt)
  ) {
    throw new RailwayBotReplyStagingReleaseEvidenceOperatorError(
      "input-invalid",
    );
  }
}

function requireContext(
  context: Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorContext>,
): void {
  if (
    !exactKeys(context, contextKeys) || !isRecord(context) ||
    !validActor(context.actorExternalUserId) ||
    typeof context.idempotencyKey !== "string" ||
    !idempotencyKeyPattern.test(context.idempotencyKey)
  ) {
    throw new RailwayBotReplyStagingReleaseEvidenceOperatorError(
      "context-invalid",
    );
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidenceOperatorDependencies
  >,
): void {
  if (
    !exactKeys(dependencies, dependencyKeys) || !isRecord(dependencies) ||
    typeof dependencies.readCurrentReleaseIdentity !== "function" ||
    typeof dependencies.inspectCrossServiceActivation !== "function" ||
    typeof dependencies.readActivationAuthorization !== "function" ||
    !isRecord(dependencies.repository) ||
    typeof dependencies.repository.clock?.now !== "function" ||
    typeof dependencies.repository.readCurrentEvidenceState !== "function" ||
    typeof dependencies.repository.findOperatorEvent !== "function" ||
    typeof dependencies.repository.compareAndSetEvidenceWithAudit !== "function"
  ) {
    throw new RailwayBotReplyStagingReleaseEvidenceOperatorError(
      "dependencies-invalid",
    );
  }
}

function safeNow(
  clock: Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>,
): Date | null {
  try {
    const now = clock.now();
    return now instanceof Date && Number.isFinite(now.getTime())
      ? new Date(now.getTime())
      : null;
  } catch {
    return null;
  }
}

function blocked(
  code: Extract<
    RailwayBotReplyStagingReleaseEvidenceOperatorResult,
    { status: "blocked" }
  >["code"],
): RailwayBotReplyStagingReleaseEvidenceOperatorResult {
  return Object.freeze({
    schemaVersion: 1 as const,
    operatorVersion: railwayBotReplyStagingReleaseEvidenceOperatorVersion,
    status: "blocked" as const,
    code,
    outcome: null,
    version: null,
    evidenceDigest: null,
    expiresAt: null,
    auditEventKey: null,
  });
}

function eventMatchesRequest(
  event: Readonly<BotReplyStagingReleaseEvidenceOperatorEvent>,
  input: Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorInput>,
  context: Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorContext>,
): boolean {
  const requestedAtMilliseconds = Date.parse(input.requestedAt);
  return sameRelease(event.release, input.expectedRelease) &&
    event.idempotencyKey === context.idempotencyKey &&
    event.actorExternalUserId === context.actorExternalUserId &&
    event.expectedVersion === input.expectedVersion &&
    event.expectedEvidenceDigest === input.expectedEvidenceDigest &&
    event.publishedVersion === input.expectedVersion + 1 &&
    event.occurredAt === input.requestedAt &&
    event.evidenceExpiresAt === new Date(
      requestedAtMilliseconds + input.lifetimeSeconds * 1_000,
    ).toISOString();
}

function publishedFromEvent(
  event: Readonly<BotReplyStagingReleaseEvidenceOperatorEvent>,
  outcome: "published" | "replayed",
): RailwayBotReplyStagingReleaseEvidenceOperatorResult {
  return Object.freeze({
    schemaVersion: 1 as const,
    operatorVersion: railwayBotReplyStagingReleaseEvidenceOperatorVersion,
    status: "published" as const,
    code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_PUBLISHED" as const,
    outcome,
    version: event.publishedVersion,
    evidenceDigest: event.evidenceDigest,
    expiresAt: event.evidenceExpiresAt,
    auditEventKey: event.eventKey,
  });
}

async function findReplay(
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidenceOperatorDependencies
  >,
  input: Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorInput>,
  context: Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorContext>,
): Promise<RailwayBotReplyStagingReleaseEvidenceOperatorResult | null> {
  const event = await dependencies.repository.findOperatorEvent(
    context.idempotencyKey,
  );
  if (event === null) return null;
  return eventMatchesRequest(event, input, context)
    ? publishedFromEvent(event, "replayed")
    : blocked(
        "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_PRECONDITION_FAILED",
      );
}

function mapPublisherBlock(
  code: string,
): Extract<
  RailwayBotReplyStagingReleaseEvidenceOperatorResult,
  { status: "blocked" }
>["code"] {
  switch (code) {
    case "BOT_REPLY_STAGING_RELEASE_EVIDENCE_WRITE_CONFLICT":
      return "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_WRITE_CONFLICT";
    case "BOT_REPLY_STAGING_RELEASE_EVIDENCE_PRECONDITION_FAILED":
    case "BOT_REPLY_STAGING_RELEASE_EVIDENCE_INVALID":
      return "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_PRECONDITION_FAILED";
    case "BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_BACK_MISMATCH":
      return "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_AUDIT_READ_BACK_MISMATCH";
    default:
      return "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_DEPENDENCY_UNAVAILABLE";
  }
}

export async function operateRailwayBotReplyStagingReleaseEvidence(
  input: Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorInput>,
  context: Readonly<RailwayBotReplyStagingReleaseEvidenceOperatorContext>,
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidenceOperatorDependencies
  >,
): Promise<RailwayBotReplyStagingReleaseEvidenceOperatorResult> {
  requireInput(input);
  requireContext(context);
  requireDependencies(dependencies);

  let activationAuthorization: "approved" | "blocked";
  try {
    activationAuthorization =
      await dependencies.readActivationAuthorization();
  } catch {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_DEPENDENCY_UNAVAILABLE",
    );
  }
  if (activationAuthorization !== "approved") {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_ACTIVATION_REQUIRED",
    );
  }

  const now = safeNow(dependencies.repository.clock);
  const requestedAtMilliseconds = Date.parse(input.requestedAt);
  if (now === null) {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_DEPENDENCY_UNAVAILABLE",
    );
  }
  if (
    requestedAtMilliseconds < now.getTime() - maximumRequestAgeMilliseconds ||
    requestedAtMilliseconds > now.getTime() + maximumFutureSkewMilliseconds ||
    requestedAtMilliseconds + input.lifetimeSeconds * 1_000 <= now.getTime()
  ) {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_REQUEST_NOT_CURRENT",
    );
  }

  try {
    const replay = await findReplay(dependencies, input, context);
    if (replay !== null) return replay;

    const issued = await issueRailwayBotReplyStagingReleaseEvidence(
      {
        expectedRelease: input.expectedRelease,
        lifetimeSeconds: input.lifetimeSeconds,
      },
      {
        readCurrentReleaseIdentity:
          dependencies.readCurrentReleaseIdentity,
        inspectCrossServiceActivation:
          dependencies.inspectCrossServiceActivation,
        clock: Object.freeze({
          now: () => new Date(requestedAtMilliseconds),
        }),
      },
    );
    if (issued.status !== "issued") {
      return blocked(
        issued.code === "BOT_REPLY_STAGING_RELEASE_ACTIVATION_REQUIRED" ||
            issued.code === "BOT_REPLY_STAGING_RELEASE_IDENTITY_CHANGED"
          ? "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_RELEASE_NOT_READY"
          : "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_DEPENDENCY_UNAVAILABLE",
      );
    }

    const publisherResult =
      await publishRailwayBotReplyStagingReleaseEvidence(
        {
          expectedRelease: input.expectedRelease,
          expectedVersion: input.expectedVersion,
          expectedEvidenceDigest: input.expectedEvidenceDigest,
          issuedEvidence: issued,
        },
        {
          clock: dependencies.repository.clock,
          readCurrentEvidenceState:
            dependencies.repository.readCurrentEvidenceState,
          async compareAndSetEvidence(write) {
            const result =
              await dependencies.repository.compareAndSetEvidenceWithAudit({
                write,
                idempotencyKey: context.idempotencyKey,
                actorExternalUserId: context.actorExternalUserId,
              });
            return result.status === "stored"
              ? Object.freeze({
                  status: "stored" as const,
                  version: result.version,
                })
              : Object.freeze({
                  status: "conflict" as const,
                  version: null,
                });
          },
        },
      );

    if (publisherResult.status !== "published") {
      const replay = await findReplay(dependencies, input, context);
      return replay ?? blocked(mapPublisherBlock(publisherResult.code));
    }

    const event = await dependencies.repository.findOperatorEvent(
      context.idempotencyKey,
    );
    if (
      event === null || !eventMatchesRequest(event, input, context) ||
      event.publishedVersion !== publisherResult.version ||
      event.evidenceDigest !== publisherResult.evidenceDigest ||
      event.evidenceExpiresAt !== publisherResult.expiresAt
    ) {
      return blocked(
        "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_AUDIT_READ_BACK_MISMATCH",
      );
    }
    return publishedFromEvent(
      event,
      publisherResult.replayed ? "replayed" : "published",
    );
  } catch {
    return blocked(
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_DEPENDENCY_UNAVAILABLE",
    );
  }
}
