import type {
  D1DatabaseBinding,
} from "./d1.ts";
import type {
  WhatsappRateLimitSettlementOutcome,
} from "../shared/domain/whatsappRateLimit.ts";

const deliveryKeyPattern =
  /^campaign_delivery_v1_[0-9a-f]{64}$/;
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const statusEventKeyPattern = /^[0-9a-f]{64}$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const LINK_COLUMNS_SQL = `
  links.delivery_key AS deliveryKey,
  links.tenant_id AS tenantId,
  links.provider_message_id AS providerMessageId,
  links.reservation_key AS reservationKey,
  links.provider_status AS providerStatus,
  links.last_status_event_key AS lastStatusEventKey,
  links.last_status_event_at AS lastStatusEventAt,
  links.terminal_outcome AS terminalOutcome,
  links.terminal_settled_at AS terminalSettledAt,
  links.accepted_at AS acceptedAt,
  links.created_at AS createdAt,
  links.updated_at AS updatedAt,
  recipients.status AS recipientStatus
`;

const INSERT_ACCEPTANCE_SQL = `
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
  )
  VALUES (
    ?2,
    ?1,
    ?3,
    ?4,
    'accepted',
    NULL,
    NULL,
    NULL,
    NULL,
    ?5,
    ?5,
    ?5
  )
  ON CONFLICT DO NOTHING
`;

const FIND_LINK_BY_DELIVERY_SQL = `
  SELECT
    ${LINK_COLUMNS_SQL}
  FROM campaign_delivery_provider_links AS links
  INNER JOIN campaign_recipients AS recipients
    ON recipients.delivery_key = links.delivery_key
    AND recipients.tenant_id = links.tenant_id
  WHERE links.tenant_id = ?1
    AND links.delivery_key = ?2
  LIMIT 1
`;

const FIND_LINK_BY_PROVIDER_MESSAGE_SQL = `
  SELECT
    ${LINK_COLUMNS_SQL}
  FROM campaign_delivery_provider_links AS links
  INNER JOIN campaign_recipients AS recipients
    ON recipients.delivery_key = links.delivery_key
    AND recipients.tenant_id = links.tenant_id
  WHERE links.tenant_id = ?1
    AND links.provider_message_id = ?2
  LIMIT 1
`;

const APPLY_PROVIDER_STATUS_SQL = `
  UPDATE campaign_delivery_provider_links
  SET
    provider_status = ?3,
    last_status_event_key = ?4,
    last_status_event_at = ?5,
    terminal_outcome = CASE
      WHEN terminal_outcome IS NULL
      THEN ?6
      ELSE terminal_outcome
    END,
    terminal_settled_at = CASE
      WHEN terminal_outcome IS NULL
        AND ?6 IS NOT NULL
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

export type CampaignProviderDeliveryStatus =
  | "accepted"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type CampaignProviderWebhookStatus =
  Exclude<CampaignProviderDeliveryStatus, "accepted">;

export type CampaignProviderTerminalOutcome =
  Exclude<
    WhatsappRateLimitSettlementOutcome,
    "cancelled-before-submit"
  >;

export interface CampaignDeliveryProviderLink {
  deliveryKey: string;
  tenantId: number;
  providerMessageId: string;
  reservationKey: string;
  providerStatus: CampaignProviderDeliveryStatus;
  lastStatusEventKey: string | null;
  lastStatusEventAt: string | null;
  terminalOutcome:
    CampaignProviderTerminalOutcome | null;
  terminalSettledAt: string | null;
  acceptedAt: string;
  createdAt: string;
  updatedAt: string;
  recipientStatus:
    | "accepted"
    | "delivered"
    | "read"
    | "failed";
}

export interface RecordCampaignDeliveryAcceptance {
  tenantId: number;
  deliveryKey: string;
  providerMessageId: string;
  reservationKey: string;
  acceptedAt: string;
}

export interface ApplyCampaignProviderStatus {
  tenantId: number;
  providerMessageId: string;
  status: CampaignProviderWebhookStatus;
  statusEventKey: string;
  statusEventAt: string;
  reconciledAt: string;
}

export interface CampaignRateLimitSettlementInstruction {
  reservationKey: string;
  outcome: CampaignProviderTerminalOutcome;
  settledAt: string;
}

export type RecordCampaignDeliveryAcceptanceResult = {
  outcome: "recorded" | "idempotent";
  link: CampaignDeliveryProviderLink;
};

export type ApplyCampaignProviderStatusResult =
  | {
      outcome:
        | "applied"
        | "duplicate"
        | "stale";
      link: CampaignDeliveryProviderLink;
      settlement:
        CampaignRateLimitSettlementInstruction | null;
    }
  | {
      outcome:
        | "not-found"
        | "event-conflict"
        | "terminal-conflict";
    };

export interface CampaignDeliveryProviderRepository {
  recordAccepted(
    input: RecordCampaignDeliveryAcceptance,
  ): Promise<RecordCampaignDeliveryAcceptanceResult>;
  applyProviderStatus(
    input: ApplyCampaignProviderStatus,
  ): Promise<ApplyCampaignProviderStatusResult>;
}

interface CampaignDeliveryProviderLinkRow {
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
  recipientStatus: unknown;
}

function requirePositiveInteger(
  value: unknown,
  fieldName: string,
): number {
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
    value.trim() !== value ||
    value.length === 0 ||
    value.length > 255
  ) {
    throw new Error("providerMessageId is invalid");
  }

  return value;
}

function requireTimestamp(
  value: unknown,
  fieldName: string,
): string {
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
  if (status === "delivered" || status === "read") {
    return "delivered";
  }

  return status === "failed"
    ? "provider-failed"
    : null;
}

function expectedRecipientStatus(
  status: CampaignProviderDeliveryStatus,
): CampaignDeliveryProviderLink["recipientStatus"] {
  return status === "sent" ? "accepted" : status;
}

function parseLink(
  row: CampaignDeliveryProviderLinkRow,
): CampaignDeliveryProviderLink {
  const providerStatus = requireProviderStatus(
    row.providerStatus,
    true,
  );
  const lastStatusEventKey =
    row.lastStatusEventKey === null
      ? null
      : requirePattern(
          row.lastStatusEventKey,
          statusEventKeyPattern,
          "D1 lastStatusEventKey",
        );
  const lastStatusEventAt =
    row.lastStatusEventAt === null
      ? null
      : requireTimestamp(
          row.lastStatusEventAt,
          "D1 lastStatusEventAt",
        );
  const expectedTerminal =
    providerStatus === "accepted" ||
    providerStatus === "sent"
      ? null
      : terminalOutcomeFor(providerStatus);
  const terminalOutcome =
    row.terminalOutcome === null
      ? null
      : row.terminalOutcome;
  const terminalSettledAt =
    row.terminalSettledAt === null
      ? null
      : requireTimestamp(
          row.terminalSettledAt,
          "D1 terminalSettledAt",
        );

  if (
    (lastStatusEventKey === null) !==
      (lastStatusEventAt === null) ||
    (providerStatus === "accepted") !==
      (lastStatusEventKey === null) ||
    terminalOutcome !== expectedTerminal ||
    (expectedTerminal === null) !==
      (terminalSettledAt === null) ||
    row.recipientStatus !==
      expectedRecipientStatus(providerStatus)
  ) {
    throw new Error(
      "D1 returned inconsistent campaign provider state",
    );
  }

  return {
    deliveryKey: requirePattern(
      row.deliveryKey,
      deliveryKeyPattern,
      "D1 deliveryKey",
    ),
    tenantId: requirePositiveInteger(
      row.tenantId,
      "D1 tenantId",
    ),
    providerMessageId: requireProviderMessageId(
      row.providerMessageId,
    ),
    reservationKey: requirePattern(
      row.reservationKey,
      reservationKeyPattern,
      "D1 reservationKey",
    ),
    providerStatus,
    lastStatusEventKey,
    lastStatusEventAt,
    terminalOutcome:
      terminalOutcome as
        CampaignProviderTerminalOutcome | null,
    terminalSettledAt,
    acceptedAt: requireTimestamp(
      row.acceptedAt,
      "D1 acceptedAt",
    ),
    createdAt: requireTimestamp(
      row.createdAt,
      "D1 createdAt",
    ),
    updatedAt: requireTimestamp(
      row.updatedAt,
      "D1 updatedAt",
    ),
    recipientStatus:
      row.recipientStatus as
        CampaignDeliveryProviderLink["recipientStatus"],
  };
}

function settlementFromLink(
  link: CampaignDeliveryProviderLink,
): CampaignRateLimitSettlementInstruction | null {
  if (
    link.terminalOutcome === null ||
    link.terminalSettledAt === null
  ) {
    return null;
  }

  return {
    reservationKey: link.reservationKey,
    outcome: link.terminalOutcome,
    settledAt: link.terminalSettledAt,
  };
}

async function findByDelivery(
  database: D1DatabaseBinding,
  tenantId: number,
  deliveryKey: string,
): Promise<CampaignDeliveryProviderLink | null> {
  const row = await database
    .prepare(FIND_LINK_BY_DELIVERY_SQL)
    .bind(tenantId, deliveryKey)
    .first<CampaignDeliveryProviderLinkRow>();

  return row ? parseLink(row) : null;
}

async function findByProviderMessage(
  database: D1DatabaseBinding,
  tenantId: number,
  providerMessageId: string,
): Promise<CampaignDeliveryProviderLink | null> {
  const row = await database
    .prepare(FIND_LINK_BY_PROVIDER_MESSAGE_SQL)
    .bind(tenantId, providerMessageId)
    .first<CampaignDeliveryProviderLinkRow>();

  return row ? parseLink(row) : null;
}

export function createCampaignDeliveryProviderRepository(
  database: D1DatabaseBinding,
): CampaignDeliveryProviderRepository {
  return {
    async recordAccepted(input) {
      const tenantId = requirePositiveInteger(
        input.tenantId,
        "tenantId",
      );
      const deliveryKey = requirePattern(
        input.deliveryKey,
        deliveryKeyPattern,
        "deliveryKey",
      );
      const providerMessageId =
        requireProviderMessageId(
          input.providerMessageId,
        );
      const reservationKey = requirePattern(
        input.reservationKey,
        reservationKeyPattern,
        "reservationKey",
      );
      const acceptedAt = requireTimestamp(
        input.acceptedAt,
        "acceptedAt",
      );
      const insertResult = await database
        .prepare(INSERT_ACCEPTANCE_SQL)
        .bind(
          tenantId,
          deliveryKey,
          providerMessageId,
          reservationKey,
          acceptedAt,
        )
        .run();

      if (!insertResult.success) {
        throw new Error(
          insertResult.error ??
            "D1 campaign acceptance link failed",
        );
      }

      const link = await findByDelivery(
        database,
        tenantId,
        deliveryKey,
      );

      if (
        !link ||
        link.providerMessageId !== providerMessageId ||
        link.reservationKey !== reservationKey ||
        link.acceptedAt !== acceptedAt
      ) {
        throw new Error(
          "D1 campaign acceptance identity conflicts",
        );
      }

      return {
        outcome:
          insertResult.meta?.changes === 1
            ? "recorded"
            : "idempotent",
        link,
      };
    },

    async applyProviderStatus(input) {
      const tenantId = requirePositiveInteger(
        input.tenantId,
        "tenantId",
      );
      const providerMessageId =
        requireProviderMessageId(
          input.providerMessageId,
        );
      const status = requireProviderStatus(
        input.status,
        false,
      ) as CampaignProviderWebhookStatus;
      const statusEventKey = requirePattern(
        input.statusEventKey,
        statusEventKeyPattern,
        "statusEventKey",
      );
      const statusEventAt = requireTimestamp(
        input.statusEventAt,
        "statusEventAt",
      );
      const intendedTerminal =
        terminalOutcomeFor(status);
      const reconciledAt = requireTimestamp(
        input.reconciledAt,
        "reconciledAt",
      );
      const updateResult = await database
        .prepare(APPLY_PROVIDER_STATUS_SQL)
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
          updateResult.error ??
            "D1 campaign provider status failed",
        );
      }

      const link = await findByProviderMessage(
        database,
        tenantId,
        providerMessageId,
      );

      if (!link) {
        return { outcome: "not-found" };
      }

      if (
        link.lastStatusEventKey === statusEventKey
      ) {
        if (
          link.providerStatus !== status ||
          link.lastStatusEventAt !== statusEventAt
        ) {
          return { outcome: "event-conflict" };
        }

        return {
          outcome:
            updateResult.meta?.changes === 1
              ? "applied"
              : "duplicate",
          link,
          settlement: settlementFromLink(link),
        };
      }

      if (
        intendedTerminal !== null &&
        link.terminalOutcome !== null &&
        link.terminalOutcome !== intendedTerminal
      ) {
        return { outcome: "terminal-conflict" };
      }

      return {
        outcome: "stale",
        link,
        settlement: settlementFromLink(link),
      };
    },
  };
}
