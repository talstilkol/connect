import type {
  BotRuntimeConversationState,
  BotRuntimeRepository,
} from "../../db/botRuntimeRepository.ts";
import {
  persistedConversationStatuses,
} from "../../shared/domain/conversation.ts";
import type {
  ConversationStatus,
} from "../../shared/domain/model.ts";
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

const conversationKeyPattern = /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern = /^message_v1_[0-9a-f]{64}$/;
const botFlowVersionKeyPattern = /^bot_flow_version_v1_[0-9a-f]{64}$/;

const conversationRowKeys = Object.freeze([
  "assignedExternalUserId",
  "conversationKey",
  "status",
  "tenantId",
  "version",
]);
const continuationRowKeys = Object.freeze([
  "acceptedAt",
  "botFlowVersionKey",
  "currentMessageKey",
  "replyJson",
]);

const conversationColumns = `
  conversation_key AS "conversationKey",
  tenant_id AS "tenantId",
  status,
  assigned_external_user_id AS "assignedExternalUserId",
  version
`;

export const postgresBotRuntimeSql = Object.freeze({
  findConversationState: `
    SELECT ${conversationColumns}
    FROM conversations
    WHERE tenant_id = $1
      AND conversation_key = $2
    LIMIT 1
  `,
  findAcceptedButtonContinuation: `
    WITH current_inbound AS (
      SELECT
        message_key AS "currentMessageKey",
        occurred_at AS "currentOccurredAt"
      FROM messages
      WHERE tenant_id = $1
        AND conversation_key = $2
        AND message_key = $3
        AND direction = 'inbound'
        AND status = 'received'
      LIMIT 1
    ),
    previous_inbound AS (
      SELECT previous.message_key AS "previousMessageKey"
      FROM messages AS previous
      INNER JOIN current_inbound
        ON (
          previous.occurred_at,
          previous.message_key
        ) < (
          current_inbound."currentOccurredAt",
          current_inbound."currentMessageKey"
        )
      WHERE previous.tenant_id = $1
        AND previous.conversation_key = $2
        AND previous.direction = 'inbound'
        AND previous.status = 'received'
      ORDER BY previous.occurred_at DESC, previous.message_key DESC
      LIMIT 1
    )
    SELECT
      current_inbound."currentMessageKey",
      delivery.bot_flow_version_key AS "botFlowVersionKey",
      delivery.reply_json::text AS "replyJson",
      delivery.accepted_at AS "acceptedAt"
    FROM current_inbound
    LEFT JOIN previous_inbound ON TRUE
    LEFT JOIN bot_reply_deliveries AS delivery
      ON delivery.tenant_id = $1
      AND delivery.conversation_key = $2
      AND delivery.inbound_message_key = previous_inbound."previousMessageKey"
      AND delivery.status = 'accepted'
      AND delivery.accepted_at IS NOT NULL
      AND delivery.accepted_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      AND delivery.reply_json ->> 'kind' = 'buttons'
    ORDER BY delivery.reply_index DESC, delivery.delivery_key ASC
    LIMIT 2
  `,
  lockConversation: `
    SELECT ${conversationColumns}
    FROM conversations
    WHERE tenant_id = $1
      AND conversation_key = $2
    FOR UPDATE
  `,
  applyHandoff: `
    UPDATE conversations
    SET
      status = 'waiting_for_agent',
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND conversation_key = $2
      AND version = $3
      AND assigned_external_user_id IS NULL
      AND status IN ('new', 'bot_active')
    RETURNING ${conversationColumns}
  `,
});

export interface PostgresBotRuntimeRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return Number(value);
}

function requirePattern(
  value: unknown,
  pattern: RegExp,
  fieldName: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${fieldName} is invalid`);
  }
  return value;
}

function parseConversation(
  value: unknown,
  expectedTenantId: number,
  expectedConversationKey: string,
): BotRuntimeConversationState {
  const row = requireExactPostgresRow(value, conversationRowKeys);
  const tenantId = parsePostgresPositiveInteger(row.tenantId);
  const conversationKey = requirePattern(
    row.conversationKey,
    conversationKeyPattern,
    "conversationKey",
  );
  const status = persistedConversationStatuses.find(
    (candidate) => candidate === row.status,
  ) as ConversationStatus | undefined;
  const assignedExternalUserId = row.assignedExternalUserId === null
    ? null
    : typeof row.assignedExternalUserId === "string" &&
        row.assignedExternalUserId.trim() === row.assignedExternalUserId &&
        row.assignedExternalUserId.length > 0 &&
        row.assignedExternalUserId.length <= 255 &&
        !/[\u0000-\u001f\u007f]/.test(row.assignedExternalUserId)
      ? row.assignedExternalUserId
      : undefined;
  if (
    tenantId !== expectedTenantId ||
    conversationKey !== expectedConversationKey ||
    status === undefined ||
    assignedExternalUserId === undefined
  ) {
    throw new Error("PostgreSQL returned an invalid bot runtime conversation");
  }
  return Object.freeze({
    conversationKey,
    tenantId,
    status,
    assignedExternalUserId,
    version: parsePostgresPositiveInteger(row.version),
  });
}

function parseContinuation(
  value: unknown,
  expectedMessageKey: string,
) {
  const row = requireExactPostgresRow(value, continuationRowKeys);
  if (row.currentMessageKey !== expectedMessageKey) {
    throw new Error("PostgreSQL returned bot continuation for another message");
  }
  if (
    row.botFlowVersionKey === null &&
    row.replyJson === null &&
    row.acceptedAt === null
  ) {
    return null;
  }
  const botFlowVersionKey = requirePattern(
    row.botFlowVersionKey,
    botFlowVersionKeyPattern,
    "botFlowVersionKey",
  );
  if (
    typeof row.replyJson !== "string" ||
    row.replyJson.length < 2 ||
    row.replyJson.length > 50_000
  ) {
    throw new Error("PostgreSQL returned invalid bot continuation evidence");
  }
  let reply: unknown;
  try {
    reply = JSON.parse(row.replyJson);
  } catch {
    throw new Error("PostgreSQL returned invalid bot continuation JSON");
  }
  if (
    typeof reply !== "object" ||
    reply === null ||
    Array.isArray(reply) ||
    (reply as Record<string, unknown>).kind !== "buttons"
  ) {
    throw new Error("PostgreSQL returned invalid bot continuation evidence");
  }
  return Object.freeze({
    botFlowVersionKey,
    replyJson: row.replyJson,
    acceptedAt: parsePostgresTimestamp(row.acceptedAt),
  });
}

async function loadRows(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly unknown[]> {
  return requirePostgresRows(
    await queries.query<unknown>(sql, parameters),
    maximum,
  );
}

async function loadOne(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<unknown | null> {
  const rows = await loadRows(queries, sql, parameters, 1);
  return rows[0] ?? null;
}

export function createPostgresBotRuntimeRepository(
  dependencies: Readonly<PostgresBotRuntimeRepositoryDependencies>,
): BotRuntimeRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL bot runtime dependencies are invalid");
  }

  return Object.freeze({
    async findConversationState(
      tenantIdInput: number,
      conversationKeyInput: string,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const conversationKey = requirePattern(
        conversationKeyInput,
        conversationKeyPattern,
        "conversationKey",
      );
      const row = await loadOne(
        dependencies.queries,
        postgresBotRuntimeSql.findConversationState,
        [tenantId, conversationKey],
      );
      return row === null
        ? null
        : parseConversation(row, tenantId, conversationKey);
    },

    async findAcceptedButtonContinuation(
      tenantIdInput: number,
      conversationKeyInput: string,
      currentInboundMessageKeyInput: string,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const conversationKey = requirePattern(
        conversationKeyInput,
        conversationKeyPattern,
        "conversationKey",
      );
      const currentInboundMessageKey = requirePattern(
        currentInboundMessageKeyInput,
        messageKeyPattern,
        "currentInboundMessageKey",
      );
      const rows = await loadRows(
        dependencies.queries,
        postgresBotRuntimeSql.findAcceptedButtonContinuation,
        [tenantId, conversationKey, currentInboundMessageKey],
        2,
      );
      if (rows.length === 0) {
        return Object.freeze({ outcome: "current-message-not-found" as const });
      }
      if (rows.length > 1) {
        return Object.freeze({ outcome: "ambiguous" as const });
      }
      const evidence = parseContinuation(rows[0], currentInboundMessageKey);
      return evidence === null
        ? Object.freeze({ outcome: "none" as const })
        : Object.freeze({ outcome: "found" as const, evidence });
    },

    async applyHandoff(
      tenantIdInput: number,
      conversationKeyInput: string,
      expectedVersionInput: number,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const conversationKey = requirePattern(
        conversationKeyInput,
        conversationKeyPattern,
        "conversationKey",
      );
      const expectedVersion = requirePositiveInteger(
        expectedVersionInput,
        "expectedVersion",
      );
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const lockedRow = await loadOne(
            transaction,
            postgresBotRuntimeSql.lockConversation,
            [tenantId, conversationKey],
          );
          if (lockedRow === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          const current = parseConversation(
            lockedRow,
            tenantId,
            conversationKey,
          );
          if (
            current.status === "waiting_for_agent" &&
            current.assignedExternalUserId === null &&
            current.version === expectedVersion + 1
          ) {
            return Object.freeze({ outcome: "unchanged" as const, state: current });
          }
          if (current.assignedExternalUserId !== null) {
            return Object.freeze({ outcome: "locked" as const });
          }
          if (current.version !== expectedVersion) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          if (current.status !== "new" && current.status !== "bot_active") {
            return Object.freeze({ outcome: "invalid-state" as const });
          }
          const updatedRow = await loadOne(
            transaction,
            postgresBotRuntimeSql.applyHandoff,
            [tenantId, conversationKey, expectedVersion],
          );
          if (updatedRow === null) {
            throw new Error("PostgreSQL bot handoff failed after row lock");
          }
          const state = parseConversation(updatedRow, tenantId, conversationKey);
          if (
            state.status !== "waiting_for_agent" ||
            state.assignedExternalUserId !== null ||
            state.version !== expectedVersion + 1
          ) {
            throw new Error("PostgreSQL returned an invalid bot handoff state");
          }
          return Object.freeze({ outcome: "updated" as const, state });
        },
      );
    },
  });
}
