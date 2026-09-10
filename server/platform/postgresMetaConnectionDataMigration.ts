import {
  createPostgresDataMigrationProtocol,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresDataMigrationEvidence,
  PostgresDataMigrationPlan,
  PostgresDataMigrationRow,
  PostgresDataMigrationSnapshot,
  PostgresDataMigrationTableContract,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const controlCharacterPattern = /[\u0000-\u001f\u007f-\u009f]/u;
const eventKeyPattern = /^[0-9a-f]{64}$/;
const initializationVectorPattern = /^[A-Za-z0-9+/]{16}$/;
const ciphertextPattern = /^[A-Za-z0-9+/]{22,11998}={0,2}$/;
const connectionStatuses = new Set([
  "pending",
  "connected",
  "verification_required",
  "revoked",
  "error",
  "restricted",
]);

function invalid(): never {
  throw new Error("meta-connection-row-invalid");
}

function text(row: PostgresDataMigrationRow, name: string): string {
  const value = row[name];
  if (typeof value !== "string") invalid();
  return value;
}

function nullableText(
  row: PostgresDataMigrationRow,
  name: string,
): string | null {
  const value = row[name];
  if (value === null) return null;
  if (typeof value !== "string") invalid();
  return value;
}

function integer(row: PostgresDataMigrationRow, name: string): number {
  const value = row[name];
  if (!Number.isSafeInteger(value)) invalid();
  return Number(value);
}

function timestamp(row: PostgresDataMigrationRow, name: string): number {
  const milliseconds = Date.parse(text(row, name));
  if (!Number.isFinite(milliseconds)) invalid();
  return milliseconds;
}

function nullableTimestamp(
  row: PostgresDataMigrationRow,
  name: string,
): number | null {
  const value = nullableText(row, name);
  if (value === null) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) invalid();
  return milliseconds;
}

function requireTrimmedText(value: string, maximum: number): void {
  if (
    value.length === 0 ||
    value.length > maximum ||
    value !== value.trim() ||
    controlCharacterPattern.test(value)
  ) {
    invalid();
  }
}

function validateConnection(row: PostgresDataMigrationRow): void {
  requireTrimmedText(text(row, "business_portfolio_id"), 255);
  requireTrimmedText(text(row, "waba_id"), 255);
  requireTrimmedText(text(row, "phone_number_id"), 255);
  const status = text(row, "status");
  const webhookSubscribedAt = nullableTimestamp(
    row,
    "webhook_subscribed_at",
  );
  const connectedAt = nullableTimestamp(row, "connected_at");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");

  if (
    !connectionStatuses.has(status) ||
    integer(row, "version") < 1 ||
    updatedAt < createdAt ||
    (webhookSubscribedAt !== null && webhookSubscribedAt < createdAt) ||
    (connectedAt !== null && connectedAt < createdAt) ||
    (status === "pending" &&
      (webhookSubscribedAt !== null || connectedAt !== null)) ||
    (status === "connected" &&
      (webhookSubscribedAt === null || connectedAt === null))
  ) {
    invalid();
  }
}

function validateReceipt(row: PostgresDataMigrationRow): void {
  requireTrimmedText(text(row, "waba_id"), 255);
  requireTrimmedText(text(row, "object_type"), 255);
  const eventKey = text(row, "event_key");
  const status = text(row, "status");
  const errorCode = nullableText(row, "last_error_code");
  const receivedAt = timestamp(row, "received_at");
  const processedAt = nullableTimestamp(row, "processed_at");
  const updatedAt = timestamp(row, "updated_at");

  if (errorCode !== null) requireTrimmedText(errorCode, 100);
  if (
    !eventKeyPattern.test(eventKey) ||
    integer(row, "attempt_count") < 1 ||
    updatedAt < receivedAt ||
    (processedAt !== null && processedAt < receivedAt) ||
    (status === "processing" &&
      (processedAt !== null || errorCode !== null)) ||
    (status === "processed" &&
      (processedAt === null || errorCode !== null)) ||
    (status === "failed" &&
      (processedAt !== null || errorCode === null)) ||
    !["processing", "processed", "failed"].includes(status)
  ) {
    invalid();
  }
}

function validateCredentialEnvelope(row: PostgresDataMigrationRow): void {
  const initializationVector = text(row, "initialization_vector");
  const ciphertext = text(row, "ciphertext");
  if (
    text(row, "key_version") !== "v1" ||
    !initializationVectorPattern.test(initializationVector) ||
    ciphertext.length < 24 ||
    ciphertext.length > 12_000 ||
    !ciphertextPattern.test(ciphertext) ||
    timestamp(row, "updated_at") < timestamp(row, "created_at")
  ) {
    invalid();
  }
}

function column(
  name: string,
  kind: "positive-integer" | "text" | "timestamp",
  nullable = false,
) {
  return Object.freeze({
    name,
    kind,
    ...(nullable ? { nullable: true as const } : {}),
  });
}

export const POSTGRES_META_CONNECTION_DATA_TABLE_CONTRACTS = Object.freeze([
  Object.freeze({
    name: "meta_connections",
    columns: Object.freeze([
      column("tenant_id", "positive-integer"),
      column("business_portfolio_id", "text"),
      column("waba_id", "text"),
      column("phone_number_id", "text"),
      column("status", "text"),
      column("webhook_subscribed_at", "timestamp", true),
      column("connected_at", "timestamp", true),
      column("version", "positive-integer"),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
    ]),
    orderBy: Object.freeze(["tenant_id"]),
    validate: validateConnection,
  }),
  Object.freeze({
    name: "meta_webhook_receipts",
    columns: Object.freeze([
      column("id", "positive-integer"),
      column("tenant_id", "positive-integer"),
      column("waba_id", "text"),
      column("event_key", "text"),
      column("object_type", "text"),
      column("status", "text"),
      column("attempt_count", "positive-integer"),
      column("last_error_code", "text", true),
      column("received_at", "timestamp"),
      column("processed_at", "timestamp", true),
      column("updated_at", "timestamp"),
    ]),
    orderBy: Object.freeze(["tenant_id", "id"]),
    identityColumn: "id",
    validate: validateReceipt,
  }),
  Object.freeze({
    name: "meta_credential_envelopes",
    columns: Object.freeze([
      column("tenant_id", "positive-integer"),
      column("key_version", "text"),
      column("initialization_vector", "text"),
      column("ciphertext", "text"),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
    ]),
    orderBy: Object.freeze(["tenant_id"]),
    validate: validateCredentialEnvelope,
  }),
] satisfies readonly PostgresDataMigrationTableContract[]);

async function verifyLoadedState(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  const result = await transaction.query(
    `SELECT 1
     FROM meta_connections AS connection
     LEFT JOIN meta_credential_envelopes AS envelope
       ON envelope.tenant_id = connection.tenant_id
     WHERE connection.status = 'connected'
       AND envelope.tenant_id IS NULL
     UNION ALL
     SELECT 1
     FROM meta_credential_envelopes AS envelope
     LEFT JOIN meta_connections AS connection
       ON connection.tenant_id = envelope.tenant_id
     WHERE connection.tenant_id IS NULL
     LIMIT 1`,
    [],
  );
  if (result.rowCount !== 0) {
    throw new Error("meta-connection-state-invalid");
  }
}

const protocol = createPostgresDataMigrationProtocol({
  version: "connect_postgres_meta_connection_data_v1",
  planKind: "postgres-meta-connection-data-migration-plan",
  evidenceKind: "postgres-meta-connection-data-migration-evidence",
  advisoryLockKey: [1129270867, 1],
  tables: POSTGRES_META_CONNECTION_DATA_TABLE_CONTRACTS,
  verifyLoadedState,
});

export type PostgresMetaConnectionDataSnapshot = PostgresDataMigrationSnapshot;
export type PostgresMetaConnectionDataMigrationPlan =
  PostgresDataMigrationPlan;
export type PostgresMetaConnectionDataMigrationEvidence =
  PostgresDataMigrationEvidence;

export const createPostgresMetaConnectionDataSnapshot =
  protocol.createSnapshot;
export const createPostgresMetaConnectionDataMigrationPlan =
  protocol.createPlan;
export const executePostgresMetaConnectionDataMigration = protocol.execute;

export async function migratePostgresMetaConnectionData(input: Readonly<{
  snapshot: PostgresMetaConnectionDataSnapshot;
  transactions: PostgresTransactionManager;
  evidenceHmacKey: string;
  createdAt: string;
  expiresAt: string;
  now: string;
}>): Promise<PostgresMetaConnectionDataMigrationEvidence> {
  const plan = createPostgresMetaConnectionDataMigrationPlan({
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    evidenceHmacKey: input.evidenceHmacKey,
  });
  return executePostgresMetaConnectionDataMigration({
    plan,
    transactions: input.transactions,
    evidenceHmacKey: input.evidenceHmacKey,
    now: input.now,
  });
}
