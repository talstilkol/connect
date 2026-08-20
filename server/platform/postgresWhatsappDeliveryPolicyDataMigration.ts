import { createHash } from "node:crypto";

import {
  createPostgresDataMigrationProtocol,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresDataMigrationColumnKind,
  PostgresDataMigrationEvidence,
  PostgresDataMigrationPlan,
  PostgresDataMigrationRow,
  PostgresDataMigrationSnapshot,
  PostgresDataMigrationTableContract,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const policyEventKeyPattern =
  /^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$/;
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const portfolioKeyPattern = /^whatsapp_portfolio_v1_[0-9a-f]{64}$/;
const senderKeyPattern = /^whatsapp_sender_v1_[0-9a-f]{64}$/;
const recipientKeyPattern = /^whatsapp_recipient_v1_[0-9a-f]{64}$/;
const deliveryKeyPattern = /^campaign_delivery_v1_[0-9a-f]{64}$/;
const digestPattern = /^[0-9a-f]{64}$/;
const graphVersionPattern = /^v[1-9][0-9]*\.[0-9]+$/;
const unsafeControlPattern =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const portfolioLimits = new Set([250, 2_000, 10_000, 100_000]);
const throughputLimits = new Set([20, 80, 1_000]);
const providerStatuses = new Set([
  "accepted", "sent", "delivered", "read", "failed",
]);
const settlementOutcomes = new Set([
  "delivered", "provider-failed", "cancelled-before-submit",
]);

function invalid(): never {
  throw new Error("whatsapp-delivery-policy-row-invalid");
}

function text(row: PostgresDataMigrationRow, name: string): string {
  const value = row[name];
  if (typeof value !== "string") invalid();
  return value;
}

function nullableText(
  row: PostgresDataMigrationRow,
  name: string,
): string | null {
  const value = row[name];
  if (value === null) return null;
  if (typeof value !== "string") invalid();
  return value;
}

function integer(row: PostgresDataMigrationRow, name: string): number {
  const value = row[name];
  if (!Number.isSafeInteger(value)) invalid();
  return Number(value);
}

function nullableInteger(
  row: PostgresDataMigrationRow,
  name: string,
): number | null {
  const value = row[name];
  if (value === null) return null;
  if (!Number.isSafeInteger(value)) invalid();
  return Number(value);
}

function timestamp(row: PostgresDataMigrationRow, name: string): string {
  const value = text(row, name);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    invalid();
  }
  return value;
}

function nullableTimestamp(
  row: PostgresDataMigrationRow,
  name: string,
): string | null {
  if (row[name] === null) return null;
  return timestamp(row, name);
}

function requireBoundedText(value: string): void {
  if (
    value.length < 1 || value.length > 255 || value.trim() !== value ||
    unsafeControlPattern.test(value)
  ) {
    invalid();
  }
}

function requireCapacity(kind: string, value: number | null): void {
  if (
    !(
      (kind === "bounded" && value !== null && portfolioLimits.has(value)) ||
      (kind === "unlimited" && value === null)
    )
  ) {
    invalid();
  }
}

function requireThroughput(
  maximum: number | null,
  outbound: number | null,
  allowMissing: boolean,
): void {
  if (maximum === null && outbound === null && allowMissing) return;
  if (
    maximum === null || outbound === null || !throughputLimits.has(maximum) ||
    outbound < 1 || outbound >= maximum
  ) {
    invalid();
  }
}

function sha256Json(value: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validatePolicyEvent(row: PostgresDataMigrationRow): void {
  const eventKey = text(row, "event_key");
  const tenantId = integer(row, "tenant_id");
  const connectionVersion = integer(row, "connection_version");
  const policyVersion = integer(row, "policy_version");
  const deliveryState = text(row, "delivery_state");
  const limitKind = text(row, "portfolio_limit_kind");
  const limitValue = nullableInteger(row, "portfolio_limit_value");
  const maximum = nullableInteger(
    row,
    "phone_throughput_messages_per_second",
  );
  const outbound = nullableInteger(
    row,
    "maximum_outbound_messages_per_second",
  );
  const evidenceCheckedAt = timestamp(row, "evidence_checked_at");
  const evidenceExpiresAt = timestamp(row, "evidence_expires_at");
  const recordedAt = timestamp(row, "recorded_at");
  const actor = text(row, "actor_external_user_id");
  const graphVersion = text(row, "meta_graph_api_version");
  const evidenceDigest = text(row, "evidence_digest");
  const duration = integer(row, "reservation_duration_seconds");
  requireCapacity(limitKind, limitValue);
  requireThroughput(maximum, outbound, deliveryState === "disabled");
  requireBoundedText(actor);
  const portfolioCapacity = limitKind === "bounded"
    ? { kind: "bounded", maximumUniqueRecipients: limitValue }
    : { kind: "unlimited" };
  const phoneThroughput = maximum === null
    ? null
    : {
        maximumMessagesPerSecond: maximum,
        maximumOutboundMessagesPerSecond: outbound,
      };
  const expectedKey = `whatsapp_delivery_policy_event_v1_${sha256Json({
    namespace: "whatsapp_delivery_policy_event_v1",
    tenantId,
    connectionVersion,
    expectedPolicyVersion: policyVersion - 1,
    deliveryState,
    portfolioCapacity,
    phoneThroughput,
    reservationDurationSeconds: duration,
    metaGraphApiVersion: graphVersion,
    evidenceDigest,
    evidenceCheckedAt,
    evidenceExpiresAt,
    actorExternalUserId: actor,
  })}`;
  if (
    !policyEventKeyPattern.test(eventKey) || eventKey !== expectedKey ||
    !["enabled", "disabled"].includes(deliveryState) ||
    duration < 6 || duration > 86_400 ||
    !graphVersionPattern.test(graphVersion) ||
    !digestPattern.test(evidenceDigest) ||
    evidenceCheckedAt > recordedAt || evidenceCheckedAt >= evidenceExpiresAt ||
    (deliveryState === "enabled" && recordedAt >= evidenceExpiresAt) ||
    timestamp(row, "created_at") !== recordedAt
  ) {
    invalid();
  }
}

function validateReservation(row: PostgresDataMigrationRow): void {
  const reservedAt = timestamp(row, "reserved_at");
  const pairUntil = timestamp(row, "pair_reserved_until");
  const expiresAt = timestamp(row, "reservation_expires_at");
  const policyKey = nullableText(row, "policy_event_key");
  const maximum = nullableInteger(
    row,
    "phone_throughput_messages_per_second",
  );
  const outbound = nullableInteger(
    row,
    "maximum_outbound_messages_per_second",
  );
  requireCapacity(
    text(row, "portfolio_limit_kind"),
    nullableInteger(row, "portfolio_limit_value"),
  );
  requireThroughput(maximum, outbound, policyKey === null);
  if (
    !reservationKeyPattern.test(text(row, "reservation_key")) ||
    !portfolioKeyPattern.test(text(row, "portfolio_key")) ||
    !senderKeyPattern.test(text(row, "sender_key")) ||
    !recipientKeyPattern.test(text(row, "recipient_key")) ||
    ((policyKey === null) !== (maximum === null && outbound === null)) ||
    (policyKey !== null && !policyEventKeyPattern.test(policyKey)) ||
    Date.parse(pairUntil) !== Date.parse(reservedAt) + 6_000 ||
    expiresAt < pairUntil ||
    Date.parse(expiresAt) > Date.parse(reservedAt) + 86_400_000 ||
    timestamp(row, "created_at") !== reservedAt
  ) {
    invalid();
  }
}

function validatePairState(row: PostgresDataMigrationRow): void {
  if (
    !senderKeyPattern.test(text(row, "sender_key")) ||
    !recipientKeyPattern.test(text(row, "recipient_key")) ||
    !reservationKeyPattern.test(text(row, "reservation_key"))
  ) {
    invalid();
  }
  timestamp(row, "reserved_until");
  timestamp(row, "updated_at");
}

function validatePortfolioState(row: PostgresDataMigrationRow): void {
  const activeKey = nullableText(row, "active_reservation_key");
  const activeExpires = nullableTimestamp(
    row,
    "active_reservation_expires_at",
  );
  const deliveredAt = nullableTimestamp(row, "last_delivered_at");
  const updatedAt = timestamp(row, "updated_at");
  if (
    !portfolioKeyPattern.test(text(row, "portfolio_key")) ||
    !recipientKeyPattern.test(text(row, "recipient_key")) ||
    ((activeKey === null) !== (activeExpires === null)) ||
    (activeKey !== null && !reservationKeyPattern.test(activeKey)) ||
    (deliveredAt !== null && updatedAt < deliveredAt)
  ) {
    invalid();
  }
}

function validateSettlement(row: PostgresDataMigrationRow): void {
  const settledAt = timestamp(row, "settled_at");
  if (
    !reservationKeyPattern.test(text(row, "reservation_key")) ||
    !settlementOutcomes.has(text(row, "outcome")) ||
    timestamp(row, "created_at") !== settledAt
  ) {
    invalid();
  }
}

function requireCooldownScope(scope: string, code: number): void {
  if (
    !(
      (scope === "sender" && code === 130429) ||
      (scope === "portfolio-recipient" && code === 131049) ||
      (scope === "pair" && code === 131056)
    )
  ) {
    invalid();
  }
}

function validateCooldownEvent(row: PostgresDataMigrationRow): void {
  const code = integer(row, "provider_error_code");
  const observedAt = timestamp(row, "observed_at");
  const blockedUntil = timestamp(row, "blocked_until");
  requireCooldownScope(text(row, "scope"), code);
  if (
    !reservationKeyPattern.test(text(row, "reservation_key")) ||
    blockedUntil <= observedAt ||
    Date.parse(blockedUntil) > Date.parse(observedAt) + 86_400_000 ||
    (code === 131049 &&
      Date.parse(blockedUntil) !== Date.parse(observedAt) + 86_400_000) ||
    timestamp(row, "created_at") !== observedAt
  ) {
    invalid();
  }
}

function validateCooldownState(row: PostgresDataMigrationRow): void {
  const scope = text(row, "scope");
  const sender = text(row, "sender_key");
  const recipient = text(row, "recipient_key");
  const code = integer(row, "provider_error_code");
  requireCooldownScope(scope, code);
  const subjectValid =
    (scope === "sender" && senderKeyPattern.test(sender) && recipient === "") ||
    (scope === "portfolio-recipient" && sender === "" &&
      recipientKeyPattern.test(recipient)) ||
    (scope === "pair" && senderKeyPattern.test(sender) &&
      recipientKeyPattern.test(recipient));
  if (
    !subjectValid ||
    !reservationKeyPattern.test(text(row, "reservation_key"))
  ) {
    invalid();
  }
  timestamp(row, "blocked_until");
  timestamp(row, "updated_at");
}

function validateProviderLink(row: PostgresDataMigrationRow): void {
  const status = text(row, "provider_status");
  const eventKey = nullableText(row, "last_status_event_key");
  const eventAt = nullableTimestamp(row, "last_status_event_at");
  const outcome = nullableText(row, "terminal_outcome");
  const settledAt = nullableTimestamp(row, "terminal_settled_at");
  const acceptedAt = timestamp(row, "accepted_at");
  const providerMessageId = text(row, "provider_message_id");
  requireBoundedText(providerMessageId);
  const terminalValid =
    (["accepted", "sent"].includes(status) && outcome === null &&
      settledAt === null) ||
    (["delivered", "read"].includes(status) && outcome === "delivered" &&
      settledAt !== null) ||
    (status === "failed" && outcome === "provider-failed" &&
      settledAt !== null);
  if (
    !deliveryKeyPattern.test(text(row, "delivery_key")) ||
    !reservationKeyPattern.test(text(row, "reservation_key")) ||
    !providerStatuses.has(status) ||
    ((eventKey === null) !== (eventAt === null)) ||
    (eventKey !== null && !digestPattern.test(eventKey)) ||
    !terminalValid || timestamp(row, "created_at") !== acceptedAt ||
    timestamp(row, "updated_at") < acceptedAt
  ) {
    invalid();
  }
}

function column(
  name: string,
  kind: PostgresDataMigrationColumnKind,
  nullable = false,
) {
  return Object.freeze({
    name,
    kind,
    ...(nullable ? { nullable: true as const } : {}),
  });
}

export const POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS =
  Object.freeze([
    Object.freeze({
      name: "whatsapp_campaign_delivery_policy_events",
      columns: Object.freeze([
        column("event_key", "text"),
        column("tenant_id", "positive-integer"),
        column("connection_version", "positive-integer"),
        column("policy_version", "positive-integer"),
        column("delivery_state", "text"),
        column("portfolio_limit_kind", "text"),
        column("portfolio_limit_value", "positive-integer", true),
        column("reservation_duration_seconds", "positive-integer"),
        column("meta_graph_api_version", "text"),
        column("evidence_digest", "text"),
        column("evidence_checked_at", "timestamp"),
        column("evidence_expires_at", "timestamp"),
        column("actor_external_user_id", "text"),
        column("recorded_at", "timestamp"),
        column("created_at", "timestamp"),
        column("phone_throughput_messages_per_second", "positive-integer", true),
        column("maximum_outbound_messages_per_second", "positive-integer", true),
      ]),
      orderBy: Object.freeze(["tenant_id", "policy_version"]),
      validate: validatePolicyEvent,
    }),
    Object.freeze({
      name: "whatsapp_rate_limit_reservations",
      columns: Object.freeze([
        column("reservation_key", "text"),
        column("tenant_id", "positive-integer"),
        column("portfolio_key", "text"),
        column("sender_key", "text"),
        column("recipient_key", "text"),
        column("portfolio_limit_kind", "text"),
        column("portfolio_limit_value", "positive-integer", true),
        column("reserved_at", "timestamp"),
        column("pair_reserved_until", "timestamp"),
        column("reservation_expires_at", "timestamp"),
        column("created_at", "timestamp"),
        column("policy_event_key", "text", true),
        column("phone_throughput_messages_per_second", "positive-integer", true),
        column("maximum_outbound_messages_per_second", "positive-integer", true),
      ]),
      orderBy: Object.freeze(["reserved_at", "reservation_key"]),
      validate: validateReservation,
    }),
    Object.freeze({
      name: "whatsapp_pair_rate_limit_state",
      columns: Object.freeze([
        column("sender_key", "text"),
        column("recipient_key", "text"),
        column("reservation_key", "text"),
        column("reserved_until", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["sender_key", "recipient_key"]),
      validate: validatePairState,
    }),
    Object.freeze({
      name: "whatsapp_portfolio_recipient_rate_limit_state",
      columns: Object.freeze([
        column("portfolio_key", "text"),
        column("recipient_key", "text"),
        column("active_reservation_key", "text", true),
        column("active_reservation_expires_at", "timestamp", true),
        column("last_delivered_at", "timestamp", true),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["portfolio_key", "recipient_key"]),
      validate: validatePortfolioState,
    }),
    Object.freeze({
      name: "whatsapp_rate_limit_settlements",
      columns: Object.freeze([
        column("reservation_key", "text"),
        column("outcome", "text"),
        column("settled_at", "timestamp"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["settled_at", "reservation_key"]),
      validate: validateSettlement,
    }),
    Object.freeze({
      name: "whatsapp_provider_cooldown_events",
      columns: Object.freeze([
        column("reservation_key", "text"),
        column("scope", "text"),
        column("provider_error_code", "positive-integer"),
        column("observed_at", "timestamp"),
        column("blocked_until", "timestamp"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["observed_at", "reservation_key"]),
      validate: validateCooldownEvent,
    }),
    Object.freeze({
      name: "whatsapp_provider_cooldown_state",
      columns: Object.freeze([
        column("scope", "text"),
        column("sender_key", "text"),
        column("recipient_key", "text"),
        column("reservation_key", "text"),
        column("provider_error_code", "positive-integer"),
        column("blocked_until", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["scope", "sender_key", "recipient_key"]),
      validate: validateCooldownState,
    }),
    Object.freeze({
      name: "campaign_delivery_provider_links",
      columns: Object.freeze([
        column("delivery_key", "text"),
        column("tenant_id", "positive-integer"),
        column("provider_message_id", "text"),
        column("reservation_key", "text"),
        column("provider_status", "text"),
        column("last_status_event_key", "text", true),
        column("last_status_event_at", "timestamp", true),
        column("terminal_outcome", "text", true),
        column("terminal_settled_at", "timestamp", true),
        column("accepted_at", "timestamp"),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "delivery_key"]),
      validate: validateProviderLink,
    }),
  ] satisfies readonly PostgresDataMigrationTableContract[]);

async function requireNoRows(
  transaction: PostgresQueryExecutor,
  sql: string,
  code: string,
): Promise<void> {
  const result = await transaction.query(sql, []);
  if (result.rowCount !== 0) throw new Error(code);
}

async function verifyLoadedState(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  await requireNoRows(transaction, `
    SELECT 1
    FROM whatsapp_campaign_delivery_policy_events AS policy
    LEFT JOIN meta_connections AS connection
      ON connection.tenant_id = policy.tenant_id
    LEFT JOIN audit_logs AS audit
      ON audit.tenant_id = policy.tenant_id
      AND audit.actor_external_user_id = policy.actor_external_user_id
      AND audit.action = 'whatsapp.delivery_policy.recorded'
      AND audit.target_type = 'whatsapp_campaign_delivery_policy'
      AND audit.target_id = policy.tenant_id::text
      AND audit.idempotency_key = policy.event_key
      AND audit.metadata_json IS NULL
    WHERE connection.tenant_id IS NULL OR audit.id IS NULL
      OR policy.connection_version > connection.version
      OR policy.policy_version <> (
        SELECT count(*) FROM whatsapp_campaign_delivery_policy_events AS item
        WHERE item.tenant_id = policy.tenant_id
          AND item.policy_version <= policy.policy_version
      )
    LIMIT 1`, "policy-lineage-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM whatsapp_campaign_delivery_policy_events AS policy
    LEFT JOIN whatsapp_campaign_delivery_policy_events AS previous
      ON previous.tenant_id = policy.tenant_id
      AND previous.policy_version = policy.policy_version - 1
    WHERE policy.delivery_state = 'disabled' AND (
      previous.event_key IS NULL OR previous.delivery_state <> 'enabled'
      OR previous.connection_version <> policy.connection_version
      OR previous.portfolio_limit_kind <> policy.portfolio_limit_kind
      OR previous.portfolio_limit_value IS DISTINCT FROM policy.portfolio_limit_value
      OR previous.reservation_duration_seconds <> policy.reservation_duration_seconds
      OR previous.meta_graph_api_version <> policy.meta_graph_api_version
      OR previous.evidence_digest <> policy.evidence_digest
      OR previous.evidence_checked_at <> policy.evidence_checked_at
      OR previous.evidence_expires_at <> policy.evidence_expires_at
      OR previous.phone_throughput_messages_per_second
        IS DISTINCT FROM policy.phone_throughput_messages_per_second
      OR previous.maximum_outbound_messages_per_second
        IS DISTINCT FROM policy.maximum_outbound_messages_per_second
    )
    LIMIT 1`, "policy-disable-history-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM whatsapp_rate_limit_reservations AS reservation
    LEFT JOIN whatsapp_campaign_delivery_policy_events AS policy
      ON policy.event_key = reservation.policy_event_key
      AND policy.tenant_id = reservation.tenant_id
      AND policy.delivery_state = 'enabled'
      AND policy.portfolio_limit_kind = reservation.portfolio_limit_kind
      AND policy.portfolio_limit_value IS NOT DISTINCT FROM reservation.portfolio_limit_value
      AND policy.phone_throughput_messages_per_second
        = reservation.phone_throughput_messages_per_second
      AND policy.maximum_outbound_messages_per_second
        = reservation.maximum_outbound_messages_per_second
      AND policy.evidence_checked_at <= reservation.reserved_at
      AND policy.recorded_at <= reservation.reserved_at
      AND reservation.reserved_at < policy.evidence_expires_at
    LEFT JOIN whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = reservation.reservation_key
      AND reservation.reserved_at <= settlement.settled_at
    WHERE settlement.reservation_key IS NULL
      OR (reservation.policy_event_key IS NOT NULL AND policy.event_key IS NULL)
      OR (reservation.policy_event_key IS NULL AND (
        reservation.phone_throughput_messages_per_second IS NOT NULL
        OR reservation.maximum_outbound_messages_per_second IS NOT NULL
      ))
      OR EXISTS (
        SELECT 1 FROM whatsapp_campaign_delivery_policy_events AS later
        WHERE later.tenant_id = reservation.tenant_id
          AND later.policy_version > policy.policy_version
          AND later.recorded_at <= reservation.reserved_at
      )
    LIMIT 1`, "reservation-policy-or-settlement-invalid");

  await requireNoRows(transaction, `
    SELECT 1 FROM whatsapp_rate_limit_reservations
    WHERE template_category IS NOT NULL
    LIMIT 1`, "legacy-category-not-explicitly-unknown");

  await requireNoRows(transaction, `
    SELECT 1
    FROM whatsapp_pair_rate_limit_state AS state
    LEFT JOIN whatsapp_rate_limit_reservations AS reservation
      ON reservation.reservation_key = state.reservation_key
      AND reservation.sender_key = state.sender_key
      AND reservation.recipient_key = state.recipient_key
    LEFT JOIN whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = reservation.reservation_key
    WHERE reservation.reservation_key IS NULL
      OR EXISTS (
        SELECT 1 FROM whatsapp_rate_limit_reservations AS later
        WHERE later.sender_key = state.sender_key
          AND later.recipient_key = state.recipient_key
          AND (later.reserved_at, later.reservation_key) >
            (reservation.reserved_at, reservation.reservation_key)
      )
      OR state.reserved_until <> CASE
        WHEN settlement.outcome = 'cancelled-before-submit'
          AND settlement.settled_at < reservation.pair_reserved_until
        THEN settlement.settled_at ELSE reservation.pair_reserved_until END
      OR state.updated_at <> (
        SELECT max(moment) FROM (
          SELECT item.reserved_at AS moment
          FROM whatsapp_rate_limit_reservations AS item
          WHERE item.sender_key = state.sender_key
            AND item.recipient_key = state.recipient_key
          UNION ALL
          SELECT item_settlement.settled_at AS moment
          FROM whatsapp_rate_limit_reservations AS item
          JOIN whatsapp_rate_limit_settlements AS item_settlement
            USING (reservation_key)
          WHERE item.sender_key = state.sender_key
            AND item.recipient_key = state.recipient_key
        ) AS moments
      )
    LIMIT 1`, "pair-projection-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM whatsapp_portfolio_recipient_rate_limit_state AS state
    WHERE state.active_reservation_key IS NOT NULL
      OR state.active_reservation_expires_at IS NOT NULL
      OR state.last_delivered_at IS DISTINCT FROM (
        SELECT max(settlement.settled_at)
        FROM whatsapp_rate_limit_reservations AS reservation
        JOIN whatsapp_rate_limit_settlements AS settlement USING (reservation_key)
        WHERE reservation.portfolio_key = state.portfolio_key
          AND reservation.recipient_key = state.recipient_key
          AND settlement.outcome = 'delivered'
      )
      OR state.updated_at <> (
        SELECT max(moment) FROM (
          SELECT item.reserved_at AS moment
          FROM whatsapp_rate_limit_reservations AS item
          WHERE item.portfolio_key = state.portfolio_key
            AND item.recipient_key = state.recipient_key
          UNION ALL
          SELECT item_settlement.settled_at AS moment
          FROM whatsapp_rate_limit_reservations AS item
          JOIN whatsapp_rate_limit_settlements AS item_settlement
            USING (reservation_key)
          WHERE item.portfolio_key = state.portfolio_key
            AND item.recipient_key = state.recipient_key
        ) AS moments
      )
    LIMIT 1`, "portfolio-projection-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM whatsapp_provider_cooldown_events AS event
    LEFT JOIN whatsapp_rate_limit_reservations AS reservation
      ON reservation.reservation_key = event.reservation_key
    LEFT JOIN whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = event.reservation_key
      AND settlement.outcome = 'provider-failed'
      AND settlement.settled_at = event.observed_at
    WHERE reservation.reservation_key IS NULL OR settlement.reservation_key IS NULL
    LIMIT 1`, "cooldown-event-proof-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM whatsapp_provider_cooldown_state AS state
    LEFT JOIN whatsapp_provider_cooldown_events AS event
      ON event.reservation_key = state.reservation_key
      AND event.scope = state.scope
      AND event.provider_error_code = state.provider_error_code
      AND event.blocked_until = state.blocked_until
      AND event.observed_at = state.updated_at
    LEFT JOIN whatsapp_rate_limit_reservations AS reservation
      ON reservation.reservation_key = state.reservation_key
    WHERE event.reservation_key IS NULL OR reservation.reservation_key IS NULL
      OR (state.scope = 'sender' AND (
        state.sender_key <> reservation.sender_key OR state.recipient_key <> ''))
      OR (state.scope = 'portfolio-recipient' AND (
        state.sender_key <> '' OR state.recipient_key <> reservation.recipient_key))
      OR (state.scope = 'pair' AND (
        state.sender_key <> reservation.sender_key
        OR state.recipient_key <> reservation.recipient_key))
      OR EXISTS (
        SELECT 1
        FROM whatsapp_provider_cooldown_events AS later_event
        JOIN whatsapp_rate_limit_reservations AS later_reservation
          USING (reservation_key)
        WHERE later_event.scope = state.scope
          AND later_event.blocked_until > state.blocked_until
          AND (
            (state.scope = 'sender'
              AND later_reservation.sender_key = state.sender_key)
            OR (state.scope = 'portfolio-recipient'
              AND later_reservation.recipient_key = state.recipient_key)
            OR (state.scope = 'pair'
              AND later_reservation.sender_key = state.sender_key
              AND later_reservation.recipient_key = state.recipient_key)
          )
      )
    LIMIT 1`, "cooldown-projection-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM campaign_delivery_provider_links AS link
    LEFT JOIN campaign_recipients AS recipient
      ON recipient.delivery_key = link.delivery_key
      AND recipient.tenant_id = link.tenant_id
    LEFT JOIN whatsapp_rate_limit_reservations AS reservation
      ON reservation.reservation_key = link.reservation_key
      AND reservation.tenant_id = link.tenant_id
    LEFT JOIN whatsapp_rate_limit_settlements AS settlement
      ON settlement.reservation_key = link.reservation_key
      AND settlement.outcome = link.terminal_outcome
      AND settlement.settled_at = link.terminal_settled_at
    WHERE recipient.delivery_key IS NULL OR reservation.reservation_key IS NULL
      OR link.terminal_outcome IS NULL OR settlement.reservation_key IS NULL
      OR recipient.status <> CASE link.provider_status
        WHEN 'delivered' THEN 'delivered'
        WHEN 'read' THEN 'read'
        WHEN 'failed' THEN 'failed'
        ELSE recipient.status END
      OR recipient.accepted_at <> link.accepted_at
      OR recipient.updated_at <> link.updated_at
      OR recipient.last_error_code IS DISTINCT FROM CASE
        WHEN link.provider_status = 'failed' THEN 'META_DELIVERY_FAILED'
        ELSE NULL END
    LIMIT 1`, "provider-link-projection-invalid");
}

const protocol = createPostgresDataMigrationProtocol({
  version: "connect_postgres_whatsapp_delivery_policy_data_v1",
  planKind: "postgres-whatsapp-delivery-policy-migration-plan",
  evidenceKind: "postgres-whatsapp-delivery-policy-migration-evidence",
  advisoryLockKey: [1129270867, 6],
  tables: POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS,
  triggerDisabledTables:
    POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS.map(
      ({ name }) => name,
    ),
  verifyLoadedState,
});

export type PostgresWhatsappDeliveryPolicyDataSnapshot =
  PostgresDataMigrationSnapshot;
export type PostgresWhatsappDeliveryPolicyDataMigrationPlan =
  PostgresDataMigrationPlan;
export type PostgresWhatsappDeliveryPolicyDataMigrationEvidence =
  PostgresDataMigrationEvidence;

export const createPostgresWhatsappDeliveryPolicyDataSnapshot =
  protocol.createSnapshot;
export const createPostgresWhatsappDeliveryPolicyDataMigrationPlan =
  protocol.createPlan;
export const executePostgresWhatsappDeliveryPolicyDataMigration =
  protocol.execute;

export async function migratePostgresWhatsappDeliveryPolicyData(
  input: Readonly<{
    snapshot: PostgresWhatsappDeliveryPolicyDataSnapshot;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    createdAt: string;
    expiresAt: string;
    now: string;
  }>,
): Promise<PostgresWhatsappDeliveryPolicyDataMigrationEvidence> {
  const plan = createPostgresWhatsappDeliveryPolicyDataMigrationPlan({
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    evidenceHmacKey: input.evidenceHmacKey,
  });
  return executePostgresWhatsappDeliveryPolicyDataMigration({
    plan,
    transactions: input.transactions,
    evidenceHmacKey: input.evidenceHmacKey,
    now: input.now,
  });
}
