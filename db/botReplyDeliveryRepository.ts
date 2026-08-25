import {
  botReplyDeliveryStatuses,
  type BotReplyDeliveryStatus,
  type BotReplyPayload,
  type PersistedBotReplyDelivery,
} from "../shared/domain/botReplyDelivery.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";
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
const RESERVATION_KEY_PATTERN =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const WINDOW_REJECTION_EVENT_KEY_PATTERN =
  /^bot_reply_window_rejection_v1_[0-9a-f]{64}$/;
const SERVICE_WINDOW_DURATION_MILLISECONDS =
  24 * 60 * 60 * 1_000;

const DELIVERY_COLUMNS_SQL = `
  delivery_key AS deliveryKey,
  tenant_id AS tenantId,
  conversation_key AS conversationKey,
  inbound_message_key AS inboundMessageKey,
  bot_flow_key AS botFlowKey,
  bot_flow_version_key AS botFlowVersionKey,
  reply_index AS replyIndex,
  sender_phone_number_id AS senderPhoneNumberId,
  recipient_phone_e164 AS recipientPhoneNumber,
  reply_json AS replyJson,
  status,
  attempt_count AS attemptCount,
  claim_version AS claimVersion,
  next_attempt_at AS nextAttemptAt,
  deferred_at AS deferredAt,
  last_deferral_reason_code AS lastDeferralReasonCode,
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
    sender_phone_number_id,
    recipient_phone_e164,
    reply_json
  )
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
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
    attempt_count = 1,
    claim_version = claim_version + 1,
    next_attempt_at = NULL,
    deferred_at = NULL,
    last_deferral_reason_code = NULL,
    updated_at = ?3
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'pending'
    AND (
      next_attempt_at IS NULL
      OR next_attempt_at <= ?3
    )
  RETURNING
    ${DELIVERY_COLUMNS_SQL}
`;

const DEFER_DELIVERY_SQL = `
  UPDATE bot_reply_deliveries
  SET
    status = 'pending',
    attempt_count = 0,
    next_attempt_at = ?5,
    deferred_at = ?4,
    last_deferral_reason_code = ?6,
    updated_at = ?4
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'sending'
    AND claim_version = ?3
    AND ?5 > ?4
    AND ?5 < (
      SELECT strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        messages.occurred_at,
        '+24 hours'
      )
      FROM messages
      WHERE messages.tenant_id = ?1
        AND messages.message_key =
          bot_reply_deliveries.inbound_message_key
        AND messages.direction = 'inbound'
    )
  RETURNING
    ${DELIVERY_COLUMNS_SQL}
`;

const SELECT_DUE_DEFERRALS_SQL = `
  SELECT
    bot_reply_deliveries.delivery_key AS deliveryKey,
    bot_reply_deliveries.tenant_id AS tenantId,
    bot_reply_deliveries.sender_phone_number_id AS senderPhoneNumberId,
    bot_reply_deliveries.claim_version AS claimVersion,
    bot_reply_deliveries.next_attempt_at AS retryAt,
    messages.occurred_at AS serviceWindowOpenedAt,
    strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      messages.occurred_at,
      '+24 hours'
    ) AS serviceWindowExpiresAt
  FROM bot_reply_deliveries
  INNER JOIN messages
    ON messages.tenant_id = bot_reply_deliveries.tenant_id
    AND messages.message_key =
      bot_reply_deliveries.inbound_message_key
    AND messages.direction = 'inbound'
  WHERE bot_reply_deliveries.status = 'pending'
    AND bot_reply_deliveries.next_attempt_at IS NOT NULL
    AND bot_reply_deliveries.next_attempt_at <= ?1
  ORDER BY
    bot_reply_deliveries.next_attempt_at ASC,
    bot_reply_deliveries.delivery_key ASC
  LIMIT ?2
`;

const RECORD_ACCEPTANCE_SQL = `
  INSERT INTO bot_reply_delivery_provider_links (
    delivery_key,
    tenant_id,
    provider_message_id,
    reservation_key,
    provider_status,
    accepted_at,
    created_at,
    updated_at
  )
  SELECT
    delivery_key,
    tenant_id,
    ?4,
    ?5,
    'accepted',
    ?6,
    ?6,
    ?6
  FROM bot_reply_deliveries
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'sending'
    AND claim_version = ?3
  ON CONFLICT DO NOTHING
`;

const FIND_ACCEPTANCE_LINK_SQL = `
  SELECT
    provider_message_id AS providerMessageId,
    reservation_key AS reservationKey,
    accepted_at AS acceptedAt
  FROM bot_reply_delivery_provider_links
  WHERE tenant_id = ?1
    AND delivery_key = ?2
  LIMIT 1
`;

const MARK_FAILED_SQL = `
  UPDATE bot_reply_deliveries
  SET
    status = ?4,
    last_error_code = ?5,
    updated_at = ?6
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'sending'
    AND claim_version = ?3
  RETURNING
    ${DELIVERY_COLUMNS_SQL}
`;

const INSERT_SERVICE_WINDOW_REJECTION_SQL = `
  INSERT INTO bot_reply_service_window_rejection_events (
    event_key,
    delivery_key,
    tenant_id,
    claim_version,
    reservation_key,
    provider_error_code,
    reason_code,
    service_window_opened_at,
    service_window_expires_at,
    attempted_at,
    rejected_at,
    created_at
  ) VALUES (
    ?1, ?2, ?3, ?4, ?5, 131047,
    'META_SERVICE_WINDOW_CLOSED',
    ?6, ?7, ?8, ?9, ?9
  )
  ON CONFLICT DO NOTHING
`;

const FIND_SERVICE_WINDOW_REJECTION_SQL = `
  SELECT
    event_key AS eventKey,
    delivery_key AS deliveryKey,
    tenant_id AS tenantId,
    claim_version AS claimVersion,
    reservation_key AS reservationKey,
    provider_error_code AS providerErrorCode,
    reason_code AS reasonCode,
    service_window_opened_at AS serviceWindowOpenedAt,
    service_window_expires_at AS serviceWindowExpiresAt,
    attempted_at AS attemptedAt,
    rejected_at AS rejectedAt
  FROM bot_reply_service_window_rejection_events
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND claim_version = ?3
  LIMIT 1
`;

interface BotReplyDeliveryRow {
  deliveryKey: string;
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  botFlowKey: string;
  botFlowVersionKey: string;
  replyIndex: number;
  senderPhoneNumberId: string;
  recipientPhoneNumber: string;
  replyJson: string;
  status: string;
  attemptCount: number;
  claimVersion: number;
  nextAttemptAt: string | null;
  deferredAt: string | null;
  lastDeferralReasonCode: string | null;
  providerMessageId: string | null;
  lastErrorCode: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DueBotReplyDeliveryRow {
  deliveryKey: string;
  tenantId: number;
  senderPhoneNumberId: string;
  claimVersion: number;
  retryAt: string;
  serviceWindowOpenedAt: string;
  serviceWindowExpiresAt: string;
}

interface BotReplyAcceptanceLinkRow {
  providerMessageId: string;
  reservationKey: string;
  acceptedAt: string;
}

interface BotReplyServiceWindowRejectionRow {
  eventKey: string;
  deliveryKey: string;
  tenantId: number;
  claimVersion: number;
  reservationKey: string;
  providerErrorCode: number;
  reasonCode: string;
  serviceWindowOpenedAt: string;
  serviceWindowExpiresAt: string;
  attemptedAt: string;
  rejectedAt: string;
}

export interface StageBotReplyDeliveryInput {
  deliveryKey: string;
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  botFlowKey: string;
  botFlowVersionKey: string;
  replyIndex: number;
  senderPhoneNumberId: string;
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
      outcome: "deferred";
      retryAt: string;
      delivery: PersistedBotReplyDelivery;
    }
  | {
      outcome: "not-found";
    };

export type ClaimBotReplyProviderRequestResult = Readonly<{
  outcome: "created" | "duplicate";
  requestKey: string;
}>;

export interface BotReplyDeliveryRepository {
  stage(
    input: StageBotReplyDeliveryInput,
  ): Promise<StageBotReplyDeliveryResult>;
  claim(
    tenantId: number,
    deliveryKey: string,
    timestamp: string,
  ): Promise<ClaimBotReplyDeliveryResult>;
  defer(
    tenantId: number,
    deliveryKey: string,
    expectedClaimVersion: number,
    timestamp: string,
    retryAt: string,
    reasonCode: string,
  ): Promise<PersistedBotReplyDelivery>;
  deferProviderRejection?(
    input: Readonly<{
      tenantId: number;
      deliveryKey: string;
      expectedClaimVersion: number;
      attemptedAt: string;
      deferredAt: string;
      retryAt: string;
      reasonCode:
        | "META_PHONE_THROUGHPUT_LIMITED"
        | "META_PAIR_RATE_LIMITED";
      reservationKey: string;
      providerErrorCode: 130429 | 131056;
      cooldownScope: "sender" | "pair";
      retryAfterSeconds: number;
    }>,
  ): Promise<PersistedBotReplyDelivery>;
  rejectProviderServiceWindow?(
    input: Readonly<{
      tenantId: number;
      deliveryKey: string;
      expectedClaimVersion: number;
      reservationKey: string;
      providerErrorCode: 131047;
      reasonCode: "META_SERVICE_WINDOW_CLOSED";
      serviceWindowOpenedAt: string;
      serviceWindowExpiresAt: string;
      attemptedAt: string;
      rejectedAt: string;
    }>,
  ): Promise<PersistedBotReplyDelivery>;
  claimProviderRequest?(
    input: Readonly<{
      tenantId: number;
      deliveryKey: string;
      expectedClaimVersion: number;
      reservationKey: string;
      requestedAt: string;
    }>,
  ): Promise<ClaimBotReplyProviderRequestResult>;
  listDueDeferrals(
    timestamp: string,
    limit: number,
  ): Promise<readonly DueBotReplyDelivery[]>;
  markAccepted(
    tenantId: number,
    deliveryKey: string,
    expectedClaimVersion: number,
    providerMessageId: string,
    reservationKey: string,
    timestamp: string,
  ): Promise<PersistedBotReplyDelivery>;
  markRejected(
    tenantId: number,
    deliveryKey: string,
    expectedClaimVersion: number,
    errorCode: string,
    timestamp: string,
  ): Promise<PersistedBotReplyDelivery>;
  markAmbiguous(
    tenantId: number,
    deliveryKey: string,
    expectedClaimVersion: number,
    errorCode: string,
    timestamp: string,
  ): Promise<PersistedBotReplyDelivery>;
}

export interface DueBotReplyDelivery {
  deliveryKey: string;
  tenantId: number;
  senderPhoneNumberId: string;
  claimVersion: number;
  retryAt: string;
  serviceWindowOpenedAt: string;
  serviceWindowExpiresAt: string;
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

function assertSenderPhoneNumberId(
  value: string,
): void {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length < 1 ||
    value.length > 255 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error(
      "senderPhoneNumberId is invalid",
    );
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
  assertSenderPhoneNumberId(
    input.senderPhoneNumberId,
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
    (() => {
      try {
        assertSenderPhoneNumberId(
          row.senderPhoneNumberId,
        );
        return false;
      } catch {
        return true;
      }
    })() ||
    !/^\+[1-9][0-9]{0,14}$/.test(
      row.recipientPhoneNumber,
    ) ||
    !reply ||
    !status ||
    !Number.isSafeInteger(row.attemptCount) ||
    row.attemptCount < 0 ||
    !Number.isSafeInteger(row.claimVersion) ||
    row.claimVersion < 0 ||
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
    (row.nextAttemptAt !== null &&
      (!Number.isFinite(Date.parse(row.nextAttemptAt)) ||
        new Date(Date.parse(row.nextAttemptAt)).toISOString() !==
          row.nextAttemptAt)) ||
    (row.deferredAt !== null &&
      (!Number.isFinite(Date.parse(row.deferredAt)) ||
        new Date(Date.parse(row.deferredAt)).toISOString() !==
          row.deferredAt)) ||
    (row.lastDeferralReasonCode !== null &&
      !/^[A-Z0-9_]{1,100}$/.test(
        row.lastDeferralReasonCode,
      )) ||
    !Number.isFinite(Date.parse(row.createdAt)) ||
    !Number.isFinite(Date.parse(row.updatedAt))
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
      row.acceptedAt === null &&
      ((row.claimVersion === 0 &&
        row.nextAttemptAt === null &&
        row.deferredAt === null &&
        row.lastDeferralReasonCode === null) ||
        (row.claimVersion >= 1 &&
          row.nextAttemptAt !== null &&
          row.deferredAt !== null &&
          row.lastDeferralReasonCode !== null &&
          Date.parse(row.nextAttemptAt) >
            Date.parse(row.deferredAt)))) ||
    (status === "sending" &&
      row.attemptCount === 1 &&
      row.claimVersion >= 1 &&
      row.providerMessageId === null &&
      row.lastErrorCode === null &&
      row.acceptedAt === null &&
      row.nextAttemptAt === null &&
      row.deferredAt === null &&
      row.lastDeferralReasonCode === null) ||
    (status === "accepted" &&
      row.attemptCount >= 1 &&
      row.claimVersion >= 1 &&
      row.providerMessageId !== null &&
      row.lastErrorCode === null &&
      row.acceptedAt !== null &&
      row.nextAttemptAt === null &&
      row.deferredAt === null &&
      row.lastDeferralReasonCode === null) ||
    ((status === "rejected" ||
      status === "ambiguous") &&
      row.attemptCount >= 1 &&
      row.claimVersion >= 1 &&
      row.providerMessageId === null &&
      row.lastErrorCode !== null &&
      row.acceptedAt === null &&
      row.nextAttemptAt === null &&
      row.deferredAt === null &&
      row.lastDeferralReasonCode === null);

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
    senderPhoneNumberId:
      row.senderPhoneNumberId,
    recipientPhoneNumber:
      row.recipientPhoneNumber,
    attemptCount: row.attemptCount,
    claimVersion: row.claimVersion,
    nextAttemptAt: row.nextAttemptAt,
    deferredAt: row.deferredAt,
    lastDeferralReasonCode:
      row.lastDeferralReasonCode,
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
    delivery.senderPhoneNumberId ===
      input.senderPhoneNumberId &&
    delivery.recipientPhoneNumber ===
      input.recipientPhoneNumber &&
    JSON.stringify(delivery.reply) ===
      JSON.stringify(reply)
  );
}

function parseDueDelivery(
  row: DueBotReplyDeliveryRow,
): DueBotReplyDelivery {
  assertPositiveInteger(row.tenantId, "tenantId");
  assertPositiveInteger(
    row.claimVersion,
    "claimVersion",
  );
  assertSenderPhoneNumberId(
    row.senderPhoneNumberId,
  );
  assertTimestamp(row.retryAt);
  assertTimestamp(row.serviceWindowOpenedAt);
  assertTimestamp(row.serviceWindowExpiresAt);

  if (
    !DELIVERY_KEY_PATTERN.test(row.deliveryKey) ||
    Date.parse(row.retryAt) >=
      Date.parse(row.serviceWindowExpiresAt) ||
    Date.parse(row.serviceWindowExpiresAt) -
      Date.parse(row.serviceWindowOpenedAt) !==
      24 * 60 * 60 * 1_000
  ) {
    throw new Error(
      "D1 returned an invalid due bot reply delivery",
    );
  }

  return {
    deliveryKey: row.deliveryKey,
    tenantId: row.tenantId,
    senderPhoneNumberId:
      row.senderPhoneNumberId,
    claimVersion: row.claimVersion,
    retryAt: row.retryAt,
    serviceWindowOpenedAt:
      row.serviceWindowOpenedAt,
    serviceWindowExpiresAt:
      row.serviceWindowExpiresAt,
  };
}

type ProviderServiceWindowRejectionInput = Parameters<
  NonNullable<BotReplyDeliveryRepository["rejectProviderServiceWindow"]>
>[0];

type NormalizedProviderServiceWindowRejection =
  BotReplyServiceWindowRejectionRow;

const providerServiceWindowRejectionKeys = Object.freeze([
  "attemptedAt",
  "deliveryKey",
  "expectedClaimVersion",
  "providerErrorCode",
  "reasonCode",
  "rejectedAt",
  "reservationKey",
  "serviceWindowExpiresAt",
  "serviceWindowOpenedAt",
  "tenantId",
]);

async function normalizeProviderServiceWindowRejection(
  input: ProviderServiceWindowRejectionInput,
): Promise<Readonly<NormalizedProviderServiceWindowRejection>> {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, providerServiceWindowRejectionKeys)
  ) {
    throw new Error(
      "Bot reply service-window rejection input is invalid",
    );
  }

  assertPositiveInteger(input.tenantId, "tenantId");
  assertPositiveInteger(
    input.expectedClaimVersion,
    "expectedClaimVersion",
  );
  assertTimestamp(input.serviceWindowOpenedAt);
  assertTimestamp(input.serviceWindowExpiresAt);
  assertTimestamp(input.attemptedAt);
  assertTimestamp(input.rejectedAt);

  const openedAt = Date.parse(input.serviceWindowOpenedAt);
  const expiresAt = Date.parse(input.serviceWindowExpiresAt);
  const attemptedAt = Date.parse(input.attemptedAt);
  const rejectedAt = Date.parse(input.rejectedAt);

  if (
    !DELIVERY_KEY_PATTERN.test(input.deliveryKey) ||
    !RESERVATION_KEY_PATTERN.test(input.reservationKey) ||
    input.providerErrorCode !== 131047 ||
    input.reasonCode !== "META_SERVICE_WINDOW_CLOSED" ||
    expiresAt - openedAt !== SERVICE_WINDOW_DURATION_MILLISECONDS ||
    attemptedAt < openedAt ||
    attemptedAt >= expiresAt ||
    rejectedAt < attemptedAt
  ) {
    throw new Error(
      "Bot reply service-window rejection input is invalid",
    );
  }

  const digest = await sha256Hex(
    new TextEncoder().encode([
      "connect-bot-reply-window-rejection-v1",
      input.deliveryKey,
      String(input.tenantId),
      String(input.expectedClaimVersion),
      input.reservationKey,
      String(input.providerErrorCode),
      input.reasonCode,
      input.serviceWindowOpenedAt,
      input.serviceWindowExpiresAt,
      input.attemptedAt,
      input.rejectedAt,
    ].join("\0")),
  );

  return Object.freeze({
    eventKey: `bot_reply_window_rejection_v1_${digest}`,
    deliveryKey: input.deliveryKey,
    tenantId: input.tenantId,
    claimVersion: input.expectedClaimVersion,
    reservationKey: input.reservationKey,
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    serviceWindowOpenedAt: input.serviceWindowOpenedAt,
    serviceWindowExpiresAt: input.serviceWindowExpiresAt,
    attemptedAt: input.attemptedAt,
    rejectedAt: input.rejectedAt,
  });
}

function sameProviderServiceWindowRejection(
  row: BotReplyServiceWindowRejectionRow,
  expected: Readonly<NormalizedProviderServiceWindowRejection>,
): boolean {
  return WINDOW_REJECTION_EVENT_KEY_PATTERN.test(row.eventKey) &&
    row.eventKey === expected.eventKey &&
    row.deliveryKey === expected.deliveryKey &&
    row.tenantId === expected.tenantId &&
    row.claimVersion === expected.claimVersion &&
    row.reservationKey === expected.reservationKey &&
    row.providerErrorCode === 131047 &&
    row.reasonCode === "META_SERVICE_WINDOW_CLOSED" &&
    row.serviceWindowOpenedAt === expected.serviceWindowOpenedAt &&
    row.serviceWindowExpiresAt === expected.serviceWindowExpiresAt &&
    row.attemptedAt === expected.attemptedAt &&
    row.rejectedAt === expected.rejectedAt;
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
    expectedClaimVersion: number,
    status: Extract<
      BotReplyDeliveryStatus,
      "rejected" | "ambiguous"
    >,
    errorCode: string,
    timestamp: string,
  ): Promise<PersistedBotReplyDelivery> => {
    assertPositiveInteger(tenantId, "tenantId");
    assertPositiveInteger(
      expectedClaimVersion,
      "expectedClaimVersion",
    );
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
        expectedClaimVersion,
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
          input.senderPhoneNumberId,
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

      if (
        existing.status === "pending" &&
        existing.nextAttemptAt !== null &&
        Date.parse(existing.nextAttemptAt) >
          Date.parse(timestamp)
      ) {
        return {
          outcome: "deferred",
          retryAt: existing.nextAttemptAt,
          delivery: existing,
        };
      }

      return {
        outcome:
          existing.status === "sending"
            ? "uncertain"
            : "duplicate",
        delivery: existing,
      };
    },

    async defer(
      tenantId,
      deliveryKey,
      expectedClaimVersion,
      timestamp,
      retryAt,
      reasonCode,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(
        expectedClaimVersion,
        "expectedClaimVersion",
      );
      assertTimestamp(timestamp);
      assertTimestamp(retryAt);
      assertErrorCode(reasonCode);

      if (
        !DELIVERY_KEY_PATTERN.test(deliveryKey) ||
        Date.parse(retryAt) <= Date.parse(timestamp)
      ) {
        throw new Error(
          "bot reply delivery deferral is invalid",
        );
      }

      const row = await database
        .prepare(DEFER_DELIVERY_SQL)
        .bind(
          tenantId,
          deliveryKey,
          expectedClaimVersion,
          timestamp,
          retryAt,
          reasonCode,
        )
        .first<BotReplyDeliveryRow>();

      if (!row) {
        throw new Error(
          "D1 bot reply deferral transition failed",
        );
      }

      const delivery = parseDeliveryRow(row);

      if (
        delivery.status !== "pending" ||
        delivery.claimVersion !==
          expectedClaimVersion ||
        delivery.nextAttemptAt !== retryAt ||
        delivery.deferredAt !== timestamp ||
        delivery.lastDeferralReasonCode !==
          reasonCode
      ) {
        throw new Error(
          "D1 returned a mismatched bot reply deferral",
        );
      }

      return delivery;
    },

    async listDueDeferrals(timestamp, limit) {
      assertTimestamp(timestamp);

      if (
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        throw new Error("limit is invalid");
      }

      const result = await database
        .prepare(SELECT_DUE_DEFERRALS_SQL)
        .bind(timestamp, limit)
        .all<DueBotReplyDeliveryRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 due bot reply delivery read failed",
        );
      }

      return (result.results ?? []).map(
        parseDueDelivery,
      );
    },

    async markAccepted(
      tenantId,
      deliveryKey,
      expectedClaimVersion,
      providerMessageId,
      reservationKey,
      timestamp,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(
        expectedClaimVersion,
        "expectedClaimVersion",
      );
      assertProviderMessageId(
        providerMessageId,
      );
      if (!RESERVATION_KEY_PATTERN.test(reservationKey)) {
        throw new Error("reservationKey is invalid");
      }
      assertTimestamp(timestamp);

      if (!DELIVERY_KEY_PATTERN.test(deliveryKey)) {
        throw new Error("deliveryKey is invalid");
      }

      const result = await database
        .prepare(RECORD_ACCEPTANCE_SQL)
        .bind(
          tenantId,
          deliveryKey,
          expectedClaimVersion,
          providerMessageId,
          reservationKey,
          timestamp,
        )
        .run();

      if (!result.success) {
        throw new Error(
          result.error ?? "D1 bot reply acceptance transition failed",
        );
      }

      const [row, link] = await Promise.all([
        database
          .prepare(SELECT_DELIVERY_SQL)
          .bind(tenantId, deliveryKey)
          .first<BotReplyDeliveryRow>(),
        database
          .prepare(FIND_ACCEPTANCE_LINK_SQL)
          .bind(tenantId, deliveryKey)
          .first<BotReplyAcceptanceLinkRow>(),
      ]);

      if (!row || !link) {
        throw new Error(
          "D1 bot reply acceptance transition failed",
        );
      }

      if (
        link.providerMessageId !== providerMessageId ||
        link.reservationKey !== reservationKey ||
        link.acceptedAt !== timestamp
      ) {
        throw new Error("D1 bot reply acceptance identity conflicts");
      }

      const delivery = parseDeliveryRow(row);
      if (
        delivery.status !== "accepted" ||
        delivery.providerMessageId !== providerMessageId ||
        delivery.acceptedAt !== timestamp
      ) {
        throw new Error("D1 returned a mismatched bot reply acceptance");
      }
      return delivery;
    },

    async rejectProviderServiceWindow(input) {
      const provenance =
        await normalizeProviderServiceWindowRejection(input);
      const results = await database.batch([
        database
          .prepare(MARK_FAILED_SQL)
          .bind(
            provenance.tenantId,
            provenance.deliveryKey,
            provenance.claimVersion,
            "rejected",
            provenance.reasonCode,
            provenance.rejectedAt,
          ),
        database
          .prepare(INSERT_SERVICE_WINDOW_REJECTION_SQL)
          .bind(
            provenance.eventKey,
            provenance.deliveryKey,
            provenance.tenantId,
            provenance.claimVersion,
            provenance.reservationKey,
            provenance.serviceWindowOpenedAt,
            provenance.serviceWindowExpiresAt,
            provenance.attemptedAt,
            provenance.rejectedAt,
          ),
      ]);

      if (
        results.length !== 2 ||
        results.some((result) => result.success !== true)
      ) {
        throw new Error(
          "D1 Bot reply service-window rejection transition failed",
        );
      }

      const [row, event] = await Promise.all([
        database
          .prepare(SELECT_DELIVERY_SQL)
          .bind(provenance.tenantId, provenance.deliveryKey)
          .first<BotReplyDeliveryRow>(),
        database
          .prepare(FIND_SERVICE_WINDOW_REJECTION_SQL)
          .bind(
            provenance.tenantId,
            provenance.deliveryKey,
            provenance.claimVersion,
          )
          .first<BotReplyServiceWindowRejectionRow>(),
      ]);

      if (
        !row ||
        !event ||
        !sameProviderServiceWindowRejection(event, provenance)
      ) {
        throw new Error(
          "D1 Bot reply service-window rejection provenance conflicts",
        );
      }

      const delivery = parseDeliveryRow(row);
      if (
        delivery.status !== "rejected" ||
        delivery.claimVersion !== provenance.claimVersion ||
        delivery.lastErrorCode !== provenance.reasonCode ||
        delivery.updatedAt !== provenance.rejectedAt
      ) {
        throw new Error(
          "D1 returned a mismatched Bot reply service-window rejection",
        );
      }

      return delivery;
    },

    markRejected(
      tenantId,
      deliveryKey,
      expectedClaimVersion,
      errorCode,
      timestamp,
    ) {
      return markFailure(
        tenantId,
        deliveryKey,
        expectedClaimVersion,
        "rejected",
        errorCode,
        timestamp,
      );
    },

    markAmbiguous(
      tenantId,
      deliveryKey,
      expectedClaimVersion,
      errorCode,
      timestamp,
    ) {
      return markFailure(
        tenantId,
        deliveryKey,
        expectedClaimVersion,
        "ambiguous",
        errorCode,
        timestamp,
      );
    },
  };
}
