import {
  whatsappPortfolioMessagingLimits,
  whatsappRateLimitSettlementOutcomes,
  type WhatsappPortfolioCapacity,
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
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const RESERVATION_COLUMNS_SQL = `
  reservation_key AS reservationKey,
  tenant_id AS tenantId,
  portfolio_key AS portfolioKey,
  sender_key AS senderKey,
  recipient_key AS recipientKey,
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

interface ReservationRow {
  reservationKey: unknown;
  tenantId: unknown;
  portfolioKey: unknown;
  senderKey: unknown;
  recipientKey: unknown;
  portfolioLimitKind: unknown;
  portfolioLimitValue: unknown;
  reservedAt: unknown;
  pairReservedUntil: unknown;
  reservationExpiresAt: unknown;
}

interface BlockerRow {
  tenantFound: unknown;
  pairReservedUntil: unknown;
  activeReservationExpiresAt: unknown;
  occupiedUniqueRecipients: unknown;
}

interface SettlementRow {
  reservationKey: unknown;
  outcome: unknown;
  settledAt: unknown;
}

export interface WhatsappRateLimitReservationCommand {
  reservationKey: unknown;
  tenantId: unknown;
  portfolioKey: unknown;
  senderKey: unknown;
  recipientKey: unknown;
  portfolioCapacity: unknown;
  reservedAt: unknown;
  reservationExpiresAt: unknown;
}

export interface WhatsappRateLimitSettlementCommand {
  reservationKey: unknown;
  outcome: unknown;
  settledAt: unknown;
}

export interface WhatsappRateLimitRepository {
  reserveBusinessInitiatedMessage(
    command: WhatsappRateLimitReservationCommand,
  ): Promise<WhatsappRateLimitReservationResult>;
  settle(
    command: WhatsappRateLimitSettlementCommand,
  ): Promise<WhatsappRateLimitSettlementResult>;
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
    portfolioCapacity: parseCapacity(
      row.portfolioLimitKind,
      row.portfolioLimitValue,
    ),
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
    sameCapacity(
      left.portfolioCapacity,
      right.portfolioCapacity,
    ) &&
    left.reservedAt === right.reservedAt &&
    left.pairReservedUntil === right.pairReservedUntil &&
    left.reservationExpiresAt ===
      right.reservationExpiresAt
  );
}

function normalizeReservation(
  command: WhatsappRateLimitReservationCommand,
): WhatsappRateLimitReservation {
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
    portfolioCapacity: requirePortfolioCapacity(
      command.portfolioCapacity,
    ),
    reservedAt,
    pairReservedUntil,
    reservationExpiresAt,
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
  };
}
