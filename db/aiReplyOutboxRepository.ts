import {
  aiReplyOutboxStatuses,
  type AiReplyOutboxStatus,
  type PersistedAiReplyOutboxItem,
} from "../shared/domain/aiReplyOutbox.ts";
import type {
  AiResponseMode,
} from "../shared/domain/aiAgent.ts";
import {
  deriveAiReplyOutboxKey,
} from "../server/ai/aiReplyOutboxKey.ts";
import {
  deriveAiProviderRequestKey,
  deriveAiRuntimeAuditKey,
} from "../server/ai/aiRuntimeKey.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const OUTBOX_KEY_PATTERN =
  /^ai_reply_outbox_v1_[0-9a-f]{64}$/;
const REQUEST_KEY_PATTERN =
  /^ai_provider_request_v1_[0-9a-f]{64}$/;
const AUDIT_KEY_PATTERN =
  /^ai_runtime_audit_v1_[0-9a-f]{64}$/;
const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;
const MESSAGE_KEY_PATTERN =
  /^message_v1_[0-9a-f]{64}$/;
const AI_AGENT_KEY_PATTERN =
  /^ai_agent_v1_[0-9a-f]{64}$/;
const AI_AGENT_VERSION_KEY_PATTERN =
  /^ai_agent_version_v1_[0-9a-f]{64}$/;
const SOURCE_KEY_PATTERN =
  /^knowledge_source_v1_[0-9a-f]{64}$/;
const PHONE_PATTERN = /^\+[1-9][0-9]{0,14}$/;
const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const OUTBOX_COLUMNS_SQL = `
  outbox_key AS outboxKey,
  request_key AS requestKey,
  audit_key AS auditKey,
  tenant_id AS tenantId,
  conversation_key AS conversationKey,
  inbound_message_key AS inboundMessageKey,
  ai_agent_key AS aiAgentKey,
  ai_agent_version_key AS aiAgentVersionKey,
  expected_conversation_version AS expectedConversationVersion,
  recipient_phone_e164 AS recipientPhoneNumber,
  response_mode AS responseMode,
  reply_text AS replyText,
  grounded_source_keys_json AS groundedSourceKeysJson,
  grounding_score_basis_points AS groundingScoreBasisPoints,
  status,
  decided_by_external_user_id AS decidedByExternalUserId,
  decided_at AS decidedAt,
  version,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const ALIASED_OUTBOX_COLUMNS_SQL = `
  outbox.outbox_key AS outboxKey,
  outbox.request_key AS requestKey,
  outbox.audit_key AS auditKey,
  outbox.tenant_id AS tenantId,
  outbox.conversation_key AS conversationKey,
  outbox.inbound_message_key AS inboundMessageKey,
  outbox.ai_agent_key AS aiAgentKey,
  outbox.ai_agent_version_key AS aiAgentVersionKey,
  outbox.expected_conversation_version AS expectedConversationVersion,
  outbox.recipient_phone_e164 AS recipientPhoneNumber,
  outbox.response_mode AS responseMode,
  outbox.reply_text AS replyText,
  outbox.grounded_source_keys_json AS groundedSourceKeysJson,
  outbox.grounding_score_basis_points AS groundingScoreBasisPoints,
  outbox.status AS status,
  outbox.decided_by_external_user_id AS decidedByExternalUserId,
  outbox.decided_at AS decidedAt,
  outbox.version AS version,
  outbox.created_at AS createdAt,
  outbox.updated_at AS updatedAt
`;

const INSERT_OUTBOX_SQL = `
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
    ?1,
    ?2,
    ?3,
    ?4,
    ?5,
    ?6,
    ?7,
    ?8,
    ?9,
    ?10,
    ?11,
    ?12,
    ?13,
    ?14,
    CASE
      WHEN ?11 = 'automatic'
      THEN 'ready-for-delivery'
      ELSE 'awaiting-approval'
    END
  FROM ai_runtime_audit_events AS audit
  INNER JOIN conversations AS conversation
    ON conversation.tenant_id = audit.tenant_id
    AND conversation.conversation_key =
      audit.conversation_key
  INNER JOIN contacts AS contact
    ON contact.tenant_id = conversation.tenant_id
    AND contact.id = conversation.contact_id
  WHERE audit.tenant_id = ?4
    AND audit.audit_key = ?3
    AND audit.request_key = ?2
    AND audit.conversation_key = ?5
    AND audit.inbound_message_key = ?6
    AND audit.ai_agent_key = ?7
    AND audit.ai_agent_version_key = ?8
    AND audit.expected_conversation_version = ?9
    AND audit.outcome = 'reply-planned'
    AND audit.response_mode = ?11
    AND audit.grounding_score_basis_points = ?14
    AND conversation.version = ?9
    AND conversation.last_message_key = ?6
    AND conversation.status IN ('new', 'bot_active')
    AND contact.phone_e164 = ?10
    AND NOT EXISTS (
      SELECT 1
      FROM json_each(?13) AS selected
      LEFT JOIN ai_agent_version_sources AS link
        ON link.tenant_id = ?4
        AND link.ai_agent_version_key = ?8
        AND link.source_key = selected.value
      LEFT JOIN knowledge_sources AS source
        ON source.tenant_id = link.tenant_id
        AND source.source_key = link.source_key
        AND source.status = 'ready'
      WHERE link.source_key IS NULL
        OR source.source_key IS NULL
    )
  ON CONFLICT DO NOTHING
  RETURNING
    ${OUTBOX_COLUMNS_SQL}
`;

const SELECT_OUTBOX_SQL = `
  SELECT
    ${OUTBOX_COLUMNS_SQL}
  FROM ai_reply_outbox
  WHERE tenant_id = ?1
    AND outbox_key = ?2
  LIMIT 1
`;

const SELECT_OUTBOX_BY_INBOUND_MESSAGE_SQL = `
  SELECT
    ${OUTBOX_COLUMNS_SQL}
  FROM ai_reply_outbox
  WHERE tenant_id = ?1
    AND inbound_message_key = ?2
  LIMIT 1
`;

const LIST_AWAITING_APPROVAL_SQL = `
  SELECT
    ${ALIASED_OUTBOX_COLUMNS_SQL}
  FROM ai_reply_outbox AS outbox
  INNER JOIN conversations AS conversation
    ON conversation.tenant_id = outbox.tenant_id
    AND conversation.conversation_key =
      outbox.conversation_key
  WHERE outbox.tenant_id = ?1
    AND outbox.status = 'awaiting-approval'
    AND conversation.last_message_key =
      outbox.inbound_message_key
    AND conversation.status <> 'closed'
  ORDER BY
    outbox.created_at ASC,
    outbox.outbox_key ASC
  LIMIT ?2
`;

const DECIDE_OUTBOX_SQL = `
  UPDATE ai_reply_outbox
  SET
    status = ?5,
    decided_by_external_user_id = ?4,
    decided_at = ?6,
    version = version + 1,
    updated_at = ?6
  WHERE tenant_id = ?1
    AND outbox_key = ?2
    AND version = ?3
    AND response_mode = 'agent-approval'
    AND status = 'awaiting-approval'
    AND EXISTS (
      SELECT 1
      FROM conversations
      WHERE conversations.tenant_id = ?1
        AND conversations.conversation_key =
          ai_reply_outbox.conversation_key
        AND conversations.last_message_key =
          ai_reply_outbox.inbound_message_key
        AND conversations.status <> 'closed'
    )
  RETURNING
    ${OUTBOX_COLUMNS_SQL}
`;

interface AiReplyOutboxRow {
  outboxKey: string;
  requestKey: string;
  auditKey: string;
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  aiAgentKey: string;
  aiAgentVersionKey: string;
  expectedConversationVersion: number;
  recipientPhoneNumber: string;
  responseMode: string;
  replyText: string;
  groundedSourceKeysJson: string;
  groundingScoreBasisPoints: number;
  status: string;
  decidedByExternalUserId: string | null;
  decidedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface StageAiReplyOutboxInput {
  outboxKey: string;
  requestKey: string;
  auditKey: string;
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  aiAgentKey: string;
  aiAgentVersionKey: string;
  expectedConversationVersion: number;
  recipientPhoneNumber: string;
  responseMode: AiResponseMode;
  replyText: string;
  groundedSourceKeys: readonly string[];
  groundingScoreBasisPoints: number;
}

export type StageAiReplyOutboxResult = {
  outcome: "created" | "unchanged";
  item: PersistedAiReplyOutboxItem;
};

export interface DecideAiReplyOutboxInput {
  tenantId: number;
  outboxKey: string;
  expectedVersion: number;
  decidedByExternalUserId: string;
  decision: "approve" | "reject";
  decidedAt: string;
}

export type DecideAiReplyOutboxResult =
  | {
      outcome: "updated" | "unchanged";
      item: PersistedAiReplyOutboxItem;
    }
  | {
      outcome:
        | "not-found"
        | "conflict"
        | "invalid-state";
    };

export interface AiReplyOutboxRepository {
  stage(
    input: StageAiReplyOutboxInput,
  ): Promise<StageAiReplyOutboxResult>;
  findByKey(
    tenantId: number,
    outboxKey: string,
  ): Promise<PersistedAiReplyOutboxItem | null>;
  findByInboundMessage(
    tenantId: number,
    inboundMessageKey: string,
  ): Promise<PersistedAiReplyOutboxItem | null>;
  listAwaitingApproval(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedAiReplyOutboxItem[]>;
  decide(
    input: DecideAiReplyOutboxInput,
  ): Promise<DecideAiReplyOutboxResult>;
}

export class AiReplyOutboxIdentityConflictError
  extends Error {
  readonly code = "IDENTITY_CONFLICT";

  constructor() {
    super(
      "AI reply outbox identity conflicts with stored data",
    );
    this.name =
      "AiReplyOutboxIdentityConflictError";
  }
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${fieldName} must be a positive integer`,
    );
  }
}

function assertTimestamp(value: string): void {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(Date.parse(value)).toISOString() !==
      value
  ) {
    throw new Error("decidedAt is invalid");
  }
}

function normalizeActor(value: string): string {
  if (typeof value !== "string") {
    throw new Error(
      "decidedByExternalUserId is invalid",
    );
  }

  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 255 ||
    UNSAFE_CONTROL_CHARACTERS.test(normalized)
  ) {
    throw new Error(
      "decidedByExternalUserId is invalid",
    );
  }

  return normalized;
}

function parseSourceKeys(
  value: unknown,
): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 100
  ) {
    return null;
  }

  const sourceKeys: string[] = [];

  for (const sourceKey of value) {
    if (
      typeof sourceKey !== "string" ||
      !SOURCE_KEY_PATTERN.test(sourceKey) ||
      sourceKeys.includes(sourceKey)
    ) {
      return null;
    }

    sourceKeys.push(sourceKey);
  }

  const sorted = [...sourceKeys].sort();

  return sourceKeys.every(
    (sourceKey, index) =>
      sourceKey === sorted[index],
  )
    ? sourceKeys
    : null;
}

function isNonBlankText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isIsoTimestamp(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    Number.isFinite(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() ===
      value
  );
}

function parseRow(
  row: AiReplyOutboxRow,
): PersistedAiReplyOutboxItem {
  let parsedSources: unknown;

  try {
    parsedSources = JSON.parse(
      row.groundedSourceKeysJson,
    );
  } catch {
    throw new Error(
      "D1 returned invalid AI reply source data",
    );
  }

  const groundedSourceKeys =
    parseSourceKeys(parsedSources);
  const status = aiReplyOutboxStatuses.find(
    (candidate) => candidate === row.status,
  );
  const responseMode =
    row.responseMode === "automatic" ||
    row.responseMode === "agent-approval"
      ? row.responseMode
      : null;
  const undecided =
    row.decidedByExternalUserId === null &&
    row.decidedAt === null;
  const decided =
    isNonBlankText(
      row.decidedByExternalUserId,
    ) &&
    isIsoTimestamp(row.decidedAt);

  if (
    !OUTBOX_KEY_PATTERN.test(row.outboxKey) ||
    !REQUEST_KEY_PATTERN.test(row.requestKey) ||
    !AUDIT_KEY_PATTERN.test(row.auditKey) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !CONVERSATION_KEY_PATTERN.test(
      row.conversationKey,
    ) ||
    !MESSAGE_KEY_PATTERN.test(
      row.inboundMessageKey,
    ) ||
    !AI_AGENT_KEY_PATTERN.test(row.aiAgentKey) ||
    !AI_AGENT_VERSION_KEY_PATTERN.test(
      row.aiAgentVersionKey,
    ) ||
    !Number.isSafeInteger(
      row.expectedConversationVersion,
    ) ||
    row.expectedConversationVersion <= 0 ||
    !PHONE_PATTERN.test(row.recipientPhoneNumber) ||
    !responseMode ||
    typeof row.replyText !== "string" ||
    row.replyText.trim().length === 0 ||
    row.replyText.length > 4_096 ||
    UNSAFE_CONTROL_CHARACTERS.test(
      row.replyText,
    ) ||
    !groundedSourceKeys ||
    !Number.isSafeInteger(
      row.groundingScoreBasisPoints,
    ) ||
    row.groundingScoreBasisPoints < 0 ||
    row.groundingScoreBasisPoints > 10_000 ||
    !status ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    !isNonBlankText(row.createdAt) ||
    !isNonBlankText(row.updatedAt) ||
    (responseMode === "automatic" &&
      (status !== "ready-for-delivery" ||
        !undecided ||
        row.version !== 1)) ||
    (responseMode === "agent-approval" &&
      status === "awaiting-approval" &&
      (!undecided || row.version !== 1)) ||
    (responseMode === "agent-approval" &&
      status !== "awaiting-approval" &&
      (!decided || row.version < 2))
  ) {
    throw new Error(
      "D1 returned an invalid AI reply outbox item",
    );
  }

  return {
    outboxKey: row.outboxKey,
    requestKey: row.requestKey,
    auditKey: row.auditKey,
    tenantId: row.tenantId,
    conversationKey: row.conversationKey,
    inboundMessageKey: row.inboundMessageKey,
    aiAgentKey: row.aiAgentKey,
    aiAgentVersionKey: row.aiAgentVersionKey,
    expectedConversationVersion:
      row.expectedConversationVersion,
    recipientPhoneNumber:
      row.recipientPhoneNumber,
    responseMode,
    replyText: row.replyText,
    groundedSourceKeys,
    groundingScoreBasisPoints:
      row.groundingScoreBasisPoints,
    status,
    decidedByExternalUserId:
      row.decidedByExternalUserId,
    decidedAt: row.decidedAt,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertStageInput(
  input: StageAiReplyOutboxInput,
): Promise<{
  sourceKeys: readonly string[];
  sourceKeysJson: string;
}> {
  assertPositiveInteger(input.tenantId, "tenantId");
  assertPositiveInteger(
    input.expectedConversationVersion,
    "expectedConversationVersion",
  );

  const sourceKeys = parseSourceKeys(
    input.groundedSourceKeys,
  );

  if (
    !OUTBOX_KEY_PATTERN.test(input.outboxKey) ||
    !REQUEST_KEY_PATTERN.test(input.requestKey) ||
    !AUDIT_KEY_PATTERN.test(input.auditKey) ||
    !CONVERSATION_KEY_PATTERN.test(
      input.conversationKey,
    ) ||
    !MESSAGE_KEY_PATTERN.test(
      input.inboundMessageKey,
    ) ||
    !AI_AGENT_KEY_PATTERN.test(
      input.aiAgentKey,
    ) ||
    !AI_AGENT_VERSION_KEY_PATTERN.test(
      input.aiAgentVersionKey,
    ) ||
    !PHONE_PATTERN.test(
      input.recipientPhoneNumber,
    ) ||
    (input.responseMode !== "automatic" &&
      input.responseMode !== "agent-approval") ||
    typeof input.replyText !== "string" ||
    input.replyText.trim().length === 0 ||
    input.replyText.length > 4_096 ||
    UNSAFE_CONTROL_CHARACTERS.test(
      input.replyText,
    ) ||
    !sourceKeys ||
    !Number.isSafeInteger(
      input.groundingScoreBasisPoints,
    ) ||
    input.groundingScoreBasisPoints < 0 ||
    input.groundingScoreBasisPoints > 10_000
  ) {
    throw new Error(
      "AI reply outbox stage input is invalid",
    );
  }

  const identity = {
    conversationKey: input.conversationKey,
    inboundMessageKey:
      input.inboundMessageKey,
    aiAgentVersionKey:
      input.aiAgentVersionKey,
  };
  const [
    expectedRequestKey,
    expectedAuditKey,
    expectedOutboxKey,
  ] = await Promise.all([
    deriveAiProviderRequestKey(
      input.tenantId,
      identity,
    ),
    deriveAiRuntimeAuditKey(
      input.tenantId,
      identity,
    ),
    deriveAiReplyOutboxKey(
      input.tenantId,
      input.requestKey,
    ),
  ]);

  if (
    expectedRequestKey !== input.requestKey ||
    expectedAuditKey !== input.auditKey ||
    expectedOutboxKey !== input.outboxKey
  ) {
    throw new Error(
      "AI reply outbox deterministic identity is invalid",
    );
  }

  return {
    sourceKeys,
    sourceKeysJson: JSON.stringify(sourceKeys),
  };
}

function sameStageIdentity(
  item: PersistedAiReplyOutboxItem,
  input: StageAiReplyOutboxInput,
  sourceKeys: readonly string[],
): boolean {
  return (
    item.outboxKey === input.outboxKey &&
    item.requestKey === input.requestKey &&
    item.auditKey === input.auditKey &&
    item.tenantId === input.tenantId &&
    item.conversationKey ===
      input.conversationKey &&
    item.inboundMessageKey ===
      input.inboundMessageKey &&
    item.aiAgentKey === input.aiAgentKey &&
    item.aiAgentVersionKey ===
      input.aiAgentVersionKey &&
    item.expectedConversationVersion ===
      input.expectedConversationVersion &&
    item.recipientPhoneNumber ===
      input.recipientPhoneNumber &&
    item.responseMode === input.responseMode &&
    item.replyText === input.replyText &&
    item.groundingScoreBasisPoints ===
      input.groundingScoreBasisPoints &&
    item.groundedSourceKeys.length ===
      sourceKeys.length &&
    item.groundedSourceKeys.every(
      (sourceKey, index) =>
        sourceKey === sourceKeys[index],
    )
  );
}

export function createAiReplyOutboxRepository(
  database: D1DatabaseBinding,
): AiReplyOutboxRepository {
  const findByKey: AiReplyOutboxRepository["findByKey"] =
    async (tenantId, outboxKey) => {
      assertPositiveInteger(tenantId, "tenantId");

      if (!OUTBOX_KEY_PATTERN.test(outboxKey)) {
        throw new Error("outboxKey is invalid");
      }

      const row = await database
        .prepare(SELECT_OUTBOX_SQL)
        .bind(tenantId, outboxKey)
        .first<AiReplyOutboxRow>();

      if (!row) {
        return null;
      }

      const item = parseRow(row);
      const expectedKey =
        await deriveAiReplyOutboxKey(
          item.tenantId,
          item.requestKey,
        );

      if (
        item.tenantId !== tenantId ||
        item.outboxKey !== outboxKey ||
        item.outboxKey !== expectedKey
      ) {
        throw new Error(
          "D1 returned an AI reply outbox item outside the requested scope",
        );
      }

      return item;
    };

  return {
    async stage(input) {
      const { sourceKeys, sourceKeysJson } =
        await assertStageInput(input);
      let row: AiReplyOutboxRow | null;

      try {
        row = await database
          .prepare(INSERT_OUTBOX_SQL)
          .bind(
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
            sourceKeysJson,
            input.groundingScoreBasisPoints,
          )
          .first<AiReplyOutboxRow>();
      } catch {
        throw new Error(
          "D1 AI reply outbox stage failed",
        );
      }

      if (row) {
        return {
          outcome: "created",
          item: parseRow(row),
        };
      }

      const existing = await findByKey(
        input.tenantId,
        input.outboxKey,
      );

      if (!existing) {
        throw new Error(
          "D1 AI reply outbox stage prerequisites were not met",
        );
      }

      if (
        !sameStageIdentity(
          existing,
          input,
          sourceKeys,
        )
      ) {
        throw new AiReplyOutboxIdentityConflictError();
      }

      return {
        outcome: "unchanged",
        item: existing,
      };
    },

    findByKey,

    async findByInboundMessage(
      tenantId,
      inboundMessageKey,
    ) {
      assertPositiveInteger(
        tenantId,
        "tenantId",
      );

      if (
        !MESSAGE_KEY_PATTERN.test(
          inboundMessageKey,
        )
      ) {
        throw new Error(
          "inboundMessageKey is invalid",
        );
      }

      const row = await database
        .prepare(
          SELECT_OUTBOX_BY_INBOUND_MESSAGE_SQL,
        )
        .bind(
          tenantId,
          inboundMessageKey,
        )
        .first<AiReplyOutboxRow>();

      if (!row) {
        return null;
      }

      const item = parseRow(row);
      const expectedKey =
        await deriveAiReplyOutboxKey(
          item.tenantId,
          item.requestKey,
        );

      if (
        item.tenantId !== tenantId ||
        item.inboundMessageKey !==
          inboundMessageKey ||
        item.outboxKey !== expectedKey
      ) {
        throw new Error(
          "D1 returned an AI reply outbox item outside the requested inbound scope",
        );
      }

      return item;
    },

    async listAwaitingApproval(tenantId, limit) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(limit, "limit");

      if (limit > 100) {
        throw new Error(
          "limit must not exceed 100",
        );
      }

      const result = await database
        .prepare(LIST_AWAITING_APPROVAL_SQL)
        .bind(tenantId, limit)
        .all<AiReplyOutboxRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 AI reply approval list failed",
        );
      }

      return Promise.all(
        (result.results ?? []).map(
          async (row) => {
            const item = parseRow(row);
            const expectedKey =
              await deriveAiReplyOutboxKey(
                item.tenantId,
                item.requestKey,
              );

            if (
              item.tenantId !== tenantId ||
              item.status !==
                "awaiting-approval" ||
              item.outboxKey !== expectedKey
            ) {
              throw new Error(
                "D1 returned an AI reply approval outside the requested scope",
              );
            }

            return item;
          },
        ),
      );
    },

    async decide(input) {
      assertPositiveInteger(
        input.tenantId,
        "tenantId",
      );
      assertPositiveInteger(
        input.expectedVersion,
        "expectedVersion",
      );

      if (
        !OUTBOX_KEY_PATTERN.test(input.outboxKey) ||
        (input.decision !== "approve" &&
          input.decision !== "reject")
      ) {
        throw new Error(
          "AI reply approval decision is invalid",
        );
      }

      const actor = normalizeActor(
        input.decidedByExternalUserId,
      );
      assertTimestamp(input.decidedAt);
      const targetStatus: AiReplyOutboxStatus =
        input.decision === "approve"
          ? "ready-for-delivery"
          : "rejected";
      let row: AiReplyOutboxRow | null;

      try {
        row = await database
          .prepare(DECIDE_OUTBOX_SQL)
          .bind(
            input.tenantId,
            input.outboxKey,
            input.expectedVersion,
            actor,
            targetStatus,
            input.decidedAt,
          )
          .first<AiReplyOutboxRow>();
      } catch {
        throw new Error(
          "D1 AI reply approval decision failed",
        );
      }

      if (row) {
        return {
          outcome: "updated",
          item: parseRow(row),
        };
      }

      const existing = await findByKey(
        input.tenantId,
        input.outboxKey,
      );

      if (!existing) {
        return { outcome: "not-found" };
      }

      if (
        existing.version ===
          input.expectedVersion + 1 &&
        existing.status === targetStatus &&
        existing.decidedByExternalUserId ===
          actor
      ) {
        return {
          outcome: "unchanged",
          item: existing,
        };
      }

      if (
        existing.version !==
          input.expectedVersion
      ) {
        return { outcome: "conflict" };
      }

      return { outcome: "invalid-state" };
    },
  };
}
