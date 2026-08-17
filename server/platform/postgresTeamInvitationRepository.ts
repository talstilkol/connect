import type {
  RequestTeamInvitationCommand,
  TeamInvitationRepository,
  TransitionTeamInvitationCommand,
} from "../../db/teamInvitationRepository.ts";
import type {
  TeamInvitation,
  TeamInvitationActor,
  TeamInvitationDelivery,
  TeamInvitationEventType,
  TeamInvitationMutationResult,
  TeamInvitationRole,
  TeamInvitationStatus,
} from "../../shared/domain/teamInvitation.ts";
import type { UserId } from "../../shared/domain/model.ts";
import {
  requireStoredTeamInvitationActor,
  requireTeamInvitationActor,
} from "../team/teamInvitationActor.ts";
import {
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationEventKey,
  deriveTeamInvitationKey,
  deriveTeamInvitationOperationKey,
} from "../team/teamInvitationKey.ts";
import {
  requireTeamInvitationDeliveryErrorCode,
  requireTeamInvitationDeliveryKey,
  requireTeamInvitationDeliveryStatus,
  requireTeamInvitationEmail,
  requireTeamInvitationEventKey,
  requireTeamInvitationKey,
  requireTeamInvitationOperationKey,
  requireTeamInvitationRole,
  requireTeamInvitationStatus,
} from "../team/teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
  requireTeamMembershipVersion,
  requireTeamTenantId,
  requireTeamTimestamp,
} from "../team/teamMembershipValidation.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const invitationRowKeys = Object.freeze([
  "invitationKey",
  "tenantId",
  "normalizedEmail",
  "role",
  "status",
  "version",
  "invitedByExternalUserId",
  "lastActorKind",
  "lastActorId",
  "requestedAt",
  "expiresAt",
  "updatedAt",
]);
const eventRowKeys = Object.freeze([
  "eventKey",
  "operationKey",
  "invitationKey",
  "tenantId",
  "actorKind",
  "actorId",
  "eventType",
  "fromRole",
  "toRole",
  "fromStatus",
  "toStatus",
  "fromVersion",
  "toVersion",
  "occurredAt",
  "expiresAt",
]);
const deliveryRowKeys = Object.freeze([
  "deliveryKey",
  "tenantId",
  "invitationKey",
  "invitationVersion",
  "status",
  "attemptCount",
  "lastErrorCode",
  "submittedAt",
  "createdAt",
  "updatedAt",
]);
const tenantRowKeys = Object.freeze(["tenantId"]);

interface InvitationEvent {
  readonly eventKey: string;
  readonly operationKey: string;
  readonly invitationKey: string;
  readonly tenantId: number;
  readonly actor: TeamInvitationActor;
  readonly eventType: TeamInvitationEventType;
  readonly fromRole: TeamInvitationRole | null;
  readonly toRole: TeamInvitationRole;
  readonly fromStatus: TeamInvitationStatus | null;
  readonly toStatus: TeamInvitationStatus;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly occurredAt: string;
  readonly expiresAt: string;
}

export const postgresTeamInvitationSql = Object.freeze({
  find: `
    SELECT
      team_invitations.invitation_key AS "invitationKey",
      team_invitations.tenant_id AS "tenantId",
      team_invitations.normalized_email AS "normalizedEmail",
      team_invitations.role,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM team_invitation_acceptances
          WHERE team_invitation_acceptances.tenant_id =
            team_invitations.tenant_id
            AND team_invitation_acceptances.invitation_key =
              team_invitations.invitation_key
        ) THEN 'accepted'
        ELSE team_invitations.status
      END AS status,
      team_invitations.version,
      team_invitations.invited_by_external_user_id
        AS "invitedByExternalUserId",
      team_invitations.last_actor_kind AS "lastActorKind",
      team_invitations.last_actor_external_user_id AS "lastActorId",
      team_invitations.requested_at AS "requestedAt",
      team_invitations.expires_at AS "expiresAt",
      team_invitations.updated_at AS "updatedAt"
    FROM team_invitations
    WHERE team_invitations.tenant_id = $1
      AND team_invitations.invitation_key = $2
    LIMIT 1
  `,
  lockTenant: `
    SELECT id AS "tenantId"
    FROM tenants
    WHERE id = $1
    FOR UPDATE
  `,
  lockInvitation: `
    SELECT
      team_invitations.invitation_key AS "invitationKey",
      team_invitations.tenant_id AS "tenantId",
      team_invitations.normalized_email AS "normalizedEmail",
      team_invitations.role,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM team_invitation_acceptances
          WHERE team_invitation_acceptances.tenant_id =
            team_invitations.tenant_id
            AND team_invitation_acceptances.invitation_key =
              team_invitations.invitation_key
        ) THEN 'accepted'
        ELSE team_invitations.status
      END AS status,
      team_invitations.version,
      team_invitations.invited_by_external_user_id
        AS "invitedByExternalUserId",
      team_invitations.last_actor_kind AS "lastActorKind",
      team_invitations.last_actor_external_user_id AS "lastActorId",
      team_invitations.requested_at AS "requestedAt",
      team_invitations.expires_at AS "expiresAt",
      team_invitations.updated_at AS "updatedAt"
    FROM team_invitations
    WHERE team_invitations.tenant_id = $1
      AND team_invitations.invitation_key = $2
    FOR UPDATE
  `,
  findEvent: `
    SELECT
      event_key AS "eventKey",
      operation_key AS "operationKey",
      invitation_key AS "invitationKey",
      tenant_id AS "tenantId",
      actor_kind AS "actorKind",
      actor_external_user_id AS "actorId",
      event_type AS "eventType",
      from_role AS "fromRole",
      to_role AS "toRole",
      from_status AS "fromStatus",
      to_status AS "toStatus",
      from_version AS "fromVersion",
      to_version AS "toVersion",
      occurred_at AS "occurredAt",
      expires_at AS "expiresAt"
    FROM team_invitation_events
    WHERE operation_key = $1
    LIMIT 1
  `,
  findEventByVersion: `
    SELECT
      event_key AS "eventKey",
      operation_key AS "operationKey",
      invitation_key AS "invitationKey",
      tenant_id AS "tenantId",
      actor_kind AS "actorKind",
      actor_external_user_id AS "actorId",
      event_type AS "eventType",
      from_role AS "fromRole",
      to_role AS "toRole",
      from_status AS "fromStatus",
      to_status AS "toStatus",
      from_version AS "fromVersion",
      to_version AS "toVersion",
      occurred_at AS "occurredAt",
      expires_at AS "expiresAt"
    FROM team_invitation_events
    WHERE tenant_id = $1
      AND invitation_key = $2
      AND to_version = $3
    LIMIT 1
  `,
  lockDelivery: `
    SELECT
      delivery_key AS "deliveryKey",
      tenant_id AS "tenantId",
      invitation_key AS "invitationKey",
      invitation_version AS "invitationVersion",
      status,
      attempt_count AS "attemptCount",
      last_error_code AS "lastErrorCode",
      submitted_at AS "submittedAt",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM team_invitation_deliveries
    WHERE delivery_key = $1
    FOR UPDATE
  `,
  insertInvitation: `
    INSERT INTO team_invitations (
      invitation_key,
      tenant_id,
      normalized_email,
      role,
      status,
      version,
      invited_by_external_user_id,
      last_actor_kind,
      last_actor_external_user_id,
      requested_at,
      expires_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, 'pending', 1,
      $5, 'user', $5, $6::timestamptz,
      $7::timestamptz, $6::timestamptz
    )
    RETURNING
      invitation_key AS "invitationKey",
      tenant_id AS "tenantId",
      normalized_email AS "normalizedEmail",
      role,
      status,
      version,
      invited_by_external_user_id AS "invitedByExternalUserId",
      last_actor_kind AS "lastActorKind",
      last_actor_external_user_id AS "lastActorId",
      requested_at AS "requestedAt",
      expires_at AS "expiresAt",
      updated_at AS "updatedAt"
  `,
  reopenInvitation: `
    UPDATE team_invitations
    SET
      role = $5,
      status = 'pending',
      version = version + 1,
      last_actor_kind = 'user',
      last_actor_external_user_id = $6,
      requested_at = $7::timestamptz,
      expires_at = $8::timestamptz,
      updated_at = $7::timestamptz
    WHERE tenant_id = $1
      AND invitation_key = $2
      AND version = $3
      AND status = $4
    RETURNING
      invitation_key AS "invitationKey",
      tenant_id AS "tenantId",
      normalized_email AS "normalizedEmail",
      role,
      status,
      version,
      invited_by_external_user_id AS "invitedByExternalUserId",
      last_actor_kind AS "lastActorKind",
      last_actor_external_user_id AS "lastActorId",
      requested_at AS "requestedAt",
      expires_at AS "expiresAt",
      updated_at AS "updatedAt"
  `,
  transitionInvitation: `
    UPDATE team_invitations
    SET
      status = $5,
      version = version + 1,
      last_actor_kind = $6,
      last_actor_external_user_id = $7,
      updated_at = $8::timestamptz
    WHERE tenant_id = $1
      AND invitation_key = $2
      AND version = $3
      AND status = $4
    RETURNING
      invitation_key AS "invitationKey",
      tenant_id AS "tenantId",
      normalized_email AS "normalizedEmail",
      role,
      status,
      version,
      invited_by_external_user_id AS "invitedByExternalUserId",
      last_actor_kind AS "lastActorKind",
      last_actor_external_user_id AS "lastActorId",
      requested_at AS "requestedAt",
      expires_at AS "expiresAt",
      updated_at AS "updatedAt"
  `,
  insertEvent: `
    INSERT INTO team_invitation_events (
      event_key,
      operation_key,
      invitation_key,
      tenant_id,
      actor_kind,
      actor_external_user_id,
      event_type,
      from_role,
      to_role,
      from_status,
      to_status,
      from_version,
      to_version,
      occurred_at,
      expires_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13,
      $14::timestamptz, $15::timestamptz
    )
    RETURNING
      event_key AS "eventKey",
      operation_key AS "operationKey",
      invitation_key AS "invitationKey",
      tenant_id AS "tenantId",
      actor_kind AS "actorKind",
      actor_external_user_id AS "actorId",
      event_type AS "eventType",
      from_role AS "fromRole",
      to_role AS "toRole",
      from_status AS "fromStatus",
      to_status AS "toStatus",
      from_version AS "fromVersion",
      to_version AS "toVersion",
      occurred_at AS "occurredAt",
      expires_at AS "expiresAt"
  `,
  insertDelivery: `
    INSERT INTO team_invitation_deliveries (
      delivery_key,
      tenant_id,
      invitation_key,
      invitation_version,
      status,
      attempt_count,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, 'pending', 0, $5::timestamptz, $5::timestamptz)
    RETURNING
      delivery_key AS "deliveryKey",
      tenant_id AS "tenantId",
      invitation_key AS "invitationKey",
      invitation_version AS "invitationVersion",
      status,
      attempt_count AS "attemptCount",
      last_error_code AS "lastErrorCode",
      submitted_at AS "submittedAt",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `,
  cancelPendingDelivery: `
    UPDATE team_invitation_deliveries
    SET
      status = 'cancelled',
      last_error_code = $4,
      updated_at = $5::timestamptz
    WHERE tenant_id = $1
      AND invitation_key = $2
      AND invitation_version = $3
      AND status = 'pending'
    RETURNING
      delivery_key AS "deliveryKey",
      tenant_id AS "tenantId",
      invitation_key AS "invitationKey",
      invitation_version AS "invitationVersion",
      status,
      attempt_count AS "attemptCount",
      last_error_code AS "lastErrorCode",
      submitted_at AS "submittedAt",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `,
});

export interface PostgresTeamInvitationRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function requireNonNegativeInteger(value: unknown): number {
  const normalized =
    typeof value === "string" && /^(?:0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;

  if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
    throw new Error("PostgreSQL returned an invalid non-negative integer");
  }

  return Number(normalized);
}

function requireExpectedVersion(value: unknown): number {
  return value === 0 ? 0 : requireTeamMembershipVersion(value);
}

function requireExpiry(requestedAt: string, value: unknown): string {
  const expiresAt = requireTeamTimestamp(value);

  if (Date.parse(expiresAt) <= Date.parse(requestedAt)) {
    throw new Error("team invitation expiry is invalid");
  }

  return expiresAt;
}

function parseInvitation(value: unknown): Readonly<TeamInvitation> {
  const row = requireExactPostgresRow(value, invitationRowKeys);
  const requestedAt = requireTeamTimestamp(
    parsePostgresTimestamp(row.requestedAt),
  );
  const expiresAt = requireExpiry(
    requestedAt,
    parsePostgresTimestamp(row.expiresAt),
  );
  const updatedAt = requireTeamTimestamp(
    parsePostgresTimestamp(row.updatedAt),
  );

  if (Date.parse(updatedAt) < Date.parse(requestedAt)) {
    throw new Error("PostgreSQL returned an invalid invitation timeline");
  }

  return Object.freeze({
    invitationKey: requireTeamInvitationKey(row.invitationKey),
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    normalizedEmail: requireTeamInvitationEmail(row.normalizedEmail),
    role: requireTeamInvitationRole(row.role),
    status: requireTeamInvitationStatus(row.status),
    version: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.version),
    ),
    invitedByExternalUserId: requireTeamExternalUserId(
      row.invitedByExternalUserId,
    ),
    lastActor: requireStoredTeamInvitationActor(
      row.lastActorKind,
      row.lastActorId,
    ),
    requestedAt,
    expiresAt,
    updatedAt,
  });
}

function requireEventType(value: unknown): TeamInvitationEventType {
  const eventTypes: readonly TeamInvitationEventType[] = [
    "requested",
    "re-requested",
    "revoked",
    "expired",
  ];

  if (
    typeof value !== "string" ||
    !eventTypes.some((eventType) => eventType === value)
  ) {
    throw new Error("PostgreSQL returned an invalid invitation event type");
  }

  return value as TeamInvitationEventType;
}

function parseEvent(value: unknown): Readonly<InvitationEvent> {
  const row = requireExactPostgresRow(value, eventRowKeys);
  const fromVersion = requireNonNegativeInteger(row.fromVersion);

  return Object.freeze({
    eventKey: requireTeamInvitationEventKey(row.eventKey),
    operationKey: requireTeamInvitationOperationKey(row.operationKey),
    invitationKey: requireTeamInvitationKey(row.invitationKey),
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    actor: requireStoredTeamInvitationActor(row.actorKind, row.actorId),
    eventType: requireEventType(row.eventType),
    fromRole:
      row.fromRole === null ? null : requireTeamInvitationRole(row.fromRole),
    toRole: requireTeamInvitationRole(row.toRole),
    fromStatus:
      row.fromStatus === null
        ? null
        : requireTeamInvitationStatus(row.fromStatus),
    toStatus: requireTeamInvitationStatus(row.toStatus),
    fromVersion,
    toVersion: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.toVersion),
    ),
    occurredAt: requireTeamTimestamp(
      parsePostgresTimestamp(row.occurredAt),
    ),
    expiresAt: requireTeamTimestamp(
      parsePostgresTimestamp(row.expiresAt),
    ),
  });
}

function parseDelivery(value: unknown): Readonly<TeamInvitationDelivery> {
  const row = requireExactPostgresRow(value, deliveryRowKeys);

  return Object.freeze({
    deliveryKey: requireTeamInvitationDeliveryKey(row.deliveryKey),
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    invitationKey: requireTeamInvitationKey(row.invitationKey),
    invitationVersion: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.invitationVersion),
    ),
    status: requireTeamInvitationDeliveryStatus(row.status),
    attemptCount: requireNonNegativeInteger(row.attemptCount),
    lastErrorCode:
      row.lastErrorCode === null
        ? null
        : requireTeamInvitationDeliveryErrorCode(row.lastErrorCode),
    submittedAt:
      row.submittedAt === null
        ? null
        : requireTeamTimestamp(parsePostgresTimestamp(row.submittedAt)),
    createdAt: requireTeamTimestamp(
      parsePostgresTimestamp(row.createdAt),
    ),
    updatedAt: requireTeamTimestamp(
      parsePostgresTimestamp(row.updatedAt),
    ),
  });
}

async function loadOne<TValue>(
  database: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  parse: (value: unknown) => TValue,
): Promise<TValue | null> {
  const result = await database.query<Record<string, unknown>>(
    sql,
    parameters,
  );
  const rows = requirePostgresRows(result, 1);

  return rows.length === 0 ? null : parse(rows[0]);
}

async function loadInvitation(
  database: PostgresQueryExecutor,
  sql: string,
  tenantId: number,
  invitationKey: string,
): Promise<Readonly<TeamInvitation> | null> {
  const invitation = await loadOne(
    database,
    sql,
    [tenantId, invitationKey],
    parseInvitation,
  );

  if (
    invitation !== null &&
    (invitation.tenantId !== tenantId ||
      invitation.invitationKey !== invitationKey)
  ) {
    throw new Error("PostgreSQL returned invalid invitation scope");
  }

  return invitation;
}

async function lockTenant(
  transaction: PostgresTransaction,
  tenantId: number,
): Promise<boolean> {
  const row = await loadOne(
    transaction,
    postgresTeamInvitationSql.lockTenant,
    [tenantId],
    (value) => requireExactPostgresRow(value, tenantRowKeys),
  );

  if (row === null) {
    return false;
  }

  if (parsePostgresPositiveInteger(row.tenantId) !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant invitation lock");
  }

  return true;
}

async function loadEvent(
  database: PostgresQueryExecutor,
  operationKey: string,
): Promise<Readonly<InvitationEvent> | null> {
  return loadOne(
    database,
    postgresTeamInvitationSql.findEvent,
    [operationKey],
    parseEvent,
  );
}

async function loadEventByVersion(
  database: PostgresQueryExecutor,
  tenantId: number,
  invitationKey: string,
  toVersion: number,
): Promise<Readonly<InvitationEvent> | null> {
  return loadOne(
    database,
    postgresTeamInvitationSql.findEventByVersion,
    [tenantId, invitationKey, toVersion],
    parseEvent,
  );
}

async function loadDelivery(
  database: PostgresQueryExecutor,
  deliveryKey: string,
): Promise<Readonly<TeamInvitationDelivery> | null> {
  return loadOne(
    database,
    postgresTeamInvitationSql.lockDelivery,
    [deliveryKey],
    parseDelivery,
  );
}

function eventMatches(
  actual: Readonly<InvitationEvent> | null,
  expected: Readonly<InvitationEvent>,
): boolean {
  return (
    actual !== null &&
    actual.eventKey === expected.eventKey &&
    actual.operationKey === expected.operationKey &&
    actual.invitationKey === expected.invitationKey &&
    actual.tenantId === expected.tenantId &&
    actual.actor.kind === expected.actor.kind &&
    actual.actor.id === expected.actor.id &&
    actual.eventType === expected.eventType &&
    actual.fromRole === expected.fromRole &&
    actual.toRole === expected.toRole &&
    actual.fromStatus === expected.fromStatus &&
    actual.toStatus === expected.toStatus &&
    actual.fromVersion === expected.fromVersion &&
    actual.toVersion === expected.toVersion &&
    actual.occurredAt === expected.occurredAt &&
    actual.expiresAt === expected.expiresAt
  );
}

function invitationMatches(
  actual: Readonly<TeamInvitation> | null,
  expected: Readonly<TeamInvitation>,
): boolean {
  return (
    actual !== null &&
    actual.invitationKey === expected.invitationKey &&
    actual.tenantId === expected.tenantId &&
    actual.normalizedEmail === expected.normalizedEmail &&
    actual.role === expected.role &&
    actual.status === expected.status &&
    actual.version === expected.version &&
    actual.invitedByExternalUserId === expected.invitedByExternalUserId &&
    actual.lastActor.kind === expected.lastActor.kind &&
    actual.lastActor.id === expected.lastActor.id &&
    actual.requestedAt === expected.requestedAt &&
    actual.expiresAt === expected.expiresAt &&
    actual.updatedAt === expected.updatedAt
  );
}

function deliveryIdentityMatches(
  actual: Readonly<TeamInvitationDelivery> | null,
  expected: Readonly<{
    deliveryKey: string;
    tenantId: number;
    invitationKey: string;
    invitationVersion: number;
  }>,
): actual is Readonly<TeamInvitationDelivery> {
  return (
    actual !== null &&
    actual.deliveryKey === expected.deliveryKey &&
    actual.tenantId === expected.tenantId &&
    actual.invitationKey === expected.invitationKey &&
    actual.invitationVersion === expected.invitationVersion
  );
}

function mutationResult(
  outcome: TeamInvitationMutationResult["outcome"],
  invitation: Readonly<TeamInvitation> | null,
): TeamInvitationMutationResult {
  return Object.freeze({ outcome, invitation });
}

async function writeInvitation(
  transaction: PostgresTransaction,
  sql: string,
  parameters: readonly PostgresParameter[],
  expected: Readonly<TeamInvitation>,
): Promise<Readonly<TeamInvitation>> {
  const saved = await loadOne(transaction, sql, parameters, parseInvitation);

  if (saved === null || !invitationMatches(saved, expected)) {
    throw new Error("PostgreSQL returned a mismatched invitation mutation");
  }

  return saved;
}

async function insertEvent(
  transaction: PostgresTransaction,
  expected: Readonly<InvitationEvent>,
): Promise<void> {
  const saved = await loadOne(
    transaction,
    postgresTeamInvitationSql.insertEvent,
    [
      expected.eventKey,
      expected.operationKey,
      expected.invitationKey,
      expected.tenantId,
      expected.actor.kind,
      expected.actor.id,
      expected.eventType,
      expected.fromRole,
      expected.toRole,
      expected.fromStatus,
      expected.toStatus,
      expected.fromVersion,
      expected.toVersion,
      expected.occurredAt,
      expected.expiresAt,
    ],
    parseEvent,
  );

  if (!eventMatches(saved, expected)) {
    throw new Error("PostgreSQL returned a mismatched invitation event");
  }
}

async function insertDelivery(
  transaction: PostgresTransaction,
  expected: Readonly<TeamInvitationDelivery>,
): Promise<void> {
  const saved = await loadOne(
    transaction,
    postgresTeamInvitationSql.insertDelivery,
    [
      expected.deliveryKey,
      expected.tenantId,
      expected.invitationKey,
      expected.invitationVersion,
      expected.createdAt,
    ],
    parseDelivery,
  );

  if (
    !deliveryIdentityMatches(saved, expected) ||
    saved.status !== "pending" ||
    saved.attemptCount !== 0 ||
    saved.lastErrorCode !== null ||
    saved.submittedAt !== null ||
    saved.createdAt !== expected.createdAt ||
    saved.updatedAt !== expected.updatedAt
  ) {
    throw new Error("PostgreSQL returned a mismatched invitation delivery");
  }
}

async function requestTransaction(
  transaction: PostgresTransaction,
  command: Readonly<{
    tenantId: number;
    normalizedEmail: string;
    role: TeamInvitationRole;
    expectedVersion: number;
    actorExternalUserId: UserId;
    requestedAt: string;
    expiresAt: string;
    invitationKey: string;
  }>,
): Promise<TeamInvitationMutationResult> {
  if (!(await lockTenant(transaction, command.tenantId))) {
    return mutationResult("not-found", null);
  }

  const current = await loadInvitation(
    transaction,
    postgresTeamInvitationSql.lockInvitation,
    command.tenantId,
    command.invitationKey,
  );

  if (
    current !== null &&
    current.version === command.expectedVersion + 1 &&
    current.role === command.role &&
    current.status === "pending" &&
    current.lastActor.kind === "user" &&
    current.lastActor.id === command.actorExternalUserId &&
    current.requestedAt === command.requestedAt &&
    current.expiresAt === command.expiresAt &&
    current.updatedAt === command.requestedAt
  ) {
    const existingEvent = await loadEventByVersion(
      transaction,
      command.tenantId,
      command.invitationKey,
      current.version,
    );
    const expectedEventType: TeamInvitationEventType =
      command.expectedVersion === 0 ? "requested" : "re-requested";

    if (
      existingEvent === null ||
      existingEvent.invitationKey !== command.invitationKey ||
      existingEvent.tenantId !== command.tenantId ||
      existingEvent.actor.kind !== "user" ||
      existingEvent.actor.id !== command.actorExternalUserId ||
      existingEvent.eventType !== expectedEventType ||
      existingEvent.toRole !== command.role ||
      existingEvent.toStatus !== "pending" ||
      existingEvent.fromVersion !== command.expectedVersion ||
      existingEvent.toVersion !== current.version ||
      existingEvent.occurredAt !== command.requestedAt ||
      existingEvent.expiresAt !== command.expiresAt
    ) {
      throw new Error("PostgreSQL invitation replay event is incomplete");
    }

    const expectedOperationKey = await deriveTeamInvitationOperationKey({
      operation: command.expectedVersion === 0 ? "request" : "re-request",
      tenantId: command.tenantId,
      invitationKey: command.invitationKey,
      expectedVersion: command.expectedVersion,
      role: command.role,
      fromStatus: existingEvent.fromStatus,
      actorExternalUserId: command.actorExternalUserId,
      occurredAt: command.requestedAt,
      expiresAt: command.expiresAt,
    });
    const expectedEventKey = await deriveTeamInvitationEventKey({
      operationKey: expectedOperationKey,
      invitationKey: command.invitationKey,
      eventType: expectedEventType,
    });
    const deliveryKey = await deriveTeamInvitationDeliveryKey({
      tenantId: command.tenantId,
      invitationKey: command.invitationKey,
      invitationVersion: current.version,
    });
    const existingDelivery = await loadDelivery(transaction, deliveryKey);

    if (
      existingEvent.operationKey === expectedOperationKey &&
      existingEvent.eventKey === expectedEventKey &&
      deliveryIdentityMatches(existingDelivery, {
        deliveryKey,
        tenantId: command.tenantId,
        invitationKey: command.invitationKey,
        invitationVersion: current.version,
      })
    ) {
      return mutationResult("unchanged", current);
    }

    throw new Error("PostgreSQL invitation replay evidence is incomplete");
  }

  const fromStatus = command.expectedVersion === 0
    ? null
    : current?.status ?? null;
  const eventType: TeamInvitationEventType = command.expectedVersion === 0
    ? "requested"
    : "re-requested";
  const operationKey = await deriveTeamInvitationOperationKey({
    operation: command.expectedVersion === 0 ? "request" : "re-request",
    tenantId: command.tenantId,
    invitationKey: command.invitationKey,
    expectedVersion: command.expectedVersion,
    role: command.role,
    fromStatus,
    actorExternalUserId: command.actorExternalUserId,
    occurredAt: command.requestedAt,
    expiresAt: command.expiresAt,
  });
  const eventKey = await deriveTeamInvitationEventKey({
    operationKey,
    invitationKey: command.invitationKey,
    eventType,
  });
  const toVersion = command.expectedVersion + 1;
  const deliveryKey = await deriveTeamInvitationDeliveryKey({
    tenantId: command.tenantId,
    invitationKey: command.invitationKey,
    invitationVersion: toVersion,
  });
  const expectedEvent: Readonly<InvitationEvent> = Object.freeze({
    eventKey,
    operationKey,
    invitationKey: command.invitationKey,
    tenantId: command.tenantId,
    actor: Object.freeze({ kind: "user", id: command.actorExternalUserId }),
    eventType,
    fromRole: current?.role ?? null,
    toRole: command.role,
    fromStatus,
    toStatus: "pending",
    fromVersion: command.expectedVersion,
    toVersion,
    occurredAt: command.requestedAt,
    expiresAt: command.expiresAt,
  });
  const expectedInvitation: Readonly<TeamInvitation> = Object.freeze({
    invitationKey: command.invitationKey,
    tenantId: command.tenantId,
    normalizedEmail: command.normalizedEmail,
    role: command.role,
    status: "pending",
    version: toVersion,
    invitedByExternalUserId:
      current?.invitedByExternalUserId ?? command.actorExternalUserId,
    lastActor: Object.freeze({ kind: "user", id: command.actorExternalUserId }),
    requestedAt: command.requestedAt,
    expiresAt: command.expiresAt,
    updatedAt: command.requestedAt,
  });

  if (current === null && command.expectedVersion !== 0) {
    return mutationResult("not-found", null);
  }

  if (current !== null && current.version !== command.expectedVersion) {
    return mutationResult("conflict", current);
  }

  if (
    current !== null &&
    (current.status === "pending" || current.status === "accepted")
  ) {
    return mutationResult("invalid-transition", current);
  }

  const saved = current === null
    ? await writeInvitation(
        transaction,
        postgresTeamInvitationSql.insertInvitation,
        [
          command.invitationKey,
          command.tenantId,
          command.normalizedEmail,
          command.role,
          command.actorExternalUserId,
          command.requestedAt,
          command.expiresAt,
        ],
        expectedInvitation,
      )
    : await writeInvitation(
        transaction,
        postgresTeamInvitationSql.reopenInvitation,
        [
          command.tenantId,
          command.invitationKey,
          command.expectedVersion,
          current.status,
          command.role,
          command.actorExternalUserId,
          command.requestedAt,
          command.expiresAt,
        ],
        expectedInvitation,
      );

  await insertEvent(transaction, expectedEvent);
  await insertDelivery(
    transaction,
    Object.freeze({
      deliveryKey,
      tenantId: command.tenantId,
      invitationKey: command.invitationKey,
      invitationVersion: toVersion,
      status: "pending",
      attemptCount: 0,
      lastErrorCode: null,
      submittedAt: null,
      createdAt: command.requestedAt,
      updatedAt: command.requestedAt,
    }),
  );

  return mutationResult(current === null ? "created" : "updated", saved);
}

async function transitionTransaction(
  transaction: PostgresTransaction,
  command: Readonly<{
    tenantId: number;
    invitationKey: string;
    expectedVersion: number;
    toStatus: "revoked" | "expired";
    actor: TeamInvitationActor;
    occurredAt: string;
  }>,
): Promise<TeamInvitationMutationResult> {
  if (!(await lockTenant(transaction, command.tenantId))) {
    return mutationResult("not-found", null);
  }

  const current = await loadInvitation(
    transaction,
    postgresTeamInvitationSql.lockInvitation,
    command.tenantId,
    command.invitationKey,
  );

  if (current === null) {
    return mutationResult("not-found", null);
  }

  const eventType: TeamInvitationEventType =
    command.toStatus === "revoked" ? "revoked" : "expired";
  const operationKey = await deriveTeamInvitationOperationKey({
    operation: command.toStatus === "revoked" ? "revoke" : "expire",
    tenantId: command.tenantId,
    invitationKey: command.invitationKey,
    expectedVersion: command.expectedVersion,
    role: current.role,
    fromStatus: "pending",
    ...(command.actor.kind === "user"
      ? { actorExternalUserId: command.actor.id }
      : { systemActorId: command.actor.id }),
    occurredAt: command.occurredAt,
    expiresAt: current.expiresAt,
  });
  const eventKey = await deriveTeamInvitationEventKey({
    operationKey,
    invitationKey: command.invitationKey,
    eventType,
  });
  const deliveryKey = await deriveTeamInvitationDeliveryKey({
    tenantId: command.tenantId,
    invitationKey: command.invitationKey,
    invitationVersion: command.expectedVersion,
  });
  const expectedEvent: Readonly<InvitationEvent> = Object.freeze({
    eventKey,
    operationKey,
    invitationKey: command.invitationKey,
    tenantId: command.tenantId,
    actor: command.actor,
    eventType,
    fromRole: current.role,
    toRole: current.role,
    fromStatus: "pending",
    toStatus: command.toStatus,
    fromVersion: command.expectedVersion,
    toVersion: command.expectedVersion + 1,
    occurredAt: command.occurredAt,
    expiresAt: current.expiresAt,
  });

  if (
    current.version === command.expectedVersion + 1 &&
    current.status === command.toStatus
  ) {
    const existingEvent = await loadEvent(transaction, operationKey);
    const settledDelivery = await loadDelivery(transaction, deliveryKey);

    if (
      eventMatches(existingEvent, expectedEvent) &&
      deliveryIdentityMatches(settledDelivery, {
        deliveryKey,
        tenantId: command.tenantId,
        invitationKey: command.invitationKey,
        invitationVersion: command.expectedVersion,
      }) &&
      settledDelivery.status !== "pending" &&
      settledDelivery.status !== "sending"
    ) {
      return mutationResult("unchanged", current);
    }

    throw new Error("PostgreSQL invitation transition evidence is incomplete");
  }

  if (current.version !== command.expectedVersion) {
    return mutationResult("conflict", current);
  }

  if (current.status !== "pending") {
    return mutationResult("invalid-transition", current);
  }

  const delivery = await loadDelivery(transaction, deliveryKey);

  if (
    !deliveryIdentityMatches(delivery, {
      deliveryKey,
      tenantId: command.tenantId,
      invitationKey: command.invitationKey,
      invitationVersion: command.expectedVersion,
    })
  ) {
    throw new Error("PostgreSQL invitation transition delivery is missing");
  }

  if (delivery.status === "sending") {
    return mutationResult("invalid-transition", current);
  }

  if (delivery.status === "pending") {
    const errorCode = command.toStatus === "expired"
      ? "INVITATION_EXPIRED"
      : "INVITATION_REVOKED";
    const cancelled = await loadOne(
      transaction,
      postgresTeamInvitationSql.cancelPendingDelivery,
      [
        command.tenantId,
        command.invitationKey,
        command.expectedVersion,
        errorCode,
        command.occurredAt,
      ],
      parseDelivery,
    );

    if (
      !deliveryIdentityMatches(cancelled, delivery) ||
      cancelled.status !== "cancelled" ||
      cancelled.lastErrorCode !== errorCode ||
      cancelled.updatedAt !== command.occurredAt
    ) {
      throw new Error("PostgreSQL failed to cancel invitation delivery");
    }
  }

  const expectedInvitation: Readonly<TeamInvitation> = Object.freeze({
    ...current,
    status: command.toStatus,
    version: command.expectedVersion + 1,
    lastActor: command.actor,
    updatedAt: command.occurredAt,
  });
  const saved = await writeInvitation(
    transaction,
    postgresTeamInvitationSql.transitionInvitation,
    [
      command.tenantId,
      command.invitationKey,
      command.expectedVersion,
      "pending",
      command.toStatus,
      command.actor.kind,
      command.actor.id,
      command.occurredAt,
    ],
    expectedInvitation,
  );

  await insertEvent(transaction, expectedEvent);

  return mutationResult("updated", saved);
}

export function createPostgresTeamInvitationRepository(
  dependencies: Readonly<PostgresTeamInvitationRepositoryDependencies>,
): TeamInvitationRepository {
  if (
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL invitation dependencies are invalid");
  }

  return Object.freeze({
    async find(tenantIdInput: unknown, invitationKeyInput: unknown) {
      const tenantId = requireTeamTenantId(tenantIdInput);
      const invitationKey = requireTeamInvitationKey(invitationKeyInput);
      const invitation = await loadInvitation(
        dependencies.queries,
        postgresTeamInvitationSql.find,
        tenantId,
        invitationKey,
      );

      if (
        invitation !== null &&
        await deriveTeamInvitationKey({
          tenantId,
          email: invitation.normalizedEmail,
        }) !== invitationKey
      ) {
        throw new Error("PostgreSQL returned invalid invitation identity");
      }

      return invitation;
    },

    async request(command: RequestTeamInvitationCommand) {
      const tenantId = requireTeamTenantId(command.tenantId);
      const normalizedEmail = requireTeamInvitationEmail(command.email);
      const role = requireTeamInvitationRole(command.role);
      const expectedVersion = requireExpectedVersion(command.expectedVersion);
      const actorExternalUserId = requireTeamExternalUserId(
        command.actorExternalUserId,
      );
      const requestedAt = requireTeamTimestamp(command.requestedAt);
      const expiresAt = requireExpiry(requestedAt, command.expiresAt);
      const invitationKey = await deriveTeamInvitationKey({
        tenantId,
        email: normalizedEmail,
      });

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => requestTransaction(transaction, {
          tenantId,
          normalizedEmail,
          role,
          expectedVersion,
          actorExternalUserId,
          requestedAt,
          expiresAt,
          invitationKey,
        }),
      );
    },

    async transition(command: TransitionTeamInvitationCommand) {
      const tenantId = requireTeamTenantId(command.tenantId);
      const invitationKey = requireTeamInvitationKey(command.invitationKey);
      const expectedVersion = requireTeamMembershipVersion(
        command.expectedVersion,
      );
      const toStatus = requireTeamInvitationStatus(command.toStatus);

      if (toStatus !== "revoked" && toStatus !== "expired") {
        throw new Error("team invitation transition status is invalid");
      }

      const actor = requireTeamInvitationActor({
        actorExternalUserId: command.actorExternalUserId,
        systemActorId: command.systemActorId,
      });

      if (actor.kind === "system" && toStatus !== "expired") {
        throw new Error("team invitation system actor operation is invalid");
      }

      const occurredAt = requireTeamTimestamp(command.occurredAt);

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => transitionTransaction(transaction, {
          tenantId,
          invitationKey,
          expectedVersion,
          toStatus,
          actor,
          occurredAt,
        }),
      );
    },
  });
}
