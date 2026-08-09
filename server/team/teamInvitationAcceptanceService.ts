import type {
  TeamInvitationAcceptanceRepository,
} from "../../db/teamInvitationAcceptanceRepository.ts";
import {
  requireTeamInvitationEmail,
  requireTeamInvitationKey,
} from "./teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
  requireTeamTimestamp,
} from "./teamMembershipValidation.ts";

export type TeamInvitationIdentityVerification =
  | {
      status: "verified";
      externalUserId: unknown;
      verifiedEmail: unknown;
    }
  | {
      status: "unauthenticated";
    }
  | {
      status: "rejected";
    }
  | {
      status: "unavailable";
    };

export interface TeamInvitationIdentityVerifier {
  verify(
    proof: unknown,
  ): Promise<TeamInvitationIdentityVerification>;
}

export interface TeamInvitationAcceptanceClock {
  now(): Date;
}

export type TeamInvitationAcceptanceServiceCode =
  | "INVALID_INPUT"
  | "AUTHENTICATION_REQUIRED"
  | "IDENTITY_REJECTED"
  | "IDENTITY_UNAVAILABLE"
  | "INVITATION_NOT_FOUND"
  | "EMAIL_MISMATCH"
  | "INVITATION_INELIGIBLE"
  | "CONFLICT"
  | "PERSISTENCE_UNAVAILABLE";

export class TeamInvitationAcceptanceServiceError
  extends Error {
  readonly code:
    TeamInvitationAcceptanceServiceCode;

  constructor(
    code:
      TeamInvitationAcceptanceServiceCode,
  ) {
    super(
      "Team invitation acceptance failed",
    );
    this.name =
      "TeamInvitationAcceptanceServiceError";
    this.code = code;
  }
}

function isRecord(
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
  const actual =
    Object.keys(value);

  return (
    actual.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(value, key),
    )
  );
}

function currentTimestamp(
  clock:
    TeamInvitationAcceptanceClock,
): string {
  const current = clock.now();

  if (
    !(current instanceof Date) ||
    !Number.isFinite(
      current.getTime(),
    )
  ) {
    throw new TeamInvitationAcceptanceServiceError(
      "PERSISTENCE_UNAVAILABLE",
    );
  }

  try {
    return requireTeamTimestamp(
      current.toISOString(),
    );
  } catch {
    throw new TeamInvitationAcceptanceServiceError(
      "PERSISTENCE_UNAVAILABLE",
    );
  }
}

function parseVerification(
  value: unknown,
):
  | {
      status: "verified";
      externalUserId: string;
      verifiedEmail: string;
    }
  | {
      status: "unauthenticated";
    }
  | {
      status: "rejected";
    }
  | {
      status: "unavailable";
    } {
  if (!isRecord(value)) {
    throw new TeamInvitationAcceptanceServiceError(
      "IDENTITY_UNAVAILABLE",
    );
  }

  if (
    (
      value.status ===
        "unauthenticated" ||
      value.status === "rejected" ||
      value.status ===
        "unavailable"
    ) &&
    hasExactKeys(
      value,
      ["status"],
    )
  ) {
    return {
      status: value.status,
    };
  }

  if (
    value.status !==
      "verified" ||
    !hasExactKeys(
      value,
      [
        "status",
        "externalUserId",
        "verifiedEmail",
      ],
    )
  ) {
    throw new TeamInvitationAcceptanceServiceError(
      "IDENTITY_UNAVAILABLE",
    );
  }

  try {
    return {
      status: "verified",
      externalUserId:
        requireTeamExternalUserId(
          value.externalUserId,
        ),
      verifiedEmail:
        requireTeamInvitationEmail(
          value.verifiedEmail,
        ),
    };
  } catch {
    throw new TeamInvitationAcceptanceServiceError(
      "IDENTITY_UNAVAILABLE",
    );
  }
}

export function createTeamInvitationAcceptanceService(
  repository:
    TeamInvitationAcceptanceRepository,
  identityVerifier:
    TeamInvitationIdentityVerifier,
  clock:
    TeamInvitationAcceptanceClock,
): {
  accept(
    input: unknown,
  ): Promise<{
    status:
      "accepted" |
      "already-accepted";
  }>;
} {
  if (
    !identityVerifier ||
    typeof identityVerifier
      .verify !== "function"
  ) {
    throw new Error(
      "Team invitation identity verifier must be configured",
    );
  }

  return {
    async accept(input) {
      if (
        !isRecord(input) ||
        !hasExactKeys(
          input,
          [
            "invitationKey",
            "proof",
          ],
        ) ||
        input.proof === null ||
        input.proof === undefined
      ) {
        throw new TeamInvitationAcceptanceServiceError(
          "INVALID_INPUT",
        );
      }

      let invitationKey;

      try {
        invitationKey =
          requireTeamInvitationKey(
            input.invitationKey,
          );
      } catch {
        throw new TeamInvitationAcceptanceServiceError(
          "INVALID_INPUT",
        );
      }

      let verification;

      try {
        verification =
          parseVerification(
            await identityVerifier
              .verify(input.proof),
          );
      } catch (error) {
        if (
          error instanceof
          TeamInvitationAcceptanceServiceError
        ) {
          throw error;
        }

        throw new TeamInvitationAcceptanceServiceError(
          "IDENTITY_UNAVAILABLE",
        );
      }

      if (
        verification.status ===
        "unauthenticated"
      ) {
        throw new TeamInvitationAcceptanceServiceError(
          "AUTHENTICATION_REQUIRED",
        );
      }

      if (
        verification.status ===
        "rejected"
      ) {
        throw new TeamInvitationAcceptanceServiceError(
          "IDENTITY_REJECTED",
        );
      }

      if (
        verification.status ===
        "unavailable"
      ) {
        throw new TeamInvitationAcceptanceServiceError(
          "IDENTITY_UNAVAILABLE",
        );
      }

      let result;

      try {
        result =
          await repository.accept({
            invitationKey,
            externalUserId:
              verification
                .externalUserId,
            verifiedEmail:
              verification
                .verifiedEmail,
            acceptedAt:
              currentTimestamp(
                clock,
              ),
          });
      } catch {
        throw new TeamInvitationAcceptanceServiceError(
          "PERSISTENCE_UNAVAILABLE",
        );
      }

      if (
        result.outcome ===
        "created"
      ) {
        return {
          status: "accepted",
        };
      }

      if (
        result.outcome ===
        "unchanged"
      ) {
        return {
          status:
            "already-accepted",
        };
      }

      const codeByOutcome = {
        "not-found":
          "INVITATION_NOT_FOUND",
        "email-mismatch":
          "EMAIL_MISMATCH",
        "invalid-transition":
          "INVITATION_INELIGIBLE",
        conflict: "CONFLICT",
      } as const;

      throw new TeamInvitationAcceptanceServiceError(
        codeByOutcome[
          result.outcome
        ],
      );
    },
  };
}
