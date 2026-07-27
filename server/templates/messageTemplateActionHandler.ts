import type {
  MessageTemplateSubmissionReadiness,
} from "./messageTemplateSubmissionReadiness.ts";
import {
  MessageTemplateInputError,
  type MessageTemplateService,
} from "./messageTemplateService.ts";
import {
  MessageTemplateSubmissionError,
  type MessageTemplateSubmissionService,
} from "./messageTemplateSubmissionService.ts";
import type {
  TenantSession,
} from "../auth/tenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import type {
  SaveMessageTemplateDraftActionResult,
  SubmitMessageTemplateActionResult,
} from "./messageTemplateActionResult.ts";
import {
  MessageTemplateLockedError,
} from "../../db/messageTemplateRepository.ts";
import {
  toMessageTemplateView,
} from "./messageTemplateView.ts";

interface MessageTemplateDraftActionContext {
  session: TenantSession;
  service: MessageTemplateService;
}

interface MessageTemplateSubmissionActionContext {
  session: TenantSession;
  service: MessageTemplateSubmissionService;
}

export interface MessageTemplateActionHandlerDependencies {
  applicationConfigured(): boolean;
  readSubmissionReadiness():
    MessageTemplateSubmissionReadiness;
  createDraftContext():
    Promise<MessageTemplateDraftActionContext>;
  createSubmissionContext():
    Promise<MessageTemplateSubmissionActionContext>;
}

export interface MessageTemplateActionHandler {
  saveDraft(
    input: unknown,
  ): Promise<SaveMessageTemplateDraftActionResult>;
  submit(
    templateKey: unknown,
  ): Promise<SubmitMessageTemplateActionResult>;
}

function mapTenantSessionError(
  error: TenantSessionError,
) {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return { status: "unauthenticated" as const };
  }

  if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
    return { status: "onboarding-required" as const };
  }

  if (error.code === "TENANT_SELECTION_REQUIRED") {
    return {
      status: "tenant-selection-required" as const,
    };
  }

  return { status: "permission-denied" as const };
}

function mapSubmissionError(
  error: MessageTemplateSubmissionError,
): SubmitMessageTemplateActionResult {
  const statuses: Record<
    MessageTemplateSubmissionError["code"],
    SubmitMessageTemplateActionResult["status"]
  > = {
    INVALID_INPUT: "invalid-input",
    TEMPLATE_NOT_FOUND: "not-found",
    TEMPLATE_NOT_EDITABLE: "not-editable",
    META_NOT_CONNECTED: "meta-not-connected",
    CREDENTIAL_UNAVAILABLE: "credential-unavailable",
    STATE_CONFLICT: "state-conflict",
    SUBMISSION_REJECTED: "submission-rejected",
    SUBMISSION_UNCERTAIN: "submission-uncertain",
    SERVICE_UNAVAILABLE: "server-error",
  };

  return {
    status: statuses[error.code],
  } as SubmitMessageTemplateActionResult;
}

export function createMessageTemplateActionHandler(
  dependencies: MessageTemplateActionHandlerDependencies,
): MessageTemplateActionHandler {
  return {
    async saveDraft(input) {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      try {
        const { session, service } =
          await dependencies.createDraftContext();
        const template = await service.saveDraft(
          session,
          input,
        );

        return {
          status: "saved",
          template: toMessageTemplateView(template),
        };
      } catch (error) {
        if (error instanceof MessageTemplateInputError) {
          return {
            status: "validation-error",
            issues: error.issues,
          };
        }

        if (error instanceof MessageTemplateLockedError) {
          return { status: "not-editable" };
        }

        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        return { status: "server-error" };
      }
    },

    async submit(templateKey) {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      const readiness =
        dependencies.readSubmissionReadiness();

      if (readiness.status === "disabled") {
        return {
          status: "meta-configuration-required",
        };
      }

      if (readiness.status === "incomplete") {
        return {
          status: "meta-configuration-invalid",
        };
      }

      try {
        const { session, service } =
          await dependencies.createSubmissionContext();
        const template = await service.submit(
          session,
          templateKey,
        );

        return {
          status: "submitted",
          template: toMessageTemplateView(template),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (
          error instanceof MessageTemplateSubmissionError
        ) {
          return mapSubmissionError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}
