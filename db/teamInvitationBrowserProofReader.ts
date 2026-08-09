import {
  requireTeamInvitationKey,
} from "../server/team/teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
} from "../server/team/teamMembershipValidation.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const maximumMembershipCount = 10_000;

const tenantTotalProofSql = `
  WITH target_invitation AS (
    SELECT tenant_id, invitation_key
    FROM team_invitations
    WHERE invitation_key = ?1
    LIMIT 1
  )
  SELECT
    (
      SELECT COUNT(*)
      FROM target_invitation
    ) AS invitationCount,
    (
      SELECT COUNT(*)
      FROM tenant_memberships
      INNER JOIN target_invitation
        ON target_invitation.tenant_id =
          tenant_memberships.tenant_id
    ) AS membershipCount,
    (
      SELECT COUNT(*)
      FROM tenant_memberships
      INNER JOIN target_invitation
        ON target_invitation.tenant_id =
          tenant_memberships.tenant_id
      WHERE tenant_memberships.status = 'active'
    ) AS activeMembershipCount,
    (
      SELECT COUNT(*)
      FROM team_invitation_acceptances
      INNER JOIN target_invitation
        ON target_invitation.tenant_id =
          team_invitation_acceptances.tenant_id
        AND target_invitation.invitation_key =
          team_invitation_acceptances.invitation_key
    ) AS acceptanceAuditCount
`;

const externalUserProofSql = `
  WITH target_invitation AS (
    SELECT tenant_id, invitation_key
    FROM team_invitations
    WHERE invitation_key = ?1
    LIMIT 1
  )
  SELECT
    (
      SELECT COUNT(*)
      FROM target_invitation
    ) AS invitationCount,
    (
      SELECT COUNT(*)
      FROM tenant_memberships
      INNER JOIN target_invitation
        ON target_invitation.tenant_id =
          tenant_memberships.tenant_id
      WHERE tenant_memberships.external_user_id = ?2
    ) AS membershipCount,
    (
      SELECT COUNT(*)
      FROM tenant_memberships
      INNER JOIN target_invitation
        ON target_invitation.tenant_id =
          tenant_memberships.tenant_id
      WHERE tenant_memberships.external_user_id = ?2
        AND tenant_memberships.status = 'active'
    ) AS activeMembershipCount,
    (
      SELECT COUNT(*)
      FROM team_invitation_acceptances
      INNER JOIN target_invitation
        ON target_invitation.tenant_id =
          team_invitation_acceptances.tenant_id
        AND target_invitation.invitation_key =
          team_invitation_acceptances.invitation_key
      WHERE team_invitation_acceptances.external_user_id = ?2
    ) AS acceptanceAuditCount
`;

export interface TeamInvitationBrowserProofRow {
  invitationCount: unknown;
  membershipCount: unknown;
  activeMembershipCount: unknown;
  acceptanceAuditCount: unknown;
}

export interface TeamInvitationBrowserProofQuery {
  sql: string;
  params: readonly string[];
}

export interface TeamInvitationBrowserDatabaseProof {
  invitationCount: number;
  membershipCount: number;
  activeMembershipCount: number;
  acceptanceAuditCount: number;
}

export type TeamInvitationBrowserProofReaderErrorCode =
  | "INVALID_INPUT"
  | "PERSISTENCE_UNAVAILABLE"
  | "PERSISTENCE_INVALID";

export class TeamInvitationBrowserProofReaderError
  extends Error {
  readonly code:
    TeamInvitationBrowserProofReaderErrorCode;

  constructor(
    code:
      TeamInvitationBrowserProofReaderErrorCode,
  ) {
    super(code);
    this.name =
      "TeamInvitationBrowserProofReaderError";
    this.code = code;
  }
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) =>
        key === expected[index],
    )
  );
}

function parseInput(value: unknown): {
  invitationKey: string;
  scope:
    | {
        kind: "tenant-total";
      }
    | {
        kind: "external-user";
        externalUserId: string;
      };
} {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "invitationKey",
      "scope",
    ]) ||
    !isPlainObject(value.scope)
  ) {
    throw new TeamInvitationBrowserProofReaderError(
      "INVALID_INPUT",
    );
  }

  let invitationKey: string;

  try {
    invitationKey =
      requireTeamInvitationKey(
        value.invitationKey,
      );
  } catch {
    throw new TeamInvitationBrowserProofReaderError(
      "INVALID_INPUT",
    );
  }

  if (
    hasExactKeys(value.scope, [
      "kind",
    ]) &&
    value.scope.kind === "tenant-total"
  ) {
    return {
      invitationKey,
      scope: {
        kind: "tenant-total",
      },
    };
  }

  if (
    !hasExactKeys(value.scope, [
      "kind",
      "externalUserId",
    ]) ||
    value.scope.kind !== "external-user"
  ) {
    throw new TeamInvitationBrowserProofReaderError(
      "INVALID_INPUT",
    );
  }

  try {
    return {
      invitationKey,
      scope: {
        kind: "external-user",
        externalUserId:
          requireTeamExternalUserId(
            value.scope.externalUserId,
          ),
      },
    };
  } catch {
    throw new TeamInvitationBrowserProofReaderError(
      "INVALID_INPUT",
    );
  }
}

function requireCount(
  value: unknown,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new TeamInvitationBrowserProofReaderError(
      "PERSISTENCE_INVALID",
    );
  }

  return value;
}

export function parseTeamInvitationBrowserProofRow(
  value: unknown,
): TeamInvitationBrowserDatabaseProof {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "invitationCount",
      "membershipCount",
      "activeMembershipCount",
      "acceptanceAuditCount",
    ])
  ) {
    throw new TeamInvitationBrowserProofReaderError(
      "PERSISTENCE_INVALID",
    );
  }

  const proof = {
    invitationCount:
      requireCount(
        value.invitationCount,
        1,
      ),
    membershipCount:
      requireCount(
        value.membershipCount,
        maximumMembershipCount,
      ),
    activeMembershipCount:
      requireCount(
        value.activeMembershipCount,
        maximumMembershipCount,
      ),
    acceptanceAuditCount:
      requireCount(
        value.acceptanceAuditCount,
        1,
      ),
  };

  if (
    proof.activeMembershipCount >
    proof.membershipCount
  ) {
    throw new TeamInvitationBrowserProofReaderError(
      "PERSISTENCE_INVALID",
    );
  }

  return Object.freeze(proof);
}

export function buildTeamInvitationBrowserProofQuery(
  input: unknown,
): TeamInvitationBrowserProofQuery {
  const parsed = parseInput(input);

  return Object.freeze(
    parsed.scope.kind === "tenant-total"
      ? {
          sql: tenantTotalProofSql,
          params: Object.freeze([
            parsed.invitationKey,
          ]),
        }
      : {
          sql: externalUserProofSql,
          params: Object.freeze([
            parsed.invitationKey,
            parsed.scope.externalUserId,
          ]),
        },
  );
}

export function createTeamInvitationBrowserProofReader(
  database: D1DatabaseBinding,
) {
  return {
    async read(
      input: unknown,
    ): Promise<TeamInvitationBrowserDatabaseProof> {
      const query =
        buildTeamInvitationBrowserProofQuery(
          input,
        );

      try {
        const statement = database
          .prepare(query.sql)
          .bind(...query.params);
        const row =
          await statement.first<TeamInvitationBrowserProofRow>();

        return parseTeamInvitationBrowserProofRow(
          row,
        );
      } catch (error) {
        if (
          error instanceof
          TeamInvitationBrowserProofReaderError
        ) {
          throw error;
        }

        throw new TeamInvitationBrowserProofReaderError(
          "PERSISTENCE_UNAVAILABLE",
        );
      }
    },
  };
}
