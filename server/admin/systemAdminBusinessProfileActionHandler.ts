import {
  SystemAdminSessionError,
  type SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import type {
  SystemAdminBusinessProfileActionFailure,
  SystemAdminBusinessProfileActionResult,
} from "./systemAdminBusinessProfileActionResult.ts";
import {
  SystemAdminBusinessProfileError,
  SystemAdminBusinessProfileInputError,
  type SystemAdminBusinessProfileService,
} from "./systemAdminBusinessProfileService.ts";
import {
  toSystemAdminBusinessProfileView,
} from "./systemAdminBusinessProfileView.ts";

interface SystemAdminBusinessProfileActionContext {
  session: SystemAdminSession;
  service:
    SystemAdminBusinessProfileService;
}

export interface SystemAdminBusinessProfileActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<SystemAdminBusinessProfileActionContext>;
}

export interface SystemAdminBusinessProfileActionHandler {
  update(
    input: unknown,
  ): Promise<SystemAdminBusinessProfileActionResult>;
}

function mapProfileError(
  error: SystemAdminBusinessProfileError,
): SystemAdminBusinessProfileActionFailure {
  if (error.code === "NOT_FOUND") {
    return { status: "not-found" };
  }

  if (error.code === "CONFLICT") {
    return { status: "conflict" };
  }

  return { status: "server-error" };
}

export function createSystemAdminBusinessProfileActionHandler(
  dependencies:
    SystemAdminBusinessProfileActionHandlerDependencies,
): SystemAdminBusinessProfileActionHandler {
  return {
    async update(input) {
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
        const result =
          await service.update(
            session,
            input,
          );

        if (
          !result.profile ||
          (result.outcome !== "updated" &&
            result.outcome !== "unchanged")
        ) {
          return { status: "server-error" };
        }

        return {
          status: "saved",
          outcome: result.outcome,
          profile:
            toSystemAdminBusinessProfileView(
              result.profile,
            ),
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
          SystemAdminBusinessProfileInputError
        ) {
          return {
            status: "invalid-input",
          };
        }

        if (
          error instanceof
          SystemAdminBusinessProfileError
        ) {
          return mapProfileError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}
