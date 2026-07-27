import type {
  TenantSession,
} from "../auth/tenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import type {
  MessageTemplateSubmissionReadiness,
} from "./messageTemplateSubmissionReadiness.ts";
import type {
  SyncMessageTemplatesActionResult,
} from "./messageTemplateActionResult.ts";
import {
  MessageTemplateSyncError,
  type MessageTemplateSyncService,
} from "./messageTemplateSyncService.ts";
import {
  toMessageTemplateView,
} from "./messageTemplateView.ts";

interface MessageTemplateSyncActionContext {
  session: TenantSession;
  service: MessageTemplateSyncService;
}

export interface MessageTemplateSyncActionHandlerDependencies {
  applicationConfigured(): boolean;
  readSyncReadiness():
    MessageTemplateSubmissionReadiness;
  createSyncContext():
    Promise<MessageTemplateSyncActionContext>;
}

function mapTenantSessionError(
  error: TenantSessionError,
): SyncMessageTemplatesActionResult {
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

function mapSyncError(
  error: MessageTemplateSyncError,
): SyncMessageTemplatesActionResult {
  const statuses: Record<
    MessageTemplateSyncError["code"],
    SyncMessageTemplatesActionResult["status"]
  > = {
    META_NOT_CONNECTED: "meta-not-connected",
    CREDENTIAL_UNAVAILABLE: "credential-unavailable",
    IDENTITY_CONFLICT: "identity-conflict",
    SYNC_FAILED: "sync-failed",
  };

  return {
    status: statuses[error.code],
  } as SyncMessageTemplatesActionResult;
}

export function createMessageTemplateSyncActionHandler(
  dependencies: MessageTemplateSyncActionHandlerDependencies,
): {
  sync(): Promise<SyncMessageTemplatesActionResult>;
} {
  return {
    async sync() {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      const readiness = dependencies.readSyncReadiness();

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
          await dependencies.createSyncContext();
        const result = await service.sync(session);

        return {
          status: "synced",
          templates: result.templates.map(
            toMessageTemplateView,
          ),
          summary: result.summary,
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (error instanceof MessageTemplateSyncError) {
          return mapSyncError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}
