import type {
  TeamInvitationAcceptanceRepository,
  TeamInvitationAcceptanceResult,
} from "../../db/teamInvitationAcceptanceRepository.ts";
import type {
  UserId,
} from "../../shared/domain/model.ts";
import type {
  TeamInvitation,
  TeamInvitationRole,
} from "../../shared/domain/teamInvitation.ts";
import type {
  TeamMembership,
} from "../../shared/domain/teamMembership.ts";
import {
  deriveTeamInvitationAcceptanceKey,
} from "../team/teamInvitationAcceptanceKey.ts";
import {
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationKey,
} from "../team/teamInvitationKey.ts";
import {
  requireStoredTeamInvitationActor,
} from "../team/teamInvitationActor.ts";
import {
  requireTeamInvitationAcceptanceKey,
  requireTeamInvitationDeliveryStatus,
  requireTeamInvitationEmail,
  requireTeamInvitationKey,
  requireTeamInvitationRole,
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

const invitationStateRowKeys = Object.freeze([
  "invitationKey",
  "tenantId",
  "normalizedEmail",
  "role",
  "physicalStatus",
  "version",
  "invitedByExternalUserId",
  "lastActorKind",
  "lastActorId",
  "requestedAt",
  "expiresAt",
  "updatedAt",
]);
const membershipRowKeys = Object.freeze([
  "tenantId",
  "externalUserId",
  "role",
  "status",
  "version",
]);
const acceptanceRowKeys = Object.freeze([
  "acceptanceKey",
  "tenantId",
  "invitationKey",
  "externalUserId",
  "normalizedEmail",
  "role",
  "fromVersion",
  "toVersion",
  "acceptedAt",
  "expiresAt",
  "membershipTenantId",
  "membershipExternalUserId",
  "membershipRole",
  "membershipStatus",
  "membershipVersion",
]);
const deliveryStatusRowKeys = Object.freeze(["status"]);

interface InvitationState {
  readonly invitationKey: string;
  readonly tenantId: number;
  readonly normalizedEmail: string;
  readonly role: TeamInvitationRole;
  readonly physicalStatus: "pending" | "revoked" | "expired";
  readonly version: number;
  readonly invitedByExternalUserId: UserId;
  readonly lastActor: TeamInvitation["lastActor"];
  readonly requestedAt: string;
  readonly expiresAt: string;
  readonly updatedAt: string;
}

interface AcceptanceEvidence {
  readonly acceptanceKey: string;
  readonly tenantId: number;
  readonly invitationKey: string;
  readonly externalUserId: UserId;
  readonly normalizedEmail: string;
  readonly role: TeamInvitationRole;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly acceptedAt: string;
  readonly expiresAt: string;
  readonly membership: Readonly<TeamMembership>;
}

export const postgresTeamInvitationAcceptanceSql = Object.freeze({
  lockInvitation: `
    SELECT
      invitation_key AS "invitationKey",
      tenant_id AS "tenantId",
      normalized_email AS "normalizedEmail",
      role,
      status AS "physicalStatus",
      version,
      invited_by_external_user_id AS "invitedByExternalUserId",
      last_actor_kind AS "lastActorKind",
      last_actor_external_user_id AS "lastActorId",
      requested_at AS "requestedAt",
      expires_at AS "expiresAt",
      updated_at AS "updatedAt"
    FROM team_invitations
    WHERE invitation_key = $1
    FOR UPDATE
  `,
  findAcceptance: `
    SELECT
      team_invitation_acceptances.acceptance_key AS "acceptanceKey",
      team_invitation_acceptances.tenant_id AS "tenantId",
      team_invitation_acceptances.invitation_key AS "invitationKey",
      team_invitation_acceptances.external_user_id AS "externalUserId",
      team_invitation_acceptances.normalized_email AS "normalizedEmail",
      team_invitation_acceptances.role,
      team_invitation_acceptances.from_version AS "fromVersion",
      team_invitation_acceptances.to_version AS "toVersion",
      team_invitation_acceptances.accepted_at AS "acceptedAt",
      team_invitation_acceptances.expires_at AS "expiresAt",
      tenant_memberships.tenant_id AS "membershipTenantId",
      tenant_memberships.external_user_id AS "membershipExternalUserId",
      tenant_memberships.role AS "membershipRole",
      tenant_memberships.status AS "membershipStatus",
      tenant_memberships.version AS "membershipVersion"
    FROM team_invitation_acceptances
    INNER JOIN tenant_memberships
      ON tenant_memberships.tenant_id =
        team_invitation_acceptances.tenant_id
      AND tenant_memberships.external_user_id =
        team_invitation_acceptances.external_user_id
    WHERE team_invitation_acceptances.invitation_key = $1
    LIMIT 1
  `,
  lockMembership: `
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
  lockDelivery: `
    SELECT status
    FROM team_invitation_deliveries
    WHERE delivery_key = $1
      AND tenant_id = $2
      AND invitation_key = $3
      AND invitation_version = $4
    FOR UPDATE
  `,
  cancelPendingDelivery: `
    UPDATE team_invitation_deliveries
    SET
      status = 'cancelled',
      last_error_code = 'INVITATION_ACCEPTED',
      updated_at = $5::timestamptz
    WHERE delivery_key = $1
      AND tenant_id = $2
      AND invitation_key = $3
      AND invitation_version = $4
      AND status = 'pending'
    RETURNING status
  `,
  updateInvitation: `
    UPDATE team_invitations
    SET
      version = version + 1,
      last_actor_kind = 'user',
      last_actor_external_user_id = $5,
      updated_at = $6::timestamptz
    WHERE tenant_id = $1
      AND invitation_key = $2
      AND version = $3
      AND status = 'pending'
      AND normalized_email = $4
      AND expires_at > $6::timestamptz
      AND NOT EXISTS (
        SELECT 1
        FROM team_invitation_acceptances
        WHERE invitation_key = $2
      )
    RETURNING
      invitation_key AS "invitationKey",
      tenant_id AS "tenantId",
      normalized_email AS "normalizedEmail",
      role,
      status AS "physicalStatus",
      version,
      invited_by_external_user_id AS "invitedByExternalUserId",
      last_actor_kind AS "lastActorKind",
      last_actor_external_user_id AS "lastActorId",
      requested_at AS "requestedAt",
      expires_at AS "expiresAt",
      updated_at AS "updatedAt"
  `,
  insertMembership: `
    INSERT INTO tenant_memberships (
      tenant_id,
      external_user_id,
      role,
      status,
      version,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, 'active', 1, $4::timestamptz, $4::timestamptz)
    RETURNING
      tenant_id AS "tenantId",
      external_user_id AS "externalUserId",
      role,
      status,
      version
  `,
  insertAcceptance: `
    INSERT INTO team_invitation_acceptances (
      acceptance_key,
      tenant_id,
      invitation_key,
      external_user_id,
      normalized_email,
      role,
      from_version,
      to_version,
      accepted_at,
      expires_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9::timestamptz, $10::timestamptz
    )
    RETURNING acceptance_key AS "acceptanceKey"
  `,
});

export interface PostgresTeamInvitationAcceptanceDependencies {
  readonly transactions: PostgresTransactionManager;
}

function requirePhysicalStatus(
  value: unknown,
): InvitationState["physicalStatus"] {
  if (value !== "pending" && value !== "revoked" && value !== "expired") {
    throw new Error("PostgreSQL returned an invalid physical invitation status");
  }

  return value;
}

function parseInvitationState(value: unknown): Readonly<InvitationState> {
  const row = requireExactPostgresRow(value, invitationStateRowKeys);
  const requestedAt = requireTeamTimestamp(
    parsePostgresTimestamp(row.requestedAt),
  );
  const expiresAt = requireTeamTimestamp(
    parsePostgresTimestamp(row.expiresAt),
  );
  const updatedAt = requireTeamTimestamp(
    parsePostgresTimestamp(row.updatedAt),
  );

  if (
    expiresAt <= requestedAt ||
    updatedAt < requestedAt
  ) {
    throw new Error("PostgreSQL returned an invalid invitation timeline");
  }

  return Object.freeze({
    invitationKey: requireTeamInvitationKey(row.invitationKey),
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    normalizedEmail: requireTeamInvitationEmail(row.normalizedEmail),
    role: requireTeamInvitationRole(row.role),
    physicalStatus: requirePhysicalStatus(row.physicalStatus),
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

function parseMembership(value: unknown): Readonly<TeamMembership> {
  const row = requireExactPostgresRow(value, membershipRowKeys);

  if (row.status !== "active" && row.status !== "suspended") {
    throw new Error("PostgreSQL returned an invalid membership state");
  }

  return Object.freeze({
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    externalUserId: requireTeamExternalUserId(row.externalUserId),
    role: requireTeamInvitationRole(row.role),
    status: row.status,
    version: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.version),
    ),
  });
}

function parseAcceptance(value: unknown): Readonly<AcceptanceEvidence> {
  const row = requireExactPostgresRow(value, acceptanceRowKeys);
  const membership = parseMembership({
    tenantId: row.membershipTenantId,
    externalUserId: row.membershipExternalUserId,
    role: row.membershipRole,
    status: row.membershipStatus,
    version: row.membershipVersion,
  });

  return Object.freeze({
    acceptanceKey: requireTeamInvitationAcceptanceKey(row.acceptanceKey),
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    invitationKey: requireTeamInvitationKey(row.invitationKey),
    externalUserId: requireTeamExternalUserId(row.externalUserId),
    normalizedEmail: requireTeamInvitationEmail(row.normalizedEmail),
    role: requireTeamInvitationRole(row.role),
    fromVersion: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.fromVersion),
    ),
    toVersion: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.toVersion),
    ),
    acceptedAt: requireTeamTimestamp(
      parsePostgresTimestamp(row.acceptedAt),
    ),
    expiresAt: requireTeamTimestamp(
      parsePostgresTimestamp(row.expiresAt),
    ),
    membership,
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

function invitationView(
  state: Readonly<InvitationState>,
  accepted: boolean,
): Readonly<TeamInvitation> {
  return Object.freeze({
    invitationKey: state.invitationKey,
    tenantId: state.tenantId,
    normalizedEmail: state.normalizedEmail,
    role: state.role,
    status: accepted ? "accepted" : state.physicalStatus,
    version: state.version,
    invitedByExternalUserId: state.invitedByExternalUserId,
    lastActor: state.lastActor,
    requestedAt: state.requestedAt,
    expiresAt: state.expiresAt,
    updatedAt: state.updatedAt,
  });
}

function result(
  outcome: TeamInvitationAcceptanceResult["outcome"],
  invitation: Readonly<TeamInvitation> | null,
  membership: Readonly<TeamMembership> | null,
): TeamInvitationAcceptanceResult {
  return Object.freeze({ outcome, invitation, membership });
}

function exactAcceptance(
  acceptance: Readonly<AcceptanceEvidence>,
  state: Readonly<InvitationState>,
  acceptanceKey: string,
  externalUserId: UserId,
  verifiedEmail: string,
): boolean {
  return (
    acceptance.acceptanceKey === acceptanceKey &&
    acceptance.tenantId === state.tenantId &&
    acceptance.invitationKey === state.invitationKey &&
    acceptance.externalUserId === externalUserId &&
    acceptance.normalizedEmail === verifiedEmail &&
    acceptance.role === state.role &&
    acceptance.toVersion === state.version &&
    acceptance.expiresAt === state.expiresAt &&
    acceptance.membership.tenantId === state.tenantId &&
    acceptance.membership.externalUserId === externalUserId &&
    acceptance.membership.role === state.role &&
    acceptance.membership.status === "active" &&
    acceptance.membership.version === 1
  );
}

async function acceptTransaction(
  transaction: PostgresTransaction,
  input: Readonly<{
    invitationKey: string;
    externalUserId: UserId;
    verifiedEmail: string;
    acceptedAt: string;
  }>,
): Promise<TeamInvitationAcceptanceResult> {
  const current = await loadOne(
    transaction,
    postgresTeamInvitationAcceptanceSql.lockInvitation,
    [input.invitationKey],
    parseInvitationState,
  );

  if (current === null) {
    return result("not-found", null, null);
  }

  if (
    await deriveTeamInvitationKey({
      tenantId: current.tenantId,
      email: current.normalizedEmail,
    }) !== input.invitationKey
  ) {
    throw new Error("PostgreSQL returned invalid invitation acceptance scope");
  }

  const acceptance = await loadOne(
    transaction,
    postgresTeamInvitationAcceptanceSql.findAcceptance,
    [input.invitationKey],
    parseAcceptance,
  );

  if (current.normalizedEmail !== input.verifiedEmail) {
    return result(
      "email-mismatch",
      invitationView(current, acceptance !== null),
      null,
    );
  }

  const acceptanceKey = await deriveTeamInvitationAcceptanceKey({
    tenantId: current.tenantId,
    invitationKey: current.invitationKey,
    expectedVersion: acceptance?.fromVersion ?? current.version,
    externalUserId: input.externalUserId,
    verifiedEmail: input.verifiedEmail,
  });

  if (acceptance !== null) {
    const exact = exactAcceptance(
      acceptance,
      current,
      acceptanceKey,
      input.externalUserId,
      input.verifiedEmail,
    );

    return result(
      exact ? "unchanged" : "conflict",
      invitationView(current, true),
      exact ? acceptance.membership : null,
    );
  }

  if (
    current.physicalStatus !== "pending" ||
    current.expiresAt <= input.acceptedAt
  ) {
    return result("invalid-transition", invitationView(current, false), null);
  }

  const membership = await loadOne(
    transaction,
    postgresTeamInvitationAcceptanceSql.lockMembership,
    [current.tenantId, input.externalUserId],
    parseMembership,
  );

  if (membership !== null) {
    return result("conflict", invitationView(current, false), null);
  }

  const deliveryKey = await deriveTeamInvitationDeliveryKey({
    tenantId: current.tenantId,
    invitationKey: current.invitationKey,
    invitationVersion: current.version,
  });
  const deliveryRow = await loadOne(
    transaction,
    postgresTeamInvitationAcceptanceSql.lockDelivery,
    [deliveryKey, current.tenantId, current.invitationKey, current.version],
    (value) => requireExactPostgresRow(value, deliveryStatusRowKeys),
  );

  if (deliveryRow === null) {
    throw new Error("team invitation acceptance delivery is missing");
  }

  const deliveryStatus = requireTeamInvitationDeliveryStatus(
    deliveryRow.status,
  );

  if (
    deliveryStatus === "sending" ||
    deliveryStatus === "submitted" ||
    deliveryStatus === "ambiguous"
  ) {
    return result("invalid-transition", invitationView(current, false), null);
  }

  if (deliveryStatus === "pending") {
    const cancelled = await loadOne(
      transaction,
      postgresTeamInvitationAcceptanceSql.cancelPendingDelivery,
      [
        deliveryKey,
        current.tenantId,
        current.invitationKey,
        current.version,
        input.acceptedAt,
      ],
      (value) => requireExactPostgresRow(value, deliveryStatusRowKeys),
    );

    if (cancelled?.status !== "cancelled") {
      throw new Error("PostgreSQL failed to cancel accepted invitation delivery");
    }
  }

  const updated = await loadOne(
    transaction,
    postgresTeamInvitationAcceptanceSql.updateInvitation,
    [
      current.tenantId,
      current.invitationKey,
      current.version,
      input.verifiedEmail,
      input.externalUserId,
      input.acceptedAt,
    ],
    parseInvitationState,
  );

  if (
    updated === null ||
    updated.version !== current.version + 1 ||
    updated.physicalStatus !== "pending" ||
    updated.lastActor.kind !== "user" ||
    updated.lastActor.id !== input.externalUserId ||
    updated.updatedAt !== input.acceptedAt
  ) {
    throw new Error("PostgreSQL returned a mismatched accepted invitation");
  }

  const savedMembership = await loadOne(
    transaction,
    postgresTeamInvitationAcceptanceSql.insertMembership,
    [current.tenantId, input.externalUserId, current.role, input.acceptedAt],
    parseMembership,
  );

  if (
    savedMembership === null ||
    savedMembership.tenantId !== current.tenantId ||
    savedMembership.externalUserId !== input.externalUserId ||
    savedMembership.role !== current.role ||
    savedMembership.status !== "active" ||
    savedMembership.version !== 1
  ) {
    throw new Error("PostgreSQL returned a mismatched accepted membership");
  }

  const acceptanceIdentity = await loadOne(
    transaction,
    postgresTeamInvitationAcceptanceSql.insertAcceptance,
    [
      acceptanceKey,
      current.tenantId,
      current.invitationKey,
      input.externalUserId,
      input.verifiedEmail,
      current.role,
      current.version,
      updated.version,
      input.acceptedAt,
      current.expiresAt,
    ],
    (value) => {
      const row = requireExactPostgresRow(value, ["acceptanceKey"]);
      return requireTeamInvitationAcceptanceKey(row.acceptanceKey);
    },
  );

  if (acceptanceIdentity !== acceptanceKey) {
    throw new Error("PostgreSQL returned a mismatched acceptance identity");
  }

  return result("created", invitationView(updated, true), savedMembership);
}

export function createPostgresTeamInvitationAcceptanceRepository(
  dependencies: Readonly<PostgresTeamInvitationAcceptanceDependencies>,
): TeamInvitationAcceptanceRepository {
  if (typeof dependencies.transactions?.transaction !== "function") {
    throw new Error("PostgreSQL invitation acceptance dependencies are invalid");
  }

  return Object.freeze({
    async accept(input: {
      invitationKey: unknown;
      externalUserId: unknown;
      verifiedEmail: unknown;
      acceptedAt: unknown;
    }) {
      const invitationKey = requireTeamInvitationKey(input.invitationKey);
      const externalUserId = requireTeamExternalUserId(input.externalUserId);
      const verifiedEmail = requireTeamInvitationEmail(input.verifiedEmail);
      const acceptedAt = requireTeamTimestamp(input.acceptedAt);

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => acceptTransaction(transaction, {
          invitationKey,
          externalUserId,
          verifiedEmail,
          acceptedAt,
        }),
      );
    },
  });
}
