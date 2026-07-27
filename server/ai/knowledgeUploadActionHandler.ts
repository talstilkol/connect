import {
  TenantSessionError,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  KnowledgeUploadServiceError,
  type KnowledgeUploadFile,
  type KnowledgeUploadService,
} from "./knowledgeUploadService.ts";
import type {
  KnowledgeUploadActionFailure,
  UploadKnowledgeSourceActionResult,
} from "./knowledgeUploadActionResult.ts";
import {
  toKnowledgeSourceView,
} from "./aiAgentView.ts";

interface KnowledgeUploadActionContext {
  session: TenantSession;
  service: KnowledgeUploadService;
}

export interface KnowledgeUploadActionHandlerDependencies {
  createContext(): Promise<KnowledgeUploadActionContext>;
}

export interface KnowledgeUploadActionHandler {
  upload(
    input: unknown,
  ): Promise<UploadKnowledgeSourceActionResult>;
}

function mapTenantSessionError(
  error: TenantSessionError,
): KnowledgeUploadActionFailure {
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
  error: KnowledgeUploadServiceError,
): KnowledgeUploadActionFailure {
  const statuses: Record<
    KnowledgeUploadServiceError["code"],
    | "dependency-unavailable"
    | "invalid-input"
    | "state-conflict"
    | "invalid-state"
    | "server-error"
  > = {
    INVALID_INPUT: "invalid-input",
    DEPENDENCY_UNAVAILABLE:
      "dependency-unavailable",
    STATE_CONFLICT: "state-conflict",
    INVALID_STATE: "invalid-state",
    PERSISTENCE_FAILED: "server-error",
  };

  return { status: statuses[error.code] };
}

function parseUploadFile(
  input: unknown,
): KnowledgeUploadFile | null {
  if (!(input instanceof FormData)) {
    return null;
  }

  const keys = [...input.keys()];

  if (
    keys.length !== 1 ||
    keys[0] !== "file"
  ) {
    return null;
  }

  const file = input.get("file");

  if (
    file === null ||
    typeof file === "string" ||
    typeof file.name !== "string" ||
    typeof file.type !== "string" ||
    typeof file.size !== "number" ||
    typeof file.arrayBuffer !== "function"
  ) {
    return null;
  }

  return file;
}

export function createKnowledgeUploadActionHandler(
  dependencies:
    KnowledgeUploadActionHandlerDependencies,
): KnowledgeUploadActionHandler {
  return {
    async upload(input) {
      const file = parseUploadFile(input);

      if (!file) {
        return { status: "invalid-input" };
      }

      try {
        const { session, service } =
          await dependencies.createContext();
        const result = await service.upload(
          session,
          file,
        );

        if (result.outcome === "rejected") {
          return {
            status: "rejected",
            stage: result.stage,
            errorCode: result.errorCode,
            source: result.source
              ? toKnowledgeSourceView(
                  result.source,
                )
              : null,
          };
        }

        return {
          status: "processing",
          outcome: result.outcome,
          source: toKnowledgeSourceView(
            result.source,
          ),
        };
      } catch (error) {
        if (error instanceof TenantSessionError) {
          return mapTenantSessionError(error);
        }

        if (
          error instanceof
          KnowledgeUploadServiceError
        ) {
          return mapServiceError(error);
        }

        return { status: "server-error" };
      }
    },
  };
}
