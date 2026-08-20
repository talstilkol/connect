import type {
  TenantSubscriptionAdminView,
} from "../../shared/domain/tenantSubscriptionAdminView.ts";
import {
  tenantSubscriptionStatuses,
} from "../../shared/domain/tenantSubscription.ts";
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
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import type {
  SystemAdminSubscriptionActionResult,
} from "./systemAdminSubscriptionActionResult.ts";
import {
  normalizeSystemAdminSubscriptionCancelInput,
  normalizeSystemAdminSubscriptionCreateInput,
  normalizeSystemAdminSubscriptionExtendInput,
  normalizeSystemAdminSubscriptionStatusInput,
  SystemAdminSubscriptionInputError,
  type NormalizedSystemAdminSubscriptionCancelInput,
  type NormalizedSystemAdminSubscriptionCreateInput,
  type NormalizedSystemAdminSubscriptionExtendInput,
  type NormalizedSystemAdminSubscriptionStatusInput,
} from "./systemAdminSubscriptionService.ts";
import {
  requireCanonicalTimestamp,
  requirePositiveVersion,
  requireSubscriptionWindow,
} from "./tenantSubscriptionValidation.ts";

type NormalizedMutation =
  | Readonly<{
      operationId: "system-admin.subscription.create";
      input: Readonly<NormalizedSystemAdminSubscriptionCreateInput>;
    }>
  | Readonly<{
      operationId: "system-admin.subscription.extend";
      input: Readonly<NormalizedSystemAdminSubscriptionExtendInput>;
    }>
  | Readonly<{
      operationId: "system-admin.subscription.status.change";
      input: Readonly<NormalizedSystemAdminSubscriptionStatusInput>;
    }>
  | Readonly<{
      operationId: "system-admin.subscription.cancel";
      input: Readonly<NormalizedSystemAdminSubscriptionCancelInput>;
    }>;

type MutationKind =
  | "create"
  | "extend"
  | "changeStatus"
  | "cancel";

const successDataKeys = Object.freeze([
  "outcome",
  "subscription",
]);
const subscriptionKeys = Object.freeze([
  "cancelledAt",
  "createdAt",
  "endsAt",
  "startsAt",
  "status",
  "updatedAt",
  "version",
]);

export interface RailwaySystemAdminSubscriptionActionHandlerDependencies {
  readonly applicationConfigured: () => boolean;
  readonly inspectConfiguration: () =>
    RailwayApiClientConfigurationState;
  readonly resolveIdentity: () =>
    Promise<RailwayApiServerIdentityState>;
  readonly createClient: (
    configuration: Readonly<{
      apiOrigin: string;
      deploymentEnvironment: "development" | "preview" | "production";
      oidcToken: string;
      userSessionToken: string;
    }>,
  ) => RailwayApiClient;
}

export interface RailwaySystemAdminSubscriptionActionHandler {
  readonly create: (
    input: unknown,
  ) => Promise<SystemAdminSubscriptionActionResult>;
  readonly extend: (
    input: unknown,
  ) => Promise<SystemAdminSubscriptionActionResult>;
  readonly changeStatus: (
    input: unknown,
  ) => Promise<SystemAdminSubscriptionActionResult>;
  readonly cancel: (
    input: unknown,
  ) => Promise<SystemAdminSubscriptionActionResult>;
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

function normalizeMutation(
  kind: MutationKind,
  input: unknown,
): NormalizedMutation {
  switch (kind) {
    case "create":
      return Object.freeze({
        operationId: "system-admin.subscription.create",
        input: normalizeSystemAdminSubscriptionCreateInput(input),
      });
    case "extend":
      return Object.freeze({
        operationId: "system-admin.subscription.extend",
        input: normalizeSystemAdminSubscriptionExtendInput(input),
      });
    case "changeStatus":
      return Object.freeze({
        operationId: "system-admin.subscription.status.change",
        input: normalizeSystemAdminSubscriptionStatusInput(input),
      });
    case "cancel":
      return Object.freeze({
        operationId: "system-admin.subscription.cancel",
        input: normalizeSystemAdminSubscriptionCancelInput(input),
      });
  }
}

function createPayload(
  mutation: Readonly<NormalizedMutation>,
): Readonly<RailwayApiJsonObject> {
  switch (mutation.operationId) {
    case "system-admin.subscription.create":
      return Object.freeze({
        targetTenantId: mutation.input.tenantId,
        status: mutation.input.status,
        startsAt: mutation.input.startsAt,
        endsAt: mutation.input.endsAt,
      });
    case "system-admin.subscription.extend":
      return Object.freeze({
        targetTenantId: mutation.input.tenantId,
        expectedVersion: mutation.input.expectedVersion,
        newEndsAt: mutation.input.newEndsAt,
      });
    case "system-admin.subscription.status.change":
      return Object.freeze({
        targetTenantId: mutation.input.tenantId,
        expectedVersion: mutation.input.expectedVersion,
        status: mutation.input.status,
      });
    case "system-admin.subscription.cancel":
      return Object.freeze({
        targetTenantId: mutation.input.tenantId,
        expectedVersion: mutation.input.expectedVersion,
      });
  }
}

function parseSubscription(
  value: unknown,
): Readonly<TenantSubscriptionAdminView> | null {
  if (
    !isExactRecord(value, subscriptionKeys) ||
    typeof value.status !== "string" ||
    !tenantSubscriptionStatuses.includes(
      value.status as (typeof tenantSubscriptionStatuses)[number],
    ) ||
    typeof value.startsAt !== "string" ||
    typeof value.endsAt !== "string" ||
    typeof value.version !== "number" ||
    (value.cancelledAt !== null &&
      typeof value.cancelledAt !== "string") ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  try {
    const period = requireSubscriptionWindow(
      value.startsAt,
      value.endsAt,
    );
    const cancelledAt =
      value.cancelledAt === null
        ? null
        : requireCanonicalTimestamp(value.cancelledAt);
    const createdAt = requireCanonicalTimestamp(value.createdAt);
    const updatedAt = requireCanonicalTimestamp(value.updatedAt);
    const status = value.status as TenantSubscriptionAdminView["status"];

    if (
      Date.parse(updatedAt) < Date.parse(createdAt) ||
      (status === "cancelled") !== (cancelledAt !== null)
    ) {
      return null;
    }

    return Object.freeze({
      status,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      cancelledAt,
      version: requirePositiveVersion(value.version),
      createdAt,
      updatedAt,
    });
  } catch {
    return null;
  }
}

function successMatchesMutation(
  outcome: "created" | "updated" | "unchanged",
  subscription: Readonly<TenantSubscriptionAdminView>,
  mutation: Readonly<NormalizedMutation>,
): boolean {
  switch (mutation.operationId) {
    case "system-admin.subscription.create":
      return (
        (outcome === "created" || outcome === "unchanged") &&
        subscription.status === mutation.input.status &&
        subscription.startsAt === mutation.input.startsAt &&
        subscription.endsAt === mutation.input.endsAt &&
        subscription.cancelledAt === null &&
        (outcome !== "created" || subscription.version === 1)
      );
    case "system-admin.subscription.extend":
      return (
        (outcome === "updated" || outcome === "unchanged") &&
        subscription.endsAt === mutation.input.newEndsAt &&
        subscription.version ===
          mutation.input.expectedVersion +
            (outcome === "updated" ? 1 : 0)
      );
    case "system-admin.subscription.status.change":
      return (
        (outcome === "updated" || outcome === "unchanged") &&
        subscription.status === mutation.input.status &&
        subscription.cancelledAt === null &&
        subscription.version ===
          mutation.input.expectedVersion +
            (outcome === "updated" ? 1 : 0)
      );
    case "system-admin.subscription.cancel":
      return (
        (outcome === "updated" || outcome === "unchanged") &&
        subscription.status === "cancelled" &&
        subscription.cancelledAt !== null &&
        subscription.version ===
          mutation.input.expectedVersion +
            (outcome === "updated" ? 1 : 0)
      );
  }
}

function parseSuccess(
  data: unknown,
  mutation: Readonly<NormalizedMutation>,
): SystemAdminSubscriptionActionResult {
  if (
    !isExactRecord(data, successDataKeys) ||
    (data.outcome !== "created" &&
      data.outcome !== "updated" &&
      data.outcome !== "unchanged")
  ) {
    return { status: "server-error" };
  }

  const subscription = parseSubscription(data.subscription);

  if (
    subscription === null ||
    !successMatchesMutation(data.outcome, subscription, mutation)
  ) {
    return { status: "server-error" };
  }

  return Object.freeze({
    status: "saved",
    outcome: data.outcome,
    subscription,
  });
}

function mapFailure(
  code: string,
): SystemAdminSubscriptionActionResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "AUTHORIZATION_DENIED":
      return { status: "permission-denied" };
    case "INVALID_REQUEST":
      return { status: "invalid-input" };
    case "NOT_FOUND":
      return { status: "not-found" };
    case "CONFLICT":
      return { status: "conflict" };
    case "INVALID_TRANSITION":
      return { status: "invalid-transition" };
    default:
      return { status: "server-error" };
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminSubscriptionActionHandlerDependencies
  >,
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
    throw new Error(
      "Railway system admin subscription action dependencies are invalid",
    );
  }
}

export function createRailwaySystemAdminSubscriptionActionHandler(
  dependencies: Readonly<
    RailwaySystemAdminSubscriptionActionHandlerDependencies
  >,
): Readonly<RailwaySystemAdminSubscriptionActionHandler> {
  requireDependencies(dependencies);

  async function mutate(
    kind: MutationKind,
    input: unknown,
  ): Promise<SystemAdminSubscriptionActionResult> {
    if (!dependencies.applicationConfigured()) {
      return { status: "configuration-required" };
    }

    const configurationState = dependencies.inspectConfiguration();

    if (configurationState.status !== "configured") {
      return { status: "configuration-required" };
    }

    let mutation: NormalizedMutation;

    try {
      mutation = normalizeMutation(kind, input);
    } catch (error) {
      return error instanceof SystemAdminSubscriptionInputError
        ? { status: "invalid-input" }
        : { status: "server-error" };
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

    const payload = createPayload(mutation);
    let idempotencyKey: string;

    try {
      idempotencyKey =
        await deriveRailwayApiDeterministicIdempotencyKey(
          mutation.operationId,
          payload,
        );
    } catch {
      return { status: "server-error" };
    }

    const request = Object.freeze({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation: mutation.operationId,
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
        ? parseSuccess(response.data, mutation)
        : mapFailure(response.code);
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    create: (input: unknown) => mutate("create", input),
    extend: (input: unknown) => mutate("extend", input),
    changeStatus: (input: unknown) => mutate("changeStatus", input),
    cancel: (input: unknown) => mutate("cancel", input),
  });
}
