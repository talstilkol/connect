import {
  SystemAdminSessionError,
  type SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import type {
  SystemAdminTenantDirectoryActionResult,
} from "./systemAdminTenantDirectoryActionResult.ts";
import {
  SystemAdminTenantDirectoryInputError,
  type SystemAdminTenantDirectoryService,
} from "./systemAdminTenantDirectoryService.ts";

interface SystemAdminTenantDirectoryActionContext {
  session: SystemAdminSession;
  service:
    SystemAdminTenantDirectoryService;
}

export interface SystemAdminTenantDirectoryActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<SystemAdminTenantDirectoryActionContext>;
}

export interface SystemAdminTenantDirectoryActionHandler {
  load(
    input: unknown,
  ): Promise<SystemAdminTenantDirectoryActionResult>;
}

export function createSystemAdminTenantDirectoryActionHandler(
  dependencies:
    SystemAdminTenantDirectoryActionHandlerDependencies,
): SystemAdminTenantDirectoryActionHandler {
  return {
    async load(input) {
      if (
        !dependencies.applicationConfigured()
      ) {
        return {
          status:
            "configuration-required",
        };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const directory =
          await service.list(
            session,
            input,
          );

        return {
          status: "loaded",
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
          };
        }

        if (
          error instanceof
          SystemAdminTenantDirectoryInputError
        ) {
          return {
            status: "invalid-input",
          };
        }

        return {
          status: "server-error",
        };
      }
    },
  };
}
