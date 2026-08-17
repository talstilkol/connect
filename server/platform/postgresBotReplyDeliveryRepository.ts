import {
  BotReplyDeliveryIdentityConflictError,
  type BotReplyDeliveryRepository,
  type ClaimBotReplyDeliveryResult,
  type StageBotReplyDeliveryInput,
  type StageBotReplyDeliveryResult,
} from "../../db/botReplyDeliveryRepository.ts";
import {
  botReplyDeliveryStatuses,
  type BotReplyDeliveryStatus,
  type BotReplyPayload,
  type PersistedBotReplyDelivery,
} from "../../shared/domain/botReplyDelivery.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const deliveryKeyPattern = /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const conversationKeyPattern = /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern = /^message_v1_[0-9a-f]{64}$/;
const botFlowKeyPattern = /^bot_flow_v1_[0-9a-f]{64}$/;
const botFlowVersionKeyPattern = /^bot_flow_version_v1_[0-9a-f]{64}$/;
const botOptionKeyPattern = /^bot_option_v1_[0-9a-f]{64}$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

const deliveryRowKeys = Object.freeze([
  "acceptedAt",
  "attemptCount",
  "botFlowKey",
  "botFlowVersionKey",
  "conversationKey",
  "createdAt",
  "deliveryKey",
  "inboundMessageKey",
  "lastErrorCode",
  "providerMessageId",
  "recipientPhoneNumber",
  "replyIndex",
  "replyJson",
  "status",
  "tenantId",
  "updatedAt",
]);

const deliveryColumns = `
  bot_reply_deliveries.delivery_key AS "deliveryKey",
  bot_reply_deliveries.tenant_id AS "tenantId",
  bot_reply_deliveries.conversation_key AS "conversationKey",
  bot_reply_deliveries.inbound_message_key AS "inboundMessageKey",
  bot_reply_deliveries.bot_flow_key AS "botFlowKey",
  bot_reply_deliveries.bot_flow_version_key AS "botFlowVersionKey",
  bot_reply_deliveries.reply_index AS "replyIndex",
  bot_reply_deliveries.recipient_phone_e164 AS "recipientPhoneNumber",
  bot_reply_deliveries.reply_json AS "replyJson",
  bot_reply_deliveries.status,
  bot_reply_deliveries.attempt_count AS "attemptCount",
  bot_reply_deliveries.provider_message_id AS "providerMessageId",
  bot_reply_deliveries.last_error_code AS "lastErrorCode",
  bot_reply_deliveries.accepted_at AS "acceptedAt",
  bot_reply_deliveries.created_at AS "createdAt",
  bot_reply_deliveries.updated_at AS "updatedAt"
`;

export const postgresBotReplyDeliverySql = Object.freeze({
  insertDelivery: `
    INSERT INTO bot_reply_deliveries (
      delivery_key,
      tenant_id,
      conversation_key,
      inbound_message_key,
      bot_flow_key,
      bot_flow_version_key,
      reply_index,
      recipient_phone_e164,
      reply_json
    )
    SELECT
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9::jsonb
    FROM messages
    INNER JOIN bot_flow_versions
      ON bot_flow_versions.tenant_id = messages.tenant_id
      AND bot_flow_versions.bot_flow_key = $5
      AND bot_flow_versions.bot_flow_version_key = $6
    WHERE messages.tenant_id = $2
      AND messages.message_key = $4
      AND messages.conversation_key = $3
      AND messages.direction = 'inbound'
    ON CONFLICT DO NOTHING
    RETURNING ${deliveryColumns}
  `,
  findByKey: `
    SELECT ${deliveryColumns}
    FROM bot_reply_deliveries
    WHERE bot_reply_deliveries.tenant_id = $1
      AND bot_reply_deliveries.delivery_key = $2
    LIMIT 1
  `,
  findByKeyForUpdate: `
    SELECT ${deliveryColumns}
    FROM bot_reply_deliveries
    WHERE bot_reply_deliveries.tenant_id = $1
      AND bot_reply_deliveries.delivery_key = $2
    FOR UPDATE
  `,
  claim: `
    UPDATE bot_reply_deliveries
    SET
      status = 'sending',
      attempt_count = attempt_count + 1,
      updated_at = $3::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'pending'
    RETURNING ${deliveryColumns}
  `,
  markAccepted: `
    UPDATE bot_reply_deliveries
    SET
      status = 'accepted',
      provider_message_id = $3,
      accepted_at = $4::timestamptz,
      updated_at = $4::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'sending'
    RETURNING ${deliveryColumns}
  `,
  markFailure: `
    UPDATE bot_reply_deliveries
    SET
      status = $3,
      last_error_code = $4,
      updated_at = $5::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'sending'
    RETURNING ${deliveryColumns}
  `,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  input: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const inputKeys = Object.keys(input).sort();
  return JSON.stringify(inputKeys) === JSON.stringify([...keys].sort());
}

function parseReply(value: unknown): BotReplyPayload | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    value.kind === "text" &&
    hasExactKeys(value, ["kind", "text"]) &&
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    value.text.length <= 4_096
  ) {
    return Object.freeze({ kind: "text" as const, text: value.text });
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
    return null;
  }
  const options: { optionKey: string; label: string }[] = [];
  for (const option of value.options) {
    if (
      !isRecord(option) ||
      !hasExactKeys(option, ["label", "optionKey"]) ||
      typeof option.optionKey !== "string" ||
      !botOptionKeyPattern.test(option.optionKey) ||
      typeof option.label !== "string" ||
      option.label.trim().length === 0 ||
      option.label.length > 80
    ) {
      return null;
    }
    options.push(Object.freeze({
      optionKey: option.optionKey,
      label: option.label,
    }));
  }
  return Object.freeze({
    kind: "buttons" as const,
    text: value.text,
    options: Object.freeze(options),
  });
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return Number(value);
}

function parseNonnegativeInteger(value: unknown, fieldName: string): number {
  const normalized = typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
    throw new Error(`PostgreSQL returned an invalid ${fieldName}`);
  }
  return Number(normalized);
}

function requirePattern(value: unknown, pattern: RegExp, fieldName: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${fieldName} is invalid`);
  }
  return value;
}

function requireTimestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !canonicalTimestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error("timestamp is invalid");
  }
  return value;
}

function requireProviderMessageId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 255 ||
    value.trim() !== value ||
    controlCharacterPattern.test(value)
  ) {
    throw new Error("providerMessageId is invalid");
  }
  return value;
}

function requireErrorCode(value: unknown): string {
  return requirePattern(value, /^[A-Z0-9_]{1,100}$/, "errorCode");
}

function requireStageInput(input: StageBotReplyDeliveryInput): {
  normalized: StageBotReplyDeliveryInput;
  reply: BotReplyPayload;
} {
  const tenantId = requirePositiveInteger(input?.tenantId, "tenantId");
  const replyIndex = requirePositiveInteger(input?.replyIndex, "replyIndex");
  const reply = parseReply(input?.reply);
  const deliveryKey = requirePattern(
    input?.deliveryKey,
    deliveryKeyPattern,
    "deliveryKey",
  );
  const conversationKey = requirePattern(
    input?.conversationKey,
    conversationKeyPattern,
    "conversationKey",
  );
  const inboundMessageKey = requirePattern(
    input?.inboundMessageKey,
    messageKeyPattern,
    "inboundMessageKey",
  );
  const botFlowKey = requirePattern(input?.botFlowKey, botFlowKeyPattern, "botFlowKey");
  const botFlowVersionKey = requirePattern(
    input?.botFlowVersionKey,
    botFlowVersionKeyPattern,
    "botFlowVersionKey",
  );
  const recipientPhoneNumber = requirePattern(
    input?.recipientPhoneNumber,
    /^\+[1-9][0-9]{0,14}$/,
    "recipientPhoneNumber",
  );
  if (!reply) {
    throw new Error("bot reply delivery input is invalid");
  }
  return {
    normalized: {
      deliveryKey,
      tenantId,
      conversationKey,
      inboundMessageKey,
      botFlowKey,
      botFlowVersionKey,
      replyIndex,
      recipientPhoneNumber,
      reply,
    },
    reply,
  };
}

function parseDelivery(value: unknown): PersistedBotReplyDelivery {
  const row = requireExactPostgresRow(value, deliveryRowKeys);
  const status = botReplyDeliveryStatuses.find(
    (candidate) => candidate === row.status,
  );
  let replyInput = row.replyJson;
  if (typeof replyInput === "string") {
    try {
      replyInput = JSON.parse(replyInput);
    } catch {
      throw new Error("PostgreSQL returned invalid bot reply JSON");
    }
  }
  const reply = parseReply(replyInput);
  const attemptCount = parseNonnegativeInteger(row.attemptCount, "attempt count");
  const providerMessageId = row.providerMessageId === null
    ? null
    : requireProviderMessageId(row.providerMessageId);
  const lastErrorCode = row.lastErrorCode === null
    ? null
    : requirePattern(row.lastErrorCode, /^[A-Z0-9_]{1,100}$/, "lastErrorCode");
  const acceptedAt = row.acceptedAt === null
    ? null
    : parsePostgresTimestamp(row.acceptedAt);
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);

  if (
    !status ||
    !reply ||
    updatedAt < createdAt ||
    (status === "pending" &&
      (attemptCount !== 0 || providerMessageId !== null ||
        lastErrorCode !== null || acceptedAt !== null)) ||
    (status === "sending" &&
      (attemptCount < 1 || providerMessageId !== null ||
        lastErrorCode !== null || acceptedAt !== null)) ||
    (status === "accepted" &&
      (attemptCount < 1 || providerMessageId === null ||
        lastErrorCode !== null || acceptedAt === null)) ||
    ((status === "rejected" || status === "ambiguous") &&
      (attemptCount < 1 || providerMessageId !== null ||
        lastErrorCode === null || acceptedAt !== null))
  ) {
    throw new Error("PostgreSQL returned an invalid bot reply delivery");
  }

  return Object.freeze({
    deliveryKey: requirePattern(row.deliveryKey, deliveryKeyPattern, "deliveryKey"),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    conversationKey: requirePattern(
      row.conversationKey,
      conversationKeyPattern,
      "conversationKey",
    ),
    inboundMessageKey: requirePattern(
      row.inboundMessageKey,
      messageKeyPattern,
      "inboundMessageKey",
    ),
    botFlowKey: requirePattern(row.botFlowKey, botFlowKeyPattern, "botFlowKey"),
    botFlowVersionKey: requirePattern(
      row.botFlowVersionKey,
      botFlowVersionKeyPattern,
      "botFlowVersionKey",
    ),
    replyIndex: parsePostgresPositiveInteger(row.replyIndex),
    recipientPhoneNumber: requirePattern(
      row.recipientPhoneNumber,
      /^\+[1-9][0-9]{0,14}$/,
      "recipientPhoneNumber",
    ),
    reply,
    status,
    attemptCount,
    providerMessageId,
    lastErrorCode,
    acceptedAt,
    createdAt,
    updatedAt,
  });
}

function requireDeliveryScope(
  delivery: PersistedBotReplyDelivery,
  tenantId: number,
  deliveryKey: string,
): PersistedBotReplyDelivery {
  if (delivery.tenantId !== tenantId || delivery.deliveryKey !== deliveryKey) {
    throw new Error("PostgreSQL returned a bot reply delivery outside the scope");
  }
  return delivery;
}

function sameIdentity(
  delivery: PersistedBotReplyDelivery,
  input: StageBotReplyDeliveryInput,
): boolean {
  return (
    delivery.deliveryKey === input.deliveryKey &&
    delivery.tenantId === input.tenantId &&
    delivery.conversationKey === input.conversationKey &&
    delivery.inboundMessageKey === input.inboundMessageKey &&
    delivery.botFlowKey === input.botFlowKey &&
    delivery.botFlowVersionKey === input.botFlowVersionKey &&
    delivery.replyIndex === input.replyIndex &&
    delivery.recipientPhoneNumber === input.recipientPhoneNumber &&
    JSON.stringify(delivery.reply) === JSON.stringify(input.reply)
  );
}

async function loadRows(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly Record<string, unknown>[]> {
  const result = await queries.query<Record<string, unknown>>(sql, parameters);
  return requirePostgresRows(result, maximum);
}

async function loadOne(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<Record<string, unknown> | null> {
  const rows = await loadRows(queries, sql, parameters, 1);
  return rows.length === 0 ? null : rows[0];
}

export interface PostgresBotReplyDeliveryRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

export function createPostgresBotReplyDeliveryRepository(
  dependencies: Readonly<PostgresBotReplyDeliveryRepositoryDependencies>,
): BotReplyDeliveryRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error(
      "PostgreSQL bot reply delivery repository dependencies are invalid",
    );
  }

  const markFailure = async (
    tenantIdInput: number,
    deliveryKeyInput: string,
    status: Extract<BotReplyDeliveryStatus, "rejected" | "ambiguous">,
    errorCodeInput: string,
    timestampInput: string,
  ): Promise<PersistedBotReplyDelivery> => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const deliveryKey = requirePattern(deliveryKeyInput, deliveryKeyPattern, "deliveryKey");
    const errorCode = requireErrorCode(errorCodeInput);
    const timestamp = requireTimestamp(timestampInput);
    const row = await loadOne(
      dependencies.queries,
      postgresBotReplyDeliverySql.markFailure,
      [tenantId, deliveryKey, status, errorCode, timestamp],
    );
    if (row === null) {
      throw new Error("PostgreSQL bot reply failure transition failed");
    }
    const delivery = requireDeliveryScope(parseDelivery(row), tenantId, deliveryKey);
    if (delivery.status !== status || delivery.lastErrorCode !== errorCode) {
      throw new Error("PostgreSQL returned a mismatched bot reply failure");
    }
    return delivery;
  };

  const repository: BotReplyDeliveryRepository = {
    async stage(input) {
      const { normalized } = requireStageInput(input);
      return dependencies.transactions.transaction<StageBotReplyDeliveryResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const insertedRow = await loadOne(
            transaction,
            postgresBotReplyDeliverySql.insertDelivery,
            [
              normalized.deliveryKey,
              normalized.tenantId,
              normalized.conversationKey,
              normalized.inboundMessageKey,
              normalized.botFlowKey,
              normalized.botFlowVersionKey,
              normalized.replyIndex,
              normalized.recipientPhoneNumber,
              JSON.stringify(normalized.reply),
            ],
          );
          if (insertedRow !== null) {
            const delivery = requireDeliveryScope(
              parseDelivery(insertedRow),
              normalized.tenantId,
              normalized.deliveryKey,
            );
            if (!sameIdentity(delivery, normalized)) {
              throw new Error("PostgreSQL returned a mismatched bot reply delivery");
            }
            return Object.freeze({ outcome: "created" as const, delivery });
          }
          const existingRow = await loadOne(
            transaction,
            postgresBotReplyDeliverySql.findByKeyForUpdate,
            [normalized.tenantId, normalized.deliveryKey],
          );
          if (existingRow === null) {
            throw new BotReplyDeliveryIdentityConflictError();
          }
          const existing = requireDeliveryScope(
            parseDelivery(existingRow),
            normalized.tenantId,
            normalized.deliveryKey,
          );
          if (!sameIdentity(existing, normalized)) {
            throw new BotReplyDeliveryIdentityConflictError();
          }
          return Object.freeze({ outcome: "duplicate" as const, delivery: existing });
        },
      );
    },

    async claim(tenantIdInput, deliveryKeyInput, timestampInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const deliveryKey = requirePattern(deliveryKeyInput, deliveryKeyPattern, "deliveryKey");
      const timestamp = requireTimestamp(timestampInput);
      return dependencies.transactions.transaction<ClaimBotReplyDeliveryResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const claimedRow = await loadOne(
            transaction,
            postgresBotReplyDeliverySql.claim,
            [tenantId, deliveryKey, timestamp],
          );
          if (claimedRow !== null) {
            const delivery = requireDeliveryScope(
              parseDelivery(claimedRow),
              tenantId,
              deliveryKey,
            );
            if (delivery.status !== "sending") {
              throw new Error("PostgreSQL returned a mismatched bot reply claim");
            }
            return Object.freeze({ outcome: "claimed" as const, delivery });
          }
          const existingRow = await loadOne(
            transaction,
            postgresBotReplyDeliverySql.findByKeyForUpdate,
            [tenantId, deliveryKey],
          );
          if (existingRow === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          const delivery = requireDeliveryScope(
            parseDelivery(existingRow),
            tenantId,
            deliveryKey,
          );
          return Object.freeze({
            outcome: delivery.status === "sending"
              ? "uncertain" as const
              : "duplicate" as const,
            delivery,
          });
        },
      );
    },

    async markAccepted(
      tenantIdInput,
      deliveryKeyInput,
      providerMessageIdInput,
      timestampInput,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const deliveryKey = requirePattern(deliveryKeyInput, deliveryKeyPattern, "deliveryKey");
      const providerMessageId = requireProviderMessageId(providerMessageIdInput);
      const timestamp = requireTimestamp(timestampInput);
      const row = await loadOne(
        dependencies.queries,
        postgresBotReplyDeliverySql.markAccepted,
        [tenantId, deliveryKey, providerMessageId, timestamp],
      );
      if (row === null) {
        throw new Error("PostgreSQL bot reply acceptance transition failed");
      }
      const delivery = requireDeliveryScope(parseDelivery(row), tenantId, deliveryKey);
      if (
        delivery.status !== "accepted" ||
        delivery.providerMessageId !== providerMessageId ||
        delivery.acceptedAt !== timestamp
      ) {
        throw new Error("PostgreSQL returned a mismatched bot reply acceptance");
      }
      return delivery;
    },

    markRejected(tenantId, deliveryKey, errorCode, timestamp) {
      return markFailure(tenantId, deliveryKey, "rejected", errorCode, timestamp);
    },

    markAmbiguous(tenantId, deliveryKey, errorCode, timestamp) {
      return markFailure(tenantId, deliveryKey, "ambiguous", errorCode, timestamp);
    },
  };

  return Object.freeze(repository);
}
