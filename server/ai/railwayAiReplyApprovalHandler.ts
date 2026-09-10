import type { AiReplyApprovalDirectoryStatus } from
  "../../shared/domain/aiReplyApprovalView.ts";
import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type { RailwayApiClientConfigurationState } from
  "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  normalizeRailwayApiJson,
  type RailwayApiJsonObject,
} from "../platform/railwayApiContract.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from
  "../platform/railwayApiMutationExecutor.ts";
import type { RailwayApiServerIdentityState } from
  "../platform/railwayApiServerIdentity.ts";
import { RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION } from
  "../platform/railwayAiReplyApprovalMutationExecutor.ts";
import type {
  DecideAiReplyApprovalActionResult,
  LoadAiReplyApprovalsActionResult,
} from "./aiReplyApprovalActionResult.ts";
import { parseAiReplyApprovalDecisionRequest } from
  "./aiReplyApprovalService.ts";
import {
  parseRailwayAiReplyApprovalDecisionView,
  parseRailwayAiReplyApprovalDirectory,
} from "./railwayAiReplyApprovalResult.ts";

export interface RailwayAiReplyApprovalHandlerDependencies {
  readonly applicationConfigured: () => boolean;
  readonly inspectConfiguration: () => RailwayApiClientConfigurationState;
  readonly resolveIdentity: () => Promise<RailwayApiServerIdentityState>;
  readonly createClient: (
    configuration: Readonly<{
      apiOrigin: string;
      deploymentEnvironment: "development" | "preview" | "production";
      oidcToken: string;
      userSessionToken: string;
    }>,
  ) => RailwayApiClient;
}

type ClientContextResult =
  | Readonly<{ status: "ready"; client: RailwayApiClient }>
  | Readonly<{
      status: "configuration-required" | "unauthenticated" | "server-error";
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function requireDependencies(
  dependencies: Readonly<RailwayAiReplyApprovalHandlerDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "applicationConfigured,createClient,inspectConfiguration,resolveIdentity" ||
    typeof dependencies.applicationConfigured !== "function" ||
    typeof dependencies.inspectConfiguration !== "function" ||
    typeof dependencies.resolveIdentity !== "function" ||
    typeof dependencies.createClient !== "function"
  ) {
    throw new Error("Railway AI reply approval dependencies are invalid");
  }
}

function mapFailureStatus(
  code: string,
): Exclude<AiReplyApprovalDirectoryStatus, "ready"> | "invalid-input" |
  "not-found" | "state-conflict" | "invalid-state" {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return "unauthenticated";
    case "TENANT_MEMBERSHIP_REQUIRED":
      return "onboarding-required";
    case "TENANT_SELECTION_REQUIRED":
      return "tenant-selection-required";
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return "permission-denied";
    case "INVALID_REQUEST":
      return "invalid-input";
    case "CONFLICT":
      return "state-conflict";
    case "NOT_FOUND":
      return "not-found";
    case "INVALID_TRANSITION":
      return "invalid-state";
    default:
      return "server-error";
  }
}

export function createRailwayAiReplyApprovalHandler(
  dependencies: Readonly<RailwayAiReplyApprovalHandlerDependencies>,
) {
  requireDependencies(dependencies);

  async function createContext(): Promise<ClientContextResult> {
    if (!dependencies.applicationConfigured()) {
      return { status: "configuration-required" };
    }
    const configuration = dependencies.inspectConfiguration();
    if (configuration.status !== "configured") {
      return { status: "configuration-required" };
    }
    let identity: RailwayApiServerIdentityState;
    try {
      identity = await dependencies.resolveIdentity();
    } catch {
      return { status: "server-error" };
    }
    if (identity.status === "unauthenticated") {
      return { status: "unauthenticated" };
    }
    if (identity.status !== "authenticated") {
      return { status: "server-error" };
    }
    try {
      return Object.freeze({
        status: "ready" as const,
        client: dependencies.createClient({
          ...configuration.configuration,
          oidcToken: identity.oidcToken,
          userSessionToken: identity.userSessionToken,
        }),
      });
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    async load(): Promise<LoadAiReplyApprovalsActionResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return context;
      }
      try {
        const response = await context.client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: "ai.reply-approvals.list",
          requestKind: "query" as const,
          idempotencyKey: null,
          payload: Object.freeze({}),
        }));
        if (response.outcome !== "ok") {
          return { status: mapFailureStatus(response.code) } as
            LoadAiReplyApprovalsActionResult;
        }
        const directory = parseRailwayAiReplyApprovalDirectory(response.data);
        return directory === null
          ? { status: "server-error" }
          : Object.freeze({ status: "loaded" as const, directory });
      } catch {
        return { status: "server-error" };
      }
    },

    async decide(input: unknown): Promise<DecideAiReplyApprovalActionResult> {
      const context = await createContext();
      if (context.status !== "ready") {
        return context;
      }
      let normalized: RailwayApiJsonObject;
      try {
        const candidate = normalizeRailwayApiJson(input);
        if (!isRecord(candidate)) {
          return { status: "invalid-input" };
        }
        normalized = candidate;
      } catch {
        return { status: "invalid-input" };
      }
      if (parseAiReplyApprovalDecisionRequest(normalized) === null) {
        return { status: "invalid-input" };
      }
      let idempotencyKey: string;
      try {
        idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
          RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION,
          normalized,
        );
      } catch {
        return { status: "server-error" };
      }
      try {
        const response = await context.client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION,
          requestKind: "mutation" as const,
          idempotencyKey,
          payload: normalized,
        }));
        if (response.outcome !== "ok") {
          return { status: mapFailureStatus(response.code) } as
            DecideAiReplyApprovalActionResult;
        }
        if (
          isRecord(response.data) &&
          hasExactKeys(response.data, ["outcome", "replayed"]) &&
          response.data.replayed === false &&
          ["not-found", "state-conflict", "invalid-state"].includes(
            String(response.data.outcome),
          )
        ) {
          return { status: response.data.outcome } as
            DecideAiReplyApprovalActionResult;
        }
        if (
          !isRecord(response.data) ||
          !hasExactKeys(response.data, ["approval", "outcome", "replayed"]) ||
          (response.data.outcome !== "updated" &&
            response.data.outcome !== "unchanged") ||
          typeof response.data.replayed !== "boolean"
        ) {
          return { status: "server-error" };
        }
        const approval = parseRailwayAiReplyApprovalDecisionView(
          response.data.approval,
        );
        return approval === null
          ? { status: "server-error" }
          : Object.freeze({
              status: "decided" as const,
              outcome: response.data.outcome,
              approval,
            });
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
