import {
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";
import type {
  AiAgentActionFailure,
  LoadAiAgentDetailsActionResult,
  PublishAiAgentDraftActionResult,
  SaveAiAgentDraftActionResult,
} from "./aiAgentActionResult.ts";
import {
  AiAgentActivationError,
  AiAgentInputError,
  AiAgentServiceError,
  type AiAgentService,
} from "./aiAgentService.ts";
import {
  toAiAgentDetailsView,
  toAiAgentSummaryView,
  toAiAgentVersionView,
} from "./aiAgentView.ts";

interface AiAgentActionContext {
  session: TenantSession;
  service: AiAgentService;
}

export interface AiAgentActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext(): Promise<AiAgentActionContext>;
}

export interface AiAgentActionHandler {
  loadDetails(
    aiAgentKey: unknown,
  ): Promise<LoadAiAgentDetailsActionResult>;
  saveDraft(
    input: unknown,
  ): Promise<SaveAiAgentDraftActionResult>;
  publishDraft(
    input: unknown,
  ): Promise<PublishAiAgentDraftActionResult>;
}

function mapTenantSessionError(
  error: TenantSessionError,
): AiAgentActionFailure {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return { status: "unauthenticated" };
  }

  if (
    error.code ===
    "TENANT_MEMBERSHIP_REQUIRED"
  ) {
    return { status: "onboarding-required" };
  }

  if (
    error.code ===
    "TENANT_SELECTION_REQUIRED"
  ) {
    return {
      status: "tenant-selection-required",
    };
  }

  return { status: "permission-denied" };
}

function mapServiceError(
  error: AiAgentServiceError,
): AiAgentActionFailure {
  const statuses: Record<
    AiAgentServiceError["code"],
    | "invalid-input"
    | "not-found"
    | "state-conflict"
    | "invalid-state"
    | "server-error"
  > = {
    INVALID_INPUT: "invalid-input",
    NOT_FOUND: "not-found",
    STATE_CONFLICT: "state-conflict",
    INVALID_STATE: "invalid-state",
    PERSISTENCE_FAILED: "server-error",
  };

  return { status: statuses[error.code] };
}

export function createAiAgentActionHandler(
  dependencies: AiAgentActionHandlerDependencies,
): AiAgentActionHandler {
  return {
    async loadDetails(aiAgentKey) {
      if (!dependencies.applicationConfigured()) {
        return {
          status: "configuration-required",
        };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const details =
          await service.readDetails(
            session,
            aiAgentKey,
          );

        return {
          status: "loaded",
          aiAgent:
            toAiAgentDetailsView(details),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof AiAgentServiceError) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },

    async saveDraft(input) {
      if (!dependencies.applicationConfigured()) {
        return {
          status: "configuration-required",
        };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const result =
          await service.saveDraft(
            session,
            input,
          );

        return {
          status: "saved",
          outcome: result.outcome,
          agent: toAiAgentSummaryView(
            result.agent,
          ),
          draftVersion:
            toAiAgentVersionView(
              result.draftVersion,
            ),
        };
      } catch (error) {
        if (error instanceof AiAgentInputError) {
          return {
            status: "validation-error",
            issues: error.issues,
          };
        }

        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof AiAgentServiceError) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },

    async publishDraft(input) {
      if (!dependencies.applicationConfigured()) {
        return {
          status: "configuration-required",
        };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const result =
          await service.publishDraft(
            session,
            input,
          );

        return {
          status: "published",
          outcome: result.outcome,
          agent: toAiAgentSummaryView(
            result.agent,
          ),
          publishedVersion:
            toAiAgentVersionView(
              result.publishedVersion,
            ),
        };
      } catch (error) {
        if (
          error instanceof
          AiAgentActivationError
        ) {
          return {
            status: "activation-blocked",
            issues: error.issues,
          };
        }

        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof AiAgentServiceError) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}
