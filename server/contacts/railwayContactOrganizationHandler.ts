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
  RailwayContactOrganizationMutationOperation,
} from "../platform/railwayContactOrganizationMutationExecutor.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import type {
  ContactOrganizationActionResult,
} from "./contactOrganizationActionResult.ts";
import {
  ContactOrganizationInputError,
  parseContactOrganizationAssignment,
  parseContactOrganizationName,
  type ContactOrganizationInputIssue,
} from "./contactOrganizationService.ts";
import {
  parseRailwayContactOrganizationSnapshot,
} from "./railwayContactDirectoryHandler.ts";

const responseKeys = Object.freeze(["organization", "replayed"]);

export interface RailwayContactOrganizationHandlerDependencies {
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

export interface RailwayContactOrganizationHandler {
  readonly saveTag: (name: unknown) => Promise<ContactOrganizationActionResult>;
  readonly saveList: (name: unknown) => Promise<ContactOrganizationActionResult>;
  readonly setTagAssignment: (
    input: unknown,
  ) => Promise<ContactOrganizationActionResult>;
  readonly setListMembership: (
    input: unknown,
  ) => Promise<ContactOrganizationActionResult>;
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const actual = Object.keys(value).sort();

  return actual.length === keys.length &&
    actual.every((key, index) => key === keys[index]);
}

function mapFailure(code: string): ContactOrganizationActionResult {
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
    default:
      return { status: "server-error" };
  }
}

function validationFailure(
  error: unknown,
  fallbackIssue: ContactOrganizationInputIssue,
): ContactOrganizationActionResult {
  return Object.freeze({
    status: "validation-error",
    issue: error instanceof ContactOrganizationInputError
      ? error.issue
      : fallbackIssue,
  });
}

function requireDependencies(
  dependencies: Readonly<RailwayContactOrganizationHandlerDependencies>,
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
    throw new Error("Railway contact organization dependencies are invalid");
  }
}

export function createRailwayContactOrganizationHandler(
  dependencies: Readonly<RailwayContactOrganizationHandlerDependencies>,
): Readonly<RailwayContactOrganizationHandler> {
  requireDependencies(dependencies);

  async function execute(
    operation: RailwayContactOrganizationMutationOperation,
    payload: RailwayApiJsonObject,
    expectedContactIds: readonly number[],
  ): Promise<ContactOrganizationActionResult> {
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
        !isExactRecord(response.data, responseKeys) ||
        typeof response.data.replayed !== "boolean"
      ) {
        return { status: "server-error" };
      }

      const organization = parseRailwayContactOrganizationSnapshot(
        response.data.organization,
        expectedContactIds,
      );

      return organization === null
        ? { status: "server-error" }
        : Object.freeze({ status: "saved", organization });
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    saveTag(nameInput: unknown) {
      try {
        const name = parseContactOrganizationName(nameInput);
        return execute(
          "contacts.organization.tag.save",
          Object.freeze({ name: name.name }),
          [],
        );
      } catch (error) {
        return Promise.resolve(validationFailure(error, "invalid-name"));
      }
    },
    saveList(nameInput: unknown) {
      try {
        const name = parseContactOrganizationName(nameInput);
        return execute(
          "contacts.organization.list.save",
          Object.freeze({ name: name.name }),
          [],
        );
      } catch (error) {
        return Promise.resolve(validationFailure(error, "invalid-name"));
      }
    },
    setTagAssignment(input: unknown) {
      try {
        const assignment = parseContactOrganizationAssignment(input);
        return execute(
          "contacts.organization.tag-assignment",
          assignment,
          [assignment.contactId],
        );
      } catch (error) {
        return Promise.resolve(
          validationFailure(error, "invalid-assignment"),
        );
      }
    },
    setListMembership(input: unknown) {
      try {
        const assignment = parseContactOrganizationAssignment(input);
        return execute(
          "contacts.organization.list-membership",
          assignment,
          [assignment.contactId],
        );
      } catch (error) {
        return Promise.resolve(
          validationFailure(error, "invalid-assignment"),
        );
      }
    },
  });
}
