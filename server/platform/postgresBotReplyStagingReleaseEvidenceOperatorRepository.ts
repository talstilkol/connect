import { createHash } from "node:crypto";

import {
  createPostgresBotReplyStagingReleaseEvidenceRepository,
  type PostgresBotReplyStagingReleaseEvidenceRepository,
} from "./postgresBotReplyStagingReleaseEvidenceRepository.ts";
import {
  parsePostgresNonnegativeInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  inspectRailwayBotReplyStagingCrossServiceEvidence,
  type RailwayBotReplyStagingCrossServiceEvidenceClock,
} from "./railwayBotReplyStagingCrossServiceEvidence.ts";
import type {
  RailwayBotReplyStagingReleaseEvidenceWrite,
} from "./railwayBotReplyStagingReleaseEvidencePublisher.ts";
import type {
  RailwayBotReplyStagingReleaseIdentity,
} from "./railwayBotReplyStagingReleaseEvidenceIssuer.ts";

export const postgresBotReplyStagingReleaseEvidenceOperatorRepositoryVersion =
  "connect-postgres-bot-reply-staging-release-evidence-operator-repository-v1" as const;

export const RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION =
  "system-admin.bot-reply-staging.release-evidence.publish" as const;

export const BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_EVENT_PREFIX =
  "bot_reply_staging_release_evidence_operator_event_v1_" as const;

const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v1_[a-f0-9]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[a-f0-9]{64}$/;
const eventKeyPattern =
  /^bot_reply_staging_release_evidence_operator_event_v1_[a-f0-9]{64}$/;
const maximumVersion = 2_147_483_647;

const eventColumns = `
  event_key AS "eventKey",
  release_id AS "releaseId",
  commit_sha AS "commitSha",
  artifact_digest AS "artifactDigest",
  operation_id AS "operationId",
  idempotency_key AS "idempotencyKey",
  actor_external_user_id AS "actorExternalUserId",
  expected_version AS "expectedVersion",
  expected_evidence_digest AS "expectedEvidenceDigest",
  published_version AS "publishedVersion",
  evidence_digest AS "evidenceDigest",
  evidence_expires_at AS "evidenceExpiresAt",
  occurred_at AS "occurredAt"
`;

export const postgresBotReplyStagingReleaseEvidenceOperatorSql = Object.freeze({
  findEvent: `
    SELECT ${eventColumns}
    FROM bot_reply_staging_release_evidence_operator_events
    WHERE release_id = $1
      AND idempotency_key = $2
    LIMIT 1
  `,
  initializeAndPublishWithAudit: `
    SELECT
      result_status AS "resultStatus",
      ${eventColumns}
    FROM public.initialize_publish_bot_reply_staging_evidence_with_audit(
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11::timestamptz,
      $12::timestamptz
    )
  `,
});

export interface BotReplyStagingReleaseEvidenceOperatorEvent {
  readonly eventKey: string;
  readonly release:
    Readonly<RailwayBotReplyStagingReleaseIdentity>;
  readonly operationId:
    typeof RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION;
  readonly idempotencyKey: string;
  readonly actorExternalUserId: string;
  readonly expectedVersion: number;
  readonly expectedEvidenceDigest: string | null;
  readonly publishedVersion: number;
  readonly evidenceDigest: string;
  readonly evidenceExpiresAt: string;
  readonly occurredAt: string;
}

export interface AuditedBotReplyStagingReleaseEvidenceWrite {
  readonly write:
    Readonly<RailwayBotReplyStagingReleaseEvidenceWrite>;
  readonly idempotencyKey: string;
  readonly actorExternalUserId: string;
}

export type AuditedBotReplyStagingReleaseEvidenceWriteResult = Readonly<
  | {
      status: "stored" | "replayed";
      version: number;
      event:
        Readonly<BotReplyStagingReleaseEvidenceOperatorEvent>;
    }
  | {
      status: "conflict";
      version: null;
      event: null;
    }
>;

export interface PostgresBotReplyStagingReleaseEvidenceOperatorRepository
  extends Pick<
    PostgresBotReplyStagingReleaseEvidenceRepository,
    "clock" | "readCurrentEvidenceState"
  > {
  findOperatorEvent(idempotencyKey: string): Promise<
    Readonly<BotReplyStagingReleaseEvidenceOperatorEvent> | null
  >;
  compareAndSetEvidenceWithAudit(
    command: Readonly<AuditedBotReplyStagingReleaseEvidenceWrite>,
  ): Promise<AuditedBotReplyStagingReleaseEvidenceWriteResult>;
}

const eventRowKeys = Object.freeze([
  "actorExternalUserId",
  "artifactDigest",
  "commitSha",
  "eventKey",
  "evidenceDigest",
  "evidenceExpiresAt",
  "expectedEvidenceDigest",
  "expectedVersion",
  "idempotencyKey",
  "occurredAt",
  "operationId",
  "publishedVersion",
  "releaseId",
]);
const commandKeys = Object.freeze([
  "actorExternalUserId",
  "idempotencyKey",
  "write",
]);
const writeKeys = Object.freeze([
  "expectedEvidenceDigest",
  "expectedRelease",
  "expectedVersion",
  "nextEvidenceDigest",
  "nextEvidenceJson",
]);
const releaseKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "releaseId",
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

function requirePattern(
  value: unknown,
  pattern: RegExp,
  label: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function requirePublishResultStatus(
  value: unknown,
): "stored" | "replayed" | "conflict" {
  if (value === "stored" || value === "replayed" || value === "conflict") {
    return value;
  }
  throw new Error("resultStatus is invalid");
}

function requireRelease(
  value: unknown,
): Readonly<RailwayBotReplyStagingReleaseIdentity> {
  if (!exactKeys(value, releaseKeys) || !isRecord(value)) {
    throw new Error("release identity is invalid");
  }
  return Object.freeze({
    releaseId: requirePattern(value.releaseId, releaseIdPattern, "releaseId"),
    commitSha: requirePattern(value.commitSha, commitShaPattern, "commitSha"),
    artifactDigest: requirePattern(
      value.artifactDigest,
      artifactDigestPattern,
      "artifactDigest",
    ),
  });
}

function sameRelease(
  left: Readonly<RailwayBotReplyStagingReleaseIdentity>,
  right: Readonly<RailwayBotReplyStagingReleaseIdentity>,
): boolean {
  return left.releaseId === right.releaseId &&
    left.commitSha === right.commitSha &&
    left.artifactDigest === right.artifactDigest;
}

function requireCanonicalTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length > 40) {
    throw new Error(`${label} is invalid`);
  }
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function requireActor(value: unknown): string {
  if (
    typeof value !== "string" || value.length < 1 || value.length > 255 ||
    value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("actorExternalUserId is invalid");
  }
  return value;
}

function parseWrite(
  value: unknown,
): Readonly<{
  write: Readonly<RailwayBotReplyStagingReleaseEvidenceWrite>;
  release: Readonly<RailwayBotReplyStagingReleaseIdentity>;
  verifiedAt: string;
  expiresAt: string;
}> {
  if (!exactKeys(value, writeKeys) || !isRecord(value)) {
    throw new Error("release evidence write is invalid");
  }
  const release = requireRelease(value.expectedRelease);
  if (
    !Number.isSafeInteger(value.expectedVersion) ||
    Number(value.expectedVersion) < 0 ||
    Number(value.expectedVersion) >= maximumVersion ||
    !(value.expectedEvidenceDigest === null ||
      typeof value.expectedEvidenceDigest === "string" &&
      evidenceDigestPattern.test(value.expectedEvidenceDigest)) ||
    typeof value.nextEvidenceJson !== "string" ||
    Buffer.byteLength(value.nextEvidenceJson, "utf8") > 8_192 ||
    typeof value.nextEvidenceDigest !== "string" ||
    !evidenceDigestPattern.test(value.nextEvidenceDigest)
  ) {
    throw new Error("release evidence write is invalid");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.nextEvidenceJson);
  } catch {
    throw new Error("release evidence write is invalid");
  }
  if (!isRecord(parsed)) {
    throw new Error("release evidence write is invalid");
  }
  const verifiedAt = requireCanonicalTimestamp(parsed.verifiedAt, "verifiedAt");
  const expiresAt = requireCanonicalTimestamp(parsed.expiresAt, "expiresAt");
  const report = inspectRailwayBotReplyStagingCrossServiceEvidence({
    APP_RELEASE_ID: release.releaseId,
    APP_DEPLOYED_COMMIT_SHA: release.commitSha,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: release.artifactDigest,
    BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON: value.nextEvidenceJson,
  }, new Date(verifiedAt));
  if (
    report.status !== "configured" ||
    parsed.evidenceDigest !== value.nextEvidenceDigest ||
    report.expiresAt !== expiresAt
  ) {
    throw new Error("release evidence write is invalid");
  }
  const write = Object.freeze({
    expectedRelease: release,
    expectedVersion: Number(value.expectedVersion),
    expectedEvidenceDigest: value.expectedEvidenceDigest,
    nextEvidenceDigest: value.nextEvidenceDigest,
    nextEvidenceJson: value.nextEvidenceJson,
  });
  return Object.freeze({ write, release, verifiedAt, expiresAt });
}

function normalizedEventFields(
  event: Omit<BotReplyStagingReleaseEvidenceOperatorEvent, "eventKey">,
) {
  return Object.freeze({
    releaseId: event.release.releaseId,
    commitSha: event.release.commitSha,
    artifactDigest: event.release.artifactDigest,
    operationId: event.operationId,
    idempotencyKey: event.idempotencyKey,
    actorExternalUserId: event.actorExternalUserId,
    expectedVersion: event.expectedVersion,
    expectedEvidenceDigest: event.expectedEvidenceDigest,
    publishedVersion: event.publishedVersion,
    evidenceDigest: event.evidenceDigest,
    evidenceExpiresAt: event.evidenceExpiresAt,
    occurredAt: event.occurredAt,
  });
}

export function deriveBotReplyStagingReleaseEvidenceOperatorEventKey(
  event: Omit<BotReplyStagingReleaseEvidenceOperatorEvent, "eventKey">,
): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(normalizedEventFields(event)))
    .digest("hex");
  return `${BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_EVENT_PREFIX}${digest}`;
}

function parseEvent(
  value: unknown,
): Readonly<BotReplyStagingReleaseEvidenceOperatorEvent> {
  const row = requireExactPostgresRow(value, eventRowKeys);
  const release = requireRelease({
    releaseId: row.releaseId,
    commitSha: row.commitSha,
    artifactDigest: row.artifactDigest,
  });
  const expectedVersion = parsePostgresNonnegativeInteger(row.expectedVersion);
  const publishedVersion = parsePostgresNonnegativeInteger(row.publishedVersion);
  const eventWithoutKey = Object.freeze({
    release,
    operationId: requirePattern(
      row.operationId,
      /^system-admin\.bot-reply-staging\.release-evidence\.publish$/,
      "operationId",
    ) as typeof RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
    idempotencyKey: requirePattern(
      row.idempotencyKey,
      idempotencyKeyPattern,
      "idempotencyKey",
    ),
    actorExternalUserId: requireActor(row.actorExternalUserId),
    expectedVersion,
    expectedEvidenceDigest: row.expectedEvidenceDigest === null
      ? null
      : requirePattern(
          row.expectedEvidenceDigest,
          evidenceDigestPattern,
          "expectedEvidenceDigest",
        ),
    publishedVersion,
    evidenceDigest: requirePattern(
      row.evidenceDigest,
      evidenceDigestPattern,
      "evidenceDigest",
    ),
    evidenceExpiresAt: parsePostgresTimestamp(row.evidenceExpiresAt),
    occurredAt: parsePostgresTimestamp(row.occurredAt),
  });
  const eventKey = requirePattern(row.eventKey, eventKeyPattern, "eventKey");
  if (
    publishedVersion !== expectedVersion + 1 ||
    (expectedVersion === 0) !==
      (eventWithoutKey.expectedEvidenceDigest === null) ||
    deriveBotReplyStagingReleaseEvidenceOperatorEventKey(eventWithoutKey) !==
      eventKey
  ) {
    throw new Error("PostgreSQL returned invalid operator evidence");
  }
  return Object.freeze({ eventKey, ...eventWithoutKey });
}

export function createPostgresBotReplyStagingReleaseEvidenceOperatorRepository(
  transactions: PostgresTransactionManager,
  rawRelease: Readonly<RailwayBotReplyStagingReleaseIdentity>,
  clock: Readonly<RailwayBotReplyStagingCrossServiceEvidenceClock>,
): PostgresBotReplyStagingReleaseEvidenceOperatorRepository {
  if (!transactions || typeof transactions.transaction !== "function") {
    throw new Error("PostgreSQL operator evidence transactions are invalid");
  }
  const release = requireRelease(rawRelease);
  const releaseEvidence =
    createPostgresBotReplyStagingReleaseEvidenceRepository(
      transactions,
      release,
      clock,
    );

  return Object.freeze({
    clock: releaseEvidence.clock,
    readCurrentEvidenceState:
      releaseEvidence.readCurrentEvidenceStateOrInitial,

    async findOperatorEvent(rawIdempotencyKey: string) {
      const idempotencyKey = requirePattern(
        rawIdempotencyKey,
        idempotencyKeyPattern,
        "idempotencyKey",
      );
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const rows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyStagingReleaseEvidenceOperatorSql.findEvent,
              [release.releaseId, idempotencyKey],
            ),
            1,
          );
          if (rows.length === 0) return null;
          const event = parseEvent(rows[0]);
          if (!sameRelease(event.release, release)) {
            throw new Error("PostgreSQL returned conflicting operator release");
          }
          return event;
        },
      );
    },

    async compareAndSetEvidenceWithAudit(
      rawCommand: Readonly<AuditedBotReplyStagingReleaseEvidenceWrite>,
    ) {
      if (!exactKeys(rawCommand, commandKeys) || !isRecord(rawCommand)) {
        throw new Error("audited release evidence write is invalid");
      }
      const parsed = parseWrite(rawCommand.write);
      if (!sameRelease(parsed.release, release)) {
        throw new Error("audited release evidence identity conflicts");
      }
      const idempotencyKey = requirePattern(
        rawCommand.idempotencyKey,
        idempotencyKeyPattern,
        "idempotencyKey",
      );
      const actorExternalUserId = requireActor(
        rawCommand.actorExternalUserId,
      );
      const publishedVersion = parsed.write.expectedVersion + 1;
      const eventWithoutKey = Object.freeze({
        release,
        operationId:
          RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
        idempotencyKey,
        actorExternalUserId,
        expectedVersion: parsed.write.expectedVersion,
        expectedEvidenceDigest: parsed.write.expectedEvidenceDigest,
        publishedVersion,
        evidenceDigest: parsed.write.nextEvidenceDigest,
        evidenceExpiresAt: parsed.expiresAt,
        occurredAt: parsed.verifiedAt,
      });
      const eventKey =
        deriveBotReplyStagingReleaseEvidenceOperatorEventKey(eventWithoutKey);

      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction): Promise<
          AuditedBotReplyStagingReleaseEvidenceWriteResult
        > => {
          const resultRows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyStagingReleaseEvidenceOperatorSql
                .initializeAndPublishWithAudit,
              [
                eventKey,
                release.releaseId,
                release.commitSha,
                release.artifactDigest,
                idempotencyKey,
                actorExternalUserId,
                parsed.write.expectedVersion,
                parsed.write.expectedEvidenceDigest,
                parsed.write.nextEvidenceDigest,
                parsed.write.nextEvidenceJson,
                parsed.verifiedAt,
                parsed.expiresAt,
              ],
            ),
            1,
          );
          if (resultRows.length !== 1) {
            throw new Error("PostgreSQL operator publish returned no result");
          }
          const resultRow = requireExactPostgresRow(
            resultRows[0],
            ["resultStatus", ...eventRowKeys],
          );
          const resultStatus = requirePublishResultStatus(
            resultRow.resultStatus,
          );
          if (resultStatus === "conflict") {
            if (eventRowKeys.some((key) => resultRow[key] !== null)) {
              throw new Error("PostgreSQL returned invalid publish conflict");
            }
            return Object.freeze({
              status: "conflict" as const,
              version: null,
              event: null,
            });
          }
          const event = parseEvent(Object.fromEntries(
            eventRowKeys.map((key) => [key, resultRow[key]]),
          ));
          if (
            event.eventKey !== eventKey ||
            !sameRelease(event.release, release) ||
            JSON.stringify(normalizedEventFields(event)) !==
              JSON.stringify(normalizedEventFields(eventWithoutKey))
          ) {
            throw new Error("PostgreSQL returned mismatched operator audit");
          }
          return Object.freeze({
            status: resultStatus,
            version: publishedVersion,
            event,
          });
        },
      );
    },
  });
}
