import { createHash } from "node:crypto";

import {
  createPostgresDataMigrationProtocol,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresDataMigrationColumnKind,
  PostgresDataMigrationEvidence,
  PostgresDataMigrationPlan,
  PostgresDataMigrationRow,
  PostgresDataMigrationSnapshot,
  PostgresDataMigrationTableContract,
} from "./postgresDataMigrationProtocol.ts";
import type {
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  isSubscriptionStatus,
  requireActorExternalUserId,
  requireCanonicalTimestamp,
  requireSubscriptionWindow,
} from "../billing/tenantSubscriptionValidation.ts";
import {
  requireProductionDecisionActor,
  requireProductionDecisionCheckId,
  requireProductionDecisionRationale,
  requireProductionDecisionSelection,
  requireProductionDecisionTimestamp,
} from "../operations/productionDecisionValidation.ts";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";

const subscriptionEventKeyPattern =
  /^tenant_subscription_event_v1_[0-9a-f]{64}$/;
const productionDecisionEventKeyPattern =
  /^production_decision_event_v1_[0-9a-f]{64}$/;
const adminEventKeyPattern =
  /^business_profile_admin_event_v1_[0-9a-f]{64}$/;
const digestPattern = /^[0-9a-f]{64}$/;
const unsafeControlPattern =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const subscriptionEventTypes = new Set([
  "created",
  "extended",
  "status-changed",
  "cancelled",
]);
const changedFieldSets = new Set([
  "businessName",
  "timezone",
  "interfaceLanguage",
  "businessName,timezone",
  "businessName,interfaceLanguage",
  "timezone,interfaceLanguage",
  "businessName,timezone,interfaceLanguage",
]);

function invalid(): never {
  throw new Error("governance-billing-row-invalid");
}

function text(row: PostgresDataMigrationRow, name: string): string {
  const value = row[name];
  if (typeof value !== "string") invalid();
  return value;
}

function nullableText(
  row: PostgresDataMigrationRow,
  name: string,
): string | null {
  const value = row[name];
  if (value === null) return null;
  if (typeof value !== "string") invalid();
  return value;
}

function integer(row: PostgresDataMigrationRow, name: string): number {
  const value = row[name];
  if (!Number.isSafeInteger(value)) invalid();
  return Number(value);
}

function timestamp(row: PostgresDataMigrationRow, name: string): string {
  const value = text(row, name);
  try {
    return requireCanonicalTimestamp(value);
  } catch {
    invalid();
  }
}

function nullableTimestamp(
  row: PostgresDataMigrationRow,
  name: string,
): string | null {
  const value = nullableText(row, name);
  if (value === null) return null;
  try {
    return requireCanonicalTimestamp(value);
  } catch {
    invalid();
  }
}

function digest(value: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requireExactActor(value: string): void {
  try {
    if (
      requireActorExternalUserId(value) !== value ||
      unsafeControlPattern.test(value)
    ) {
      invalid();
    }
  } catch {
    invalid();
  }
}

function validateSubscription(row: PostgresDataMigrationRow): void {
  const status = text(row, "status");
  const startsAt = timestamp(row, "starts_at");
  const endsAt = timestamp(row, "ends_at");
  const cancelledAt = nullableTimestamp(row, "cancelled_at");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");
  try {
    requireSubscriptionWindow(startsAt, endsAt);
  } catch {
    invalid();
  }
  if (
    !isSubscriptionStatus(status) ||
    integer(row, "version") < 1 ||
    updatedAt < createdAt ||
    ((status === "cancelled") !== (cancelledAt !== null)) ||
    (cancelledAt !== null && cancelledAt !== updatedAt)
  ) {
    invalid();
  }
}

function validateSubscriptionEvent(row: PostgresDataMigrationRow): void {
  const eventKey = text(row, "event_key");
  const eventType = text(row, "event_type");
  const fromStatus = nullableText(row, "from_status");
  const toStatus = text(row, "to_status");
  const previousEndsAt = nullableTimestamp(row, "previous_ends_at");
  const newEndsAt = timestamp(row, "new_ends_at");
  const actor = text(row, "actor_external_user_id");
  const version = integer(row, "subscription_version");
  const occurredAt = timestamp(row, "occurred_at");
  const createdAt = timestamp(row, "created_at");
  requireExactActor(actor);
  const expectedKey = `tenant_subscription_event_v1_${digest({
    namespace: "tenant_subscription_event_v1",
    tenantId: integer(row, "tenant_id"),
    eventType,
    expectedVersion: eventType === "created" ? null : version - 1,
    toStatus,
    newEndsAt,
    actorExternalUserId: actor,
  })}`;
  const stateValid = eventType === "created"
    ? fromStatus === null &&
      (toStatus === "trial" || toStatus === "active") &&
      previousEndsAt === null && version === 1
    : eventType === "extended"
      ? fromStatus === toStatus && previousEndsAt !== null &&
        previousEndsAt < newEndsAt && version >= 2
      : eventType === "status-changed"
        ? fromStatus !== null && fromStatus !== toStatus &&
          ["active", "suspended", "blocked"].includes(toStatus) &&
          previousEndsAt === newEndsAt && version >= 2
        : eventType === "cancelled"
          ? fromStatus !== null && fromStatus !== "cancelled" &&
            toStatus === "cancelled" && previousEndsAt === newEndsAt &&
            version >= 2
          : false;
  if (
    !subscriptionEventKeyPattern.test(eventKey) ||
    eventKey !== expectedKey ||
    !subscriptionEventTypes.has(eventType) ||
    (fromStatus !== null && !isSubscriptionStatus(fromStatus)) ||
    !isSubscriptionStatus(toStatus) ||
    !stateValid ||
    createdAt < occurredAt
  ) {
    invalid();
  }
}

function validateDecisionRecord(row: PostgresDataMigrationRow): void {
  const checkId = text(row, "check_id");
  const selection = text(row, "selection");
  const rationale = text(row, "rationale");
  const actor = text(row, "decided_by_external_user_id");
  const decidedAt = timestamp(row, "decided_at");
  const updatedAt = timestamp(row, "updated_at");
  try {
    requireProductionDecisionCheckId(checkId);
    if (
      requireProductionDecisionSelection(selection) !== selection ||
      requireProductionDecisionRationale(rationale) !== rationale ||
      requireProductionDecisionActor(actor) !== actor ||
      requireProductionDecisionTimestamp(decidedAt) !== decidedAt
    ) {
      invalid();
    }
  } catch {
    invalid();
  }
  if (
    integer(row, "version") < 1 ||
    !productionDecisionEventKeyPattern.test(text(row, "last_event_key")) ||
    decidedAt !== updatedAt
  ) {
    invalid();
  }
}

function validateDecisionEvent(row: PostgresDataMigrationRow): void {
  const eventKey = text(row, "event_key");
  const checkId = text(row, "check_id");
  const selection = text(row, "selection");
  const rationale = text(row, "rationale");
  const actor = text(row, "actor_external_user_id");
  const version = integer(row, "decision_version");
  const occurredAt = timestamp(row, "occurred_at");
  const createdAt = timestamp(row, "created_at");
  try {
    requireProductionDecisionCheckId(checkId);
    if (
      requireProductionDecisionSelection(selection) !== selection ||
      requireProductionDecisionRationale(rationale) !== rationale ||
      requireProductionDecisionActor(actor) !== actor
    ) {
      invalid();
    }
  } catch {
    invalid();
  }
  const expectedKey = `production_decision_event_v1_${digest({
    namespace: "production_decision_event_v1",
    checkId,
    expectedVersion: version - 1,
    selection,
    rationale,
    actorExternalUserId: actor,
  })}`;
  if (
    !productionDecisionEventKeyPattern.test(eventKey) ||
    eventKey !== expectedKey ||
    text(row, "event_type") !== "recorded" ||
    version < 1 ||
    createdAt < occurredAt
  ) {
    invalid();
  }
}

function validateAdminEvent(row: PostgresDataMigrationRow): void {
  const eventKey = text(row, "event_key");
  const previousDigest = text(row, "previous_profile_digest");
  const newDigest = text(row, "new_profile_digest");
  const actor = text(row, "actor_external_user_id");
  const profileVersion = integer(row, "profile_version");
  const occurredAt = timestamp(row, "occurred_at");
  const createdAt = timestamp(row, "created_at");
  requireExactActor(actor);
  const expectedKey = `business_profile_admin_event_v1_${digest({
    namespace: "business_profile_admin_event_v1",
    tenantId: integer(row, "tenant_id"),
    expectedVersion: profileVersion - 1,
    newProfileDigest: newDigest,
    actorExternalUserId: actor,
  })}`;
  if (
    !adminEventKeyPattern.test(eventKey) ||
    eventKey !== expectedKey ||
    !digestPattern.test(previousDigest) ||
    !digestPattern.test(newDigest) ||
    previousDigest === newDigest ||
    !changedFieldSets.has(text(row, "changed_fields")) ||
    profileVersion < 2 ||
    createdAt < occurredAt
  ) {
    invalid();
  }
}

function column(
  name: string,
  kind: PostgresDataMigrationColumnKind,
  nullable = false,
) {
  return Object.freeze({
    name,
    kind,
    ...(nullable ? { nullable: true as const } : {}),
  });
}

export const POSTGRES_GOVERNANCE_BILLING_DATA_TABLE_CONTRACTS =
  Object.freeze([
    Object.freeze({
      name: "tenant_subscriptions",
      columns: Object.freeze([
        column("tenant_id", "positive-integer"),
        column("status", "text"),
        column("starts_at", "timestamp"),
        column("ends_at", "timestamp"),
        column("cancelled_at", "timestamp", true),
        column("version", "positive-integer"),
        column("created_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id"]),
      validate: validateSubscription,
    }),
    Object.freeze({
      name: "tenant_subscription_events",
      columns: Object.freeze([
        column("event_key", "text"),
        column("tenant_id", "positive-integer"),
        column("event_type", "text"),
        column("from_status", "text", true),
        column("to_status", "text"),
        column("previous_ends_at", "timestamp", true),
        column("new_ends_at", "timestamp"),
        column("actor_external_user_id", "text"),
        column("subscription_version", "positive-integer"),
        column("occurred_at", "timestamp"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "subscription_version"]),
      validate: validateSubscriptionEvent,
    }),
    Object.freeze({
      name: "production_decision_records",
      columns: Object.freeze([
        column("check_id", "text"),
        column("selection", "text"),
        column("rationale", "text"),
        column("version", "positive-integer"),
        column("last_event_key", "text"),
        column("decided_by_external_user_id", "text"),
        column("decided_at", "timestamp"),
        column("updated_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["check_id"]),
      validate: validateDecisionRecord,
    }),
    Object.freeze({
      name: "production_decision_events",
      columns: Object.freeze([
        column("event_key", "text"),
        column("check_id", "text"),
        column("event_type", "text"),
        column("selection", "text"),
        column("rationale", "text"),
        column("actor_external_user_id", "text"),
        column("decision_version", "positive-integer"),
        column("occurred_at", "timestamp"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["check_id", "decision_version"]),
      validate: validateDecisionEvent,
    }),
    Object.freeze({
      name: "business_profile_admin_events",
      columns: Object.freeze([
        column("event_key", "text"),
        column("tenant_id", "positive-integer"),
        column("previous_profile_digest", "text"),
        column("new_profile_digest", "text"),
        column("changed_fields", "text"),
        column("actor_external_user_id", "text"),
        column("profile_version", "positive-integer"),
        column("occurred_at", "timestamp"),
        column("created_at", "timestamp"),
      ]),
      orderBy: Object.freeze(["tenant_id", "profile_version"]),
      validate: validateAdminEvent,
    }),
  ] satisfies readonly PostgresDataMigrationTableContract[]);

async function requireNoRows(
  transaction: PostgresQueryExecutor,
  sql: string,
  code: string,
): Promise<void> {
  const result = await transaction.query(sql, []);
  if (result.rowCount !== 0) throw new Error(code);
}

async function verifyCurrentAdminDigests(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  const result = await transaction.query<Record<string, unknown>>(`
    SELECT event.tenant_id, event.new_profile_digest,
      profile.business_name, profile.timezone, profile.interface_language
    FROM business_profile_admin_events AS event
    JOIN business_profiles AS profile
      ON profile.tenant_id = event.tenant_id
      AND profile.version = event.profile_version
      AND profile.updated_at = event.occurred_at
    ORDER BY event.tenant_id`, []);
  for (const row of result.rows) {
    const validation = validatePersistedBusinessProfile({
      businessName: row.business_name,
      timezone: row.timezone,
      interfaceLanguage: row.interface_language,
    });
    if (!validation.success) throw new Error("admin-profile-state-invalid");
    const currentDigest = digest({
      namespace: "business_profile_state_v1",
      businessName: validation.value.businessName,
      timezone: validation.value.timezone,
      interfaceLanguage: validation.value.interfaceLanguage,
    });
    if (row.new_profile_digest !== currentDigest) {
      throw new Error("admin-profile-digest-invalid");
    }
  }
}

async function verifyLoadedState(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  await requireNoRows(transaction, `
    SELECT 1
    FROM tenant_subscriptions AS subscription
    LEFT JOIN tenants AS tenant
      ON tenant.id = subscription.tenant_id
      AND tenant.status = subscription.status
    LEFT JOIN tenant_subscription_events AS latest
      ON latest.tenant_id = subscription.tenant_id
      AND latest.subscription_version = subscription.version
      AND latest.to_status = subscription.status
      AND latest.new_ends_at = subscription.ends_at
      AND latest.occurred_at = subscription.updated_at
    WHERE tenant.id IS NULL OR latest.event_key IS NULL
      OR (subscription.status = 'cancelled' AND (
        latest.event_type <> 'cancelled'
        OR latest.occurred_at <> subscription.cancelled_at
      ))
      OR (SELECT count(*) FROM tenant_subscription_events AS event
          WHERE event.tenant_id = subscription.tenant_id)
        <> subscription.version
    LIMIT 1`, "subscription-projection-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM tenant_subscription_events AS event
    LEFT JOIN tenant_subscription_events AS previous
      ON previous.tenant_id = event.tenant_id
      AND previous.subscription_version = event.subscription_version - 1
    WHERE (event.subscription_version = 1 AND (
        event.event_type <> 'created' OR event.occurred_at <> event.created_at
      )) OR (event.subscription_version > 1 AND (
        previous.event_key IS NULL
        OR event.from_status <> previous.to_status
        OR event.previous_ends_at <> previous.new_ends_at
      ))
    LIMIT 1`, "subscription-ledger-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM tenant_subscription_events AS event
    LEFT JOIN audit_logs AS audit
      ON audit.tenant_id = event.tenant_id
      AND audit.actor_external_user_id = event.actor_external_user_id
      AND audit.action = CASE event.event_type
        WHEN 'created' THEN 'subscription.created'
        WHEN 'extended' THEN 'subscription.extended'
        WHEN 'status-changed' THEN 'subscription.status_changed'
        WHEN 'cancelled' THEN 'subscription.cancelled'
      END
      AND audit.target_type = 'tenant_subscription'
      AND audit.target_id = event.tenant_id::text
      AND audit.idempotency_key = event.event_key
      AND audit.metadata_json IS NULL
    WHERE audit.id IS NULL
    LIMIT 1`, "subscription-audit-lineage-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM production_decision_records AS record
    LEFT JOIN production_decision_events AS latest
      ON latest.check_id = record.check_id
      AND latest.decision_version = record.version
      AND latest.event_key = record.last_event_key
      AND latest.selection = record.selection
      AND latest.rationale = record.rationale
      AND latest.actor_external_user_id = record.decided_by_external_user_id
      AND latest.occurred_at = record.decided_at
    WHERE latest.event_key IS NULL
      OR record.updated_at <> record.decided_at
      OR (SELECT count(*) FROM production_decision_events AS event
          WHERE event.check_id = record.check_id) <> record.version
    LIMIT 1`, "production-decision-ledger-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM production_decision_events AS event
    LEFT JOIN production_decision_events AS previous
      ON previous.check_id = event.check_id
      AND previous.decision_version = event.decision_version - 1
    WHERE event.decision_version > 1 AND previous.event_key IS NULL
    LIMIT 1`, "production-decision-history-invalid");

  await requireNoRows(transaction, `
    SELECT 1
    FROM business_profile_admin_events AS event
    LEFT JOIN business_profiles AS profile
      ON profile.tenant_id = event.tenant_id
    LEFT JOIN audit_logs AS audit
      ON audit.tenant_id = event.tenant_id
      AND audit.actor_external_user_id = event.actor_external_user_id
      AND audit.action = 'business_profile.updated'
      AND audit.target_type = 'business_profile'
      AND audit.target_id = event.tenant_id::text
      AND audit.idempotency_key = event.event_key
      AND audit.metadata_json IS NULL
    WHERE profile.tenant_id IS NULL OR audit.id IS NULL
      OR event.profile_version > profile.version
      OR (event.profile_version = profile.version
        AND event.occurred_at <> profile.updated_at)
    LIMIT 1`, "admin-profile-audit-lineage-invalid");

  await verifyCurrentAdminDigests(transaction);
}

const protocol = createPostgresDataMigrationProtocol({
  version: "connect_postgres_governance_billing_data_v1",
  planKind: "postgres-governance-billing-data-migration-plan",
  evidenceKind: "postgres-governance-billing-data-migration-evidence",
  advisoryLockKey: [1129270867, 5],
  tables: POSTGRES_GOVERNANCE_BILLING_DATA_TABLE_CONTRACTS,
  triggerDisabledTables: [
    "tenant_subscription_events",
    "production_decision_records",
    "business_profile_admin_events",
  ],
  verifyLoadedState,
});

export type PostgresGovernanceBillingDataSnapshot =
  PostgresDataMigrationSnapshot;
export type PostgresGovernanceBillingDataMigrationPlan =
  PostgresDataMigrationPlan;
export type PostgresGovernanceBillingDataMigrationEvidence =
  PostgresDataMigrationEvidence;

export const createPostgresGovernanceBillingDataSnapshot =
  protocol.createSnapshot;
export const createPostgresGovernanceBillingDataMigrationPlan =
  protocol.createPlan;
export const executePostgresGovernanceBillingDataMigration =
  protocol.execute;

export async function migratePostgresGovernanceBillingData(
  input: Readonly<{
    snapshot: PostgresGovernanceBillingDataSnapshot;
    transactions: PostgresTransactionManager;
    evidenceHmacKey: string;
    createdAt: string;
    expiresAt: string;
    now: string;
  }>,
): Promise<PostgresGovernanceBillingDataMigrationEvidence> {
  const plan = createPostgresGovernanceBillingDataMigrationPlan({
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    evidenceHmacKey: input.evidenceHmacKey,
  });
  return executePostgresGovernanceBillingDataMigration({
    plan,
    transactions: input.transactions,
    evidenceHmacKey: input.evidenceHmacKey,
    now: input.now,
  });
}
