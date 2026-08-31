import type {
  ChangeTeamMemberRoleCommand,
  ChangeTeamMemberStatusCommand,
  TenantMembershipMutationRepository,
  TransferTeamOwnershipCommand,
} from "../../db/tenantMembershipMutationRepository.ts";
import type {
  TenantRole,
  UserId,
} from "../../shared/domain/model.ts";
import type {
  TeamMembership,
  TeamMembershipEventType,
  TeamMembershipMutationResult,
  TeamMembershipStatus,
  TeamOwnerTransferResult,
} from "../../shared/domain/teamMembership.ts";
import {
  deriveTeamMembershipEventKey,
  deriveTeamMembershipOperationKey,
} from "../team/teamMembershipKey.ts";
import {
  requireFormerOwnerRole,
  requireTeamExternalUserId,
  requireTeamMembershipStatus,
  requireTeamMembershipVersion,
  requireTeamRole,
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

const maximumMemberships = 100;
const membershipRowKeys = Object.freeze([
  "tenantId",
  "externalUserId",
  "role",
  "status",
  "version",
]);
const eventRowKeys = Object.freeze([
  "eventKey",
  "operationKey",
  "tenantId",
  "targetExternalUserId",
  "actorExternalUserId",
  "eventType",
  "fromRole",
  "toRole",
  "fromStatus",
  "toStatus",
  "fromVersion",
  "toVersion",
  "occurredAt",
]);
const tenantLockRowKeys = Object.freeze([
  "tenantId",
]);

interface MembershipEvent {
  readonly eventKey: string;
  readonly operationKey: string;
  readonly tenantId: number;
  readonly targetExternalUserId: UserId;
  readonly actorExternalUserId: UserId;
  readonly eventType: TeamMembershipEventType;
  readonly fromRole: TenantRole;
  readonly toRole: TenantRole;
  readonly fromStatus: TeamMembershipStatus;
  readonly toStatus: TeamMembershipStatus;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly occurredAt: string;
}

type ExpectedEvent = Omit<
  MembershipEvent,
  "occurredAt"
>;

export const postgresTenantMembershipMutationSql =
  Object.freeze({
    listByTenantId: `
      SELECT
        tenant_id AS "tenantId",
        external_user_id AS "externalUserId",
        role,
        status,
        version
      FROM tenant_memberships
      WHERE tenant_id = $1
      ORDER BY id ASC
      LIMIT 101
    `,
    lockTenant: `
      SELECT id AS "tenantId"
      FROM tenants
      WHERE id = $1
      FOR UPDATE
    `,
    lockMember: `
      SELECT
        tenant_id AS "tenantId",
        external_user_id AS "externalUserId",
        role,
        status,
        version
      FROM tenant_memberships
      WHERE tenant_id = $1
        AND external_user_id = $2
      FOR UPDATE
    `,
    lockOwnerPair: `
      SELECT
        tenant_id AS "tenantId",
        external_user_id AS "externalUserId",
        role,
        status,
        version
      FROM tenant_memberships
      WHERE tenant_id = $1
        AND external_user_id IN ($2, $3)
      ORDER BY external_user_id ASC
      FOR UPDATE
    `,
    findEvent: `
      SELECT
        event_key AS "eventKey",
        operation_key AS "operationKey",
        tenant_id AS "tenantId",
        target_external_user_id AS "targetExternalUserId",
        actor_external_user_id AS "actorExternalUserId",
        event_type AS "eventType",
        from_role AS "fromRole",
        to_role AS "toRole",
        from_status AS "fromStatus",
        to_status AS "toStatus",
        from_version AS "fromVersion",
        to_version AS "toVersion",
        occurred_at AS "occurredAt"
      FROM tenant_membership_events
      WHERE operation_key = $1
        AND target_external_user_id = $2
      LIMIT 1
    `,
    changeRole: `
      UPDATE tenant_memberships
      SET
        role = $6,
        version = version + 1,
        updated_at = $7::timestamptz
      WHERE tenant_id = $1
        AND external_user_id = $2
        AND version = $3
        AND role = $4
        AND status = $5
      RETURNING
        tenant_id AS "tenantId",
        external_user_id AS "externalUserId",
        role,
        status,
        version
    `,
    changeStatus: `
      UPDATE tenant_memberships
      SET
        status = $6,
        version = version + 1,
        updated_at = $7::timestamptz
      WHERE tenant_id = $1
        AND external_user_id = $2
        AND version = $3
        AND role = $4
        AND status = $5
      RETURNING
        tenant_id AS "tenantId",
        external_user_id AS "externalUserId",
        role,
        status,
        version
    `,
    insertEvent: `
      INSERT INTO tenant_membership_events (
        event_key,
        operation_key,
        tenant_id,
        target_external_user_id,
        actor_external_user_id,
        event_type,
        from_role,
        to_role,
        from_status,
        to_status,
        from_version,
        to_version,
        occurred_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $11 + 1, $12::timestamptz
      )
      RETURNING
        event_key AS "eventKey",
        operation_key AS "operationKey",
        tenant_id AS "tenantId",
        target_external_user_id AS "targetExternalUserId",
        actor_external_user_id AS "actorExternalUserId",
        event_type AS "eventType",
        from_role AS "fromRole",
        to_role AS "toRole",
        from_status AS "fromStatus",
        to_status AS "toStatus",
        from_version AS "fromVersion",
        to_version AS "toVersion",
        occurred_at AS "occurredAt"
    `,
  });

export interface PostgresTenantMembershipMutationDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function parseMembership(
  value: unknown,
): Readonly<TeamMembership> {
  const row = requireExactPostgresRow(
    value,
    membershipRowKeys,
  );

  return Object.freeze({
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    externalUserId: requireTeamExternalUserId(
      row.externalUserId,
    ),
    role: requireTeamRole(row.role),
    status: requireTeamMembershipStatus(
      row.status,
    ),
    version: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.version),
    ),
  });
}

function requireEventIdentity(
  eventKey: unknown,
  operationKey: unknown,
): readonly [string, string] {
  if (
    typeof eventKey !== "string" ||
    !/^tenant_membership_event_v1_[0-9a-f]{64}$/.test(
      eventKey,
    ) ||
    typeof operationKey !== "string" ||
    !/^tenant_membership_operation_v1_[0-9a-f]{64}$/.test(
      operationKey,
    )
  ) {
    throw new Error(
      "PostgreSQL returned an invalid team membership event identity",
    );
  }

  return [eventKey, operationKey];
}

function requireEventType(
  value: unknown,
): TeamMembershipEventType {
  const eventTypes: readonly TeamMembershipEventType[] = [
    "role-changed",
    "suspended",
    "reactivated",
    "owner-transfer-out",
    "owner-transfer-in",
  ];

  if (
    typeof value !== "string" ||
    !eventTypes.some((eventType) => eventType === value)
  ) {
    throw new Error(
      "PostgreSQL returned an invalid team membership event type",
    );
  }

  return value as TeamMembershipEventType;
}

function parseEvent(
  value: unknown,
): Readonly<MembershipEvent> {
  const row = requireExactPostgresRow(
    value,
    eventRowKeys,
  );
  const [eventKey, operationKey] = requireEventIdentity(
    row.eventKey,
    row.operationKey,
  );

  return Object.freeze({
    eventKey,
    operationKey,
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    targetExternalUserId: requireTeamExternalUserId(
      row.targetExternalUserId,
    ),
    actorExternalUserId: requireTeamExternalUserId(
      row.actorExternalUserId,
    ),
    eventType: requireEventType(row.eventType),
    fromRole: requireTeamRole(row.fromRole),
    toRole: requireTeamRole(row.toRole),
    fromStatus: requireTeamMembershipStatus(
      row.fromStatus,
    ),
    toStatus: requireTeamMembershipStatus(
      row.toStatus,
    ),
    fromVersion: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.fromVersion),
    ),
    toVersion: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.toVersion),
    ),
    occurredAt: requireTeamTimestamp(
      parsePostgresTimestamp(row.occurredAt),
    ),
  });
}

function eventMatches(
  event: MembershipEvent | null,
  expected: ExpectedEvent,
): boolean {
  return (
    event !== null &&
    event.eventKey === expected.eventKey &&
    event.operationKey === expected.operationKey &&
    event.tenantId === expected.tenantId &&
    event.targetExternalUserId ===
      expected.targetExternalUserId &&
    event.actorExternalUserId ===
      expected.actorExternalUserId &&
    event.eventType === expected.eventType &&
    event.fromRole === expected.fromRole &&
    event.toRole === expected.toRole &&
    event.fromStatus === expected.fromStatus &&
    event.toStatus === expected.toStatus &&
    event.fromVersion === expected.fromVersion &&
    event.toVersion === expected.toVersion
  );
}

function eventIntentMatches(
  event: MembershipEvent | null,
  expected: Readonly<{
    eventKey: string;
    operationKey: string;
    tenantId: number;
    targetExternalUserId: UserId;
    actorExternalUserId: UserId;
    eventType: TeamMembershipEventType;
    toRole: TenantRole;
    toStatus: TeamMembershipStatus;
    fromVersion: number;
  }>,
): boolean {
  return (
    event !== null &&
    event.eventKey === expected.eventKey &&
    event.operationKey === expected.operationKey &&
    event.tenantId === expected.tenantId &&
    event.targetExternalUserId ===
      expected.targetExternalUserId &&
    event.actorExternalUserId ===
      expected.actorExternalUserId &&
    event.eventType === expected.eventType &&
    event.toRole === expected.toRole &&
    event.toStatus === expected.toStatus &&
    event.fromVersion === expected.fromVersion &&
    event.toVersion === expected.fromVersion + 1
  );
}

async function loadMemberships(
  database: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly Readonly<TeamMembership>[]> {
  const result = await database.query<Record<string, unknown>>(
    sql,
    parameters,
  );
  const rows = requirePostgresRows(result, maximum);

  return Object.freeze(rows.map(parseMembership));
}

async function loadEvent(
  database: PostgresQueryExecutor,
  operationKey: string,
  targetExternalUserId: UserId,
): Promise<Readonly<MembershipEvent> | null> {
  const result = await database.query<Record<string, unknown>>(
    postgresTenantMembershipMutationSql.findEvent,
    [operationKey, targetExternalUserId],
  );
  const rows = requirePostgresRows(result, 1);

  return rows.length === 0 ? null : parseEvent(rows[0]);
}

async function lockTenant(
  transaction: PostgresTransaction,
  tenantId: number,
): Promise<boolean> {
  const result = await transaction.query<Record<string, unknown>>(
    postgresTenantMembershipMutationSql.lockTenant,
    [tenantId],
  );
  const rows = requirePostgresRows(result, 1);

  if (rows.length === 0) {
    return false;
  }

  const row = requireExactPostgresRow(
    rows[0],
    tenantLockRowKeys,
  );

  if (
    parsePostgresPositiveInteger(row.tenantId) !== tenantId
  ) {
    throw new Error(
      "PostgreSQL returned a cross-tenant mutation lock",
    );
  }

  return true;
}

async function lockMember(
  transaction: PostgresTransaction,
  tenantId: number,
  externalUserId: UserId,
): Promise<Readonly<TeamMembership> | null> {
  const memberships = await loadMemberships(
    transaction,
    postgresTenantMembershipMutationSql.lockMember,
    [tenantId, externalUserId],
    1,
  );
  const membership = memberships[0] ?? null;

  if (
    membership !== null &&
    (membership.tenantId !== tenantId ||
      membership.externalUserId !== externalUserId)
  ) {
    throw new Error(
      "PostgreSQL returned an invalid membership mutation scope",
    );
  }

  return membership;
}

async function lockOwnerPair(
  transaction: PostgresTransaction,
  tenantId: number,
  formerOwnerExternalUserId: UserId,
  newOwnerExternalUserId: UserId,
): Promise<Readonly<{
  formerOwner: Readonly<TeamMembership> | null;
  newOwner: Readonly<TeamMembership> | null;
}>> {
  const memberships = await loadMemberships(
    transaction,
    postgresTenantMembershipMutationSql.lockOwnerPair,
    [
      tenantId,
      formerOwnerExternalUserId,
      newOwnerExternalUserId,
    ],
    2,
  );

  if (
    memberships.some(
      (membership) =>
        membership.tenantId !== tenantId ||
        (membership.externalUserId !==
          formerOwnerExternalUserId &&
          membership.externalUserId !== newOwnerExternalUserId),
    ) ||
    new Set(
      memberships.map(
        (membership) => membership.externalUserId,
      ),
    ).size !== memberships.length
  ) {
    throw new Error(
      "PostgreSQL returned an invalid owner transfer scope",
    );
  }

  return Object.freeze({
    formerOwner:
      memberships.find(
        (membership) =>
          membership.externalUserId ===
          formerOwnerExternalUserId,
      ) ?? null,
    newOwner:
      memberships.find(
        (membership) =>
          membership.externalUserId === newOwnerExternalUserId,
      ) ?? null,
  });
}

async function writeMembership(
  transaction: PostgresTransaction,
  sql: string,
  parameters: readonly PostgresParameter[],
  expected: Readonly<TeamMembership>,
): Promise<Readonly<TeamMembership>> {
  const memberships = await loadMemberships(
    transaction,
    sql,
    parameters,
    1,
  );

  if (
    memberships.length !== 1 ||
    memberships[0].tenantId !== expected.tenantId ||
    memberships[0].externalUserId !== expected.externalUserId ||
    memberships[0].role !== expected.role ||
    memberships[0].status !== expected.status ||
    memberships[0].version !== expected.version
  ) {
    throw new Error(
      "PostgreSQL returned a mismatched membership mutation",
    );
  }

  return memberships[0];
}

async function insertEvent(
  transaction: PostgresTransaction,
  event: ExpectedEvent,
  occurredAt: string,
): Promise<void> {
  const result = await transaction.query<Record<string, unknown>>(
    postgresTenantMembershipMutationSql.insertEvent,
    [
      event.eventKey,
      event.operationKey,
      event.tenantId,
      event.targetExternalUserId,
      event.actorExternalUserId,
      event.eventType,
      event.fromRole,
      event.toRole,
      event.fromStatus,
      event.toStatus,
      event.fromVersion,
      occurredAt,
    ],
  );
  const rows = requirePostgresRows(result, 1);
  const savedEvent = rows.length === 1
    ? parseEvent(rows[0])
    : null;

  if (
    savedEvent === null ||
    !eventMatches(savedEvent, event) ||
    savedEvent.occurredAt !== occurredAt
  ) {
    throw new Error(
      "PostgreSQL returned a mismatched membership event",
    );
  }
}

function singleResult(
  outcome: TeamMembershipMutationResult["outcome"],
  membership: Readonly<TeamMembership> | null,
): TeamMembershipMutationResult {
  return Object.freeze({ outcome, membership });
}

function transferResult(
  outcome: TeamOwnerTransferResult["outcome"],
  formerOwner: Readonly<TeamMembership> | null,
  newOwner: Readonly<TeamMembership> | null,
): TeamOwnerTransferResult {
  return Object.freeze({
    outcome,
    formerOwner,
    newOwner,
  });
}

async function changeRoleTransaction(
  transaction: PostgresTransaction,
  command: Readonly<{
    tenantId: number;
    targetExternalUserId: UserId;
    expectedVersion: number;
    toRole: TenantRole;
    actorExternalUserId: UserId;
    occurredAt: string;
    operationKey: string;
    eventKey: string;
  }>,
): Promise<TeamMembershipMutationResult> {
  if (!(await lockTenant(transaction, command.tenantId))) {
    return singleResult("not-found", null);
  }

  const current = await lockMember(
    transaction,
    command.tenantId,
    command.targetExternalUserId,
  );

  if (current === null) {
    return singleResult("not-found", null);
  }

  if (
    current.version === command.expectedVersion + 1 &&
    current.role === command.toRole &&
    eventIntentMatches(
      await loadEvent(
        transaction,
        command.operationKey,
        command.targetExternalUserId,
      ),
      {
        ...command,
        eventType: "role-changed",
        toStatus: current.status,
        fromVersion: command.expectedVersion,
      },
    )
  ) {
    return singleResult("unchanged", current);
  }

  if (
    current.version === command.expectedVersion &&
    current.role === command.toRole
  ) {
    return singleResult("unchanged", current);
  }

  if (current.version !== command.expectedVersion) {
    return singleResult("conflict", current);
  }

  if (current.role === "owner" || command.toRole === "owner") {
    return singleResult("invalid-transition", current);
  }

  const expectedMembership = Object.freeze({
    ...current,
    role: command.toRole,
    version: command.expectedVersion + 1,
  });
  const expectedEvent: ExpectedEvent = Object.freeze({
    eventKey: command.eventKey,
    operationKey: command.operationKey,
    tenantId: command.tenantId,
    targetExternalUserId: command.targetExternalUserId,
    actorExternalUserId: command.actorExternalUserId,
    eventType: "role-changed",
    fromRole: current.role,
    toRole: command.toRole,
    fromStatus: current.status,
    toStatus: current.status,
    fromVersion: command.expectedVersion,
    toVersion: command.expectedVersion + 1,
  });
  const saved = await writeMembership(
    transaction,
    postgresTenantMembershipMutationSql.changeRole,
    [
      command.tenantId,
      command.targetExternalUserId,
      command.expectedVersion,
      current.role,
      current.status,
      command.toRole,
      command.occurredAt,
    ],
    expectedMembership,
  );

  await insertEvent(transaction, expectedEvent, command.occurredAt);

  return singleResult("updated", saved);
}

async function changeStatusTransaction(
  transaction: PostgresTransaction,
  command: Readonly<{
    tenantId: number;
    targetExternalUserId: UserId;
    expectedVersion: number;
    toStatus: TeamMembershipStatus;
    actorExternalUserId: UserId;
    occurredAt: string;
    eventType: TeamMembershipEventType;
    operationKey: string;
    eventKey: string;
  }>,
): Promise<TeamMembershipMutationResult> {
  if (!(await lockTenant(transaction, command.tenantId))) {
    return singleResult("not-found", null);
  }

  const current = await lockMember(
    transaction,
    command.tenantId,
    command.targetExternalUserId,
  );

  if (current === null) {
    return singleResult("not-found", null);
  }

  if (
    current.version === command.expectedVersion + 1 &&
    current.status === command.toStatus &&
    eventIntentMatches(
      await loadEvent(
        transaction,
        command.operationKey,
        command.targetExternalUserId,
      ),
      {
        ...command,
        toRole: current.role,
        fromVersion: command.expectedVersion,
      },
    )
  ) {
    return singleResult("unchanged", current);
  }

  if (
    current.version === command.expectedVersion &&
    current.status === command.toStatus
  ) {
    return singleResult("unchanged", current);
  }

  if (current.version !== command.expectedVersion) {
    return singleResult("conflict", current);
  }

  const expectedMembership = Object.freeze({
    ...current,
    status: command.toStatus,
    version: command.expectedVersion + 1,
  });
  const expectedEvent: ExpectedEvent = Object.freeze({
    eventKey: command.eventKey,
    operationKey: command.operationKey,
    tenantId: command.tenantId,
    targetExternalUserId: command.targetExternalUserId,
    actorExternalUserId: command.actorExternalUserId,
    eventType: command.eventType,
    fromRole: current.role,
    toRole: current.role,
    fromStatus: current.status,
    toStatus: command.toStatus,
    fromVersion: command.expectedVersion,
    toVersion: command.expectedVersion + 1,
  });
  const saved = await writeMembership(
    transaction,
    postgresTenantMembershipMutationSql.changeStatus,
    [
      command.tenantId,
      command.targetExternalUserId,
      command.expectedVersion,
      current.role,
      current.status,
      command.toStatus,
      command.occurredAt,
    ],
    expectedMembership,
  );

  await insertEvent(transaction, expectedEvent, command.occurredAt);

  return singleResult("updated", saved);
}

async function transferOwnerTransaction(
  transaction: PostgresTransaction,
  command: Readonly<{
    tenantId: number;
    formerOwnerExternalUserId: UserId;
    formerOwnerExpectedVersion: number;
    newOwnerExternalUserId: UserId;
    newOwnerExpectedVersion: number;
    formerOwnerRole: Exclude<TenantRole, "owner">;
    actorExternalUserId: UserId;
    occurredAt: string;
    operationKey: string;
    formerOwnerEventKey: string;
    newOwnerEventKey: string;
  }>,
): Promise<TeamOwnerTransferResult> {
  if (!(await lockTenant(transaction, command.tenantId))) {
    return transferResult("not-found", null, null);
  }

  const { formerOwner, newOwner } = await lockOwnerPair(
    transaction,
    command.tenantId,
    command.formerOwnerExternalUserId,
    command.newOwnerExternalUserId,
  );

  if (formerOwner === null || newOwner === null) {
    return transferResult("not-found", formerOwner, newOwner);
  }

  if (
    formerOwner.version ===
      command.formerOwnerExpectedVersion + 1 &&
    formerOwner.role === command.formerOwnerRole &&
    formerOwner.status === "active" &&
    newOwner.version === command.newOwnerExpectedVersion + 1 &&
    newOwner.role === "owner" &&
    newOwner.status === "active" &&
    eventIntentMatches(
      await loadEvent(
        transaction,
        command.operationKey,
        command.formerOwnerExternalUserId,
      ),
      {
        eventKey: command.formerOwnerEventKey,
        operationKey: command.operationKey,
        tenantId: command.tenantId,
        targetExternalUserId: command.formerOwnerExternalUserId,
        actorExternalUserId: command.actorExternalUserId,
        eventType: "owner-transfer-out",
        toRole: command.formerOwnerRole,
        toStatus: "active",
        fromVersion: command.formerOwnerExpectedVersion,
      },
    ) &&
    eventIntentMatches(
      await loadEvent(
        transaction,
        command.operationKey,
        command.newOwnerExternalUserId,
      ),
      {
        eventKey: command.newOwnerEventKey,
        operationKey: command.operationKey,
        tenantId: command.tenantId,
        targetExternalUserId: command.newOwnerExternalUserId,
        actorExternalUserId: command.actorExternalUserId,
        eventType: "owner-transfer-in",
        toRole: "owner",
        toStatus: "active",
        fromVersion: command.newOwnerExpectedVersion,
      },
    )
  ) {
    return transferResult("unchanged", formerOwner, newOwner);
  }

  if (
    formerOwner.version !== command.formerOwnerExpectedVersion ||
    newOwner.version !== command.newOwnerExpectedVersion
  ) {
    return transferResult("conflict", formerOwner, newOwner);
  }

  if (
    formerOwner.role !== "owner" ||
    formerOwner.status !== "active" ||
    newOwner.role === "owner" ||
    newOwner.status !== "active"
  ) {
    return transferResult(
      "invalid-transition",
      formerOwner,
      newOwner,
    );
  }

  const newOwnerFromRole = requireFormerOwnerRole(newOwner.role);
  const savedNewOwner = await writeMembership(
    transaction,
    postgresTenantMembershipMutationSql.changeRole,
    [
      command.tenantId,
      command.newOwnerExternalUserId,
      command.newOwnerExpectedVersion,
      newOwnerFromRole,
      "active",
      "owner",
      command.occurredAt,
    ],
    Object.freeze({
      ...newOwner,
      role: "owner" as const,
      version: command.newOwnerExpectedVersion + 1,
    }),
  );
  const newOwnerEvent: ExpectedEvent = Object.freeze({
    eventKey: command.newOwnerEventKey,
    operationKey: command.operationKey,
    tenantId: command.tenantId,
    targetExternalUserId: command.newOwnerExternalUserId,
    actorExternalUserId: command.actorExternalUserId,
    eventType: "owner-transfer-in",
    fromRole: newOwnerFromRole,
    toRole: "owner",
    fromStatus: "active",
    toStatus: "active",
    fromVersion: command.newOwnerExpectedVersion,
    toVersion: command.newOwnerExpectedVersion + 1,
  });

  await insertEvent(transaction, newOwnerEvent, command.occurredAt);

  const savedFormerOwner = await writeMembership(
    transaction,
    postgresTenantMembershipMutationSql.changeRole,
    [
      command.tenantId,
      command.formerOwnerExternalUserId,
      command.formerOwnerExpectedVersion,
      "owner",
      "active",
      command.formerOwnerRole,
      command.occurredAt,
    ],
    Object.freeze({
      ...formerOwner,
      role: command.formerOwnerRole,
      version: command.formerOwnerExpectedVersion + 1,
    }),
  );
  const formerOwnerEvent: ExpectedEvent = Object.freeze({
    eventKey: command.formerOwnerEventKey,
    operationKey: command.operationKey,
    tenantId: command.tenantId,
    targetExternalUserId: command.formerOwnerExternalUserId,
    actorExternalUserId: command.actorExternalUserId,
    eventType: "owner-transfer-out",
    fromRole: "owner",
    toRole: command.formerOwnerRole,
    fromStatus: "active",
    toStatus: "active",
    fromVersion: command.formerOwnerExpectedVersion,
    toVersion: command.formerOwnerExpectedVersion + 1,
  });

  await insertEvent(
    transaction,
    formerOwnerEvent,
    command.occurredAt,
  );

  return transferResult(
    "updated",
    savedFormerOwner,
    savedNewOwner,
  );
}

export function createPostgresTenantMembershipMutationRepository(
  dependencies: Readonly<
    PostgresTenantMembershipMutationDependencies
  >,
): TenantMembershipMutationRepository {
  if (
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.transactions?.transaction !== "function"
  ) {
    throw new Error(
      "PostgreSQL membership mutation dependencies are invalid",
    );
  }

  return Object.freeze({
    async listByTenantId(tenantIdInput: unknown) {
      const tenantId = requireTeamTenantId(tenantIdInput);
      const memberships = await loadMemberships(
        dependencies.queries,
        postgresTenantMembershipMutationSql.listByTenantId,
        [tenantId],
        maximumMemberships + 1,
      );

      if (memberships.length > maximumMemberships) {
        throw new Error(
          "PostgreSQL membership list exceeds the safe limit",
        );
      }

      if (
        memberships.some(
          (membership) => membership.tenantId !== tenantId,
        ) ||
        new Set(
          memberships.map(
            (membership) => membership.externalUserId,
          ),
        ).size !== memberships.length
      ) {
        throw new Error(
          "PostgreSQL returned invalid team membership scope",
        );
      }

      return memberships;
    },

    async changeRole(command: ChangeTeamMemberRoleCommand) {
      const tenantId = requireTeamTenantId(command.tenantId);
      const targetExternalUserId = requireTeamExternalUserId(
        command.targetExternalUserId,
      );
      const expectedVersion = requireTeamMembershipVersion(
        command.expectedVersion,
      );
      const toRole = requireTeamRole(command.toRole);
      const actorExternalUserId = requireTeamExternalUserId(
        command.actorExternalUserId,
      );
      const occurredAt = requireTeamTimestamp(command.occurredAt);
      const operationKey = await deriveTeamMembershipOperationKey({
        operation: "change-role",
        tenantId,
        targetExternalUserId,
        expectedVersion,
        toRole,
        actorExternalUserId,
      });
      const eventKey = await deriveTeamMembershipEventKey({
        operationKey,
        targetExternalUserId,
        eventType: "role-changed",
      });

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) =>
          changeRoleTransaction(transaction, {
            tenantId,
            targetExternalUserId,
            expectedVersion,
            toRole,
            actorExternalUserId,
            occurredAt,
            operationKey,
            eventKey,
          }),
      );
    },

    async changeStatus(command: ChangeTeamMemberStatusCommand) {
      const tenantId = requireTeamTenantId(command.tenantId);
      const targetExternalUserId = requireTeamExternalUserId(
        command.targetExternalUserId,
      );
      const expectedVersion = requireTeamMembershipVersion(
        command.expectedVersion,
      );
      const toStatus = requireTeamMembershipStatus(command.toStatus);
      const actorExternalUserId = requireTeamExternalUserId(
        command.actorExternalUserId,
      );
      const occurredAt = requireTeamTimestamp(command.occurredAt);
      const eventType: TeamMembershipEventType =
        toStatus === "suspended" ? "suspended" : "reactivated";
      const operationKey = await deriveTeamMembershipOperationKey({
        operation: "change-status",
        tenantId,
        targetExternalUserId,
        expectedVersion,
        toStatus,
        actorExternalUserId,
      });
      const eventKey = await deriveTeamMembershipEventKey({
        operationKey,
        targetExternalUserId,
        eventType,
      });

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) =>
          changeStatusTransaction(transaction, {
            tenantId,
            targetExternalUserId,
            expectedVersion,
            toStatus,
            actorExternalUserId,
            occurredAt,
            eventType,
            operationKey,
            eventKey,
          }),
      );
    },

    async transferOwner(command: TransferTeamOwnershipCommand) {
      const tenantId = requireTeamTenantId(command.tenantId);
      const formerOwnerExternalUserId = requireTeamExternalUserId(
        command.formerOwnerExternalUserId,
      );
      const formerOwnerExpectedVersion =
        requireTeamMembershipVersion(
          command.formerOwnerExpectedVersion,
        );
      const newOwnerExternalUserId = requireTeamExternalUserId(
        command.newOwnerExternalUserId,
      );
      const newOwnerExpectedVersion = requireTeamMembershipVersion(
        command.newOwnerExpectedVersion,
      );
      const formerOwnerRole = requireFormerOwnerRole(
        command.formerOwnerRole,
      );
      const actorExternalUserId = requireTeamExternalUserId(
        command.actorExternalUserId,
      );
      const occurredAt = requireTeamTimestamp(command.occurredAt);

      if (formerOwnerExternalUserId === newOwnerExternalUserId) {
        return transferResult("invalid-transition", null, null);
      }

      const operationKey = await deriveTeamMembershipOperationKey({
        operation: "transfer-owner",
        tenantId,
        formerOwnerExternalUserId,
        formerOwnerExpectedVersion,
        newOwnerExternalUserId,
        newOwnerExpectedVersion,
        formerOwnerRole,
        actorExternalUserId,
      });
      const formerOwnerEventKey =
        await deriveTeamMembershipEventKey({
          operationKey,
          targetExternalUserId: formerOwnerExternalUserId,
          eventType: "owner-transfer-out",
        });
      const newOwnerEventKey = await deriveTeamMembershipEventKey({
        operationKey,
        targetExternalUserId: newOwnerExternalUserId,
        eventType: "owner-transfer-in",
      });

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) =>
          transferOwnerTransaction(transaction, {
            tenantId,
            formerOwnerExternalUserId,
            formerOwnerExpectedVersion,
            newOwnerExternalUserId,
            newOwnerExpectedVersion,
            formerOwnerRole,
            actorExternalUserId,
            occurredAt,
            operationKey,
            formerOwnerEventKey,
            newOwnerEventKey,
          }),
      );
    },
  });
}
