import type {
  RailwayApiClient,
} from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
} from "../platform/railwayMessageTemplateSubmissionMutationExecutor.ts";
import type {
  SubmitMessageTemplateActionResult,
} from "./messageTemplateActionResult.ts";

export interface RailwayMessageTemplateSubmissionHandlerDependencies {
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

const templateKeyPattern = /^template_v1_[0-9a-f]{64}$/;
const submissionKeyPattern = /^template_submission_v1_[0-9a-f]{64}$/;

function mapFailure(code: string): SubmitMessageTemplateActionResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "TENANT_MEMBERSHIP_REQUIRED":
      return { status: "onboarding-required" };
    case "TENANT_SELECTION_REQUIRED":
      return { status: "tenant-selection-required" };
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return { status: "permission-denied" };
    case "NOT_FOUND":
      return { status: "not-found" };
    case "INVALID_TRANSITION":
      return { status: "not-editable" };
    default:
      return { status: "server-error" };
  }
}

function requireDependencies(
  dependencies: Readonly<RailwayMessageTemplateSubmissionHandlerDependencies>,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "applicationConfigured,createClient,inspectConfiguration,resolveIdentity" ||
    typeof dependencies.applicationConfigured !== "function" ||
    typeof dependencies.inspectConfiguration !== "function" ||
    typeof dependencies.resolveIdentity !== "function" ||
    typeof dependencies.createClient !== "function"
  ) {
    throw new Error("Railway message template submission dependencies are invalid");
  }
}

export function createRailwayMessageTemplateSubmissionHandler(
  dependencies: Readonly<RailwayMessageTemplateSubmissionHandlerDependencies>,
) {
  requireDependencies(dependencies);

  return Object.freeze({
    async submit(templateKeyInput: unknown): Promise<SubmitMessageTemplateActionResult> {
      if (
        typeof templateKeyInput !== "string" ||
        !templateKeyPattern.test(templateKeyInput)
      ) {
        return { status: "invalid-input" };
      }

      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      const configurationState = dependencies.inspectConfiguration();
      if (configurationState.status !== "configured") {
        return { status: "configuration-required" };
      }

      let identityState: RailwayApiServerIdentityState;
      try {
        identityState = await dependencies.resolveIdentity();
      } catch {
        return { status: "server-error" };
      }

      if (identityState.status === "unauthenticated") {
        return { status: "unauthenticated" };
      }
      if (identityState.status !== "authenticated") {
        return { status: "server-error" };
      }

      const payload = Object.freeze({
        templateKey: templateKeyInput,
      }) as RailwayApiJsonObject;
      let idempotencyKey: string;

      try {
        idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
          RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
          payload,
        );
      } catch {
        return { status: "server-error" };
      }

      const request = Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation: RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
        requestKind: "mutation",
        idempotencyKey,
        payload,
      } satisfies RailwayApiRequestEnvelope);

      try {
        const client = dependencies.createClient({
          ...configurationState.configuration,
          oidcToken: identityState.oidcToken,
          userSessionToken: identityState.userSessionToken,
        });
        const response = await client.call(request);

        if (response.outcome !== "ok") {
          return mapFailure(response.code);
        }
        if (
          typeof response.data !== "object" || response.data === null ||
          Array.isArray(response.data)
        ) {
          return { status: "server-error" };
        }

        const data = response.data as RailwayApiJsonObject;
        if (
          Object.keys(data).sort().join(",") !== "replayed,status,submissionKey" ||
          typeof data.replayed !== "boolean" || data.status !== "pending" ||
          typeof data.submissionKey !== "string" ||
          !submissionKeyPattern.test(data.submissionKey)
        ) {
          return { status: "server-error" };
        }

        return Object.freeze({
          status: "submission-staged" as const,
          submissionKey: data.submissionKey,
        });
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
