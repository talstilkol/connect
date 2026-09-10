import {
  AiReplyOutboxIdentityConflictError,
  type AiReplyOutboxRepository,
  type DecideAiReplyOutboxInput,
  type StageAiReplyOutboxInput,
} from "../../db/aiReplyOutboxRepository.ts";
import type {
  AiReplyOutboxStatus,
  PersistedAiReplyOutboxItem,
} from "../../shared/domain/aiReplyOutbox.ts";
import {
  deriveAiReplyOutboxKey,
} from "../ai/aiReplyOutboxKey.ts";
import {
  deriveAiProviderRequestKey,
  deriveAiRuntimeAuditKey,
} from "../ai/aiRuntimeKey.ts";
import {
  parsePostgresNonnegativeInteger,
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

const outboxKeyPattern = /^ai_reply_outbox_v1_[0-9a-f]{64}$/;
const requestKeyPattern = /^ai_provider_request_v1_[0-9a-f]{64}$/;
const auditKeyPattern = /^ai_runtime_audit_v1_[0-9a-f]{64}$/;
const conversationKeyPattern = /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern = /^message_v1_[0-9a-f]{64}$/;
const aiAgentKeyPattern = /^ai_agent_v1_[0-9a-f]{64}$/;
const aiAgentVersionKeyPattern = /^ai_agent_version_v1_[0-9a-f]{64}$/;
const sourceKeyPattern = /^knowledge_source_v1_[0-9a-f]{64}$/;
const phonePattern = /^\+[1-9][0-9]{0,14}$/;
const unsafeControlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const outboxStatuses = Object.freeze([
  "awaiting-approval",
  "ready-for-delivery",
  "rejected",
]);
const outboxRowKeys = Object.freeze([
  "aiAgentKey",
  "aiAgentVersionKey",
  "auditKey",
  "conversationKey",
  "createdAt",
  "decidedAt",
  "decidedByExternalUserId",
  "expectedConversationVersion",
  "groundedSourceKeysJson",
  "groundingScoreBasisPoints",
  "inboundMessageKey",
  "outboxKey",
  "recipientPhoneNumber",
  "replyText",
  "requestKey",
  "responseMode",
  "status",
  "tenantId",
  "updatedAt",
  "version",
]);
const conversationRowKeys = Object.freeze([
  "lastMessageKey",
  "status",
  "version",
]);

const outboxColumns = `
  outbox_key AS "outboxKey",
  request_key AS "requestKey",
  audit_key AS "auditKey",
  tenant_id AS "tenantId",
  conversation_key AS "conversationKey",
  inbound_message_key AS "inboundMessageKey",
  ai_agent_key AS "aiAgentKey",
  ai_agent_version_key AS "aiAgentVersionKey",
  expected_conversation_version AS "expectedConversationVersion",
  recipient_phone_e164 AS "recipientPhoneNumber",
  response_mode AS "responseMode",
  reply_text AS "replyText",
  grounded_source_keys_json AS "groundedSourceKeysJson",
  grounding_score_basis_points AS "groundingScoreBasisPoints",
  status,
  decided_by_external_user_id AS "decidedByExternalUserId",
  decided_at AS "decidedAt",
  version,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export const postgresAiReplyOutboxSql = Object.freeze({
  findByKey: `
    SELECT ${outboxColumns}
    FROM ai_reply_outbox
    WHERE tenant_id = $1
      AND outbox_key = $2
    LIMIT 1
  `,
  findByInboundMessage: `
    SELECT ${outboxColumns}
    FROM ai_reply_outbox
    WHERE tenant_id = $1
      AND inbound_message_key = $2
    LIMIT 1
  `,
  listAwaitingApproval: `
    SELECT ${outboxColumns.replaceAll("\n  ", "\n  outbox.")}
    FROM ai_reply_outbox AS outbox
    INNER JOIN conversations AS conversation
      ON conversation.tenant_id = outbox.tenant_id
      AND conversation.conversation_key = outbox.conversation_key
    WHERE outbox.tenant_id = $1
      AND outbox.status = 'awaiting-approval'
      AND conversation.last_message_key = outbox.inbound_message_key
      AND conversation.status <> 'closed'
    ORDER BY outbox.created_at ASC, outbox.outbox_key ASC
    LIMIT $2
  `,
  findCollisionForUpdate: `
    SELECT ${outboxColumns}
    FROM ai_reply_outbox
    WHERE tenant_id = $1
      AND (
        outbox_key = $2
        OR request_key = $3
        OR inbound_message_key = $4
      )
    ORDER BY outbox_key ASC
    FOR UPDATE
  `,
  lockConversation: `
    SELECT
      status,
      last_message_key AS "lastMessageKey",
      version
    FROM conversations
    WHERE tenant_id = $1
      AND conversation_key = $2
    FOR UPDATE
  `,
  insert: `
    INSERT INTO ai_reply_outbox (
      outbox_key,
      request_key,
      audit_key,
      tenant_id,
      conversation_key,
      inbound_message_key,
      ai_agent_key,
      ai_agent_version_key,
      expected_conversation_version,
      recipient_phone_e164,
      response_mode,
      reply_text,
      grounded_source_keys_json,
      grounding_score_basis_points,
      status
    )
    SELECT
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13::jsonb, $14,
      CASE
        WHEN $11 = 'automatic' THEN 'ready-for-delivery'
        ELSE 'awaiting-approval'
      END
    FROM ai_runtime_audit_events AS audit
    INNER JOIN conversations AS conversation
      ON conversation.tenant_id = audit.tenant_id
      AND conversation.conversation_key = audit.conversation_key
    INNER JOIN contacts AS contact
      ON contact.tenant_id = conversation.tenant_id
      AND contact.id = conversation.contact_id
    WHERE audit.tenant_id = $4
      AND audit.audit_key = $3
      AND audit.request_key = $2
      AND audit.conversation_key = $5
      AND audit.inbound_message_key = $6
      AND audit.ai_agent_key = $7
      AND audit.ai_agent_version_key = $8
      AND audit.expected_conversation_version = $9
      AND audit.outcome = 'reply-planned'
      AND audit.response_mode = $11
      AND audit.grounding_score_basis_points = $14
      AND conversation.version = $9
      AND conversation.last_message_key = $6
      AND conversation.status IN ('new', 'bot_active')
      AND contact.phone_e164 = $10
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text($13::jsonb) AS selected(source_key)
        LEFT JOIN ai_agent_version_sources AS link
          ON link.tenant_id = $4
          AND link.ai_agent_version_key = $8
          AND link.source_key = selected.source_key
        LEFT JOIN knowledge_sources AS source
          ON source.tenant_id = link.tenant_id
          AND source.source_key = link.source_key
          AND source.status = 'ready'
        WHERE link.source_key IS NULL
          OR source.source_key IS NULL
      )
    ON CONFLICT DO NOTHING
    RETURNING ${outboxColumns}
  `,
  decide: `
    UPDATE ai_reply_outbox
    SET
      status = $5,
      decided_by_external_user_id = $4,
      decided_at = $6::timestamptz,
      version = version + 1,
      updated_at = $6::timestamptz
    WHERE tenant_id = $1
      AND outbox_key = $2
      AND version = $3
      AND response_mode = 'agent-approval'
      AND status = 'awaiting-approval'
    RETURNING ${outboxColumns}
  `,
});

interface ConversationRow {
  readonly status: string;
  readonly lastMessageKey: string | null;
  readonly version: number;
}

export interface PostgresAiReplyOutboxRepositoryDependencies {
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

function requireTimestamp(value: unknown, fieldName: string): string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(Date.parse(value)).toISOString() !== value
  ) {
    throw new Error(`${fieldName} is invalid`);
  }
  return value;
}

function normalizeActor(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("decidedByExternalUserId is invalid");
  }
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > 255 ||
    unsafeControlCharacters.test(normalized)
  ) {
    throw new Error("decidedByExternalUserId is invalid");
  }
  return normalized;
}

function parseSourceKeys(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    return null;
  }
  const sourceKeys: string[] = [];
  for (const sourceKey of value) {
    if (
      typeof sourceKey !== "string" ||
      !sourceKeyPattern.test(sourceKey) ||
      sourceKeys.includes(sourceKey)
    ) {
      return null;
    }
    sourceKeys.push(sourceKey);
  }
  const sorted = [...sourceKeys].sort();
  return sourceKeys.every((sourceKey, index) => sourceKey === sorted[index])
    ? Object.freeze(sourceKeys)
    : null;
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null ? null : parsePostgresTimestamp(value);
}

function parseOutbox(value: unknown): PersistedAiReplyOutboxItem {
  const row = requireExactPostgresRow(value, outboxRowKeys);
  const responseMode = row.responseMode === "automatic" ||
      row.responseMode === "agent-approval"
    ? row.responseMode
    : null;
  const status = outboxStatuses.find((candidate) => candidate === row.status) as
    AiReplyOutboxStatus | undefined;
  const groundedSourceKeys = parseSourceKeys(row.groundedSourceKeysJson);
  const decidedByExternalUserId = row.decidedByExternalUserId === null
    ? null
    : normalizeActor(row.decidedByExternalUserId);
  const decidedAt = parseNullableTimestamp(row.decidedAt);
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);
  const version = parsePostgresPositiveInteger(row.version);
  const groundingScoreBasisPoints = parsePostgresNonnegativeInteger(
    row.groundingScoreBasisPoints,
  );
  if (
    responseMode === null ||
    status === undefined ||
    groundedSourceKeys === null ||
    groundingScoreBasisPoints > 10_000 ||
    typeof row.replyText !== "string" ||
    row.replyText.trim().length === 0 ||
    row.replyText.length > 4_096 ||
    unsafeControlCharacters.test(row.replyText) ||
    Date.parse(updatedAt) < Date.parse(createdAt) ||
    (decidedAt !== null &&
      (Date.parse(decidedAt) < Date.parse(createdAt) || decidedAt !== updatedAt)) ||
    (responseMode === "automatic" &&
      (status !== "ready-for-delivery" ||
        decidedByExternalUserId !== null || decidedAt !== null || version !== 1)) ||
    (responseMode === "agent-approval" &&
      status === "awaiting-approval" &&
      (decidedByExternalUserId !== null || decidedAt !== null || version !== 1)) ||
    (responseMode === "agent-approval" &&
      status !== "awaiting-approval" &&
      (decidedByExternalUserId === null || decidedAt === null || version < 2))
  ) {
    throw new Error("PostgreSQL returned an invalid AI reply outbox item");
  }
  return Object.freeze({
    outboxKey: requirePattern(row.outboxKey, outboxKeyPattern, "outboxKey"),
    requestKey: requirePattern(row.requestKey, requestKeyPattern, "requestKey"),
    auditKey: requirePattern(row.auditKey, auditKeyPattern, "auditKey"),
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
    aiAgentKey: requirePattern(row.aiAgentKey, aiAgentKeyPattern, "aiAgentKey"),
    aiAgentVersionKey: requirePattern(
      row.aiAgentVersionKey,
      aiAgentVersionKeyPattern,
      "aiAgentVersionKey",
    ),
    expectedConversationVersion: parsePostgresPositiveInteger(
      row.expectedConversationVersion,
    ),
    recipientPhoneNumber: requirePattern(
      row.recipientPhoneNumber,
      phonePattern,
      "recipientPhoneNumber",
    ),
    responseMode,
    replyText: row.replyText,
    groundedSourceKeys,
    groundingScoreBasisPoints,
    status,
    decidedByExternalUserId,
    decidedAt,
    version,
    createdAt,
    updatedAt,
  });
}

function parseConversation(value: unknown): ConversationRow {
  const row = requireExactPostgresRow(value, conversationRowKeys);
  if (
    !["new", "bot_active", "waiting_for_agent", "agent_active",
      "waiting_for_contact", "closed"].includes(String(row.status)) ||
    (row.lastMessageKey !== null &&
      (typeof row.lastMessageKey !== "string" ||
        !messageKeyPattern.test(row.lastMessageKey)))
  ) {
    throw new Error("PostgreSQL returned an invalid conversation state");
  }
  return Object.freeze({
    status: String(row.status),
    lastMessageKey: row.lastMessageKey as string | null,
    version: parsePostgresPositiveInteger(row.version),
  });
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

async function validateIdentity(
  item: PersistedAiReplyOutboxItem,
): Promise<void> {
  const expected = await deriveAiReplyOutboxKey(item.tenantId, item.requestKey);
  if (expected !== item.outboxKey) {
    throw new Error("PostgreSQL returned an invalid AI reply outbox identity");
  }
}

async function requireScopedItem(
  value: unknown,
  tenantId: number,
  outboxKey?: string,
  inboundMessageKey?: string,
): Promise<PersistedAiReplyOutboxItem> {
  const item = parseOutbox(value);
  await validateIdentity(item);
  if (
    item.tenantId !== tenantId ||
    (outboxKey !== undefined && item.outboxKey !== outboxKey) ||
    (inboundMessageKey !== undefined &&
      item.inboundMessageKey !== inboundMessageKey)
  ) {
    throw new Error("PostgreSQL returned an AI reply outbox item outside scope");
  }
  return item;
}

async function normalizeStageInput(input: StageAiReplyOutboxInput): Promise<{
  readonly input: StageAiReplyOutboxInput;
  readonly sourceKeys: readonly string[];
  readonly sourceKeysJson: string;
}> {
  requirePositiveInteger(input?.tenantId, "tenantId");
  requirePositiveInteger(
    input?.expectedConversationVersion,
    "expectedConversationVersion",
  );
  const sourceKeys = parseSourceKeys(input?.groundedSourceKeys);
  if (
    !outboxKeyPattern.test(input?.outboxKey) ||
    !requestKeyPattern.test(input?.requestKey) ||
    !auditKeyPattern.test(input?.auditKey) ||
    !conversationKeyPattern.test(input?.conversationKey) ||
    !messageKeyPattern.test(input?.inboundMessageKey) ||
    !aiAgentKeyPattern.test(input?.aiAgentKey) ||
    !aiAgentVersionKeyPattern.test(input?.aiAgentVersionKey) ||
    !phonePattern.test(input?.recipientPhoneNumber) ||
    (input?.responseMode !== "automatic" &&
      input?.responseMode !== "agent-approval") ||
    typeof input?.replyText !== "string" ||
    input.replyText.trim().length === 0 ||
    input.replyText.length > 4_096 ||
    unsafeControlCharacters.test(input.replyText) ||
    sourceKeys === null ||
    !Number.isSafeInteger(input?.groundingScoreBasisPoints) ||
    input.groundingScoreBasisPoints < 0 ||
    input.groundingScoreBasisPoints > 10_000
  ) {
    throw new Error("AI reply outbox stage input is invalid");
  }
  const identity = {
    conversationKey: input.conversationKey,
    inboundMessageKey: input.inboundMessageKey,
    aiAgentVersionKey: input.aiAgentVersionKey,
  };
  const [requestKey, auditKey, outboxKey] = await Promise.all([
    deriveAiProviderRequestKey(input.tenantId, identity),
    deriveAiRuntimeAuditKey(input.tenantId, identity),
    deriveAiReplyOutboxKey(input.tenantId, input.requestKey),
  ]);
  if (
    requestKey !== input.requestKey ||
    auditKey !== input.auditKey ||
    outboxKey !== input.outboxKey
  ) {
    throw new Error("AI reply outbox deterministic identity is invalid");
  }
  return Object.freeze({
    input,
    sourceKeys,
    sourceKeysJson: JSON.stringify(sourceKeys),
  });
}

function sameStageIdentity(
  item: PersistedAiReplyOutboxItem,
  input: StageAiReplyOutboxInput,
  sourceKeys: readonly string[],
): boolean {
  return item.outboxKey === input.outboxKey &&
    item.requestKey === input.requestKey &&
    item.auditKey === input.auditKey &&
    item.tenantId === input.tenantId &&
    item.conversationKey === input.conversationKey &&
    item.inboundMessageKey === input.inboundMessageKey &&
    item.aiAgentKey === input.aiAgentKey &&
    item.aiAgentVersionKey === input.aiAgentVersionKey &&
    item.expectedConversationVersion === input.expectedConversationVersion &&
    item.recipientPhoneNumber === input.recipientPhoneNumber &&
    item.responseMode === input.responseMode &&
    item.replyText === input.replyText &&
    item.groundingScoreBasisPoints === input.groundingScoreBasisPoints &&
    JSON.stringify(item.groundedSourceKeys) === JSON.stringify(sourceKeys);
}

function conversationPermitsDecision(
  conversation: ConversationRow,
  item: PersistedAiReplyOutboxItem,
): boolean {
  return conversation.lastMessageKey === item.inboundMessageKey &&
    conversation.status !== "closed";
}

export function createPostgresAiReplyOutboxRepository(
  dependencies: Readonly<PostgresAiReplyOutboxRepositoryDependencies>,
): AiReplyOutboxRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL AI reply outbox dependencies are invalid");
  }

  const findByKey: AiReplyOutboxRepository["findByKey"] = async (
    tenantIdInput,
    outboxKeyInput,
  ) => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const outboxKey = requirePattern(outboxKeyInput, outboxKeyPattern, "outboxKey");
    const row = await loadOne(
      dependencies.queries,
      postgresAiReplyOutboxSql.findByKey,
      [tenantId, outboxKey],
    );
    return row === null ? null : requireScopedItem(row, tenantId, outboxKey);
  };

  return Object.freeze({
    async stage(input: StageAiReplyOutboxInput) {
      const normalized = await normalizeStageInput(input);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const initialRows = await loadRows(
            transaction,
            postgresAiReplyOutboxSql.findCollisionForUpdate,
            [
              input.tenantId,
              input.outboxKey,
              input.requestKey,
              input.inboundMessageKey,
            ],
            3,
          );
          if (initialRows.length > 0) {
            if (initialRows.length !== 1) {
              throw new AiReplyOutboxIdentityConflictError();
            }
            const item = await requireScopedItem(initialRows[0], input.tenantId);
            if (!sameStageIdentity(item, input, normalized.sourceKeys)) {
              throw new AiReplyOutboxIdentityConflictError();
            }
            return Object.freeze({ outcome: "unchanged" as const, item });
          }

          const conversationRow = await loadOne(
            transaction,
            postgresAiReplyOutboxSql.lockConversation,
            [input.tenantId, input.conversationKey],
          );
          if (conversationRow === null) {
            throw new Error("PostgreSQL AI reply outbox prerequisites were not met");
          }
          parseConversation(conversationRow);

          const replayRows = await loadRows(
            transaction,
            postgresAiReplyOutboxSql.findCollisionForUpdate,
            [
              input.tenantId,
              input.outboxKey,
              input.requestKey,
              input.inboundMessageKey,
            ],
            3,
          );
          if (replayRows.length > 0) {
            if (replayRows.length !== 1) {
              throw new AiReplyOutboxIdentityConflictError();
            }
            const item = await requireScopedItem(replayRows[0], input.tenantId);
            if (!sameStageIdentity(item, input, normalized.sourceKeys)) {
              throw new AiReplyOutboxIdentityConflictError();
            }
            return Object.freeze({ outcome: "unchanged" as const, item });
          }

          const inserted = await loadOne(
            transaction,
            postgresAiReplyOutboxSql.insert,
            [
              input.outboxKey,
              input.requestKey,
              input.auditKey,
              input.tenantId,
              input.conversationKey,
              input.inboundMessageKey,
              input.aiAgentKey,
              input.aiAgentVersionKey,
              input.expectedConversationVersion,
              input.recipientPhoneNumber,
              input.responseMode,
              input.replyText,
              normalized.sourceKeysJson,
              input.groundingScoreBasisPoints,
            ],
          );
          if (inserted === null) {
            throw new Error("PostgreSQL AI reply outbox prerequisites were not met");
          }
          const item = await requireScopedItem(
            inserted,
            input.tenantId,
            input.outboxKey,
          );
          if (!sameStageIdentity(item, input, normalized.sourceKeys)) {
            throw new Error("PostgreSQL returned conflicting AI reply outbox data");
          }
          return Object.freeze({ outcome: "created" as const, item });
        },
      );
    },

    findByKey,

    async findByInboundMessage(
      tenantIdInput: number,
      inboundMessageKeyInput: string,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const inboundMessageKey = requirePattern(
        inboundMessageKeyInput,
        messageKeyPattern,
        "inboundMessageKey",
      );
      const row = await loadOne(
        dependencies.queries,
        postgresAiReplyOutboxSql.findByInboundMessage,
        [tenantId, inboundMessageKey],
      );
      return row === null
        ? null
        : requireScopedItem(row, tenantId, undefined, inboundMessageKey);
    },

    async listAwaitingApproval(tenantIdInput: number, limitInput: number) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const limit = requirePositiveInteger(limitInput, "limit");
      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }
      const rows = await loadRows(
        dependencies.queries,
        postgresAiReplyOutboxSql.listAwaitingApproval,
        [tenantId, limit],
        limit,
      );
      return Object.freeze(await Promise.all(rows.map(async (row) => {
        const item = await requireScopedItem(row, tenantId);
        if (item.status !== "awaiting-approval") {
          throw new Error("PostgreSQL returned an AI reply outside approval state");
        }
        return item;
      })));
    },

    async decide(input: DecideAiReplyOutboxInput) {
      const tenantId = requirePositiveInteger(input?.tenantId, "tenantId");
      const outboxKey = requirePattern(input?.outboxKey, outboxKeyPattern, "outboxKey");
      const expectedVersion = requirePositiveInteger(
        input?.expectedVersion,
        "expectedVersion",
      );
      if (input?.decision !== "approve" && input?.decision !== "reject") {
        throw new Error("AI reply approval decision is invalid");
      }
      const actor = normalizeActor(input.decidedByExternalUserId);
      const decidedAt = requireTimestamp(input.decidedAt, "decidedAt");
      const targetStatus: AiReplyOutboxStatus = input.decision === "approve"
        ? "ready-for-delivery"
        : "rejected";

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const rows = await loadRows(
            transaction,
            postgresAiReplyOutboxSql.findCollisionForUpdate,
            [tenantId, outboxKey, "", ""],
            1,
          );
          if (rows.length === 0) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          const item = await requireScopedItem(rows[0], tenantId, outboxKey);
          if (
            item.version === expectedVersion + 1 &&
            item.status === targetStatus &&
            item.decidedByExternalUserId === actor
          ) {
            return Object.freeze({ outcome: "unchanged" as const, item });
          }
          if (item.version !== expectedVersion) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          if (
            item.responseMode !== "agent-approval" ||
            item.status !== "awaiting-approval"
          ) {
            return Object.freeze({ outcome: "invalid-state" as const });
          }

          const conversationRow = await loadOne(
            transaction,
            postgresAiReplyOutboxSql.lockConversation,
            [tenantId, item.conversationKey],
          );
          if (
            conversationRow === null ||
            !conversationPermitsDecision(parseConversation(conversationRow), item)
          ) {
            return Object.freeze({ outcome: "invalid-state" as const });
          }
          const updated = await loadOne(
            transaction,
            postgresAiReplyOutboxSql.decide,
            [
              tenantId,
              outboxKey,
              expectedVersion,
              actor,
              targetStatus,
              decidedAt,
            ],
          );
          if (updated === null) {
            throw new Error("PostgreSQL AI reply approval decision failed");
          }
          const result = await requireScopedItem(updated, tenantId, outboxKey);
          if (
            result.version !== expectedVersion + 1 ||
            result.status !== targetStatus ||
            result.decidedByExternalUserId !== actor ||
            result.decidedAt !== decidedAt
          ) {
            throw new Error("PostgreSQL returned conflicting AI reply decision");
          }
          return Object.freeze({ outcome: "updated" as const, item: result });
        },
      );
    },
  });
}
