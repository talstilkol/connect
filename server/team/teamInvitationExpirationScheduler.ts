import type {
  TeamInvitationExpirationCursor,
  TeamInvitationExpirationRepository,
} from "../../db/teamInvitationExpirationRepository.ts";
import type {
  TeamInvitationRepository,
} from "../../db/teamInvitationRepository.ts";
import {
  teamInvitationExpirationSystemActorId,
} from "../../shared/domain/teamInvitation.ts";
import {
  requireTeamInvitationKey,
} from "./teamInvitationValidation.ts";
import {
  requireTeamMembershipVersion,
  requireTeamTenantId,
  requireTeamTimestamp,
} from "./teamMembershipValidation.ts";

const PAGE_SIZE = 10;
const RUN_LIMIT = 50;

export interface TeamInvitationExpirationClock {
  now(): Date;
}

export interface TeamInvitationExpirationSchedulerResult {
  scanned: number;
  expired: number;
  idempotent: number;
  skipped: number;
  limitReached: boolean;
}

export class TeamInvitationExpirationSchedulerError
  extends Error {
  constructor() {
    super(
      "Team invitation expiration scheduler failed",
    );
    this.name =
      "TeamInvitationExpirationSchedulerError";
  }
}

function currentTimestamp(
  clock:
    TeamInvitationExpirationClock,
): string {
  const current = clock.now();

  if (
    !(current instanceof Date) ||
    !Number.isFinite(
      current.getTime(),
    )
  ) {
    throw new TeamInvitationExpirationSchedulerError();
  }

  return current.toISOString();
}

function cursorIdentity(
  cursor:
    TeamInvitationExpirationCursor,
): string {
  return `${cursor.expiresAt}\u0000${cursor.invitationKey}`;
}

export function createTeamInvitationExpirationScheduler(
  expirationRepository:
    TeamInvitationExpirationRepository,
  invitationRepository:
    TeamInvitationRepository,
  clock:
    TeamInvitationExpirationClock,
): {
  run():
    Promise<TeamInvitationExpirationSchedulerResult>;
} {
  return {
    async run() {
      const now =
        currentTimestamp(clock);
      let cursor:
        TeamInvitationExpirationCursor | null =
          null;
      const visitedCursors =
        new Set<string>();
      let scanned = 0;
      let expired = 0;
      let idempotent = 0;
      let skipped = 0;
      let limitReached = false;

      while (scanned < RUN_LIMIT) {
        const limit = Math.min(
          PAGE_SIZE,
          RUN_LIMIT - scanned,
        );
        let page;

        try {
          page =
            await expirationRepository
              .listDuePage(
                now,
                cursor,
                limit,
              );
        } catch {
          throw new TeamInvitationExpirationSchedulerError();
        }

        if (
          !page ||
          !Array.isArray(
            page.invitations,
          ) ||
          page.invitations.length >
            limit ||
          (
            page.invitations.length <
              limit &&
            page.nextCursor !==
              null
          )
        ) {
          throw new TeamInvitationExpirationSchedulerError();
        }

        let lastPosition = cursor;
        const candidates = [];

        for (
          const candidate of
            page.invitations
        ) {
          let parsed;

          try {
            parsed = {
              tenantId:
                requireTeamTenantId(
                  candidate.tenantId,
                ),
              invitationKey:
                requireTeamInvitationKey(
                  candidate
                    .invitationKey,
                ),
              expectedVersion:
                requireTeamMembershipVersion(
                  candidate
                    .expectedVersion,
                ),
              expiresAt:
                requireTeamTimestamp(
                  candidate.expiresAt,
                ),
            };
          } catch {
            throw new TeamInvitationExpirationSchedulerError();
          }

          if (parsed.expiresAt > now) {
            throw new TeamInvitationExpirationSchedulerError();
          }

          const candidatePosition = {
            expiresAt:
              parsed.expiresAt,
            invitationKey:
              parsed.invitationKey,
          };

          if (
            lastPosition !== null &&
            cursorIdentity(
              candidatePosition,
            ) <=
              cursorIdentity(
                lastPosition,
              )
          ) {
            throw new TeamInvitationExpirationSchedulerError();
          }

          lastPosition =
            candidatePosition;
          candidates.push(parsed);
        }

        let nextCursor:
          TeamInvitationExpirationCursor | null =
            null;

        if (
          page.nextCursor !== null
        ) {
          try {
            nextCursor = {
              expiresAt:
                requireTeamTimestamp(
                  page.nextCursor
                    .expiresAt,
                ),
              invitationKey:
                requireTeamInvitationKey(
                  page.nextCursor
                    .invitationKey,
                ),
            };
          } catch {
            throw new TeamInvitationExpirationSchedulerError();
          }

          const nextIdentity =
            cursorIdentity(
              nextCursor,
            );

          if (
            lastPosition === null ||
            nextIdentity !==
              cursorIdentity(
                lastPosition,
              ) ||
            (
              cursor !== null &&
              nextIdentity <=
                cursorIdentity(
                  cursor,
                )
            ) ||
            visitedCursors.has(
              nextIdentity,
            )
          ) {
            throw new TeamInvitationExpirationSchedulerError();
          }
        }

        for (
          const candidate of
            candidates
        ) {
          let result;

          try {
            result =
              await invitationRepository
                .transition({
                  tenantId:
                    candidate
                      .tenantId,
                  invitationKey:
                    candidate
                      .invitationKey,
                  expectedVersion:
                    candidate
                      .expectedVersion,
                  toStatus:
                    "expired",
                  systemActorId:
                    teamInvitationExpirationSystemActorId,
                  occurredAt: now,
                });
          } catch {
            throw new TeamInvitationExpirationSchedulerError();
          }

          scanned += 1;

          if (
            result.outcome ===
              "updated" ||
            result.outcome ===
              "unchanged"
          ) {
            const invitation =
              result.invitation;

            if (
              invitation === null ||
              invitation.tenantId !==
                candidate.tenantId ||
              invitation
                .invitationKey !==
                candidate
                  .invitationKey ||
              invitation.version !==
                candidate
                  .expectedVersion +
                  1 ||
              invitation.status !==
                "expired" ||
              invitation.lastActor
                .kind !== "system" ||
              invitation.lastActor.id !==
                teamInvitationExpirationSystemActorId
            ) {
              throw new TeamInvitationExpirationSchedulerError();
            }

            if (
              result.outcome ===
              "updated"
            ) {
              expired += 1;
            } else {
              idempotent += 1;
            }
          } else if (
            result.outcome ===
              "not-found" ||
            result.outcome ===
              "conflict" ||
            result.outcome ===
              "invalid-transition"
          ) {
            skipped += 1;
          } else {
            throw new TeamInvitationExpirationSchedulerError();
          }
        }

        if (nextCursor === null) {
          break;
        }

        const nextIdentity =
          cursorIdentity(nextCursor);

        visitedCursors.add(
          nextIdentity,
        );
        cursor = nextCursor;
        limitReached =
          scanned === RUN_LIMIT;
      }

      return {
        scanned,
        expired,
        idempotent,
        skipped,
        limitReached,
      };
    },
  };
}
