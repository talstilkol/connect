import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type { RailwayApiClientConfigurationState } from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "../platform/railwayApiMutationExecutor.ts";
import type { RailwayApiServerIdentityState } from "../platform/railwayApiServerIdentity.ts";
import type {
  ProcessContactImportChunkActionResult,
  StartContactImportActionResult,
} from "./contactImportActionResult.ts";
import {
  ContactImportInputError,
  parseContactImportChunkInput,
  parseStartContactImportInput,
  type ContactImportInputIssue,
} from "./contactImportService.ts";
import { parseRailwayContactImportResponse } from "./railwayContactImportResult.ts";

export interface RailwayContactImportHandlerDependencies {
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

export interface RailwayContactImportHandler {
  readonly start: (input: unknown) => Promise<StartContactImportActionResult>;
  readonly processChunk: (
    input: unknown,
  ) => Promise<ProcessContactImportChunkActionResult>;
}

function mapFailure(code: string) {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" } as const;
    case "TENANT_MEMBERSHIP_REQUIRED":
      return { status: "onboarding-required" } as const;
    case "TENANT_SELECTION_REQUIRED":
      return { status: "tenant-selection-required" } as const;
    case "AUTHORIZATION_DENIED":
    case "PERMISSION_DENIED":
      return { status: "permission-denied" } as const;
    case "NOT_FOUND":
      return { status: "not-found" } as const;
    case "CONFLICT":
      return { status: "conflict" } as const;
    default:
      return { status: "server-error" } as const;
  }
}

function validationFailure(error: unknown, fallback: ContactImportInputIssue) {
  return Object.freeze({
    status: "validation-error" as const,
    issue: error instanceof ContactImportInputError ? error.issue : fallback,
  });
}

function requireDependencies(
  dependencies: Readonly<RailwayContactImportHandlerDependencies>,
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
    throw new Error("Railway contact import dependencies are invalid");
  }
}

export function createRailwayContactImportHandler(
  dependencies: Readonly<RailwayContactImportHandlerDependencies>,
): Readonly<RailwayContactImportHandler> {
  requireDependencies(dependencies);

  async function execute(
    operation: "contacts.import.start" | "contacts.import.chunk",
    payload: RailwayApiJsonObject,
  ): Promise<StartContactImportActionResult | ProcessContactImportChunkActionResult> {
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
        operation,
        payload,
      );
    } catch {
      return { status: "server-error" };
    }

    const request = Object.freeze({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation,
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

      const responseData = response.data as RailwayApiJsonObject;

      if (
        Object.keys(responseData).sort().join(",") !==
          "contacts,job,replayed" ||
        typeof responseData.replayed !== "boolean"
      ) {
        return { status: "server-error" };
      }

      const parsed = parseRailwayContactImportResponse({
        job: responseData.job,
        contacts: responseData.contacts,
      });

      if (parsed === null) {
        return { status: "server-error" };
      }

      return operation === "contacts.import.start"
        ? Object.freeze({ status: "ready", job: parsed.job })
        : Object.freeze({
            status: "processed",
            job: parsed.job,
            contacts: parsed.contacts,
          });
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    start(input: unknown) {
      try {
        const parsed = parseStartContactImportInput(input);
        const payload = Object.freeze({
          fileName: parsed.fileName,
          sourceDigest: parsed.sourceDigest,
          totalRows: parsed.totalRows,
          mapping: Object.freeze({ ...parsed.mapping }),
        }) as RailwayApiJsonObject;

        return execute("contacts.import.start", payload) as Promise<StartContactImportActionResult>;
      } catch (error) {
        return Promise.resolve(validationFailure(error, "invalid-start-input"));
      }
    },
    processChunk(input: unknown) {
      try {
        const parsed = parseContactImportChunkInput(input);
        const payload = Object.freeze({
          jobId: parsed.jobId,
          rows: Object.freeze(parsed.rows.map((row) => Object.freeze({ ...row }))),
        }) as RailwayApiJsonObject;

        return execute("contacts.import.chunk", payload) as Promise<ProcessContactImportChunkActionResult>;
      } catch (error) {
        return Promise.resolve(validationFailure(error, "invalid-chunk-input"));
      }
    },
  });
}
