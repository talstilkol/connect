import type {
  DispatchBotReplyDeliveryResult,
} from "../bot/botReplyDeliveryWorker.ts";
import type {
  BotReplyStagingProviderCase,
  BotReplyStagingProviderKillSwitchResult,
} from "../operations/botReplyStagingProviderDriver.ts";
import type {
  BotReplyStagingScenarioContext,
  BotReplyStagingStepContext,
} from "../operations/botReplyStagingScenarioExecutor.ts";
import type {
  BotReplyStagingDurableObservationWriteResult,
  BotReplyStagingDurableObservationWriter,
} from "./postgresBotReplyStagingDurableObservationWriter.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresNonnegativeInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

export const postgresBotReplyStagingSendObservationProducerVersion =
  "connect-postgres-bot-reply-staging-send-observation-producer-v1" as const;

type SendScenario = "text-send" | "button-send";
type ReplyKind = "text" | "buttons";
type ProviderStatus = "accepted" | "sent" | "delivered" | "read" | "failed";

export interface BotReplyStagingSendObservationProducerClock {
  now(): Date;
}

export interface BotReplyStagingSendObservationProducer {
  isConfigured(): boolean;
  recordAcceptedSend(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<BotReplyStagingDurableObservationWriteResult>;
  recordButtonReply(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
  ): Promise<BotReplyStagingDurableObservationWriteResult>;
  recordServiceWindowRejection(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<BotReplyStagingDurableObservationWriteResult>;
  recordDuplicateSafety(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatches: readonly [
      Readonly<DispatchBotReplyDeliveryResult>,
      Readonly<DispatchBotReplyDeliveryResult>,
    ],
  ): Promise<BotReplyStagingDurableObservationWriteResult>;
  recordKillSwitch(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    disabled: Readonly<BotReplyStagingProviderKillSwitchResult>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<BotReplyStagingDurableObservationWriteResult>;
}

export interface PostgresBotReplyStagingSendObservationProducerDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly writer: BotReplyStagingDurableObservationWriter;
  readonly clock: BotReplyStagingSendObservationProducerClock;
}

const rowKeys = Object.freeze([
  "acceptedAt",
  "deliveryKey",
  "providerAcceptedAt",
  "providerStatus",
  "replyKind",
  "reservationKey",
  "tenantId",
] as const);
const deliveryKeyPattern = /^bot_reply_delivery_v1_[a-f0-9]{64}$/;
const reservationKeyPattern = /^whatsapp_rate_reservation_v1_[a-f0-9]{64}$/;
const messageKeyPattern = /^message_v1_[a-f0-9]{64}$/;
const optionKeyPattern = /^bot_option_v1_[a-f0-9]{64}$/;
const buttonReplyRowKeys = Object.freeze([
  "messageKey",
  "occurredAt",
  "selectedBotOptionKey",
  "subjectDeliveryKey",
  "tenantId",
] as const);
const serviceWindowRejectionRowKeys = Object.freeze([
  "attemptedAt",
  "deliveryKey",
  "providerErrorCode",
  "reasonCode",
  "rejectedAt",
  "tenantId",
] as const);
const duplicateSafetyRowKeys = Object.freeze([
  "acceptedAt",
  "deliveryClaimVersion",
  "deliveryKey",
  "deliveryStatus",
  "providerAcceptanceCount",
  "providerRequestCount",
  "requestStartedAt",
  "tenantId",
] as const);
const killSwitchRowKeys = Object.freeze([
  "deferredAt",
  "deferralReasonCode",
  "deliveryClaimVersion",
  "deliveryKey",
  "deliveryStatus",
  "nextAttemptAt",
  "policyAuditCount",
  "policyRecordedAt",
  "policyState",
  "policyVersion",
  "providerAcceptanceCount",
  "providerRequestCount",
  "tenantId",
] as const);

export const postgresBotReplyStagingSendObservationProducerSql =
  Object.freeze({
    readAcceptance: `
      SELECT
        delivery.delivery_key AS "deliveryKey",
        delivery.tenant_id AS "tenantId",
        delivery.accepted_at AS "acceptedAt",
        delivery.reply_json ->> 'kind' AS "replyKind",
        link.provider_status AS "providerStatus",
        link.reservation_key AS "reservationKey",
        link.accepted_at AS "providerAcceptedAt"
      FROM bot_reply_deliveries AS delivery
      INNER JOIN bot_reply_delivery_provider_links AS link
        ON link.delivery_key = delivery.delivery_key
       AND link.tenant_id = delivery.tenant_id
       AND link.provider_message_id = delivery.provider_message_id
       AND link.accepted_at = delivery.accepted_at
      INNER JOIN bot_reply_provider_request_claims AS request
        ON request.delivery_key = delivery.delivery_key
       AND request.tenant_id = delivery.tenant_id
       AND request.claim_version = delivery.claim_version
       AND request.reservation_key = link.reservation_key
       AND request.requested_at <= link.accepted_at
      WHERE delivery.delivery_key = $1
        AND delivery.tenant_id = $2
        AND delivery.status = 'accepted'
        AND delivery.attempt_count >= 1
        AND delivery.provider_message_id IS NOT NULL
        AND delivery.accepted_at IS NOT NULL
        AND jsonb_typeof(delivery.reply_json) = 'object'
        AND delivery.reply_json ? 'kind'
        AND delivery.reply_json ->> 'kind' IN ('text', 'buttons')
      LIMIT 2
    `,
    readButtonReply: `
      SELECT
        event.message_key AS "messageKey",
        event.tenant_id AS "tenantId",
        event.selected_bot_option_key AS "selectedBotOptionKey",
        event.subject_delivery_key AS "subjectDeliveryKey",
        event.occurred_at AS "occurredAt"
      FROM inbound_button_reply_events AS event
      WHERE event.subject_delivery_key = $1
        AND event.tenant_id = $2
        AND event.occurred_at >= $3::timestamptz
        AND event.occurred_at <= $4::timestamptz
      ORDER BY event.occurred_at, event.message_key
      LIMIT 2
    `,
    readServiceWindowRejection: `
      SELECT
        event.delivery_key AS "deliveryKey",
        event.tenant_id AS "tenantId",
        event.provider_error_code AS "providerErrorCode",
        event.reason_code AS "reasonCode",
        event.attempted_at AS "attemptedAt",
        event.rejected_at AS "rejectedAt"
      FROM bot_reply_request_fenced_window_rejections AS event
      WHERE event.delivery_key = $1
        AND event.tenant_id = $2
      LIMIT 2
    `,
    readDuplicateSafety: `
      SELECT
        delivery.delivery_key AS "deliveryKey",
        delivery.tenant_id AS "tenantId",
        delivery.status AS "deliveryStatus",
        delivery.claim_version AS "deliveryClaimVersion",
        request.requested_at AS "requestStartedAt",
        link.accepted_at AS "acceptedAt",
        (
          SELECT count(*)
          FROM bot_reply_provider_request_claims AS request_count
          WHERE request_count.delivery_key = delivery.delivery_key
            AND request_count.tenant_id = delivery.tenant_id
        ) AS "providerRequestCount",
        (
          SELECT count(*)
          FROM bot_reply_delivery_provider_links AS acceptance_count
          WHERE acceptance_count.delivery_key = delivery.delivery_key
            AND acceptance_count.tenant_id = delivery.tenant_id
        ) AS "providerAcceptanceCount"
      FROM bot_reply_deliveries AS delivery
      INNER JOIN bot_reply_provider_request_claims AS request
        ON request.delivery_key = delivery.delivery_key
       AND request.tenant_id = delivery.tenant_id
       AND request.claim_version = delivery.claim_version
      INNER JOIN bot_reply_delivery_provider_links AS link
        ON link.delivery_key = delivery.delivery_key
       AND link.tenant_id = delivery.tenant_id
       AND link.reservation_key = request.reservation_key
       AND link.accepted_at = delivery.accepted_at
       AND request.requested_at <= link.accepted_at
      WHERE delivery.delivery_key = $1
        AND delivery.tenant_id = $2
        AND delivery.status = 'accepted'
        AND delivery.attempt_count = 1
        AND delivery.accepted_at IS NOT NULL
      LIMIT 2
    `,
    readKillSwitch: `
      SELECT
        delivery.delivery_key AS "deliveryKey",
        delivery.tenant_id AS "tenantId",
        delivery.status AS "deliveryStatus",
        delivery.claim_version AS "deliveryClaimVersion",
        delivery.deferred_at AS "deferredAt",
        delivery.next_attempt_at AS "nextAttemptAt",
        delivery.last_deferral_reason_code AS "deferralReasonCode",
        policy.policy_version AS "policyVersion",
        policy.delivery_state AS "policyState",
        policy.recorded_at AS "policyRecordedAt",
        (
          SELECT count(*)
          FROM bot_reply_provider_request_claims AS request_count
          WHERE request_count.delivery_key = delivery.delivery_key
            AND request_count.tenant_id = delivery.tenant_id
        ) AS "providerRequestCount",
        (
          SELECT count(*)
          FROM bot_reply_delivery_provider_links AS acceptance_count
          WHERE acceptance_count.delivery_key = delivery.delivery_key
            AND acceptance_count.tenant_id = delivery.tenant_id
        ) AS "providerAcceptanceCount",
        (
          SELECT count(*)
          FROM audit_logs AS policy_audit
          WHERE policy_audit.tenant_id = policy.tenant_id
            AND policy_audit.action = 'whatsapp.delivery_policy.recorded'
            AND policy_audit.target_type = 'whatsapp_campaign_delivery_policy'
            AND policy_audit.target_id = policy.tenant_id::TEXT
            AND policy_audit.idempotency_key = policy.event_key
        ) AS "policyAuditCount"
      FROM bot_reply_deliveries AS delivery
      INNER JOIN whatsapp_campaign_delivery_policy_events AS policy
        ON policy.tenant_id = delivery.tenant_id
       AND policy.policy_version = $3
       AND policy.connection_version = $4
       AND policy.delivery_state = 'disabled'
      INNER JOIN whatsapp_campaign_delivery_policy_events AS previous_policy
        ON previous_policy.tenant_id = policy.tenant_id
       AND previous_policy.policy_version = $5
       AND previous_policy.connection_version = policy.connection_version
       AND previous_policy.delivery_state = 'enabled'
      WHERE delivery.delivery_key = $1
        AND delivery.tenant_id = $2
        AND delivery.status = 'pending'
        AND delivery.attempt_count = 0
        AND delivery.claim_version >= 1
        AND delivery.deferred_at IS NOT NULL
        AND delivery.next_attempt_at IS NOT NULL
        AND delivery.updated_at = delivery.deferred_at
        AND delivery.last_deferral_reason_code =
          'WHATSAPP_ADMISSION_UNAVAILABLE'
        AND policy.recorded_at <= delivery.deferred_at
        AND NOT EXISTS (
          SELECT 1
          FROM whatsapp_campaign_delivery_policy_events AS later_policy
          WHERE later_policy.tenant_id = policy.tenant_id
            AND later_policy.policy_version > policy.policy_version
            AND later_policy.recorded_at <= delivery.deferred_at
        )
      LIMIT 2
    `,
  });

interface AcceptanceRow {
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly acceptedAt: string;
  readonly providerAcceptedAt: string;
  readonly replyKind: ReplyKind;
  readonly providerStatus: ProviderStatus;
  readonly reservationKey: string;
}

interface ButtonReplyRow {
  readonly messageKey: string;
  readonly tenantId: number;
  readonly selectedBotOptionKey: string;
  readonly subjectDeliveryKey: string;
  readonly occurredAt: string;
}

interface ServiceWindowRejectionRow {
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly providerErrorCode: 131047;
  readonly reasonCode: "META_SERVICE_WINDOW_CLOSED";
  readonly attemptedAt: string;
  readonly rejectedAt: string;
}

interface DuplicateSafetyRow {
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly deliveryStatus: "accepted";
  readonly deliveryClaimVersion: number;
  readonly requestStartedAt: string;
  readonly acceptedAt: string;
  readonly providerRequestCount: 1;
  readonly providerAcceptanceCount: 1;
}

interface KillSwitchRow {
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly deliveryStatus: "pending";
  readonly deliveryClaimVersion: number;
  readonly deferredAt: string;
  readonly nextAttemptAt: string;
  readonly deferralReasonCode: "WHATSAPP_ADMISSION_UNAVAILABLE";
  readonly policyVersion: number;
  readonly policyState: "disabled";
  readonly policyRecordedAt: string;
  readonly providerRequestCount: 0;
  readonly providerAcceptanceCount: 0;
  readonly policyAuditCount: 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requirePattern(value: unknown, pattern: RegExp): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error("PostgreSQL returned invalid Bot reply send identity");
  }
  return value;
}

function replyKind(value: unknown): ReplyKind {
  if (value !== "text" && value !== "buttons") {
    throw new Error("PostgreSQL returned invalid Bot reply send kind");
  }
  return value;
}

function providerStatus(value: unknown): ProviderStatus {
  if (
    value !== "accepted" && value !== "sent" && value !== "delivered" &&
    value !== "read" && value !== "failed"
  ) {
    throw new Error("PostgreSQL returned invalid Bot reply provider status");
  }
  return value;
}

function parseRow(value: unknown): Readonly<AcceptanceRow> {
  const row = requireExactPostgresRow(value, rowKeys);
  const parsed = Object.freeze({
    deliveryKey: requirePattern(row.deliveryKey, deliveryKeyPattern),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    acceptedAt: parsePostgresTimestamp(row.acceptedAt),
    providerAcceptedAt: parsePostgresTimestamp(row.providerAcceptedAt),
    replyKind: replyKind(row.replyKind),
    providerStatus: providerStatus(row.providerStatus),
    reservationKey: requirePattern(row.reservationKey, reservationKeyPattern),
  });
  if (parsed.acceptedAt !== parsed.providerAcceptedAt) {
    throw new Error("PostgreSQL returned mismatched Bot reply acceptance time");
  }
  return parsed;
}

function parseButtonReplyRow(value: unknown): Readonly<ButtonReplyRow> {
  const row = requireExactPostgresRow(value, buttonReplyRowKeys);
  return Object.freeze({
    messageKey: requirePattern(row.messageKey, messageKeyPattern),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    selectedBotOptionKey: requirePattern(
      row.selectedBotOptionKey,
      optionKeyPattern,
    ),
    subjectDeliveryKey: requirePattern(
      row.subjectDeliveryKey,
      deliveryKeyPattern,
    ),
    occurredAt: parsePostgresTimestamp(row.occurredAt),
  });
}

function parseServiceWindowRejectionRow(
  value: unknown,
): Readonly<ServiceWindowRejectionRow> {
  const row = requireExactPostgresRow(
    value,
    serviceWindowRejectionRowKeys,
  );
  if (
    parsePostgresPositiveInteger(row.providerErrorCode) !== 131047 ||
    row.reasonCode !== "META_SERVICE_WINDOW_CLOSED"
  ) {
    throw new Error(
      "PostgreSQL returned invalid Bot reply service-window rejection",
    );
  }
  return Object.freeze({
    deliveryKey: requirePattern(row.deliveryKey, deliveryKeyPattern),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    attemptedAt: parsePostgresTimestamp(row.attemptedAt),
    rejectedAt: parsePostgresTimestamp(row.rejectedAt),
  });
}

function parseDuplicateSafetyRow(
  value: unknown,
): Readonly<DuplicateSafetyRow> {
  const row = requireExactPostgresRow(value, duplicateSafetyRowKeys);
  const providerRequestCount = parsePostgresPositiveInteger(
    row.providerRequestCount,
  );
  const providerAcceptanceCount = parsePostgresPositiveInteger(
    row.providerAcceptanceCount,
  );
  if (
    row.deliveryStatus !== "accepted" ||
    providerRequestCount !== 1 ||
    providerAcceptanceCount !== 1
  ) {
    throw new Error(
      "PostgreSQL returned invalid Bot reply duplicate-safety evidence",
    );
  }
  return Object.freeze({
    deliveryKey: requirePattern(row.deliveryKey, deliveryKeyPattern),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    deliveryStatus: "accepted",
    deliveryClaimVersion: parsePostgresPositiveInteger(
      row.deliveryClaimVersion,
    ),
    requestStartedAt: parsePostgresTimestamp(row.requestStartedAt),
    acceptedAt: parsePostgresTimestamp(row.acceptedAt),
    providerRequestCount: 1,
    providerAcceptanceCount: 1,
  });
}

function parseKillSwitchRow(value: unknown): Readonly<KillSwitchRow> {
  const row = requireExactPostgresRow(value, killSwitchRowKeys);
  const providerRequestCount = parsePostgresNonnegativeInteger(
    row.providerRequestCount,
  );
  const providerAcceptanceCount = parsePostgresNonnegativeInteger(
    row.providerAcceptanceCount,
  );
  const policyAuditCount = parsePostgresPositiveInteger(
    row.policyAuditCount,
  );
  if (
    row.deliveryStatus !== "pending" ||
    row.deferralReasonCode !== "WHATSAPP_ADMISSION_UNAVAILABLE" ||
    row.policyState !== "disabled" ||
    providerRequestCount !== 0 ||
    providerAcceptanceCount !== 0 ||
    policyAuditCount !== 1
  ) {
    throw new Error(
      "PostgreSQL returned invalid Bot reply kill-switch evidence",
    );
  }
  return Object.freeze({
    deliveryKey: requirePattern(row.deliveryKey, deliveryKeyPattern),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    deliveryStatus: "pending",
    deliveryClaimVersion: parsePostgresPositiveInteger(
      row.deliveryClaimVersion,
    ),
    deferredAt: parsePostgresTimestamp(row.deferredAt),
    nextAttemptAt: parsePostgresTimestamp(row.nextAttemptAt),
    deferralReasonCode: "WHATSAPP_ADMISSION_UNAVAILABLE",
    policyVersion: parsePostgresPositiveInteger(row.policyVersion),
    policyState: "disabled",
    policyRecordedAt: parsePostgresTimestamp(row.policyRecordedAt),
    providerRequestCount: 0,
    providerAcceptanceCount: 0,
    policyAuditCount: 1,
  });
}

function expectedReplyKind(scenario: unknown): ReplyKind {
  if (scenario === "text-send") return "text";
  if (scenario === "button-send") return "buttons";
  throw new Error("Bot reply staging scenario is not acceptance-backed");
}

function nowMilliseconds(
  clock: Readonly<BotReplyStagingSendObservationProducerClock>,
): number {
  let value: Date;
  try {
    value = clock.now();
  } catch {
    throw new Error("Bot reply send observation clock is unavailable");
  }
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("Bot reply send observation clock is invalid");
  }
  return value.getTime();
}

function requireBinding(
  context: Readonly<BotReplyStagingScenarioContext>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
  dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  row: Readonly<AcceptanceRow>,
  clock: Readonly<BotReplyStagingSendObservationProducerClock>,
): SendScenario {
  const kind = expectedReplyKind(context?.scenario);
  if (
    !isRecord(context) || !isRecord(context.run) || !isRecord(context.claim) ||
    !isRecord(allocatedCase) || !isRecord(dispatch) ||
    (dispatch.outcome !== "accepted" && dispatch.outcome !== "duplicate") ||
    allocatedCase.source !== "durable-postgres" ||
    allocatedCase.executionMode !== "dispatch" ||
    allocatedCase.caseName !== context.scenario ||
    allocatedCase.runKey !== context.run.runKey ||
    allocatedCase.operationKey !== context.operationKey ||
    allocatedCase.deliveryKey !== context.deliveryKey ||
    allocatedCase.subjectDeliveryKey !== context.deliveryKey ||
    allocatedCase.targetTenantId !== context.run.targetTenantId ||
    allocatedCase.connectionVersion !== context.run.expectedConnectionVersion ||
    allocatedCase.policyVersion !== context.run.expectedPolicyVersion ||
    allocatedCase.recipientFingerprint !== context.run.recipientFingerprint ||
    allocatedCase.claimVersion !== context.claim.claimVersion ||
    allocatedCase.leaseExpiresAt !== context.claim.leaseExpiresAt ||
    context.expectedProviderErrorCode !== null ||
    row.deliveryKey !== context.deliveryKey ||
    row.tenantId !== context.run.targetTenantId ||
    row.replyKind !== kind
  ) {
    throw new Error("Bot reply send observation scope is invalid");
  }
  const acceptedAt = Date.parse(row.acceptedAt);
  if (
    acceptedAt < Date.parse(context.run.requestedAt) ||
    acceptedAt > Date.parse(context.claim.leaseExpiresAt) ||
    acceptedAt > nowMilliseconds(clock)
  ) {
    throw new Error("Bot reply send observation is not current");
  }
  return context.scenario as SendScenario;
}

function requireButtonReplyBinding(
  context: Readonly<BotReplyStagingScenarioContext>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
  row: Readonly<ButtonReplyRow>,
  clock: Readonly<BotReplyStagingSendObservationProducerClock>,
): void {
  if (
    !isRecord(context) || !isRecord(context.run) || !isRecord(context.claim) ||
    !isRecord(allocatedCase) || context.scenario !== "button-reply" ||
    context.expectedProviderErrorCode !== null ||
    allocatedCase.source !== "durable-postgres" ||
    allocatedCase.executionMode !== "observe-only" ||
    allocatedCase.caseName !== "button-reply" ||
    allocatedCase.runKey !== context.run.runKey ||
    allocatedCase.operationKey !== context.operationKey ||
    allocatedCase.deliveryKey !== context.deliveryKey ||
    allocatedCase.subjectDeliveryKey === context.deliveryKey ||
    allocatedCase.targetTenantId !== context.run.targetTenantId ||
    allocatedCase.connectionVersion !== context.run.expectedConnectionVersion ||
    allocatedCase.policyVersion !== context.run.expectedPolicyVersion ||
    allocatedCase.recipientFingerprint !== context.run.recipientFingerprint ||
    allocatedCase.claimVersion !== context.claim.claimVersion ||
    allocatedCase.leaseExpiresAt !== context.claim.leaseExpiresAt ||
    row.subjectDeliveryKey !== allocatedCase.subjectDeliveryKey ||
    row.tenantId !== context.run.targetTenantId
  ) {
    throw new Error("Bot reply button observation scope is invalid");
  }
  const occurredAt = Date.parse(row.occurredAt);
  if (
    occurredAt < Date.parse(context.run.requestedAt) ||
    occurredAt > Date.parse(context.claim.leaseExpiresAt) ||
    occurredAt > nowMilliseconds(clock)
  ) {
    throw new Error("Bot reply button observation is not current");
  }
}

function requireServiceWindowRejectionBinding(
  context: Readonly<BotReplyStagingScenarioContext>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
  dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  row: Readonly<ServiceWindowRejectionRow>,
  clock: Readonly<BotReplyStagingSendObservationProducerClock>,
): "rejected" | "duplicate" {
  if (
    !isRecord(context) || !isRecord(context.run) ||
    !isRecord(context.claim) || !isRecord(allocatedCase) ||
    !isRecord(dispatch) ||
    context.scenario !== "customer-window-expired" ||
    context.expectedProviderErrorCode !== 131047 ||
    (dispatch.outcome !== "rejected" && dispatch.outcome !== "duplicate") ||
    allocatedCase.source !== "durable-postgres" ||
    allocatedCase.executionMode !== "dispatch" ||
    allocatedCase.caseName !== "customer-window-expired" ||
    allocatedCase.runKey !== context.run.runKey ||
    allocatedCase.operationKey !== context.operationKey ||
    allocatedCase.deliveryKey !== context.deliveryKey ||
    allocatedCase.subjectDeliveryKey !== context.deliveryKey ||
    allocatedCase.targetTenantId !== context.run.targetTenantId ||
    allocatedCase.connectionVersion !== context.run.expectedConnectionVersion ||
    allocatedCase.policyVersion !== context.run.expectedPolicyVersion ||
    allocatedCase.recipientFingerprint !== context.run.recipientFingerprint ||
    allocatedCase.claimVersion !== context.claim.claimVersion ||
    allocatedCase.leaseExpiresAt !== context.claim.leaseExpiresAt ||
    row.deliveryKey !== context.deliveryKey ||
    row.tenantId !== context.run.targetTenantId
  ) {
    throw new Error(
      "Bot reply service-window observation scope is invalid",
    );
  }
  const attemptedAt = Date.parse(row.attemptedAt);
  const rejectedAt = Date.parse(row.rejectedAt);
  if (
    attemptedAt < Date.parse(context.run.requestedAt) ||
    rejectedAt < attemptedAt ||
    rejectedAt > Date.parse(context.claim.leaseExpiresAt) ||
    rejectedAt > nowMilliseconds(clock)
  ) {
    throw new Error(
      "Bot reply service-window observation is not current",
    );
  }
  return dispatch.outcome;
}

function requireDuplicateSafetyBinding(
  context: Readonly<BotReplyStagingStepContext>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
  dispatches: readonly [
    Readonly<DispatchBotReplyDeliveryResult>,
    Readonly<DispatchBotReplyDeliveryResult>,
  ],
  row: Readonly<DuplicateSafetyRow>,
  clock: Readonly<BotReplyStagingSendObservationProducerClock>,
): Readonly<{
  firstDispatchOutcome: "accepted" | "duplicate";
  secondDispatchOutcome: "duplicate";
}> {
  if (
    !isRecord(context) || !isRecord(context.run) ||
    !isRecord(context.claim) || !isRecord(allocatedCase) ||
    !Array.isArray(dispatches) || dispatches.length !== 2 ||
    !isRecord(dispatches[0]) || !isRecord(dispatches[1]) ||
    (dispatches[0].outcome !== "accepted" &&
      dispatches[0].outcome !== "duplicate") ||
    dispatches[1].outcome !== "duplicate" ||
    allocatedCase.source !== "durable-postgres" ||
    allocatedCase.executionMode !== "dispatch" ||
    allocatedCase.caseName !== "duplicate-safety" ||
    allocatedCase.runKey !== context.run.runKey ||
    allocatedCase.operationKey !== context.operationKey ||
    allocatedCase.deliveryKey !== context.deliveryKey ||
    allocatedCase.subjectDeliveryKey !== context.deliveryKey ||
    allocatedCase.targetTenantId !== context.run.targetTenantId ||
    allocatedCase.connectionVersion !== context.run.expectedConnectionVersion ||
    allocatedCase.policyVersion !== context.run.expectedPolicyVersion ||
    allocatedCase.recipientFingerprint !== context.run.recipientFingerprint ||
    allocatedCase.claimVersion !== context.claim.claimVersion ||
    allocatedCase.leaseExpiresAt !== context.claim.leaseExpiresAt ||
    row.deliveryKey !== context.deliveryKey ||
    row.tenantId !== context.run.targetTenantId ||
    row.providerRequestCount !== 1 ||
    row.providerAcceptanceCount !== 1
  ) {
    throw new Error("Bot reply duplicate-safety observation scope is invalid");
  }
  const requestedAt = Date.parse(row.requestStartedAt);
  const acceptedAt = Date.parse(row.acceptedAt);
  if (
    requestedAt < Date.parse(context.run.requestedAt) ||
    acceptedAt < requestedAt ||
    acceptedAt > Date.parse(context.claim.leaseExpiresAt) ||
    acceptedAt > nowMilliseconds(clock)
  ) {
    throw new Error("Bot reply duplicate-safety observation is not current");
  }
  return Object.freeze({
    firstDispatchOutcome: dispatches[0].outcome,
    secondDispatchOutcome: "duplicate",
  });
}

function requireKillSwitchBinding(
  context: Readonly<BotReplyStagingStepContext>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
  disabled: Readonly<BotReplyStagingProviderKillSwitchResult>,
  dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  row: Readonly<KillSwitchRow>,
  clock: Readonly<BotReplyStagingSendObservationProducerClock>,
): "deferred" {
  if (
    !isRecord(context) || !isRecord(context.run) ||
    !isRecord(context.claim) || !isRecord(allocatedCase) ||
    !isRecord(disabled) || !isRecord(dispatch) ||
    Object.keys(disabled).sort().join(",") !==
      "deliveryKey,disabledPolicyVersion,evidenceProof,operationKey,previousPolicyVersion,recordedAt,state,targetTenantId" ||
    dispatch.outcome !== "deferred" ||
    allocatedCase.source !== "durable-postgres" ||
    allocatedCase.executionMode !== "dispatch" ||
    allocatedCase.caseName !== "kill-switch" ||
    allocatedCase.runKey !== context.run.runKey ||
    allocatedCase.operationKey !== context.operationKey ||
    allocatedCase.deliveryKey !== context.deliveryKey ||
    allocatedCase.subjectDeliveryKey !== context.deliveryKey ||
    allocatedCase.targetTenantId !== context.run.targetTenantId ||
    allocatedCase.connectionVersion !== context.run.expectedConnectionVersion ||
    allocatedCase.policyVersion !== context.run.expectedPolicyVersion ||
    allocatedCase.recipientFingerprint !== context.run.recipientFingerprint ||
    allocatedCase.claimVersion !== context.claim.claimVersion ||
    allocatedCase.leaseExpiresAt !== context.claim.leaseExpiresAt ||
    disabled.operationKey !== context.operationKey ||
    disabled.deliveryKey !== context.deliveryKey ||
    disabled.targetTenantId !== context.run.targetTenantId ||
    disabled.previousPolicyVersion !== context.run.expectedPolicyVersion ||
    disabled.disabledPolicyVersion !== context.run.expectedPolicyVersion + 1 ||
    disabled.state !== "disabled" ||
    typeof disabled.evidenceProof !== "string" ||
    disabled.evidenceProof.length < 16 ||
    disabled.evidenceProof.length > 2_048 ||
    disabled.evidenceProof.trim() !== disabled.evidenceProof ||
    row.deliveryKey !== context.deliveryKey ||
    row.tenantId !== context.run.targetTenantId ||
    row.policyVersion !== disabled.disabledPolicyVersion ||
    row.policyRecordedAt !== disabled.recordedAt ||
    row.nextAttemptAt !== dispatch.retryAt
  ) {
    throw new Error("Bot reply kill-switch observation scope is invalid");
  }
  const disabledAt = Date.parse(row.policyRecordedAt);
  const deferredAt = Date.parse(row.deferredAt);
  const retryAt = Date.parse(row.nextAttemptAt);
  if (
    disabledAt < Date.parse(context.run.requestedAt) ||
    deferredAt < disabledAt ||
    retryAt <= deferredAt ||
    retryAt > Date.parse(context.claim.leaseExpiresAt) ||
    deferredAt > nowMilliseconds(clock)
  ) {
    throw new Error("Bot reply kill-switch observation is not current");
  }
  return "deferred";
}

function configured(
  dependencies: Readonly<PostgresBotReplyStagingSendObservationProducerDependencies>,
): boolean {
  try {
    return typeof dependencies.queries.query === "function" &&
      dependencies.writer.isConfigured() === true &&
      typeof dependencies.clock.now === "function";
  } catch {
    return false;
  }
}

export function createPostgresBotReplyStagingSendObservationProducer(
  dependencies: Readonly<PostgresBotReplyStagingSendObservationProducerDependencies>,
): Readonly<BotReplyStagingSendObservationProducer> {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "clock,queries,writer" ||
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.writer?.isConfigured !== "function" ||
    typeof dependencies.writer?.record !== "function" ||
    typeof dependencies.clock?.now !== "function"
  ) {
    throw new Error("Bot reply send producer dependency is invalid");
  }

  return Object.freeze({
    isConfigured() {
      return configured(dependencies);
    },
    async recordAcceptedSend(
      context: Readonly<BotReplyStagingScenarioContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      dispatch: Readonly<DispatchBotReplyDeliveryResult>,
    ): Promise<BotReplyStagingDurableObservationWriteResult> {
      if (!configured(dependencies)) {
        throw new Error("Bot reply send producer is unavailable");
      }
      const rows = requirePostgresRows(
        await dependencies.queries.query<unknown>(
          postgresBotReplyStagingSendObservationProducerSql.readAcceptance,
          [allocatedCase?.subjectDeliveryKey, context?.run?.targetTenantId],
        ),
        2,
      );
      if (rows.length !== 1) {
        throw new Error("Bot reply send observation is unavailable");
      }
      const row = parseRow(rows[0]);
      const scenario = requireBinding(
        context,
        allocatedCase,
        dispatch,
        row,
        dependencies.clock,
      );
      const dispatchOutcome = dispatch.outcome;
      if (dispatchOutcome !== "accepted" && dispatchOutcome !== "duplicate") {
        throw new Error("Bot reply send dispatch outcome is invalid");
      }
      return dependencies.writer.record({
        runKey: context.run.runKey,
        claimVersion: context.claim.claimVersion,
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        subjectDeliveryKey: allocatedCase.subjectDeliveryKey,
        recipientFingerprint: context.run.recipientFingerprint,
        observedAt: row.acceptedAt,
        factKind: "scenario",
        caseName: scenario,
        scenario,
        providerErrorCode: null,
        dispatchOutcome,
      });
    },
    async recordButtonReply(
      context: Readonly<BotReplyStagingScenarioContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
    ): Promise<BotReplyStagingDurableObservationWriteResult> {
      if (!configured(dependencies)) {
        throw new Error("Bot reply send producer is unavailable");
      }
      const rows = requirePostgresRows(
        await dependencies.queries.query<unknown>(
          postgresBotReplyStagingSendObservationProducerSql.readButtonReply,
          [
            allocatedCase?.subjectDeliveryKey,
            context?.run?.targetTenantId,
            context?.run?.requestedAt,
            context?.claim?.leaseExpiresAt,
          ],
        ),
        2,
      );
      if (rows.length !== 1) {
        throw new Error("Bot reply button observation is unavailable");
      }
      const row = parseButtonReplyRow(rows[0]);
      requireButtonReplyBinding(
        context,
        allocatedCase,
        row,
        dependencies.clock,
      );
      return dependencies.writer.record({
        runKey: context.run.runKey,
        claimVersion: context.claim.claimVersion,
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        subjectDeliveryKey: allocatedCase.subjectDeliveryKey,
        recipientFingerprint: context.run.recipientFingerprint,
        observedAt: row.occurredAt,
        factKind: "scenario",
        caseName: "button-reply",
        scenario: "button-reply",
        providerErrorCode: null,
        dispatchOutcome: null,
      });
    },
    async recordServiceWindowRejection(
      context: Readonly<BotReplyStagingScenarioContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      dispatch: Readonly<DispatchBotReplyDeliveryResult>,
    ): Promise<BotReplyStagingDurableObservationWriteResult> {
      if (!configured(dependencies)) {
        throw new Error("Bot reply send producer is unavailable");
      }
      const rows = requirePostgresRows(
        await dependencies.queries.query<unknown>(
          postgresBotReplyStagingSendObservationProducerSql
            .readServiceWindowRejection,
          [allocatedCase?.subjectDeliveryKey, context?.run?.targetTenantId],
        ),
        2,
      );
      if (rows.length !== 1) {
        throw new Error(
          "Bot reply service-window observation is unavailable",
        );
      }
      const row = parseServiceWindowRejectionRow(rows[0]);
      const dispatchOutcome = requireServiceWindowRejectionBinding(
        context,
        allocatedCase,
        dispatch,
        row,
        dependencies.clock,
      );
      return dependencies.writer.record({
        runKey: context.run.runKey,
        claimVersion: context.claim.claimVersion,
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        subjectDeliveryKey: allocatedCase.subjectDeliveryKey,
        recipientFingerprint: context.run.recipientFingerprint,
        observedAt: row.attemptedAt,
        factKind: "scenario",
        caseName: "customer-window-expired",
        scenario: "customer-window-expired",
        providerErrorCode: 131047,
        dispatchOutcome,
      });
    },
    async recordDuplicateSafety(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      dispatches: readonly [
        Readonly<DispatchBotReplyDeliveryResult>,
        Readonly<DispatchBotReplyDeliveryResult>,
      ],
    ): Promise<BotReplyStagingDurableObservationWriteResult> {
      if (!configured(dependencies)) {
        throw new Error("Bot reply send producer is unavailable");
      }
      const rows = requirePostgresRows(
        await dependencies.queries.query<unknown>(
          postgresBotReplyStagingSendObservationProducerSql
            .readDuplicateSafety,
          [allocatedCase?.subjectDeliveryKey, context?.run?.targetTenantId],
        ),
        2,
      );
      if (rows.length !== 1) {
        throw new Error(
          "Bot reply duplicate-safety observation is unavailable",
        );
      }
      const row = parseDuplicateSafetyRow(rows[0]);
      const outcomes = requireDuplicateSafetyBinding(
        context,
        allocatedCase,
        dispatches,
        row,
        dependencies.clock,
      );
      return dependencies.writer.record({
        runKey: context.run.runKey,
        claimVersion: context.claim.claimVersion,
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        subjectDeliveryKey: allocatedCase.subjectDeliveryKey,
        recipientFingerprint: context.run.recipientFingerprint,
        observedAt: row.acceptedAt,
        factKind: "duplicate-safety",
        caseName: "duplicate-safety",
        firstDispatchOutcome: outcomes.firstDispatchOutcome,
        secondDispatchOutcome: outcomes.secondDispatchOutcome,
        queueDeliveryCount: dispatches.length,
        providerRequestCount: 1,
      });
    },
    async recordKillSwitch(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      disabled: Readonly<BotReplyStagingProviderKillSwitchResult>,
      dispatch: Readonly<DispatchBotReplyDeliveryResult>,
    ): Promise<BotReplyStagingDurableObservationWriteResult> {
      if (!configured(dependencies)) {
        throw new Error("Bot reply send producer is unavailable");
      }
      const rows = requirePostgresRows(
        await dependencies.queries.query<unknown>(
          postgresBotReplyStagingSendObservationProducerSql.readKillSwitch,
          [
            allocatedCase?.subjectDeliveryKey,
            context?.run?.targetTenantId,
            disabled?.disabledPolicyVersion,
            context?.run?.expectedConnectionVersion,
            context?.run?.expectedPolicyVersion,
          ],
        ),
        2,
      );
      if (rows.length !== 1) {
        throw new Error(
          "Bot reply kill-switch observation is unavailable",
        );
      }
      const row = parseKillSwitchRow(rows[0]);
      const dispatchOutcome = requireKillSwitchBinding(
        context,
        allocatedCase,
        disabled,
        dispatch,
        row,
        dependencies.clock,
      );
      return dependencies.writer.record({
        runKey: context.run.runKey,
        claimVersion: context.claim.claimVersion,
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        subjectDeliveryKey: allocatedCase.subjectDeliveryKey,
        recipientFingerprint: context.run.recipientFingerprint,
        observedAt: row.deferredAt,
        factKind: "kill-switch",
        caseName: "kill-switch",
        dispatchOutcome,
        disabledPolicyVersion: row.policyVersion,
        policyState: "disabled",
        providerRequestCount: 0,
      });
    },
  });
}
