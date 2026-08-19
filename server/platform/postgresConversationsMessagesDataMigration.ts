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
const conversationKeyPattern = /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern = /^message_v1_[0-9a-f]{64}$/;
const eventKeyPattern = /^[0-9a-f]{64}$/;
const conversationStatuses = new Set([
  "new",
  "bot_active",
  "waiting_for_agent",
  "agent_active",
  "waiting_for_contact",
  "closed",
]);
const contentKinds = new Set([
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contacts",
  "interactive",
  "unsupported",
]);
const messageStatuses = new Set([
  "received",
  "sent",
  "delivered",
  "read",
  "failed",
]);

function invalid(): never {
  throw new Error("conversations-messages-row-invalid");
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

function validateConversation(row: PostgresDataMigrationRow): void {
  const assignee = nullableText(row, "assigned_external_user_id");
  const lastMessageKey = nullableText(row, "last_message_key");
  const lastMessageAt = nullableTimestamp(row, "last_message_at");
  if (assignee !== null) requireTrimmedText(assignee, 255);

  if (
    !conversationKeyPattern.test(text(row, "conversation_key")) ||
    !conversationStatuses.has(text(row, "status")) ||
    integer(row, "unread_count") < 0 ||
    integer(row, "version") < 1 ||
    (lastMessageKey !== null && !messageKeyPattern.test(lastMessageKey)) ||
    (lastMessageKey === null) !== (lastMessageAt === null) ||
    timestamp(row, "updated_at") < timestamp(row, "created_at")
  ) {
    invalid();
  }
}

function validateMessage(row: PostgresDataMigrationRow): void {
  const providerMessageId = text(row, "provider_message_id");
  const direction = text(row, "direction");
  const contentKind = text(row, "content_kind");
  const status = text(row, "status");
  const textContent = nullableText(row, "text_content");
  const occurredAt = timestamp(row, "occurred_at");
  const statusUpdatedAt = timestamp(row, "status_updated_at");
  const lastStatusEventKey = nullableText(row, "last_status_event_key");
  const lastStatusEventAt = nullableTimestamp(row, "last_status_event_at");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");

  requireTrimmedText(providerMessageId, 255);
  if (
    !messageKeyPattern.test(text(row, "message_key")) ||
    !conversationKeyPattern.test(text(row, "conversation_key")) ||
    !["inbound", "outbound"].includes(direction) ||
    !contentKinds.has(contentKind) ||
    !messageStatuses.has(status) ||
    !(
      (direction === "inbound" && status === "received") ||
      (direction === "outbound" &&
        ["sent", "delivered", "read", "failed"].includes(status))
    ) ||
    !(
      (contentKind === "text" &&
        textContent !== null &&
        textContent.trim().length >= 1 &&
        textContent.trim().length <= 16_384) ||
      (contentKind !== "text" && textContent === null)
    ) ||
    statusUpdatedAt < occurredAt ||
    (lastStatusEventKey !== null &&
      !eventKeyPattern.test(lastStatusEventKey)) ||
    (lastStatusEventKey === null) !== (lastStatusEventAt === null) ||
    (lastStatusEventAt !== null && lastStatusEventAt < occurredAt) ||
    updatedAt < createdAt
  ) {
    invalid();
  }
}

function column(
  name: string,
  kind: "nonnegative-integer" | "positive-integer" | "text" | "timestamp",
  nullable = false,
) {
  return Object.freeze({
    name,
    kind,
    ...(nullable ? { nullable: true as const } : {}),
  });
}

export const POSTGRES_CONVERSATIONS_MESSAGES_DATA_TABLE_CONTRACTS =
  Object.freeze([
    Object.freeze({
      name: "conversations",
      columns: Object.freeze([
        column("conversation_key", "text"),
        column("tenant_id", "positive-integer"),
        column("contact_id", "positive-integer"),
        column("status", "text"),
        column("assigned_external_user_id", "text", true),
        column("unread_count", "nonnegative-integer"),
        column("last_message_key", "text", true),
        column("last_message_at", "timestamp", true),
        column("version", "positive-integer"),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "conversation_key"]),
      validate: validateConversation,
    }),
    Object.freeze({
      name: "messages",
      columns: Object.freeze([
        column("message_key", "text"),
        column("conversation_key", "text"),
        column("tenant_id", "positive-integer"),
        column("provider_message_id", "text"),
        column("direction", "text"),
        column("content_kind", "text"),
        column("status", "text"),
        column("text_content", "text", true),
        column("occurred_at", "timestamp"),
        column("status_updated_at", "timestamp"),
        column("last_status_event_key", "text", true),
        column("last_status_event_at", "timestamp", true),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze([
        "tenant_id",
        "conversation_key",
        "occurred_at",
        "message_key",
      ]),
      validate: validateMessage,
    }),
  ] satisfies readonly PostgresDataMigrationTableContract[]);

async function verifyLoadedState(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  const result = await transaction.query(
    `SELECT 1
     FROM conversations AS conversation
     LEFT JOIN messages AS message
       ON message.tenant_id = conversation.tenant_id
       AND message.conversation_key = conversation.conversation_key
       AND message.message_key = conversation.last_message_key
     WHERE conversation.last_message_key IS NOT NULL
       AND (
         message.message_key IS NULL
         OR message.occurred_at IS DISTINCT FROM conversation.last_message_at
       )
     LIMIT 1`,
    [],
  );
  if (result.rowCount !== 0) {
    throw new Error("conversations-messages-state-invalid");
  }
}

const protocol = createPostgresDataMigrationProtocol({
  version: "connect_postgres_conversations_messages_data_v1",
  planKind: "postgres-conversations-messages-data-migration-plan",
  evidenceKind: "postgres-conversations-messages-data-migration-evidence",
  advisoryLockKey: [1129270867, 1],
  tables: POSTGRES_CONVERSATIONS_MESSAGES_DATA_TABLE_CONTRACTS,
  verifyLoadedState,
});

export type PostgresConversationsMessagesDataSnapshot =
  PostgresDataMigrationSnapshot;
export type PostgresConversationsMessagesDataMigrationPlan =
  PostgresDataMigrationPlan;
export type PostgresConversationsMessagesDataMigrationEvidence =
  PostgresDataMigrationEvidence;

export const createPostgresConversationsMessagesDataSnapshot =
  protocol.createSnapshot;
export const createPostgresConversationsMessagesDataMigrationPlan =
  protocol.createPlan;
export const executePostgresConversationsMessagesDataMigration =
  protocol.execute;

export async function migratePostgresConversationsMessagesData(
  input: Readonly<{
    snapshot: PostgresConversationsMessagesDataSnapshot;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    createdAt: string;
    expiresAt: string;
    now: string;
  }>,
): Promise<PostgresConversationsMessagesDataMigrationEvidence> {
  const plan = createPostgresConversationsMessagesDataMigrationPlan({
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    evidenceHmacKey: input.evidenceHmacKey,
  });
  return executePostgresConversationsMessagesDataMigration({
    plan,
    transactions: input.transactions,
    evidenceHmacKey: input.evidenceHmacKey,
    now: input.now,
  });
}
