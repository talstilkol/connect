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
import {
  validateBotFlowDefinition,
} from "../../shared/validation/botFlowDefinition.ts";

const controlCharacterPattern = /[\u0000-\u001f\u007f-\u009f]/u;
const botFlowKeyPattern = /^bot_flow_v1_[0-9a-f]{64}$/;
const botFlowVersionKeyPattern = /^bot_flow_version_v1_[0-9a-f]{64}$/;
const deliveryKeyPattern = /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const conversationKeyPattern = /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern = /^message_v1_[0-9a-f]{64}$/;
const optionKeyPattern = /^bot_option_v1_[0-9a-f]{64}$/;
const phonePattern = /^\+[1-9][0-9]{0,14}$/;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/;
const flowStatuses = new Set(["draft", "active", "inactive"]);
const versionStatuses = new Set(["draft", "published", "archived"]);
const deliveryStatuses = new Set([
  "pending",
  "sending",
  "accepted",
  "rejected",
  "ambiguous",
]);

function invalid(): never {
  throw new Error("bot-runtime-row-invalid");
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

function parseJson(row: PostgresDataMigrationRow, name: string): unknown {
  try {
    return JSON.parse(text(row, name)) as unknown;
  } catch {
    invalid();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}

function validReply(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    value.kind === "text" &&
    hasExactKeys(value, ["kind", "text"]) &&
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    value.text.length <= 4_096
  ) {
    return true;
  }
  if (
    value.kind !== "buttons" ||
    !hasExactKeys(value, ["kind", "options", "text"]) ||
    typeof value.text !== "string" ||
    value.text.trim().length === 0 ||
    value.text.length > 4_096 ||
    !Array.isArray(value.options) ||
    value.options.length === 0 ||
    value.options.length > 10
  ) {
    return false;
  }
  return value.options.every((option) => (
    isRecord(option) &&
    hasExactKeys(option, ["label", "optionKey"]) &&
    typeof option.optionKey === "string" &&
    optionKeyPattern.test(option.optionKey) &&
    typeof option.label === "string" &&
    option.label.trim().length > 0 &&
    option.label.length <= 80
  ));
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

function validateFlow(row: PostgresDataMigrationRow): void {
  const status = text(row, "status");
  const activeVersionKey = nullableText(row, "active_version_key");
  requireTrimmedText(text(row, "name"), 160);
  if (
    !botFlowKeyPattern.test(text(row, "bot_flow_key")) ||
    !flowStatuses.has(status) ||
    !botFlowVersionKeyPattern.test(text(row, "latest_version_key")) ||
    (activeVersionKey !== null &&
      !botFlowVersionKeyPattern.test(activeVersionKey)) ||
    ((status === "draft") !== (activeVersionKey === null)) ||
    integer(row, "latest_version_number") < 1 ||
    integer(row, "version") < 1 ||
    timestamp(row, "updated_at") < timestamp(row, "created_at")
  ) {
    invalid();
  }
}

function validateVersion(row: PostgresDataMigrationRow): void {
  const status = text(row, "status");
  const publishedAt = nullableTimestamp(row, "published_at");
  const definitionJson = text(row, "definition_json");
  const definition = parseJson(row, "definition_json");
  if (
    !botFlowVersionKeyPattern.test(text(row, "bot_flow_version_key")) ||
    !botFlowKeyPattern.test(text(row, "bot_flow_key")) ||
    integer(row, "version_number") < 1 ||
    !versionStatuses.has(status) ||
    ((status === "draft") !== (publishedAt === null)) ||
    new TextEncoder().encode(definitionJson).byteLength > 1_000_000 ||
    !validateBotFlowDefinition(definition).success
  ) {
    invalid();
  }
  timestamp(row, "created_at");
}

function validateDelivery(row: PostgresDataMigrationRow): void {
  const status = text(row, "status");
  const attemptCount = integer(row, "attempt_count");
  const claimVersion = integer(row, "claim_version");
  const nextAttemptAt = nullableTimestamp(row, "next_attempt_at");
  const deferredAt = nullableTimestamp(row, "deferred_at");
  const lastDeferralReasonCode = nullableText(
    row,
    "last_deferral_reason_code",
  );
  const providerMessageId = nullableText(row, "provider_message_id");
  const lastErrorCode = nullableText(row, "last_error_code");
  const acceptedAt = nullableTimestamp(row, "accepted_at");
  const replyJson = text(row, "reply_json");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");
  if (providerMessageId !== null) requireTrimmedText(providerMessageId, 255);
  if (
    !deliveryKeyPattern.test(text(row, "delivery_key")) ||
    !conversationKeyPattern.test(text(row, "conversation_key")) ||
    !messageKeyPattern.test(text(row, "inbound_message_key")) ||
    !botFlowKeyPattern.test(text(row, "bot_flow_key")) ||
    !botFlowVersionKeyPattern.test(text(row, "bot_flow_version_key")) ||
    integer(row, "reply_index") < 1 ||
    (() => {
      const value = text(row, "sender_phone_number_id");
      return value.trim() !== value ||
        value.length < 1 || value.length > 255 ||
        /[\u0000-\u001f\u007f]/.test(value);
    })() ||
    !phonePattern.test(text(row, "recipient_phone_e164")) ||
    new TextEncoder().encode(replyJson).byteLength > 50_000 ||
    !validReply(parseJson(row, "reply_json")) ||
    !deliveryStatuses.has(status) ||
    attemptCount < 0 ||
    claimVersion < 0 ||
    (lastErrorCode !== null && !errorCodePattern.test(lastErrorCode)) ||
    (lastDeferralReasonCode !== null &&
      !errorCodePattern.test(lastDeferralReasonCode)) ||
    !(
      (status === "pending" && attemptCount === 0 &&
        providerMessageId === null && lastErrorCode === null &&
        acceptedAt === null &&
        ((claimVersion === 0 && nextAttemptAt === null &&
          deferredAt === null && lastDeferralReasonCode === null) ||
          (claimVersion >= 1 && nextAttemptAt !== null &&
            deferredAt !== null && lastDeferralReasonCode !== null &&
            nextAttemptAt > deferredAt && updatedAt === deferredAt))) ||
      (status === "sending" && attemptCount === 1 && claimVersion >= 1 &&
        providerMessageId === null && lastErrorCode === null &&
        acceptedAt === null && nextAttemptAt === null &&
        deferredAt === null && lastDeferralReasonCode === null) ||
      (status === "accepted" && attemptCount >= 1 && claimVersion >= 1 &&
        providerMessageId !== null && lastErrorCode === null &&
        acceptedAt !== null && nextAttemptAt === null &&
        deferredAt === null && lastDeferralReasonCode === null) ||
      (["rejected", "ambiguous"].includes(status) && attemptCount >= 1 &&
        claimVersion >= 1 &&
        providerMessageId === null && lastErrorCode !== null &&
        acceptedAt === null && nextAttemptAt === null &&
        deferredAt === null && lastDeferralReasonCode === null)
    ) ||
    updatedAt < createdAt
  ) {
    invalid();
  }
}

function column(
  name: string,
  kind: "json" | "nonnegative-integer" | "positive-integer" | "text" |
    "timestamp",
  nullable = false,
) {
  return Object.freeze({
    name,
    kind,
    ...(nullable ? { nullable: true as const } : {}),
  });
}

export const POSTGRES_BOT_RUNTIME_DATA_TABLE_CONTRACTS = Object.freeze([
  Object.freeze({
    name: "bot_flows",
    columns: Object.freeze([
      column("bot_flow_key", "text"),
      column("tenant_id", "positive-integer"),
      column("name", "text"),
      column("status", "text"),
      column("latest_version_key", "text"),
      column("latest_version_number", "positive-integer"),
      column("active_version_key", "text", true),
      column("version", "positive-integer"),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
    ]),
    orderBy: Object.freeze(["tenant_id", "bot_flow_key"]),
    validate: validateFlow,
  }),
  Object.freeze({
    name: "bot_flow_versions",
    columns: Object.freeze([
      column("bot_flow_version_key", "text"),
      column("bot_flow_key", "text"),
      column("tenant_id", "positive-integer"),
      column("version_number", "positive-integer"),
      column("status", "text"),
      column("definition_json", "json"),
      column("published_at", "timestamp", true),
      column("created_at", "timestamp"),
    ]),
    orderBy: Object.freeze([
      "tenant_id",
      "bot_flow_key",
      "version_number",
    ]),
    validate: validateVersion,
  }),
  Object.freeze({
    name: "bot_reply_deliveries",
    columns: Object.freeze([
      column("delivery_key", "text"),
      column("tenant_id", "positive-integer"),
      column("conversation_key", "text"),
      column("inbound_message_key", "text"),
      column("bot_flow_key", "text"),
      column("bot_flow_version_key", "text"),
      column("reply_index", "positive-integer"),
      column("recipient_phone_e164", "text"),
      column("reply_json", "json"),
      column("status", "text"),
      column("attempt_count", "nonnegative-integer"),
      column("provider_message_id", "text", true),
      column("last_error_code", "text", true),
      column("accepted_at", "timestamp", true),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
      column("sender_phone_number_id", "text"),
      column("claim_version", "nonnegative-integer"),
      column("next_attempt_at", "timestamp", true),
      column("deferred_at", "timestamp", true),
      column("last_deferral_reason_code", "text", true),
    ]),
    orderBy: Object.freeze(["tenant_id", "created_at", "delivery_key"]),
    validate: validateDelivery,
  }),
] satisfies readonly PostgresDataMigrationTableContract[]);

async function requireBotReplyDeliveryTriggersEnabled(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  const result = await transaction.query(
    `WITH expected(trigger_name) AS (
       VALUES
         ('bot_reply_deliveries_insert_contract_guard'),
         ('bot_reply_deliveries_transition_guard')
     ), actual AS (
       SELECT trigger.tgname AS trigger_name, trigger.tgenabled
       FROM pg_trigger AS trigger
       INNER JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
       INNER JOIN pg_namespace AS namespace
         ON namespace.oid = relation.relnamespace
       WHERE namespace.nspname = current_schema()
         AND relation.relname = 'bot_reply_deliveries'
         AND NOT trigger.tgisinternal
     )
     SELECT 1
     FROM expected
     LEFT JOIN actual USING (trigger_name)
     WHERE actual.trigger_name IS NULL OR actual.tgenabled <> 'O'
     UNION ALL
     SELECT 1
     FROM actual
     WHERE actual.tgenabled <> 'O'
     LIMIT 1`,
    [],
  );
  if (result.rowCount !== 0) {
    throw new Error("bot-runtime-delivery-trigger-state-invalid");
  }
}

async function verifyLoadedState(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  await requireBotReplyDeliveryTriggersEnabled(transaction);
  const projections = await transaction.query(
    `SELECT 1
     FROM bot_flows AS flow
     LEFT JOIN bot_flow_versions AS latest
       ON latest.tenant_id = flow.tenant_id
       AND latest.bot_flow_key = flow.bot_flow_key
       AND latest.bot_flow_version_key = flow.latest_version_key
       AND latest.version_number = flow.latest_version_number
     LEFT JOIN bot_flow_versions AS active
       ON active.tenant_id = flow.tenant_id
       AND active.bot_flow_key = flow.bot_flow_key
       AND active.bot_flow_version_key = flow.active_version_key
     WHERE latest.bot_flow_version_key IS NULL
       OR (flow.active_version_key IS NOT NULL
         AND active.bot_flow_version_key IS NULL)
     LIMIT 1`,
    [],
  );
  if (projections.rowCount !== 0) {
    throw new Error("bot-runtime-flow-projection-invalid");
  }

  const deliveries = await transaction.query(
    `SELECT 1
     FROM bot_reply_deliveries AS delivery
     LEFT JOIN messages AS inbound
       ON inbound.tenant_id = delivery.tenant_id
       AND inbound.conversation_key = delivery.conversation_key
       AND inbound.message_key = delivery.inbound_message_key
       AND inbound.direction = 'inbound'
     LEFT JOIN bot_flow_versions AS version
       ON version.tenant_id = delivery.tenant_id
       AND version.bot_flow_key = delivery.bot_flow_key
       AND version.bot_flow_version_key = delivery.bot_flow_version_key
     WHERE inbound.message_key IS NULL
       OR version.bot_flow_version_key IS NULL
       OR (
         delivery.next_attempt_at IS NOT NULL
         AND delivery.next_attempt_at >=
           inbound.occurred_at + INTERVAL '24 hours'
       )
     LIMIT 1`,
    [],
  );
  if (deliveries.rowCount !== 0) {
    throw new Error("bot-runtime-delivery-link-invalid");
  }
}

const protocol = createPostgresDataMigrationProtocol({
  version: "connect_postgres_bot_runtime_data_v2",
  planKind: "postgres-bot-runtime-data-migration-plan",
  evidenceKind: "postgres-bot-runtime-data-migration-evidence",
  advisoryLockKey: [1129270867, 2],
  tables: POSTGRES_BOT_RUNTIME_DATA_TABLE_CONTRACTS,
  triggerDisabledTables: ["bot_reply_deliveries"],
  verifyTargetReady: requireBotReplyDeliveryTriggersEnabled,
  verifyLoadedState,
});

export type PostgresBotRuntimeDataSnapshot = PostgresDataMigrationSnapshot;
export type PostgresBotRuntimeDataMigrationPlan = PostgresDataMigrationPlan;
export type PostgresBotRuntimeDataMigrationEvidence =
  PostgresDataMigrationEvidence;

export const createPostgresBotRuntimeDataSnapshot = protocol.createSnapshot;
export const createPostgresBotRuntimeDataMigrationPlan = protocol.createPlan;
export const executePostgresBotRuntimeDataMigration = protocol.execute;

export async function migratePostgresBotRuntimeData(
  input: Readonly<{
    snapshot: PostgresBotRuntimeDataSnapshot;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    createdAt: string;
    expiresAt: string;
    now: string;
  }>,
): Promise<PostgresBotRuntimeDataMigrationEvidence> {
  const plan = createPostgresBotRuntimeDataMigrationPlan({
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    evidenceHmacKey: input.evidenceHmacKey,
  });
  return executePostgresBotRuntimeDataMigration({
    plan,
    transactions: input.transactions,
    evidenceHmacKey: input.evidenceHmacKey,
    now: input.now,
  });
}
