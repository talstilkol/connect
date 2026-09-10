import {
  createPostgresDataMigrationProtocol,
} from "./postgresDataMigrationProtocol.ts";
import type {
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

const keyPatterns = Object.freeze({
  membershipEvent: /^tenant_membership_event_v1_[0-9a-f]{64}$/,
  membershipOperation: /^tenant_membership_operation_v1_[0-9a-f]{64}$/,
  invitation: /^team_invitation_v1_[0-9a-f]{64}$/,
  invitationEvent: /^team_invitation_event_v1_[0-9a-f]{64}$/,
  invitationOperation: /^team_invitation_operation_v1_[0-9a-f]{64}$/,
  delivery: /^team_invitation_delivery_v1_[0-9a-f]{64}$/,
  acceptance: /^team_invitation_acceptance_v1_[0-9a-f]{64}$/,
});
const controlCharacterPattern = /[\u0000-\u001f\u007f-\u009f]/u;
const normalizedEmailPattern = /^[^@]+@[^@]+\.[^@]+$/u;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/u;
const membershipRoles = new Set(["owner", "manager", "agent", "viewer"]);
const invitationRoles = new Set(["manager", "agent", "viewer"]);
const membershipStatuses = new Set(["active", "suspended"]);
const invitationStatuses = new Set(["pending", "revoked", "expired"]);
const systemExpirationActor = "team-invitation-expiration-scheduler-v1";

function invalid(): never {
  throw new Error("tenant-access-row-invalid");
}

function text(row: PostgresDataMigrationRow, name: string): string {
  const value = row[name];
  if (typeof value !== "string") invalid();
  return value;
}

function integer(row: PostgresDataMigrationRow, name: string): number {
  const value = row[name];
  if (!Number.isSafeInteger(value)) invalid();
  return Number(value);
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

function requireOpaqueUser(value: string): void {
  if (
    value.length < 1 ||
    value.length > 512 ||
    value !== value.trim() ||
    controlCharacterPattern.test(value)
  ) {
    invalid();
  }
}

function requireNormalizedEmail(value: string): void {
  if (
    value.length < 3 ||
    value.length > 254 ||
    value !== value.trim().toLowerCase() ||
    /\s/u.test(value) ||
    controlCharacterPattern.test(value) ||
    !normalizedEmailPattern.test(value)
  ) {
    invalid();
  }
}

function requireEnum(value: string, allowed: ReadonlySet<string>): void {
  if (!allowed.has(value)) invalid();
}

function timestamp(row: PostgresDataMigrationRow, name: string): number {
  const value = text(row, name);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) invalid();
  return milliseconds;
}

function validateActor(
  actorKind: string,
  actorExternalUserId: string,
  eventType: string,
): void {
  requireOpaqueUser(actorExternalUserId);
  if (actorKind === "user") return;
  if (
    actorKind !== "system" ||
    eventType !== "expired" ||
    actorExternalUserId !== systemExpirationActor
  ) {
    invalid();
  }
}

function validateMembershipEvent(row: PostgresDataMigrationRow): void {
  if (
    !keyPatterns.membershipEvent.test(text(row, "event_key")) ||
    !keyPatterns.membershipOperation.test(text(row, "operation_key"))
  ) {
    invalid();
  }
  requireOpaqueUser(text(row, "target_external_user_id"));
  requireOpaqueUser(text(row, "actor_external_user_id"));
  const eventType = text(row, "event_type");
  const fromRole = text(row, "from_role");
  const toRole = text(row, "to_role");
  const fromStatus = text(row, "from_status");
  const toStatus = text(row, "to_status");
  const fromVersion = integer(row, "from_version");
  const toVersion = integer(row, "to_version");
  requireEnum(fromRole, membershipRoles);
  requireEnum(toRole, membershipRoles);
  requireEnum(fromStatus, membershipStatuses);
  requireEnum(toStatus, membershipStatuses);
  if (
    fromVersion < 1 ||
    toVersion !== fromVersion + 1 ||
    (fromRole === toRole && fromStatus === toStatus)
  ) {
    invalid();
  }
  const validShape =
    (eventType === "role-changed" &&
      fromRole !== toRole && fromStatus === toStatus) ||
    (eventType === "suspended" &&
      fromRole === toRole && fromStatus === "active" &&
      toStatus === "suspended") ||
    (eventType === "reactivated" &&
      fromRole === toRole && fromStatus === "suspended" &&
      toStatus === "active") ||
    (eventType === "owner-transfer-out" &&
      fromRole === "owner" && toRole !== "owner" &&
      fromStatus === "active" && toStatus === "active") ||
    (eventType === "owner-transfer-in" &&
      fromRole !== "owner" && toRole === "owner" &&
      fromStatus === "active" && toStatus === "active");
  if (!validShape) invalid();
}

function validateInvitation(row: PostgresDataMigrationRow): void {
  if (!keyPatterns.invitation.test(text(row, "invitation_key"))) invalid();
  requireNormalizedEmail(text(row, "normalized_email"));
  requireEnum(text(row, "role"), invitationRoles);
  const status = text(row, "status");
  requireEnum(status, invitationStatuses);
  requireOpaqueUser(text(row, "invited_by_external_user_id"));
  const actorKind = text(row, "last_actor_kind");
  const actor = text(row, "last_actor_external_user_id");
  validateActor(actorKind, actor, status === "expired" ? "expired" : status);
  const requestedAt = timestamp(row, "requested_at");
  const expiresAt = timestamp(row, "expires_at");
  const updatedAt = timestamp(row, "updated_at");
  if (expiresAt <= requestedAt || updatedAt < requestedAt) invalid();
}

function validateInvitationEvent(row: PostgresDataMigrationRow): void {
  if (
    !keyPatterns.invitationEvent.test(text(row, "event_key")) ||
    !keyPatterns.invitationOperation.test(text(row, "operation_key")) ||
    !keyPatterns.invitation.test(text(row, "invitation_key"))
  ) {
    invalid();
  }
  const eventType = text(row, "event_type");
  const actorKind = text(row, "actor_kind");
  const actor = text(row, "actor_external_user_id");
  validateActor(actorKind, actor, eventType);
  const fromRole = nullableText(row, "from_role");
  const toRole = text(row, "to_role");
  const fromStatus = nullableText(row, "from_status");
  const toStatus = text(row, "to_status");
  const fromVersion = integer(row, "from_version");
  const toVersion = integer(row, "to_version");
  if (fromRole !== null) requireEnum(fromRole, invitationRoles);
  requireEnum(toRole, invitationRoles);
  if (fromStatus !== null) requireEnum(fromStatus, invitationStatuses);
  requireEnum(toStatus, invitationStatuses);
  const validShape =
    (eventType === "requested" && fromRole === null &&
      fromStatus === null && toStatus === "pending" &&
      fromVersion === 0 && toVersion === 1) ||
    (eventType === "re-requested" && fromRole !== null &&
      ["revoked", "expired"].includes(fromStatus ?? "") &&
      toStatus === "pending" && fromVersion >= 1 &&
      toVersion === fromVersion + 1) ||
    (eventType === "revoked" && fromRole === toRole &&
      fromStatus === "pending" && toStatus === "revoked" &&
      fromVersion >= 1 && toVersion === fromVersion + 1) ||
    (eventType === "expired" && fromRole === toRole &&
      fromStatus === "pending" && toStatus === "expired" &&
      fromVersion >= 1 && toVersion === fromVersion + 1);
  if (!validShape) invalid();
  const occurredAt = timestamp(row, "occurred_at");
  const expiresAt = timestamp(row, "expires_at");
  if (toStatus === "pending" && expiresAt <= occurredAt) invalid();
}

function validateDelivery(row: PostgresDataMigrationRow): void {
  if (
    !keyPatterns.delivery.test(text(row, "delivery_key")) ||
    !keyPatterns.invitation.test(text(row, "invitation_key"))
  ) {
    invalid();
  }
  const status = text(row, "status");
  const attemptCount = integer(row, "attempt_count");
  const errorCode = nullableText(row, "last_error_code");
  const submittedAt = nullableText(row, "submitted_at");
  const createdAt = timestamp(row, "created_at");
  const updatedAt = timestamp(row, "updated_at");
  if (updatedAt < createdAt) invalid();
  if (submittedAt !== null && Date.parse(submittedAt) < createdAt) invalid();
  if (errorCode !== null && !errorCodePattern.test(errorCode)) invalid();
  const validShape =
    (status === "pending" && attemptCount === 0 &&
      errorCode === null && submittedAt === null) ||
    (status === "sending" && attemptCount === 1 &&
      errorCode === null && submittedAt === null) ||
    (status === "submitted" && attemptCount === 1 &&
      errorCode === null && submittedAt !== null) ||
    (["blocked", "ambiguous", "cancelled"].includes(status) &&
      [0, 1].includes(attemptCount) && errorCode !== null &&
      submittedAt === null);
  if (!validShape) invalid();
}

function validateDeliveryDeferral(
  row: PostgresDataMigrationRow,
): void {
  if (
    !keyPatterns.delivery.test(
      text(row, "delivery_key"),
    ) ||
    text(row, "reason_code") !==
      "PROVIDER_RATE_LIMITED"
  ) {
    invalid();
  }

  const deferredAt = timestamp(
    row,
    "deferred_at",
  );
  const retryAfterAt = timestamp(
    row,
    "retry_after_at",
  );
  const delayMilliseconds =
    retryAfterAt - deferredAt;

  if (
    delayMilliseconds < 1_000 ||
    delayMilliseconds > 86_400_000
  ) {
    invalid();
  }
}

function validateAcceptance(row: PostgresDataMigrationRow): void {
  if (
    !keyPatterns.acceptance.test(text(row, "acceptance_key")) ||
    !keyPatterns.invitation.test(text(row, "invitation_key"))
  ) {
    invalid();
  }
  requireOpaqueUser(text(row, "external_user_id"));
  requireNormalizedEmail(text(row, "normalized_email"));
  requireEnum(text(row, "role"), invitationRoles);
  const fromVersion = integer(row, "from_version");
  const toVersion = integer(row, "to_version");
  if (fromVersion < 1 || toVersion !== fromVersion + 1) invalid();
  if (timestamp(row, "accepted_at") >= timestamp(row, "expires_at")) {
    invalid();
  }
}

function column(
  name: string,
  kind: "nonnegative-integer" | "positive-integer" | "text" | "timestamp",
  nullable = false,
) {
  return Object.freeze({
    name,
    kind,
    ...(nullable ? { nullable: true as const } : {}),
  });
}

export const POSTGRES_TENANT_ACCESS_DATA_TABLE_CONTRACTS = Object.freeze([
  Object.freeze({
    name: "tenant_membership_events",
    columns: Object.freeze([
      column("event_key", "text"),
      column("operation_key", "text"),
      column("tenant_id", "positive-integer"),
      column("target_external_user_id", "text"),
      column("actor_external_user_id", "text"),
      column("event_type", "text"),
      column("from_role", "text"),
      column("to_role", "text"),
      column("from_status", "text"),
      column("to_status", "text"),
      column("from_version", "positive-integer"),
      column("to_version", "positive-integer"),
      column("occurred_at", "timestamp"),
    ]),
    orderBy: Object.freeze([
      "tenant_id",
      "target_external_user_id",
      "from_version",
      "event_key",
    ]),
    validate: validateMembershipEvent,
  }),
  Object.freeze({
    name: "team_invitations",
    columns: Object.freeze([
      column("invitation_key", "text"),
      column("tenant_id", "positive-integer"),
      column("normalized_email", "text"),
      column("role", "text"),
      column("status", "text"),
      column("version", "positive-integer"),
      column("invited_by_external_user_id", "text"),
      column("last_actor_external_user_id", "text"),
      column("requested_at", "timestamp"),
      column("expires_at", "timestamp"),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
      column("last_actor_kind", "text"),
    ]),
    orderBy: Object.freeze(["tenant_id", "invitation_key"]),
    validate: validateInvitation,
  }),
  Object.freeze({
    name: "team_invitation_events",
    columns: Object.freeze([
      column("event_key", "text"),
      column("operation_key", "text"),
      column("invitation_key", "text"),
      column("tenant_id", "positive-integer"),
      column("actor_external_user_id", "text"),
      column("event_type", "text"),
      column("from_role", "text", true),
      column("to_role", "text"),
      column("from_status", "text", true),
      column("to_status", "text"),
      column("from_version", "nonnegative-integer"),
      column("to_version", "positive-integer"),
      column("occurred_at", "timestamp"),
      column("expires_at", "timestamp"),
      column("created_at", "timestamp"),
      column("actor_kind", "text"),
    ]),
    orderBy: Object.freeze([
      "tenant_id",
      "invitation_key",
      "from_version",
      "event_key",
    ]),
    validate: validateInvitationEvent,
  }),
  Object.freeze({
    name: "team_invitation_deliveries",
    columns: Object.freeze([
      column("delivery_key", "text"),
      column("tenant_id", "positive-integer"),
      column("invitation_key", "text"),
      column("invitation_version", "positive-integer"),
      column("status", "text"),
      column("attempt_count", "nonnegative-integer"),
      column("last_error_code", "text", true),
      column("submitted_at", "timestamp", true),
      column("created_at", "timestamp"),
      column("updated_at", "timestamp"),
    ]),
    orderBy: Object.freeze([
      "tenant_id",
      "invitation_key",
      "invitation_version",
    ]),
    validate: validateDelivery,
  }),
  Object.freeze({
    name: "team_invitation_delivery_deferrals",
    columns: Object.freeze([
      column("delivery_key", "text"),
      column("tenant_id", "positive-integer"),
      column("reason_code", "text"),
      column("retry_after_at", "timestamp"),
      column("deferred_at", "timestamp"),
    ]),
    orderBy: Object.freeze([
      "tenant_id",
      "retry_after_at",
      "delivery_key",
    ]),
    validate: validateDeliveryDeferral,
  }),
  Object.freeze({
    name: "team_invitation_acceptances",
    columns: Object.freeze([
      column("acceptance_key", "text"),
      column("tenant_id", "positive-integer"),
      column("invitation_key", "text"),
      column("external_user_id", "text"),
      column("normalized_email", "text"),
      column("role", "text"),
      column("from_version", "positive-integer"),
      column("to_version", "positive-integer"),
      column("accepted_at", "timestamp"),
      column("expires_at", "timestamp"),
      column("created_at", "timestamp"),
    ]),
    orderBy: Object.freeze(["tenant_id", "invitation_key"]),
    validate: validateAcceptance,
  }),
] satisfies readonly PostgresDataMigrationTableContract[]);

async function requireNoRows(
  transaction: PostgresQueryExecutor,
  query: string,
): Promise<void> {
  const result = await transaction.query(query, []);
  if (result.rowCount !== 0) throw new Error("tenant-access-state-invalid");
}

async function requireUserTriggersEnabled(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  await requireNoRows(
    transaction,
    `WITH expected(table_name, trigger_name) AS (
       VALUES
         ('tenant_membership_events',
          'tenant_membership_events_update_delete_guard'),
         ('tenant_membership_events',
          'tenant_membership_events_state_guard'),
         ('team_invitation_events',
          'team_invitation_events_state_guard'),
         ('team_invitation_events',
          'team_invitation_events_update_delete_guard'),
         ('team_invitation_deliveries',
          'team_invitation_deliveries_insert_guard'),
         ('team_invitation_deliveries',
          'team_invitation_deliveries_identity_guard'),
         ('team_invitation_deliveries',
          'team_invitation_deliveries_transition_guard'),
         ('team_invitation_deliveries',
          'team_invitation_deliveries_active_delete_guard'),
         ('team_invitation_delivery_deferrals',
          'team_invitation_delivery_deferrals_state_guard'),
         ('team_invitation_delivery_deferrals',
          'team_invitation_delivery_deferrals_transition'),
         ('team_invitation_delivery_deferrals',
          'team_invitation_delivery_deferrals_active_delete_guard'),
         ('team_invitation_acceptances',
          'team_invitation_acceptances_state_guard'),
         ('team_invitation_acceptances',
          'team_invitation_acceptances_update_delete_guard')
     ), actual AS (
       SELECT
         relation.relname AS table_name,
         trigger.tgname AS trigger_name,
         trigger.tgenabled
       FROM pg_trigger AS trigger
       INNER JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
       INNER JOIN pg_namespace AS namespace
         ON namespace.oid = relation.relnamespace
       WHERE namespace.nspname = current_schema()
         AND relation.relname IN (
           'tenant_membership_events',
           'team_invitation_events',
           'team_invitation_deliveries',
           'team_invitation_delivery_deferrals',
           'team_invitation_acceptances'
         )
         AND NOT trigger.tgisinternal
     )
     SELECT 1
     FROM expected
     LEFT JOIN actual
       ON actual.table_name = expected.table_name
       AND actual.trigger_name = expected.trigger_name
     WHERE actual.trigger_name IS NULL OR actual.tgenabled <> 'O'
     UNION ALL
     SELECT 1
     FROM actual
     WHERE actual.tgenabled <> 'O'
     LIMIT 1`,
  );
}

async function verifyTenantAccessLoadedState(
  transaction: PostgresQueryExecutor,
): Promise<void> {
  await requireUserTriggersEnabled(transaction);
  await requireNoRows(
    transaction,
    `WITH membership_lineage AS (
       SELECT
         from_version,
         row_number() OVER (
           PARTITION BY tenant_id, target_external_user_id
           ORDER BY from_version, to_version, event_key
         ) AS event_position,
         lag(to_version) OVER (
           PARTITION BY tenant_id, target_external_user_id
           ORDER BY from_version, to_version, event_key
         ) AS prior_to_version
       FROM tenant_membership_events
     )
     SELECT 1
     FROM membership_lineage
     WHERE (
       event_position = 1 AND from_version <> 1
     ) OR (
       event_position > 1 AND from_version <> prior_to_version
     )
     LIMIT 1`,
  );
  await requireNoRows(
    transaction,
    `WITH latest_membership_event AS (
       SELECT
         event.*,
         row_number() OVER (
           PARTITION BY tenant_id, target_external_user_id
           ORDER BY to_version DESC, event_key DESC
         ) AS latest_position
       FROM tenant_membership_events AS event
     )
     SELECT 1
     FROM latest_membership_event AS latest
     LEFT JOIN tenant_memberships AS membership
       ON membership.tenant_id = latest.tenant_id
       AND membership.external_user_id = latest.target_external_user_id
     WHERE latest.latest_position = 1
       AND (
         membership.id IS NULL
         OR membership.role IS DISTINCT FROM latest.to_role
         OR membership.status IS DISTINCT FROM latest.to_status
         OR membership.version IS DISTINCT FROM latest.to_version
       )
     UNION ALL
     SELECT 1
     FROM tenant_memberships AS membership
     WHERE membership.version > 1
       AND NOT EXISTS (
         SELECT 1
         FROM tenant_membership_events AS event
         WHERE event.tenant_id = membership.tenant_id
           AND event.target_external_user_id = membership.external_user_id
       )
     LIMIT 1`,
  );
  await requireNoRows(
    transaction,
    `WITH invitation_lineage AS (
       SELECT
         event_type,
         from_role,
         from_status,
         from_version,
         to_version,
         row_number() OVER (
           PARTITION BY invitation_key
           ORDER BY from_version, to_version, event_key
         ) AS event_position,
         lag(to_version) OVER (
           PARTITION BY invitation_key
           ORDER BY from_version, to_version, event_key
         ) AS prior_to_version
       FROM team_invitation_events
     )
     SELECT 1
     FROM invitation_lineage
     WHERE (
       event_position = 1
       AND (
         event_type <> 'requested'
         OR from_role IS NOT NULL
         OR from_status IS NOT NULL
         OR from_version <> 0
         OR to_version <> 1
       )
     ) OR (
       event_position > 1 AND from_version <> prior_to_version
     )
     LIMIT 1`,
  );
  await requireNoRows(
    transaction,
    `WITH latest_invitation_event AS (
       SELECT
         event.*,
         row_number() OVER (
           PARTITION BY invitation_key
           ORDER BY to_version DESC, event_key DESC
         ) AS latest_position
       FROM team_invitation_events AS event
     )
     SELECT 1
     FROM team_invitations AS invitation
     LEFT JOIN team_invitation_acceptances AS acceptance
       ON acceptance.invitation_key = invitation.invitation_key
     LEFT JOIN latest_invitation_event AS latest
       ON latest.invitation_key = invitation.invitation_key
       AND latest.latest_position = 1
     WHERE latest.event_key IS NULL
       OR (
         acceptance.acceptance_key IS NULL
         AND (
           invitation.tenant_id IS DISTINCT FROM latest.tenant_id
           OR invitation.role IS DISTINCT FROM latest.to_role
           OR invitation.status IS DISTINCT FROM latest.to_status
           OR invitation.version IS DISTINCT FROM latest.to_version
           OR invitation.last_actor_kind IS DISTINCT FROM latest.actor_kind
           OR invitation.last_actor_external_user_id
             IS DISTINCT FROM latest.actor_external_user_id
           OR invitation.updated_at IS DISTINCT FROM latest.occurred_at
           OR invitation.expires_at IS DISTINCT FROM latest.expires_at
           OR (
             latest.to_status = 'pending'
             AND invitation.requested_at IS DISTINCT FROM latest.occurred_at
           )
         )
       )
       OR (
         acceptance.acceptance_key IS NOT NULL
         AND latest.to_version IS DISTINCT FROM acceptance.from_version
       )
     LIMIT 1`,
  );
  await requireNoRows(
    transaction,
    `SELECT 1
     FROM team_invitation_deliveries AS delivery
     LEFT JOIN team_invitation_events AS event
       ON event.tenant_id = delivery.tenant_id
       AND event.invitation_key = delivery.invitation_key
       AND event.to_version = delivery.invitation_version
       AND event.event_type IN ('requested', 're-requested')
       AND event.occurred_at = delivery.created_at
     WHERE event.event_key IS NULL
     LIMIT 1`,
  );
  await requireNoRows(
    transaction,
    `SELECT 1
     FROM team_invitation_delivery_deferrals AS deferral
     LEFT JOIN team_invitation_deliveries AS delivery
       ON delivery.delivery_key = deferral.delivery_key
       AND delivery.tenant_id = deferral.tenant_id
     WHERE delivery.delivery_key IS NULL
       OR delivery.status <> 'pending'
       OR delivery.attempt_count <> 0
       OR delivery.last_error_code IS NOT NULL
       OR delivery.submitted_at IS NOT NULL
       OR delivery.updated_at IS DISTINCT FROM deferral.deferred_at
       OR deferral.reason_code <> 'PROVIDER_RATE_LIMITED'
       OR deferral.retry_after_at <= deferral.deferred_at
       OR deferral.retry_after_at > deferral.deferred_at + INTERVAL '1 day'
     LIMIT 1`,
  );
  await requireNoRows(
    transaction,
    `SELECT 1
     FROM team_invitation_acceptances AS acceptance
     LEFT JOIN team_invitations AS invitation
       ON invitation.tenant_id = acceptance.tenant_id
       AND invitation.invitation_key = acceptance.invitation_key
     LEFT JOIN tenant_memberships AS membership
       ON membership.tenant_id = acceptance.tenant_id
       AND membership.external_user_id = acceptance.external_user_id
     WHERE invitation.invitation_key IS NULL
       OR membership.id IS NULL
       OR invitation.normalized_email
         IS DISTINCT FROM acceptance.normalized_email
       OR invitation.role IS DISTINCT FROM acceptance.role
       OR invitation.status IS DISTINCT FROM 'pending'
       OR invitation.version IS DISTINCT FROM acceptance.to_version
       OR invitation.last_actor_kind IS DISTINCT FROM 'user'
       OR invitation.last_actor_external_user_id
         IS DISTINCT FROM acceptance.external_user_id
       OR invitation.updated_at IS DISTINCT FROM acceptance.accepted_at
       OR invitation.expires_at IS DISTINCT FROM acceptance.expires_at
       OR membership.role IS DISTINCT FROM acceptance.role
       OR membership.status IS DISTINCT FROM 'active'
       OR membership.version IS DISTINCT FROM 1
       OR membership.created_at IS DISTINCT FROM acceptance.accepted_at
       OR membership.updated_at IS DISTINCT FROM acceptance.accepted_at
       OR (
         SELECT max(event.to_version)
         FROM team_invitation_events AS event
         WHERE event.invitation_key = acceptance.invitation_key
       ) IS DISTINCT FROM acceptance.from_version
     LIMIT 1`,
  );
}

const protocol = createPostgresDataMigrationProtocol({
  version: "connect_postgres_tenant_access_data_v2",
  planKind: "postgres-tenant-access-data-migration-plan",
  evidenceKind: "postgres-tenant-access-data-migration-evidence",
  advisoryLockKey: [1129270867, 1],
  tables: POSTGRES_TENANT_ACCESS_DATA_TABLE_CONTRACTS,
  triggerDisabledTables: [
    "tenant_membership_events",
    "team_invitation_events",
    "team_invitation_deliveries",
    "team_invitation_delivery_deferrals",
    "team_invitation_acceptances",
  ],
  verifyTargetReady: requireUserTriggersEnabled,
  verifyLoadedState: verifyTenantAccessLoadedState,
});

export type PostgresTenantAccessDataSnapshot = PostgresDataMigrationSnapshot;
export type PostgresTenantAccessDataMigrationPlan = PostgresDataMigrationPlan;
export type PostgresTenantAccessDataMigrationEvidence =
  PostgresDataMigrationEvidence;

export const createPostgresTenantAccessDataSnapshot = protocol.createSnapshot;
export const createPostgresTenantAccessDataMigrationPlan = protocol.createPlan;
export const executePostgresTenantAccessDataMigration = protocol.execute;

export async function migratePostgresTenantAccessData(input: Readonly<{
  snapshot: PostgresTenantAccessDataSnapshot;
  transactions: PostgresTransactionManager;
  evidenceHmacKey: string;
  createdAt: string;
  expiresAt: string;
  now: string;
}>): Promise<PostgresTenantAccessDataMigrationEvidence> {
  const plan = createPostgresTenantAccessDataMigrationPlan({
    snapshot: input.snapshot,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    evidenceHmacKey: input.evidenceHmacKey,
  });
  return executePostgresTenantAccessDataMigration({
    plan,
    transactions: input.transactions,
    evidenceHmacKey: input.evidenceHmacKey,
    now: input.now,
  });
}
