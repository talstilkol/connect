import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type { RailwayApiClientConfigurationState } from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "../platform/railwayApiMutationExecutor.ts";
import type { RailwayApiServerIdentityState } from "../platform/railwayApiServerIdentity.ts";
import { RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION } from "../platform/railwayMessageTemplateDraftMutationExecutor.ts";
import type { SaveMessageTemplateDraftActionResult } from "./messageTemplateActionResult.ts";
import {
  MessageTemplateInputError,
  parseMessageTemplateDraftInput,
} from "./messageTemplateService.ts";
import { parseRailwayMessageTemplateDraftView } from "./railwayMessageTemplateDraftResult.ts";

export interface RailwayMessageTemplateDraftHandlerDependencies {
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

function mapFailure(code: string): SaveMessageTemplateDraftActionResult {
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
    case "INVALID_TRANSITION":
      return { status: "not-editable" };
    default:
      return { status: "server-error" };
  }
}

function requireDependencies(
  dependencies: Readonly<RailwayMessageTemplateDraftHandlerDependencies>,
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
    throw new Error("Railway message template dependencies are invalid");
  }
}

export function createRailwayMessageTemplateDraftHandler(
  dependencies: Readonly<RailwayMessageTemplateDraftHandlerDependencies>,
) {
  requireDependencies(dependencies);

  return Object.freeze({
    async save(input: unknown): Promise<SaveMessageTemplateDraftActionResult> {
      let payload: RailwayApiJsonObject;

      try {
        const draft = parseMessageTemplateDraftInput(input);
        payload = Object.freeze({
          name: draft.name,
          category: draft.category,
          language: draft.language,
          header: draft.header,
          body: draft.body,
          footer: draft.footer,
          variableExamples: Object.freeze({ ...draft.variableExamples }),
          buttonMode: draft.buttonMode,
          quickReplies: Object.freeze([...draft.quickReplies]),
          urlButton: Object.freeze({ ...draft.urlButton }),
          phoneButton: Object.freeze({ ...draft.phoneButton }),
        }) as RailwayApiJsonObject;
      } catch (error) {
        return {
          status: "validation-error",
          issues: error instanceof MessageTemplateInputError
            ? error.issues
            : ["invalid-input"],
        };
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

      let idempotencyKey: string;

      try {
        idempotencyKey = await deriveRailwayApiDeterministicIdempotencyKey(
          RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION,
          payload,
        );
      } catch {
        return { status: "server-error" };
      }

      const request = Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation: RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION,
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
          typeof response.data !== "object" ||
          response.data === null ||
          Array.isArray(response.data)
        ) {
          return { status: "server-error" };
        }

        const data = response.data as RailwayApiJsonObject;

        if (
          Object.keys(data).sort().join(",") !== "replayed,template" ||
          typeof data.replayed !== "boolean"
        ) {
          return { status: "server-error" };
        }

        const template = parseRailwayMessageTemplateDraftView(data.template);

        return template === null
          ? { status: "server-error" }
          : Object.freeze({ status: "saved", template });
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
