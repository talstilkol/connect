import type {
  SystemAdminTenantDirectoryPage,
  SystemAdminTenantDirectoryQuery,
  SystemAdminTenantRecord,
  CurrentSystemAdminTenantDirectory,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import {
  DEFAULT_SYSTEM_ADMIN_TENANT_DIRECTORY_FILTERS,
  matchesSystemAdminTenantDirectoryFilters,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import {
  tenantSubscriptionStatuses,
} from "../../shared/domain/tenantSubscription.ts";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import type {
  RailwayApiClient,
} from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiRequestEnvelope,
} from "../platform/railwayApiContract.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  requireCanonicalTimestamp,
  requirePositiveTenantId,
  requirePositiveVersion,
  requireSubscriptionWindow,
} from "../billing/tenantSubscriptionValidation.ts";
import type {
  SystemAdminTenantDirectoryActionResult,
} from "./systemAdminTenantDirectoryActionResult.ts";
import {
  normalizeSystemAdminTenantDirectoryInput,
  SystemAdminTenantDirectoryInputError,
} from "./systemAdminTenantDirectoryService.ts";

const operationId = "system-admin.tenant-directory.list";
const pageSize = 50;
const dataKeys = Object.freeze(["directory"]);
const directoryKeys = Object.freeze(["nextCursor", "tenants"]);
const tenantKeys = Object.freeze([
  "businessProfile",
  "displayName",
  "subscription",
  "targetTenantId",
  "tenantStatus",
]);
const profileKeys = Object.freeze([
  "businessName",
  "createdAt",
  "interfaceLanguage",
  "timezone",
  "updatedAt",
  "version",
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
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const emptyDirectory = Object.freeze({
  tenants: Object.freeze([]),
  nextCursor: null,
});

export interface RailwaySystemAdminTenantDirectoryHandlerDependencies {
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

export interface RailwaySystemAdminTenantDirectoryHandler {
  readonly read: () => Promise<CurrentSystemAdminTenantDirectory>;
  readonly load: (
    input: unknown,
  ) => Promise<SystemAdminTenantDirectoryActionResult>;
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

function validStoredText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 500 &&
    !controlCharacterPattern.test(value)
  );
}

function parseBusinessProfile(
  value: unknown,
  displayName: string,
): SystemAdminTenantRecord["businessProfile"] | undefined {
  if (value === null) {
    return null;
  }

  if (!isExactRecord(value, profileKeys)) {
    return undefined;
  }

  const validation = validatePersistedBusinessProfile(value);

  try {
    const version = requirePositiveVersion(value.version as number);
    const createdAt = requireCanonicalTimestamp(
      value.createdAt as string,
    );
    const updatedAt = requireCanonicalTimestamp(
      value.updatedAt as string,
    );

    if (
      !validation.success ||
      validation.value.businessName !== displayName ||
      Date.parse(updatedAt) < Date.parse(createdAt)
    ) {
      return undefined;
    }

    return Object.freeze({
      ...validation.value,
      version,
      createdAt,
      updatedAt,
    });
  } catch {
    return undefined;
  }
}

function parseSubscription(
  value: unknown,
  tenantStatus: SystemAdminTenantRecord["tenantStatus"],
): SystemAdminTenantRecord["subscription"] | undefined {
  if (value === null) {
    return null;
  }

  if (
    !isExactRecord(value, subscriptionKeys) ||
    typeof value.status !== "string" ||
    !tenantSubscriptionStatuses.includes(
      value.status as (typeof tenantSubscriptionStatuses)[number],
    ) ||
    (value.cancelledAt !== null &&
      typeof value.cancelledAt !== "string")
  ) {
    return undefined;
  }

  try {
    const period = requireSubscriptionWindow(
      value.startsAt as string,
      value.endsAt as string,
    );
    const cancelledAt =
      value.cancelledAt === null
        ? null
        : requireCanonicalTimestamp(value.cancelledAt);
    const createdAt = requireCanonicalTimestamp(
      value.createdAt as string,
    );
    const updatedAt = requireCanonicalTimestamp(
      value.updatedAt as string,
    );
    const status =
      value.status as SystemAdminTenantRecord["tenantStatus"];

    if (
      status !== tenantStatus ||
      (status === "cancelled") !== (cancelledAt !== null) ||
      Date.parse(updatedAt) < Date.parse(createdAt)
    ) {
      return undefined;
    }

    return Object.freeze({
      status,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      cancelledAt,
      version: requirePositiveVersion(value.version as number),
      createdAt,
      updatedAt,
    });
  } catch {
    return undefined;
  }
}

function parseTenant(
  value: unknown,
  query: Readonly<SystemAdminTenantDirectoryQuery>,
): Readonly<SystemAdminTenantRecord> | null {
  if (
    !isExactRecord(value, tenantKeys) ||
    !validStoredText(value.displayName) ||
    typeof value.tenantStatus !== "string" ||
    !tenantSubscriptionStatuses.includes(
      value.tenantStatus as (typeof tenantSubscriptionStatuses)[number],
    )
  ) {
    return null;
  }

  try {
    const tenantId = requirePositiveTenantId(
      value.targetTenantId as number,
    );
    const tenantStatus =
      value.tenantStatus as SystemAdminTenantRecord["tenantStatus"];
    const businessProfile = parseBusinessProfile(
      value.businessProfile,
      value.displayName,
    );
    const subscription = parseSubscription(
      value.subscription,
      tenantStatus,
    );

    if (
      businessProfile === undefined ||
      subscription === undefined ||
      (query.afterTenantId !== null && tenantId <= query.afterTenantId)
    ) {
      return null;
    }

    const tenant = Object.freeze({
      tenantId,
      displayName: value.displayName,
      tenantStatus,
      businessProfile,
      subscription,
    });

    return matchesSystemAdminTenantDirectoryFilters(tenant, query)
      ? tenant
      : null;
  } catch {
    return null;
  }
}

function parseSuccess(
  data: unknown,
  query: Readonly<SystemAdminTenantDirectoryQuery>,
): Readonly<SystemAdminTenantDirectoryPage> | null {
  if (
    !isExactRecord(data, dataKeys) ||
    !isExactRecord(data.directory, directoryKeys) ||
    !Array.isArray(data.directory.tenants) ||
    data.directory.tenants.length > pageSize ||
    (data.directory.nextCursor !== null &&
      typeof data.directory.nextCursor !== "number")
  ) {
    return null;
  }

  const tenants = data.directory.tenants.map((tenant) =>
    parseTenant(tenant, query),
  );

  if (tenants.some((tenant) => tenant === null)) {
    return null;
  }

  const records = tenants as readonly Readonly<SystemAdminTenantRecord>[];

  for (let index = 1; index < records.length; index += 1) {
    if (records[index - 1].tenantId >= records[index].tenantId) {
      return null;
    }
  }

  let nextCursor: number | null = null;

  if (data.directory.nextCursor !== null) {
    try {
      nextCursor = requirePositiveTenantId(
        data.directory.nextCursor,
      );
    } catch {
      return null;
    }

    if (
      records.length !== pageSize ||
      records.at(-1)?.tenantId !== nextCursor
    ) {
      return null;
    }
  }

  return Object.freeze({
    tenants: Object.freeze([...records]),
    nextCursor,
  });
}

function mapFailure(
  code: string,
): SystemAdminTenantDirectoryActionResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "AUTHORIZATION_DENIED":
      return { status: "permission-denied" };
    case "INVALID_REQUEST":
      return { status: "invalid-input" };
    default:
      return { status: "server-error" };
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminTenantDirectoryHandlerDependencies
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
      "Railway system admin tenant directory handler dependencies are invalid",
    );
  }
}

export function createRailwaySystemAdminTenantDirectoryHandler(
  dependencies: Readonly<
    RailwaySystemAdminTenantDirectoryHandlerDependencies
  >,
): Readonly<RailwaySystemAdminTenantDirectoryHandler> {
  requireDependencies(dependencies);

  async function load(
    input: unknown,
  ): Promise<SystemAdminTenantDirectoryActionResult> {
    if (!dependencies.applicationConfigured()) {
      return { status: "configuration-required" };
    }

    const configurationState = dependencies.inspectConfiguration();

    if (configurationState.status !== "configured") {
      return { status: "configuration-required" };
    }

    let query: SystemAdminTenantDirectoryQuery;

    try {
      query = normalizeSystemAdminTenantDirectoryInput(input);
    } catch (error) {
      return error instanceof SystemAdminTenantDirectoryInputError
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

    const request = Object.freeze({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation: operationId,
      requestKind: "query",
      idempotencyKey: null,
      payload: Object.freeze({ ...query }),
    } satisfies RailwayApiRequestEnvelope);

    try {
      const client = dependencies.createClient({
        ...configurationState.configuration,
        oidcToken: identityState.oidcToken,
        userSessionToken: identityState.userSessionToken,
      });
      const response = await client.call(request);

      if (response.outcome === "error") {
        return mapFailure(response.code);
      }

      const directory = parseSuccess(response.data, query);

      return directory === null
        ? { status: "server-error" }
        : Object.freeze({
            status: "loaded",
            directory,
          });
    } catch {
      return { status: "server-error" };
    }
  }

  return Object.freeze({
    load,
    async read(): Promise<CurrentSystemAdminTenantDirectory> {
      const result = await load({
        afterTenantId: null,
        ...DEFAULT_SYSTEM_ADMIN_TENANT_DIRECTORY_FILTERS,
      });

      return result.status === "loaded"
        ? Object.freeze({
            status: "ready",
            directory: result.directory,
          })
        : Object.freeze({
            status:
              result.status === "invalid-input"
                ? "server-error"
                : result.status,
            directory: emptyDirectory,
          });
    },
  });
}
