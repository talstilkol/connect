import type {
  WhatsappProviderCooldownCommand,
  WhatsappRateLimitRepository,
  WhatsappRateLimitReservationCommand,
  WhatsappRateLimitSettlementCommand,
} from "../../db/whatsappRateLimitRepository.ts";
import {
  whatsappPortfolioMessagingLimits,
  whatsappPhoneThroughputLimits,
  whatsappProviderCooldownErrorCodes,
  whatsappProviderCooldownScopes,
  whatsappRateLimitSettlementOutcomes,
  type WhatsappPortfolioCapacity,
  type WhatsappPhoneThroughputPolicy,
  type WhatsappProviderCooldown,
  type WhatsappProviderCooldownErrorCode,
  type WhatsappProviderCooldownScope,
  type WhatsappRateLimitReservation,
  type WhatsappRateLimitSettlement,
  type WhatsappRateLimitSettlementOutcome,
} from "../../shared/domain/whatsappRateLimit.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const oneDayMilliseconds = 24 * 60 * 60 * 1_000;
const pairIntervalMilliseconds = 6_000;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const portfolioKeyPattern = /^whatsapp_portfolio_v1_[0-9a-f]{64}$/;
const senderKeyPattern = /^whatsapp_sender_v1_[0-9a-f]{64}$/;
const recipientKeyPattern = /^whatsapp_recipient_v1_[0-9a-f]{64}$/;
const policyEventKeyPattern =
  /^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$/;
const reservationRowKeys = Object.freeze([
  "reservationKey",
  "tenantId",
  "portfolioKey",
  "senderKey",
  "recipientKey",
  "policyEventKey",
  "phoneThroughputMessagesPerSecond",
  "maximumOutboundMessagesPerSecond",
  "templateCategory",
  "portfolioLimitKind",
  "portfolioLimitValue",
  "reservedAt",
  "pairReservedUntil",
  "reservationExpiresAt",
]);
const settlementRowKeys = Object.freeze([
  "reservationKey",
  "outcome",
  "settledAt",
]);
const cooldownRowKeys = Object.freeze([
  "reservationKey",
  "scope",
  "providerErrorCode",
  "observedAt",
  "blockedUntil",
]);
const blockerRowKeys = Object.freeze([
  "tenantFound",
  "providerBlockedUntil",
  "providerCooldownScope",
  "providerErrorCode",
  "pairReservedUntil",
  "activeReservationExpiresAt",
  "throughputReservationCount",
  "throughputOldestReservedAt",
  "recipientDeliveredInWindow",
  "occupiedUniqueRecipients",
]);
const reservationColumns = `
  reservation_key AS "reservationKey",
  tenant_id AS "tenantId",
  portfolio_key AS "portfolioKey",
  sender_key AS "senderKey",
  recipient_key AS "recipientKey",
  policy_event_key AS "policyEventKey",
  phone_throughput_messages_per_second AS "phoneThroughputMessagesPerSecond",
  maximum_outbound_messages_per_second AS "maximumOutboundMessagesPerSecond",
  template_category AS "templateCategory",
  portfolio_limit_kind AS "portfolioLimitKind",
  portfolio_limit_value AS "portfolioLimitValue",
  reserved_at AS "reservedAt",
  pair_reserved_until AS "pairReservedUntil",
  reservation_expires_at AS "reservationExpiresAt"
`;
const settlementColumns = `
  reservation_key AS "reservationKey",
  outcome,
  settled_at AS "settledAt"
`;
const cooldownColumns = `
  reservation_key AS "reservationKey",
  scope,
  provider_error_code AS "providerErrorCode",
  observed_at AS "observedAt",
  blocked_until AS "blockedUntil"
`;

export const postgresWhatsappRateLimitSql = Object.freeze({
  lockPairScope: `
    /* whatsapp-pair-lock */
    SELECT pg_advisory_xact_lock(hashtextextended($1, 0)) AS locked
  `,
  lockPortfolioScope: `
    /* whatsapp-portfolio-lock */
    SELECT pg_advisory_xact_lock(hashtextextended($1, 0)) AS locked
  `,
  lockThroughputScope: `
    /* whatsapp-throughput-lock */
    SELECT pg_advisory_xact_lock(hashtextextended($1, 0)) AS locked
  `,
  findReservation: `
    SELECT ${reservationColumns}
    FROM whatsapp_rate_limit_reservations
    WHERE reservation_key = $1
    LIMIT 1
  `,
  findReservationForUpdate: `
    SELECT ${reservationColumns}
    FROM whatsapp_rate_limit_reservations
    WHERE reservation_key = $1
    FOR UPDATE
  `,
  findBlocker: `
    WITH provider AS (
      SELECT
        blocked_until,
        scope,
        provider_error_code
      FROM whatsapp_provider_cooldown_state
      WHERE blocked_until > $5::timestamptz
        AND (
          (
            scope = 'sender'
            AND sender_key = $3
            AND recipient_key = ''
          )
          OR
          (
            scope = 'portfolio-recipient'
            AND $7 = 'MARKETING'
            AND sender_key = ''
            AND recipient_key = $4
          )
          OR
          (
            scope = 'pair'
            AND sender_key = $3
            AND recipient_key = $4
          )
        )
      ORDER BY blocked_until DESC, scope ASC
      LIMIT 1
    )
    SELECT
      EXISTS (
        SELECT 1 FROM tenants WHERE id = $1
      ) AS "tenantFound",
      (SELECT blocked_until FROM provider) AS "providerBlockedUntil",
      (SELECT scope FROM provider) AS "providerCooldownScope",
      (SELECT provider_error_code FROM provider) AS "providerErrorCode",
      (
        SELECT reserved_until
        FROM whatsapp_pair_rate_limit_state
        WHERE sender_key = $3 AND recipient_key = $4
      ) AS "pairReservedUntil",
      (
        SELECT active_reservation_expires_at
        FROM whatsapp_portfolio_recipient_rate_limit_state
        WHERE portfolio_key = $2 AND recipient_key = $4
      ) AS "activeReservationExpiresAt",
      (
        SELECT count(*)
        FROM whatsapp_rate_limit_reservations
        WHERE sender_key = $3
          AND reserved_at > $8::timestamptz
          AND reserved_at <= $5::timestamptz
      ) AS "throughputReservationCount",
      (
        SELECT min(reserved_at)
        FROM whatsapp_rate_limit_reservations
        WHERE sender_key = $3
          AND reserved_at > $8::timestamptz
          AND reserved_at <= $5::timestamptz
      ) AS "throughputOldestReservedAt",
      EXISTS (
        SELECT 1
        FROM whatsapp_portfolio_recipient_rate_limit_state
        WHERE portfolio_key = $2
          AND recipient_key = $4
          AND last_delivered_at >= $6::timestamptz
      ) AS "recipientDeliveredInWindow",
      (
        SELECT count(*)
        FROM whatsapp_portfolio_recipient_rate_limit_state
        WHERE portfolio_key = $2
          AND (
            last_delivered_at >= $6::timestamptz
            OR (
              active_reservation_key IS NOT NULL
              AND active_reservation_expires_at > $5::timestamptz
            )
          )
      ) AS "occupiedUniqueRecipients"
  `,
  insertReservation: `
    INSERT INTO whatsapp_rate_limit_reservations (
      reservation_key,
      tenant_id,
      portfolio_key,
      sender_key,
      recipient_key,
      policy_event_key,
      phone_throughput_messages_per_second,
      maximum_outbound_messages_per_second,
      template_category,
      portfolio_limit_kind,
      portfolio_limit_value,
      reserved_at,
      pair_reserved_until,
      reservation_expires_at,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $12, $13, $14,
      $6, $7, $8,
      $9::timestamptz, $10::timestamptz,
      $11::timestamptz, $9::timestamptz
    )
    ON CONFLICT (reservation_key) DO NOTHING
    RETURNING ${reservationColumns}
  `,
  findSettlement: `
    SELECT ${settlementColumns}
    FROM whatsapp_rate_limit_settlements
    WHERE reservation_key = $1
    LIMIT 1
  `,
  insertSettlement: `
    INSERT INTO whatsapp_rate_limit_settlements (
      reservation_key,
      outcome,
      settled_at,
      created_at
    ) VALUES ($1, $2, $3::timestamptz, $3::timestamptz)
    ON CONFLICT (reservation_key) DO NOTHING
    RETURNING ${settlementColumns}
  `,
  findProviderCooldown: `
    SELECT ${cooldownColumns}
    FROM whatsapp_provider_cooldown_events
    WHERE reservation_key = $1
    LIMIT 1
  `,
  insertProviderCooldown: `
    INSERT INTO whatsapp_provider_cooldown_events (
      reservation_key,
      scope,
      provider_error_code,
      observed_at,
      blocked_until,
      created_at
    ) VALUES (
      $1, $2, $3, $4::timestamptz,
      $5::timestamptz, $4::timestamptz
    )
    ON CONFLICT (reservation_key) DO NOTHING
    RETURNING ${cooldownColumns}
  `,
});

export interface PostgresWhatsappRateLimitDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

interface NormalizedReservation extends WhatsappRateLimitReservation {
  readonly policyEventKey: string;
  readonly phoneThroughput: WhatsappPhoneThroughputPolicy;
  readonly templateCategory: "MARKETING" | "UTILITY";
}

interface StoredReservation {
  readonly reservation: WhatsappRateLimitReservation;
  readonly templateCategory: "MARKETING" | "UTILITY" | null;
}

function requirePattern(value: unknown, pattern: RegExp, field: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${field} is invalid`);
  }
  return value;
}

function requireTimestamp(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !canonicalTimestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${field} is invalid`);
  }
  return value;
}

function parseTimestamp(value: unknown, field: string): string {
  try {
    return requireTimestamp(parsePostgresTimestamp(value), field);
  } catch {
    throw new Error(`PostgreSQL returned an invalid ${field}`);
  }
}

function requireTenantId(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error("tenantId is invalid");
  }
  return Number(value);
}

function requireNonnegativeInteger(value: unknown, field: string): number {
  const normalized =
    typeof value === "string" && /^(?:0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;
  if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
    throw new Error(`PostgreSQL returned an invalid ${field}`);
  }
  return Number(normalized);
}

function requireTemplateCategory(value: unknown): "MARKETING" | "UTILITY" {
  if (value !== "MARKETING" && value !== "UTILITY") {
    throw new Error("templateCategory is invalid");
  }
  return value;
}

function requireCapacity(value: unknown): WhatsappPortfolioCapacity {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("portfolioCapacity is invalid");
  }
  const record = value as Record<string, unknown>;
  if (record.kind === "unlimited" && Object.keys(record).length === 1) {
    return Object.freeze({ kind: "unlimited" });
  }
  if (
    record.kind === "bounded" &&
    Object.keys(record).length === 2 &&
    Object.hasOwn(record, "maximumUniqueRecipients") &&
    whatsappPortfolioMessagingLimits.includes(
      record.maximumUniqueRecipients as never,
    )
  ) {
    return Object.freeze({
      kind: "bounded",
      maximumUniqueRecipients: record.maximumUniqueRecipients as
        (typeof whatsappPortfolioMessagingLimits)[number],
    });
  }
  throw new Error("portfolioCapacity is invalid");
}

function requirePhoneThroughput(
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
  return Object.freeze({
    maximumMessagesPerSecond:
      record.maximumMessagesPerSecond as (typeof whatsappPhoneThroughputLimits)[number],
    maximumOutboundMessagesPerSecond: Number(
      record.maximumOutboundMessagesPerSecond,
    ),
  });
}

function parseCapacity(kind: unknown, value: unknown): WhatsappPortfolioCapacity {
  if (kind === "unlimited" && value === null) {
    return Object.freeze({ kind: "unlimited" });
  }
  const normalizedValue = value === null
    ? null
    : parsePostgresPositiveInteger(value);
  if (
    kind === "bounded" &&
    whatsappPortfolioMessagingLimits.includes(normalizedValue as never)
  ) {
    return Object.freeze({
      kind: "bounded",
      maximumUniqueRecipients: normalizedValue as
        (typeof whatsappPortfolioMessagingLimits)[number],
    });
  }
  throw new Error("PostgreSQL returned an invalid portfolio capacity");
}

function requireSettlementOutcome(
  value: unknown,
): WhatsappRateLimitSettlementOutcome {
  if (!whatsappRateLimitSettlementOutcomes.includes(value as never)) {
    throw new Error("settlement outcome is invalid");
  }
  return value as WhatsappRateLimitSettlementOutcome;
}

function requireCooldownScope(value: unknown): WhatsappProviderCooldownScope {
  if (!whatsappProviderCooldownScopes.includes(value as never)) {
    throw new Error("provider cooldown scope is invalid");
  }
  return value as WhatsappProviderCooldownScope;
}

function requireCooldownErrorCode(
  value: unknown,
): WhatsappProviderCooldownErrorCode {
  const normalized =
    typeof value === "string" && /^[1-9][0-9]*$/.test(value)
      ? Number(value)
      : value;
  if (!whatsappProviderCooldownErrorCodes.includes(normalized as never)) {
    throw new Error("provider cooldown error code is invalid");
  }
  return normalized as WhatsappProviderCooldownErrorCode;
}

function scopeMatchesCode(
  scope: WhatsappProviderCooldownScope,
  code: WhatsappProviderCooldownErrorCode,
): boolean {
  return (
    (scope === "sender" && code === 130429) ||
    (scope === "portfolio-recipient" && code === 131049) ||
    (scope === "pair" && code === 131056)
  );
}

function normalizeReservation(
  command: WhatsappRateLimitReservationCommand,
): NormalizedReservation {
  const reservedAt = requireTimestamp(command.reservedAt, "reservedAt");
  const reservationExpiresAt = requireTimestamp(
    command.reservationExpiresAt,
    "reservationExpiresAt",
  );
  const pairReservedUntil = new Date(
    Date.parse(reservedAt) + pairIntervalMilliseconds,
  ).toISOString();
  if (
    reservationExpiresAt < pairReservedUntil ||
    Date.parse(reservationExpiresAt) > Date.parse(reservedAt) + oneDayMilliseconds
  ) {
    throw new Error("reservationExpiresAt is outside the safe reservation window");
  }
  return Object.freeze({
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
    senderKey: requirePattern(command.senderKey, senderKeyPattern, "senderKey"),
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
    templateCategory: requireTemplateCategory(command.templateCategory),
    portfolioCapacity: requireCapacity(command.portfolioCapacity),
    phoneThroughput: requirePhoneThroughput(
      command.phoneThroughput,
    ),
    reservedAt,
    pairReservedUntil,
    reservationExpiresAt,
  });
}

function normalizeCooldown(
  command: WhatsappProviderCooldownCommand,
): WhatsappProviderCooldown {
  const scope = requireCooldownScope(command.scope);
  const providerErrorCode = requireCooldownErrorCode(command.providerErrorCode);
  const observedAt = requireTimestamp(command.observedAt, "observedAt");
  const blockedUntil = requireTimestamp(command.blockedUntil, "blockedUntil");
  if (!scopeMatchesCode(scope, providerErrorCode)) {
    throw new Error("provider cooldown scope does not match error code");
  }
  if (
    blockedUntil <= observedAt ||
    Date.parse(blockedUntil) > Date.parse(observedAt) + oneDayMilliseconds ||
    (providerErrorCode === 131049 &&
      Date.parse(blockedUntil) !== Date.parse(observedAt) + oneDayMilliseconds)
  ) {
    throw new Error("provider cooldown is outside the safe window");
  }
  return Object.freeze({
    reservationKey: requirePattern(
      command.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
    scope,
    providerErrorCode,
    observedAt,
    blockedUntil,
  });
}

function parseReservation(value: unknown): StoredReservation {
  const row = requireExactPostgresRow(value, reservationRowKeys);
  const reservedAt = parseTimestamp(row.reservedAt, "reservedAt");
  const pairReservedUntil = parseTimestamp(
    row.pairReservedUntil,
    "pairReservedUntil",
  );
  const reservationExpiresAt = parseTimestamp(
    row.reservationExpiresAt,
    "reservationExpiresAt",
  );
  if (
    Date.parse(pairReservedUntil) !==
      Date.parse(reservedAt) + pairIntervalMilliseconds ||
    reservationExpiresAt < pairReservedUntil ||
    Date.parse(reservationExpiresAt) > Date.parse(reservedAt) + oneDayMilliseconds
  ) {
    throw new Error("PostgreSQL returned invalid reservation times");
  }
  return Object.freeze({
    templateCategory:
      row.templateCategory === null
        ? null
        : requireTemplateCategory(row.templateCategory),
    reservation: Object.freeze({
      reservationKey: requirePattern(
        row.reservationKey,
        reservationKeyPattern,
        "PostgreSQL reservationKey",
      ),
      tenantId: parsePostgresPositiveInteger(row.tenantId),
      portfolioKey: requirePattern(
        row.portfolioKey,
        portfolioKeyPattern,
        "PostgreSQL portfolioKey",
      ),
      senderKey: requirePattern(
        row.senderKey,
        senderKeyPattern,
        "PostgreSQL senderKey",
      ),
      recipientKey: requirePattern(
        row.recipientKey,
        recipientKeyPattern,
        "PostgreSQL recipientKey",
      ),
      policyEventKey:
        row.policyEventKey === null
          ? null
          : requirePattern(
              row.policyEventKey,
              policyEventKeyPattern,
              "PostgreSQL policyEventKey",
            ),
      portfolioCapacity: parseCapacity(
        row.portfolioLimitKind,
        row.portfolioLimitValue,
      ),
      phoneThroughput:
        row.phoneThroughputMessagesPerSecond === null &&
        row.maximumOutboundMessagesPerSecond === null
          ? null
          : requirePhoneThroughput({
              maximumMessagesPerSecond:
                parsePostgresPositiveInteger(
                  row.phoneThroughputMessagesPerSecond,
                ),
              maximumOutboundMessagesPerSecond:
                parsePostgresPositiveInteger(
                  row.maximumOutboundMessagesPerSecond,
                ),
            }),
      reservedAt,
      pairReservedUntil,
      reservationExpiresAt,
    }),
  });
}

function parseSettlement(value: unknown): WhatsappRateLimitSettlement {
  const row = requireExactPostgresRow(value, settlementRowKeys);
  return Object.freeze({
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "PostgreSQL reservationKey",
    ),
    outcome: requireSettlementOutcome(row.outcome),
    settledAt: parseTimestamp(row.settledAt, "settledAt"),
  });
}

function parseCooldown(value: unknown): WhatsappProviderCooldown {
  const row = requireExactPostgresRow(value, cooldownRowKeys);
  const scope = requireCooldownScope(row.scope);
  const providerErrorCode = requireCooldownErrorCode(row.providerErrorCode);
  const observedAt = parseTimestamp(row.observedAt, "cooldown observedAt");
  const blockedUntil = parseTimestamp(row.blockedUntil, "cooldown blockedUntil");
  if (
    !scopeMatchesCode(scope, providerErrorCode) ||
    blockedUntil <= observedAt ||
    Date.parse(blockedUntil) > Date.parse(observedAt) + oneDayMilliseconds ||
    (providerErrorCode === 131049 &&
      Date.parse(blockedUntil) !== Date.parse(observedAt) + oneDayMilliseconds)
  ) {
    throw new Error("PostgreSQL returned an invalid provider cooldown");
  }
  return Object.freeze({
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "PostgreSQL reservationKey",
    ),
    scope,
    providerErrorCode,
    observedAt,
    blockedUntil,
  });
}

function sameCapacity(
  left: WhatsappPortfolioCapacity,
  right: WhatsappPortfolioCapacity,
): boolean {
  return left.kind === right.kind &&
    (left.kind === "unlimited" ||
      (right.kind === "bounded" &&
        left.maximumUniqueRecipients === right.maximumUniqueRecipients));
}

function sameReservation(
  stored: StoredReservation,
  requested: NormalizedReservation,
): boolean {
  const left = stored.reservation;
  return (
    stored.templateCategory === requested.templateCategory &&
    left.reservationKey === requested.reservationKey &&
    left.tenantId === requested.tenantId &&
    left.portfolioKey === requested.portfolioKey &&
    left.senderKey === requested.senderKey &&
    left.recipientKey === requested.recipientKey &&
    left.policyEventKey === requested.policyEventKey &&
    sameCapacity(left.portfolioCapacity, requested.portfolioCapacity) &&
    JSON.stringify(left.phoneThroughput) ===
      JSON.stringify(requested.phoneThroughput) &&
    left.reservedAt === requested.reservedAt &&
    left.pairReservedUntil === requested.pairReservedUntil &&
    left.reservationExpiresAt === requested.reservationExpiresAt
  );
}

function sameCooldown(
  left: WhatsappProviderCooldown,
  right: WhatsappProviderCooldown,
): boolean {
  return (
    left.reservationKey === right.reservationKey &&
    left.scope === right.scope &&
    left.providerErrorCode === right.providerErrorCode &&
    left.observedAt === right.observedAt &&
    left.blockedUntil === right.blockedUntil
  );
}

function capacityColumns(
  capacity: WhatsappPortfolioCapacity,
): readonly ["bounded", number] | readonly ["unlimited", null] {
  return capacity.kind === "bounded"
    ? ["bounded", capacity.maximumUniqueRecipients]
    : ["unlimited", null];
}

async function loadReservation(
  queries: PostgresQueryExecutor,
  reservationKey: string,
  forUpdate = false,
): Promise<StoredReservation | null> {
  const result = await queries.query<Record<string, unknown>>(
    forUpdate
      ? postgresWhatsappRateLimitSql.findReservationForUpdate
      : postgresWhatsappRateLimitSql.findReservation,
    [reservationKey],
  );
  const rows = requirePostgresRows(result, 1);
  return rows.length === 0 ? null : parseReservation(rows[0]);
}

async function loadSettlement(
  queries: PostgresQueryExecutor,
  reservationKey: string,
): Promise<WhatsappRateLimitSettlement | null> {
  const result = await queries.query<Record<string, unknown>>(
    postgresWhatsappRateLimitSql.findSettlement,
    [reservationKey],
  );
  const rows = requirePostgresRows(result, 1);
  return rows.length === 0 ? null : parseSettlement(rows[0]);
}

async function loadCooldown(
  queries: PostgresQueryExecutor,
  reservationKey: string,
): Promise<WhatsappProviderCooldown | null> {
  const result = await queries.query<Record<string, unknown>>(
    postgresWhatsappRateLimitSql.findProviderCooldown,
    [reservationKey],
  );
  const rows = requirePostgresRows(result, 1);
  return rows.length === 0 ? null : parseCooldown(rows[0]);
}

async function acquireReservationLocks(
  transaction: PostgresTransaction,
  requested: NormalizedReservation,
): Promise<void> {
  for (const [sql, key] of [
    [
      postgresWhatsappRateLimitSql.lockThroughputScope,
      `whatsapp-throughput:${requested.senderKey}`,
    ],
    [
      postgresWhatsappRateLimitSql.lockPairScope,
      `whatsapp-pair:${requested.senderKey}:${requested.recipientKey}`,
    ],
    [
      postgresWhatsappRateLimitSql.lockPortfolioScope,
      `whatsapp-portfolio:${requested.portfolioKey}`,
    ],
  ] as const) {
    const result = await transaction.query<Record<string, unknown>>(sql, [key]);
    requirePostgresRows(result, 1);
  }
}

export function createPostgresWhatsappRateLimitRepository(
  dependencies: Readonly<PostgresWhatsappRateLimitDependencies>,
): WhatsappRateLimitRepository {
  if (
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL WhatsApp rate-limit dependencies are invalid");
  }

  return Object.freeze({
    async reserveBusinessInitiatedMessage(
      command: WhatsappRateLimitReservationCommand,
    ) {
      const requested = normalizeReservation(command);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          await acquireReservationLocks(transaction, requested);
          const existing = await loadReservation(
            transaction,
            requested.reservationKey,
          );
          if (existing !== null) {
            if (!sameReservation(existing, requested)) {
              throw new Error("WhatsApp reservation key collision");
            }
            const settlement = await loadSettlement(
              transaction,
              requested.reservationKey,
            );
            return settlement === null
              ? Object.freeze({
                  outcome: "reserved" as const,
                  reservation: existing.reservation,
                  idempotent: true,
                })
              : Object.freeze({
                  outcome: "reservation-retired" as const,
                  settlement,
                });
          }

          const windowStartAt = new Date(
            Date.parse(requested.reservedAt) - oneDayMilliseconds,
          ).toISOString();
          const throughputWindowStartAt = new Date(
            Date.parse(requested.reservedAt) - 1_000,
          ).toISOString();
          const blockerResult = await transaction.query<
            Record<string, unknown>
          >(postgresWhatsappRateLimitSql.findBlocker, [
            requested.tenantId,
            requested.portfolioKey,
            requested.senderKey,
            requested.recipientKey,
            requested.reservedAt,
            windowStartAt,
            requested.templateCategory,
            throughputWindowStartAt,
          ]);
          const blockerRows = requirePostgresRows(blockerResult, 1);
          if (blockerRows.length !== 1) {
            throw new Error("PostgreSQL did not return WhatsApp rate-limit state");
          }
          const blocker = requireExactPostgresRow(
            blockerRows[0],
            blockerRowKeys,
          );
          if (typeof blocker.tenantFound !== "boolean") {
            throw new Error("PostgreSQL returned invalid tenant state");
          }
          if (!blocker.tenantFound) {
            return Object.freeze({ outcome: "tenant-not-found" as const });
          }

          const cooldownFields = [
            blocker.providerBlockedUntil,
            blocker.providerCooldownScope,
            blocker.providerErrorCode,
          ];
          if (cooldownFields.some((value) => value !== null)) {
            if (cooldownFields.some((value) => value === null)) {
              throw new Error("PostgreSQL returned incomplete cooldown state");
            }
            const retryAt = parseTimestamp(
              blocker.providerBlockedUntil,
              "providerBlockedUntil",
            );
            const scope = requireCooldownScope(blocker.providerCooldownScope);
            const providerErrorCode = requireCooldownErrorCode(
              blocker.providerErrorCode,
            );
            if (
              retryAt <= requested.reservedAt ||
              !scopeMatchesCode(scope, providerErrorCode)
            ) {
              throw new Error("PostgreSQL returned invalid cooldown state");
            }
            return Object.freeze({
              outcome: "provider-cooldown" as const,
              scope,
              providerErrorCode,
              retryAt,
            });
          }

          if (blocker.pairReservedUntil !== null) {
            const retryAt = parseTimestamp(
              blocker.pairReservedUntil,
              "pairReservedUntil",
            );
            if (retryAt > requested.reservedAt) {
              return Object.freeze({
                outcome: "pair-limited" as const,
                retryAt,
              });
            }
          }

          if (blocker.activeReservationExpiresAt !== null) {
            const retryAt = parseTimestamp(
              blocker.activeReservationExpiresAt,
              "activeReservationExpiresAt",
            );
            if (retryAt > requested.reservedAt) {
              return Object.freeze({
                outcome: "recipient-in-flight" as const,
                retryAt,
              });
            }
          }

          const throughputReservationCount =
            requireNonnegativeInteger(
              blocker.throughputReservationCount,
              "throughputReservationCount",
            );
          if (
            throughputReservationCount >=
              requested.phoneThroughput
                .maximumOutboundMessagesPerSecond
          ) {
            const oldestReservedAt = parseTimestamp(
              blocker.throughputOldestReservedAt,
              "throughputOldestReservedAt",
            );
            const retryAt = new Date(
              Date.parse(oldestReservedAt) + 1_000,
            ).toISOString();
            if (retryAt <= requested.reservedAt) {
              throw new Error(
                "PostgreSQL returned invalid throughput state",
              );
            }
            return Object.freeze({
              outcome:
                "phone-throughput-limited" as const,
              retryAt,
            });
          }

          if (typeof blocker.recipientDeliveredInWindow !== "boolean") {
            throw new Error("PostgreSQL returned invalid recipient state");
          }
          const occupiedUniqueRecipients = requireNonnegativeInteger(
            blocker.occupiedUniqueRecipients,
            "occupiedUniqueRecipients",
          );
          if (
            requested.portfolioCapacity.kind === "bounded" &&
            !blocker.recipientDeliveredInWindow &&
            occupiedUniqueRecipients >=
              requested.portfolioCapacity.maximumUniqueRecipients
          ) {
            return Object.freeze({
              outcome: "portfolio-limited" as const,
              occupiedUniqueRecipients,
              maximumUniqueRecipients:
                requested.portfolioCapacity.maximumUniqueRecipients,
            });
          }

          const [limitKind, limitValue] = capacityColumns(
            requested.portfolioCapacity,
          );
          const insertResult = await transaction.query<
            Record<string, unknown>
          >(postgresWhatsappRateLimitSql.insertReservation, [
            requested.reservationKey,
            requested.tenantId,
            requested.portfolioKey,
            requested.senderKey,
            requested.recipientKey,
            requested.templateCategory,
            limitKind,
            limitValue,
            requested.reservedAt,
            requested.pairReservedUntil,
            requested.reservationExpiresAt,
            requested.policyEventKey,
            requested.phoneThroughput
              .maximumMessagesPerSecond,
            requested.phoneThroughput
              .maximumOutboundMessagesPerSecond,
          ]);
          const insertedRows = requirePostgresRows(insertResult, 1);
          const saved = insertedRows.length === 1
            ? parseReservation(insertedRows[0])
            : await loadReservation(transaction, requested.reservationKey);
          if (saved === null || !sameReservation(saved, requested)) {
            throw new Error("PostgreSQL WhatsApp reservation was not confirmed");
          }
          return Object.freeze({
            outcome: "reserved" as const,
            reservation: saved.reservation,
            idempotent: insertedRows.length === 0,
          });
        },
      );
    },

    async settle(command: WhatsappRateLimitSettlementCommand) {
      const reservationKey = requirePattern(
        command.reservationKey,
        reservationKeyPattern,
        "reservationKey",
      );
      const outcome = requireSettlementOutcome(command.outcome);
      const settledAt = requireTimestamp(command.settledAt, "settledAt");
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const reservation = await loadReservation(
            transaction,
            reservationKey,
            true,
          );
          if (reservation === null) {
            return Object.freeze({ outcome: "reservation-not-found" as const });
          }
          const existing = await loadSettlement(transaction, reservationKey);
          if (existing !== null) {
            return existing.outcome === outcome && existing.settledAt === settledAt
              ? Object.freeze({
                  outcome: "settled" as const,
                  settlement: existing,
                  idempotent: true,
                })
              : Object.freeze({
                  outcome: "settlement-conflict" as const,
                  existing,
                });
          }
          if (settledAt < reservation.reservation.reservedAt) {
            return Object.freeze({
              outcome: "settlement-precedes-reservation" as const,
            });
          }
          const result = await transaction.query<Record<string, unknown>>(
            postgresWhatsappRateLimitSql.insertSettlement,
            [reservationKey, outcome, settledAt],
          );
          const rows = requirePostgresRows(result, 1);
          if (rows.length !== 1) {
            throw new Error("PostgreSQL WhatsApp settlement was not confirmed");
          }
          const settlement = parseSettlement(rows[0]);
          if (
            settlement.reservationKey !== reservationKey ||
            settlement.outcome !== outcome ||
            settlement.settledAt !== settledAt
          ) {
            throw new Error("PostgreSQL returned a mismatched settlement");
          }
          return Object.freeze({
            outcome: "settled" as const,
            settlement,
            idempotent: false,
          });
        },
      );
    },

    async applyProviderCooldown(command: WhatsappProviderCooldownCommand) {
      const requested = normalizeCooldown(command);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const reservation = await loadReservation(
            transaction,
            requested.reservationKey,
            true,
          );
          if (reservation === null) {
            return Object.freeze({ outcome: "reservation-not-found" as const });
          }
          if (requested.observedAt < reservation.reservation.reservedAt) {
            throw new Error("provider cooldown precedes reservation");
          }
          const existingCooldown = await loadCooldown(
            transaction,
            requested.reservationKey,
          );
          const existingSettlement = await loadSettlement(
            transaction,
            requested.reservationKey,
          );
          if (existingCooldown !== null) {
            if (!sameCooldown(existingCooldown, requested)) {
              return Object.freeze({
                outcome: "cooldown-conflict" as const,
                existing: existingCooldown,
              });
            }
            if (
              existingSettlement === null ||
              existingSettlement.outcome !== "provider-failed" ||
              existingSettlement.settledAt !== requested.observedAt
            ) {
              if (existingSettlement === null) {
                throw new Error("Provider cooldown is missing settlement evidence");
              }
              return Object.freeze({
                outcome: "settlement-conflict" as const,
                existing: existingSettlement,
              });
            }
            return Object.freeze({
              outcome: "applied" as const,
              cooldown: existingCooldown,
              idempotent: true,
            });
          }
          if (
            existingSettlement !== null &&
            (existingSettlement.outcome !== "provider-failed" ||
              existingSettlement.settledAt !== requested.observedAt)
          ) {
            return Object.freeze({
              outcome: "settlement-conflict" as const,
              existing: existingSettlement,
            });
          }
          if (existingSettlement === null) {
            const settlementResult = await transaction.query<
              Record<string, unknown>
            >(postgresWhatsappRateLimitSql.insertSettlement, [
              requested.reservationKey,
              "provider-failed",
              requested.observedAt,
            ]);
            const settlementRows = requirePostgresRows(settlementResult, 1);
            if (settlementRows.length !== 1) {
              throw new Error("PostgreSQL provider settlement was not confirmed");
            }
            const savedSettlement = parseSettlement(settlementRows[0]);
            if (
              savedSettlement.reservationKey !== requested.reservationKey ||
              savedSettlement.outcome !== "provider-failed" ||
              savedSettlement.settledAt !== requested.observedAt
            ) {
              throw new Error("PostgreSQL returned a mismatched provider settlement");
            }
          }
          const cooldownResult = await transaction.query<
            Record<string, unknown>
          >(postgresWhatsappRateLimitSql.insertProviderCooldown, [
            requested.reservationKey,
            requested.scope,
            requested.providerErrorCode,
            requested.observedAt,
            requested.blockedUntil,
          ]);
          const rows = requirePostgresRows(cooldownResult, 1);
          if (rows.length !== 1) {
            throw new Error("PostgreSQL provider cooldown was not confirmed");
          }
          const saved = parseCooldown(rows[0]);
          if (!sameCooldown(saved, requested)) {
            throw new Error("PostgreSQL returned a mismatched provider cooldown");
          }
          return Object.freeze({
            outcome: "applied" as const,
            cooldown: saved,
            idempotent: false,
          });
        },
      );
    },
  });
}
