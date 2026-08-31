import type {
  ApplyBotReplyProviderStatus,
  ApplyBotReplyProviderStatusResult,
  BotReplyDeliveryProviderLink,
  BotReplyDeliveryProviderRepository,
  BotReplyProviderDeliveryStatus,
  BotReplyProviderTerminalOutcome,
  BotReplyProviderWebhookStatus,
  BotReplyRateLimitSettlementInstruction,
} from "../../db/botReplyDeliveryProviderRepository.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresTransactionManager,
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const deliveryKeyPattern =
  /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const statusEventKeyPattern = /^[0-9a-f]{64}$/;
const unsafeControlCharacters = /[\u0000-\u001f\u007f]/;

const linkRowKeys = Object.freeze([
  "acceptedAt",
  "createdAt",
  "deliveryKey",
  "lastStatusEventAt",
  "lastStatusEventKey",
  "providerMessageId",
  "providerStatus",
  "reservationKey",
  "tenantId",
  "terminalOutcome",
  "terminalSettledAt",
  "updatedAt",
]);

const linkColumns = `
  link.delivery_key AS "deliveryKey",
  link.tenant_id AS "tenantId",
  link.provider_message_id AS "providerMessageId",
  link.reservation_key AS "reservationKey",
  link.provider_status AS "providerStatus",
  link.last_status_event_key AS "lastStatusEventKey",
  link.last_status_event_at AS "lastStatusEventAt",
  link.terminal_outcome AS "terminalOutcome",
  link.terminal_settled_at AS "terminalSettledAt",
  link.accepted_at AS "acceptedAt",
  link.created_at AS "createdAt",
  link.updated_at AS "updatedAt"
`;

export const postgresBotReplyDeliveryProviderSql = Object.freeze({
  findByProviderMessageForUpdate: `
    SELECT ${linkColumns}
    FROM bot_reply_delivery_provider_links AS link
    WHERE link.tenant_id = $1
      AND link.provider_message_id = $2
    LIMIT 1
    FOR UPDATE OF link
  `,
  applyProviderStatus: `
    UPDATE bot_reply_delivery_provider_links
    SET
      provider_status = $3,
      last_status_event_key = $4,
      last_status_event_at = $5::timestamptz,
      terminal_outcome = CASE
        WHEN terminal_outcome IS NULL THEN $6
        ELSE terminal_outcome
      END,
      terminal_settled_at = CASE
        WHEN terminal_outcome IS NULL AND $6 IS NOT NULL
        THEN greatest(updated_at, $7::timestamptz)
        ELSE terminal_settled_at
      END,
      updated_at = greatest(updated_at, $7::timestamptz)
    WHERE tenant_id = $1
      AND provider_message_id = $2
    RETURNING delivery_key AS "deliveryKey"
  `,
});

function requirePositiveInteger(value: unknown, fieldName: string): number {
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
  if (status === "delivered" || status === "read") return "delivered";
  return status === "failed" ? "provider-failed" : null;
}

function parseLink(value: unknown): BotReplyDeliveryProviderLink {
  const row = requireExactPostgresRow(value, linkRowKeys);
  const providerStatus = requireProviderStatus(row.providerStatus, true);
  const lastStatusEventKey = row.lastStatusEventKey === null
    ? null
    : requirePattern(
        row.lastStatusEventKey,
        statusEventKeyPattern,
        "lastStatusEventKey",
      );
  const lastStatusEventAt = row.lastStatusEventAt === null
    ? null
    : parsePostgresTimestamp(row.lastStatusEventAt);
  const terminalOutcome = row.terminalOutcome === null
    ? null
    : row.terminalOutcome;
  const terminalSettledAt = row.terminalSettledAt === null
    ? null
    : parsePostgresTimestamp(row.terminalSettledAt);
  const expectedTerminal = providerStatus === "accepted" ||
      providerStatus === "sent"
    ? null
    : terminalOutcomeFor(providerStatus);

  if (
    (lastStatusEventKey === null) !== (lastStatusEventAt === null) ||
    (providerStatus === "accepted") !== (lastStatusEventKey === null) ||
    terminalOutcome !== expectedTerminal ||
    (expectedTerminal === null) !== (terminalSettledAt === null)
  ) {
    throw new Error("PostgreSQL returned inconsistent bot reply provider state");
  }

  return Object.freeze({
    deliveryKey: requirePattern(
      row.deliveryKey,
      deliveryKeyPattern,
      "deliveryKey",
    ),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    providerMessageId: requireProviderMessageId(row.providerMessageId),
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
    providerStatus,
    lastStatusEventKey,
    lastStatusEventAt,
    terminalOutcome: terminalOutcome as BotReplyProviderTerminalOutcome | null,
    terminalSettledAt,
    acceptedAt: parsePostgresTimestamp(row.acceptedAt),
    createdAt: parsePostgresTimestamp(row.createdAt),
    updatedAt: parsePostgresTimestamp(row.updatedAt),
  });
}

function normalizeStatus(
  input: ApplyBotReplyProviderStatus,
): Readonly<ApplyBotReplyProviderStatus> {
  return Object.freeze({
    tenantId: requirePositiveInteger(input?.tenantId, "tenantId"),
    providerMessageId: requireProviderMessageId(input?.providerMessageId),
    status: requireProviderStatus(
      input?.status,
      false,
    ) as BotReplyProviderWebhookStatus,
    statusEventKey: requirePattern(
      input?.statusEventKey,
      statusEventKeyPattern,
      "statusEventKey",
    ),
    statusEventAt: parsePostgresTimestamp(input?.statusEventAt),
    reconciledAt: parsePostgresTimestamp(input?.reconciledAt),
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

function statusRank(status: BotReplyProviderDeliveryStatus): number {
  if (status === "accepted") return 0;
  if (status === "sent") return 1;
  if (status === "delivered") return 2;
  if (status === "read") return 3;
  return 4;
}

function shouldApplyStatus(
  link: Readonly<BotReplyDeliveryProviderLink>,
  input: Readonly<ApplyBotReplyProviderStatus>,
  intendedTerminal: BotReplyProviderTerminalOutcome | null,
): boolean {
  if (link.terminalOutcome !== null && intendedTerminal === null) return false;
  if (link.lastStatusEventAt === null) return true;
  if (input.statusEventAt > link.lastStatusEventAt) return true;
  return input.statusEventAt === link.lastStatusEventAt &&
    statusRank(input.status) > statusRank(link.providerStatus);
}

async function loadLink(
  transaction: PostgresQueryExecutor,
  tenantId: number,
  providerMessageId: string,
): Promise<BotReplyDeliveryProviderLink | null> {
  const rows = requirePostgresRows(
    await transaction.query<unknown>(
      postgresBotReplyDeliveryProviderSql.findByProviderMessageForUpdate,
      [tenantId, providerMessageId],
    ),
    1,
  );
  if (rows.length === 0) return null;
  const link = parseLink(rows[0]);
  if (
    link.tenantId !== tenantId ||
    link.providerMessageId !== providerMessageId
  ) {
    throw new Error(
      "PostgreSQL returned cross-scope bot reply provider state",
    );
  }
  return link;
}

export function createPostgresBotReplyDeliveryProviderRepository(
  dependencies: Readonly<{
    transactions: PostgresTransactionManager;
  }>,
): Readonly<BotReplyDeliveryProviderRepository> {
  if (typeof dependencies?.transactions?.transaction !== "function") {
    throw new Error("PostgreSQL bot reply provider dependencies are invalid");
  }

  return Object.freeze({
    async applyProviderStatus(
      rawInput: ApplyBotReplyProviderStatus,
    ): Promise<ApplyBotReplyProviderStatusResult> {
      const input = normalizeStatus(rawInput);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const existing = await loadLink(
            transaction,
            input.tenantId,
            input.providerMessageId,
          );
          if (existing === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          if (existing.lastStatusEventKey === input.statusEventKey) {
            if (
              existing.providerStatus !== input.status ||
              existing.lastStatusEventAt !== input.statusEventAt
            ) {
              return Object.freeze({ outcome: "event-conflict" as const });
            }
            return Object.freeze({
              outcome: "duplicate" as const,
              link: existing,
              settlement: settlementFromLink(existing),
            });
          }

          const intendedTerminal = terminalOutcomeFor(input.status);
          if (
            intendedTerminal !== null &&
            existing.terminalOutcome !== null &&
            existing.terminalOutcome !== intendedTerminal
          ) {
            return Object.freeze({ outcome: "terminal-conflict" as const });
          }
          if (!shouldApplyStatus(existing, input, intendedTerminal)) {
            return Object.freeze({
              outcome: "stale" as const,
              link: existing,
              settlement: settlementFromLink(existing),
            });
          }

          const updatedRows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyDeliveryProviderSql.applyProviderStatus,
              [
                input.tenantId,
                input.providerMessageId,
                input.status,
                input.statusEventKey,
                input.statusEventAt,
                intendedTerminal,
                input.reconciledAt,
              ],
            ),
            1,
          );
          if (updatedRows.length !== 1) {
            throw new Error("PostgreSQL bot reply provider status was not applied");
          }
          const updated = await loadLink(
            transaction,
            input.tenantId,
            input.providerMessageId,
          );
          if (
            updated === null ||
            updated.providerStatus !== input.status ||
            updated.lastStatusEventKey !== input.statusEventKey ||
            updated.lastStatusEventAt !== input.statusEventAt
          ) {
            throw new Error("PostgreSQL returned mismatched bot reply status");
          }
          return Object.freeze({
            outcome: "applied" as const,
            link: updated,
            settlement: settlementFromLink(updated),
          });
        },
      );
    },
  });
}
