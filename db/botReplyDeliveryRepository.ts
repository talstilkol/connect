import {
  botReplyDeliveryStatuses,
  type BotReplyDeliveryStatus,
  type BotReplyPayload,
  type PersistedBotReplyDelivery,
} from "../shared/domain/botReplyDelivery.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const DELIVERY_KEY_PATTERN =
  /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;
const MESSAGE_KEY_PATTERN =
  /^message_v1_[0-9a-f]{64}$/;
const BOT_FLOW_KEY_PATTERN =
  /^bot_flow_v1_[0-9a-f]{64}$/;
const BOT_FLOW_VERSION_KEY_PATTERN =
  /^bot_flow_version_v1_[0-9a-f]{64}$/;
const BOT_OPTION_KEY_PATTERN =
  /^bot_option_v1_[0-9a-f]{64}$/;

const DELIVERY_COLUMNS_SQL = `
  delivery_key AS deliveryKey,
  tenant_id AS tenantId,
  conversation_key AS conversationKey,
  inbound_message_key AS inboundMessageKey,
  bot_flow_key AS botFlowKey,
  bot_flow_version_key AS botFlowVersionKey,
  reply_index AS replyIndex,
  recipient_phone_e164 AS recipientPhoneNumber,
  reply_json AS replyJson,
  status,
  attempt_count AS attemptCount,
  provider_message_id AS providerMessageId,
  last_error_code AS lastErrorCode,
  accepted_at AS acceptedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const INSERT_DELIVERY_SQL = `
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
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
  ON CONFLICT (delivery_key) DO NOTHING
  RETURNING
    ${DELIVERY_COLUMNS_SQL}
`;

const SELECT_DELIVERY_SQL = `
  SELECT
    ${DELIVERY_COLUMNS_SQL}
  FROM bot_reply_deliveries
  WHERE tenant_id = ?1
    AND delivery_key = ?2
  LIMIT 1
`;

const CLAIM_DELIVERY_SQL = `
  UPDATE bot_reply_deliveries
  SET
    status = 'sending',
    attempt_count = attempt_count + 1,
    updated_at = ?3
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'pending'
  RETURNING
    ${DELIVERY_COLUMNS_SQL}
`;

const MARK_ACCEPTED_SQL = `
  UPDATE bot_reply_deliveries
  SET
    status = 'accepted',
    provider_message_id = ?3,
    accepted_at = ?4,
    updated_at = ?4
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'sending'
  RETURNING
    ${DELIVERY_COLUMNS_SQL}
`;

const MARK_FAILED_SQL = `
  UPDATE bot_reply_deliveries
  SET
    status = ?3,
    last_error_code = ?4,
    updated_at = ?5
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'sending'
  RETURNING
    ${DELIVERY_COLUMNS_SQL}
`;

interface BotReplyDeliveryRow {
  deliveryKey: string;
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  botFlowKey: string;
  botFlowVersionKey: string;
  replyIndex: number;
  recipientPhoneNumber: string;
  replyJson: string;
  status: string;
  attemptCount: number;
  providerMessageId: string | null;
  lastErrorCode: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StageBotReplyDeliveryInput {
  deliveryKey: string;
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  botFlowKey: string;
  botFlowVersionKey: string;
  replyIndex: number;
  recipientPhoneNumber: string;
  reply: BotReplyPayload;
}

export type StageBotReplyDeliveryResult = {
  outcome: "created" | "duplicate";
  delivery: PersistedBotReplyDelivery;
};

export type ClaimBotReplyDeliveryResult =
  | {
      outcome: "claimed";
      delivery: PersistedBotReplyDelivery;
    }
  | {
      outcome: "duplicate" | "uncertain";
      delivery: PersistedBotReplyDelivery;
    }
  | {
      outcome: "not-found";
    };

export interface BotReplyDeliveryRepository {
  stage(
    input: StageBotReplyDeliveryInput,
  ): Promise<StageBotReplyDeliveryResult>;
  claim(
    tenantId: number,
    deliveryKey: string,
    timestamp: string,
  ): Promise<ClaimBotReplyDeliveryResult>;
  markAccepted(
    tenantId: number,
    deliveryKey: string,
    providerMessageId: string,
    timestamp: string,
  ): Promise<PersistedBotReplyDelivery>;
  markRejected(
    tenantId: number,
    deliveryKey: string,
    errorCode: string,
    timestamp: string,
  ): Promise<PersistedBotReplyDelivery>;
  markAmbiguous(
    tenantId: number,
    deliveryKey: string,
    errorCode: string,
    timestamp: string,
  ): Promise<PersistedBotReplyDelivery>;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  input: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const inputKeys = Object.keys(input);

  return (
    inputKeys.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(input, key),
    )
  );
}

function parseReply(
  value: unknown,
): BotReplyPayload | null {
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
    return {
      kind: "text",
      text: value.text,
    };
  }

  if (
    value.kind !== "buttons" ||
    !hasExactKeys(value, [
      "kind",
      "text",
      "options",
    ]) ||
    typeof value.text !== "string" ||
    value.text.trim().length === 0 ||
    value.text.length > 4_096 ||
    !Array.isArray(value.options) ||
    value.options.length === 0 ||
    value.options.length > 10
  ) {
    return null;
  }

  const options: {
    optionKey: string;
    label: string;
  }[] = [];

  for (const option of value.options) {
    if (
      !isRecord(option) ||
      !hasExactKeys(option, [
        "optionKey",
        "label",
      ]) ||
      typeof option.optionKey !== "string" ||
      !BOT_OPTION_KEY_PATTERN.test(
        option.optionKey,
      ) ||
      typeof option.label !== "string" ||
      option.label.trim().length === 0 ||
      option.label.length > 80
    ) {
      return null;
    }

    options.push({
      optionKey: option.optionKey,
      label: option.label,
    });
  }

  return {
    kind: "buttons",
    text: value.text,
    options,
  };
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

function assertTimestamp(
  value: string,
): void {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(Date.parse(value)).toISOString() !==
      value
  ) {
    throw new Error("timestamp is invalid");
  }
}

function assertErrorCode(value: string): void {
  if (!/^[A-Z0-9_]{1,100}$/.test(value)) {
    throw new Error("errorCode is invalid");
  }
}

function assertProviderMessageId(
  value: string,
): void {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0 ||
    value.length > 255
  ) {
    throw new Error(
      "providerMessageId is invalid",
    );
  }
}

function assertStageInput(
  input: StageBotReplyDeliveryInput,
): BotReplyPayload {
  assertPositiveInteger(input.tenantId, "tenantId");
  assertPositiveInteger(
    input.replyIndex,
    "replyIndex",
  );
  const reply = parseReply(input.reply);

  if (
    !DELIVERY_KEY_PATTERN.test(
      input.deliveryKey,
    ) ||
    !CONVERSATION_KEY_PATTERN.test(
      input.conversationKey,
    ) ||
    !MESSAGE_KEY_PATTERN.test(
      input.inboundMessageKey,
    ) ||
    !BOT_FLOW_KEY_PATTERN.test(
      input.botFlowKey,
    ) ||
    !BOT_FLOW_VERSION_KEY_PATTERN.test(
      input.botFlowVersionKey,
    ) ||
    !/^\+[1-9][0-9]{0,14}$/.test(
      input.recipientPhoneNumber,
    ) ||
    !reply
  ) {
    throw new Error(
      "bot reply delivery input is invalid",
    );
  }

  return reply;
}

function parseDeliveryRow(
  row: BotReplyDeliveryRow,
): PersistedBotReplyDelivery {
  const status =
    botReplyDeliveryStatuses.find(
      (candidate) =>
        candidate === row.status,
    );
  let replyValue: unknown;

  try {
    replyValue = JSON.parse(row.replyJson);
  } catch {
    throw new Error(
      "D1 returned invalid bot reply JSON",
    );
  }

  const reply = parseReply(replyValue);

  if (
    !DELIVERY_KEY_PATTERN.test(row.deliveryKey) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !CONVERSATION_KEY_PATTERN.test(
      row.conversationKey,
    ) ||
    !MESSAGE_KEY_PATTERN.test(
      row.inboundMessageKey,
    ) ||
    !BOT_FLOW_KEY_PATTERN.test(
      row.botFlowKey,
    ) ||
    !BOT_FLOW_VERSION_KEY_PATTERN.test(
      row.botFlowVersionKey,
    ) ||
    !Number.isSafeInteger(row.replyIndex) ||
    row.replyIndex <= 0 ||
    !/^\+[1-9][0-9]{0,14}$/.test(
      row.recipientPhoneNumber,
    ) ||
    !reply ||
    !status ||
    !Number.isSafeInteger(row.attemptCount) ||
    row.attemptCount < 0 ||
    (row.providerMessageId !== null &&
      (row.providerMessageId.trim() !==
        row.providerMessageId ||
        row.providerMessageId.length === 0 ||
        row.providerMessageId.length > 255)) ||
    (row.lastErrorCode !== null &&
      !/^[A-Z0-9_]{1,100}$/.test(
        row.lastErrorCode,
      )) ||
    (row.acceptedAt !== null &&
      !Number.isFinite(
        Date.parse(row.acceptedAt),
      )) ||
    typeof row.createdAt !== "string" ||
    row.createdAt.length === 0 ||
    typeof row.updatedAt !== "string" ||
    row.updatedAt.length === 0
  ) {
    throw new Error(
      "D1 returned an invalid bot reply delivery",
    );
  }

  const stateIsConsistent =
    (status === "pending" &&
      row.attemptCount === 0 &&
      row.providerMessageId === null &&
      row.lastErrorCode === null &&
      row.acceptedAt === null) ||
    (status === "sending" &&
      row.attemptCount >= 1 &&
      row.providerMessageId === null &&
      row.lastErrorCode === null &&
      row.acceptedAt === null) ||
    (status === "accepted" &&
      row.attemptCount >= 1 &&
      row.providerMessageId !== null &&
      row.lastErrorCode === null &&
      row.acceptedAt !== null) ||
    ((status === "rejected" ||
      status === "ambiguous") &&
      row.attemptCount >= 1 &&
      row.providerMessageId === null &&
      row.lastErrorCode !== null &&
      row.acceptedAt === null);

  if (!stateIsConsistent) {
    throw new Error(
      "D1 returned inconsistent bot reply delivery state",
    );
  }

  return {
    deliveryKey: row.deliveryKey,
    tenantId: row.tenantId,
    conversationKey: row.conversationKey,
    inboundMessageKey:
      row.inboundMessageKey,
    botFlowKey: row.botFlowKey,
    botFlowVersionKey:
      row.botFlowVersionKey,
    replyIndex: row.replyIndex,
    recipientPhoneNumber:
      row.recipientPhoneNumber,
    attemptCount: row.attemptCount,
    providerMessageId:
      row.providerMessageId,
    lastErrorCode: row.lastErrorCode,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    status:
      status as BotReplyDeliveryStatus,
    reply,
  };
}

function isSameIdentity(
  delivery: PersistedBotReplyDelivery,
  input: StageBotReplyDeliveryInput,
  reply: BotReplyPayload,
): boolean {
  return (
    delivery.deliveryKey ===
      input.deliveryKey &&
    delivery.tenantId === input.tenantId &&
    delivery.conversationKey ===
      input.conversationKey &&
    delivery.inboundMessageKey ===
      input.inboundMessageKey &&
    delivery.botFlowKey ===
      input.botFlowKey &&
    delivery.botFlowVersionKey ===
      input.botFlowVersionKey &&
    delivery.replyIndex ===
      input.replyIndex &&
    delivery.recipientPhoneNumber ===
      input.recipientPhoneNumber &&
    JSON.stringify(delivery.reply) ===
      JSON.stringify(reply)
  );
}

export class BotReplyDeliveryIdentityConflictError
  extends Error {
  readonly code = "IDENTITY_CONFLICT";

  constructor() {
    super(
      "Bot reply delivery identity conflicts with stored data",
    );
    this.name =
      "BotReplyDeliveryIdentityConflictError";
  }
}

export function createBotReplyDeliveryRepository(
  database: D1DatabaseBinding,
): BotReplyDeliveryRepository {
  const findByKey = async (
    tenantId: number,
    deliveryKey: string,
  ): Promise<PersistedBotReplyDelivery | null> => {
    const row = await database
      .prepare(SELECT_DELIVERY_SQL)
      .bind(tenantId, deliveryKey)
      .first<BotReplyDeliveryRow>();

    return row ? parseDeliveryRow(row) : null;
  };

  const markFailure = async (
    tenantId: number,
    deliveryKey: string,
    status: Extract<
      BotReplyDeliveryStatus,
      "rejected" | "ambiguous"
    >,
    errorCode: string,
    timestamp: string,
  ): Promise<PersistedBotReplyDelivery> => {
    assertPositiveInteger(tenantId, "tenantId");
    assertTimestamp(timestamp);
    assertErrorCode(errorCode);

    if (!DELIVERY_KEY_PATTERN.test(deliveryKey)) {
      throw new Error("deliveryKey is invalid");
    }

    const row = await database
      .prepare(MARK_FAILED_SQL)
      .bind(
        tenantId,
        deliveryKey,
        status,
        errorCode,
        timestamp,
      )
      .first<BotReplyDeliveryRow>();

    if (!row) {
      throw new Error(
        "D1 bot reply failure transition failed",
      );
    }

    return parseDeliveryRow(row);
  };

  return {
    async stage(input) {
      const reply = assertStageInput(input);
      const replyJson = JSON.stringify(reply);
      const row = await database
        .prepare(INSERT_DELIVERY_SQL)
        .bind(
          input.deliveryKey,
          input.tenantId,
          input.conversationKey,
          input.inboundMessageKey,
          input.botFlowKey,
          input.botFlowVersionKey,
          input.replyIndex,
          input.recipientPhoneNumber,
          replyJson,
        )
        .first<BotReplyDeliveryRow>();

      if (row) {
        return {
          outcome: "created",
          delivery: parseDeliveryRow(row),
        };
      }

      const existing = await findByKey(
        input.tenantId,
        input.deliveryKey,
      );

      if (
        !existing ||
        !isSameIdentity(
          existing,
          input,
          reply,
        )
      ) {
        throw new BotReplyDeliveryIdentityConflictError();
      }

      return {
        outcome: "duplicate",
        delivery: existing,
      };
    },

    async claim(
      tenantId,
      deliveryKey,
      timestamp,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertTimestamp(timestamp);

      if (!DELIVERY_KEY_PATTERN.test(deliveryKey)) {
        throw new Error("deliveryKey is invalid");
      }

      const row = await database
        .prepare(CLAIM_DELIVERY_SQL)
        .bind(
          tenantId,
          deliveryKey,
          timestamp,
        )
        .first<BotReplyDeliveryRow>();

      if (row) {
        return {
          outcome: "claimed",
          delivery: parseDeliveryRow(row),
        };
      }

      const existing = await findByKey(
        tenantId,
        deliveryKey,
      );

      if (!existing) {
        return { outcome: "not-found" };
      }

      return {
        outcome:
          existing.status === "sending"
            ? "uncertain"
            : "duplicate",
        delivery: existing,
      };
    },

    async markAccepted(
      tenantId,
      deliveryKey,
      providerMessageId,
      timestamp,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertProviderMessageId(
        providerMessageId,
      );
      assertTimestamp(timestamp);

      if (!DELIVERY_KEY_PATTERN.test(deliveryKey)) {
        throw new Error("deliveryKey is invalid");
      }

      const row = await database
        .prepare(MARK_ACCEPTED_SQL)
        .bind(
          tenantId,
          deliveryKey,
          providerMessageId,
          timestamp,
        )
        .first<BotReplyDeliveryRow>();

      if (!row) {
        throw new Error(
          "D1 bot reply acceptance transition failed",
        );
      }

      return parseDeliveryRow(row);
    },

    markRejected(
      tenantId,
      deliveryKey,
      errorCode,
      timestamp,
    ) {
      return markFailure(
        tenantId,
        deliveryKey,
        "rejected",
        errorCode,
        timestamp,
      );
    },

    markAmbiguous(
      tenantId,
      deliveryKey,
      errorCode,
      timestamp,
    ) {
      return markFailure(
        tenantId,
        deliveryKey,
        "ambiguous",
        errorCode,
        timestamp,
      );
    },
  };
}
