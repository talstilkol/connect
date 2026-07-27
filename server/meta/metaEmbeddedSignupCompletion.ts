import type {
  MetaConnectionView,
} from "../../shared/domain/metaConnectionView.ts";
import {
  toMetaConnectionView,
} from "../../shared/domain/metaConnectionView.ts";
import type {
  TenantSession,
} from "../auth/tenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import {
  MetaConnectionOrchestrationError,
  type MetaConnectionOrchestrator,
} from "./metaConnectionOrchestrator.ts";
export type MetaEmbeddedSignupCompletionResult =
  | {
      status: "connected";
      connection: MetaConnectionView;
    }
  | {
      status:
        | "configuration-required"
        | "configuration-invalid"
        | "unauthenticated"
        | "onboarding-required"
        | "tenant-selection-required"
        | "permission-denied"
        | "validation-error"
        | "authorization-failed"
        | "verification-failed"
        | "subscription-failed"
        | "server-error";
    };

export interface MetaEmbeddedSignupCompletionContext {
  session: TenantSession;
  orchestrator: MetaConnectionOrchestrator;
}

export interface MetaEmbeddedSignupCompletionDependencies {
  readConfiguration: () =>
    | {
        status: "configured" | "disabled" | "incomplete";
      }
    | Promise<{
        status: "configured" | "disabled" | "incomplete";
      }>;
  createContext: () => Promise<MetaEmbeddedSignupCompletionContext>;
}

export interface MetaEmbeddedSignupCompletionHandler {
  complete(
    input: unknown,
  ): Promise<MetaEmbeddedSignupCompletionResult>;
}

function mapTenantSessionError(
  error: TenantSessionError,
): MetaEmbeddedSignupCompletionResult {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return { status: "unauthenticated" };
  }

  if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
    return { status: "onboarding-required" };
  }

  if (error.code === "TENANT_SELECTION_REQUIRED") {
    return { status: "tenant-selection-required" };
  }

  return { status: "permission-denied" };
}

function mapOrchestrationError(
  error: MetaConnectionOrchestrationError,
): MetaEmbeddedSignupCompletionResult {
  if (error.code === "INVALID_INPUT") {
    return { status: "validation-error" };
  }

  if (error.code === "CODE_EXCHANGE_FAILED") {
    return { status: "authorization-failed" };
  }

  if (
    error.code === "ASSET_VERIFICATION_FAILED" ||
    error.code === "ASSET_MISMATCH"
  ) {
    return { status: "verification-failed" };
  }

  if (error.code === "WABA_SUBSCRIPTION_FAILED") {
    return { status: "subscription-failed" };
  }

  return { status: "server-error" };
}

export function createMetaEmbeddedSignupCompletionHandler(
  dependencies: MetaEmbeddedSignupCompletionDependencies,
): MetaEmbeddedSignupCompletionHandler {
  return {
    async complete(input) {
      try {
        const configuration =
          await dependencies.readConfiguration();

        if (configuration.status === "disabled") {
          return { status: "configuration-required" };
        }

        if (configuration.status === "incomplete") {
          return { status: "configuration-invalid" };
        }

        const { session, orchestrator } =
          await dependencies.createContext();
        const connection =
          await orchestrator.completeEmbeddedSignup(
            session,
            input,
          );

        return {
          status: "connected",
          connection: toMetaConnectionView(connection),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (
          error instanceof MetaConnectionOrchestrationError
        ) {
          return mapOrchestrationError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}
