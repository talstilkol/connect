"use server";

import {
  createTenantMembershipMutationRepository,
} from "../../db/tenantMembershipMutationRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  TeamMembershipActionResult,
  TeamOwnerTransferActionResult,
} from "../../shared/domain/teamMembershipMutationView.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import {
  createTeamMembershipActionHandler,
} from "./teamMembershipActionHandler.ts";
import {
  createTeamMembershipMutationService,
} from "./teamMembershipMutationService.ts";

function createActionHandler() {
  return createTeamMembershipActionHandler(
    {
      applicationConfigured: () =>
        inspectClerkConfiguration()
          .status === "configured",
      async createContext() {
        const database =
          await requireRuntimeDatabase();
        const session =
          await requireCurrentTenantMutationSession(
            database,
          );
        const service =
          createTeamMembershipMutationService(
            createTenantMembershipMutationRepository(
              database,
            ),
          );

        return {
          session,
          service,
        };
      },
    },
  );
}

export async function changeTeamMemberRoleAction(
  input: unknown,
): Promise<TeamMembershipActionResult> {
  try {
    return await createActionHandler()
      .changeRole(input);
  } catch {
    return { status: "server-error" };
  }
}

export async function changeTeamMemberStatusAction(
  input: unknown,
): Promise<TeamMembershipActionResult> {
  try {
    return await createActionHandler()
      .changeStatus(input);
  } catch {
    return { status: "server-error" };
  }
}

export async function transferTeamOwnershipAction(
  input: unknown,
): Promise<TeamOwnerTransferActionResult> {
  try {
    return await createActionHandler()
      .transferOwner(input);
  } catch {
    return { status: "server-error" };
  }
}
