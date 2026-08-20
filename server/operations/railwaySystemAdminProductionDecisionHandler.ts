import {
  PRODUCTION_DECISION_REGISTRY,
} from "../../shared/domain/productionDecisionRegistry.ts";
import type {
  CurrentSystemAdminProductionDecisions,
  ProductionDecisionRecordView,
} from "../../shared/domain/productionDecisionRecord.ts";
import type {
  RailwayApiClient,
} from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
  type RailwayApiRequestEnvelope,
  type RailwayApiResponseEnvelope,
} from "../platform/railwayApiContract.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import {
  requireProductionDecisionCheckId,
  requireProductionDecisionRationale,
  requireProductionDecisionSelection,
  requireProductionDecisionTimestamp,
  requireProductionDecisionVersion,
} from "./productionDecisionValidation.ts";
import type {
  SystemAdminProductionDecisionActionResult,
} from "./systemAdminProductionDecisionActionResult.ts";
import {
  normalizeSystemAdminProductionDecisionInput,
  SystemAdminProductionDecisionInputError,
  type NormalizedSystemAdminProductionDecisionInput,
} from "./systemAdminProductionDecisionService.ts";

const listOperationId =
  "system-admin.production-decisions.list";
const saveOperationId =
  "system-admin.production-decisions.save";
const listDataKeys = Object.freeze(["records"]);
const saveDataKeys = Object.freeze([
  "outcome",
  "record",
]);
const recordKeys = Object.freeze([
  "checkId",
  "decidedAt",
  "rationale",
  "selection",
  "updatedAt",
  "version",
]);

export interface RailwaySystemAdminProductionDecisionHandlerDependencies {
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

export interface RailwaySystemAdminProductionDecisionHandler {
  readonly read: () =>
    Promise<CurrentSystemAdminProductionDecisions>;
  readonly save: (
    input: unknown,
  ) => Promise<SystemAdminProductionDecisionActionResult>;
}

type LocalCallResult =
  | Readonly<{
      status: "response";
      response: RailwayApiResponseEnvelope;
    }>
  | Readonly<{
      status:
        | "unauthenticated"
        | "server-error";
    }>;

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

function parseRecord(
  value: unknown,
): Readonly<ProductionDecisionRecordView> | null {
  if (!isExactRecord(value, recordKeys)) {
    return null;
  }

  try {
    const decidedAt = requireProductionDecisionTimestamp(
      value.decidedAt,
    );
    const updatedAt = requireProductionDecisionTimestamp(
      value.updatedAt,
    );

    if (decidedAt !== updatedAt) {
      return null;
    }

    return Object.freeze({
      checkId: requireProductionDecisionCheckId(value.checkId),
      selection: requireProductionDecisionSelection(value.selection),
      rationale: requireProductionDecisionRationale(value.rationale),
      version: requireProductionDecisionVersion(value.version),
      decidedAt,
      updatedAt,
    });
  } catch {
    return null;
  }
}

function parseListSuccess(
  data: unknown,
): readonly Readonly<ProductionDecisionRecordView>[] | null {
  if (
    !isExactRecord(data, listDataKeys) ||
    !Array.isArray(data.records) ||
    data.records.length > PRODUCTION_DECISION_REGISTRY.length
  ) {
    return null;
  }

  const records = data.records.map(parseRecord);

  if (records.some((record) => record === null)) {
    return null;
  }

  const validRecords =
    records as readonly Readonly<ProductionDecisionRecordView>[];
  const checkIds = new Set(
    validRecords.map((record) => record.checkId),
  );

  return checkIds.size === validRecords.length
    ? Object.freeze([...validRecords])
    : null;
}

function parseSaveSuccess(
  data: unknown,
  input: Readonly<NormalizedSystemAdminProductionDecisionInput>,
): SystemAdminProductionDecisionActionResult {
  if (
    !isExactRecord(data, saveDataKeys) ||
    (data.outcome !== "created" &&
      data.outcome !== "updated" &&
      data.outcome !== "unchanged")
  ) {
    return { status: "server-error" };
  }

  const record = parseRecord(data.record);
  const expectedVersion =
    data.outcome === "created" || data.outcome === "updated"
      ? input.expectedVersion + 1
      : null;

  if (
    record === null ||
    record.checkId !== input.checkId ||
    record.selection !== input.selection ||
    record.rationale !== input.rationale ||
    (data.outcome === "created" && input.expectedVersion !== 0) ||
    (expectedVersion === null
      ? record.version !== input.expectedVersion &&
        record.version !== input.expectedVersion + 1
      : record.version !== expectedVersion)
  ) {
    return { status: "server-error" };
  }

  return Object.freeze({
    status: "saved",
    outcome: data.outcome,
    record,
  });
}

function inspectConfiguration(
  dependencies: Readonly<
    RailwaySystemAdminProductionDecisionHandlerDependencies
  >,
): RailwayApiClientConfigurationState | null {
  if (!dependencies.applicationConfigured()) {
    return null;
  }

  return dependencies.inspectConfiguration();
}

async function callRailway(
  dependencies: Readonly<
    RailwaySystemAdminProductionDecisionHandlerDependencies
  >,
  configurationState: Extract<
    RailwayApiClientConfigurationState,
    { status: "configured" }
  >,
  request: Readonly<RailwayApiRequestEnvelope>,
): Promise<LocalCallResult> {
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

  try {
    const client = dependencies.createClient({
      ...configurationState.configuration,
      oidcToken: identityState.oidcToken,
      userSessionToken: identityState.userSessionToken,
    });

    return Object.freeze({
      status: "response",
      response: await client.call(request),
    });
  } catch {
    return { status: "server-error" };
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminProductionDecisionHandlerDependencies
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
      "Railway system admin production decision handler dependencies are invalid",
    );
  }
}

export function createRailwaySystemAdminProductionDecisionHandler(
  dependencies: Readonly<
    RailwaySystemAdminProductionDecisionHandlerDependencies
  >,
): Readonly<RailwaySystemAdminProductionDecisionHandler> {
  requireDependencies(dependencies);

  return Object.freeze({
    async read(): Promise<CurrentSystemAdminProductionDecisions> {
      const configurationState = inspectConfiguration(dependencies);

      if (
        configurationState === null ||
        configurationState.status !== "configured"
      ) {
        return { status: "configuration-required", records: [] };
      }

      const request = Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation: listOperationId,
        requestKind: "query",
        idempotencyKey: null,
        payload: Object.freeze({}),
      } satisfies RailwayApiRequestEnvelope);
      const result = await callRailway(
        dependencies,
        configurationState,
        request,
      );

      if (result.status !== "response") {
        return { status: result.status, records: [] };
      }

      if (result.response.outcome === "error") {
        return {
          status:
            result.response.code === "USER_AUTHENTICATION_REQUIRED"
              ? "unauthenticated"
              : result.response.code === "AUTHORIZATION_DENIED"
                ? "permission-denied"
                : "server-error",
          records: [],
        };
      }

      const records = parseListSuccess(result.response.data);

      return records === null
        ? { status: "server-error", records: [] }
        : { status: "ready", records };
    },

    async save(
      input: unknown,
    ): Promise<SystemAdminProductionDecisionActionResult> {
      const configurationState = inspectConfiguration(dependencies);

      if (
        configurationState === null ||
        configurationState.status !== "configured"
      ) {
        return { status: "configuration-required" };
      }

      let normalizedInput:
        Readonly<NormalizedSystemAdminProductionDecisionInput>;

      try {
        normalizedInput =
          normalizeSystemAdminProductionDecisionInput(input);
      } catch (error) {
        return error instanceof SystemAdminProductionDecisionInputError
          ? { status: "invalid-input" }
          : { status: "server-error" };
      }

      const payload = Object.freeze({ ...normalizedInput });
      let idempotencyKey: string;

      try {
        idempotencyKey =
          await deriveRailwayApiDeterministicIdempotencyKey(
            saveOperationId,
            payload,
          );
      } catch {
        return { status: "server-error" };
      }

      const request = Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation: saveOperationId,
        requestKind: "mutation",
        idempotencyKey,
        payload,
      } satisfies RailwayApiRequestEnvelope);
      const result = await callRailway(
        dependencies,
        configurationState,
        request,
      );

      if (result.status !== "response") {
        return { status: result.status };
      }

      if (result.response.outcome === "error") {
        switch (result.response.code) {
          case "USER_AUTHENTICATION_REQUIRED":
            return { status: "unauthenticated" };
          case "AUTHORIZATION_DENIED":
            return { status: "permission-denied" };
          case "INVALID_REQUEST":
            return { status: "invalid-input" };
          case "CONFLICT":
            return { status: "conflict" };
          default:
            return { status: "server-error" };
        }
      }

      return parseSaveSuccess(
        result.response.data,
        normalizedInput,
      );
    },
  });
}
