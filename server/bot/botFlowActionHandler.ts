import {
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";
import type {
  BotFlowActionFailure,
  LoadBotFlowDetailsActionResult,
  PublishBotFlowDraftActionResult,
  SaveBotFlowDraftActionResult,
} from "./botFlowActionResult.ts";
import {
  BotFlowInputError,
  BotFlowServiceError,
  type BotFlowService,
} from "./botFlowService.ts";
import {
  toBotFlowDetailsView,
  toBotFlowSummaryView,
  toBotFlowVersionView,
} from "./botFlowView.ts";

interface BotFlowActionContext {
  session: TenantSession;
  service: BotFlowService;
}

export interface BotFlowActionHandlerDependencies {
  applicationConfigured(): boolean;
  createContext(): Promise<BotFlowActionContext>;
}

export interface BotFlowActionHandler {
  loadDetails(
    botFlowKey: unknown,
  ): Promise<LoadBotFlowDetailsActionResult>;
  saveDraft(
    input: unknown,
  ): Promise<SaveBotFlowDraftActionResult>;
  publishDraft(
    input: unknown,
  ): Promise<PublishBotFlowDraftActionResult>;
}

function mapTenantSessionError(
  error: TenantSessionError,
): BotFlowActionFailure {
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
  error: BotFlowServiceError,
): BotFlowActionFailure {
  const statuses: Record<
    BotFlowServiceError["code"],
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

export function createBotFlowActionHandler(
  dependencies: BotFlowActionHandlerDependencies,
): BotFlowActionHandler {
  return {
    async loadDetails(botFlowKey) {
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
            botFlowKey,
          );

        return {
          status: "loaded",
          botFlow:
            toBotFlowDetailsView(details),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof BotFlowServiceError) {
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
          flow: toBotFlowSummaryView(
            result.flow,
          ),
          draftVersion:
            toBotFlowVersionView(
              result.draftVersion,
            ),
        };
      } catch (error) {
        if (error instanceof BotFlowInputError) {
          return {
            status: "validation-error",
            issues: error.issues,
          };
        }

        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof BotFlowServiceError) {
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
          flow: toBotFlowSummaryView(
            result.flow,
          ),
          publishedVersion:
            toBotFlowVersionView(
              result.publishedVersion,
            ),
        };
      } catch (error) {
        if (error instanceof BotFlowInputError) {
          return {
            status: "validation-error",
            issues: error.issues,
          };
        }

        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof BotFlowServiceError) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}
