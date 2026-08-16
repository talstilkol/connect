import type {
  WhatsappPortfolioCapacity,
} from "../shared/domain/whatsappRateLimit.ts";
import {
  whatsappPortfolioMessagingLimits,
} from "../shared/domain/whatsappRateLimit.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const SELECT_CURRENT_POLICY_SQL = `
  SELECT
    policy.event_key AS eventKey,
    policy.tenant_id AS tenantId,
    policy.connection_version AS connectionVersion,
    policy.policy_version AS policyVersion,
    policy.portfolio_limit_kind AS portfolioLimitKind,
    policy.portfolio_limit_value AS portfolioLimitValue,
    policy.reservation_duration_seconds AS reservationDurationSeconds,
    policy.meta_graph_api_version AS metaGraphApiVersion,
    policy.evidence_digest AS evidenceDigest,
    policy.evidence_checked_at AS evidenceCheckedAt,
    policy.evidence_expires_at AS evidenceExpiresAt,
    policy.recorded_at AS recordedAt
  FROM whatsapp_campaign_delivery_policy_events AS policy
  INNER JOIN meta_connections AS connection
    ON connection.tenant_id = policy.tenant_id
  WHERE policy.tenant_id = ?1
    AND connection.business_portfolio_id = ?2
    AND connection.waba_id = ?3
    AND connection.phone_number_id = ?4
    AND connection.status = 'connected'
    AND policy.connection_version = connection.version
    AND policy.policy_version = (
      SELECT max(latest.policy_version)
      FROM whatsapp_campaign_delivery_policy_events AS latest
      WHERE latest.tenant_id = policy.tenant_id
    )
    AND policy.delivery_state = 'enabled'
    AND policy.evidence_checked_at <= ?5
    AND policy.recorded_at <= ?5
    AND ?5 < policy.evidence_expires_at
  LIMIT 1
`;

const eventKeyPattern =
  /^whatsapp_delivery_policy_event_v1_[0-9a-f]{64}$/;
const evidenceDigestPattern = /^[0-9a-f]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]*\.[0-9]+$/;
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const providerIdentifierPattern =
  /^[^\u0000-\u001f\u007f]{1,255}$/;
const MINIMUM_RESERVATION_SECONDS = 6;
const MAXIMUM_RESERVATION_SECONDS = 24 * 60 * 60;

interface PolicyRow {
  eventKey: unknown;
  tenantId: unknown;
  connectionVersion: unknown;
  policyVersion: unknown;
  portfolioLimitKind: unknown;
  portfolioLimitValue: unknown;
  reservationDurationSeconds: unknown;
  metaGraphApiVersion: unknown;
  evidenceDigest: unknown;
  evidenceCheckedAt: unknown;
  evidenceExpiresAt: unknown;
  recordedAt: unknown;
}

export interface FindWhatsappCampaignDeliveryPolicyInput {
  tenantId: unknown;
  businessPortfolioId: unknown;
  wabaId: unknown;
  phoneNumberId: unknown;
  checkedAt: unknown;
}

export interface WhatsappCampaignDeliveryPolicyEvidence {
  eventKey: string;
  tenantId: number;
  connectionVersion: number;
  policyVersion: number;
  portfolioCapacity: WhatsappPortfolioCapacity;
  reservationDurationSeconds: number;
  metaGraphApiVersion: string;
  evidenceDigest: string;
  evidenceCheckedAt: string;
  evidenceExpiresAt: string;
  recordedAt: string;
}

export interface WhatsappCampaignDeliveryPolicyRepository {
  findCurrentEnabledPolicy(
    input: FindWhatsappCampaignDeliveryPolicyInput,
  ): Promise<WhatsappCampaignDeliveryPolicyEvidence | null>;
}

function requirePositiveInteger(
  value: unknown,
  field: string,
): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error(`WhatsApp delivery policy ${field} is invalid`);
  }

  return Number(value);
}

function requireProviderIdentifier(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    !providerIdentifierPattern.test(value) ||
    value.trim() !== value
  ) {
    throw new Error(`WhatsApp delivery policy ${field} is invalid`);
  }

  return value;
}

function requireCanonicalTimestamp(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    !canonicalTimestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`WhatsApp delivery policy ${field} is invalid`);
  }

  return value;
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
    whatsappPortfolioMessagingLimits.some(
      (limit) => limit === value,
    )
  ) {
    return {
      kind: "bounded",
      maximumUniqueRecipients:
        value as (typeof whatsappPortfolioMessagingLimits)[number],
    };
  }

  throw new Error(
    "WhatsApp delivery policy portfolio capacity is invalid",
  );
}

function parsePolicyRow(
  row: PolicyRow,
  checkedAt: string,
): WhatsappCampaignDeliveryPolicyEvidence {
  if (
    typeof row.eventKey !== "string" ||
    !eventKeyPattern.test(row.eventKey) ||
    typeof row.metaGraphApiVersion !== "string" ||
    !graphApiVersionPattern.test(row.metaGraphApiVersion) ||
    typeof row.evidenceDigest !== "string" ||
    !evidenceDigestPattern.test(row.evidenceDigest)
  ) {
    throw new Error(
      "WhatsApp delivery policy evidence is malformed",
    );
  }

  const evidenceCheckedAt = requireCanonicalTimestamp(
    row.evidenceCheckedAt,
    "evidence checked timestamp",
  );
  const evidenceExpiresAt = requireCanonicalTimestamp(
    row.evidenceExpiresAt,
    "evidence expiration timestamp",
  );
  const recordedAt = requireCanonicalTimestamp(
    row.recordedAt,
    "recorded timestamp",
  );
  const reservationDurationSeconds = requirePositiveInteger(
    row.reservationDurationSeconds,
    "reservation duration",
  );

  if (
    reservationDurationSeconds < MINIMUM_RESERVATION_SECONDS ||
    reservationDurationSeconds > MAXIMUM_RESERVATION_SECONDS ||
    evidenceCheckedAt > recordedAt ||
    recordedAt > checkedAt ||
    evidenceCheckedAt > checkedAt ||
    checkedAt >= evidenceExpiresAt
  ) {
    throw new Error(
      "WhatsApp delivery policy evidence is not current",
    );
  }

  return {
    eventKey: row.eventKey,
    tenantId: requirePositiveInteger(row.tenantId, "tenant"),
    connectionVersion: requirePositiveInteger(
      row.connectionVersion,
      "connection version",
    ),
    policyVersion: requirePositiveInteger(
      row.policyVersion,
      "policy version",
    ),
    portfolioCapacity: parseCapacity(
      row.portfolioLimitKind,
      row.portfolioLimitValue,
    ),
    reservationDurationSeconds,
    metaGraphApiVersion: row.metaGraphApiVersion,
    evidenceDigest: row.evidenceDigest,
    evidenceCheckedAt,
    evidenceExpiresAt,
    recordedAt,
  };
}

export function createWhatsappCampaignDeliveryPolicyRepository(
  database: D1DatabaseBinding,
): WhatsappCampaignDeliveryPolicyRepository {
  return {
    async findCurrentEnabledPolicy(input) {
      const tenantId = requirePositiveInteger(
        input.tenantId,
        "tenant",
      );
      const businessPortfolioId = requireProviderIdentifier(
        input.businessPortfolioId,
        "business portfolio identifier",
      );
      const wabaId = requireProviderIdentifier(
        input.wabaId,
        "WABA identifier",
      );
      const phoneNumberId = requireProviderIdentifier(
        input.phoneNumberId,
        "phone number identifier",
      );
      const checkedAt = requireCanonicalTimestamp(
        input.checkedAt,
        "lookup timestamp",
      );
      const row = await database
        .prepare(SELECT_CURRENT_POLICY_SQL)
        .bind(
          tenantId,
          businessPortfolioId,
          wabaId,
          phoneNumberId,
          checkedAt,
        )
        .first<PolicyRow>();

      return row === null
        ? null
        : parsePolicyRow(row, checkedAt);
    },
  };
}
