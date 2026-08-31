import type { RailwayApiClient } from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiJsonObject,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import {
  validateContactConsentTransition,
} from "../../shared/validation/contactConsent.ts";
import type { ContactConsentActionResult } from "./contactActionResult.ts";
import {
  parseRailwayContactRecord,
} from "./railwayContactDirectoryHandler.ts";

type ContactConsentAction = "grant" | "unsubscribe";

const responseKeys = Object.freeze(["contact"]);
const transitionKeys = Object.freeze([
  "evidenceReference",
  "occurredAt",
  "source",
]);

export interface RailwayContactConsentHandlerDependencies {
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

export interface RailwayContactConsentHandler {
  readonly grant: (
    contactId: number,
    input: unknown,
  ) => Promise<ContactConsentActionResult>;
  readonly unsubscribe: (
    contactId: number,
    input: unknown,
  ) => Promise<ContactConsentActionResult>;
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

  const actualKeys = Object.keys(value).sort();

  return actualKeys.length === keys.length &&
    actualKeys.every((key, index) => key === keys[index]);
}

function operationFor(action: ContactConsentAction): string {
  return action === "grant"
    ? "contacts.consent.grant"
    : "contacts.consent.unsubscribe";
}

function mapFailure(code: string): ContactConsentActionResult {
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

function requireDependencies(
  dependencies: Readonly<RailwayContactConsentHandlerDependencies>,
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
    throw new Error("Railway contact consent dependencies are invalid");
  }
}

export function createRailwayContactConsentHandler(
  dependencies: Readonly<RailwayContactConsentHandlerDependencies>,
): Readonly<RailwayContactConsentHandler> {
  requireDependencies(dependencies);

  async function record(
    action: ContactConsentAction,
    contactId: number,
    input: unknown,
  ): Promise<ContactConsentActionResult> {
    if (!dependencies.applicationConfigured()) {
      return { status: "configuration-required" };
    }

    const configurationState = dependencies.inspectConfiguration();

    if (configurationState.status !== "configured") {
      return { status: "configuration-required" };
    }

    if (
      !Number.isSafeInteger(contactId) ||
      contactId <= 0 ||
      !isExactRecord(input, transitionKeys)
    ) {
      return { status: "server-error" };
    }

    const validation = validateContactConsentTransition(input);

    if (!validation.success) {
      return Object.freeze({
        status: "validation-error",
        issues: Object.freeze(
          validation.issues.map((issue) => Object.freeze({ ...issue })),
        ),
      });
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

    const operation = operationFor(action);
    const payload = Object.freeze({
      contactId,
      source: validation.value.source,
      occurredAt: validation.value.occurredAt,
      evidenceReference: validation.value.evidenceReference,
    } satisfies RailwayApiJsonObject);
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

      if (!isExactRecord(response.data, responseKeys)) {
        return { status: "server-error" };
      }

      const contact = parseRailwayContactRecord(response.data.contact);

      return contact !== null && contact.id === contactId
        ? Object.freeze({ status: "saved", contact })
        : { status: "server-error" };
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    grant(contactId: number, input: unknown) {
      return record("grant", contactId, input);
    },
    unsubscribe(contactId: number, input: unknown) {
      return record("unsubscribe", contactId, input);
    },
  });
}
