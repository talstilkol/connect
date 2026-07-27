import {
  createMessageTemplateRepository,
} from "../../db/messageTemplateRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import type {
  MessageTemplateDirectoryStatus,
  MessageTemplateView,
} from "../../shared/domain/messageTemplateView.ts";
import {
  inspectClerkConfiguration,
} from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantSession,
} from "../auth/currentTenantSession.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import {
  hasPermission,
} from "../../shared/domain/model.ts";
import {
  createMessageTemplateService,
} from "./messageTemplateService.ts";
import {
  toMessageTemplateView,
} from "./messageTemplateView.ts";

export type CurrentMessageTemplatesResult =
  | {
      status: "ready";
      templates: readonly MessageTemplateView[];
      canWrite: boolean;
    }
  | {
      status: Exclude<
        MessageTemplateDirectoryStatus,
        "ready"
      >;
      templates: readonly [];
      canWrite: false;
    };

function tenantFailureStatus(
  error: TenantSessionError,
): Exclude<MessageTemplateDirectoryStatus, "ready"> {
  if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
    return "onboarding-required";
  }

  if (error.code === "TENANT_SELECTION_REQUIRED") {
    return "tenant-selection-required";
  }

  if (error.code === "PERMISSION_DENIED") {
    return "permission-denied";
  }

  return "server-error";
}

export async function readCurrentMessageTemplates():
Promise<CurrentMessageTemplatesResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return {
      status: "configuration-required",
      templates: [],
      canWrite: false,
    };
  }

  try {
    const database = await requireRuntimeDatabase();
    const session =
      await requireCurrentTenantSession(database);
    const service = createMessageTemplateService(
      createMessageTemplateRepository(database),
    );
    const templates = await service.list(session);

    return {
      status: "ready",
      templates: templates.map(toMessageTemplateView),
      canWrite: hasPermission(
        session.role,
        "templates.write",
      ),
    };
  } catch (error) {
    return {
      status:
        error instanceof TenantSessionError
          ? tenantFailureStatus(error)
          : "server-error",
      templates: [],
      canWrite: false,
    };
  }
}
