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
  validatePersistedContact,
  type PersistedContactProfile,
} from "../../shared/validation/persistedContact.ts";
import type { SaveContactActionResult } from "./contactActionResult.ts";
import {
  parseRailwayContactRecord,
} from "./railwayContactDirectoryHandler.ts";

const operationId = "contacts.save";
const successKeys = Object.freeze(["contact", "replayed"]);
const inputKeys = Object.freeze([
  "company",
  "email",
  "firstName",
  "lastName",
  "phoneNumber",
  "submissionOccurredAt",
]);
const canonicalTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export interface RailwayContactMutationHandlerDependencies {
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

export interface RailwayContactMutationHandler {
  readonly save: (input: unknown) => Promise<SaveContactActionResult>;
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

  return (
    actualKeys.length === keys.length &&
    actualKeys.every((key, index) => key === keys[index])
  );
}

function createPayload(
  profile: Readonly<PersistedContactProfile>,
  submissionOccurredAt: string,
): Readonly<RailwayApiJsonObject> {
  return Object.freeze({
    phoneNumber: profile.phoneNumber,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    company: profile.company,
    submissionOccurredAt,
  });
}

function parseSubmissionOccurredAt(input: unknown): string | null {
  if (
    !isExactRecord(input, inputKeys) ||
    typeof input.submissionOccurredAt !== "string" ||
    !canonicalTimestampPattern.test(input.submissionOccurredAt)
  ) {
    return null;
  }

  const milliseconds = Date.parse(input.submissionOccurredAt);

  return Number.isFinite(milliseconds) &&
      new Date(milliseconds).toISOString() === input.submissionOccurredAt
    ? input.submissionOccurredAt
    : null;
}

function parseSuccess(
  data: unknown,
  profile: Readonly<PersistedContactProfile>,
): SaveContactActionResult {
  if (
    !isExactRecord(data, successKeys) ||
    typeof data.replayed !== "boolean"
  ) {
    return { status: "server-error" };
  }

  const contact = parseRailwayContactRecord(data.contact);

  if (
    contact === null ||
    contact.phoneNumber !== profile.phoneNumber ||
    contact.firstName !== profile.firstName ||
    contact.lastName !== profile.lastName ||
    contact.email !== profile.email ||
    contact.company !== profile.company
  ) {
    return { status: "server-error" };
  }

  return Object.freeze({ status: "saved", contact });
}

function mapFailure(code: string): SaveContactActionResult {
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
  dependencies: Readonly<RailwayContactMutationHandlerDependencies>,
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
    throw new Error("Railway contact mutation dependencies are invalid");
  }
}

export function createRailwayContactMutationHandler(
  dependencies: Readonly<RailwayContactMutationHandlerDependencies>,
): Readonly<RailwayContactMutationHandler> {
  requireDependencies(dependencies);

  return Object.freeze({
    async save(input: unknown): Promise<SaveContactActionResult> {
      if (!dependencies.applicationConfigured()) {
        return { status: "configuration-required" };
      }

      const configurationState = dependencies.inspectConfiguration();

      if (configurationState.status !== "configured") {
        return { status: "configuration-required" };
      }

      const validation = validatePersistedContact(input);

      if (!validation.success) {
        return Object.freeze({
          status: "validation-error",
          issues: Object.freeze(
            validation.issues.map((issue) => Object.freeze({ ...issue })),
          ),
        });
      }

      const submissionOccurredAt = parseSubmissionOccurredAt(input);

      if (submissionOccurredAt === null) {
        return { status: "server-error" };
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

      const payload = createPayload(
        validation.value,
        submissionOccurredAt,
      );
      let idempotencyKey: string;

      try {
        idempotencyKey =
          await deriveRailwayApiDeterministicIdempotencyKey(
            operationId,
            payload,
          );
      } catch {
        return { status: "server-error" };
      }

      const request = Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation: operationId,
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

        return response.outcome === "ok"
          ? parseSuccess(response.data, validation.value)
          : mapFailure(response.code);
      } catch {
        return { status: "server-error" };
      }
    },
  });
}
