import {
  requireTeamInvitationKey,
} from "../server/team/teamInvitationValidation.ts";
import {
  requireTeamMembershipVersion,
  requireTeamTenantId,
  requireTeamTimestamp,
} from "../server/team/teamMembershipValidation.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const MAX_PAGE_SIZE = 50;

const listDueInvitationsSql = `
  SELECT
    tenant_id AS tenantId,
    invitation_key AS invitationKey,
    version AS expectedVersion,
    expires_at AS expiresAt
  FROM team_invitations
  WHERE status = 'pending'
    AND expires_at <= ?1
    AND (
      ?2 IS NULL
      OR expires_at > ?2
      OR (
        expires_at = ?2
        AND invitation_key > ?3
      )
    )
  ORDER BY
    expires_at ASC,
    invitation_key ASC
  LIMIT ?4
`;

interface DueInvitationRow {
  tenantId: unknown;
  invitationKey: unknown;
  expectedVersion: unknown;
  expiresAt: unknown;
}

export interface TeamInvitationExpirationCursor {
  expiresAt: string;
  invitationKey: string;
}

export interface DueTeamInvitation {
  tenantId: number;
  invitationKey: string;
  expectedVersion: number;
  expiresAt: string;
}

export interface TeamInvitationExpirationPage {
  invitations:
    readonly DueTeamInvitation[];
  nextCursor:
    TeamInvitationExpirationCursor | null;
}

export interface TeamInvitationExpirationRepository {
  listDuePage(
    cutoff: unknown,
    cursor:
      TeamInvitationExpirationCursor | null,
    limit: unknown,
  ): Promise<TeamInvitationExpirationPage>;
}

function requirePageSize(
  value: unknown,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > MAX_PAGE_SIZE
  ) {
    throw new Error(
      "team invitation expiration page size is invalid",
    );
  }

  return Number(value);
}

export function requireTeamInvitationExpirationCursor(
  value: unknown,
): TeamInvitationExpirationCursor | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2
  ) {
    throw new Error(
      "team invitation expiration cursor is invalid",
    );
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  return {
    expiresAt:
      requireTeamTimestamp(
        record.expiresAt,
      ),
    invitationKey:
      requireTeamInvitationKey(
        record.invitationKey,
      ),
  };
}

function parseRow(
  row: DueInvitationRow,
  cutoff: string,
): DueTeamInvitation {
  const invitation = {
    tenantId:
      requireTeamTenantId(
        row.tenantId,
      ),
    invitationKey:
      requireTeamInvitationKey(
        row.invitationKey,
      ),
    expectedVersion:
      requireTeamMembershipVersion(
        row.expectedVersion,
      ),
    expiresAt:
      requireTeamTimestamp(
        row.expiresAt,
      ),
  };

  if (
    invitation.expiresAt >
    cutoff
  ) {
    throw new Error(
      "D1 returned an invitation after the expiration cutoff",
    );
  }

  return invitation;
}

function comparePosition(
  left: TeamInvitationExpirationCursor,
  right: TeamInvitationExpirationCursor,
): number {
  return (
    left.expiresAt.localeCompare(
      right.expiresAt,
    ) ||
    left.invitationKey.localeCompare(
      right.invitationKey,
    )
  );
}

export function createTeamInvitationExpirationRepository(
  database: D1DatabaseBinding,
): TeamInvitationExpirationRepository {
  return {
    async listDuePage(
      cutoffInput,
      cursorInput,
      limitInput,
    ) {
      const cutoff =
        requireTeamTimestamp(
          cutoffInput,
        );
      const cursor =
        requireTeamInvitationExpirationCursor(
          cursorInput,
        );
      const limit =
        requirePageSize(limitInput);
      const result = await database
        .prepare(
          listDueInvitationsSql,
        )
        .bind(
          cutoff,
          cursor?.expiresAt ??
            null,
          cursor?.invitationKey ??
            null,
          limit,
        )
        .all<DueInvitationRow>();

      if (!result.success) {
        throw new Error(
          "D1 team invitation expiration read failed",
        );
      }

      const invitations = (
        result.results ?? []
      ).map((row) =>
        parseRow(row, cutoff),
      );

      for (
        let index = 0;
        index < invitations.length;
        index += 1
      ) {
        const current =
          invitations[index];
        const previous =
          index === 0
            ? cursor
            : invitations[
                index - 1
              ];

        if (
          previous !== null &&
          comparePosition(
            current,
            previous,
          ) <= 0
        ) {
          throw new Error(
            "D1 returned invalid invitation expiration ordering",
          );
        }
      }

      const last =
        invitations.at(-1);

      return {
        invitations,
        nextCursor:
          invitations.length ===
            limit &&
          last
            ? {
                expiresAt:
                  last.expiresAt,
                invitationKey:
                  last.invitationKey,
              }
            : null,
      };
    },
  };
}
