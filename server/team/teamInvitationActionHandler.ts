import type {
  TeamInvitationActionFailureStatus,
  TeamInvitationActionResult,
} from "../../shared/domain/teamInvitationView.ts";
import {
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  TenantMutationRateLimitError,
} from "../security/tenantMutationRateLimit.ts";
import {
  TeamInvitationError,
  TeamInvitationInputError,
  type createTeamInvitationService,
} from "./teamInvitationService.ts";

type TeamInvitationService =
  ReturnType<
    typeof createTeamInvitationService
  >;

interface ActionContext {
  session: TenantSession;
  service: TeamInvitationService;
}

interface Dependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<ActionContext>;
}

function mapTenantSessionError(
  error: TenantSessionError,
): TeamInvitationActionFailureStatus {
  switch (error.code) {
    case "AUTHENTICATION_REQUIRED":
      return "unauthenticated";
    case "TENANT_MEMBERSHIP_REQUIRED":
      return "onboarding-required";
    case "TENANT_SELECTION_REQUIRED":
      return "tenant-selection-required";
    default:
      return "permission-denied";
  }
}

function mapFailure(
  error: unknown,
): TeamInvitationActionResult {
  if (
    error instanceof
    TenantSessionError
  ) {
    return {
      status:
        mapTenantSessionError(error),
    };
  }

  if (
    error instanceof
    TenantMutationRateLimitError
  ) {
    return {
      status:
        error.code === "RATE_LIMITED"
          ? "rate-limited"
          : "temporarily-unavailable",
    };
  }

  if (
    error instanceof
    TeamInvitationInputError
  ) {
    return {
      status: "invalid-input",
    };
  }

  if (
    error instanceof
    TeamInvitationError
  ) {
    return {
      status:
        error.code ===
        "PROVIDER_UNAVAILABLE"
          ? "provider-unavailable"
          : "temporarily-unavailable",
    };
  }

  return {
    status: "server-error",
  };
}

export function createTeamInvitationActionHandler(
  dependencies: Dependencies,
) {
  return {
    async invite(
      input: unknown,
    ): Promise<TeamInvitationActionResult> {
      if (
        !dependencies
          .applicationConfigured()
      ) {
        return {
          status:
            "configuration-required",
        };
      }

      try {
        const {
          session,
          service,
        } =
          await dependencies
            .createContext();
        const result =
          await service.invite(
            session,
            input,
          );

        return {
          status:
            result.status,
        };
      } catch (error) {
        return mapFailure(error);
      }
    },
  };
}
