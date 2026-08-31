import type {
  DueTeamInvitation,
  TeamInvitationExpirationPage,
  TeamInvitationExpirationRepository,
} from "../../db/teamInvitationExpirationRepository.ts";
import {
  requireTeamInvitationExpirationCursor,
} from "../../db/teamInvitationExpirationRepository.ts";
import {
  requireTeamInvitationKey,
} from "../team/teamInvitationValidation.ts";
import {
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
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const maximumPageSize = 50;
const dueInvitationRowKeys = Object.freeze([
  "tenantId",
  "invitationKey",
  "expectedVersion",
  "expiresAt",
]);

export const postgresTeamInvitationExpirationSql = Object.freeze({
  listDuePage: `
    SELECT
      team_invitations.tenant_id AS "tenantId",
      team_invitations.invitation_key AS "invitationKey",
      team_invitations.version AS "expectedVersion",
      team_invitations.expires_at AS "expiresAt"
    FROM team_invitations
    WHERE team_invitations.status = 'pending'
      AND team_invitations.expires_at <= $1::timestamptz
      AND NOT EXISTS (
        SELECT 1
        FROM team_invitation_acceptances
        WHERE team_invitation_acceptances.tenant_id =
          team_invitations.tenant_id
          AND team_invitation_acceptances.invitation_key =
            team_invitations.invitation_key
      )
      AND (
        $2::timestamptz IS NULL
        OR team_invitations.expires_at > $2::timestamptz
        OR (
          team_invitations.expires_at = $2::timestamptz
          AND team_invitations.invitation_key > $3
        )
      )
    ORDER BY
      team_invitations.expires_at ASC,
      team_invitations.invitation_key ASC
    LIMIT $4
  `,
});

export interface PostgresTeamInvitationExpirationDependencies {
  readonly queries: PostgresQueryExecutor;
}

function requirePageSize(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > maximumPageSize
  ) {
    throw new Error("team invitation expiration page size is invalid");
  }

  return Number(value);
}

function parseDueInvitation(
  value: unknown,
  cutoff: string,
): Readonly<DueTeamInvitation> {
  const row = requireExactPostgresRow(value, dueInvitationRowKeys);
  const invitation = Object.freeze({
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    invitationKey: requireTeamInvitationKey(row.invitationKey),
    expectedVersion: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.expectedVersion),
    ),
    expiresAt: requireTeamTimestamp(
      parsePostgresTimestamp(row.expiresAt),
    ),
  });

  if (invitation.expiresAt > cutoff) {
    throw new Error(
      "PostgreSQL returned an invitation after the expiration cutoff",
    );
  }

  return invitation;
}

function comparePosition(
  left: Readonly<{ expiresAt: string; invitationKey: string }>,
  right: Readonly<{ expiresAt: string; invitationKey: string }>,
): number {
  return (
    left.expiresAt.localeCompare(right.expiresAt) ||
    left.invitationKey.localeCompare(right.invitationKey)
  );
}

export function createPostgresTeamInvitationExpirationRepository(
  dependencies: Readonly<PostgresTeamInvitationExpirationDependencies>,
): TeamInvitationExpirationRepository {
  if (typeof dependencies.queries?.query !== "function") {
    throw new Error(
      "PostgreSQL invitation expiration dependencies are invalid",
    );
  }

  return Object.freeze({
    async listDuePage(
      cutoffInput: unknown,
      cursorInput: unknown,
      limitInput: unknown,
    ) {
      const cutoff = requireTeamTimestamp(cutoffInput);
      const cursor = requireTeamInvitationExpirationCursor(cursorInput);
      const limit = requirePageSize(limitInput);
      const result = await dependencies.queries.query<
        Record<string, unknown>
      >(postgresTeamInvitationExpirationSql.listDuePage, [
        cutoff,
        cursor?.expiresAt ?? null,
        cursor?.invitationKey ?? null,
        limit,
      ]);
      const rows = requirePostgresRows(result, limit);
      const invitations = Object.freeze(
        rows.map((row) => parseDueInvitation(row, cutoff)),
      );

      for (let index = 0; index < invitations.length; index += 1) {
        const current = invitations[index];
        const previous = index === 0 ? cursor : invitations[index - 1];

        if (previous !== null && comparePosition(current, previous) <= 0) {
          throw new Error(
            "PostgreSQL returned invalid invitation expiration ordering",
          );
        }
      }

      const last = invitations.at(-1);
      const page: TeamInvitationExpirationPage = {
        invitations,
        nextCursor:
          invitations.length === limit && last !== undefined
            ? Object.freeze({
                expiresAt: last.expiresAt,
                invitationKey: last.invitationKey,
              })
            : null,
      };

      return Object.freeze(page);
    },
  });
}
