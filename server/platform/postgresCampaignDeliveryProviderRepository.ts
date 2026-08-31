import type {
  ApplyCampaignProviderStatus,
  ApplyCampaignProviderStatusResult,
  CampaignDeliveryProviderLink,
  CampaignDeliveryProviderRepository,
  CampaignProviderDeliveryStatus,
  CampaignProviderTerminalOutcome,
  CampaignProviderWebhookStatus,
  CampaignRateLimitSettlementInstruction,
  RecordCampaignDeliveryAcceptance,
  RecordCampaignDeliveryAcceptanceResult,
} from "../../db/campaignDeliveryProviderRepository.ts";
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

const deliveryKeyPattern = /^campaign_delivery_v1_[0-9a-f]{64}$/;
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const statusEventKeyPattern = /^[0-9a-f]{64}$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const identityRowKeys = Object.freeze(["deliveryKey"]);
const linkRowKeys = Object.freeze([
  "acceptedAt",
  "createdAt",
  "deliveryKey",
  "lastStatusEventAt",
  "lastStatusEventKey",
  "providerMessageId",
  "providerStatus",
  "recipientStatus",
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
  link.updated_at AS "updatedAt",
  recipient.status AS "recipientStatus"
`;

export const postgresCampaignDeliveryProviderSql = Object.freeze({
  insertAcceptance: `
    INSERT INTO campaign_delivery_provider_links (
      delivery_key,
      tenant_id,
      provider_message_id,
      reservation_key,
      provider_status,
      last_status_event_key,
      last_status_event_at,
      terminal_outcome,
      terminal_settled_at,
      accepted_at,
      created_at,
      updated_at
    ) VALUES (
      $2, $1, $3, $4, 'accepted',
      NULL, NULL, NULL, NULL,
      $5::timestamptz, $5::timestamptz, $5::timestamptz
    )
    ON CONFLICT DO NOTHING
    RETURNING delivery_key AS "deliveryKey"
  `,
  findByDeliveryForUpdate: `
    SELECT ${linkColumns}
    FROM campaign_delivery_provider_links AS link
    INNER JOIN campaign_recipients AS recipient
      ON recipient.delivery_key = link.delivery_key
     AND recipient.tenant_id = link.tenant_id
    WHERE link.tenant_id = $1
      AND link.delivery_key = $2
    LIMIT 1
    FOR UPDATE OF link, recipient
  `,
  findByProviderMessageForUpdate: `
    SELECT ${linkColumns}
    FROM campaign_delivery_provider_links AS link
    INNER JOIN campaign_recipients AS recipient
      ON recipient.delivery_key = link.delivery_key
     AND recipient.tenant_id = link.tenant_id
    WHERE link.tenant_id = $1
      AND link.provider_message_id = $2
    LIMIT 1
    FOR UPDATE OF link, recipient
  `,
  applyProviderStatus: `
    UPDATE campaign_delivery_provider_links
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

export interface PostgresCampaignDeliveryProviderDependencies {
  readonly transactions: PostgresTransactionManager;
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
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
    value.length === 0 ||
    value.length > 255 ||
    value !== value.trim() ||
    controlCharacterPattern.test(value)
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

function parseTimestamp(value: unknown, fieldName: string): string {
  const timestamp = parsePostgresTimestamp(value);
  return requireTimestamp(timestamp, fieldName);
}

function requireProviderStatus(
  value: unknown,
  allowAccepted: boolean,
): CampaignProviderDeliveryStatus {
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
  status: CampaignProviderWebhookStatus,
): CampaignProviderTerminalOutcome | null {
  if (status === "delivered" || status === "read") return "delivered";
  return status === "failed" ? "provider-failed" : null;
}

function expectedRecipientStatus(
  status: CampaignProviderDeliveryStatus,
): CampaignDeliveryProviderLink["recipientStatus"] {
  return status === "sent" ? "accepted" : status;
}

function parseLink(value: unknown): Readonly<CampaignDeliveryProviderLink> {
  const row = requireExactPostgresRow(value, linkRowKeys);
  const providerStatus = requireProviderStatus(row.providerStatus, true);
  const lastStatusEventKey = row.lastStatusEventKey === null
    ? null
    : requirePattern(
        row.lastStatusEventKey,
        statusEventKeyPattern,
        "PostgreSQL lastStatusEventKey",
      );
  const lastStatusEventAt = row.lastStatusEventAt === null
    ? null
    : parseTimestamp(
        row.lastStatusEventAt,
        "PostgreSQL lastStatusEventAt",
      );
  const expectedTerminal = providerStatus === "accepted" ||
      providerStatus === "sent"
    ? null
    : terminalOutcomeFor(providerStatus);
  const terminalOutcome = row.terminalOutcome === null
    ? null
    : row.terminalOutcome;
  const terminalSettledAt = row.terminalSettledAt === null
    ? null
    : parseTimestamp(
        row.terminalSettledAt,
        "PostgreSQL terminalSettledAt",
      );

  if (
    (lastStatusEventKey === null) !== (lastStatusEventAt === null) ||
    (providerStatus === "accepted") !== (lastStatusEventKey === null) ||
    terminalOutcome !== expectedTerminal ||
    (expectedTerminal === null) !== (terminalSettledAt === null) ||
    row.recipientStatus !== expectedRecipientStatus(providerStatus)
  ) {
    throw new Error("PostgreSQL returned inconsistent campaign provider state");
  }

  const acceptedAt = parseTimestamp(row.acceptedAt, "PostgreSQL acceptedAt");
  const createdAt = parseTimestamp(row.createdAt, "PostgreSQL createdAt");
  const updatedAt = parseTimestamp(row.updatedAt, "PostgreSQL updatedAt");
  if (createdAt !== acceptedAt || updatedAt < acceptedAt) {
    throw new Error("PostgreSQL returned invalid campaign provider time");
  }

  return Object.freeze({
    deliveryKey: requirePattern(
      row.deliveryKey,
      deliveryKeyPattern,
      "PostgreSQL deliveryKey",
    ),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    providerMessageId: requireProviderMessageId(row.providerMessageId),
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "PostgreSQL reservationKey",
    ),
    providerStatus,
    lastStatusEventKey,
    lastStatusEventAt,
    terminalOutcome:
      terminalOutcome as CampaignProviderTerminalOutcome | null,
    terminalSettledAt,
    acceptedAt,
    createdAt,
    updatedAt,
    recipientStatus:
      row.recipientStatus as CampaignDeliveryProviderLink["recipientStatus"],
  });
}

function settlementFromLink(
  link: Readonly<CampaignDeliveryProviderLink>,
): Readonly<CampaignRateLimitSettlementInstruction> | null {
  return link.terminalOutcome === null || link.terminalSettledAt === null
    ? null
    : Object.freeze({
        reservationKey: link.reservationKey,
        outcome: link.terminalOutcome,
        settledAt: link.terminalSettledAt,
      });
}

async function loadLink(
  transaction: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<Readonly<CampaignDeliveryProviderLink> | null> {
  const rows = requirePostgresRows(
    await transaction.query<unknown>(sql, parameters),
    1,
  );
  return rows.length === 0 ? null : parseLink(rows[0]);
}

function requireDeliveryIdentity(value: unknown, deliveryKey: string): void {
  const row = requireExactPostgresRow(value, identityRowKeys);
  if (row.deliveryKey !== deliveryKey) {
    throw new Error("PostgreSQL returned mismatched campaign delivery identity");
  }
}

function normalizeAcceptance(
  input: RecordCampaignDeliveryAcceptance,
): Readonly<RecordCampaignDeliveryAcceptance> {
  return Object.freeze({
    tenantId: requirePositiveInteger(input?.tenantId, "tenantId"),
    deliveryKey: requirePattern(
      input?.deliveryKey,
      deliveryKeyPattern,
      "deliveryKey",
    ),
    providerMessageId: requireProviderMessageId(input?.providerMessageId),
    reservationKey: requirePattern(
      input?.reservationKey,
      reservationKeyPattern,
      "reservationKey",
    ),
    acceptedAt: requireTimestamp(input?.acceptedAt, "acceptedAt"),
  });
}

function normalizeStatus(
  input: ApplyCampaignProviderStatus,
): Readonly<ApplyCampaignProviderStatus> {
  return Object.freeze({
    tenantId: requirePositiveInteger(input?.tenantId, "tenantId"),
    providerMessageId: requireProviderMessageId(input?.providerMessageId),
    status: requireProviderStatus(
      input?.status,
      false,
    ) as CampaignProviderWebhookStatus,
    statusEventKey: requirePattern(
      input?.statusEventKey,
      statusEventKeyPattern,
      "statusEventKey",
    ),
    statusEventAt: requireTimestamp(input?.statusEventAt, "statusEventAt"),
    reconciledAt: requireTimestamp(input?.reconciledAt, "reconciledAt"),
  });
}

function statusRank(status: CampaignProviderDeliveryStatus): number {
  if (status === "accepted") return 0;
  if (status === "sent") return 1;
  if (status === "delivered") return 2;
  if (status === "read") return 3;
  return 4;
}

function shouldApplyStatus(
  link: Readonly<CampaignDeliveryProviderLink>,
  input: Readonly<ApplyCampaignProviderStatus>,
  intendedTerminal: CampaignProviderTerminalOutcome | null,
): boolean {
  if (link.terminalOutcome !== null && intendedTerminal === null) return false;
  if (link.lastStatusEventAt === null) return true;
  if (input.statusEventAt > link.lastStatusEventAt) return true;
  return input.statusEventAt === link.lastStatusEventAt &&
    statusRank(input.status) > statusRank(link.providerStatus);
}

export function createPostgresCampaignDeliveryProviderRepository(
  dependencies: Readonly<PostgresCampaignDeliveryProviderDependencies>,
): CampaignDeliveryProviderRepository {
  if (typeof dependencies?.transactions?.transaction !== "function") {
    throw new Error("PostgreSQL campaign provider dependencies are invalid");
  }

  return Object.freeze({
    async recordAccepted(
      rawInput: RecordCampaignDeliveryAcceptance,
    ): Promise<RecordCampaignDeliveryAcceptanceResult> {
      const input = normalizeAcceptance(rawInput);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const inserted = requirePostgresRows(
            await transaction.query<unknown>(
              postgresCampaignDeliveryProviderSql.insertAcceptance,
              [
                input.tenantId,
                input.deliveryKey,
                input.providerMessageId,
                input.reservationKey,
                input.acceptedAt,
              ],
            ),
            1,
          );
          if (inserted.length === 1) {
            requireDeliveryIdentity(inserted[0], input.deliveryKey);
          }
          const link = await loadLink(
            transaction,
            postgresCampaignDeliveryProviderSql.findByDeliveryForUpdate,
            [input.tenantId, input.deliveryKey],
          );
          if (
            link === null ||
            link.tenantId !== input.tenantId ||
            link.providerMessageId !== input.providerMessageId ||
            link.reservationKey !== input.reservationKey ||
            link.acceptedAt !== input.acceptedAt
          ) {
            throw new Error("PostgreSQL campaign acceptance identity conflicts");
          }
          return Object.freeze({
            outcome: inserted.length === 1 ? "recorded" as const :
              "idempotent" as const,
            link,
          });
        },
      );
    },

    async applyProviderStatus(
      rawInput: ApplyCampaignProviderStatus,
    ): Promise<ApplyCampaignProviderStatusResult> {
      const input = normalizeStatus(rawInput);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const existing = await loadLink(
            transaction,
            postgresCampaignDeliveryProviderSql
              .findByProviderMessageForUpdate,
            [input.tenantId, input.providerMessageId],
          );
          if (existing === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          if (existing.tenantId !== input.tenantId) {
            throw new Error("PostgreSQL returned cross-tenant provider state");
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
              postgresCampaignDeliveryProviderSql.applyProviderStatus,
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
            throw new Error("PostgreSQL campaign provider status was not applied");
          }
          requireDeliveryIdentity(updatedRows[0], existing.deliveryKey);
          const updated = await loadLink(
            transaction,
            postgresCampaignDeliveryProviderSql
              .findByProviderMessageForUpdate,
            [input.tenantId, input.providerMessageId],
          );
          if (
            updated === null ||
            updated.providerStatus !== input.status ||
            updated.lastStatusEventKey !== input.statusEventKey ||
            updated.lastStatusEventAt !== input.statusEventAt
          ) {
            throw new Error("PostgreSQL returned mismatched provider status");
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
