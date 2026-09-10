import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import type {
  BotReplyStagingReceiptAttestationTrustedKey,
} from "../operations/botReplyStagingReceiptAttestation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  inspectRailwayBotReplyStagingAttestedReleaseEvidence,
  railwayBotReplyStagingAttestedReleaseEvidenceMaximumBytes,
  serializeRailwayBotReplyStagingAttestedReleaseEvidence,
  type RailwayBotReplyStagingAttestedReleaseEvidenceExpectedBinding,
  type RailwayBotReplyStagingAttestedReleaseEvidenceInspection,
} from "./railwayBotReplyStagingAttestedReleaseEvidence.ts";

export const postgresBotReplyStagingAttestedReleaseEvidenceRepositoryVersion =
  "connect-postgres-bot-reply-staging-attested-release-evidence-repository-v1" as const;

export const RAILWAY_BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_PUBLISH_OPERATION =
  "system-admin.bot-reply-staging.release-evidence.publish" as const;

export const BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_OPERATOR_EVENT_PREFIX =
  "bot_reply_staging_release_evidence_operator_event_v1_" as const;

const maximumInteger = 2_147_483_647;
const maximumTrustedKeyCount = 8;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const releaseEvidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v[12]_[a-f0-9]{64}$/;
const v2ReleaseEvidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v2_[a-f0-9]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[a-f0-9]{64}$/;
const eventKeyPattern =
  /^bot_reply_staging_release_evidence_operator_event_v1_[a-f0-9]{64}$/;
const keyIdPattern = /^bot_reply_staging_worker_key_v1_[a-f0-9]{64}$/;
const noncePattern =
  /^bot_reply_staging_attestation_nonce_v1_[a-f0-9]{64}$/;
const attestationAuditKeyPattern =
  /^bot_reply_staging_attestation_audit_v1_[a-f0-9]{64}$/;

const commandKeys = Object.freeze([
  "actorExternalUserId",
  "evidence",
  "expected",
  "expectedEvidenceDigest",
  "idempotencyKey",
  "receipt",
]);
const expectedBindingKeys = Object.freeze([
  "artifactDigest",
  "attestationAuditKey",
  "claimVersion",
  "commitSha",
  "expectedEvidenceVersion",
  "releaseId",
  "requestDigest",
  "runKey",
  "trustedKeyId",
]);
const trustedKeyKeys = Object.freeze([
  "keyId",
  "publicKeySpkiBase64Url",
  "validFrom",
  "validUntil",
]);
const resultKeys = Object.freeze(["rowCount", "rows"]);
const resultRowKeys = Object.freeze([
  "actorExternalUserId",
  "artifactDigest",
  "attestationPayloadDigest",
  "commitSha",
  "eventKey",
  "evidenceCoreDigest",
  "evidenceDigest",
  "evidenceExpiresAt",
  "expectedEvidenceDigest",
  "expectedVersion",
  "idempotencyKey",
  "nonce",
  "nonceStatus",
  "occurredAt",
  "operationId",
  "publishedVersion",
  "receiptDigest",
  "releaseId",
  "resultStatus",
]);

export const postgresBotReplyStagingAttestedReleaseEvidenceSql =
  Object.freeze({
    publishWithAudit: `
      SELECT
        result_status AS "resultStatus",
        nonce_status AS "nonceStatus",
        nonce,
        receipt_digest AS "receiptDigest",
        evidence_core_digest AS "evidenceCoreDigest",
        attestation_payload_digest AS "attestationPayloadDigest",
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
      FROM public.publish_bot_reply_staging_attested_evidence_with_audit(
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
        $11,
        $12,
        $13,
        $14,
        $15::timestamptz,
        $16::timestamptz,
        $17::timestamptz,
        $18,
        $19,
        $20,
        $21,
        $22,
        $23,
        $24,
        $25::timestamptz,
        $26::timestamptz
      )
    `,
  });

export interface PublishPostgresBotReplyStagingAttestedReleaseEvidenceInput {
  readonly evidence: unknown;
  readonly receipt: unknown;
  readonly expected: Readonly<
    RailwayBotReplyStagingAttestedReleaseEvidenceExpectedBinding
  >;
  readonly expectedEvidenceDigest: string | null;
  readonly actorExternalUserId: string;
  readonly idempotencyKey: string;
}

export interface BotReplyStagingAttestedReleaseIdentity {
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
}

export interface BotReplyStagingAttestedReleaseEvidenceOperatorEvent {
  readonly eventKey: string;
  readonly release: Readonly<BotReplyStagingAttestedReleaseIdentity>;
  readonly operationId:
    typeof RAILWAY_BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_PUBLISH_OPERATION;
  readonly idempotencyKey: string;
  readonly actorExternalUserId: string;
  readonly expectedVersion: number;
  readonly expectedEvidenceDigest: string | null;
  readonly publishedVersion: number;
  readonly evidenceDigest: string;
  readonly evidenceExpiresAt: string;
  readonly occurredAt: string;
}

type BlockedAttestedReleaseEvidenceResult = Extract<
  RailwayBotReplyStagingAttestedReleaseEvidenceInspection,
  { status: "blocked" }
>;

export type PostgresBotReplyStagingAttestedReleaseEvidencePublishResult =
  Readonly<
    | BlockedAttestedReleaseEvidenceResult
    | {
        status: "conflict";
        nonceStatus: null;
        version: null;
        event: null;
        replayProtected: false;
      }
    | {
        status: "stored";
        nonceStatus: "consumed";
        version: number;
        event: Readonly<
          BotReplyStagingAttestedReleaseEvidenceOperatorEvent
        >;
        replayProtected: true;
      }
    | {
        status: "replayed";
        nonceStatus: "replayed";
        version: number;
        event: Readonly<
          BotReplyStagingAttestedReleaseEvidenceOperatorEvent
        >;
        replayProtected: true;
      }
  >;

export interface PostgresBotReplyStagingAttestedReleaseEvidenceRepository {
  publishAttestedEvidence(
    input: Readonly<
      PublishPostgresBotReplyStagingAttestedReleaseEvidenceInput
    >,
  ): Promise<PostgresBotReplyStagingAttestedReleaseEvidencePublishResult>;
}

function snapshotDataRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" || value === null || Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return null;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of ownKeys as string[]) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      Object.defineProperty(snapshot, key, {
        configurable: false,
        enumerable: true,
        value: descriptor.value,
        writable: false,
      });
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function snapshotExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  const snapshot = snapshotDataRecord(value);
  if (snapshot === null) return null;
  const actualKeys = Object.keys(snapshot).sort();
  const normalizedExpectedKeys = [...expectedKeys].sort();
  return actualKeys.length === normalizedExpectedKeys.length &&
      actualKeys.every(
        (key, index) => key === normalizedExpectedKeys[index],
      )
    ? snapshot
    : null;
}

function snapshotDenseArray(
  value: unknown,
  maximumLength: number,
): readonly unknown[] | null {
  if (
    typeof value !== "object" || value === null || !Array.isArray(value) ||
    nodeUtilTypes.isProxy(value) || Object.getPrototypeOf(value) !==
      Array.prototype
  ) {
    return null;
  }
  try {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      Number(lengthDescriptor.value) < 0 ||
      Number(lengthDescriptor.value) > maximumLength
    ) {
      return null;
    }
    const length = Number(lengthDescriptor.value);
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== length + 1 || !ownKeys.includes("length") ||
      ownKeys.some((key) => typeof key !== "string")
    ) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      snapshot.push(descriptor.value);
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function requirePattern(
  value: unknown,
  pattern: RegExp,
  label: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new TypeError(`${label} is invalid`);
  }
  return value;
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function parsePostgresTimestamp(value: unknown, label: string): string {
  let milliseconds: number;
  if (value instanceof Date && !nodeUtilTypes.isProxy(value)) {
    milliseconds = Date.prototype.getTime.call(value);
  } else if (typeof value === "string" && value.length <= 64) {
    milliseconds = Date.parse(value);
  } else {
    throw new Error(`PostgreSQL returned an invalid ${label}`);
  }
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`PostgreSQL returned an invalid ${label}`);
  }
  return new Date(milliseconds).toISOString();
}

function parseNonnegativeInteger(value: unknown, label: string): number {
  const normalized = typeof value === "string" &&
      /^(?:0|[1-9][0-9]*)$/.test(value)
    ? Number(value)
    : value;
  if (
    !Number.isSafeInteger(normalized) || Number(normalized) < 0 ||
    Number(normalized) > maximumInteger
  ) {
    throw new Error(`PostgreSQL returned an invalid ${label}`);
  }
  return Number(normalized);
}

function requireActor(value: unknown): string {
  if (
    typeof value !== "string" || value.length < 1 || value.length > 255 ||
    value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new TypeError("actorExternalUserId is invalid");
  }
  return value;
}

function normalizedAttestedOperatorEventFields(
  event: Omit<
    BotReplyStagingAttestedReleaseEvidenceOperatorEvent,
    "eventKey"
  >,
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

export function deriveBotReplyStagingAttestedReleaseEvidenceOperatorEventKey(
  event: Omit<
    BotReplyStagingAttestedReleaseEvidenceOperatorEvent,
    "eventKey"
  >,
): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(normalizedAttestedOperatorEventFields(event)))
    .digest("hex");
  return `${BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_OPERATOR_EVENT_PREFIX}${digest}`;
}

function parseExpectedBinding(
  value: unknown,
): Readonly<
  RailwayBotReplyStagingAttestedReleaseEvidenceExpectedBinding
> | null {
  const snapshot = snapshotExactRecord(value, expectedBindingKeys);
  if (
    snapshot === null || typeof snapshot.trustedKeyId !== "string" ||
    !keyIdPattern.test(snapshot.trustedKeyId) ||
    typeof snapshot.releaseId !== "string" ||
    !releaseIdPattern.test(snapshot.releaseId) ||
    typeof snapshot.commitSha !== "string" ||
    !commitShaPattern.test(snapshot.commitSha) ||
    typeof snapshot.artifactDigest !== "string" ||
    !digestPattern.test(snapshot.artifactDigest) ||
    typeof snapshot.runKey !== "string" ||
    !runKeyPattern.test(snapshot.runKey) ||
    !Number.isSafeInteger(snapshot.claimVersion) ||
    Number(snapshot.claimVersion) < 1 ||
    Number(snapshot.claimVersion) > maximumInteger ||
    typeof snapshot.requestDigest !== "string" ||
    !digestPattern.test(snapshot.requestDigest) ||
    !Number.isSafeInteger(snapshot.expectedEvidenceVersion) ||
    Number(snapshot.expectedEvidenceVersion) < 0 ||
    Number(snapshot.expectedEvidenceVersion) >= maximumInteger ||
    typeof snapshot.attestationAuditKey !== "string" ||
    !attestationAuditKeyPattern.test(snapshot.attestationAuditKey)
  ) {
    return null;
  }
  return Object.freeze({
    trustedKeyId: snapshot.trustedKeyId,
    releaseId: snapshot.releaseId,
    commitSha: snapshot.commitSha,
    artifactDigest: snapshot.artifactDigest,
    runKey: snapshot.runKey,
    claimVersion: Number(snapshot.claimVersion),
    requestDigest: snapshot.requestDigest,
    expectedEvidenceVersion: Number(snapshot.expectedEvidenceVersion),
    attestationAuditKey: snapshot.attestationAuditKey,
  });
}

function snapshotTrustedKeys(
  value: unknown,
): readonly Readonly<BotReplyStagingReceiptAttestationTrustedKey>[] {
  const candidates = snapshotDenseArray(value, maximumTrustedKeyCount);
  if (candidates === null || candidates.length < 1) {
    throw new TypeError("attested evidence trusted keys are invalid");
  }
  const trustedKeys: Array<
    Readonly<BotReplyStagingReceiptAttestationTrustedKey>
  > = [];
  for (const candidate of candidates) {
    const snapshot = snapshotExactRecord(candidate, trustedKeyKeys);
    if (
      snapshot === null || typeof snapshot.keyId !== "string" ||
      !keyIdPattern.test(snapshot.keyId) ||
      typeof snapshot.publicKeySpkiBase64Url !== "string" ||
      snapshot.publicKeySpkiBase64Url.length < 1 ||
      snapshot.publicKeySpkiBase64Url.length > 1_024 ||
      !/^[A-Za-z0-9_-]+$/.test(snapshot.publicKeySpkiBase64Url) ||
      !canonicalTimestamp(snapshot.validFrom) ||
      !canonicalTimestamp(snapshot.validUntil) ||
      Date.parse(snapshot.validFrom) >= Date.parse(snapshot.validUntil)
    ) {
      throw new TypeError("attested evidence trusted keys are invalid");
    }
    trustedKeys.push(Object.freeze({
      keyId: snapshot.keyId,
      publicKeySpkiBase64Url: snapshot.publicKeySpkiBase64Url,
      validFrom: snapshot.validFrom,
      validUntil: snapshot.validUntil,
    }));
  }
  return Object.freeze(trustedKeys);
}

function blockedInvalid(): BlockedAttestedReleaseEvidenceResult {
  return Object.freeze({
    status: "blocked" as const,
    code: "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_INVALID" as const,
    attestationCode: null,
    releaseId: null,
    runKey: null,
    evidenceCoreDigest: null,
    attestationPayloadDigest: null,
    evidenceDigest: null,
    verifiedAt: null,
    expiresAt: null,
    replayProtected: false as const,
    evidence: null,
  });
}

function requireSingleSafeRow(result: unknown): unknown {
  const snapshot = snapshotExactRecord(result, resultKeys);
  if (snapshot === null || snapshot.rowCount !== 1) {
    throw new Error("PostgreSQL returned an invalid attested publish result");
  }
  const rows = snapshotDenseArray(snapshot.rows, 1);
  if (rows === null || rows.length !== 1) {
    throw new Error("PostgreSQL returned invalid attested publish rows");
  }
  return rows[0];
}

interface ExpectedPublishReadback {
  readonly nonce: string;
  readonly receiptDigest: string;
  readonly evidenceCoreDigest: string;
  readonly attestationPayloadDigest: string;
  readonly eventKey: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly idempotencyKey: string;
  readonly actorExternalUserId: string;
  readonly expectedVersion: number;
  readonly expectedEvidenceDigest: string | null;
  readonly publishedVersion: number;
  readonly evidenceDigest: string;
  readonly evidenceExpiresAt: string;
  readonly occurredAt: string;
}

function parsePublishResult(
  value: unknown,
  expected: Readonly<ExpectedPublishReadback>,
): Exclude<
  PostgresBotReplyStagingAttestedReleaseEvidencePublishResult,
  BlockedAttestedReleaseEvidenceResult
> {
  const row = snapshotExactRecord(value, resultRowKeys);
  if (row === null) {
    throw new Error("PostgreSQL returned an invalid attested publish row");
  }
  if (row.resultStatus === "conflict") {
    if (
      resultRowKeys.some(
        (key) => key !== "resultStatus" && row[key] !== null,
      )
    ) {
      throw new Error("PostgreSQL returned an invalid attested conflict");
    }
    return Object.freeze({
      status: "conflict" as const,
      nonceStatus: null,
      version: null,
      event: null,
      replayProtected: false as const,
    });
  }
  const paired = row.resultStatus === "stored" &&
      row.nonceStatus === "consumed" ||
    row.resultStatus === "replayed" && row.nonceStatus === "replayed";
  if (!paired) {
    throw new Error("PostgreSQL returned an invalid attested publish pairing");
  }

  const actual = Object.freeze({
    nonce: requirePattern(row.nonce, noncePattern, "stored nonce"),
    receiptDigest: requirePattern(
      row.receiptDigest,
      digestPattern,
      "stored receiptDigest",
    ),
    evidenceCoreDigest: requirePattern(
      row.evidenceCoreDigest,
      digestPattern,
      "stored evidenceCoreDigest",
    ),
    attestationPayloadDigest: requirePattern(
      row.attestationPayloadDigest,
      digestPattern,
      "stored attestationPayloadDigest",
    ),
    eventKey: requirePattern(
      row.eventKey,
      eventKeyPattern,
      "stored eventKey",
    ),
    releaseId: requirePattern(
      row.releaseId,
      releaseIdPattern,
      "stored releaseId",
    ),
    commitSha: requirePattern(
      row.commitSha,
      commitShaPattern,
      "stored commitSha",
    ),
    artifactDigest: requirePattern(
      row.artifactDigest,
      digestPattern,
      "stored artifactDigest",
    ),
    operationId: requirePattern(
      row.operationId,
      /^system-admin\.bot-reply-staging\.release-evidence\.publish$/,
      "stored operationId",
    ),
    idempotencyKey: requirePattern(
      row.idempotencyKey,
      idempotencyKeyPattern,
      "stored idempotencyKey",
    ),
    actorExternalUserId: requireActor(row.actorExternalUserId),
    expectedVersion: parseNonnegativeInteger(
      row.expectedVersion,
      "expectedVersion",
    ),
    expectedEvidenceDigest: row.expectedEvidenceDigest === null
      ? null
      : requirePattern(
          row.expectedEvidenceDigest,
          releaseEvidenceDigestPattern,
          "stored expectedEvidenceDigest",
        ),
    publishedVersion: parseNonnegativeInteger(
      row.publishedVersion,
      "publishedVersion",
    ),
    evidenceDigest: requirePattern(
      row.evidenceDigest,
      v2ReleaseEvidenceDigestPattern,
      "stored evidenceDigest",
    ),
    evidenceExpiresAt: parsePostgresTimestamp(
      row.evidenceExpiresAt,
      "evidenceExpiresAt",
    ),
    occurredAt: parsePostgresTimestamp(row.occurredAt, "occurredAt"),
  });
  if (
    actual.nonce !== expected.nonce ||
    actual.receiptDigest !== expected.receiptDigest ||
    actual.evidenceCoreDigest !== expected.evidenceCoreDigest ||
    actual.attestationPayloadDigest !==
      expected.attestationPayloadDigest ||
    actual.eventKey !== expected.eventKey ||
    actual.releaseId !== expected.releaseId ||
    actual.commitSha !== expected.commitSha ||
    actual.artifactDigest !== expected.artifactDigest ||
    actual.operationId !==
      RAILWAY_BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_PUBLISH_OPERATION ||
    actual.idempotencyKey !== expected.idempotencyKey ||
    actual.actorExternalUserId !== expected.actorExternalUserId ||
    actual.expectedVersion !== expected.expectedVersion ||
    actual.expectedEvidenceDigest !== expected.expectedEvidenceDigest ||
    actual.publishedVersion !== expected.publishedVersion ||
    actual.evidenceDigest !== expected.evidenceDigest ||
    actual.evidenceExpiresAt !== expected.evidenceExpiresAt ||
    actual.occurredAt !== expected.occurredAt
  ) {
    throw new Error("PostgreSQL returned mismatched attested publish evidence");
  }

  const release = Object.freeze({
    releaseId: actual.releaseId,
    commitSha: actual.commitSha,
    artifactDigest: actual.artifactDigest,
  });
  const eventWithoutKey = Object.freeze({
    release,
    operationId:
      RAILWAY_BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_PUBLISH_OPERATION,
    idempotencyKey: actual.idempotencyKey,
    actorExternalUserId: actual.actorExternalUserId,
    expectedVersion: actual.expectedVersion,
    expectedEvidenceDigest: actual.expectedEvidenceDigest,
    publishedVersion: actual.publishedVersion,
    evidenceDigest: actual.evidenceDigest,
    evidenceExpiresAt: actual.evidenceExpiresAt,
    occurredAt: actual.occurredAt,
  });
  if (
    deriveBotReplyStagingAttestedReleaseEvidenceOperatorEventKey(
      eventWithoutKey,
    ) !== actual.eventKey
  ) {
    throw new Error("PostgreSQL returned an invalid attested operator key");
  }
  const event = Object.freeze({
    eventKey: actual.eventKey,
    ...eventWithoutKey,
  });
  if (row.resultStatus === "stored") {
    return Object.freeze({
      status: "stored" as const,
      nonceStatus: "consumed" as const,
      version: actual.publishedVersion,
      event,
      replayProtected: true as const,
    });
  }
  return Object.freeze({
    status: "replayed" as const,
    nonceStatus: "replayed" as const,
    version: actual.publishedVersion,
    event,
    replayProtected: true as const,
  });
}

function requireTransactionQuery(
  transaction: unknown,
): Readonly<{
  receiver: Readonly<PostgresQueryExecutor>;
  query: PostgresQueryExecutor["query"];
}> {
  const snapshot = snapshotExactRecord(transaction, ["query"]);
  const query = snapshot?.query;
  if (
    snapshot === null || typeof query !== "function" ||
    nodeUtilTypes.isProxy(query)
  ) {
    throw new TypeError("attested evidence transaction is invalid");
  }
  return Object.freeze({
    receiver: transaction as Readonly<PostgresQueryExecutor>,
    query: query as PostgresQueryExecutor["query"],
  });
}

export function createPostgresBotReplyStagingAttestedReleaseEvidenceRepository(
  transactions: PostgresTransactionManager,
  rawTrustedKeys: readonly Readonly<
    BotReplyStagingReceiptAttestationTrustedKey
  >[],
  rawClock: Readonly<{ now(): Date }>,
): Readonly<PostgresBotReplyStagingAttestedReleaseEvidenceRepository> {
  const transactionManager = snapshotExactRecord(
    transactions,
    ["transaction"],
  );
  const transaction = transactionManager?.transaction;
  if (
    transactionManager === null || typeof transaction !== "function" ||
    nodeUtilTypes.isProxy(transaction)
  ) {
    throw new TypeError("attested evidence transaction manager is invalid");
  }
  const clock = snapshotExactRecord(rawClock, ["now"]);
  const clockNow = clock?.now;
  if (
    clock === null || typeof clockNow !== "function" ||
    nodeUtilTypes.isProxy(clockNow)
  ) {
    throw new TypeError("attested evidence clock is invalid");
  }
  const trustedKeys = snapshotTrustedKeys(rawTrustedKeys);
  const inspectionClock = Object.freeze({
    now: () => Reflect.apply(clockNow, rawClock, []) as Date,
  });

  return Object.freeze({
    async publishAttestedEvidence(
      input: Readonly<
        PublishPostgresBotReplyStagingAttestedReleaseEvidenceInput
      >,
    ): Promise<PostgresBotReplyStagingAttestedReleaseEvidencePublishResult> {
      const command = snapshotExactRecord(input, commandKeys);
      if (command === null) return blockedInvalid();
      const expected = parseExpectedBinding(command.expected);
      if (expected === null) return blockedInvalid();
      let expectedEvidenceDigest: string | null;
      if (expected.expectedEvidenceVersion === 0) {
        if (command.expectedEvidenceDigest !== null) return blockedInvalid();
        expectedEvidenceDigest = null;
      } else {
        if (
          typeof command.expectedEvidenceDigest !== "string" ||
          !releaseEvidenceDigestPattern.test(
            command.expectedEvidenceDigest,
          )
        ) {
          return blockedInvalid();
        }
        expectedEvidenceDigest = command.expectedEvidenceDigest;
      }
      let actorExternalUserId: string;
      let idempotencyKey: string;
      try {
        actorExternalUserId = requireActor(command.actorExternalUserId);
        idempotencyKey = requirePattern(
          command.idempotencyKey,
          idempotencyKeyPattern,
          "idempotencyKey",
        );
      } catch {
        return blockedInvalid();
      }

      const inspection =
        inspectRailwayBotReplyStagingAttestedReleaseEvidence({
          evidence: command.evidence,
          receipt: command.receipt,
          expected,
          trustedKeys,
          clock: inspectionClock,
        });
      if (inspection.status === "blocked") return inspection;
      const evidence = inspection.evidence;
      const evidenceJson =
        serializeRailwayBotReplyStagingAttestedReleaseEvidence(evidence);
      if (
        Buffer.byteLength(evidenceJson, "utf8") >
          railwayBotReplyStagingAttestedReleaseEvidenceMaximumBytes
      ) {
        return blockedInvalid();
      }

      const publishedVersion = expected.expectedEvidenceVersion + 1;
      const release = Object.freeze({
        releaseId: evidence.core.releaseId,
        commitSha: evidence.core.commitSha,
        artifactDigest: evidence.core.artifactDigest,
      });
      const eventWithoutKey = Object.freeze({
        release,
        operationId:
          RAILWAY_BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_PUBLISH_OPERATION,
        idempotencyKey,
        actorExternalUserId,
        expectedVersion: expected.expectedEvidenceVersion,
        expectedEvidenceDigest,
        publishedVersion,
        evidenceDigest: evidence.evidenceDigest,
        evidenceExpiresAt: evidence.core.expiresAt,
        occurredAt: evidence.core.verifiedAt,
      });
      const eventKey =
        deriveBotReplyStagingAttestedReleaseEvidenceOperatorEventKey(
          eventWithoutKey,
        );
      const expectedReadback = Object.freeze({
        nonce: evidence.attestation.nonce,
        receiptDigest: evidence.core.receiptDigest,
        evidenceCoreDigest: evidence.evidenceCoreDigest,
        attestationPayloadDigest: evidence.attestationPayloadDigest,
        eventKey,
        releaseId: evidence.core.releaseId,
        commitSha: evidence.core.commitSha,
        artifactDigest: evidence.core.artifactDigest,
        idempotencyKey,
        actorExternalUserId,
        expectedVersion: expected.expectedEvidenceVersion,
        expectedEvidenceDigest,
        publishedVersion,
        evidenceDigest: evidence.evidenceDigest,
        evidenceExpiresAt: evidence.core.expiresAt,
        occurredAt: evidence.core.verifiedAt,
      });
      const parameters: readonly PostgresParameter[] = Object.freeze([
        evidence.attestation.policyVersion,
        evidence.attestation.keyId,
        evidence.attestation.runKey,
        evidence.attestation.claimVersion,
        evidence.attestation.requestDigest,
        evidence.attestation.releaseId,
        evidence.attestation.commitSha,
        evidence.attestation.artifactDigest,
        evidence.attestation.expectedEvidenceVersion,
        evidence.attestation.receiptDigest,
        evidence.attestation.evidenceCoreDigest,
        evidence.attestation.auditKey,
        evidence.attestation.nonce,
        evidence.attestation.nonceSequence,
        evidence.attestation.issuedAt,
        evidence.attestation.signedAt,
        evidence.attestation.expiresAt,
        evidence.attestationPayloadDigest,
        eventKey,
        idempotencyKey,
        actorExternalUserId,
        expectedEvidenceDigest,
        evidence.evidenceDigest,
        evidenceJson,
        evidence.core.verifiedAt,
        evidence.core.expiresAt,
      ]);

      let transactionCallbackInvoked = false;
      let callbackResult:
        | Exclude<
          PostgresBotReplyStagingAttestedReleaseEvidencePublishResult,
          BlockedAttestedReleaseEvidenceResult
        >
        | undefined;
      const transactionResult = await Reflect.apply(transaction, transactions, [
        Object.freeze({ isolationLevel: "read-committed" as const }),
        async (rawTransaction: unknown) => {
          if (transactionCallbackInvoked) {
            throw new Error(
              "PostgreSQL invoked the attested publish transaction twice",
            );
          }
          transactionCallbackInvoked = true;
          const checkedTransaction = requireTransactionQuery(rawTransaction);
          const result = await Reflect.apply(
            checkedTransaction.query,
            checkedTransaction.receiver,
            [
              postgresBotReplyStagingAttestedReleaseEvidenceSql
                .publishWithAudit,
              parameters,
            ],
          ) as unknown;
          callbackResult = parsePublishResult(
            requireSingleSafeRow(result),
            expectedReadback,
          );
          return callbackResult;
        },
      ]) as unknown;
      if (
        !transactionCallbackInvoked || callbackResult === undefined ||
        transactionResult !== callbackResult
      ) {
        throw new Error(
          "PostgreSQL returned an invalid attested transaction result",
        );
      }
      return callbackResult;
    },
  });
}
