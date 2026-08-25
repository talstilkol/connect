import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import {
  deriveBotReplyStagingReceiptDigest,
  type BotReplyStagingReceiptAttestationTrustedKey,
} from "../operations/botReplyStagingReceiptAttestation.ts";
import {
  inspectRailwayBotReplyStagingAttestedReleaseEvidence,
  railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
  serializeRailwayBotReplyStagingAttestedReleaseEvidence,
} from "./railwayBotReplyStagingAttestedReleaseEvidence.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

export const postgresBotReplyStagingAttestedReleaseEvidenceReadRepositoryVersion =
  "connect-postgres-bot-reply-staging-attested-release-evidence-read-repository-v1" as const;

const publishOperation =
  "system-admin.bot-reply-staging.release-evidence.publish" as const;
const maximumInteger = 2_147_483_647;
const maximumEvidenceBytes = 8_192;
const maximumReceiptBytes = 48_000;
const maximumTrustedKeyCount = 8;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const v2EvidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v2_[a-f0-9]{64}$/;
const previousEvidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v[12]_[a-f0-9]{64}$/;
const keyIdPattern = /^bot_reply_staging_worker_key_v1_[a-f0-9]{64}$/;
const noncePattern =
  /^bot_reply_staging_attestation_nonce_v1_[a-f0-9]{64}$/;
const attestationAuditKeyPattern =
  /^bot_reply_staging_attestation_audit_v1_[a-f0-9]{64}$/;
const eventKeyPattern =
  /^bot_reply_staging_release_evidence_operator_event_v1_[a-f0-9]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[a-f0-9]{64}$/;

const releaseKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "releaseId",
]);
const trustedKeyKeys = Object.freeze([
  "keyId",
  "publicKeySpkiBase64Url",
  "validFrom",
  "validUntil",
]);
const executorKeys = Object.freeze(["query"]);
const resultKeys = Object.freeze(["rowCount", "rows"]);
const rowKeys = Object.freeze([
  "artifactDigest",
  "commitSha",
  "databaseNow",
  "eventActorExternalUserId",
  "eventArtifactDigest",
  "eventCommitSha",
  "eventEvidenceDigest",
  "eventEvidenceExpiresAt",
  "eventExpectedEvidenceDigest",
  "eventExpectedVersion",
  "eventIdempotencyKey",
  "eventKey",
  "eventOccurredAt",
  "eventOperationId",
  "eventPublishedVersion",
  "eventReleaseId",
  "evidenceDigest",
  "evidenceExpiresAt",
  "evidenceJson",
  "evidenceVerifiedAt",
  "evidenceVersion",
  "nonceArtifactDigest",
  "nonceAttestationPayloadDigest",
  "nonceAuditKey",
  "nonceClaimVersion",
  "nonceCommitSha",
  "nonceConsumedAt",
  "nonceEvidenceCoreDigest",
  "nonceExpectedEvidenceVersion",
  "nonceExpiresAt",
  "nonceIssuedAt",
  "nonceKeyId",
  "nonceNonce",
  "noncePolicyVersion",
  "nonceReceiptDigest",
  "nonceReleaseId",
  "nonceRequestDigest",
  "nonceRunKey",
  "nonceSequence",
  "nonceSignedAt",
  "releaseId",
  "runArtifactDigest",
  "runClaimVersion",
  "runCommitSha",
  "runCompletedAt",
  "runReceiptDigest",
  "runReceiptJson",
  "runReleaseId",
  "runRequestDigest",
  "runRunKey",
  "runStatus",
]);

export const postgresBotReplyStagingAttestedReleaseEvidenceReadSql =
  Object.freeze({
    readVerified: `
      SELECT readback.*
      FROM public.read_bot_reply_staging_attested_release_evidence_v1(
        $1::TEXT,
        $2::TEXT,
        $3::TEXT
      ) AS readback
      LIMIT 2
    `,
  });

export interface PostgresBotReplyStagingAttestedReleaseEvidenceReadIdentity {
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
}

export type PostgresBotReplyStagingAttestedReleaseEvidenceReadResult =
  Readonly<
    | {
        status: "verified";
        storageMode: "postgresql";
        releaseId: string;
        commitSha: string;
        artifactDigest: string;
        evidenceSchemaVersion: 2;
        evidencePolicyVersion:
          typeof railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion;
        evidenceVersion: number;
        evidenceDigest: string;
        verifiedAt: string;
        expiresAt: string;
        replayProtected: true;
      }
    | {
        status: "unavailable";
        storageMode: "postgresql";
        releaseId: null;
        commitSha: null;
        artifactDigest: null;
        evidenceSchemaVersion: null;
        evidencePolicyVersion: null;
        evidenceVersion: null;
        evidenceDigest: null;
        verifiedAt: null;
        expiresAt: null;
        replayProtected: false;
      }
  >;

export interface PostgresBotReplyStagingAttestedReleaseEvidenceReadRepository {
  readVerified(): Promise<
    PostgresBotReplyStagingAttestedReleaseEvidenceReadResult
  >;
}

const unavailable = Object.freeze({
  status: "unavailable" as const,
  storageMode: "postgresql" as const,
  releaseId: null,
  commitSha: null,
  artifactDigest: null,
  evidenceSchemaVersion: null,
  evidencePolicyVersion: null,
  evidenceVersion: null,
  evidenceDigest: null,
  verifiedAt: null,
  expiresAt: null,
  replayProtected: false as const,
});

function snapshotDataRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" || value === null ||
    nodeUtilTypes.isProxy(value) || Array.isArray(value)
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
      snapshot[key] = descriptor.value;
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
    typeof value !== "object" || value === null ||
    nodeUtilTypes.isProxy(value) || !Array.isArray(value) ||
    Object.getPrototypeOf(value) !==
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
    const entries: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      entries.push(descriptor.value);
    }
    return Object.freeze(entries);
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

function requireRelease(
  value: unknown,
): Readonly<PostgresBotReplyStagingAttestedReleaseEvidenceReadIdentity> {
  const snapshot = snapshotExactRecord(value, releaseKeys);
  if (snapshot === null) {
    throw new TypeError("attested release evidence read identity is invalid");
  }
  return Object.freeze({
    releaseId: requirePattern(snapshot.releaseId, releaseIdPattern, "releaseId"),
    commitSha: requirePattern(snapshot.commitSha, commitShaPattern, "commitSha"),
    artifactDigest: requirePattern(
      snapshot.artifactDigest,
      digestPattern,
      "artifactDigest",
    ),
  });
}

function snapshotTrustedKeys(
  value: unknown,
): readonly Readonly<BotReplyStagingReceiptAttestationTrustedKey>[] {
  const entries = snapshotDenseArray(value, maximumTrustedKeyCount);
  if (entries === null || entries.length < 1) {
    throw new TypeError("attested release evidence trusted keys are invalid");
  }
  const keys: Array<Readonly<BotReplyStagingReceiptAttestationTrustedKey>> = [];
  for (const entry of entries) {
    const snapshot = snapshotExactRecord(entry, trustedKeyKeys);
    if (
      snapshot === null || typeof snapshot.keyId !== "string" ||
      typeof snapshot.publicKeySpkiBase64Url !== "string" ||
      typeof snapshot.validFrom !== "string" ||
      typeof snapshot.validUntil !== "string"
    ) {
      throw new TypeError("attested release evidence trusted keys are invalid");
    }
    keys.push(Object.freeze({
      keyId: snapshot.keyId,
      publicKeySpkiBase64Url: snapshot.publicKeySpkiBase64Url,
      validFrom: snapshot.validFrom,
      validUntil: snapshot.validUntil,
    }));
  }
  return Object.freeze(keys);
}

function parseTimestamp(value: unknown, label: string): string {
  let milliseconds: number;
  if (!nodeUtilTypes.isProxy(value) && value instanceof Date) {
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

function parseInteger(value: unknown, label: string): number {
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

function parseJsonDocument(
  value: unknown,
  maximumBytes: number,
  label: string,
): unknown {
  if (
    typeof value !== "string" || value.length < 2 ||
    Buffer.byteLength(value, "utf8") > maximumBytes
  ) {
    throw new Error(`PostgreSQL returned an invalid ${label}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`PostgreSQL returned an invalid ${label}`);
  }
  if (
    parsed === null || typeof parsed !== "object" || Array.isArray(parsed) ||
    JSON.stringify(parsed) !== value
  ) {
    throw new Error(`PostgreSQL returned a non-canonical ${label}`);
  }
  return parsed;
}

function validActor(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= 255 && value.trim() === value &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function parseExpectedEvidenceDigest(
  value: unknown,
  expectedVersion: number,
): string | null {
  if (expectedVersion === 0) {
    if (value !== null) {
      throw new Error("eventExpectedEvidenceDigest is invalid");
    }
    return null;
  }
  return requirePattern(
    value,
    previousEvidenceDigestPattern,
    "eventExpectedEvidenceDigest",
  );
}

function deriveEventKey(
  event: Readonly<{
    releaseId: string;
    commitSha: string;
    artifactDigest: string;
    operationId: typeof publishOperation;
    idempotencyKey: string;
    actorExternalUserId: string;
    expectedVersion: number;
    expectedEvidenceDigest: string | null;
    publishedVersion: number;
    evidenceDigest: string;
    evidenceExpiresAt: string;
    occurredAt: string;
  }>,
): string {
  const normalized = {
    releaseId: event.releaseId,
    commitSha: event.commitSha,
    artifactDigest: event.artifactDigest,
    operationId: event.operationId,
    idempotencyKey: event.idempotencyKey,
    actorExternalUserId: event.actorExternalUserId,
    expectedVersion: event.expectedVersion,
    expectedEvidenceDigest: event.expectedEvidenceDigest,
    publishedVersion: event.publishedVersion,
    evidenceDigest: event.evidenceDigest,
    evidenceExpiresAt: event.evidenceExpiresAt,
    occurredAt: event.occurredAt,
  };
  return `bot_reply_staging_release_evidence_operator_event_v1_${
    createHash("sha256").update(JSON.stringify(normalized)).digest("hex")
  }`;
}

function exactResultRow(result: unknown): Readonly<Record<string, unknown>> {
  const snapshot = snapshotExactRecord(result, resultKeys);
  if (
    snapshot === null || !Number.isSafeInteger(snapshot.rowCount) ||
    Number(snapshot.rowCount) < 0 || Number(snapshot.rowCount) > 1
  ) {
    throw new Error("PostgreSQL returned an invalid attested read result");
  }
  const rows = snapshotDenseArray(snapshot.rows, 1);
  if (rows === null || rows.length !== Number(snapshot.rowCount)) {
    throw new Error("PostgreSQL returned an invalid attested read result");
  }
  if (rows.length === 0) {
    throw new Error("PostgreSQL returned no attested evidence");
  }
  const row = snapshotExactRecord(rows[0], rowKeys);
  if (row === null) {
    throw new Error("PostgreSQL returned an invalid attested read row");
  }
  return row;
}

function verifyRow(
  row: Readonly<Record<string, unknown>>,
  release: Readonly<PostgresBotReplyStagingAttestedReleaseEvidenceReadIdentity>,
  trustedKeyId: string,
  trustedKeys: readonly Readonly<BotReplyStagingReceiptAttestationTrustedKey>[],
): PostgresBotReplyStagingAttestedReleaseEvidenceReadResult {
  const evidenceVersion = parseInteger(row.evidenceVersion, "evidenceVersion");
  if (evidenceVersion < 1) throw new Error("evidence version is invalid");
  const evidenceDigest = requirePattern(
    row.evidenceDigest,
    v2EvidenceDigestPattern,
    "evidenceDigest",
  );
  const evidenceJson = row.evidenceJson;
  const evidenceDocument = parseJsonDocument(
    evidenceJson,
    maximumEvidenceBytes,
    "evidenceJson",
  );
  const receiptJson = row.runReceiptJson;
  const receipt = parseJsonDocument(
    receiptJson,
    maximumReceiptBytes,
    "runReceiptJson",
  );
  const databaseNow = parseTimestamp(row.databaseNow, "databaseNow");
  const evidenceVerifiedAt = parseTimestamp(
    row.evidenceVerifiedAt,
    "evidenceVerifiedAt",
  );
  const evidenceExpiresAt = parseTimestamp(
    row.evidenceExpiresAt,
    "evidenceExpiresAt",
  );
  const runCompletedAt = parseTimestamp(row.runCompletedAt, "runCompletedAt");
  const runClaimVersion = parseInteger(row.runClaimVersion, "runClaimVersion");
  const nonceExpectedVersion = parseInteger(
    row.nonceExpectedEvidenceVersion,
    "nonceExpectedEvidenceVersion",
  );
  const nonceClaimVersion = parseInteger(
    row.nonceClaimVersion,
    "nonceClaimVersion",
  );
  const nonceSequence = parseInteger(row.nonceSequence, "nonceSequence");
  const nonceIssuedAt = parseTimestamp(row.nonceIssuedAt, "nonceIssuedAt");
  const nonceSignedAt = parseTimestamp(row.nonceSignedAt, "nonceSignedAt");
  const nonceExpiresAt = parseTimestamp(row.nonceExpiresAt, "nonceExpiresAt");
  const nonceConsumedAt = parseTimestamp(row.nonceConsumedAt, "nonceConsumedAt");
  const eventExpectedVersion = parseInteger(
    row.eventExpectedVersion,
    "eventExpectedVersion",
  );
  const eventPublishedVersion = parseInteger(
    row.eventPublishedVersion,
    "eventPublishedVersion",
  );
  const eventExpiresAt = parseTimestamp(
    row.eventEvidenceExpiresAt,
    "eventEvidenceExpiresAt",
  );
  const eventOccurredAt = parseTimestamp(row.eventOccurredAt, "eventOccurredAt");
  const expectedPreviousDigest = parseExpectedEvidenceDigest(
    row.eventExpectedEvidenceDigest,
    eventExpectedVersion,
  );
  const eventIdempotencyKey = requirePattern(
    row.eventIdempotencyKey,
    idempotencyKeyPattern,
    "eventIdempotencyKey",
  );
  if (!validActor(row.eventActorExternalUserId)) {
    throw new Error("eventActorExternalUserId is invalid");
  }
  const eventActorExternalUserId = row.eventActorExternalUserId;
  const eventKey = requirePattern(row.eventKey, eventKeyPattern, "eventKey");

  if (
    row.releaseId !== release.releaseId ||
    row.commitSha !== release.commitSha ||
    row.artifactDigest !== release.artifactDigest ||
    row.runStatus !== "completed" ||
    row.runReleaseId !== release.releaseId ||
    row.runCommitSha !== release.commitSha ||
    row.runArtifactDigest !== release.artifactDigest ||
    typeof row.runRunKey !== "string" || !runKeyPattern.test(row.runRunKey) ||
    typeof row.runRequestDigest !== "string" ||
    !digestPattern.test(row.runRequestDigest) ||
    typeof row.runReceiptDigest !== "string" ||
    !digestPattern.test(row.runReceiptDigest) ||
    deriveBotReplyStagingReceiptDigest(receipt) !== row.runReceiptDigest ||
    row.nonceKeyId !== trustedKeyId ||
    row.nonceRunKey !== row.runRunKey ||
    nonceClaimVersion !== runClaimVersion ||
    row.nonceRequestDigest !== row.runRequestDigest ||
    row.nonceReleaseId !== release.releaseId ||
    row.nonceCommitSha !== release.commitSha ||
    row.nonceArtifactDigest !== release.artifactDigest ||
    row.nonceReceiptDigest !== row.runReceiptDigest ||
    typeof row.noncePolicyVersion !== "string" ||
    typeof row.nonceEvidenceCoreDigest !== "string" ||
    !digestPattern.test(row.nonceEvidenceCoreDigest) ||
    typeof row.nonceAttestationPayloadDigest !== "string" ||
    !digestPattern.test(row.nonceAttestationPayloadDigest) ||
    typeof row.nonceAuditKey !== "string" ||
    !attestationAuditKeyPattern.test(row.nonceAuditKey) ||
    typeof row.nonceNonce !== "string" || !noncePattern.test(row.nonceNonce) ||
    nonceSequence !== nonceClaimVersion ||
    evidenceVersion !== nonceExpectedVersion + 1 ||
    row.eventReleaseId !== release.releaseId ||
    row.eventCommitSha !== release.commitSha ||
    row.eventArtifactDigest !== release.artifactDigest ||
    row.eventOperationId !== publishOperation ||
    eventExpectedVersion !== nonceExpectedVersion ||
    eventPublishedVersion !== evidenceVersion ||
    row.eventEvidenceDigest !== evidenceDigest ||
    eventExpiresAt !== evidenceExpiresAt ||
    eventOccurredAt !== evidenceVerifiedAt ||
    Date.parse(runCompletedAt) > Date.parse(nonceIssuedAt) ||
    Date.parse(nonceIssuedAt) > Date.parse(nonceSignedAt) ||
    Date.parse(nonceSignedAt) > Date.parse(nonceConsumedAt) ||
    Date.parse(nonceConsumedAt) >= Date.parse(nonceExpiresAt) ||
    Date.parse(nonceConsumedAt) > Date.parse(databaseNow)
  ) {
    throw new Error("attested release evidence relational proof is invalid");
  }

  if (
    eventKey !== deriveEventKey({
      releaseId: release.releaseId,
      commitSha: release.commitSha,
      artifactDigest: release.artifactDigest,
      operationId: publishOperation,
      idempotencyKey: eventIdempotencyKey,
      actorExternalUserId: eventActorExternalUserId,
      expectedVersion: eventExpectedVersion,
      expectedEvidenceDigest: expectedPreviousDigest,
      publishedVersion: eventPublishedVersion,
      evidenceDigest,
      evidenceExpiresAt: eventExpiresAt,
      occurredAt: eventOccurredAt,
    })
  ) {
    throw new Error("attested release evidence operator key is invalid");
  }

  const inspection = inspectRailwayBotReplyStagingAttestedReleaseEvidence({
    evidence: evidenceDocument,
    receipt,
    expected: {
      trustedKeyId,
      releaseId: release.releaseId,
      commitSha: release.commitSha,
      artifactDigest: release.artifactDigest,
      runKey: row.runRunKey,
      claimVersion: runClaimVersion,
      requestDigest: row.runRequestDigest,
      expectedEvidenceVersion: nonceExpectedVersion,
      attestationAuditKey: row.nonceAuditKey,
    },
    trustedKeys,
    clock: { now: () => new Date(databaseNow) },
  });
  if (
    inspection.status !== "signature-valid-only" ||
    inspection.evidenceDigest !== evidenceDigest ||
    inspection.evidenceCoreDigest !== row.nonceEvidenceCoreDigest ||
    inspection.attestationPayloadDigest !==
      row.nonceAttestationPayloadDigest ||
    inspection.verifiedAt !== evidenceVerifiedAt ||
    inspection.expiresAt !== evidenceExpiresAt ||
    serializeRailwayBotReplyStagingAttestedReleaseEvidence(
      inspection.evidence,
    ) !== evidenceJson ||
    inspection.evidence.attestation.policyVersion !== row.noncePolicyVersion ||
    inspection.evidence.attestation.keyId !== row.nonceKeyId ||
    inspection.evidence.attestation.nonce !== row.nonceNonce ||
    inspection.evidence.attestation.issuedAt !== nonceIssuedAt ||
    inspection.evidence.attestation.signedAt !== nonceSignedAt ||
    inspection.evidence.attestation.expiresAt !== nonceExpiresAt
  ) {
    throw new Error("attested release evidence verification is invalid");
  }

  return Object.freeze({
    status: "verified" as const,
    storageMode: "postgresql" as const,
    releaseId: release.releaseId,
    commitSha: release.commitSha,
    artifactDigest: release.artifactDigest,
    evidenceSchemaVersion: 2 as const,
    evidencePolicyVersion:
      railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
    evidenceVersion,
    evidenceDigest,
    verifiedAt: evidenceVerifiedAt,
    expiresAt: evidenceExpiresAt,
    replayProtected: true as const,
  });
}

export function createPostgresBotReplyStagingAttestedReleaseEvidenceReadRepository(
  rawQueries: PostgresQueryExecutor,
  rawRelease: Readonly<
    PostgresBotReplyStagingAttestedReleaseEvidenceReadIdentity
  >,
  rawTrustedKeyId: string,
  rawTrustedKeys: readonly Readonly<
    BotReplyStagingReceiptAttestationTrustedKey
  >[],
): Readonly<PostgresBotReplyStagingAttestedReleaseEvidenceReadRepository> {
  const executor = snapshotExactRecord(rawQueries, executorKeys);
  if (
    executor === null || typeof executor.query !== "function" ||
    nodeUtilTypes.isProxy(executor.query)
  ) {
    throw new TypeError("attested release evidence query executor is invalid");
  }
  const release = requireRelease(rawRelease);
  const trustedKeyId = requirePattern(
    rawTrustedKeyId,
    keyIdPattern,
    "trustedKeyId",
  );
  const trustedKeys = snapshotTrustedKeys(rawTrustedKeys);
  const query = executor.query as PostgresQueryExecutor["query"];

  return Object.freeze({
    async readVerified(): Promise<
      PostgresBotReplyStagingAttestedReleaseEvidenceReadResult
    > {
      const parameters: readonly PostgresParameter[] = Object.freeze([
        release.releaseId,
        release.commitSha,
        release.artifactDigest,
      ]);
      try {
        const result = await Reflect.apply(query, rawQueries, [
          postgresBotReplyStagingAttestedReleaseEvidenceReadSql.readVerified,
          parameters,
        ]) as unknown;
        return verifyRow(
          exactResultRow(result),
          release,
          trustedKeyId,
          trustedKeys,
        );
      } catch {
        return unavailable;
      }
    },
  });
}
