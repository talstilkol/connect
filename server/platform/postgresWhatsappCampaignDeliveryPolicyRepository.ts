import type {
  FindWhatsappCampaignDeliveryPolicyInput,
  RecordWhatsappCampaignDeliveryPolicyCommand,
  WhatsappCampaignDeliveryPolicyEvidence,
  WhatsappCampaignDeliveryPolicyRepository,
} from "../../db/whatsappCampaignDeliveryPolicyRepository.ts";
import type {
  WhatsappCampaignDeliveryPolicyRecord,
  WhatsappCampaignDeliveryPolicyState,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import {
  persistedMetaConnectionStatuses,
} from "../../shared/domain/metaConnection.ts";
import type {
  WhatsappPortfolioCapacity,
} from "../../shared/domain/whatsappRateLimit.ts";
import {
  deriveWhatsappCampaignDeliveryPolicyEventKey,
} from "../campaigns/whatsappCampaignDeliveryPolicyKey.ts";
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
} from "../campaigns/whatsappCampaignDeliveryPolicyValidation.ts";
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

const policyRowKeys = Object.freeze([
  "eventKey",
  "tenantId",
  "connectionVersion",
  "policyVersion",
  "deliveryState",
  "portfolioLimitKind",
  "portfolioLimitValue",
  "reservationDurationSeconds",
  "metaGraphApiVersion",
  "evidenceDigest",
  "evidenceCheckedAt",
  "evidenceExpiresAt",
  "actorExternalUserId",
  "recordedAt",
]);
const connectionLockRowKeys = Object.freeze([
  "tenantId",
  "status",
  "version",
]);
function policyColumns(alias?: string): string {
  const prefix = alias === undefined ? "" : `${alias}.`;

  return `
    ${prefix}event_key AS "eventKey",
    ${prefix}tenant_id AS "tenantId",
    ${prefix}connection_version AS "connectionVersion",
    ${prefix}policy_version AS "policyVersion",
    ${prefix}delivery_state AS "deliveryState",
    ${prefix}portfolio_limit_kind AS "portfolioLimitKind",
    ${prefix}portfolio_limit_value AS "portfolioLimitValue",
    ${prefix}reservation_duration_seconds AS "reservationDurationSeconds",
    ${prefix}meta_graph_api_version AS "metaGraphApiVersion",
    ${prefix}evidence_digest AS "evidenceDigest",
    ${prefix}evidence_checked_at AS "evidenceCheckedAt",
    ${prefix}evidence_expires_at AS "evidenceExpiresAt",
    ${prefix}actor_external_user_id AS "actorExternalUserId",
    ${prefix}recorded_at AS "recordedAt"
  `;
}

export const postgresWhatsappCampaignDeliveryPolicySql = Object.freeze({
  findCurrentEnabledPolicy: `
    SELECT ${policyColumns("policy")}
    FROM whatsapp_campaign_delivery_policy_events AS policy
    INNER JOIN meta_connections AS connection
      ON connection.tenant_id = policy.tenant_id
    WHERE policy.tenant_id = $1
      AND connection.business_portfolio_id = $2
      AND connection.waba_id = $3
      AND connection.phone_number_id = $4
      AND connection.status = 'connected'
      AND policy.connection_version = connection.version
      AND policy.policy_version = (
        SELECT max(latest.policy_version)
        FROM whatsapp_campaign_delivery_policy_events AS latest
        WHERE latest.tenant_id = policy.tenant_id
      )
      AND policy.delivery_state = 'enabled'
      AND policy.evidence_checked_at <= $5::timestamptz
      AND policy.recorded_at <= $5::timestamptz
      AND $5::timestamptz < policy.evidence_expires_at
    LIMIT 1
  `,
  findLatestPolicyEvent: `
    SELECT ${policyColumns()}
    FROM whatsapp_campaign_delivery_policy_events
    WHERE tenant_id = $1
    ORDER BY policy_version DESC
    LIMIT 1
  `,
  lockMetaConnection: `
    SELECT
      tenant_id AS "tenantId",
      status,
      version
    FROM meta_connections
    WHERE tenant_id = $1
    FOR UPDATE
  `,
  insertPolicyEvent: `
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
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11::timestamptz, $12::timestamptz,
      $13, $14::timestamptz, $14::timestamptz
    )
    RETURNING ${policyColumns()}
  `,
});

export interface PostgresWhatsappCampaignDeliveryPolicyDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

interface NormalizedCommand {
  readonly tenantId: number;
  readonly connectionVersion: number;
  readonly expectedPolicyVersion: number;
  readonly deliveryState: WhatsappCampaignDeliveryPolicyState;
  readonly portfolioCapacity: WhatsappPortfolioCapacity;
  readonly reservationDurationSeconds: number;
  readonly metaGraphApiVersion: string;
  readonly evidenceDigest: string;
  readonly evidenceCheckedAt: string;
  readonly evidenceExpiresAt: string;
  readonly actorExternalUserId: string;
  readonly recordedAt: string;
}

function parsePolicyInteger(value: unknown, field: string): number {
  try {
    return parsePostgresPositiveInteger(value);
  } catch {
    throw new Error(`PostgreSQL returned an invalid WhatsApp ${field}`);
  }
}

function parsePortfolioLimitValue(value: unknown): number | null {
  return value === null
    ? null
    : parsePolicyInteger(value, "portfolio limit");
}

function parsePolicyRow(value: unknown): WhatsappCampaignDeliveryPolicyRecord {
  const row = requireExactPostgresRow(value, policyRowKeys);
  const deliveryState = requireWhatsappDeliveryPolicyState(row.deliveryState);
  const evidenceCheckedAt = requireWhatsappDeliveryPolicyTimestamp(
    parsePostgresTimestamp(row.evidenceCheckedAt),
    "evidence checked timestamp",
  );
  const evidenceExpiresAt = requireWhatsappDeliveryPolicyTimestamp(
    parsePostgresTimestamp(row.evidenceExpiresAt),
    "evidence expiration timestamp",
  );
  const recordedAt = requireWhatsappDeliveryPolicyTimestamp(
    parsePostgresTimestamp(row.recordedAt),
    "recorded timestamp",
  );

  if (
    evidenceCheckedAt > recordedAt ||
    evidenceCheckedAt >= evidenceExpiresAt ||
    (deliveryState === "enabled" && recordedAt >= evidenceExpiresAt)
  ) {
    throw new Error("PostgreSQL returned an invalid WhatsApp policy timeline");
  }

  return Object.freeze({
    eventKey: requireWhatsappDeliveryPolicyEventKey(row.eventKey),
    tenantId: parsePolicyInteger(row.tenantId, "policy tenant"),
    connectionVersion: parsePolicyInteger(
      row.connectionVersion,
      "policy connection version",
    ),
    policyVersion: requireWhatsappDeliveryPolicyVersion(
      parsePolicyInteger(row.policyVersion, "policy version"),
    ),
    deliveryState,
    portfolioCapacity: requireWhatsappPortfolioCapacity(
      row.portfolioLimitKind,
      parsePortfolioLimitValue(row.portfolioLimitValue),
    ),
    reservationDurationSeconds: requireWhatsappReservationDuration(
      parsePolicyInteger(
        row.reservationDurationSeconds,
        "policy reservation duration",
      ),
    ),
    metaGraphApiVersion: requireWhatsappDeliveryPolicyGraphVersion(
      row.metaGraphApiVersion,
    ),
    evidenceDigest: requireWhatsappDeliveryPolicyDigest(row.evidenceDigest),
    evidenceCheckedAt,
    evidenceExpiresAt,
    actorExternalUserId: requireWhatsappProviderIdentifier(
      row.actorExternalUserId,
      "actor",
    ),
    recordedAt,
  });
}

function toEvidence(
  record: WhatsappCampaignDeliveryPolicyRecord,
  checkedAt: string,
): WhatsappCampaignDeliveryPolicyEvidence {
  if (
    record.deliveryState !== "enabled" ||
    record.evidenceCheckedAt > checkedAt ||
    record.recordedAt > checkedAt ||
    checkedAt >= record.evidenceExpiresAt
  ) {
    throw new Error("PostgreSQL returned non-current WhatsApp policy evidence");
  }

  return Object.freeze({
    eventKey: record.eventKey,
    tenantId: record.tenantId,
    connectionVersion: record.connectionVersion,
    policyVersion: record.policyVersion,
    portfolioCapacity: record.portfolioCapacity,
    reservationDurationSeconds: record.reservationDurationSeconds,
    metaGraphApiVersion: record.metaGraphApiVersion,
    evidenceDigest: record.evidenceDigest,
    evidenceCheckedAt: record.evidenceCheckedAt,
    evidenceExpiresAt: record.evidenceExpiresAt,
    recordedAt: record.recordedAt,
  });
}

function normalizeCommand(
  command: RecordWhatsappCampaignDeliveryPolicyCommand,
): NormalizedCommand {
  const deliveryState = requireWhatsappDeliveryPolicyState(
    command.deliveryState,
  );
  const evidenceCheckedAt = requireWhatsappDeliveryPolicyTimestamp(
    command.evidenceCheckedAt,
    "evidence checked timestamp",
  );
  const evidenceExpiresAt = requireWhatsappDeliveryPolicyTimestamp(
    command.evidenceExpiresAt,
    "evidence expiration timestamp",
  );
  const recordedAt = requireWhatsappDeliveryPolicyTimestamp(
    command.recordedAt,
    "recorded timestamp",
  );

  if (
    evidenceCheckedAt > recordedAt ||
    evidenceCheckedAt >= evidenceExpiresAt ||
    (deliveryState === "enabled" && recordedAt >= evidenceExpiresAt)
  ) {
    throw new Error("WhatsApp delivery policy evidence timeline is invalid");
  }

  return Object.freeze({
    tenantId: requireWhatsappDeliveryPolicyPositiveInteger(
      command.tenantId,
      "tenant",
    ),
    connectionVersion: requireWhatsappDeliveryPolicyPositiveInteger(
      command.connectionVersion,
      "connection version",
    ),
    expectedPolicyVersion: requireWhatsappDeliveryPolicyVersion(
      command.expectedPolicyVersion,
      true,
    ),
    deliveryState,
    portfolioCapacity: requireWhatsappPortfolioCapacity(
      command.portfolioLimitKind,
      command.portfolioLimitValue,
    ),
    reservationDurationSeconds: requireWhatsappReservationDuration(
      command.reservationDurationSeconds,
    ),
    metaGraphApiVersion: requireWhatsappDeliveryPolicyGraphVersion(
      command.metaGraphApiVersion,
    ),
    evidenceDigest: requireWhatsappDeliveryPolicyDigest(command.evidenceDigest),
    evidenceCheckedAt,
    evidenceExpiresAt,
    actorExternalUserId: requireWhatsappProviderIdentifier(
      command.actorExternalUserId,
      "actor",
    ),
    recordedAt,
  });
}

function capacityColumns(
  capacity: WhatsappPortfolioCapacity,
): readonly ["bounded", number] | readonly ["unlimited", null] {
  return capacity.kind === "bounded"
    ? ["bounded", capacity.maximumUniqueRecipients]
    : ["unlimited", null];
}

function samePolicySnapshot(
  current: WhatsappCampaignDeliveryPolicyRecord,
  command: NormalizedCommand,
): boolean {
  return (
    current.connectionVersion === command.connectionVersion &&
    JSON.stringify(current.portfolioCapacity) ===
      JSON.stringify(command.portfolioCapacity) &&
    current.reservationDurationSeconds ===
      command.reservationDurationSeconds &&
    current.metaGraphApiVersion === command.metaGraphApiVersion &&
    current.evidenceDigest === command.evidenceDigest &&
    current.evidenceCheckedAt === command.evidenceCheckedAt &&
    current.evidenceExpiresAt === command.evidenceExpiresAt
  );
}

async function loadLatestPolicyEvent(
  queries: PostgresQueryExecutor,
  tenantId: number,
): Promise<WhatsappCampaignDeliveryPolicyRecord | null> {
  const result = await queries.query<Record<string, unknown>>(
    postgresWhatsappCampaignDeliveryPolicySql.findLatestPolicyEvent,
    [tenantId],
  );
  const rows = requirePostgresRows(result, 1);
  const record = rows.length === 0 ? null : parsePolicyRow(rows[0]);

  if (record !== null && record.tenantId !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant WhatsApp policy");
  }

  return record;
}

async function requireCurrentConnectionLock(
  transaction: PostgresTransaction,
  tenantId: number,
  connectionVersion: number,
  deliveryState: WhatsappCampaignDeliveryPolicyState,
): Promise<void> {
  const result = await transaction.query<Record<string, unknown>>(
    postgresWhatsappCampaignDeliveryPolicySql.lockMetaConnection,
    [tenantId],
  );
  const rows = requirePostgresRows(result, 1);

  if (rows.length !== 1) {
    throw new Error("PostgreSQL Meta connection was not found for policy");
  }

  const row = requireExactPostgresRow(rows[0], connectionLockRowKeys);
  const returnedTenantId = parsePolicyInteger(
    row.tenantId,
    "connection tenant",
  );
  const returnedVersion = parsePolicyInteger(
    row.version,
    "connection version",
  );

  if (
    returnedTenantId !== tenantId ||
    returnedVersion !== connectionVersion ||
    !persistedMetaConnectionStatuses.includes(row.status as never) ||
    (deliveryState === "enabled" && row.status !== "connected")
  ) {
    throw new Error("PostgreSQL Meta connection does not permit this policy");
  }
}

export function createPostgresWhatsappCampaignDeliveryPolicyRepository(
  dependencies: Readonly<
    PostgresWhatsappCampaignDeliveryPolicyDependencies
  >,
): WhatsappCampaignDeliveryPolicyRepository {
  if (
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL WhatsApp policy dependencies are invalid");
  }

  return Object.freeze({
    async findCurrentEnabledPolicy(
      input: FindWhatsappCampaignDeliveryPolicyInput,
    ) {
      const tenantId = requireWhatsappDeliveryPolicyPositiveInteger(
        input.tenantId,
        "tenant",
      );
      const businessPortfolioId = requireWhatsappProviderIdentifier(
        input.businessPortfolioId,
        "business portfolio identifier",
      );
      const wabaId = requireWhatsappProviderIdentifier(
        input.wabaId,
        "WABA identifier",
      );
      const phoneNumberId = requireWhatsappProviderIdentifier(
        input.phoneNumberId,
        "phone number identifier",
      );
      const checkedAt = requireWhatsappDeliveryPolicyTimestamp(
        input.checkedAt,
        "lookup timestamp",
      );
      const result = await dependencies.queries.query<
        Record<string, unknown>
      >(postgresWhatsappCampaignDeliveryPolicySql.findCurrentEnabledPolicy, [
        tenantId,
        businessPortfolioId,
        wabaId,
        phoneNumberId,
        checkedAt,
      ]);
      const rows = requirePostgresRows(result, 1);

      if (rows.length === 0) {
        return null;
      }

      const record = parsePolicyRow(rows[0]);

      if (record.tenantId !== tenantId) {
        throw new Error("PostgreSQL returned a cross-tenant WhatsApp policy");
      }

      return toEvidence(record, checkedAt);
    },

    async findLatestPolicyEvent(tenantIdInput: unknown) {
      const tenantId = requireWhatsappDeliveryPolicyPositiveInteger(
        tenantIdInput,
        "tenant",
      );
      return loadLatestPolicyEvent(dependencies.queries, tenantId);
    },

    async recordPolicyEvent(
      command: RecordWhatsappCampaignDeliveryPolicyCommand,
    ) {
      const normalized = normalizeCommand(command);
      const [portfolioLimitKind, portfolioLimitValue] = capacityColumns(
        normalized.portfolioCapacity,
      );
      const eventKey = await deriveWhatsappCampaignDeliveryPolicyEventKey({
        ...normalized,
        portfolioLimitKind,
        portfolioLimitValue,
      });

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          await requireCurrentConnectionLock(
            transaction,
            normalized.tenantId,
            normalized.connectionVersion,
            normalized.deliveryState,
          );
          const current = await loadLatestPolicyEvent(
            transaction,
            normalized.tenantId,
          );

          if (current?.eventKey === eventKey) {
            return Object.freeze({ outcome: "unchanged" as const, record: current });
          }

          if (
            (current?.policyVersion ?? 0) !==
              normalized.expectedPolicyVersion ||
            (normalized.deliveryState === "disabled" &&
              (current?.deliveryState !== "enabled" ||
                !samePolicySnapshot(current, normalized)))
          ) {
            return Object.freeze({ outcome: "conflict" as const, record: current });
          }

          const nextPolicyVersion = normalized.expectedPolicyVersion + 1;
          const result = await transaction.query<Record<string, unknown>>(
            postgresWhatsappCampaignDeliveryPolicySql.insertPolicyEvent,
            [
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
            ],
          );
          const rows = requirePostgresRows(result, 1);

          if (rows.length !== 1) {
            throw new Error("PostgreSQL WhatsApp policy insert was rejected");
          }

          const saved = parsePolicyRow(rows[0]);

          if (
            saved.tenantId !== normalized.tenantId ||
            saved.eventKey !== eventKey ||
            saved.connectionVersion !== normalized.connectionVersion ||
            saved.policyVersion !== nextPolicyVersion ||
            saved.deliveryState !== normalized.deliveryState
          ) {
            throw new Error("PostgreSQL WhatsApp policy write was not confirmed");
          }

          return Object.freeze({
            outcome:
              normalized.expectedPolicyVersion === 0
                ? "created" as const
                : "updated" as const,
            record: saved,
          });
        },
      );
    },
  });
}
