import type {
  D1DatabaseBinding,
} from "./d1.ts";
import type {
  WhatsappRateLimitSettlementOutcome,
} from "../shared/domain/whatsappRateLimit.ts";

const deliveryKeyPattern =
  /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const statusEventKeyPattern = /^[0-9a-f]{64}$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const unsafeControlCharacters = /[\u0000-\u001f\u007f]/;

export type BotReplyProviderDeliveryStatus =
  | "accepted"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type BotReplyProviderWebhookStatus =
  Exclude<BotReplyProviderDeliveryStatus, "accepted">;

export type BotReplyProviderTerminalOutcome =
  Exclude<
    WhatsappRateLimitSettlementOutcome,
    "cancelled-before-submit"
  >;

export interface BotReplyDeliveryProviderLink {
  deliveryKey: string;
  tenantId: number;
  providerMessageId: string;
  reservationKey: string;
  providerStatus: BotReplyProviderDeliveryStatus;
  lastStatusEventKey: string | null;
  lastStatusEventAt: string | null;
  terminalOutcome: BotReplyProviderTerminalOutcome | null;
  terminalSettledAt: string | null;
  acceptedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyBotReplyProviderStatus {
  tenantId: number;
  providerMessageId: string;
  status: BotReplyProviderWebhookStatus;
  statusEventKey: string;
  /** Raw provider occurrence time from the Meta webhook. */
  statusEventAt: string;
  /** Trusted local time at which Connect reconciles the webhook. */
  reconciledAt: string;
}

export interface BotReplyRateLimitSettlementInstruction {
  reservationKey: string;
  outcome: BotReplyProviderTerminalOutcome;
  settledAt: string;
}

export type ApplyBotReplyProviderStatusResult =
  | {
      outcome: "applied" | "duplicate" | "stale";
      link: BotReplyDeliveryProviderLink;
      settlement: BotReplyRateLimitSettlementInstruction | null;
    }
  | {
      outcome: "not-found" | "event-conflict" | "terminal-conflict";
    };

export interface BotReplyDeliveryProviderRepository {
  applyProviderStatus(
    input: ApplyBotReplyProviderStatus,
  ): Promise<ApplyBotReplyProviderStatusResult>;
}

interface BotReplyDeliveryProviderLinkRow {
  deliveryKey: unknown;
  tenantId: unknown;
  providerMessageId: unknown;
  reservationKey: unknown;
  providerStatus: unknown;
  lastStatusEventKey: unknown;
  lastStatusEventAt: unknown;
  terminalOutcome: unknown;
  terminalSettledAt: unknown;
  acceptedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

const linkColumnsSql = `
  delivery_key AS deliveryKey,
  tenant_id AS tenantId,
  provider_message_id AS providerMessageId,
  reservation_key AS reservationKey,
  provider_status AS providerStatus,
  last_status_event_key AS lastStatusEventKey,
  last_status_event_at AS lastStatusEventAt,
  terminal_outcome AS terminalOutcome,
  terminal_settled_at AS terminalSettledAt,
  accepted_at AS acceptedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const findByProviderMessageSql = `
  SELECT ${linkColumnsSql}
  FROM bot_reply_delivery_provider_links
  WHERE tenant_id = ?1
    AND provider_message_id = ?2
  LIMIT 1
`;

const applyProviderStatusSql = `
  UPDATE bot_reply_delivery_provider_links
  SET
    provider_status = ?3,
    last_status_event_key = ?4,
    last_status_event_at = ?5,
    terminal_outcome = CASE
      WHEN terminal_outcome IS NULL THEN ?6
      ELSE terminal_outcome
    END,
    terminal_settled_at = CASE
      WHEN terminal_outcome IS NULL AND ?6 IS NOT NULL
      THEN max(updated_at, ?7)
      ELSE terminal_settled_at
    END,
    updated_at = max(updated_at, ?7)
  WHERE tenant_id = ?1
    AND provider_message_id = ?2
    AND last_status_event_key IS NOT ?4
    AND (
      terminal_outcome IS NULL
      OR (
        ?6 IS NOT NULL
        AND terminal_outcome = ?6
      )
    )
    AND (
      last_status_event_at IS NULL
      OR last_status_event_at < ?5
      OR (
        last_status_event_at = ?5
        AND (
          CASE ?3
            WHEN 'sent' THEN 1
            WHEN 'delivered' THEN 2
            WHEN 'read' THEN 3
            WHEN 'failed' THEN 4
          END
        ) > (
          CASE provider_status
            WHEN 'accepted' THEN 0
            WHEN 'sent' THEN 1
            WHEN 'delivered' THEN 2
            WHEN 'read' THEN 3
            WHEN 'failed' THEN 4
          END
        )
      )
    )
`;

function requirePositiveInteger(
  value: unknown,
  fieldName: string,
): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error(`${fieldName} is invalid`);
  }
  return Number(value);
}

function requirePattern(
  value: unknown,
  pattern: RegExp,
  fieldName: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${fieldName} is invalid`);
  }
  return value;
}

function requireProviderMessageId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length < 1 ||
    value.length > 255 ||
    unsafeControlCharacters.test(value)
  ) {
    throw new Error("providerMessageId is invalid");
  }
  return value;
}

function requireTimestamp(value: unknown, fieldName: string): string {
  if (
    typeof value !== "string" ||
    !canonicalTimestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${fieldName} is invalid`);
  }
  return value;
}

function requireProviderStatus(
  value: unknown,
  allowAccepted: boolean,
): BotReplyProviderDeliveryStatus {
  if (
    value !== "sent" &&
    value !== "delivered" &&
    value !== "read" &&
    value !== "failed" &&
    !(allowAccepted && value === "accepted")
  ) {
    throw new Error("providerStatus is invalid");
  }
  return value;
}

function terminalOutcomeFor(
  status: BotReplyProviderWebhookStatus,
): BotReplyProviderTerminalOutcome | null {
  if (status === "delivered" || status === "read") {
    return "delivered";
  }
  return status === "failed" ? "provider-failed" : null;
}

function parseLink(
  row: BotReplyDeliveryProviderLinkRow,
): BotReplyDeliveryProviderLink {
  const providerStatus = requireProviderStatus(row.providerStatus, true);
  const lastStatusEventKey = row.lastStatusEventKey === null
    ? null
    : requirePattern(
        row.lastStatusEventKey,
        statusEventKeyPattern,
        "D1 lastStatusEventKey",
      );
  const lastStatusEventAt = row.lastStatusEventAt === null
    ? null
    : requireTimestamp(row.lastStatusEventAt, "D1 lastStatusEventAt");
  const expectedTerminal = providerStatus === "accepted" ||
      providerStatus === "sent"
    ? null
    : terminalOutcomeFor(providerStatus);
  const terminalOutcome = row.terminalOutcome === null
    ? null
    : row.terminalOutcome;
  const terminalSettledAt = row.terminalSettledAt === null
    ? null
    : requireTimestamp(row.terminalSettledAt, "D1 terminalSettledAt");

  if (
    (lastStatusEventKey === null) !== (lastStatusEventAt === null) ||
    (providerStatus === "accepted") !== (lastStatusEventKey === null) ||
    terminalOutcome !== expectedTerminal ||
    (expectedTerminal === null) !== (terminalSettledAt === null)
  ) {
    throw new Error("D1 returned inconsistent bot reply provider state");
  }

  return Object.freeze({
    deliveryKey: requirePattern(
      row.deliveryKey,
      deliveryKeyPattern,
      "D1 deliveryKey",
    ),
    tenantId: requirePositiveInteger(row.tenantId, "D1 tenantId"),
    providerMessageId: requireProviderMessageId(row.providerMessageId),
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "D1 reservationKey",
    ),
    providerStatus,
    lastStatusEventKey,
    lastStatusEventAt,
    terminalOutcome: terminalOutcome as BotReplyProviderTerminalOutcome | null,
    terminalSettledAt,
    acceptedAt: requireTimestamp(row.acceptedAt, "D1 acceptedAt"),
    createdAt: requireTimestamp(row.createdAt, "D1 createdAt"),
    updatedAt: requireTimestamp(row.updatedAt, "D1 updatedAt"),
  });
}

function settlementFromLink(
  link: BotReplyDeliveryProviderLink,
): BotReplyRateLimitSettlementInstruction | null {
  return link.terminalOutcome === null || link.terminalSettledAt === null
    ? null
    : Object.freeze({
        reservationKey: link.reservationKey,
        outcome: link.terminalOutcome,
        settledAt: link.terminalSettledAt,
      });
}

async function findByProviderMessage(
  database: D1DatabaseBinding,
  tenantId: number,
  providerMessageId: string,
): Promise<BotReplyDeliveryProviderLink | null> {
  const row = await database
    .prepare(findByProviderMessageSql)
    .bind(tenantId, providerMessageId)
    .first<BotReplyDeliveryProviderLinkRow>();
  if (!row) return null;
  const link = parseLink(row);
  if (
    link.tenantId !== tenantId ||
    link.providerMessageId !== providerMessageId
  ) {
    throw new Error(
      "D1 returned cross-scope bot reply provider state",
    );
  }
  return link;
}

export function createBotReplyDeliveryProviderRepository(
  database: D1DatabaseBinding,
): Readonly<BotReplyDeliveryProviderRepository> {
  if (
    typeof database?.prepare !== "function" ||
    typeof database?.batch !== "function"
  ) {
    throw new Error("D1 bot reply provider repository is invalid");
  }

  return Object.freeze({
    async applyProviderStatus(
      rawInput: ApplyBotReplyProviderStatus,
    ): Promise<ApplyBotReplyProviderStatusResult> {
      const tenantId = requirePositiveInteger(rawInput?.tenantId, "tenantId");
      const providerMessageId = requireProviderMessageId(
        rawInput?.providerMessageId,
      );
      const status = requireProviderStatus(
        rawInput?.status,
        false,
      ) as BotReplyProviderWebhookStatus;
      const statusEventKey = requirePattern(
        rawInput?.statusEventKey,
        statusEventKeyPattern,
        "statusEventKey",
      );
      const statusEventAt = requireTimestamp(
        rawInput?.statusEventAt,
        "statusEventAt",
      );
      const intendedTerminal = terminalOutcomeFor(status);
      const reconciledAt = requireTimestamp(
        rawInput?.reconciledAt,
        "reconciledAt",
      );
      const updateResult = await database
        .prepare(applyProviderStatusSql)
        .bind(
          tenantId,
          providerMessageId,
          status,
          statusEventKey,
          statusEventAt,
          intendedTerminal,
          reconciledAt,
        )
        .run();

      if (!updateResult.success) {
        throw new Error(
          updateResult.error ?? "D1 bot reply provider status failed",
        );
      }

      const link = await findByProviderMessage(
        database,
        tenantId,
        providerMessageId,
      );
      if (!link) return Object.freeze({ outcome: "not-found" as const });

      if (link.lastStatusEventKey === statusEventKey) {
        if (
          link.providerStatus !== status ||
          link.lastStatusEventAt !== statusEventAt
        ) {
          return Object.freeze({ outcome: "event-conflict" as const });
        }
        return Object.freeze({
          outcome: updateResult.meta?.changes === 1
            ? "applied" as const
            : "duplicate" as const,
          link,
          settlement: settlementFromLink(link),
        });
      }

      if (
        intendedTerminal !== null &&
        link.terminalOutcome !== null &&
        link.terminalOutcome !== intendedTerminal
      ) {
        return Object.freeze({ outcome: "terminal-conflict" as const });
      }

      return Object.freeze({
        outcome: "stale" as const,
        link,
        settlement: settlementFromLink(link),
      });
    },
  });
}
