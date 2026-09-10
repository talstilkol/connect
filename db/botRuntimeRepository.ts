import {
  persistedConversationStatuses,
} from "../shared/domain/conversation.ts";
import type {
  ConversationStatus,
} from "../shared/domain/model.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;
const MESSAGE_KEY_PATTERN =
  /^message_v1_[0-9a-f]{64}$/;
const BOT_FLOW_VERSION_KEY_PATTERN =
  /^bot_flow_version_v1_[0-9a-f]{64}$/;

const SELECT_BOT_RUNTIME_CONVERSATION_SQL = `
  SELECT
    conversation_key AS conversationKey,
    tenant_id AS tenantId,
    status,
    assigned_external_user_id AS assignedExternalUserId,
    version
  FROM conversations
  WHERE tenant_id = ?1
    AND conversation_key = ?2
  LIMIT 1
`;

const APPLY_BOT_HANDOFF_SQL = `
  UPDATE conversations
  SET
    status = 'waiting_for_agent',
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND conversation_key = ?2
    AND version = ?3
    AND assigned_external_user_id IS NULL
    AND status IN ('new', 'bot_active')
  RETURNING
    conversation_key AS conversationKey,
    tenant_id AS tenantId,
    status,
    assigned_external_user_id AS assignedExternalUserId,
    version
`;

const SELECT_ACCEPTED_BUTTON_CONTINUATION_SQL = `
  WITH current_inbound AS (
    SELECT
      rowid AS currentRowId,
      message_key AS currentMessageKey
    FROM messages
    WHERE tenant_id = ?1
      AND conversation_key = ?2
      AND message_key = ?3
      AND direction = 'inbound'
      AND status = 'received'
    LIMIT 1
  ),
  previous_inbound AS (
    SELECT previous.message_key AS previousMessageKey
    FROM messages AS previous
    INNER JOIN current_inbound
      ON previous.rowid < current_inbound.currentRowId
    WHERE previous.tenant_id = ?1
      AND previous.conversation_key = ?2
      AND previous.direction = 'inbound'
      AND previous.status = 'received'
    ORDER BY previous.rowid DESC
    LIMIT 1
  )
  SELECT
    current_inbound.currentMessageKey,
    delivery.bot_flow_version_key AS botFlowVersionKey,
    delivery.reply_json AS replyJson,
    delivery.accepted_at AS acceptedAt
  FROM current_inbound
  LEFT JOIN previous_inbound ON 1 = 1
  LEFT JOIN bot_reply_deliveries AS delivery
    ON delivery.tenant_id = ?1
    AND delivery.conversation_key = ?2
    AND delivery.inbound_message_key =
      previous_inbound.previousMessageKey
    AND delivery.status = 'accepted'
    AND delivery.accepted_at IS NOT NULL
    AND (
      ?4 IS NULL OR
      delivery.provider_message_id = ?4
    )
    AND unixepoch(delivery.accepted_at) >=
      unixepoch('now', '-24 hours')
    AND json_extract(delivery.reply_json, '$.kind') =
      'buttons'
  ORDER BY
    delivery.reply_index DESC,
    delivery.delivery_key ASC
  LIMIT 2
`;

interface BotRuntimeConversationRow {
  conversationKey: string;
  tenantId: number;
  status: string;
  assignedExternalUserId: string | null;
  version: number;
}

interface BotRuntimeContinuationEvidenceRow {
  currentMessageKey: string;
  botFlowVersionKey: string | null;
  replyJson: string | null;
  acceptedAt: string | null;
}

export interface BotRuntimeConversationState {
  conversationKey: string;
  tenantId: number;
  status: ConversationStatus;
  assignedExternalUserId: string | null;
  version: number;
}

export interface BotRuntimeContinuationEvidence {
  botFlowVersionKey: string;
  replyJson: string;
  acceptedAt: string;
}

export type FindBotRuntimeContinuationResult =
  | {
      outcome: "found";
      evidence: BotRuntimeContinuationEvidence;
    }
  | {
      outcome:
        | "none"
        | "current-message-not-found"
        | "ambiguous";
    };

export type ApplyBotHandoffResult =
  | {
      outcome: "updated" | "unchanged";
      state: BotRuntimeConversationState;
    }
  | {
      outcome:
        | "not-found"
        | "conflict"
        | "locked"
        | "invalid-state";
    };

export interface BotRuntimeRepository {
  findConversationState(
    tenantId: number,
    conversationKey: string,
  ): Promise<BotRuntimeConversationState | null>;
  findAcceptedButtonContinuation(
    tenantId: number,
    conversationKey: string,
    currentInboundMessageKey: string,
    replyToProviderMessageId?: string | null,
  ): Promise<FindBotRuntimeContinuationResult>;
  applyHandoff(
    tenantId: number,
    conversationKey: string,
    expectedVersion: number,
  ): Promise<ApplyBotHandoffResult>;
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${fieldName} must be a positive integer`,
    );
  }
}

function assertConversationKey(
  value: string,
): void {
  if (!CONVERSATION_KEY_PATTERN.test(value)) {
    throw new Error(
      "conversationKey is invalid",
    );
  }
}

function assertMessageKey(value: string): void {
  if (!MESSAGE_KEY_PATTERN.test(value)) {
    throw new Error("messageKey is invalid");
  }
}

function assertProviderMessageId(
  value: string | null,
): void {
  if (
    value !== null &&
    (typeof value !== "string" ||
      value.trim() !== value ||
      value.length === 0 ||
      value.length > 255)
  ) {
    throw new Error(
      "replyToProviderMessageId is invalid",
    );
  }
}

function parseContinuationEvidence(
  row: BotRuntimeContinuationEvidenceRow,
  currentInboundMessageKey: string,
): BotRuntimeContinuationEvidence {
  let reply: unknown;

  try {
    reply = JSON.parse(row.replyJson ?? "");
  } catch {
    throw new Error(
      "D1 returned invalid bot continuation JSON",
    );
  }

  if (
    row.currentMessageKey !==
      currentInboundMessageKey ||
    row.botFlowVersionKey === null ||
    !BOT_FLOW_VERSION_KEY_PATTERN.test(
      row.botFlowVersionKey,
    ) ||
    row.replyJson === null ||
    row.replyJson.length < 2 ||
    row.replyJson.length > 50_000 ||
    typeof reply !== "object" ||
    reply === null ||
    Array.isArray(reply) ||
    (reply as Record<string, unknown>).kind !==
      "buttons" ||
    row.acceptedAt === null ||
    !Number.isFinite(Date.parse(row.acceptedAt))
  ) {
    throw new Error(
      "D1 returned invalid bot continuation evidence",
    );
  }

  return {
    botFlowVersionKey:
      row.botFlowVersionKey,
    replyJson: row.replyJson,
    acceptedAt: row.acceptedAt,
  };
}

function parseConversationState(
  row: BotRuntimeConversationRow,
  tenantId: number,
  conversationKey: string,
): BotRuntimeConversationState {
  const status =
    persistedConversationStatuses.find(
      (candidate) =>
        candidate === row.status,
    );

  if (
    row.tenantId !== tenantId ||
    row.conversationKey !== conversationKey ||
    !status ||
    (row.assignedExternalUserId !== null &&
      (row.assignedExternalUserId.trim()
        .length === 0 ||
        row.assignedExternalUserId.length >
          255)) ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0
  ) {
    throw new Error(
      "D1 returned an invalid bot runtime conversation",
    );
  }

  return {
    conversationKey: row.conversationKey,
    tenantId: row.tenantId,
    status,
    assignedExternalUserId:
      row.assignedExternalUserId,
    version: row.version,
  };
}

export function createBotRuntimeRepository(
  database: D1DatabaseBinding,
): BotRuntimeRepository {
  const findConversationState: BotRuntimeRepository["findConversationState"] =
    async (tenantId, conversationKey) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertConversationKey(conversationKey);

      const row = await database
        .prepare(
          SELECT_BOT_RUNTIME_CONVERSATION_SQL,
        )
        .bind(tenantId, conversationKey)
        .first<BotRuntimeConversationRow>();

      return row
        ? parseConversationState(
            row,
            tenantId,
            conversationKey,
          )
        : null;
    };

  return {
    findConversationState,

    async findAcceptedButtonContinuation(
      tenantId,
      conversationKey,
      currentInboundMessageKey,
      replyToProviderMessageId = null,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertConversationKey(conversationKey);
      assertMessageKey(currentInboundMessageKey);
      assertProviderMessageId(
        replyToProviderMessageId,
      );

      const result = await database
        .prepare(
          SELECT_ACCEPTED_BUTTON_CONTINUATION_SQL,
        )
        .bind(
          tenantId,
          conversationKey,
          currentInboundMessageKey,
          replyToProviderMessageId,
        )
        .all<BotRuntimeContinuationEvidenceRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 bot continuation read failed",
        );
      }

      const rows = result.results ?? [];

      if (rows.length === 0) {
        return {
          outcome: "current-message-not-found",
        };
      }

      if (rows.length > 1) {
        return { outcome: "ambiguous" };
      }

      const row = rows[0];

      if (
        row.currentMessageKey !==
          currentInboundMessageKey
      ) {
        throw new Error(
          "D1 returned bot continuation for another message",
        );
      }

      if (
        row.botFlowVersionKey === null &&
        row.replyJson === null &&
        row.acceptedAt === null
      ) {
        return { outcome: "none" };
      }

      return {
        outcome: "found",
        evidence: parseContinuationEvidence(
          row,
          currentInboundMessageKey,
        ),
      };
    },

    async applyHandoff(
      tenantId,
      conversationKey,
      expectedVersion,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertConversationKey(conversationKey);
      assertPositiveInteger(
        expectedVersion,
        "expectedVersion",
      );

      const updatedRow = await database
        .prepare(APPLY_BOT_HANDOFF_SQL)
        .bind(
          tenantId,
          conversationKey,
          expectedVersion,
        )
        .first<BotRuntimeConversationRow>();

      if (updatedRow) {
        return {
          outcome: "updated",
          state: parseConversationState(
            updatedRow,
            tenantId,
            conversationKey,
          ),
        };
      }

      const current =
        await findConversationState(
          tenantId,
          conversationKey,
        );

      if (!current) {
        return { outcome: "not-found" };
      }

      if (
        current.status ===
          "waiting_for_agent" &&
        current.assignedExternalUserId ===
          null &&
        current.version === expectedVersion + 1
      ) {
        return {
          outcome: "unchanged",
          state: current,
        };
      }

      if (
        current.assignedExternalUserId !==
        null
      ) {
        return { outcome: "locked" };
      }

      if (
        current.version !== expectedVersion
      ) {
        return { outcome: "conflict" };
      }

      return { outcome: "invalid-state" };
    },
  };
}
