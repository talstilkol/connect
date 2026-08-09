import type {
  TeamInvitationAcceptanceActionResult,
} from "../../shared/domain/teamInvitationView.ts";
import {
  TeamInvitationAcceptanceServiceError,
} from "./teamInvitationAcceptanceService.ts";
import {
  requireTeamInvitationKey,
} from "./teamInvitationValidation.ts";

interface AcceptanceContext {
  accept(
    invitationKey: string,
  ): Promise<{
    status:
      | "accepted"
      | "already-accepted";
  }>;
}

function parseSuccess(
  value: unknown,
): TeamInvitationAcceptanceActionResult {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    (
      value.status !== "accepted" &&
      value.status !==
        "already-accepted"
    )
  ) {
    return {
      status: "server-error",
    };
  }

  return {
    status: value.status,
  };
}

interface Dependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<AcceptanceContext>;
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

function parseInvitationKey(
  input: unknown,
): string | null {
  if (
    !isRecord(input) ||
    Object.keys(input).length !== 1 ||
    !Object.hasOwn(
      input,
      "invitationKey",
    )
  ) {
    return null;
  }

  try {
    return requireTeamInvitationKey(
      input.invitationKey,
    );
  } catch {
    return null;
  }
}

function mapFailure(
  error: unknown,
): TeamInvitationAcceptanceActionResult {
  if (
    !(error instanceof
      TeamInvitationAcceptanceServiceError)
  ) {
    return {
      status: "server-error",
    };
  }

  switch (error.code) {
    case "INVALID_INPUT":
      return {
        status: "invalid-input",
      };
    case "IDENTITY_REJECTED":
      return {
        status:
          "identity-verification-required",
      };
    case "INVITATION_NOT_FOUND":
    case "EMAIL_MISMATCH":
    case "INVITATION_INELIGIBLE":
    case "CONFLICT":
      return {
        status:
          "invitation-unavailable",
      };
    default:
      return {
        status:
          "temporarily-unavailable",
      };
  }
}

export function createTeamInvitationAcceptanceActionHandler(
  dependencies: Dependencies,
) {
  return {
    async accept(
      input: unknown,
    ): Promise<TeamInvitationAcceptanceActionResult> {
      if (
        !dependencies
          .applicationConfigured()
      ) {
        return {
          status:
            "configuration-required",
        };
      }

      const invitationKey =
        parseInvitationKey(input);

      if (invitationKey === null) {
        return {
          status: "invalid-input",
        };
      }

      try {
        const context =
          await dependencies
            .createContext();

        return parseSuccess(
          await context.accept(
            invitationKey,
          ),
        );
      } catch (error) {
        return mapFailure(error);
      }
    },
  };
}
