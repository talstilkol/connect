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

interface BotRuntimeConversationRow {
  conversationKey: string;
  tenantId: number;
  status: string;
  assignedExternalUserId: string | null;
  version: number;
}

export interface BotRuntimeConversationState {
  conversationKey: string;
  tenantId: number;
  status: ConversationStatus;
  assignedExternalUserId: string | null;
  version: number;
}

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
