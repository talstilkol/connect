import {
  createTenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  TeamDirectoryStatus,
  TeamDirectoryView,
} from "../../shared/domain/teamDirectoryView.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantSession,
} from "../auth/currentTenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import {
  createTeamDirectoryService,
} from "./teamDirectoryService.ts";
import {
  createUnavailableTeamIdentityDirectory,
} from "./teamIdentityDirectory.ts";

export type CurrentTeamDirectoryResult =
  | {
      status: "ready";
      directory:
        TeamDirectoryView;
    }
  | {
      status: Exclude<
        TeamDirectoryStatus,
        "ready"
      >;
      directory: {
        identityStatus:
          "unavailable";
        members: readonly [];
      };
    };

const emptyDirectory = {
  identityStatus:
    "unavailable" as const,
  members: [] as const,
};

function tenantFailureStatus(
  error: TenantSessionError,
): Exclude<
  TeamDirectoryStatus,
  "ready" | "configuration-required"
> {
  if (
    error.code ===
      "AUTHENTICATION_REQUIRED"
  ) {
    return "unauthenticated";
  }

  if (
    error.code ===
      "TENANT_MEMBERSHIP_REQUIRED"
  ) {
    return "onboarding-required";
  }

  if (
    error.code ===
      "TENANT_SELECTION_REQUIRED"
  ) {
    return "tenant-selection-required";
  }

  if (
    error.code ===
      "PERMISSION_DENIED"
  ) {
    return "permission-denied";
  }

  return "server-error";
}

export async function readCurrentTeamDirectory():
Promise<CurrentTeamDirectoryResult> {
  if (
    inspectClerkConfiguration()
      .status !== "configured"
  ) {
    return {
      status:
        "configuration-required",
      directory: emptyDirectory,
    };
  }

  try {
    const database =
      await requireRuntimeDatabase();
    const session =
      await requireCurrentTenantSession(
        database,
      );
    const service =
      createTeamDirectoryService({
        identities:
          createUnavailableTeamIdentityDirectory(),
        memberships:
          createTenantMembershipRepository(
            database,
          ),
      });

    return {
      status: "ready",
      directory:
        await service.list(session),
    };
  } catch (error) {
    return {
      status:
        error instanceof
        TenantSessionError
          ? tenantFailureStatus(
              error,
            )
          : "server-error",
      directory: emptyDirectory,
    };
  }
}
