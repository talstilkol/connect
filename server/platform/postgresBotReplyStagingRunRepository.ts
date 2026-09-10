import type {
  BotReplyStagingDurableClaimInput,
  BotReplyStagingDurableClaimResult,
  BotReplyStagingDurableCompleteInput,
  BotReplyStagingDurableCompleteResult,
  BotReplyStagingDurableReadInput,
  BotReplyStagingDurableReadResult,
  BotReplyStagingDurableRunStatusRepository,
} from "../operations/botReplyStagingDurableRunner.ts";
import {
  deriveBotReplyStagingDurableAuditKey,
  deriveBotReplyStagingDurableRequestDigest,
} from "../operations/botReplyStagingDurableIdentity.ts";
import {
  deriveBotReplyStagingReceiptDigest,
} from "../operations/botReplyStagingReceiptAttestation.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const auditKeyPattern = /^bot_reply_staging_audit_v1_[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const unsafeControlCharacters = /[\u0000-\u001f\u007f]/;
const maximumReceiptBytes = 48_000;

const rowKeys = Object.freeze([
  "actorExternalUserId",
  "artifactDigest",
  "auditKey",
  "claimVersion",
  "commitSha",
  "completedAt",
  "connectionVersion",
  "createdAt",
  "graphApiVersion",
  "leaseExpiresAt",
  "policyVersion",
  "rateLimitMethodFingerprint",
  "receiptDigest",
  "receiptJson",
  "recipientFingerprint",
  "releaseId",
  "requestDigest",
  "runKey",
  "startedAt",
  "status",
  "tenantId",
  "updatedAt",
]);

const columns = `
  run_key AS "runKey",
  tenant_id AS "tenantId",
  request_digest AS "requestDigest",
  actor_external_user_id AS "actorExternalUserId",
  connection_version AS "connectionVersion",
  policy_version AS "policyVersion",
  release_id AS "releaseId",
  commit_sha AS "commitSha",
  artifact_digest AS "artifactDigest",
  graph_api_version AS "graphApiVersion",
  recipient_fingerprint AS "recipientFingerprint",
  rate_limit_method_fingerprint AS "rateLimitMethodFingerprint",
  status,
  claim_version AS "claimVersion",
  lease_expires_at AS "leaseExpiresAt",
  audit_key AS "auditKey",
  receipt_json AS "receiptJson",
  receipt_digest AS "receiptDigest",
  started_at AS "startedAt",
  completed_at AS "completedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export const postgresBotReplyStagingRunSql = Object.freeze({
  insert: `
    INSERT INTO bot_reply_staging_runs (
      run_key,
      tenant_id,
      request_digest,
      actor_external_user_id,
      connection_version,
      policy_version,
      release_id,
      commit_sha,
      artifact_digest,
      graph_api_version,
      recipient_fingerprint,
      rate_limit_method_fingerprint,
      lease_expires_at,
      audit_key,
      started_at,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      $13::timestamptz, $14, $15::timestamptz,
      $15::timestamptz, $15::timestamptz
    )
    ON CONFLICT DO NOTHING
    RETURNING ${columns}
  `,
  findForUpdate: `
    SELECT ${columns}
    FROM bot_reply_staging_runs
    WHERE run_key = $1
    LIMIT 1
    FOR UPDATE
  `,
  find: `
    SELECT ${columns}
    FROM bot_reply_staging_runs
    WHERE run_key = $1
    LIMIT 1
  `,
  reclaim: `
    UPDATE bot_reply_staging_runs
    SET
      claim_version = claim_version + 1,
      lease_expires_at = $4::timestamptz,
      updated_at = $3::timestamptz
    WHERE run_key = $1
      AND request_digest = $2
      AND status = 'running'
      AND claim_version = $5
      AND lease_expires_at <= $3::timestamptz
    RETURNING ${columns}
  `,
  complete: `
    UPDATE bot_reply_staging_runs
    SET
      status = 'completed',
      receipt_json = $4,
      receipt_digest = $5,
      completed_at = $6::timestamptz,
      updated_at = $6::timestamptz
    WHERE run_key = $1
      AND request_digest = $2
      AND status = 'running'
      AND claim_version = $3
      AND $6::timestamptz BETWEEN started_at AND lease_expires_at
    RETURNING ${columns}
  `,
});

interface PersistedRun {
  readonly runKey: string;
  readonly tenantId: number;
  readonly requestDigest: string;
  readonly actorExternalUserId: string;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly recipientFingerprint: string;
  readonly rateLimitMethodFingerprint: string;
  readonly status: "running" | "completed";
  readonly claimVersion: number;
  readonly leaseExpiresAt: string;
  readonly auditKey: string;
  readonly receipt: unknown | null;
  readonly receiptDigest: string | null;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function requireExactKeys(
  value: unknown,
  keys: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== [...keys].sort().join(",")
  ) {
    throw new Error(`${label} is invalid`);
  }
}

function requirePattern(value: unknown, pattern: RegExp, label: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function requireActor(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 255 ||
    value.trim() !== value ||
    unsafeControlCharacters.test(value)
  ) {
    throw new Error("actorExternalUserId is invalid");
  }
  return value;
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

function requirePositiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error(`${label} is invalid`);
  }
  return Number(value);
}

function serializeReceipt(value: unknown): Readonly<{
  serialized: string;
  digest: string;
}> {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error("receipt is invalid");
  }
  if (
    typeof serialized !== "string" ||
    serialized.length < 2 ||
    new TextEncoder().encode(serialized).byteLength > maximumReceiptBytes ||
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("receipt is invalid");
  }
  return Object.freeze({
    serialized,
    digest: deriveBotReplyStagingReceiptDigest(value),
  });
}

function parseReceipt(
  serialized: unknown,
  expectedDigest: unknown,
): unknown {
  if (
    typeof serialized !== "string" ||
    serialized.length < 2 ||
    new TextEncoder().encode(serialized).byteLength > maximumReceiptBytes
  ) {
    throw new Error("PostgreSQL returned invalid staging receipt");
  }
  const normalized = serializeReceipt(JSON.parse(serialized));
  if (
    normalized.serialized !== serialized ||
    normalized.digest !== expectedDigest
  ) {
    throw new Error("PostgreSQL returned inconsistent staging receipt");
  }
  return JSON.parse(serialized);
}

function parseRow(value: unknown): Readonly<PersistedRun> {
  const row = requireExactPostgresRow(value, rowKeys);
  const status = row.status;
  if (status !== "running" && status !== "completed") {
    throw new Error("PostgreSQL returned invalid staging run status");
  }
  const completedAt = row.completedAt === null
    ? null
    : parsePostgresTimestamp(row.completedAt);
  const receiptDigest = row.receiptDigest === null
    ? null
    : requirePattern(
        row.receiptDigest,
        fingerprintPattern,
        "receiptDigest",
      );
  const receipt = row.receiptJson === null
    ? null
    : parseReceipt(row.receiptJson, receiptDigest);
  if (
    (status === "running" &&
      (receipt !== null || receiptDigest !== null || completedAt !== null)) ||
    (status === "completed" &&
      (receipt === null || receiptDigest === null || completedAt === null))
  ) {
    throw new Error("PostgreSQL returned inconsistent staging run state");
  }

  return Object.freeze({
    runKey: requirePattern(row.runKey, runKeyPattern, "runKey"),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    requestDigest: requirePattern(
      row.requestDigest,
      fingerprintPattern,
      "requestDigest",
    ),
    actorExternalUserId: requireActor(row.actorExternalUserId),
    connectionVersion: parsePostgresPositiveInteger(row.connectionVersion),
    policyVersion: parsePostgresPositiveInteger(row.policyVersion),
    releaseId: requirePattern(row.releaseId, releaseIdPattern, "releaseId"),
    commitSha: requirePattern(row.commitSha, commitShaPattern, "commitSha"),
    artifactDigest: requirePattern(
      row.artifactDigest,
      fingerprintPattern,
      "artifactDigest",
    ),
    graphApiVersion: requirePattern(
      row.graphApiVersion,
      graphApiVersionPattern,
      "graphApiVersion",
    ),
    recipientFingerprint: requirePattern(
      row.recipientFingerprint,
      fingerprintPattern,
      "recipientFingerprint",
    ),
    rateLimitMethodFingerprint: requirePattern(
      row.rateLimitMethodFingerprint,
      fingerprintPattern,
      "rateLimitMethodFingerprint",
    ),
    status,
    claimVersion: parsePostgresPositiveInteger(row.claimVersion),
    leaseExpiresAt: parsePostgresTimestamp(row.leaseExpiresAt),
    auditKey: requirePattern(row.auditKey, auditKeyPattern, "auditKey"),
    receipt,
    receiptDigest,
    startedAt: parsePostgresTimestamp(row.startedAt),
    completedAt,
    createdAt: parsePostgresTimestamp(row.createdAt),
    updatedAt: parsePostgresTimestamp(row.updatedAt),
  });
}

function normalizeRunInput(input: BotReplyStagingDurableClaimInput) {
  requireExactKeys(
    input,
    ["auditKey", "claimedAt", "leaseExpiresAt", "requestDigest", "run"],
    "claim input",
  );
  requireExactKeys(input.run, [
    "actorExternalUserId",
    "artifactDigest",
    "commitSha",
    "expectedConnectionVersion",
    "expectedPolicyVersion",
    "graphApiVersion",
    "rateLimitMethodFingerprint",
    "recipientFingerprint",
    "releaseId",
    "requestedAt",
    "runKey",
    "targetTenantId",
  ], "run input");
  const run = input.run;
  const claimedAt = requireCanonicalTimestamp(input.claimedAt, "claimedAt");
  const leaseExpiresAt = requireCanonicalTimestamp(
    input.leaseExpiresAt,
    "leaseExpiresAt",
  );
  const duration = Date.parse(leaseExpiresAt) - Date.parse(claimedAt);
  const requestDigest = requirePattern(
    input.requestDigest,
    fingerprintPattern,
    "requestDigest",
  );
  const auditKey = requirePattern(input.auditKey, auditKeyPattern, "auditKey");
  if (
    duration < 60_000 ||
    duration > 3_600_000 ||
    requestDigest !== deriveBotReplyStagingDurableRequestDigest(run) ||
    auditKey !== deriveBotReplyStagingDurableAuditKey(run.runKey, requestDigest)
  ) {
    throw new Error("claim identity is invalid");
  }
  return Object.freeze({
    run: Object.freeze({
      runKey: requirePattern(run.runKey, runKeyPattern, "runKey"),
      targetTenantId: requirePositiveInteger(run.targetTenantId, "tenantId"),
      expectedConnectionVersion: requirePositiveInteger(
        run.expectedConnectionVersion,
        "connectionVersion",
      ),
      expectedPolicyVersion: requirePositiveInteger(
        run.expectedPolicyVersion,
        "policyVersion",
      ),
      releaseId: requirePattern(run.releaseId, releaseIdPattern, "releaseId"),
      commitSha: requirePattern(run.commitSha, commitShaPattern, "commitSha"),
      artifactDigest: requirePattern(
        run.artifactDigest,
        fingerprintPattern,
        "artifactDigest",
      ),
      graphApiVersion: requirePattern(
        run.graphApiVersion,
        graphApiVersionPattern,
        "graphApiVersion",
      ),
      requestedAt: requireCanonicalTimestamp(run.requestedAt, "requestedAt"),
      recipientFingerprint: requirePattern(
        run.recipientFingerprint,
        fingerprintPattern,
        "recipientFingerprint",
      ),
      rateLimitMethodFingerprint: requirePattern(
        run.rateLimitMethodFingerprint,
        fingerprintPattern,
        "rateLimitMethodFingerprint",
      ),
      actorExternalUserId: requireActor(run.actorExternalUserId),
    }),
    requestDigest,
    auditKey,
    claimedAt,
    leaseExpiresAt,
  });
}

function rowMatches(
  row: Readonly<PersistedRun>,
  input: ReturnType<typeof normalizeRunInput>,
): boolean {
  const run = input.run;
  return row.runKey === run.runKey &&
    row.tenantId === run.targetTenantId &&
    row.requestDigest === input.requestDigest &&
    row.actorExternalUserId === run.actorExternalUserId &&
    row.connectionVersion === run.expectedConnectionVersion &&
    row.policyVersion === run.expectedPolicyVersion &&
    row.releaseId === run.releaseId &&
    row.commitSha === run.commitSha &&
    row.artifactDigest === run.artifactDigest &&
    row.graphApiVersion === run.graphApiVersion &&
    row.recipientFingerprint === run.recipientFingerprint &&
    row.rateLimitMethodFingerprint === run.rateLimitMethodFingerprint &&
    row.auditKey === input.auditKey;
}

async function selectRun(
  transaction: PostgresQueryExecutor,
  runKey: string,
): Promise<Readonly<PersistedRun> | null> {
  const rows = requirePostgresRows(
    await transaction.query<unknown>(
      postgresBotReplyStagingRunSql.findForUpdate,
      [runKey],
    ),
    1,
  );
  return rows.length === 0 ? null : parseRow(rows[0]);
}

function replay(row: Readonly<PersistedRun>): BotReplyStagingDurableClaimResult {
  if (
    row.status !== "completed" ||
    row.completedAt === null ||
    row.receipt === null
  ) {
    throw new Error("Completed staging run is inconsistent");
  }
  return Object.freeze({
    outcome: "replayed",
    runKey: row.runKey,
    auditKey: row.auditKey,
    completedAt: row.completedAt,
    receipt: row.receipt,
  });
}

export function createPostgresBotReplyStagingRunRepository(
  transactions: PostgresTransactionManager,
): BotReplyStagingDurableRunStatusRepository {
  if (!transactions || typeof transactions.transaction !== "function") {
    throw new Error("PostgreSQL staging run transactions are invalid");
  }

  return Object.freeze({
    async read(rawInput: Readonly<BotReplyStagingDurableReadInput>) {
      requireExactKeys(
        rawInput,
        ["requestDigest", "runKey"],
        "read input",
      );
      const runKey = requirePattern(
        rawInput.runKey,
        runKeyPattern,
        "runKey",
      );
      const requestDigest = requirePattern(
        rawInput.requestDigest,
        fingerprintPattern,
        "requestDigest",
      );
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction): Promise<BotReplyStagingDurableReadResult> => {
          const rows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyStagingRunSql.find,
              [runKey],
            ),
            1,
          );
          if (rows.length === 0) {
            return Object.freeze({ outcome: "missing-or-conflict", runKey });
          }
          const persisted = parseRow(rows[0]);
          if (persisted.requestDigest !== requestDigest) {
            return Object.freeze({ outcome: "missing-or-conflict", runKey });
          }
          if (persisted.status === "running") {
            return Object.freeze({
              outcome: "running",
              runKey,
              auditKey: persisted.auditKey,
              claimVersion: persisted.claimVersion,
              leaseExpiresAt: persisted.leaseExpiresAt,
            });
          }
          if (persisted.completedAt === null || persisted.receipt === null) {
            throw new Error("Completed staging run is inconsistent");
          }
          return Object.freeze({
            outcome: "completed",
            runKey,
            auditKey: persisted.auditKey,
            claimVersion: persisted.claimVersion,
            completedAt: persisted.completedAt,
            receipt: persisted.receipt,
          });
        },
      );
    },

    async claim(
      rawInput: Readonly<BotReplyStagingDurableClaimInput>,
    ) {
      const input = normalizeRunInput(rawInput);
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction): Promise<BotReplyStagingDurableClaimResult> => {
          const run = input.run;
          const insertedRows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyStagingRunSql.insert,
              [
                run.runKey,
                run.targetTenantId,
                input.requestDigest,
                run.actorExternalUserId,
                run.expectedConnectionVersion,
                run.expectedPolicyVersion,
                run.releaseId,
                run.commitSha,
                run.artifactDigest,
                run.graphApiVersion,
                run.recipientFingerprint,
                run.rateLimitMethodFingerprint,
                input.leaseExpiresAt,
                input.auditKey,
                input.claimedAt,
              ],
            ),
            1,
          );
          if (insertedRows.length === 1) {
            const inserted = parseRow(insertedRows[0]);
            if (!rowMatches(inserted, input) || inserted.claimVersion !== 1) {
              throw new Error("PostgreSQL inserted invalid staging run");
            }
            return Object.freeze({
              outcome: "claimed",
              runKey: inserted.runKey,
              auditKey: inserted.auditKey,
              claimVersion: inserted.claimVersion,
              leaseExpiresAt: inserted.leaseExpiresAt,
            });
          }

          const existing = await selectRun(transaction, run.runKey);
          if (existing === null) {
            throw new Error("PostgreSQL staging run disappeared");
          }
          if (!rowMatches(existing, input)) {
            return Object.freeze({ outcome: "conflict", runKey: run.runKey });
          }
          if (existing.status === "completed") return replay(existing);
          if (Date.parse(existing.leaseExpiresAt) > Date.parse(input.claimedAt)) {
            return Object.freeze({
              outcome: "in-progress",
              runKey: run.runKey,
            });
          }

          const reclaimedRows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyStagingRunSql.reclaim,
              [
                run.runKey,
                input.requestDigest,
                input.claimedAt,
                input.leaseExpiresAt,
                existing.claimVersion,
              ],
            ),
            1,
          );
          if (reclaimedRows.length !== 1) {
            throw new Error("PostgreSQL staging lease reclaim failed");
          }
          const reclaimed = parseRow(reclaimedRows[0]);
          if (
            !rowMatches(reclaimed, input) ||
            reclaimed.claimVersion !== existing.claimVersion + 1
          ) {
            throw new Error("PostgreSQL returned invalid staging reclaim");
          }
          return Object.freeze({
            outcome: "claimed",
            runKey: reclaimed.runKey,
            auditKey: reclaimed.auditKey,
            claimVersion: reclaimed.claimVersion,
            leaseExpiresAt: reclaimed.leaseExpiresAt,
          });
        },
      );
    },

    async complete(
      rawInput: Readonly<BotReplyStagingDurableCompleteInput>,
    ) {
      requireExactKeys(rawInput, [
        "completedAt",
        "expectedClaimVersion",
        "receipt",
        "receiptDigest",
        "requestDigest",
        "runKey",
      ], "completion input");
      const input = rawInput as unknown as BotReplyStagingDurableCompleteInput;
      const runKey = requirePattern(input.runKey, runKeyPattern, "runKey");
      const requestDigest = requirePattern(
        input.requestDigest,
        fingerprintPattern,
        "requestDigest",
      );
      const expectedClaimVersion = requirePositiveInteger(
        input.expectedClaimVersion,
        "expectedClaimVersion",
      );
      const completedAt = requireCanonicalTimestamp(
        input.completedAt,
        "completedAt",
      );
      const receipt = serializeReceipt(input.receipt);
      if (receipt.digest !== input.receiptDigest) {
        throw new Error("receiptDigest is invalid");
      }

      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction): Promise<BotReplyStagingDurableCompleteResult> => {
          const existing = await selectRun(transaction, runKey);
          if (existing === null || existing.requestDigest !== requestDigest) {
            return Object.freeze({ outcome: "conflict", runKey });
          }
          if (existing.status === "completed") {
            if (existing.receiptDigest !== receipt.digest) {
              return Object.freeze({ outcome: "conflict", runKey });
            }
            return Object.freeze({
              outcome: "replayed",
              runKey,
              auditKey: existing.auditKey,
              completedAt: existing.completedAt as string,
              receipt: existing.receipt,
            });
          }
          if (existing.claimVersion !== expectedClaimVersion) {
            return Object.freeze({ outcome: "conflict", runKey });
          }
          if (
            Date.parse(completedAt) > Date.parse(existing.leaseExpiresAt) ||
            Date.parse(completedAt) < Date.parse(existing.startedAt)
          ) {
            return Object.freeze({ outcome: "lease-expired", runKey });
          }

          const completedRows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyStagingRunSql.complete,
              [
                runKey,
                requestDigest,
                expectedClaimVersion,
                receipt.serialized,
                receipt.digest,
                completedAt,
              ],
            ),
            1,
          );
          if (completedRows.length !== 1) {
            throw new Error("PostgreSQL staging completion failed");
          }
          const completed = parseRow(completedRows[0]);
          if (
            completed.status !== "completed" ||
            completed.claimVersion !== expectedClaimVersion ||
            completed.requestDigest !== requestDigest ||
            completed.receiptDigest !== receipt.digest ||
            completed.completedAt !== completedAt ||
            completed.receipt === null
          ) {
            throw new Error("PostgreSQL returned invalid staging completion");
          }
          return Object.freeze({
            outcome: "completed",
            runKey,
            auditKey: completed.auditKey,
            completedAt,
            receipt: completed.receipt,
          });
        },
      );
    },
  });
}
