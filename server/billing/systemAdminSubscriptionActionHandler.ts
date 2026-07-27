import {
  SystemAdminSessionError,
  type SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import type {
  SystemAdminSubscriptionActionFailure,
  SystemAdminSubscriptionActionResult,
} from "./systemAdminSubscriptionActionResult.ts";
import {
  SystemAdminSubscriptionError,
  SystemAdminSubscriptionInputError,
  type SystemAdminSubscriptionService,
} from "./systemAdminSubscriptionService.ts";
import {
  toTenantSubscriptionAdminView,
} from "./systemAdminSubscriptionView.ts";

interface SystemAdminSubscriptionActionContext {
  session: SystemAdminSession;
  service: SystemAdminSubscriptionService;
}

export interface SystemAdminSubscriptionActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext():
    Promise<SystemAdminSubscriptionActionContext>;
}

export interface SystemAdminSubscriptionActionHandler {
  create(
    input: unknown,
  ): Promise<SystemAdminSubscriptionActionResult>;
  extend(
    input: unknown,
  ): Promise<SystemAdminSubscriptionActionResult>;
  changeStatus(
    input: unknown,
  ): Promise<SystemAdminSubscriptionActionResult>;
  cancel(
    input: unknown,
  ): Promise<SystemAdminSubscriptionActionResult>;
}

function mapSubscriptionError(
  error: SystemAdminSubscriptionError,
): SystemAdminSubscriptionActionFailure {
  if (error.code === "NOT_FOUND") {
    return { status: "not-found" };
  }

  if (error.code === "CONFLICT") {
    return { status: "conflict" };
  }

  if (
    error.code ===
    "INVALID_TRANSITION"
  ) {
    return {
      status: "invalid-transition",
    };
  }

  return { status: "server-error" };
}

export function createSystemAdminSubscriptionActionHandler(
  dependencies:
    SystemAdminSubscriptionActionHandlerDependencies,
): SystemAdminSubscriptionActionHandler {
  async function mutate(
    operation:
      | "create"
      | "extend"
      | "changeStatus"
      | "cancel",
    input: unknown,
  ): Promise<SystemAdminSubscriptionActionResult> {
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
        await service[operation](
          session,
          input,
        );

      if (
        !result.subscription ||
        (
          result.outcome !== "created" &&
          result.outcome !== "updated" &&
          result.outcome !== "unchanged"
        )
      ) {
        return { status: "server-error" };
      }

      return {
        status: "saved",
        outcome: result.outcome,
        subscription:
          toTenantSubscriptionAdminView(
            result.subscription,
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
        SystemAdminSubscriptionInputError
      ) {
        return { status: "invalid-input" };
      }

      if (
        error instanceof
        SystemAdminSubscriptionError
      ) {
        return mapSubscriptionError(
          error,
        );
      }

      return { status: "server-error" };
    }
  }

  return {
    create: (input) =>
      mutate("create", input),
    extend: (input) =>
      mutate("extend", input),
    changeStatus: (input) =>
      mutate("changeStatus", input),
    cancel: (input) =>
      mutate("cancel", input),
  };
}
