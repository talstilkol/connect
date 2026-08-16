import type {
  WhatsappCampaignDeliveryPolicyMutationResult,
  WhatsappCampaignDeliveryPolicyRecord,
  WhatsappCampaignDeliveryPolicyState,
} from "../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import type {
  WhatsappPortfolioCapacity,
} from "../shared/domain/whatsappRateLimit.ts";
import {
  deriveWhatsappCampaignDeliveryPolicyEventKey,
} from "../server/campaigns/whatsappCampaignDeliveryPolicyKey.ts";
import {
  requireWhatsappDeliveryPolicyDigest,
  requireWhatsappDeliveryPolicyEventKey,
  requireWhatsappDeliveryPolicyGraphVersion,
  requireWhatsappDeliveryPolicyPositiveInteger,
  requireWhatsappDeliveryPolicyState,
  requireWhatsappDeliveryPolicyTimestamp,
  requireWhatsappDeliveryPolicyVersion,
  requireWhatsappPortfolioCapacity,
  requireWhatsappProviderIdentifier,
  requireWhatsappReservationDuration,
} from "../server/campaigns/whatsappCampaignDeliveryPolicyValidation.ts";
import type {
  D1DatabaseBinding,
  D1Result,
} from "./d1.ts";

const POLICY_COLUMNS_SQL = `
  policy.event_key AS eventKey,
  policy.tenant_id AS tenantId,
  policy.connection_version AS connectionVersion,
  policy.policy_version AS policyVersion,
  policy.delivery_state AS deliveryState,
  policy.portfolio_limit_kind AS portfolioLimitKind,
  policy.portfolio_limit_value AS portfolioLimitValue,
  policy.reservation_duration_seconds AS reservationDurationSeconds,
  policy.meta_graph_api_version AS metaGraphApiVersion,
  policy.evidence_digest AS evidenceDigest,
  policy.evidence_checked_at AS evidenceCheckedAt,
  policy.evidence_expires_at AS evidenceExpiresAt,
  policy.actor_external_user_id AS actorExternalUserId,
  policy.recorded_at AS recordedAt
`;

const SELECT_CURRENT_POLICY_SQL = `
  SELECT ${POLICY_COLUMNS_SQL}
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

const SELECT_LATEST_POLICY_SQL = `
  SELECT ${POLICY_COLUMNS_SQL}
  FROM whatsapp_campaign_delivery_policy_events AS policy
  WHERE policy.tenant_id = ?1
  ORDER BY policy.policy_version DESC
  LIMIT 1
`;

const INSERT_POLICY_SQL = `
  INSERT INTO whatsapp_campaign_delivery_policy_events (
    event_key,
    tenant_id,
    connection_version,
    policy_version,
    delivery_state,
    portfolio_limit_kind,
    portfolio_limit_value,
    reservation_duration_seconds,
    meta_graph_api_version,
    evidence_digest,
    evidence_checked_at,
    evidence_expires_at,
    actor_external_user_id,
    recorded_at,
    created_at
  ) VALUES (
    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
    ?9, ?10, ?11, ?12, ?13, ?14, ?14
  )
`;

interface PolicyRow {
  eventKey: unknown;
  tenantId: unknown;
  connectionVersion: unknown;
  policyVersion: unknown;
  deliveryState: unknown;
  portfolioLimitKind: unknown;
  portfolioLimitValue: unknown;
  reservationDurationSeconds: unknown;
  metaGraphApiVersion: unknown;
  evidenceDigest: unknown;
  evidenceCheckedAt: unknown;
  evidenceExpiresAt: unknown;
  actorExternalUserId: unknown;
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

export interface RecordWhatsappCampaignDeliveryPolicyCommand {
  tenantId: unknown;
  connectionVersion: unknown;
  expectedPolicyVersion: unknown;
  deliveryState: unknown;
  portfolioLimitKind: unknown;
  portfolioLimitValue: unknown;
  reservationDurationSeconds: unknown;
  metaGraphApiVersion: unknown;
  evidenceDigest: unknown;
  evidenceCheckedAt: unknown;
  evidenceExpiresAt: unknown;
  actorExternalUserId: unknown;
  recordedAt: unknown;
}

export interface WhatsappCampaignDeliveryPolicyRepository {
  findCurrentEnabledPolicy(
    input: FindWhatsappCampaignDeliveryPolicyInput,
  ): Promise<WhatsappCampaignDeliveryPolicyEvidence | null>;
  findLatestPolicyEvent(
    tenantId: unknown,
  ): Promise<WhatsappCampaignDeliveryPolicyRecord | null>;
  recordPolicyEvent(
    command:
      RecordWhatsappCampaignDeliveryPolicyCommand,
  ): Promise<WhatsappCampaignDeliveryPolicyMutationResult>;
}

interface NormalizedCommand {
  tenantId: number;
  connectionVersion: number;
  expectedPolicyVersion: number;
  deliveryState:
    WhatsappCampaignDeliveryPolicyState;
  portfolioCapacity:
    WhatsappPortfolioCapacity;
  reservationDurationSeconds: number;
  metaGraphApiVersion: string;
  evidenceDigest: string;
  evidenceCheckedAt: string;
  evidenceExpiresAt: string;
  actorExternalUserId: string;
  recordedAt: string;
}

function parsePolicyRow(
  row: PolicyRow,
): WhatsappCampaignDeliveryPolicyRecord {
  const deliveryState =
    requireWhatsappDeliveryPolicyState(
      row.deliveryState,
    );
  const evidenceCheckedAt =
    requireWhatsappDeliveryPolicyTimestamp(
      row.evidenceCheckedAt,
      "evidence checked timestamp",
    );
  const evidenceExpiresAt =
    requireWhatsappDeliveryPolicyTimestamp(
      row.evidenceExpiresAt,
      "evidence expiration timestamp",
    );
  const recordedAt =
    requireWhatsappDeliveryPolicyTimestamp(
      row.recordedAt,
      "recorded timestamp",
    );

  if (
    evidenceCheckedAt > recordedAt ||
    evidenceCheckedAt >= evidenceExpiresAt ||
    (deliveryState === "enabled" &&
      recordedAt >= evidenceExpiresAt)
  ) {
    throw new Error(
      "WhatsApp delivery policy evidence timeline is invalid",
    );
  }

  return {
    eventKey:
      requireWhatsappDeliveryPolicyEventKey(
        row.eventKey,
      ),
    tenantId:
      requireWhatsappDeliveryPolicyPositiveInteger(
        row.tenantId,
        "tenant",
      ),
    connectionVersion:
      requireWhatsappDeliveryPolicyPositiveInteger(
        row.connectionVersion,
        "connection version",
      ),
    policyVersion:
      requireWhatsappDeliveryPolicyVersion(
        row.policyVersion,
      ),
    deliveryState,
    portfolioCapacity:
      requireWhatsappPortfolioCapacity(
        row.portfolioLimitKind,
        row.portfolioLimitValue,
      ),
    reservationDurationSeconds:
      requireWhatsappReservationDuration(
        row.reservationDurationSeconds,
      ),
    metaGraphApiVersion:
      requireWhatsappDeliveryPolicyGraphVersion(
        row.metaGraphApiVersion,
      ),
    evidenceDigest:
      requireWhatsappDeliveryPolicyDigest(
        row.evidenceDigest,
      ),
    evidenceCheckedAt,
    evidenceExpiresAt,
    actorExternalUserId:
      requireWhatsappProviderIdentifier(
        row.actorExternalUserId,
        "actor",
      ),
    recordedAt,
  };
}

function toEvidence(
  record:
    WhatsappCampaignDeliveryPolicyRecord,
  checkedAt: string,
): WhatsappCampaignDeliveryPolicyEvidence {
  if (
    record.deliveryState !== "enabled" ||
    record.evidenceCheckedAt > checkedAt ||
    record.recordedAt > checkedAt ||
    checkedAt >= record.evidenceExpiresAt
  ) {
    throw new Error(
      "WhatsApp delivery policy evidence is not current",
    );
  }

  return {
    eventKey: record.eventKey,
    tenantId: record.tenantId,
    connectionVersion:
      record.connectionVersion,
    policyVersion: record.policyVersion,
    portfolioCapacity:
      record.portfolioCapacity,
    reservationDurationSeconds:
      record.reservationDurationSeconds,
    metaGraphApiVersion:
      record.metaGraphApiVersion,
    evidenceDigest:
      record.evidenceDigest,
    evidenceCheckedAt:
      record.evidenceCheckedAt,
    evidenceExpiresAt:
      record.evidenceExpiresAt,
    recordedAt: record.recordedAt,
  };
}

function normalizeCommand(
  command:
    RecordWhatsappCampaignDeliveryPolicyCommand,
): NormalizedCommand {
  const deliveryState =
    requireWhatsappDeliveryPolicyState(
      command.deliveryState,
    );
  const evidenceCheckedAt =
    requireWhatsappDeliveryPolicyTimestamp(
      command.evidenceCheckedAt,
      "evidence checked timestamp",
    );
  const evidenceExpiresAt =
    requireWhatsappDeliveryPolicyTimestamp(
      command.evidenceExpiresAt,
      "evidence expiration timestamp",
    );
  const recordedAt =
    requireWhatsappDeliveryPolicyTimestamp(
      command.recordedAt,
      "recorded timestamp",
    );

  if (
    evidenceCheckedAt > recordedAt ||
    evidenceCheckedAt >= evidenceExpiresAt ||
    (deliveryState === "enabled" &&
      recordedAt >= evidenceExpiresAt)
  ) {
    throw new Error(
      "WhatsApp delivery policy evidence timeline is invalid",
    );
  }

  return {
    tenantId:
      requireWhatsappDeliveryPolicyPositiveInteger(
        command.tenantId,
        "tenant",
      ),
    connectionVersion:
      requireWhatsappDeliveryPolicyPositiveInteger(
        command.connectionVersion,
        "connection version",
      ),
    expectedPolicyVersion:
      requireWhatsappDeliveryPolicyVersion(
        command.expectedPolicyVersion,
        true,
      ),
    deliveryState,
    portfolioCapacity:
      requireWhatsappPortfolioCapacity(
        command.portfolioLimitKind,
        command.portfolioLimitValue,
      ),
    reservationDurationSeconds:
      requireWhatsappReservationDuration(
        command.reservationDurationSeconds,
      ),
    metaGraphApiVersion:
      requireWhatsappDeliveryPolicyGraphVersion(
        command.metaGraphApiVersion,
      ),
    evidenceDigest:
      requireWhatsappDeliveryPolicyDigest(
        command.evidenceDigest,
      ),
    evidenceCheckedAt,
    evidenceExpiresAt,
    actorExternalUserId:
      requireWhatsappProviderIdentifier(
        command.actorExternalUserId,
        "actor",
      ),
    recordedAt,
  };
}

function capacityColumns(
  capacity: WhatsappPortfolioCapacity,
): readonly ["bounded", number] | readonly ["unlimited", null] {
  return capacity.kind === "bounded"
    ? [
        "bounded",
        capacity.maximumUniqueRecipients,
      ]
    : ["unlimited", null];
}

function samePolicySnapshot(
  left:
    WhatsappCampaignDeliveryPolicyRecord,
  right: NormalizedCommand,
): boolean {
  return (
    JSON.stringify(left.portfolioCapacity) ===
      JSON.stringify(right.portfolioCapacity) &&
    left.reservationDurationSeconds ===
      right.reservationDurationSeconds &&
    left.metaGraphApiVersion ===
      right.metaGraphApiVersion &&
    left.evidenceDigest ===
      right.evidenceDigest &&
    left.evidenceCheckedAt ===
      right.evidenceCheckedAt &&
    left.evidenceExpiresAt ===
      right.evidenceExpiresAt
  );
}

function requireSuccessfulResult(
  result: D1Result,
): void {
  if (!result.success) {
    throw new Error(
      "D1 WhatsApp delivery policy mutation failed",
    );
  }
}

export function createWhatsappCampaignDeliveryPolicyRepository(
  database: D1DatabaseBinding,
): WhatsappCampaignDeliveryPolicyRepository {
  async function findLatestPolicyEvent(
    tenantIdInput: unknown,
  ): Promise<WhatsappCampaignDeliveryPolicyRecord | null> {
    const tenantId =
      requireWhatsappDeliveryPolicyPositiveInteger(
        tenantIdInput,
        "tenant",
      );
    const row = await database
      .prepare(SELECT_LATEST_POLICY_SQL)
      .bind(tenantId)
      .first<PolicyRow>();

    return row === null
      ? null
      : parsePolicyRow(row);
  }

  return {
    async findCurrentEnabledPolicy(input) {
      const tenantId =
        requireWhatsappDeliveryPolicyPositiveInteger(
          input.tenantId,
          "tenant",
        );
      const businessPortfolioId =
        requireWhatsappProviderIdentifier(
          input.businessPortfolioId,
          "business portfolio identifier",
        );
      const wabaId =
        requireWhatsappProviderIdentifier(
          input.wabaId,
          "WABA identifier",
        );
      const phoneNumberId =
        requireWhatsappProviderIdentifier(
          input.phoneNumberId,
          "phone number identifier",
        );
      const checkedAt =
        requireWhatsappDeliveryPolicyTimestamp(
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
        : toEvidence(
            parsePolicyRow(row),
            checkedAt,
          );
    },

    findLatestPolicyEvent,

    async recordPolicyEvent(command) {
      const normalized =
        normalizeCommand(command);
      const [
        portfolioLimitKind,
        portfolioLimitValue,
      ] = capacityColumns(
        normalized.portfolioCapacity,
      );
      const eventKey =
        await deriveWhatsappCampaignDeliveryPolicyEventKey({
          ...normalized,
          portfolioLimitKind,
          portfolioLimitValue,
        });
      const current =
        await findLatestPolicyEvent(
          normalized.tenantId,
        );

      if (current?.eventKey === eventKey) {
        return {
          outcome: "unchanged",
          record: current,
        };
      }

      if (
        (current?.policyVersion ?? 0) !==
          normalized.expectedPolicyVersion ||
        (normalized.deliveryState ===
          "disabled" &&
          (current?.deliveryState !==
            "enabled" ||
            !samePolicySnapshot(
              current,
              normalized,
            )))
      ) {
        return {
          outcome: "conflict",
          record: current,
        };
      }

      const nextPolicyVersion =
        normalized.expectedPolicyVersion + 1;
      let result: D1Result;

      try {
        result = await database
          .prepare(INSERT_POLICY_SQL)
          .bind(
            eventKey,
            normalized.tenantId,
            normalized.connectionVersion,
            nextPolicyVersion,
            normalized.deliveryState,
            portfolioLimitKind,
            portfolioLimitValue,
            normalized.reservationDurationSeconds,
            normalized.metaGraphApiVersion,
            normalized.evidenceDigest,
            normalized.evidenceCheckedAt,
            normalized.evidenceExpiresAt,
            normalized.actorExternalUserId,
            normalized.recordedAt,
          )
          .run();
        requireSuccessfulResult(result);
      } catch {
        const competing =
          await findLatestPolicyEvent(
            normalized.tenantId,
          );

        if (competing?.eventKey === eventKey) {
          return {
            outcome: "unchanged",
            record: competing,
          };
        }

        if (
          competing?.policyVersion !==
          normalized.expectedPolicyVersion
        ) {
          return {
            outcome: "conflict",
            record: competing,
          };
        }

        throw new Error(
          "D1 WhatsApp delivery policy mutation failed",
        );
      }

      const saved =
        await findLatestPolicyEvent(
          normalized.tenantId,
        );

      if (
        saved?.eventKey !== eventKey ||
        saved.policyVersion !==
          nextPolicyVersion ||
        saved.deliveryState !==
          normalized.deliveryState
      ) {
        return {
          outcome: "conflict",
          record: saved,
        };
      }

      return {
        outcome:
          Number(result.meta?.changes) === 1
            ? normalized.expectedPolicyVersion === 0
              ? "created"
              : "updated"
            : "unchanged",
        record: saved,
      };
    },
  };
}
