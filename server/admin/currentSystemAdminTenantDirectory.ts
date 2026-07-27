import {
  createSystemAdminTenantDirectoryRepository,
} from "../../db/systemAdminTenantDirectoryRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  CurrentSystemAdminTenantDirectory,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentSystemAdminSession,
} from "../auth/currentSystemAdminSession.ts";
import {
  inspectSystemAdminConfiguration,
} from "../auth/systemAdminConfiguration.ts";
import {
  SystemAdminSessionError,
} from "../auth/systemAdminSession.ts";
import {
  createSystemAdminTenantDirectoryService,
} from "./systemAdminTenantDirectoryService.ts";

const emptyDirectory = {
  tenants: [],
  nextCursor: null,
} as const;

export async function readCurrentSystemAdminTenantDirectory():
  Promise<CurrentSystemAdminTenantDirectory> {
  if (
    inspectClerkConfiguration().status !==
      "configured" ||
    inspectSystemAdminConfiguration().status !==
      "configured"
  ) {
    return {
      status: "configuration-required",
      directory: emptyDirectory,
    };
  }

  try {
    const session =
      await requireCurrentSystemAdminSession();
    const database =
      await requireRuntimeDatabase();
    const service =
      createSystemAdminTenantDirectoryService(
        createSystemAdminTenantDirectoryRepository(
          database,
        ),
      );
    const directory = await service.list(
      session,
      {
        afterTenantId: null,
      },
    );

    return {
      status: "ready",
      directory,
    };
  } catch (error) {
    if (
      error instanceof
      SystemAdminSessionError
    ) {
      return {
        status:
          error.code ===
          "AUTHENTICATION_REQUIRED"
            ? "unauthenticated"
            : "permission-denied",
        directory: emptyDirectory,
      };
    }

    return {
      status: "server-error",
      directory: emptyDirectory,
    };
  }
}
