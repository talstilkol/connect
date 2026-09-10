import type {
  TeamInvitationRepository,
} from "../../db/teamInvitationRepository.ts";
import type {
  TeamInvitationRole,
} from "../../shared/domain/teamInvitation.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationKey,
} from "./teamInvitationKey.ts";
import type {
  TeamInvitationPolicy,
} from "./teamInvitationPolicy.ts";
import {
  requireTeamInvitationEmail,
  requireTeamInvitationRole,
} from "./teamInvitationValidation.ts";
import {
  requireTeamTimestamp,
} from "./teamMembershipValidation.ts";

const MILLISECONDS_PER_HOUR =
  60 * 60 * 1_000;

export interface TeamInvitationPublisher {
  publish(
    tenantId: unknown,
    deliveryKey: unknown,
  ): Promise<{
    outcome: "queued";
  }>;
}

export type TeamInvitationRequestErrorCode =
  | "CONFLICT"
  | "PERSISTENCE_UNAVAILABLE"
  | "QUEUE_UNAVAILABLE"
  | "REREQUEST_DISABLED";

export class TeamInvitationRequestError
  extends Error {
  readonly code:
    TeamInvitationRequestErrorCode;

  constructor(
    code:
      TeamInvitationRequestErrorCode,
  ) {
    super(
      "The team invitation request could not be completed",
    );
    this.name =
      "TeamInvitationRequestError";
    this.code = code;
  }
}

export class TeamInvitationRequestInputError
  extends Error {
  constructor() {
    super(
      "The team invitation request input is invalid",
    );
    this.name =
      "TeamInvitationRequestInputError";
  }
}

type Clock = () => string;

function parseInput(
  input: unknown,
): {
  email: string;
  role: TeamInvitationRole;
} {
  try {
    if (
      typeof input !== "object" ||
      input === null ||
      Array.isArray(input)
    ) {
      throw new Error(
        "invitation input is invalid",
      );
    }

    const record =
      input as Record<
        string,
        unknown
      >;
    const keys =
      Object.keys(record).sort();

    if (
      keys.length !== 2 ||
      keys[0] !== "email" ||
      keys[1] !== "role"
    ) {
      throw new Error(
        "invitation input shape is invalid",
      );
    }

    return {
      email:
        requireTeamInvitationEmail(
          record.email,
        ),
      role:
        requireTeamInvitationRole(
          record.role,
        ),
    };
  } catch {
    throw new TeamInvitationRequestInputError();
  }
}

function expiry(
  requestedAt: string,
  ttlHours: number,
): string {
  const milliseconds =
    Date.parse(requestedAt) +
    ttlHours *
      MILLISECONDS_PER_HOUR;
  const value =
    new Date(
      milliseconds,
    ).toISOString();

  return requireTeamTimestamp(
    value,
  );
}

export function createTeamInvitationRequestService(
  repository:
    TeamInvitationRepository,
  publisher: TeamInvitationPublisher,
  policy: TeamInvitationPolicy,
  clock: Clock = () =>
    new Date().toISOString(),
) {
  return {
    async invite(
      session: TenantSession,
      input: unknown,
    ): Promise<{
      status:
        | "queued"
        | "already-pending";
    }> {
      requireTenantPermission(
        session,
        "team.manage",
      );
      const parsed =
        parseInput(input);
      let requestedAt: string;

      try {
        requestedAt =
          requireTeamTimestamp(
            clock(),
          );
      } catch {
        throw new TeamInvitationRequestError(
          "PERSISTENCE_UNAVAILABLE",
        );
      }
      const invitationKey =
        await deriveTeamInvitationKey({
          tenantId:
            session.tenantId,
          email: parsed.email,
        });
      let current;

      try {
        current =
          await repository.find(
            session.tenantId,
            invitationKey,
          );
      } catch {
        throw new TeamInvitationRequestError(
          "PERSISTENCE_UNAVAILABLE",
        );
      }

      if (
        current !== null &&
        current.status === "pending"
      ) {
        if (
          current.role !==
          parsed.role
        ) {
          throw new TeamInvitationRequestError(
            "CONFLICT",
          );
        }

        if (
          Date.parse(
            current.expiresAt,
          ) >
          Date.parse(
            requestedAt,
          )
        ) {
          const deliveryKey =
            await deriveTeamInvitationDeliveryKey(
              {
                tenantId:
                  session.tenantId,
                invitationKey,
                invitationVersion:
                  current.version,
              },
            );

          try {
            await publisher.publish(
              session.tenantId,
              deliveryKey,
            );
          } catch {
            throw new TeamInvitationRequestError(
              "QUEUE_UNAVAILABLE",
            );
          }

          return {
            status:
              "already-pending",
          };
        }

        let expiration;

        try {
          expiration =
            await repository.transition(
              {
                tenantId:
                  session.tenantId,
                invitationKey,
                expectedVersion:
                  current.version,
                toStatus: "expired",
                actorExternalUserId:
                  session
                    .externalUserId,
                occurredAt:
                  requestedAt,
              },
            );
        } catch {
          throw new TeamInvitationRequestError(
            "PERSISTENCE_UNAVAILABLE",
          );
        }

        if (
          (
            expiration.outcome !==
              "updated" &&
            expiration.outcome !==
              "unchanged"
          ) ||
          expiration.invitation ===
            null ||
          expiration.invitation
            .status !== "expired"
        ) {
          throw new TeamInvitationRequestError(
            "CONFLICT",
          );
        }

        current =
          expiration.invitation;
      }

      if (
        current !== null &&
        policy.reRequest ===
          "disabled"
      ) {
        throw new TeamInvitationRequestError(
          "REREQUEST_DISABLED",
        );
      }

      let result;

      try {
        result =
          await repository.request({
            tenantId:
              session.tenantId,
            email: parsed.email,
            role: parsed.role,
            expectedVersion:
              current?.version ?? 0,
            actorExternalUserId:
              session.externalUserId,
            requestedAt,
            expiresAt:
              expiry(
                requestedAt,
                policy.ttlHours,
              ),
          });
      } catch {
        throw new TeamInvitationRequestError(
          "PERSISTENCE_UNAVAILABLE",
        );
      }

      if (
        (
          result.outcome !== "created" &&
          result.outcome !== "updated" &&
          result.outcome !== "unchanged"
        ) ||
        result.invitation === null
      ) {
        throw new TeamInvitationRequestError(
          "CONFLICT",
        );
      }

      const deliveryKey =
        await deriveTeamInvitationDeliveryKey(
          {
            tenantId:
              session.tenantId,
            invitationKey:
              result.invitation
                .invitationKey,
            invitationVersion:
              result.invitation.version,
          },
        );

      try {
        await publisher.publish(
          session.tenantId,
          deliveryKey,
        );
      } catch {
        throw new TeamInvitationRequestError(
          "QUEUE_UNAVAILABLE",
        );
      }

      return {
        status:
          result.outcome ===
          "unchanged"
            ? "already-pending"
            : "queued",
      };
    },
  };
}
