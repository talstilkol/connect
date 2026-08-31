import {
  createHash,
} from "node:crypto";

import {
  BotReplyDeliveryIdentityConflictError,
  type BotReplyDeliveryRepository,
  type ClaimBotReplyDeliveryResult,
  type DueBotReplyDelivery,
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
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const providerDeferralEventKeyPattern =
  /^bot_reply_provider_deferral_v1_[0-9a-f]{64}$/;
const providerServiceWindowRejectionEventKeyPattern =
  /^bot_reply_window_rejection_v1_[0-9a-f]{64}$/;
const providerRequestKeyPattern =
  /^bot_reply_provider_request_v1_[0-9a-f]{64}$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

const deliveryRowKeys = Object.freeze([
  "acceptedAt",
  "attemptCount",
  "botFlowKey",
  "botFlowVersionKey",
  "claimVersion",
  "conversationKey",
  "createdAt",
  "deliveryKey",
  "inboundMessageKey",
  "lastErrorCode",
  "lastDeferralReasonCode",
  "nextAttemptAt",
  "providerMessageId",
  "recipientPhoneNumber",
  "replyIndex",
  "replyJson",
  "senderPhoneNumberId",
  "status",
  "tenantId",
  "deferredAt",
  "updatedAt",
]);

const dueDeliveryRowKeys = Object.freeze([
  "claimVersion",
  "deliveryKey",
  "retryAt",
  "senderPhoneNumberId",
  "serviceWindowExpiresAt",
  "serviceWindowOpenedAt",
  "tenantId",
]);
const acceptanceLinkRowKeys = Object.freeze([
  "acceptedAt",
  "providerMessageId",
  "reservationKey",
]);
const providerDeferralRowKeys = Object.freeze([
  "attemptedAt",
  "claimVersion",
  "cooldownScope",
  "deferredAt",
  "deliveryKey",
  "eventKey",
  "providerErrorCode",
  "reasonCode",
  "reservationKey",
  "retryAfterSeconds",
  "retryAt",
  "tenantId",
]);
const providerServiceWindowRejectionRowKeys = Object.freeze([
  "attemptedAt",
  "claimVersion",
  "deliveryKey",
  "eventKey",
  "providerErrorCode",
  "reasonCode",
  "rejectedAt",
  "reservationKey",
  "serviceWindowExpiresAt",
  "serviceWindowOpenedAt",
  "tenantId",
]);
const providerRequestRowKeys = Object.freeze([
  "claimVersion",
  "deliveryKey",
  "requestKey",
  "requestedAt",
  "reservationKey",
  "tenantId",
]);

export const postgresBotReplyProviderDeferralVersion =
  "connect-postgres-bot-reply-provider-deferral-v1" as const;
export const postgresBotReplyServiceWindowRejectionVersion =
  "connect-postgres-bot-reply-window-rejection-v1" as const;
export const postgresBotReplyProviderRequestVersion =
  "connect-postgres-bot-reply-provider-request-v1" as const;

const deliveryColumns = `
  bot_reply_deliveries.delivery_key AS "deliveryKey",
  bot_reply_deliveries.tenant_id AS "tenantId",
  bot_reply_deliveries.conversation_key AS "conversationKey",
  bot_reply_deliveries.inbound_message_key AS "inboundMessageKey",
  bot_reply_deliveries.bot_flow_key AS "botFlowKey",
  bot_reply_deliveries.bot_flow_version_key AS "botFlowVersionKey",
  bot_reply_deliveries.reply_index AS "replyIndex",
  bot_reply_deliveries.sender_phone_number_id AS "senderPhoneNumberId",
  bot_reply_deliveries.recipient_phone_e164 AS "recipientPhoneNumber",
  bot_reply_deliveries.reply_json AS "replyJson",
  bot_reply_deliveries.status,
  bot_reply_deliveries.attempt_count AS "attemptCount",
  bot_reply_deliveries.claim_version AS "claimVersion",
  bot_reply_deliveries.next_attempt_at AS "nextAttemptAt",
  bot_reply_deliveries.deferred_at AS "deferredAt",
  bot_reply_deliveries.last_deferral_reason_code AS "lastDeferralReasonCode",
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
      sender_phone_number_id,
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
      $9,
      $10::jsonb
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
      attempt_count = 1,
      claim_version = claim_version + 1,
      next_attempt_at = NULL,
      deferred_at = NULL,
      last_deferral_reason_code = NULL,
      updated_at = $3::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'pending'
      AND (
        next_attempt_at IS NULL
        OR next_attempt_at <= $3::timestamptz
      )
    RETURNING ${deliveryColumns}
  `,
  defer: `
    UPDATE bot_reply_deliveries
    SET
      status = 'pending',
      attempt_count = 0,
      next_attempt_at = $5::timestamptz,
      deferred_at = $4::timestamptz,
      last_deferral_reason_code = $6,
      updated_at = $4::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'sending'
      AND claim_version = $3
      AND $5::timestamptz > $4::timestamptz
      AND $5::timestamptz < (
        SELECT messages.occurred_at + INTERVAL '24 hours'
        FROM messages
        WHERE messages.tenant_id = $1
          AND messages.message_key =
            bot_reply_deliveries.inbound_message_key
          AND messages.direction = 'inbound'
      )
    RETURNING ${deliveryColumns}
  `,
  insertProviderDeferral: `
    INSERT INTO bot_reply_provider_deferral_events (
      event_key,
      delivery_key,
      tenant_id,
      claim_version,
      reservation_key,
      provider_error_code,
      cooldown_scope,
      retry_after_seconds,
      reason_code,
      attempted_at,
      deferred_at,
      retry_at,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10::timestamptz, $11::timestamptz,
      $12::timestamptz, $11::timestamptz
    )
    ON CONFLICT DO NOTHING
    RETURNING event_key AS "eventKey"
  `,
  findProviderDeferralForUpdate: `
    SELECT
      event_key AS "eventKey",
      delivery_key AS "deliveryKey",
      tenant_id AS "tenantId",
      claim_version AS "claimVersion",
      reservation_key AS "reservationKey",
      provider_error_code AS "providerErrorCode",
      cooldown_scope AS "cooldownScope",
      retry_after_seconds AS "retryAfterSeconds",
      reason_code AS "reasonCode",
      attempted_at AS "attemptedAt",
      deferred_at AS "deferredAt",
      retry_at AS "retryAt"
    FROM bot_reply_provider_deferral_events
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND claim_version = $3
    LIMIT 1
    FOR UPDATE
  `,
  insertProviderServiceWindowRejection: `
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
      $1, $2, $3, $4, $5, 131047,
      'META_SERVICE_WINDOW_CLOSED',
      $6::timestamptz, $7::timestamptz,
      $8::timestamptz, $9::timestamptz,
      $9::timestamptz
    )
    ON CONFLICT DO NOTHING
    RETURNING event_key AS "eventKey"
  `,
  findProviderServiceWindowRejectionForUpdate: `
    SELECT
      event_key AS "eventKey",
      delivery_key AS "deliveryKey",
      tenant_id AS "tenantId",
      claim_version AS "claimVersion",
      reservation_key AS "reservationKey",
      provider_error_code AS "providerErrorCode",
      reason_code AS "reasonCode",
      service_window_opened_at AS "serviceWindowOpenedAt",
      service_window_expires_at AS "serviceWindowExpiresAt",
      attempted_at AS "attemptedAt",
      rejected_at AS "rejectedAt"
    FROM bot_reply_service_window_rejection_events
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND claim_version = $3
    LIMIT 1
    FOR UPDATE
  `,
  insertProviderRequest: `
    INSERT INTO bot_reply_provider_request_claims (
      request_key,
      delivery_key,
      tenant_id,
      claim_version,
      reservation_key,
      requested_at,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6::timestamptz, $6::timestamptz
    )
    ON CONFLICT DO NOTHING
    RETURNING request_key AS "requestKey"
  `,
  findProviderRequestForUpdate: `
    SELECT
      request_key AS "requestKey",
      delivery_key AS "deliveryKey",
      tenant_id AS "tenantId",
      claim_version AS "claimVersion",
      reservation_key AS "reservationKey",
      requested_at AS "requestedAt"
    FROM bot_reply_provider_request_claims
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND claim_version = $3
    LIMIT 1
    FOR UPDATE
  `,
  listDueDeferrals: `
    SELECT
      bot_reply_deliveries.delivery_key AS "deliveryKey",
      bot_reply_deliveries.tenant_id AS "tenantId",
      bot_reply_deliveries.sender_phone_number_id AS "senderPhoneNumberId",
      bot_reply_deliveries.claim_version AS "claimVersion",
      bot_reply_deliveries.next_attempt_at AS "retryAt",
      messages.occurred_at AS "serviceWindowOpenedAt",
      messages.occurred_at + INTERVAL '24 hours'
        AS "serviceWindowExpiresAt"
    FROM bot_reply_deliveries
    INNER JOIN messages
      ON messages.tenant_id = bot_reply_deliveries.tenant_id
      AND messages.message_key =
        bot_reply_deliveries.inbound_message_key
      AND messages.direction = 'inbound'
    WHERE bot_reply_deliveries.status = 'pending'
      AND bot_reply_deliveries.next_attempt_at IS NOT NULL
      AND bot_reply_deliveries.next_attempt_at <= $1::timestamptz
    ORDER BY
      bot_reply_deliveries.next_attempt_at ASC,
      bot_reply_deliveries.delivery_key ASC
    LIMIT $2
  `,
  recordAcceptance: `
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
      $4,
      $5,
      'accepted',
      $6::timestamptz,
      $6::timestamptz,
      $6::timestamptz
    FROM bot_reply_deliveries
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'sending'
      AND claim_version = $3
    ON CONFLICT DO NOTHING
    RETURNING delivery_key AS "deliveryKey"
  `,
  findAcceptanceByDeliveryForUpdate: `
    SELECT
      provider_message_id AS "providerMessageId",
      reservation_key AS "reservationKey",
      accepted_at AS "acceptedAt"
    FROM bot_reply_delivery_provider_links
    WHERE tenant_id = $1
      AND delivery_key = $2
    LIMIT 1
    FOR UPDATE
  `,
  markFailure: `
    UPDATE bot_reply_deliveries
    SET
      status = $4,
      last_error_code = $5,
      updated_at = $6::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'sending'
      AND claim_version = $3
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

function requireSenderPhoneNumberId(
  value: unknown,
): string {
  try {
    return requireProviderMessageId(value);
  } catch {
    throw new Error(
      "senderPhoneNumberId is invalid",
    );
  }
}

function requireErrorCode(value: unknown): string {
  return requirePattern(value, /^[A-Z0-9_]{1,100}$/, "errorCode");
}

type ProviderDeferralInput = Parameters<
  NonNullable<BotReplyDeliveryRepository["deferProviderRejection"]>
>[0];

interface ProviderDeferralRow {
  readonly eventKey: string;
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly claimVersion: number;
  readonly reservationKey: string;
  readonly providerErrorCode: 130429 | 131056;
  readonly cooldownScope: "sender" | "pair";
  readonly retryAfterSeconds: number;
  readonly reasonCode:
    | "META_PHONE_THROUGHPUT_LIMITED"
    | "META_PAIR_RATE_LIMITED";
  readonly attemptedAt: string;
  readonly deferredAt: string;
  readonly retryAt: string;
}

const providerDeferralInputKeys = Object.freeze([
  "attemptedAt",
  "cooldownScope",
  "deferredAt",
  "deliveryKey",
  "expectedClaimVersion",
  "providerErrorCode",
  "reasonCode",
  "reservationKey",
  "retryAfterSeconds",
  "retryAt",
  "tenantId",
]);

function normalizeProviderDeferral(
  input: ProviderDeferralInput,
): Readonly<ProviderDeferralRow> {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, providerDeferralInputKeys)
  ) {
    throw new Error("Bot reply provider deferral input is invalid");
  }

  const tenantId = requirePositiveInteger(input.tenantId, "tenantId");
  const claimVersion = requirePositiveInteger(
    input.expectedClaimVersion,
    "expectedClaimVersion",
  );
  const deliveryKey = requirePattern(
    input.deliveryKey,
    deliveryKeyPattern,
    "deliveryKey",
  );
  const reservationKey = requirePattern(
    input.reservationKey,
    reservationKeyPattern,
    "reservationKey",
  );
  const attemptedAt = requireTimestamp(input.attemptedAt);
  const deferredAt = requireTimestamp(input.deferredAt);
  const retryAt = requireTimestamp(input.retryAt);
  const retryAfterSeconds = requirePositiveInteger(
    input.retryAfterSeconds,
    "retryAfterSeconds",
  );
  const pairIsExact =
    input.providerErrorCode === 131056 &&
    input.cooldownScope === "pair" &&
    input.reasonCode === "META_PAIR_RATE_LIMITED";
  const senderIsExact =
    input.providerErrorCode === 130429 &&
    input.cooldownScope === "sender" &&
    input.reasonCode === "META_PHONE_THROUGHPUT_LIMITED";
  const attemptedMilliseconds = Date.parse(attemptedAt);
  const deferredMilliseconds = Date.parse(deferredAt);
  const retryMilliseconds = Date.parse(retryAt);

  if (
    (!pairIsExact && !senderIsExact) ||
    retryAfterSeconds > 86_400 ||
    deferredMilliseconds < attemptedMilliseconds ||
    retryMilliseconds <= deferredMilliseconds ||
    retryMilliseconds - attemptedMilliseconds !==
      retryAfterSeconds * 1_000
  ) {
    throw new Error("Bot reply provider deferral input is invalid");
  }

  const identity = Object.freeze({
    deliveryKey,
    tenantId,
    claimVersion,
    reservationKey,
    providerErrorCode: input.providerErrorCode,
    cooldownScope: input.cooldownScope,
    retryAfterSeconds,
    reasonCode: input.reasonCode,
    attemptedAt,
    deferredAt,
    retryAt,
  });
  const digest = createHash("sha256")
    .update(postgresBotReplyProviderDeferralVersion)
    .update("\0")
    .update(JSON.stringify(identity))
    .digest("hex");

  return Object.freeze({
    eventKey: `bot_reply_provider_deferral_v1_${digest}`,
    ...identity,
  });
}

function parseProviderDeferralRow(
  value: unknown,
): Readonly<ProviderDeferralRow> {
  const row = requireExactPostgresRow(
    value,
    providerDeferralRowKeys,
  );
  const providerErrorCode =
    parsePostgresPositiveInteger(row.providerErrorCode);
  const cooldownScope = row.cooldownScope;
  const reasonCode = row.reasonCode;

  if (
    !(
      providerErrorCode === 130429 &&
      cooldownScope === "sender" &&
      reasonCode === "META_PHONE_THROUGHPUT_LIMITED"
    ) &&
    !(
      providerErrorCode === 131056 &&
      cooldownScope === "pair" &&
      reasonCode === "META_PAIR_RATE_LIMITED"
    )
  ) {
    throw new Error(
      "PostgreSQL returned invalid Bot reply provider provenance",
    );
  }

  return Object.freeze({
    eventKey: requirePattern(
      row.eventKey,
      providerDeferralEventKeyPattern,
      "eventKey",
    ),
    deliveryKey: requirePattern(
      row.deliveryKey,
      deliveryKeyPattern,
      "deliveryKey",
    ),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    claimVersion: parsePostgresPositiveInteger(row.claimVersion),
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
    providerErrorCode,
    cooldownScope,
    retryAfterSeconds:
      parsePostgresPositiveInteger(row.retryAfterSeconds),
    reasonCode,
    attemptedAt: parsePostgresTimestamp(row.attemptedAt),
    deferredAt: parsePostgresTimestamp(row.deferredAt),
    retryAt: parsePostgresTimestamp(row.retryAt),
  });
}

function sameProviderDeferral(
  left: Readonly<ProviderDeferralRow>,
  right: Readonly<ProviderDeferralRow>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

type ProviderServiceWindowRejectionInput = Parameters<
  NonNullable<BotReplyDeliveryRepository["rejectProviderServiceWindow"]>
>[0];

interface ProviderServiceWindowRejectionRow {
  readonly eventKey: string;
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly claimVersion: number;
  readonly reservationKey: string;
  readonly providerErrorCode: 131047;
  readonly reasonCode: "META_SERVICE_WINDOW_CLOSED";
  readonly serviceWindowOpenedAt: string;
  readonly serviceWindowExpiresAt: string;
  readonly attemptedAt: string;
  readonly rejectedAt: string;
}

const providerServiceWindowRejectionInputKeys = Object.freeze([
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

function normalizeProviderServiceWindowRejection(
  input: ProviderServiceWindowRejectionInput,
): Readonly<ProviderServiceWindowRejectionRow> {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, providerServiceWindowRejectionInputKeys)
  ) {
    throw new Error(
      "Bot reply service-window rejection input is invalid",
    );
  }

  const tenantId = requirePositiveInteger(input.tenantId, "tenantId");
  const claimVersion = requirePositiveInteger(
    input.expectedClaimVersion,
    "expectedClaimVersion",
  );
  const deliveryKey = requirePattern(
    input.deliveryKey,
    deliveryKeyPattern,
    "deliveryKey",
  );
  const reservationKey = requirePattern(
    input.reservationKey,
    reservationKeyPattern,
    "reservationKey",
  );
  const serviceWindowOpenedAt = requireTimestamp(
    input.serviceWindowOpenedAt,
  );
  const serviceWindowExpiresAt = requireTimestamp(
    input.serviceWindowExpiresAt,
  );
  const attemptedAt = requireTimestamp(input.attemptedAt);
  const rejectedAt = requireTimestamp(input.rejectedAt);
  const openedMilliseconds = Date.parse(serviceWindowOpenedAt);
  const expiresMilliseconds = Date.parse(serviceWindowExpiresAt);
  const attemptedMilliseconds = Date.parse(attemptedAt);
  const rejectedMilliseconds = Date.parse(rejectedAt);

  if (
    input.providerErrorCode !== 131047 ||
    input.reasonCode !== "META_SERVICE_WINDOW_CLOSED" ||
    expiresMilliseconds - openedMilliseconds !== 24 * 60 * 60 * 1_000 ||
    attemptedMilliseconds < openedMilliseconds ||
    attemptedMilliseconds >= expiresMilliseconds ||
    rejectedMilliseconds < attemptedMilliseconds
  ) {
    throw new Error(
      "Bot reply service-window rejection input is invalid",
    );
  }

  const identity = Object.freeze({
    deliveryKey,
    tenantId,
    claimVersion,
    reservationKey,
    providerErrorCode: 131047 as const,
    reasonCode: "META_SERVICE_WINDOW_CLOSED" as const,
    serviceWindowOpenedAt,
    serviceWindowExpiresAt,
    attemptedAt,
    rejectedAt,
  });
  const digest = createHash("sha256")
    .update(postgresBotReplyServiceWindowRejectionVersion)
    .update("\0")
    .update(JSON.stringify(identity))
    .digest("hex");

  return Object.freeze({
    eventKey: `bot_reply_window_rejection_v1_${digest}`,
    ...identity,
  });
}

function parseProviderServiceWindowRejectionRow(
  value: unknown,
): Readonly<ProviderServiceWindowRejectionRow> {
  const row = requireExactPostgresRow(
    value,
    providerServiceWindowRejectionRowKeys,
  );

  if (
    parsePostgresPositiveInteger(row.providerErrorCode) !== 131047 ||
    row.reasonCode !== "META_SERVICE_WINDOW_CLOSED"
  ) {
    throw new Error(
      "PostgreSQL returned invalid Bot reply service-window provenance",
    );
  }

  return Object.freeze({
    eventKey: requirePattern(
      row.eventKey,
      providerServiceWindowRejectionEventKeyPattern,
      "eventKey",
    ),
    deliveryKey: requirePattern(
      row.deliveryKey,
      deliveryKeyPattern,
      "deliveryKey",
    ),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    claimVersion: parsePostgresPositiveInteger(row.claimVersion),
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    serviceWindowOpenedAt: parsePostgresTimestamp(
      row.serviceWindowOpenedAt,
    ),
    serviceWindowExpiresAt: parsePostgresTimestamp(
      row.serviceWindowExpiresAt,
    ),
    attemptedAt: parsePostgresTimestamp(row.attemptedAt),
    rejectedAt: parsePostgresTimestamp(row.rejectedAt),
  });
}

function sameProviderServiceWindowRejection(
  left: Readonly<ProviderServiceWindowRejectionRow>,
  right: Readonly<ProviderServiceWindowRejectionRow>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

type ProviderRequestInput = Parameters<
  NonNullable<BotReplyDeliveryRepository["claimProviderRequest"]>
>[0];

interface ProviderRequestRow {
  readonly requestKey: string;
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly claimVersion: number;
  readonly reservationKey: string;
  readonly requestedAt: string;
}

const providerRequestInputKeys = Object.freeze([
  "deliveryKey",
  "expectedClaimVersion",
  "requestedAt",
  "reservationKey",
  "tenantId",
]);

function normalizeProviderRequest(
  input: ProviderRequestInput,
): Readonly<ProviderRequestRow> {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, providerRequestInputKeys)
  ) {
    throw new Error("Bot reply provider request input is invalid");
  }
  const identity = Object.freeze({
    deliveryKey: requirePattern(
      input.deliveryKey,
      deliveryKeyPattern,
      "deliveryKey",
    ),
    tenantId: requirePositiveInteger(input.tenantId, "tenantId"),
    claimVersion: requirePositiveInteger(
      input.expectedClaimVersion,
      "expectedClaimVersion",
    ),
    reservationKey: requirePattern(
      input.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
    requestedAt: requireTimestamp(input.requestedAt),
  });
  const digest = createHash("sha256")
    .update(postgresBotReplyProviderRequestVersion)
    .update("\0")
    .update(JSON.stringify(identity))
    .digest("hex");
  return Object.freeze({
    requestKey: `bot_reply_provider_request_v1_${digest}`,
    ...identity,
  });
}

function parseProviderRequestRow(
  value: unknown,
): Readonly<ProviderRequestRow> {
  const row = requireExactPostgresRow(value, providerRequestRowKeys);
  return Object.freeze({
    requestKey: requirePattern(
      row.requestKey,
      providerRequestKeyPattern,
      "requestKey",
    ),
    deliveryKey: requirePattern(
      row.deliveryKey,
      deliveryKeyPattern,
      "deliveryKey",
    ),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    claimVersion: parsePostgresPositiveInteger(row.claimVersion),
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
    requestedAt: parsePostgresTimestamp(row.requestedAt),
  });
}

function sameProviderRequest(
  left: Readonly<ProviderRequestRow>,
  right: Readonly<ProviderRequestRow>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
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
  const senderPhoneNumberId =
    requireSenderPhoneNumberId(
      input?.senderPhoneNumberId,
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
      senderPhoneNumberId,
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
  const claimVersion = parseNonnegativeInteger(row.claimVersion, "claim version");
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
  const nextAttemptAt = row.nextAttemptAt === null
    ? null
    : parsePostgresTimestamp(row.nextAttemptAt);
  const deferredAt = row.deferredAt === null
    ? null
    : parsePostgresTimestamp(row.deferredAt);
  const lastDeferralReasonCode = row.lastDeferralReasonCode === null
    ? null
    : requirePattern(
        row.lastDeferralReasonCode,
        /^[A-Z0-9_]{1,100}$/,
        "lastDeferralReasonCode",
      );

  if (
    !status ||
    !reply ||
    updatedAt < createdAt ||
    (status === "pending" &&
      (attemptCount !== 0 || providerMessageId !== null ||
        lastErrorCode !== null || acceptedAt !== null ||
        !(
          (claimVersion === 0 &&
            nextAttemptAt === null &&
            deferredAt === null &&
            lastDeferralReasonCode === null) ||
          (claimVersion >= 1 &&
            nextAttemptAt !== null &&
            deferredAt !== null &&
            lastDeferralReasonCode !== null &&
            nextAttemptAt > deferredAt)
        ))) ||
    (status === "sending" &&
      (attemptCount !== 1 || claimVersion < 1 ||
        providerMessageId !== null || lastErrorCode !== null ||
        acceptedAt !== null || nextAttemptAt !== null ||
        deferredAt !== null || lastDeferralReasonCode !== null)) ||
    (status === "accepted" &&
      (attemptCount < 1 || claimVersion < 1 ||
        providerMessageId === null || lastErrorCode !== null ||
        acceptedAt === null || nextAttemptAt !== null ||
        deferredAt !== null || lastDeferralReasonCode !== null)) ||
    ((status === "rejected" || status === "ambiguous") &&
      (attemptCount < 1 || claimVersion < 1 ||
        providerMessageId !== null || lastErrorCode === null ||
        acceptedAt !== null || nextAttemptAt !== null ||
        deferredAt !== null || lastDeferralReasonCode !== null))
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
    senderPhoneNumberId:
      requireSenderPhoneNumberId(
        row.senderPhoneNumberId,
      ),
    recipientPhoneNumber: requirePattern(
      row.recipientPhoneNumber,
      /^\+[1-9][0-9]{0,14}$/,
      "recipientPhoneNumber",
    ),
    reply,
    status,
    attemptCount,
    claimVersion,
    nextAttemptAt,
    deferredAt,
    lastDeferralReasonCode,
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
    delivery.senderPhoneNumberId === input.senderPhoneNumberId &&
    delivery.recipientPhoneNumber === input.recipientPhoneNumber &&
    JSON.stringify(delivery.reply) === JSON.stringify(input.reply)
  );
}

function parseDueDelivery(
  value: unknown,
): DueBotReplyDelivery {
  const row = requireExactPostgresRow(
    value,
    dueDeliveryRowKeys,
  );
  const serviceWindowOpenedAt =
    parsePostgresTimestamp(
      row.serviceWindowOpenedAt,
    );
  const serviceWindowExpiresAt =
    parsePostgresTimestamp(
      row.serviceWindowExpiresAt,
    );
  const retryAt = parsePostgresTimestamp(
    row.retryAt,
  );

  if (
    serviceWindowExpiresAt <= retryAt ||
    Date.parse(serviceWindowExpiresAt) -
      Date.parse(serviceWindowOpenedAt) !==
      24 * 60 * 60 * 1_000
  ) {
    throw new Error(
      "PostgreSQL returned an invalid due bot reply delivery",
    );
  }

  return Object.freeze({
    deliveryKey: requirePattern(
      row.deliveryKey,
      deliveryKeyPattern,
      "deliveryKey",
    ),
    tenantId: parsePostgresPositiveInteger(
      row.tenantId,
    ),
    senderPhoneNumberId:
      requireSenderPhoneNumberId(
        row.senderPhoneNumberId,
      ),
    claimVersion: parsePostgresPositiveInteger(
      row.claimVersion,
    ),
    retryAt,
    serviceWindowOpenedAt,
    serviceWindowExpiresAt,
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
    expectedClaimVersionInput: number,
    status: Extract<BotReplyDeliveryStatus, "rejected" | "ambiguous">,
    errorCodeInput: string,
    timestampInput: string,
  ): Promise<PersistedBotReplyDelivery> => {
    const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
    const deliveryKey = requirePattern(deliveryKeyInput, deliveryKeyPattern, "deliveryKey");
    const expectedClaimVersion = requirePositiveInteger(
      expectedClaimVersionInput,
      "expectedClaimVersion",
    );
    const errorCode = requireErrorCode(errorCodeInput);
    const timestamp = requireTimestamp(timestampInput);
    const row = await loadOne(
      dependencies.queries,
      postgresBotReplyDeliverySql.markFailure,
      [
        tenantId,
        deliveryKey,
        expectedClaimVersion,
        status,
        errorCode,
        timestamp,
      ],
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
              normalized.senderPhoneNumberId,
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
          if (
            delivery.status === "pending" &&
            delivery.nextAttemptAt !== null &&
            delivery.nextAttemptAt > timestamp
          ) {
            return Object.freeze({
              outcome: "deferred" as const,
              retryAt: delivery.nextAttemptAt,
              delivery,
            });
          }
          return Object.freeze({
            outcome: delivery.status === "sending"
              ? "uncertain" as const
              : "duplicate" as const,
            delivery,
          });
        },
      );
    },

    async claimProviderRequest(input) {
      const request = normalizeProviderRequest(input);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const inserted = await loadOne(
            transaction,
            postgresBotReplyDeliverySql.insertProviderRequest,
            [
              request.requestKey,
              request.deliveryKey,
              request.tenantId,
              request.claimVersion,
              request.reservationKey,
              request.requestedAt,
            ],
          );
          if (inserted !== null) {
            const insertedRow = requireExactPostgresRow(
              inserted,
              ["requestKey"],
            );
            if (
              requirePattern(
                insertedRow.requestKey,
                providerRequestKeyPattern,
                "requestKey",
              ) !== request.requestKey
            ) {
              throw new Error(
                "PostgreSQL returned a mismatched Bot reply provider request",
              );
            }
            return Object.freeze({
              outcome: "created" as const,
              requestKey: request.requestKey,
            });
          }

          const storedRow = await loadOne(
            transaction,
            postgresBotReplyDeliverySql.findProviderRequestForUpdate,
            [
              request.tenantId,
              request.deliveryKey,
              request.claimVersion,
            ],
          );
          if (storedRow === null) {
            throw new Error(
              "PostgreSQL Bot reply provider request claim failed",
            );
          }
          const stored = parseProviderRequestRow(storedRow);
          if (!sameProviderRequest(stored, request)) {
            throw new BotReplyDeliveryIdentityConflictError();
          }
          return Object.freeze({
            outcome: "duplicate" as const,
            requestKey: request.requestKey,
          });
        },
      );
    },

    async defer(
      tenantIdInput,
      deliveryKeyInput,
      expectedClaimVersionInput,
      timestampInput,
      retryAtInput,
      reasonCodeInput,
    ) {
      const tenantId = requirePositiveInteger(
        tenantIdInput,
        "tenantId",
      );
      const deliveryKey = requirePattern(
        deliveryKeyInput,
        deliveryKeyPattern,
        "deliveryKey",
      );
      const expectedClaimVersion =
        requirePositiveInteger(
          expectedClaimVersionInput,
          "expectedClaimVersion",
        );
      const timestamp = requireTimestamp(
        timestampInput,
      );
      const retryAt = requireTimestamp(retryAtInput);
      const reasonCode = requireErrorCode(
        reasonCodeInput,
      );

      if (retryAt <= timestamp) {
        throw new Error(
          "bot reply delivery deferral is invalid",
        );
      }

      const row = await loadOne(
        dependencies.queries,
        postgresBotReplyDeliverySql.defer,
        [
          tenantId,
          deliveryKey,
          expectedClaimVersion,
          timestamp,
          retryAt,
          reasonCode,
        ],
      );

      if (row === null) {
        throw new Error(
          "PostgreSQL bot reply deferral transition failed",
        );
      }

      const delivery = requireDeliveryScope(
        parseDelivery(row),
        tenantId,
        deliveryKey,
      );

      if (
        delivery.status !== "pending" ||
        delivery.claimVersion !== expectedClaimVersion ||
        delivery.nextAttemptAt !== retryAt ||
        delivery.deferredAt !== timestamp ||
        delivery.lastDeferralReasonCode !== reasonCode
      ) {
        throw new Error(
          "PostgreSQL returned a mismatched bot reply deferral",
        );
      }

      return delivery;
    },

    async deferProviderRejection(input) {
      const provenance = normalizeProviderDeferral(input);

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const loadProvenance = async () => {
            const storedRow = await loadOne(
              transaction,
              postgresBotReplyDeliverySql
                .findProviderDeferralForUpdate,
              [
                provenance.tenantId,
                provenance.deliveryKey,
                provenance.claimVersion,
              ],
            );

            if (storedRow === null) return null;
            const stored = parseProviderDeferralRow(storedRow);
            if (!sameProviderDeferral(stored, provenance)) {
              throw new Error(
                "PostgreSQL returned conflicting Bot reply provider provenance",
              );
            }
            return stored;
          };

          let stored = await loadProvenance();
          let deliveryRow: Record<string, unknown> | null = null;

          if (stored === null) {
            deliveryRow = await loadOne(
              transaction,
              postgresBotReplyDeliverySql.defer,
              [
                provenance.tenantId,
                provenance.deliveryKey,
                provenance.claimVersion,
                provenance.deferredAt,
                provenance.retryAt,
                provenance.reasonCode,
              ],
            );

            if (deliveryRow !== null) {
              await transaction.query<unknown>(
                postgresBotReplyDeliverySql.insertProviderDeferral,
                [
                  provenance.eventKey,
                  provenance.deliveryKey,
                  provenance.tenantId,
                  provenance.claimVersion,
                  provenance.reservationKey,
                  provenance.providerErrorCode,
                  provenance.cooldownScope,
                  provenance.retryAfterSeconds,
                  provenance.reasonCode,
                  provenance.attemptedAt,
                  provenance.deferredAt,
                  provenance.retryAt,
                ],
              );
            }

            stored = await loadProvenance();
          }

          if (stored === null) {
            throw new Error(
              "PostgreSQL Bot reply provider deferral transition failed",
            );
          }

          if (deliveryRow === null) {
            deliveryRow = await loadOne(
              transaction,
              postgresBotReplyDeliverySql.findByKeyForUpdate,
              [provenance.tenantId, provenance.deliveryKey],
            );
          }

          if (deliveryRow === null) {
            throw new Error(
              "PostgreSQL Bot reply provider deferral delivery is missing",
            );
          }

          const delivery = requireDeliveryScope(
            parseDelivery(deliveryRow),
            provenance.tenantId,
            provenance.deliveryKey,
          );

          if (
            delivery.status !== "pending" ||
            delivery.claimVersion !== provenance.claimVersion ||
            delivery.nextAttemptAt !== provenance.retryAt ||
            delivery.deferredAt !== provenance.deferredAt ||
            delivery.lastDeferralReasonCode !== provenance.reasonCode
          ) {
            throw new Error(
              "PostgreSQL returned a mismatched Bot reply provider deferral",
            );
          }

          return delivery;
        },
      );
    },

    async rejectProviderServiceWindow(input) {
      const provenance =
        normalizeProviderServiceWindowRejection(input);

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const loadProvenance = async () => {
            const storedRow = await loadOne(
              transaction,
              postgresBotReplyDeliverySql
                .findProviderServiceWindowRejectionForUpdate,
              [
                provenance.tenantId,
                provenance.deliveryKey,
                provenance.claimVersion,
              ],
            );

            if (storedRow === null) return null;
            const stored =
              parseProviderServiceWindowRejectionRow(storedRow);
            if (
              !sameProviderServiceWindowRejection(stored, provenance)
            ) {
              throw new Error(
                "PostgreSQL returned conflicting Bot reply service-window provenance",
              );
            }
            return stored;
          };

          let stored = await loadProvenance();
          let deliveryRow: Record<string, unknown> | null = null;

          if (stored === null) {
            deliveryRow = await loadOne(
              transaction,
              postgresBotReplyDeliverySql.markFailure,
              [
                provenance.tenantId,
                provenance.deliveryKey,
                provenance.claimVersion,
                "rejected",
                provenance.reasonCode,
                provenance.rejectedAt,
              ],
            );

            if (deliveryRow !== null) {
              await transaction.query<unknown>(
                postgresBotReplyDeliverySql
                  .insertProviderServiceWindowRejection,
                [
                  provenance.eventKey,
                  provenance.deliveryKey,
                  provenance.tenantId,
                  provenance.claimVersion,
                  provenance.reservationKey,
                  provenance.serviceWindowOpenedAt,
                  provenance.serviceWindowExpiresAt,
                  provenance.attemptedAt,
                  provenance.rejectedAt,
                ],
              );
            }

            stored = await loadProvenance();
          }

          if (stored === null) {
            throw new Error(
              "PostgreSQL Bot reply service-window rejection transition failed",
            );
          }

          if (deliveryRow === null) {
            deliveryRow = await loadOne(
              transaction,
              postgresBotReplyDeliverySql.findByKeyForUpdate,
              [provenance.tenantId, provenance.deliveryKey],
            );
          }

          if (deliveryRow === null) {
            throw new Error(
              "PostgreSQL Bot reply service-window rejection delivery is missing",
            );
          }

          const delivery = requireDeliveryScope(
            parseDelivery(deliveryRow),
            provenance.tenantId,
            provenance.deliveryKey,
          );

          if (
            delivery.status !== "rejected" ||
            delivery.claimVersion !== provenance.claimVersion ||
            delivery.lastErrorCode !== provenance.reasonCode ||
            delivery.updatedAt !== provenance.rejectedAt
          ) {
            throw new Error(
              "PostgreSQL returned a mismatched Bot reply service-window rejection",
            );
          }

          return delivery;
        },
      );
    },

    async listDueDeferrals(timestampInput, limitInput) {
      const timestamp = requireTimestamp(
        timestampInput,
      );

      if (
        !Number.isSafeInteger(limitInput) ||
        limitInput < 1 ||
        limitInput > 100
      ) {
        throw new Error("limit is invalid");
      }

      const rows = await loadRows(
        dependencies.queries,
        postgresBotReplyDeliverySql.listDueDeferrals,
        [timestamp, limitInput],
        limitInput,
      );

      return Object.freeze(
        rows.map(parseDueDelivery),
      );
    },

    async markAccepted(
      tenantIdInput,
      deliveryKeyInput,
      expectedClaimVersionInput,
      providerMessageIdInput,
      reservationKeyInput,
      timestampInput,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const deliveryKey = requirePattern(deliveryKeyInput, deliveryKeyPattern, "deliveryKey");
      const expectedClaimVersion = requirePositiveInteger(
        expectedClaimVersionInput,
        "expectedClaimVersion",
      );
      const providerMessageId = requireProviderMessageId(providerMessageIdInput);
      const reservationKey = requirePattern(
        reservationKeyInput,
        reservationKeyPattern,
        "reservationKey",
      );
      const timestamp = requireTimestamp(timestampInput);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          await loadRows(
            transaction,
            postgresBotReplyDeliverySql.recordAcceptance,
            [
              tenantId,
              deliveryKey,
              expectedClaimVersion,
              providerMessageId,
              reservationKey,
              timestamp,
            ],
            1,
          );
          const [row, linkRow] = await Promise.all([
            loadOne(
              transaction,
              postgresBotReplyDeliverySql.findByKeyForUpdate,
              [tenantId, deliveryKey],
            ),
            loadOne(
              transaction,
              postgresBotReplyDeliverySql.findAcceptanceByDeliveryForUpdate,
              [tenantId, deliveryKey],
            ),
          ]);
          if (row === null || linkRow === null) {
            throw new Error(
              "PostgreSQL bot reply acceptance transition failed",
            );
          }
          const link = requireExactPostgresRow(
            linkRow,
            acceptanceLinkRowKeys,
          );
          if (
            requireProviderMessageId(link.providerMessageId) !==
              providerMessageId ||
            requirePattern(
              link.reservationKey,
              reservationKeyPattern,
              "reservationKey",
            ) !== reservationKey ||
            parsePostgresTimestamp(link.acceptedAt) !== timestamp
          ) {
            throw new Error(
              "PostgreSQL bot reply acceptance identity conflicts",
            );
          }
          const delivery = requireDeliveryScope(
            parseDelivery(row),
            tenantId,
            deliveryKey,
          );
          if (
            delivery.status !== "accepted" ||
            delivery.providerMessageId !== providerMessageId ||
            delivery.acceptedAt !== timestamp
          ) {
            throw new Error(
              "PostgreSQL returned a mismatched bot reply acceptance",
            );
          }
          return delivery;
        },
      );
    },

    markRejected(tenantId, deliveryKey, expectedClaimVersion, errorCode, timestamp) {
      return markFailure(
        tenantId,
        deliveryKey,
        expectedClaimVersion,
        "rejected",
        errorCode,
        timestamp,
      );
    },

    markAmbiguous(tenantId, deliveryKey, expectedClaimVersion, errorCode, timestamp) {
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

  return Object.freeze(repository);
}
