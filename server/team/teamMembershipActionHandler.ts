import type {
  TeamMembershipActionResult,
  TeamMembershipActionFailureStatus,
  TeamOwnerTransferActionResult,
} from "../../shared/domain/teamMembershipMutationView.ts";
import {
  TenantMutationRateLimitError,
} from "../security/tenantMutationRateLimit.ts";
import {
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  TeamMembershipMutationError,
  TeamMembershipMutationInputError,
} from "./teamMembershipMutationService.ts";
import type {
  createTeamMembershipMutationService,
} from "./teamMembershipMutationService.ts";
import {
  toTeamMembershipMutationView,
} from "./teamMembershipMutationMapper.ts";

type TeamMembershipMutationService =
  ReturnType<
    typeof createTeamMembershipMutationService
  >;

interface ActionContext {
  session: TenantSession;
  service:
    TeamMembershipMutationService;
}

interface Dependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<ActionContext>;
}

export interface TeamMembershipActionHandler {
  changeRole(
    input: unknown,
  ): Promise<TeamMembershipActionResult>;
  changeStatus(
    input: unknown,
  ): Promise<TeamMembershipActionResult>;
  transferOwner(
    input: unknown,
  ): Promise<TeamOwnerTransferActionResult>;
}

function mapTenantSessionError(
  error: TenantSessionError,
): TeamMembershipActionFailureStatus {
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

function mapMutationError(
  error: TeamMembershipMutationError,
): TeamMembershipActionFailureStatus {
  switch (error.code) {
    case "NOT_FOUND":
      return "not-found";
    case "CONFLICT":
      return "conflict";
    case "INVALID_TRANSITION":
      return "invalid-transition";
    case "STALE_SESSION":
      return "stale-session";
    default:
      return "server-error";
  }
}

function mapFailure(
  error: unknown,
): {
  status:
    TeamMembershipActionFailureStatus;
} {
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
    TeamMembershipMutationInputError
  ) {
    return {
      status: "invalid-input",
    };
  }

  if (
    error instanceof
    TeamMembershipMutationError
  ) {
    return {
      status:
        mapMutationError(error),
    };
  }

  return { status: "server-error" };
}

export function createTeamMembershipActionHandler(
  dependencies: Dependencies,
): TeamMembershipActionHandler {
  async function requireContext():
  Promise<ActionContext> {
    if (
      !dependencies
        .applicationConfigured()
    ) {
      throw new Error(
        "TEAM_CONFIGURATION_REQUIRED",
      );
    }

    return dependencies.createContext();
  }

  return {
    async changeRole(input) {
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
        } = await requireContext();
        const result =
          await service.changeRole(
            session,
            input,
          );

        if (
          result.membership === null ||
          (
            result.outcome !==
              "updated" &&
            result.outcome !==
              "unchanged"
          )
        ) {
          return {
            status: "server-error",
          };
        }

        return {
          status: "saved",
          outcome: result.outcome,
          membership:
            toTeamMembershipMutationView(
              session,
              result.membership,
            ),
        };
      } catch (error) {
        return mapFailure(error);
      }
    },

    async changeStatus(input) {
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
        } = await requireContext();
        const result =
          await service.changeStatus(
            session,
            input,
          );

        if (
          result.membership === null ||
          (
            result.outcome !==
              "updated" &&
            result.outcome !==
              "unchanged"
          )
        ) {
          return {
            status: "server-error",
          };
        }

        return {
          status: "saved",
          outcome: result.outcome,
          membership:
            toTeamMembershipMutationView(
              session,
              result.membership,
            ),
        };
      } catch (error) {
        return mapFailure(error);
      }
    },

    async transferOwner(input) {
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
        } = await requireContext();
        const result =
          await service.transferOwner(
            session,
            input,
          );

        if (
          result.formerOwner === null ||
          result.newOwner === null ||
          (
            result.outcome !==
              "updated" &&
            result.outcome !==
              "unchanged"
          )
        ) {
          return {
            status: "server-error",
          };
        }

        return {
          status: "saved",
          outcome: result.outcome,
          formerOwner:
            toTeamMembershipMutationView(
              session,
              result.formerOwner,
            ),
          newOwner:
            toTeamMembershipMutationView(
              session,
              result.newOwner,
            ),
        };
      } catch (error) {
        return mapFailure(error);
      }
    },
  };
}
