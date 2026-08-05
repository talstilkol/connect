import type {
  TeamInvitation,
  TeamInvitationRole,
} from "../shared/domain/teamInvitation.ts";
import type {
  TeamMembership,
} from "../shared/domain/teamMembership.ts";
import {
  deriveTeamInvitationAcceptanceKey,
} from "../server/team/teamInvitationAcceptanceKey.ts";
import {
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationKey,
} from "../server/team/teamInvitationKey.ts";
import {
  requireTeamInvitationAcceptanceKey,
  requireTeamInvitationEmail,
  requireTeamInvitationKey,
  requireTeamInvitationRole,
} from "../server/team/teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
  requireTeamMembershipVersion,
  requireTeamTenantId,
  requireTeamTimestamp,
} from "../server/team/teamMembershipValidation.ts";
import type {
  D1DatabaseBinding,
  D1PreparedStatement,
  D1Result,
} from "./d1.ts";
import {
  createTeamInvitationRepository,
} from "./teamInvitationRepository.ts";

const findStateSql = `
  SELECT
    team_invitations.tenant_id AS tenantId,
    team_invitations.invitation_key AS invitationKey,
    team_invitations.normalized_email AS normalizedEmail,
    team_invitations.role,
    team_invitations.status AS physicalStatus,
    team_invitations.version,
    team_invitations.expires_at AS expiresAt,
    team_invitation_acceptances.acceptance_key AS acceptanceKey,
    team_invitation_acceptances.external_user_id AS acceptedExternalUserId,
    team_invitation_acceptances.normalized_email AS acceptedEmail,
    team_invitation_acceptances.role AS acceptedRole,
    team_invitation_acceptances.from_version AS acceptanceFromVersion,
    team_invitation_acceptances.to_version AS acceptanceToVersion,
    team_invitation_acceptances.accepted_at AS acceptedAt,
    tenant_memberships.tenant_id AS membershipTenantId,
    tenant_memberships.external_user_id AS membershipExternalUserId,
    tenant_memberships.role AS membershipRole,
    tenant_memberships.status AS membershipStatus,
    tenant_memberships.version AS membershipVersion
  FROM team_invitations
  LEFT JOIN team_invitation_acceptances
    ON team_invitation_acceptances.tenant_id =
      team_invitations.tenant_id
    AND team_invitation_acceptances.invitation_key =
      team_invitations.invitation_key
  LEFT JOIN tenant_memberships
    ON tenant_memberships.tenant_id =
      team_invitation_acceptances.tenant_id
    AND tenant_memberships.external_user_id =
      team_invitation_acceptances.external_user_id
  WHERE team_invitations.invitation_key = ?1
  LIMIT 1
`;

const findMembershipSql = `
  SELECT
    tenant_id AS tenantId,
    external_user_id AS externalUserId,
    role,
    status,
    version
  FROM tenant_memberships
  WHERE tenant_id = ?1
    AND external_user_id = ?2
  LIMIT 1
`;

const findDeliveryStatusSql = `
  SELECT
    status
  FROM team_invitation_deliveries
  WHERE delivery_key = ?1
    AND tenant_id = ?2
    AND invitation_key = ?3
    AND invitation_version = ?4
  LIMIT 1
`;

const cancelDeliverySql = `
  UPDATE team_invitation_deliveries
  SET
    status = 'cancelled',
    last_error_code =
      'INVITATION_ACCEPTED',
    updated_at = ?5
  WHERE delivery_key = ?1
    AND tenant_id = ?2
    AND invitation_key = ?3
    AND invitation_version = ?4
    AND status = 'pending'
`;

const updateInvitationSql = `
  UPDATE team_invitations
  SET
    version = version + 1,
    last_actor_kind = 'user',
    last_actor_external_user_id = ?5,
    updated_at = ?6
  WHERE tenant_id = ?1
    AND invitation_key = ?2
    AND version = ?3
    AND status = 'pending'
    AND normalized_email = ?4
    AND expires_at > ?6
    AND NOT EXISTS (
      SELECT 1
      FROM team_invitation_acceptances
      WHERE invitation_key = ?2
    )
`;

const insertMembershipSql = `
  INSERT INTO tenant_memberships (
    tenant_id,
    external_user_id,
    role,
    status,
    version,
    created_at,
    updated_at
  )
  SELECT
    tenant_id,
    ?3,
    role,
    'active',
    1,
    ?5,
    ?5
  FROM team_invitations
  WHERE tenant_id = ?1
    AND invitation_key = ?2
    AND version = ?4
    AND status = 'pending'
    AND last_actor_kind = 'user'
    AND last_actor_external_user_id = ?3
    AND updated_at = ?5
    AND NOT EXISTS (
      SELECT 1
      FROM team_invitation_acceptances
      WHERE invitation_key = ?2
    )
`;

const insertAcceptanceSql = `
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
  SELECT
    ?1,
    team_invitations.tenant_id,
    team_invitations.invitation_key,
    ?4,
    team_invitations.normalized_email,
    team_invitations.role,
    ?5,
    ?6,
    ?7,
    team_invitations.expires_at
  FROM team_invitations
  INNER JOIN tenant_memberships
    ON tenant_memberships.tenant_id =
      team_invitations.tenant_id
    AND tenant_memberships.external_user_id =
      ?4
  WHERE team_invitations.tenant_id = ?2
    AND team_invitations.invitation_key = ?3
    AND team_invitations.version = ?6
    AND team_invitations.status = 'pending'
    AND team_invitations.last_actor_kind = 'user'
    AND team_invitations.last_actor_external_user_id =
      ?4
    AND team_invitations.updated_at = ?7
    AND tenant_memberships.role =
      team_invitations.role
    AND tenant_memberships.status =
      'active'
    AND tenant_memberships.version = 1
`;

interface AcceptanceStateRow {
  tenantId: unknown;
  invitationKey: unknown;
  normalizedEmail: unknown;
  role: unknown;
  physicalStatus: unknown;
  version: unknown;
  expiresAt: unknown;
  acceptanceKey: unknown;
  acceptedExternalUserId: unknown;
  acceptedEmail: unknown;
  acceptedRole: unknown;
  acceptanceFromVersion: unknown;
  acceptanceToVersion: unknown;
  acceptedAt: unknown;
  membershipTenantId: unknown;
  membershipExternalUserId: unknown;
  membershipRole: unknown;
  membershipStatus: unknown;
  membershipVersion: unknown;
}

interface DeliveryStatusRow {
  status: unknown;
}

interface AcceptanceState {
  tenantId: number;
  invitationKey: string;
  normalizedEmail: string;
  role: TeamInvitationRole;
  physicalStatus:
    "pending" | "revoked" | "expired";
  version: number;
  expiresAt: string;
  acceptance:
    | {
        acceptanceKey: string;
        externalUserId: string;
        normalizedEmail: string;
        role: TeamInvitationRole;
        fromVersion: number;
        toVersion: number;
        acceptedAt: string;
        membership:
          TeamMembership;
      }
    | null;
}

export type TeamInvitationAcceptanceOutcome =
  | "created"
  | "unchanged"
  | "not-found"
  | "email-mismatch"
  | "invalid-transition"
  | "conflict";

export interface TeamInvitationAcceptanceResult {
  outcome:
    TeamInvitationAcceptanceOutcome;
  invitation:
    TeamInvitation | null;
  membership:
    TeamMembership | null;
}

export interface TeamInvitationAcceptanceRepository {
  accept(input: {
    invitationKey: unknown;
    externalUserId: unknown;
    verifiedEmail: unknown;
    acceptedAt: unknown;
  }): Promise<TeamInvitationAcceptanceResult>;
}

function parsePhysicalStatus(
  value: unknown,
): AcceptanceState["physicalStatus"] {
  if (
    value !== "pending" &&
    value !== "revoked" &&
    value !== "expired"
  ) {
    throw new Error(
      "D1 returned an invalid physical invitation status",
    );
  }

  return value;
}

function parseMembership(
  row: AcceptanceStateRow,
): TeamMembership | null {
  const values = [
    row.membershipTenantId,
    row.membershipExternalUserId,
    row.membershipRole,
    row.membershipStatus,
    row.membershipVersion,
  ];

  if (
    values.every(
      (value) => value === null,
    )
  ) {
    return null;
  }

  if (
    row.membershipStatus !==
      "active" &&
    row.membershipStatus !==
      "suspended"
  ) {
    throw new Error(
      "D1 returned an invalid accepted membership",
    );
  }

  return {
    tenantId:
      requireTeamTenantId(
        row.membershipTenantId,
      ),
    externalUserId:
      requireTeamExternalUserId(
        row.membershipExternalUserId,
      ),
    role:
      requireTeamInvitationRole(
        row.membershipRole,
      ),
    status:
      row.membershipStatus,
    version:
      requireTeamMembershipVersion(
        row.membershipVersion,
      ),
  };
}

function parseState(
  row: AcceptanceStateRow,
): AcceptanceState {
  const state: AcceptanceState = {
    tenantId:
      requireTeamTenantId(
        row.tenantId,
      ),
    invitationKey:
      requireTeamInvitationKey(
        row.invitationKey,
      ),
    normalizedEmail:
      requireTeamInvitationEmail(
        row.normalizedEmail,
      ),
    role:
      requireTeamInvitationRole(
        row.role,
      ),
    physicalStatus:
      parsePhysicalStatus(
        row.physicalStatus,
      ),
    version:
      requireTeamMembershipVersion(
        row.version,
      ),
    expiresAt:
      requireTeamTimestamp(
        row.expiresAt,
      ),
    acceptance: null,
  };

  if (row.acceptanceKey === null) {
    if (
      [
        row.acceptedExternalUserId,
        row.acceptedEmail,
        row.acceptedRole,
        row.acceptanceFromVersion,
        row.acceptanceToVersion,
        row.acceptedAt,
      ].some(
        (value) => value !== null,
      ) ||
      parseMembership(row) !==
        null
    ) {
      throw new Error(
        "D1 returned an incomplete invitation acceptance",
      );
    }

    return state;
  }

  const membership =
    parseMembership(row);

  if (membership === null) {
    throw new Error(
      "D1 returned an acceptance without membership",
    );
  }

  state.acceptance = {
    acceptanceKey:
      requireTeamInvitationAcceptanceKey(
        row.acceptanceKey,
      ),
    externalUserId:
      requireTeamExternalUserId(
        row.acceptedExternalUserId,
      ),
    normalizedEmail:
      requireTeamInvitationEmail(
        row.acceptedEmail,
      ),
    role:
      requireTeamInvitationRole(
        row.acceptedRole,
      ),
    fromVersion:
      requireTeamMembershipVersion(
        row.acceptanceFromVersion,
      ),
    toVersion:
      requireTeamMembershipVersion(
        row.acceptanceToVersion,
      ),
    acceptedAt:
      requireTeamTimestamp(
        row.acceptedAt,
      ),
    membership,
  };

  return state;
}

function parseStandaloneMembership(
  row: Record<
    string,
    unknown
  > | null,
): TeamMembership | null {
  if (row === null) {
    return null;
  }

  if (
    row.status !== "active" &&
    row.status !== "suspended"
  ) {
    throw new Error(
      "D1 returned an invalid membership state",
    );
  }

  return {
    tenantId:
      requireTeamTenantId(
        row.tenantId,
      ),
    externalUserId:
      requireTeamExternalUserId(
        row.externalUserId,
      ),
    role:
      requireTeamInvitationRole(
        row.role,
      ),
    status: row.status,
    version:
      requireTeamMembershipVersion(
        row.version,
      ),
  };
}

function batchSucceeded(
  results:
    readonly D1Result[],
  expectedLength: number,
): boolean {
  return (
    results.length ===
      expectedLength &&
    results.every(
      (result) =>
        result.success &&
        result.meta?.changes === 1,
    )
  );
}

export function createTeamInvitationAcceptanceRepository(
  database: D1DatabaseBinding,
): TeamInvitationAcceptanceRepository {
  const invitationRepository =
    createTeamInvitationRepository(
      database,
    );

  async function findState(
    invitationKey: string,
  ): Promise<AcceptanceState | null> {
    const row = await database
      .prepare(findStateSql)
      .bind(invitationKey)
      .first<AcceptanceStateRow>();

    if (row === null) {
      return null;
    }

    const state = parseState(row);

    if (
      state.invitationKey !==
        invitationKey ||
      await deriveTeamInvitationKey({
        tenantId:
          state.tenantId,
        email:
          state.normalizedEmail,
      }) !== invitationKey
    ) {
      throw new Error(
        "D1 returned invalid invitation acceptance scope",
      );
    }

    return state;
  }

  async function findMembership(
    tenantId: number,
    externalUserId: string,
  ): Promise<TeamMembership | null> {
    const row = await database
      .prepare(findMembershipSql)
      .bind(
        tenantId,
        externalUserId,
      )
      .first<
        Record<string, unknown>
      >();

    return parseStandaloneMembership(
      row,
    );
  }

  async function executeBatch(
    statements:
      readonly D1PreparedStatement[],
  ): Promise<boolean> {
    try {
      return batchSucceeded(
        await database.batch(
          statements,
        ),
        statements.length,
      );
    } catch {
      return false;
    }
  }

  return {
    async accept(input) {
      const invitationKey =
        requireTeamInvitationKey(
          input.invitationKey,
        );
      const externalUserId =
        requireTeamExternalUserId(
          input.externalUserId,
        );
      const verifiedEmail =
        requireTeamInvitationEmail(
          input.verifiedEmail,
        );
      const acceptedAt =
        requireTeamTimestamp(
          input.acceptedAt,
        );
      const current =
        await findState(
          invitationKey,
        );

      if (current === null) {
        return {
          outcome: "not-found",
          invitation: null,
          membership: null,
        };
      }

      if (
        current.normalizedEmail !==
        verifiedEmail
      ) {
        return {
          outcome:
            "email-mismatch",
          invitation:
            await invitationRepository.find(
              current.tenantId,
              invitationKey,
            ),
          membership: null,
        };
      }

      const acceptanceKey =
        await deriveTeamInvitationAcceptanceKey(
          {
            tenantId:
              current.tenantId,
            invitationKey,
            expectedVersion:
              current.acceptance
                ?.fromVersion ??
              current.version,
            externalUserId,
            verifiedEmail,
          },
        );

      if (
        current.acceptance !== null
      ) {
        const exact =
          current.acceptance
            .acceptanceKey ===
            acceptanceKey &&
          current.acceptance
            .externalUserId ===
            externalUserId &&
          current.acceptance
            .normalizedEmail ===
            verifiedEmail &&
          current.acceptance.role ===
            current.role &&
          current.acceptance
            .toVersion ===
            current.version &&
          current.acceptance
            .membership.tenantId ===
            current.tenantId &&
          current.acceptance
            .membership
            .externalUserId ===
            externalUserId &&
          current.acceptance
            .membership.role ===
            current.role &&
          current.acceptance
            .membership.status ===
            "active" &&
          current.acceptance
            .membership.version === 1;

        return {
          outcome: exact
            ? "unchanged"
            : "conflict",
          invitation:
            await invitationRepository.find(
              current.tenantId,
              invitationKey,
            ),
          membership: exact
            ? current.acceptance
                .membership
            : null,
        };
      }

      if (
        current.physicalStatus !==
          "pending" ||
        current.expiresAt <=
          acceptedAt
      ) {
        return {
          outcome:
            "invalid-transition",
          invitation:
            await invitationRepository.find(
              current.tenantId,
              invitationKey,
            ),
          membership: null,
        };
      }

      if (
        await findMembership(
          current.tenantId,
          externalUserId,
        ) !== null
      ) {
        return {
          outcome: "conflict",
          invitation:
            await invitationRepository.find(
              current.tenantId,
              invitationKey,
            ),
          membership: null,
        };
      }

      const deliveryKey =
        await deriveTeamInvitationDeliveryKey(
          {
            tenantId:
              current.tenantId,
            invitationKey,
            invitationVersion:
              current.version,
          },
        );
      const delivery =
        await database
          .prepare(
            findDeliveryStatusSql,
          )
          .bind(
            deliveryKey,
            current.tenantId,
            invitationKey,
            current.version,
          )
          .first<DeliveryStatusRow>();

      if (
        delivery === null ||
        typeof delivery.status !==
          "string"
      ) {
        throw new Error(
          "team invitation acceptance delivery is missing",
        );
      }

      if (
        delivery.status ===
        "sending"
      ) {
        return {
          outcome:
            "invalid-transition",
          invitation:
            await invitationRepository.find(
              current.tenantId,
              invitationKey,
            ),
          membership: null,
        };
      }

      const toVersion =
        current.version + 1;
      const statements = [
        ...(delivery.status ===
        "pending"
          ? [
              database
                .prepare(
                  cancelDeliverySql,
                )
                .bind(
                  deliveryKey,
                  current.tenantId,
                  invitationKey,
                  current.version,
                  acceptedAt,
                ),
            ]
          : []),
        database
          .prepare(
            updateInvitationSql,
          )
          .bind(
            current.tenantId,
            invitationKey,
            current.version,
            verifiedEmail,
            externalUserId,
            acceptedAt,
          ),
        database
          .prepare(
            insertMembershipSql,
          )
          .bind(
            current.tenantId,
            invitationKey,
            externalUserId,
            toVersion,
            acceptedAt,
          ),
        database
          .prepare(
            insertAcceptanceSql,
          )
          .bind(
            acceptanceKey,
            current.tenantId,
            invitationKey,
            externalUserId,
            current.version,
            toVersion,
            acceptedAt,
          ),
      ];
      const succeeded =
        await executeBatch(
          statements,
        );
      const after =
        await findState(
          invitationKey,
        );

      if (
        after?.acceptance !== null &&
        after?.acceptance !==
          undefined &&
        after.acceptance
          .acceptanceKey ===
          acceptanceKey &&
        after.acceptance
          .externalUserId ===
          externalUserId &&
        after.acceptance
          .normalizedEmail ===
          verifiedEmail &&
        after.version ===
          toVersion
      ) {
        return {
          outcome: succeeded
            ? "created"
            : "unchanged",
          invitation:
            await invitationRepository.find(
              after.tenantId,
              invitationKey,
            ),
          membership:
            after.acceptance
              .membership,
        };
      }

      if (
        after !== null &&
        (
          after.acceptance !==
            null ||
          after.version !==
            current.version ||
          await findMembership(
            current.tenantId,
            externalUserId,
          ) !== null
        )
      ) {
        return {
          outcome: "conflict",
          invitation:
            await invitationRepository.find(
              after.tenantId,
              invitationKey,
            ),
          membership: null,
        };
      }

      const deliveryAfter =
        await database
          .prepare(
            findDeliveryStatusSql,
          )
          .bind(
            deliveryKey,
            current.tenantId,
            invitationKey,
            current.version,
          )
          .first<DeliveryStatusRow>();

      if (
        deliveryAfter?.status ===
        "sending"
      ) {
        return {
          outcome:
            "invalid-transition",
          invitation:
            await invitationRepository.find(
              current.tenantId,
              invitationKey,
            ),
          membership: null,
        };
      }

      throw new Error(
        "team invitation acceptance persistence failed",
      );
    },
  };
}
