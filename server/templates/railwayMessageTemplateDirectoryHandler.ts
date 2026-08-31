import type { MessageTemplateView } from "../../shared/domain/messageTemplateView.ts";
import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type { RailwayApiClientConfigurationState } from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import type { RailwayApiServerIdentityState } from "../platform/railwayApiServerIdentity.ts";
import type { CurrentMessageTemplatesResult } from "./currentMessageTemplates.ts";
import { parseRailwayMessageTemplateView } from "./railwayMessageTemplateDraftResult.ts";

const operationId = "templates.list";
const maximumTemplates = 100;

export interface RailwayMessageTemplateDirectoryHandlerDependencies {
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

function requireDependencies(
  dependencies: Readonly<RailwayMessageTemplateDirectoryHandlerDependencies>,
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
    throw new Error("Railway message template directory dependencies are invalid");
  }
}

function failure(
  status: Exclude<CurrentMessageTemplatesResult["status"], "ready">,
): CurrentMessageTemplatesResult {
  return Object.freeze({
    status,
    templates: [] as const,
    canWrite: false,
  });
}

function mapFailure(code: string): CurrentMessageTemplatesResult {
  switch (code) {
    case "TENANT_MEMBERSHIP_REQUIRED":
      return failure("onboarding-required");
    case "TENANT_SELECTION_REQUIRED":
      return failure("tenant-selection-required");
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return failure("permission-denied");
    default:
      return failure("server-error");
  }
}

function parseTemplates(value: unknown): readonly Readonly<MessageTemplateView>[] | null {
  if (!Array.isArray(value) || value.length > maximumTemplates) {
    return null;
  }

  const templates: Readonly<MessageTemplateView>[] = [];
  const keys = new Set<string>();
  let previous: Readonly<MessageTemplateView> | null = null;

  for (const item of value) {
    const template = parseRailwayMessageTemplateView(item);

    if (
      template === null ||
      keys.has(template.templateKey) ||
      (previous !== null &&
        (template.updatedAt > previous.updatedAt ||
          (template.updatedAt === previous.updatedAt &&
            template.templateKey <= previous.templateKey)))
    ) {
      return null;
    }

    keys.add(template.templateKey);
    templates.push(template);
    previous = template;
  }

  return Object.freeze(templates);
}

export function createRailwayMessageTemplateDirectoryHandler(
  dependencies: Readonly<RailwayMessageTemplateDirectoryHandlerDependencies>,
) {
  requireDependencies(dependencies);

  return Object.freeze({
    async read(): Promise<CurrentMessageTemplatesResult> {
      if (!dependencies.applicationConfigured()) {
        return failure("configuration-required");
      }

      const configurationState = dependencies.inspectConfiguration();

      if (configurationState.status !== "configured") {
        return failure("configuration-required");
      }

      let identityState: RailwayApiServerIdentityState;

      try {
        identityState = await dependencies.resolveIdentity();
      } catch {
        return failure("server-error");
      }

      if (identityState.status === "unauthenticated") {
        return failure("server-error");
      }

      if (identityState.status !== "authenticated") {
        return failure("server-error");
      }

      const request = Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation: operationId,
        requestKind: "query",
        idempotencyKey: null,
        payload: Object.freeze({}),
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
          return failure("server-error");
        }

        const data = response.data as Readonly<Record<string, unknown>>;

        if (
          Object.keys(data).sort().join(",") !== "canWrite,templates" ||
          typeof data.canWrite !== "boolean"
        ) {
          return failure("server-error");
        }

        const templates = parseTemplates(data.templates);

        return templates === null
          ? failure("server-error")
          : Object.freeze({
              status: "ready",
              templates,
              canWrite: data.canWrite,
            });
      } catch {
        return failure("server-error");
      }
    },
  });
}
