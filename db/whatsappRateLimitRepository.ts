import {
  whatsappProviderCooldownErrorCodes,
  whatsappProviderCooldownScopes,
  whatsappPortfolioMessagingLimits,
  whatsappPhoneThroughputLimits,
  whatsappRateLimitSettlementOutcomes,
  type WhatsappProviderCooldown,
  type WhatsappProviderCooldownErrorCode,
  type WhatsappProviderCooldownResult,
  type WhatsappProviderCooldownScope,
  type WhatsappPortfolioCapacity,
  type WhatsappPhoneThroughputPolicy,
  type WhatsappPortfolioMessagingLimit,
  type WhatsappRateLimitReservation,
  type WhatsappRateLimitReservationResult,
  type WhatsappRateLimitSettlement,
  type WhatsappRateLimitSettlementOutcome,
  type WhatsappRateLimitSettlementResult,
} from "../shared/domain/whatsappRateLimit.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const ONE_DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;
const PAIR_INTERVAL_MILLISECONDS = 6 * 1_000;

const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const portfolioKeyPattern =
  /^whatsapp_portfolio_v1_[0-9a-f]{64}$/;
const senderKeyPattern =
  /^whatsapp_sender_v1_[0-9a-f]{64}$/;
const recipientKeyPattern =
  /^whatsapp_recipient_v1_[0-9a-f]{64}$/;
const policyEventKeyPattern =
  /^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const RESERVATION_COLUMNS_SQL = `
  reservation_key AS reservationKey,
  tenant_id AS tenantId,
  portfolio_key AS portfolioKey,
  sender_key AS senderKey,
  recipient_key AS recipientKey,
  policy_event_key AS policyEventKey,
  phone_throughput_messages_per_second AS phoneThroughputMessagesPerSecond,
  maximum_outbound_messages_per_second AS maximumOutboundMessagesPerSecond,
  portfolio_limit_kind AS portfolioLimitKind,
  portfolio_limit_value AS portfolioLimitValue,
  reserved_at AS reservedAt,
  pair_reserved_until AS pairReservedUntil,
  reservation_expires_at AS reservationExpiresAt
`;

const RESERVE_SQL = `
  INSERT INTO whatsapp_rate_limit_reservations (
    reservation_key,
    tenant_id,
    portfolio_key,
    sender_key,
    recipient_key,
    policy_event_key,
    phone_throughput_messages_per_second,
    maximum_outbound_messages_per_second,
    portfolio_limit_kind,
    portfolio_limit_value,
    reserved_at,
    pair_reserved_until,
    reservation_expires_at,
    created_at
  )
  SELECT
    ?1,
    ?2,
    ?3,
    ?4,
    ?5,
    ?13,
    ?14,
    ?15,
    ?6,
    ?7,
    ?8,
    ?9,
    ?10,
    ?8
  WHERE EXISTS (
    SELECT 1
    FROM tenants
    WHERE id = ?2
  )
    AND NOT EXISTS (
      SELECT 1
      FROM whatsapp_provider_cooldown_state
      WHERE blocked_until > ?8
        AND (
          (
            scope = 'sender'
            AND sender_key = ?4
            AND recipient_key = ''
          )
          OR (
            scope = 'portfolio-recipient'
            AND ?12 = 'MARKETING'
            AND sender_key = ''
            AND recipient_key = ?5
          )
          OR (
            scope = 'pair'
            AND sender_key = ?4
            AND recipient_key = ?5
          )
        )
    )
    AND (
      SELECT count(*)
      FROM whatsapp_rate_limit_reservations
      WHERE sender_key = ?4
        AND reserved_at > ?16
        AND reserved_at <= ?8
    ) < ?15
    AND NOT EXISTS (
      SELECT 1
      FROM whatsapp_pair_rate_limit_state
      WHERE sender_key = ?4
        AND recipient_key = ?5
        AND reserved_until > ?8
    )
    AND NOT EXISTS (
      SELECT 1
      FROM whatsapp_portfolio_recipient_rate_limit_state
      WHERE portfolio_key = ?3
        AND recipient_key = ?5
        AND active_reservation_key IS NOT NULL
        AND active_reservation_expires_at > ?8
    )
    AND (
      ?6 = 'unlimited'
      OR EXISTS (
        SELECT 1
        FROM whatsapp_portfolio_recipient_rate_limit_state
        WHERE portfolio_key = ?3
          AND recipient_key = ?5
          AND last_delivered_at >= ?11
      )
      OR (
        SELECT count(*)
        FROM whatsapp_portfolio_recipient_rate_limit_state
        WHERE portfolio_key = ?3
          AND (
            last_delivered_at >= ?11
            OR (
              active_reservation_key IS NOT NULL
              AND active_reservation_expires_at > ?8
            )
          )
      ) < ?7
    )
  ON CONFLICT (reservation_key) DO NOTHING
  RETURNING ${RESERVATION_COLUMNS_SQL}
`;

const FIND_RESERVATION_SQL = `
  SELECT ${RESERVATION_COLUMNS_SQL}
  FROM whatsapp_rate_limit_reservations
  WHERE reservation_key = ?1
  LIMIT 1
`;

const FIND_BLOCKER_SQL = `
  SELECT
    EXISTS (
      SELECT 1
      FROM tenants
      WHERE id = ?1
    ) AS tenantFound,
    (
      SELECT blocked_until
      FROM whatsapp_provider_cooldown_state
      WHERE blocked_until > ?5
        AND (
          (
            scope = 'sender'
            AND sender_key = ?3
            AND recipient_key = ''
          )
          OR (
            scope = 'portfolio-recipient'
            AND ?7 = 'MARKETING'
            AND sender_key = ''
            AND recipient_key = ?4
          )
          OR (
            scope = 'pair'
            AND sender_key = ?3
            AND recipient_key = ?4
          )
        )
      ORDER BY blocked_until DESC, scope ASC
      LIMIT 1
    ) AS providerBlockedUntil,
    (
      SELECT scope
      FROM whatsapp_provider_cooldown_state
      WHERE blocked_until > ?5
        AND (
          (
            scope = 'sender'
            AND sender_key = ?3
            AND recipient_key = ''
          )
          OR (
            scope = 'portfolio-recipient'
            AND ?7 = 'MARKETING'
            AND sender_key = ''
            AND recipient_key = ?4
          )
          OR (
            scope = 'pair'
            AND sender_key = ?3
            AND recipient_key = ?4
          )
        )
      ORDER BY blocked_until DESC, scope ASC
      LIMIT 1
    ) AS providerCooldownScope,
    (
      SELECT provider_error_code
      FROM whatsapp_provider_cooldown_state
      WHERE blocked_until > ?5
        AND (
          (
            scope = 'sender'
            AND sender_key = ?3
            AND recipient_key = ''
          )
          OR (
            scope = 'portfolio-recipient'
            AND ?7 = 'MARKETING'
            AND sender_key = ''
            AND recipient_key = ?4
          )
          OR (
            scope = 'pair'
            AND sender_key = ?3
            AND recipient_key = ?4
          )
        )
      ORDER BY blocked_until DESC, scope ASC
      LIMIT 1
    ) AS providerErrorCode,
    (
      SELECT reserved_until
      FROM whatsapp_pair_rate_limit_state
      WHERE sender_key = ?3
        AND recipient_key = ?4
      LIMIT 1
    ) AS pairReservedUntil,
    (
      SELECT active_reservation_expires_at
      FROM whatsapp_portfolio_recipient_rate_limit_state
      WHERE portfolio_key = ?2
        AND recipient_key = ?4
      LIMIT 1
    ) AS activeReservationExpiresAt,
    (
      SELECT count(*)
      FROM whatsapp_rate_limit_reservations
      WHERE sender_key = ?3
        AND reserved_at > ?8
        AND reserved_at <= ?5
    ) AS throughputReservationCount,
    (
      SELECT min(reserved_at)
      FROM whatsapp_rate_limit_reservations
      WHERE sender_key = ?3
        AND reserved_at > ?8
        AND reserved_at <= ?5
    ) AS throughputOldestReservedAt,
    (
      SELECT count(*)
      FROM whatsapp_portfolio_recipient_rate_limit_state
      WHERE portfolio_key = ?2
        AND (
          last_delivered_at >= ?6
          OR (
            active_reservation_key IS NOT NULL
            AND active_reservation_expires_at > ?5
          )
        )
    ) AS occupiedUniqueRecipients
`;

const INSERT_SETTLEMENT_SQL = `
  INSERT INTO whatsapp_rate_limit_settlements (
    reservation_key,
    outcome,
    settled_at,
    created_at
  )
  SELECT ?1, ?2, ?3, ?3
  FROM whatsapp_rate_limit_reservations
  WHERE reservation_key = ?1
    AND reserved_at <= ?3
  ON CONFLICT (reservation_key) DO NOTHING
  RETURNING
    reservation_key AS reservationKey,
    outcome,
    settled_at AS settledAt
`;

const FIND_SETTLEMENT_SQL = `
  SELECT
    reservation_key AS reservationKey,
    outcome,
    settled_at AS settledAt
  FROM whatsapp_rate_limit_settlements
  WHERE reservation_key = ?1
  LIMIT 1
`;

const INSERT_PROVIDER_COOLDOWN_SQL = `
  INSERT INTO whatsapp_provider_cooldown_events (
    reservation_key,
    scope,
    provider_error_code,
    observed_at,
    blocked_until,
    created_at
  ) VALUES (?1, ?2, ?3, ?4, ?5, ?4)
  ON CONFLICT (reservation_key) DO NOTHING
`;

const FIND_PROVIDER_COOLDOWN_SQL = `
  SELECT
    reservation_key AS reservationKey,
    scope,
    provider_error_code AS providerErrorCode,
    observed_at AS observedAt,
    blocked_until AS blockedUntil
  FROM whatsapp_provider_cooldown_events
  WHERE reservation_key = ?1
  LIMIT 1
`;

const INSERT_PROVIDER_FAILED_SETTLEMENT_SQL = `
  INSERT INTO whatsapp_rate_limit_settlements (
    reservation_key,
    outcome,
    settled_at,
    created_at
  )
  SELECT ?1, 'provider-failed', ?2, ?2
  FROM whatsapp_rate_limit_reservations
  WHERE reservation_key = ?1
    AND reserved_at <= ?2
  ON CONFLICT (reservation_key) DO NOTHING
`;

interface ReservationRow {
  reservationKey: unknown;
  tenantId: unknown;
  portfolioKey: unknown;
  senderKey: unknown;
  recipientKey: unknown;
  policyEventKey: unknown;
  phoneThroughputMessagesPerSecond: unknown;
  maximumOutboundMessagesPerSecond: unknown;
  portfolioLimitKind: unknown;
  portfolioLimitValue: unknown;
  reservedAt: unknown;
  pairReservedUntil: unknown;
  reservationExpiresAt: unknown;
}

interface BlockerRow {
  tenantFound: unknown;
  providerBlockedUntil: unknown;
  providerCooldownScope: unknown;
  providerErrorCode: unknown;
  pairReservedUntil: unknown;
  activeReservationExpiresAt: unknown;
  throughputReservationCount: unknown;
  throughputOldestReservedAt: unknown;
  occupiedUniqueRecipients: unknown;
}

interface SettlementRow {
  reservationKey: unknown;
  outcome: unknown;
  settledAt: unknown;
}

interface ProviderCooldownRow {
  reservationKey: unknown;
  scope: unknown;
  providerErrorCode: unknown;
  observedAt: unknown;
  blockedUntil: unknown;
}

export interface WhatsappRateLimitReservationCommand {
  reservationKey: unknown;
  tenantId: unknown;
  portfolioKey: unknown;
  senderKey: unknown;
  recipientKey: unknown;
  policyEventKey: unknown;
  templateCategory: unknown;
  portfolioCapacity: unknown;
  phoneThroughput: unknown;
  reservedAt: unknown;
  reservationExpiresAt: unknown;
}

export interface WhatsappRateLimitSettlementCommand {
  reservationKey: unknown;
  outcome: unknown;
  settledAt: unknown;
}

export interface WhatsappProviderCooldownCommand {
  reservationKey: unknown;
  scope: unknown;
  providerErrorCode: unknown;
  observedAt: unknown;
  blockedUntil: unknown;
}

export interface WhatsappRateLimitRepository {
  reserveBusinessInitiatedMessage(
    command: WhatsappRateLimitReservationCommand,
  ): Promise<WhatsappRateLimitReservationResult>;
  settle(
    command: WhatsappRateLimitSettlementCommand,
  ): Promise<WhatsappRateLimitSettlementResult>;
  applyProviderCooldown(
    command: WhatsappProviderCooldownCommand,
  ): Promise<WhatsappProviderCooldownResult>;
}

function requirePattern(
  value: unknown,
  pattern: RegExp,
  name: string,
): string {
  if (
    typeof value !== "string" ||
    !pattern.test(value)
  ) {
    throw new Error(`${name} is invalid`);
  }

  return value;
}

function requireTenantId(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1
  ) {
    throw new Error("tenantId is invalid");
  }

  return Number(value);
}

function requireTemplateCategory(
  value: unknown,
): "MARKETING" | "UTILITY" {
  if (value !== "MARKETING" && value !== "UTILITY") {
    throw new Error("templateCategory is invalid");
  }

  return value;
}

function requireTimestamp(
  value: unknown,
  name: string,
): string {
  if (
    typeof value !== "string" ||
    !canonicalTimestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${name} is invalid`);
  }

  return value;
}

function requireNonnegativeInteger(
  value: unknown,
  name: string,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 0
  ) {
    throw new Error(`${name} is invalid`);
  }

  return Number(value);
}

function isOfficialBoundedLimit(
  value: unknown,
): value is WhatsappPortfolioMessagingLimit {
  return whatsappPortfolioMessagingLimits.some(
    (limit) => limit === value,
  );
}

function requirePortfolioCapacity(
  value: unknown,
): WhatsappPortfolioCapacity {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("portfolioCapacity is invalid");
  }

  const record = value as Record<string, unknown>;

  if (
    record.kind === "unlimited" &&
    Object.keys(record).length === 1
  ) {
    return { kind: "unlimited" };
  }

  if (
    record.kind === "bounded" &&
    Object.keys(record).length === 2 &&
    Object.hasOwn(
      record,
      "maximumUniqueRecipients",
    ) &&
    isOfficialBoundedLimit(
      record.maximumUniqueRecipients,
    )
  ) {
    return {
      kind: "bounded",
      maximumUniqueRecipients:
        record.maximumUniqueRecipients,
    };
  }

  throw new Error("portfolioCapacity is invalid");
}

function requirePhoneThroughputPolicy(
  value: unknown,
): WhatsappPhoneThroughputPolicy {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("phoneThroughput is invalid");
  }

  const record = value as Record<string, unknown>;

  if (
    Object.keys(record).length !== 2 ||
    !Object.hasOwn(
      record,
      "maximumMessagesPerSecond",
    ) ||
    !Object.hasOwn(
      record,
      "maximumOutboundMessagesPerSecond",
    ) ||
    !whatsappPhoneThroughputLimits.includes(
      record.maximumMessagesPerSecond as never,
    ) ||
    !Number.isSafeInteger(
      record.maximumOutboundMessagesPerSecond,
    ) ||
    Number(record.maximumOutboundMessagesPerSecond) < 1 ||
    Number(record.maximumOutboundMessagesPerSecond) >=
      Number(record.maximumMessagesPerSecond)
  ) {
    throw new Error("phoneThroughput is invalid");
  }

  return {
    maximumMessagesPerSecond:
      record.maximumMessagesPerSecond as (typeof whatsappPhoneThroughputLimits)[number],
    maximumOutboundMessagesPerSecond: Number(
      record.maximumOutboundMessagesPerSecond,
    ),
  };
}

function requireSettlementOutcome(
  value: unknown,
): WhatsappRateLimitSettlementOutcome {
  if (
    typeof value !== "string" ||
    !whatsappRateLimitSettlementOutcomes.some(
      (outcome) => outcome === value,
    )
  ) {
    throw new Error("settlement outcome is invalid");
  }

  return value as WhatsappRateLimitSettlementOutcome;
}

function requireProviderCooldownScope(
  value: unknown,
): WhatsappProviderCooldownScope {
  if (
    typeof value !== "string" ||
    !whatsappProviderCooldownScopes.some(
      (scope) => scope === value,
    )
  ) {
    throw new Error("provider cooldown scope is invalid");
  }

  return value as WhatsappProviderCooldownScope;
}

function requireProviderCooldownErrorCode(
  value: unknown,
): WhatsappProviderCooldownErrorCode {
  if (
    !Number.isSafeInteger(value) ||
    !whatsappProviderCooldownErrorCodes.some(
      (errorCode) => errorCode === value,
    )
  ) {
    throw new Error(
      "provider cooldown error code is invalid",
    );
  }

  return value as WhatsappProviderCooldownErrorCode;
}

function scopeMatchesProviderErrorCode(
  scope: WhatsappProviderCooldownScope,
  providerErrorCode: WhatsappProviderCooldownErrorCode,
): boolean {
  return (
    (scope === "sender" &&
      providerErrorCode === 130429) ||
    (scope === "portfolio-recipient" &&
      providerErrorCode === 131049) ||
    (scope === "pair" &&
      providerErrorCode === 131056)
  );
}

function parseCapacity(
  kind: unknown,
  value: unknown,
): WhatsappPortfolioCapacity {
  if (kind === "unlimited" && value === null) {
    return { kind: "unlimited" };
  }

  if (
    kind === "bounded" &&
    isOfficialBoundedLimit(value)
  ) {
    return {
      kind: "bounded",
      maximumUniqueRecipients: value,
    };
  }

  throw new Error(
    "D1 returned an invalid WhatsApp portfolio capacity",
  );
}

function parseReservation(
  row: ReservationRow,
): WhatsappRateLimitReservation {
  const reservedAt = requireTimestamp(
    row.reservedAt,
    "D1 reservedAt",
  );
  const pairReservedUntil = requireTimestamp(
    row.pairReservedUntil,
    "D1 pairReservedUntil",
  );
  const reservationExpiresAt = requireTimestamp(
    row.reservationExpiresAt,
    "D1 reservationExpiresAt",
  );

  if (
    Date.parse(pairReservedUntil) !==
      Date.parse(reservedAt) +
        PAIR_INTERVAL_MILLISECONDS ||
    reservationExpiresAt < pairReservedUntil ||
    Date.parse(reservationExpiresAt) >
      Date.parse(reservedAt) +
        ONE_DAY_MILLISECONDS
  ) {
    throw new Error(
      "D1 returned invalid WhatsApp reservation times",
    );
  }

  return {
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "D1 reservationKey",
    ),
    tenantId: requireTenantId(row.tenantId),
    portfolioKey: requirePattern(
      row.portfolioKey,
      portfolioKeyPattern,
      "D1 portfolioKey",
    ),
    senderKey: requirePattern(
      row.senderKey,
      senderKeyPattern,
      "D1 senderKey",
    ),
    recipientKey: requirePattern(
      row.recipientKey,
      recipientKeyPattern,
      "D1 recipientKey",
    ),
    policyEventKey:
      row.policyEventKey === null
        ? null
        : requirePattern(
            row.policyEventKey,
            policyEventKeyPattern,
            "D1 policyEventKey",
          ),
    portfolioCapacity: parseCapacity(
      row.portfolioLimitKind,
      row.portfolioLimitValue,
    ),
    phoneThroughput:
      row.phoneThroughputMessagesPerSecond === null &&
      row.maximumOutboundMessagesPerSecond === null
        ? null
        : requirePhoneThroughputPolicy({
            maximumMessagesPerSecond:
              row.phoneThroughputMessagesPerSecond,
            maximumOutboundMessagesPerSecond:
              row.maximumOutboundMessagesPerSecond,
          }),
    reservedAt,
    pairReservedUntil,
    reservationExpiresAt,
  };
}

function parseSettlement(
  row: SettlementRow,
): WhatsappRateLimitSettlement {
  return {
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "D1 reservationKey",
    ),
    outcome: requireSettlementOutcome(row.outcome),
    settledAt: requireTimestamp(
      row.settledAt,
      "D1 settledAt",
    ),
  };
}

function parseProviderCooldown(
  row: ProviderCooldownRow,
): WhatsappProviderCooldown {
  const scope = requireProviderCooldownScope(
    row.scope,
  );
  const providerErrorCode =
    requireProviderCooldownErrorCode(
      row.providerErrorCode,
    );
  const observedAt = requireTimestamp(
    row.observedAt,
    "D1 provider cooldown observedAt",
  );
  const blockedUntil = requireTimestamp(
    row.blockedUntil,
    "D1 provider cooldown blockedUntil",
  );

  if (
    !scopeMatchesProviderErrorCode(
      scope,
      providerErrorCode,
    ) ||
    blockedUntil <= observedAt ||
    Date.parse(blockedUntil) >
      Date.parse(observedAt) +
        ONE_DAY_MILLISECONDS ||
    (providerErrorCode === 131049 &&
      Date.parse(blockedUntil) !==
        Date.parse(observedAt) +
          ONE_DAY_MILLISECONDS)
  ) {
    throw new Error(
      "D1 returned an invalid provider cooldown",
    );
  }

  return {
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "D1 reservationKey",
    ),
    scope,
    providerErrorCode,
    observedAt,
    blockedUntil,
  };
}

function sameCapacity(
  left: WhatsappPortfolioCapacity,
  right: WhatsappPortfolioCapacity,
): boolean {
  return (
    left.kind === right.kind &&
    (
      left.kind === "unlimited" ||
      (
        right.kind === "bounded" &&
        left.maximumUniqueRecipients ===
          right.maximumUniqueRecipients
      )
    )
  );
}

function sameReservation(
  left: WhatsappRateLimitReservation,
  right: WhatsappRateLimitReservation,
): boolean {
  return (
    left.reservationKey === right.reservationKey &&
    left.tenantId === right.tenantId &&
    left.portfolioKey === right.portfolioKey &&
    left.senderKey === right.senderKey &&
    left.recipientKey === right.recipientKey &&
    left.policyEventKey === right.policyEventKey &&
    sameCapacity(
      left.portfolioCapacity,
      right.portfolioCapacity,
    ) &&
    JSON.stringify(left.phoneThroughput) ===
      JSON.stringify(right.phoneThroughput) &&
    left.reservedAt === right.reservedAt &&
    left.pairReservedUntil === right.pairReservedUntil &&
    left.reservationExpiresAt ===
      right.reservationExpiresAt
  );
}

function sameProviderCooldown(
  left: WhatsappProviderCooldown,
  right: WhatsappProviderCooldown,
): boolean {
  return (
    left.reservationKey === right.reservationKey &&
    left.scope === right.scope &&
    left.providerErrorCode ===
      right.providerErrorCode &&
    left.observedAt === right.observedAt &&
    left.blockedUntil === right.blockedUntil
  );
}

function normalizeReservation(
  command: WhatsappRateLimitReservationCommand,
): Omit<
  WhatsappRateLimitReservation,
  "policyEventKey" | "phoneThroughput"
> & {
  policyEventKey: string;
  phoneThroughput: WhatsappPhoneThroughputPolicy;
  templateCategory: "MARKETING" | "UTILITY";
} {
  const reservedAt = requireTimestamp(
    command.reservedAt,
    "reservedAt",
  );
  const reservationExpiresAt = requireTimestamp(
    command.reservationExpiresAt,
    "reservationExpiresAt",
  );
  const pairReservedUntil = new Date(
    Date.parse(reservedAt) +
      PAIR_INTERVAL_MILLISECONDS,
  ).toISOString();

  if (
    reservationExpiresAt < pairReservedUntil ||
    Date.parse(reservationExpiresAt) >
      Date.parse(reservedAt) +
        ONE_DAY_MILLISECONDS
  ) {
    throw new Error(
      "reservationExpiresAt is outside the safe reservation window",
    );
  }

  return {
    reservationKey: requirePattern(
      command.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
    tenantId: requireTenantId(command.tenantId),
    portfolioKey: requirePattern(
      command.portfolioKey,
      portfolioKeyPattern,
      "portfolioKey",
    ),
    senderKey: requirePattern(
      command.senderKey,
      senderKeyPattern,
      "senderKey",
    ),
    recipientKey: requirePattern(
      command.recipientKey,
      recipientKeyPattern,
      "recipientKey",
    ),
    policyEventKey: requirePattern(
      command.policyEventKey,
      policyEventKeyPattern,
      "policyEventKey",
    ),
    templateCategory: requireTemplateCategory(
      command.templateCategory,
    ),
    portfolioCapacity: requirePortfolioCapacity(
      command.portfolioCapacity,
    ),
    phoneThroughput:
      requirePhoneThroughputPolicy(
        command.phoneThroughput,
      ),
    reservedAt,
    pairReservedUntil,
    reservationExpiresAt,
  };
}

function normalizeProviderCooldown(
  command: WhatsappProviderCooldownCommand,
): WhatsappProviderCooldown {
  const scope = requireProviderCooldownScope(
    command.scope,
  );
  const providerErrorCode =
    requireProviderCooldownErrorCode(
      command.providerErrorCode,
    );
  const observedAt = requireTimestamp(
    command.observedAt,
    "observedAt",
  );
  const blockedUntil = requireTimestamp(
    command.blockedUntil,
    "blockedUntil",
  );

  if (
    !scopeMatchesProviderErrorCode(
      scope,
      providerErrorCode,
    )
  ) {
    throw new Error(
      "provider cooldown scope does not match error code",
    );
  }

  if (
    blockedUntil <= observedAt ||
    Date.parse(blockedUntil) >
      Date.parse(observedAt) +
        ONE_DAY_MILLISECONDS ||
    (providerErrorCode === 131049 &&
      Date.parse(blockedUntil) !==
        Date.parse(observedAt) +
          ONE_DAY_MILLISECONDS)
  ) {
    throw new Error(
      "provider cooldown is outside the safe window",
    );
  }

  return {
    reservationKey: requirePattern(
      command.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
    scope,
    providerErrorCode,
    observedAt,
    blockedUntil,
  };
}

function capacityValues(
  capacity: WhatsappPortfolioCapacity,
): readonly ["bounded" | "unlimited", number | null] {
  return capacity.kind === "bounded"
    ? ["bounded", capacity.maximumUniqueRecipients]
    : ["unlimited", null];
}

export function createWhatsappRateLimitRepository(
  database: D1DatabaseBinding,
): WhatsappRateLimitRepository {
  return {
    async reserveBusinessInitiatedMessage(command) {
      const requested = normalizeReservation(command);
      const [limitKind, limitValue] = capacityValues(
        requested.portfolioCapacity,
      );
      const windowStartAt = new Date(
        Date.parse(requested.reservedAt) -
          ONE_DAY_MILLISECONDS,
      ).toISOString();
      const throughputWindowStartAt = new Date(
        Date.parse(requested.reservedAt) - 1_000,
      ).toISOString();
      const inserted = await database
        .prepare(RESERVE_SQL)
        .bind(
          requested.reservationKey,
          requested.tenantId,
          requested.portfolioKey,
          requested.senderKey,
          requested.recipientKey,
          limitKind,
          limitValue,
          requested.reservedAt,
          requested.pairReservedUntil,
          requested.reservationExpiresAt,
          windowStartAt,
          requested.templateCategory,
          requested.policyEventKey,
          requested.phoneThroughput
            .maximumMessagesPerSecond,
          requested.phoneThroughput
            .maximumOutboundMessagesPerSecond,
          throughputWindowStartAt,
        )
        .first<ReservationRow>();

      if (inserted) {
        return {
          outcome: "reserved",
          reservation: parseReservation(inserted),
          idempotent: false,
        };
      }

      const existingRow = await database
        .prepare(FIND_RESERVATION_SQL)
        .bind(requested.reservationKey)
        .first<ReservationRow>();

      if (existingRow) {
        const existing = parseReservation(existingRow);

        if (!sameReservation(existing, requested)) {
          throw new Error(
            "WhatsApp reservation key collision",
          );
        }

        const settlementRow = await database
          .prepare(FIND_SETTLEMENT_SQL)
          .bind(requested.reservationKey)
          .first<SettlementRow>();

        if (settlementRow) {
          return {
            outcome: "reservation-retired",
            settlement: parseSettlement(
              settlementRow,
            ),
          };
        }

        return {
          outcome: "reserved",
          reservation: existing,
          idempotent: true,
        };
      }

      const blocker = await database
        .prepare(FIND_BLOCKER_SQL)
        .bind(
          requested.tenantId,
          requested.portfolioKey,
          requested.senderKey,
          requested.recipientKey,
          requested.reservedAt,
          windowStartAt,
          requested.templateCategory,
          throughputWindowStartAt,
        )
        .first<BlockerRow>();

      if (!blocker) {
        throw new Error(
          "D1 did not return WhatsApp rate-limit state",
        );
      }

      if (blocker.tenantFound !== 1) {
        return { outcome: "tenant-not-found" };
      }

      if (
        blocker.providerBlockedUntil !== null ||
        blocker.providerCooldownScope !== null ||
        blocker.providerErrorCode !== null
      ) {
        if (
          blocker.providerBlockedUntil === null ||
          blocker.providerCooldownScope === null ||
          blocker.providerErrorCode === null
        ) {
          throw new Error(
            "D1 returned incomplete provider cooldown state",
          );
        }

        const retryAt = requireTimestamp(
          blocker.providerBlockedUntil,
          "D1 providerBlockedUntil",
        );
        const scope = requireProviderCooldownScope(
          blocker.providerCooldownScope,
        );
        const providerErrorCode =
          requireProviderCooldownErrorCode(
            blocker.providerErrorCode,
          );

        if (
          retryAt <= requested.reservedAt ||
          !scopeMatchesProviderErrorCode(
            scope,
            providerErrorCode,
          )
        ) {
          throw new Error(
            "D1 returned invalid provider cooldown state",
          );
        }

        return {
          outcome: "provider-cooldown",
          scope,
          providerErrorCode,
          retryAt,
        };
      }

      if (
        blocker.pairReservedUntil !== null
      ) {
        const retryAt = requireTimestamp(
          blocker.pairReservedUntil,
          "D1 pairReservedUntil",
        );

        if (retryAt > requested.reservedAt) {
          return {
            outcome: "pair-limited",
            retryAt,
          };
        }
      }

      if (
        blocker.activeReservationExpiresAt !== null
      ) {
        const retryAt = requireTimestamp(
          blocker.activeReservationExpiresAt,
          "D1 activeReservationExpiresAt",
        );

        if (retryAt > requested.reservedAt) {
          return {
            outcome: "recipient-in-flight",
            retryAt,
          };
        }
      }

      const throughputReservationCount =
        requireNonnegativeInteger(
          blocker.throughputReservationCount,
          "D1 throughputReservationCount",
        );

      if (
        throughputReservationCount >=
          requested.phoneThroughput
            .maximumOutboundMessagesPerSecond
      ) {
        const oldestReservedAt = requireTimestamp(
          blocker.throughputOldestReservedAt,
          "D1 throughputOldestReservedAt",
        );
        const retryAt = new Date(
          Date.parse(oldestReservedAt) + 1_000,
        ).toISOString();

        if (retryAt <= requested.reservedAt) {
          throw new Error(
            "D1 returned invalid throughput state",
          );
        }

        return {
          outcome: "phone-throughput-limited",
          retryAt,
        };
      }

      if (requested.portfolioCapacity.kind === "bounded") {
        return {
          outcome: "portfolio-limited",
          occupiedUniqueRecipients:
            requireNonnegativeInteger(
              blocker.occupiedUniqueRecipients,
              "D1 occupiedUniqueRecipients",
            ),
          maximumUniqueRecipients:
            requested.portfolioCapacity
              .maximumUniqueRecipients,
        };
      }

      throw new Error(
        "D1 rejected an unlimited WhatsApp reservation without a blocker",
      );
    },

    async settle(command) {
      const reservationKey = requirePattern(
        command.reservationKey,
        reservationKeyPattern,
        "reservationKey",
      );
      const outcome = requireSettlementOutcome(
        command.outcome,
      );
      const settledAt = requireTimestamp(
        command.settledAt,
        "settledAt",
      );
      const inserted = await database
        .prepare(INSERT_SETTLEMENT_SQL)
        .bind(
          reservationKey,
          outcome,
          settledAt,
        )
        .first<SettlementRow>();

      if (inserted) {
        return {
          outcome: "settled",
          settlement: parseSettlement(inserted),
          idempotent: false,
        };
      }

      const existingRow = await database
        .prepare(FIND_SETTLEMENT_SQL)
        .bind(reservationKey)
        .first<SettlementRow>();

      if (existingRow) {
        const existing = parseSettlement(existingRow);

        if (
          existing.outcome === outcome &&
          existing.settledAt === settledAt
        ) {
          return {
            outcome: "settled",
            settlement: existing,
            idempotent: true,
          };
        }

        return {
          outcome: "settlement-conflict",
          existing,
        };
      }

      const reservationRow = await database
        .prepare(FIND_RESERVATION_SQL)
        .bind(reservationKey)
        .first<ReservationRow>();

      if (!reservationRow) {
        return { outcome: "reservation-not-found" };
      }

      const reservation = parseReservation(
        reservationRow,
      );

      if (settledAt < reservation.reservedAt) {
        return {
          outcome: "settlement-precedes-reservation",
        };
      }

      throw new Error(
        "D1 rejected a valid WhatsApp settlement",
      );
    },

    async applyProviderCooldown(command) {
      const requested = normalizeProviderCooldown(
        command,
      );
      const existingEventRow = await database
        .prepare(FIND_PROVIDER_COOLDOWN_SQL)
        .bind(requested.reservationKey)
        .first<ProviderCooldownRow>();

      if (existingEventRow) {
        const existing = parseProviderCooldown(
          existingEventRow,
        );

        if (!sameProviderCooldown(existing, requested)) {
          return {
            outcome: "cooldown-conflict",
            existing,
          };
        }

        const settlementRow = await database
          .prepare(FIND_SETTLEMENT_SQL)
          .bind(requested.reservationKey)
          .first<SettlementRow>();

        if (!settlementRow) {
          throw new Error(
            "Provider cooldown is missing settlement evidence",
          );
        }

        const settlement = parseSettlement(
          settlementRow,
        );

        if (
          settlement.outcome !== "provider-failed" ||
          settlement.settledAt !== requested.observedAt
        ) {
          return {
            outcome: "settlement-conflict",
            existing: settlement,
          };
        }

        return {
          outcome: "applied",
          cooldown: existing,
          idempotent: true,
        };
      }

      const reservationRow = await database
        .prepare(FIND_RESERVATION_SQL)
        .bind(requested.reservationKey)
        .first<ReservationRow>();

      if (!reservationRow) {
        return { outcome: "reservation-not-found" };
      }

      const reservation = parseReservation(
        reservationRow,
      );

      if (requested.observedAt < reservation.reservedAt) {
        throw new Error(
          "provider cooldown precedes reservation",
        );
      }

      const existingSettlementRow = await database
        .prepare(FIND_SETTLEMENT_SQL)
        .bind(requested.reservationKey)
        .first<SettlementRow>();

      if (existingSettlementRow) {
        const existingSettlement = parseSettlement(
          existingSettlementRow,
        );

        if (
          existingSettlement.outcome !==
            "provider-failed" ||
          existingSettlement.settledAt !==
            requested.observedAt
        ) {
          return {
            outcome: "settlement-conflict",
            existing: existingSettlement,
          };
        }
      }

      await database.batch([
        database
          .prepare(
            INSERT_PROVIDER_FAILED_SETTLEMENT_SQL,
          )
          .bind(
            requested.reservationKey,
            requested.observedAt,
          ),
        database
          .prepare(INSERT_PROVIDER_COOLDOWN_SQL)
          .bind(
            requested.reservationKey,
            requested.scope,
            requested.providerErrorCode,
            requested.observedAt,
            requested.blockedUntil,
          ),
      ]);

      const [storedEventRow, storedSettlementRow] =
        await Promise.all([
          database
            .prepare(FIND_PROVIDER_COOLDOWN_SQL)
            .bind(requested.reservationKey)
            .first<ProviderCooldownRow>(),
          database
            .prepare(FIND_SETTLEMENT_SQL)
            .bind(requested.reservationKey)
            .first<SettlementRow>(),
        ]);

      if (!storedEventRow || !storedSettlementRow) {
        throw new Error(
          "D1 did not persist provider cooldown evidence",
        );
      }

      const stored = parseProviderCooldown(
        storedEventRow,
      );
      const settlement = parseSettlement(
        storedSettlementRow,
      );

      if (!sameProviderCooldown(stored, requested)) {
        return {
          outcome: "cooldown-conflict",
          existing: stored,
        };
      }

      if (
        settlement.outcome !== "provider-failed" ||
        settlement.settledAt !== requested.observedAt
      ) {
        return {
          outcome: "settlement-conflict",
          existing: settlement,
        };
      }

      return {
        outcome: "applied",
        cooldown: stored,
        idempotent: false,
      };
    },
  };
}
