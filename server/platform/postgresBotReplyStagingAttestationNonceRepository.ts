import { types as nodeUtilTypes } from "node:util";

import {
  botReplyStagingReceiptAttestationPolicyVersion,
  deriveBotReplyStagingReceiptAttestationNonce,
  deriveBotReplyStagingReceiptAttestationPayloadDigest,
  type BotReplyStagingReceiptAttestationNonceClaim,
  type BotReplyStagingReceiptAttestationNonceClaimResult,
} from "../operations/botReplyStagingReceiptAttestation.ts";
import {
  parsePostgresNonnegativeInteger,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

export const postgresBotReplyStagingAttestationNonceRepositoryVersion =
  "connect-postgres-bot-reply-staging-attestation-nonce-repository-v1" as const;

const maximumInteger = 2_147_483_647;
const minimumLifetimeMilliseconds = 60 * 1_000;
const maximumLifetimeMilliseconds = 15 * 60 * 1_000;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const keyIdPattern = /^bot_reply_staging_worker_key_v1_[a-f0-9]{64}$/;
const noncePattern =
  /^bot_reply_staging_attestation_nonce_v1_[a-f0-9]{64}$/;
const auditKeyPattern =
  /^bot_reply_staging_attestation_audit_v1_[a-f0-9]{64}$/;

const claimKeys = Object.freeze([
  "artifactDigest",
  "attestationPayloadDigest",
  "auditKey",
  "claimVersion",
  "commitSha",
  "evidenceCoreDigest",
  "expectedEvidenceVersion",
  "expiresAt",
  "issuedAt",
  "keyId",
  "nonce",
  "nonceSequence",
  "policyVersion",
  "receiptDigest",
  "releaseId",
  "requestDigest",
  "runKey",
  "signedAt",
]);
const resultRowKeys = Object.freeze([
  "attestationPayloadDigest",
  "evidenceCoreDigest",
  "expectedEvidenceVersion",
  "nonce",
  "receiptDigest",
  "resultStatus",
]);

export const postgresBotReplyStagingAttestationNonceSql = Object.freeze({
  consume: `
    SELECT
      result_status AS "resultStatus",
      nonce,
      receipt_digest AS "receiptDigest",
      evidence_core_digest AS "evidenceCoreDigest",
      expected_evidence_version AS "expectedEvidenceVersion",
      attestation_payload_digest AS "attestationPayloadDigest"
    FROM public.consume_bot_reply_staging_attestation_nonce(
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
      $18
    )
  `,
});

export interface PostgresBotReplyStagingAttestationNonceRepository {
  consumeNonce(
    transaction: Readonly<PostgresQueryExecutor>,
    claim: Readonly<BotReplyStagingReceiptAttestationNonceClaim>,
  ): Promise<BotReplyStagingReceiptAttestationNonceClaimResult>;
}

function snapshotExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
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
    if (
      ownKeys.length !== expectedKeys.length ||
      ownKeys.some((key) => typeof key !== "string")
    ) {
      return null;
    }
    const keys = (ownKeys as string[]).sort();
    const normalizedExpectedKeys = [...expectedKeys].sort();
    if (keys.some((key, index) => key !== normalizedExpectedKeys[index])) {
      return null;
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
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

function requireInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (
    !Number.isSafeInteger(value) || Number(value) < minimum ||
    Number(value) > maximum
  ) {
    throw new TypeError(`${label} is invalid`);
  }
  return Number(value);
}

function requireTimestamp(
  value: unknown,
  label: string,
): Readonly<{ canonical: string; milliseconds: number }> {
  if (typeof value !== "string" || value.length > 40) {
    throw new TypeError(`${label} is invalid`);
  }
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    throw new TypeError(`${label} is invalid`);
  }
  return Object.freeze({ canonical: value, milliseconds });
}

function parseClaim(
  value: unknown,
): Readonly<BotReplyStagingReceiptAttestationNonceClaim> {
  const snapshot = snapshotExactRecord(value, claimKeys);
  if (
    snapshot === null || snapshot.policyVersion !==
      botReplyStagingReceiptAttestationPolicyVersion
  ) {
    throw new TypeError("attestation nonce claim is invalid");
  }

  const claimVersion = requireInteger(
    snapshot.claimVersion,
    1,
    maximumInteger,
    "claimVersion",
  );
  const nonceSequence = requireInteger(
    snapshot.nonceSequence,
    1,
    maximumInteger,
    "nonceSequence",
  );
  if (claimVersion !== nonceSequence) {
    throw new TypeError("attestation nonce sequence is invalid");
  }
  const expectedEvidenceVersion = requireInteger(
    snapshot.expectedEvidenceVersion,
    0,
    maximumInteger - 1,
    "expectedEvidenceVersion",
  );
  const issuedAt = requireTimestamp(snapshot.issuedAt, "issuedAt");
  const signedAt = requireTimestamp(snapshot.signedAt, "signedAt");
  const expiresAt = requireTimestamp(snapshot.expiresAt, "expiresAt");
  const lifetime = expiresAt.milliseconds - issuedAt.milliseconds;
  if (
    signedAt.milliseconds < issuedAt.milliseconds ||
    signedAt.milliseconds >= expiresAt.milliseconds ||
    lifetime < minimumLifetimeMilliseconds ||
    lifetime > maximumLifetimeMilliseconds
  ) {
    throw new TypeError("attestation nonce claim time window is invalid");
  }

  const claim = Object.freeze({
    policyVersion: botReplyStagingReceiptAttestationPolicyVersion,
    keyId: requirePattern(snapshot.keyId, keyIdPattern, "keyId"),
    runKey: requirePattern(snapshot.runKey, runKeyPattern, "runKey"),
    claimVersion,
    requestDigest: requirePattern(
      snapshot.requestDigest,
      digestPattern,
      "requestDigest",
    ),
    releaseId: requirePattern(
      snapshot.releaseId,
      releaseIdPattern,
      "releaseId",
    ),
    commitSha: requirePattern(
      snapshot.commitSha,
      commitShaPattern,
      "commitSha",
    ),
    artifactDigest: requirePattern(
      snapshot.artifactDigest,
      digestPattern,
      "artifactDigest",
    ),
    expectedEvidenceVersion,
    receiptDigest: requirePattern(
      snapshot.receiptDigest,
      digestPattern,
      "receiptDigest",
    ),
    evidenceCoreDigest: requirePattern(
      snapshot.evidenceCoreDigest,
      digestPattern,
      "evidenceCoreDigest",
    ),
    auditKey: requirePattern(
      snapshot.auditKey,
      auditKeyPattern,
      "auditKey",
    ),
    nonce: requirePattern(snapshot.nonce, noncePattern, "nonce"),
    nonceSequence,
    issuedAt: issuedAt.canonical,
    signedAt: signedAt.canonical,
    expiresAt: expiresAt.canonical,
    attestationPayloadDigest: requirePattern(
      snapshot.attestationPayloadDigest,
      digestPattern,
      "attestationPayloadDigest",
    ),
  } satisfies BotReplyStagingReceiptAttestationNonceClaim);

  if (
    deriveBotReplyStagingReceiptAttestationNonce(claim) !== claim.nonce
  ) {
    throw new TypeError("attestation nonce claim nonce is invalid");
  }

  const payloadDigest =
    deriveBotReplyStagingReceiptAttestationPayloadDigest(Object.freeze({
      schemaVersion: 1,
      policyVersion: claim.policyVersion,
      algorithm: "Ed25519",
      audience: "connect-release-evidence-builder",
      environment: "staging",
      keyId: claim.keyId,
      runKey: claim.runKey,
      claimVersion: claim.claimVersion,
      requestDigest: claim.requestDigest,
      releaseId: claim.releaseId,
      commitSha: claim.commitSha,
      artifactDigest: claim.artifactDigest,
      expectedEvidenceVersion: claim.expectedEvidenceVersion,
      receiptDigest: claim.receiptDigest,
      evidenceCoreDigest: claim.evidenceCoreDigest,
      auditKey: claim.auditKey,
      nonce: claim.nonce,
      nonceSequence: claim.nonceSequence,
      issuedAt: claim.issuedAt,
      signedAt: claim.signedAt,
      expiresAt: claim.expiresAt,
    }));
  if (payloadDigest !== claim.attestationPayloadDigest) {
    throw new TypeError("attestation nonce claim payload digest is invalid");
  }

  return claim;
}

function parseResult(
  value: unknown,
  expected: Readonly<BotReplyStagingReceiptAttestationNonceClaim>,
): BotReplyStagingReceiptAttestationNonceClaimResult {
  const row = snapshotExactRecord(value, resultRowKeys);
  if (row === null) {
    throw new Error("PostgreSQL returned an invalid nonce row");
  }
  if (row.resultStatus === "conflict") {
    if (
      row.nonce !== null || row.receiptDigest !== null ||
      row.evidenceCoreDigest !== null ||
      row.expectedEvidenceVersion !== null ||
      row.attestationPayloadDigest !== null
    ) {
      throw new Error("PostgreSQL returned an invalid nonce conflict");
    }
    return Object.freeze({ status: "conflict" });
  }
  if (row.resultStatus !== "consumed" && row.resultStatus !== "replayed") {
    throw new Error("PostgreSQL returned an invalid nonce status");
  }

  const nonce = requirePattern(row.nonce, noncePattern, "stored nonce");
  const receiptDigest = requirePattern(
    row.receiptDigest,
    digestPattern,
    "stored receiptDigest",
  );
  const evidenceCoreDigest = requirePattern(
    row.evidenceCoreDigest,
    digestPattern,
    "stored evidenceCoreDigest",
  );
  const expectedEvidenceVersion = parsePostgresNonnegativeInteger(
    row.expectedEvidenceVersion,
  );
  const attestationPayloadDigest = requirePattern(
    row.attestationPayloadDigest,
    digestPattern,
    "stored attestationPayloadDigest",
  );
  if (
    nonce !== expected.nonce || receiptDigest !== expected.receiptDigest ||
    evidenceCoreDigest !== expected.evidenceCoreDigest ||
    expectedEvidenceVersion !== expected.expectedEvidenceVersion ||
    attestationPayloadDigest !== expected.attestationPayloadDigest
  ) {
    throw new Error("PostgreSQL returned a mismatched nonce claim");
  }

  if (row.resultStatus === "consumed") {
    return Object.freeze({ status: "consumed", attestationPayloadDigest });
  }
  return Object.freeze({
    status: "replayed",
    nonce,
    receiptDigest,
    evidenceCoreDigest,
    expectedEvidenceVersion,
    attestationPayloadDigest,
  });
}

function requireSingleSafeRow(result: unknown): unknown {
  const snapshot = snapshotExactRecord(result, ["rowCount", "rows"]);
  if (snapshot === null || snapshot.rowCount !== 1) {
    throw new Error("PostgreSQL returned an invalid nonce result");
  }

  const rows = snapshot.rows;
  if (
    !Array.isArray(rows) || nodeUtilTypes.isProxy(rows) ||
    Object.getPrototypeOf(rows) !== Array.prototype
  ) {
    throw new Error("PostgreSQL returned invalid nonce rows");
  }

  try {
    const ownKeys = Reflect.ownKeys(rows);
    const rowDescriptor = Object.getOwnPropertyDescriptor(rows, "0");
    const lengthDescriptor = Object.getOwnPropertyDescriptor(rows, "length");
    if (
      ownKeys.length !== 2 || ownKeys[0] !== "0" || ownKeys[1] !== "length" ||
      rowDescriptor === undefined || !("value" in rowDescriptor) ||
      rowDescriptor.enumerable !== true ||
      lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
      lengthDescriptor.value !== 1
    ) {
      throw new Error("PostgreSQL returned invalid nonce rows");
    }
    return rowDescriptor.value;
  } catch (failure) {
    if (failure instanceof Error && failure.message.includes("nonce rows")) {
      throw failure;
    }
    throw new Error("PostgreSQL returned invalid nonce rows", {
      cause: failure,
    });
  }
}

export function createPostgresBotReplyStagingAttestationNonceRepository(
): Readonly<PostgresBotReplyStagingAttestationNonceRepository> {
  return Object.freeze({
    async consumeNonce(
      transaction: Readonly<PostgresQueryExecutor>,
      input: Readonly<BotReplyStagingReceiptAttestationNonceClaim>,
    ): Promise<BotReplyStagingReceiptAttestationNonceClaimResult> {
      const transactionSnapshot = snapshotExactRecord(
        transaction,
        ["query"],
      );
      const query = transactionSnapshot?.query;
      if (typeof query !== "function" || nodeUtilTypes.isProxy(query)) {
        throw new TypeError("attestation nonce transaction is invalid");
      }
      const claim = parseClaim(input);
      const parameters = Object.freeze([
        claim.policyVersion,
        claim.keyId,
        claim.runKey,
        claim.claimVersion,
        claim.requestDigest,
        claim.releaseId,
        claim.commitSha,
        claim.artifactDigest,
        claim.expectedEvidenceVersion,
        claim.receiptDigest,
        claim.evidenceCoreDigest,
        claim.auditKey,
        claim.nonce,
        claim.nonceSequence,
        claim.issuedAt,
        claim.signedAt,
        claim.expiresAt,
        claim.attestationPayloadDigest,
      ]);
      const result = await Reflect.apply(query, transaction, [
        postgresBotReplyStagingAttestationNonceSql.consume,
        parameters,
      ]) as unknown;
      return parseResult(requireSingleSafeRow(result), claim);
    },
  });
}
