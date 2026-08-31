import {
  persistedMetaConnectionStatuses,
} from "../../shared/domain/metaConnection.ts";
import type {
  CurrentSystemAdminWhatsappDeliveryPolicy,
  WhatsappCampaignDeliveryPolicyRecordView,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
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
  type RailwayApiResponseEnvelope,
} from "../platform/railwayApiContract.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../platform/railwayApiMutationExecutor.ts";
import type {
  SystemAdminWhatsappDeliveryPolicyActionResult,
} from "./systemAdminWhatsappDeliveryPolicyActionResult.ts";
import {
  normalizeSystemAdminWhatsappDeliveryPolicyApprovalInput,
  normalizeSystemAdminWhatsappDeliveryPolicyKillSwitchInput,
  SystemAdminWhatsappDeliveryPolicyInputError,
  type NormalizedSystemAdminWhatsappDeliveryPolicyApprovalInput,
  type NormalizedSystemAdminWhatsappDeliveryPolicyKillSwitchInput,
} from "./systemAdminWhatsappDeliveryPolicyService.ts";
import {
  requireWhatsappDeliveryPolicyDigest,
  requireWhatsappDeliveryPolicyEventKey,
  requireWhatsappDeliveryPolicyGraphVersion,
  requireWhatsappDeliveryPolicyPositiveInteger,
  requireWhatsappDeliveryPolicyState,
  requireWhatsappDeliveryPolicyTimestamp,
  requireWhatsappDeliveryPolicyVersion,
  requireWhatsappPhoneThroughputPolicy,
  requireWhatsappPortfolioCapacity,
  requireWhatsappProviderIdentifier,
  requireWhatsappReservationDuration,
} from "./whatsappCampaignDeliveryPolicyValidation.ts";

const readOperationId =
  "system-admin.whatsapp-delivery-policy.read";
const approveOperationId =
  "system-admin.whatsapp-delivery-policy.approve";
const killSwitchOperationId =
  "system-admin.whatsapp-delivery-policy.kill-switch";
const readDataKeys = Object.freeze([
  "connection",
  "record",
]);
const connectionKeys = Object.freeze([
  "businessPortfolioIdentifier",
  "phoneNumberIdentifier",
  "status",
  "version",
  "wabaIdentifier",
]);
const recordKeys = Object.freeze([
  "connectionVersion",
  "deliveryState",
  "eventKey",
  "evidenceCheckedAt",
  "evidenceDigest",
  "evidenceExpiresAt",
  "metaGraphApiVersion",
  "phoneThroughput",
  "policyVersion",
  "portfolioCapacity",
  "recordedAt",
  "reservationDurationSeconds",
]);
const mutationDataKeys = Object.freeze([
  "outcome",
  "record",
]);

export interface RailwaySystemAdminWhatsappDeliveryPolicyHandlerDependencies {
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

export interface RailwaySystemAdminWhatsappDeliveryPolicyHandler {
  readonly read: (
    tenantIdInput: unknown,
  ) => Promise<CurrentSystemAdminWhatsappDeliveryPolicy>;
  readonly approve: (
    input: unknown,
  ) => Promise<SystemAdminWhatsappDeliveryPolicyActionResult>;
  readonly activateKillSwitch: (
    input: unknown,
  ) => Promise<SystemAdminWhatsappDeliveryPolicyActionResult>;
}

type LocalCallResult =
  | Readonly<{
      status: "response";
      response: RailwayApiResponseEnvelope;
    }>
  | Readonly<{
      status: "unauthenticated" | "server-error";
    }>;

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }

  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function parsePortfolioCapacity(value: unknown) {
  if (!isExactRecord(value, value !== null && typeof value === "object" &&
    "maximumUniqueRecipients" in value
    ? ["kind", "maximumUniqueRecipients"]
    : ["kind"])) {
    throw new Error("Invalid WhatsApp portfolio capacity response");
  }

  return requireWhatsappPortfolioCapacity(
    value.kind,
    "maximumUniqueRecipients" in value
      ? value.maximumUniqueRecipients
      : null,
  );
}

function parsePhoneThroughput(value: unknown) {
  if (value === null) {
    return null;
  }

  if (
    !isExactRecord(value, [
      "maximumMessagesPerSecond",
      "maximumOutboundMessagesPerSecond",
    ])
  ) {
    throw new Error("Invalid WhatsApp phone throughput response");
  }

  return requireWhatsappPhoneThroughputPolicy(
    value.maximumMessagesPerSecond,
    value.maximumOutboundMessagesPerSecond,
  );
}

function parseRecord(
  value: unknown,
  tenantId: number,
): Readonly<WhatsappCampaignDeliveryPolicyRecordView> | null {
  if (!isExactRecord(value, recordKeys)) {
    return null;
  }

  try {
    const deliveryState =
      requireWhatsappDeliveryPolicyState(value.deliveryState);
    const evidenceCheckedAt =
      requireWhatsappDeliveryPolicyTimestamp(
        value.evidenceCheckedAt,
        "evidence checked timestamp",
      );
    const evidenceExpiresAt =
      requireWhatsappDeliveryPolicyTimestamp(
        value.evidenceExpiresAt,
        "evidence expiration timestamp",
      );
    const recordedAt = requireWhatsappDeliveryPolicyTimestamp(
      value.recordedAt,
      "recorded timestamp",
    );
    const phoneThroughput = parsePhoneThroughput(value.phoneThroughput);

    if (
      evidenceCheckedAt > recordedAt ||
      evidenceCheckedAt >= evidenceExpiresAt ||
      (deliveryState === "enabled" &&
        (recordedAt >= evidenceExpiresAt || phoneThroughput === null))
    ) {
      return null;
    }

    return Object.freeze({
      eventKey: requireWhatsappDeliveryPolicyEventKey(value.eventKey),
      tenantId,
      connectionVersion:
        requireWhatsappDeliveryPolicyPositiveInteger(
          value.connectionVersion,
          "connection version",
        ),
      policyVersion: requireWhatsappDeliveryPolicyVersion(
        value.policyVersion,
      ),
      deliveryState,
      portfolioCapacity: parsePortfolioCapacity(value.portfolioCapacity),
      phoneThroughput,
      reservationDurationSeconds:
        requireWhatsappReservationDuration(
          value.reservationDurationSeconds,
        ),
      metaGraphApiVersion:
        requireWhatsappDeliveryPolicyGraphVersion(
          value.metaGraphApiVersion,
        ),
      evidenceDigest: requireWhatsappDeliveryPolicyDigest(
        value.evidenceDigest,
      ),
      evidenceCheckedAt,
      evidenceExpiresAt,
      recordedAt,
    });
  } catch {
    return null;
  }
}

function parseReadSuccess(
  data: unknown,
  tenantId: number,
): CurrentSystemAdminWhatsappDeliveryPolicy {
  if (
    !isExactRecord(data, readDataKeys) ||
    !isExactRecord(data.connection, connectionKeys)
  ) {
    return { status: "server-error", connection: null, record: null };
  }

  try {
    const connectionStatus = data.connection.status;
    const record =
      data.record === null ? null : parseRecord(data.record, tenantId);

    if (
      typeof connectionStatus !== "string" ||
      !persistedMetaConnectionStatuses.includes(connectionStatus as never) ||
      (data.record !== null &&
        (record === null || record.tenantId !== tenantId))
    ) {
      throw new Error("Invalid WhatsApp policy read response");
    }

    return Object.freeze({
      status: "ready",
      connection: Object.freeze({
        tenantId,
        businessPortfolioId: requireWhatsappProviderIdentifier(
          data.connection.businessPortfolioIdentifier,
          "business portfolio identifier",
        ),
        wabaId: requireWhatsappProviderIdentifier(
          data.connection.wabaIdentifier,
          "WABA identifier",
        ),
        phoneNumberId: requireWhatsappProviderIdentifier(
          data.connection.phoneNumberIdentifier,
          "phone number identifier",
        ),
        status: connectionStatus,
        version: requireWhatsappDeliveryPolicyPositiveInteger(
          data.connection.version,
          "connection version",
        ),
      }),
      record,
    });
  } catch {
    return { status: "server-error", connection: null, record: null };
  }
}

function parseMutationSuccess(
  data: unknown,
  expected: Readonly<{
    tenantId: number;
    connectionVersion: number;
    policyVersion: number;
    deliveryState: "enabled" | "disabled";
    approval?: Readonly<
      NormalizedSystemAdminWhatsappDeliveryPolicyApprovalInput
    >;
  }>,
): SystemAdminWhatsappDeliveryPolicyActionResult {
  if (
    !isExactRecord(data, mutationDataKeys) ||
    (data.outcome !== "created" &&
      data.outcome !== "updated" &&
      data.outcome !== "unchanged")
  ) {
    return { status: "server-error" };
  }

  const record = parseRecord(data.record, expected.tenantId);
  const expectedPolicyVersion = expected.policyVersion + 1;

  if (
    record === null ||
    record.tenantId !== expected.tenantId ||
    record.connectionVersion !== expected.connectionVersion ||
    (data.outcome === "unchanged"
      ? record.policyVersion !== expected.policyVersion &&
        record.policyVersion !== expectedPolicyVersion
      : record.policyVersion !== expectedPolicyVersion) ||
    record.deliveryState !== expected.deliveryState ||
    (data.outcome === "created" && expected.policyVersion !== 0) ||
    (expected.approval !== undefined &&
      (JSON.stringify(record.portfolioCapacity) !==
        JSON.stringify(expected.approval.portfolioCapacity) ||
        JSON.stringify(record.phoneThroughput) !==
          JSON.stringify(expected.approval.phoneThroughput) ||
        record.reservationDurationSeconds !==
          expected.approval.reservationDurationSeconds ||
        record.metaGraphApiVersion !==
          expected.approval.metaGraphApiVersion ||
        record.evidenceDigest !== expected.approval.evidenceDigest ||
        record.evidenceCheckedAt !==
          expected.approval.evidenceCheckedAt ||
        record.evidenceExpiresAt !==
          expected.approval.evidenceExpiresAt))
  ) {
    return { status: "server-error" };
  }

  return Object.freeze({
    status: "saved",
    outcome: data.outcome,
    record,
  });
}

function inspectConfiguredState(
  dependencies: Readonly<
    RailwaySystemAdminWhatsappDeliveryPolicyHandlerDependencies
  >,
) {
  return dependencies.applicationConfigured()
    ? dependencies.inspectConfiguration()
    : null;
}

async function callRailway(
  dependencies: Readonly<
    RailwaySystemAdminWhatsappDeliveryPolicyHandlerDependencies
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

function createApprovalPayload(
  input: Readonly<
    NormalizedSystemAdminWhatsappDeliveryPolicyApprovalInput
  >,
): Readonly<RailwayApiJsonObject> {
  return Object.freeze({
    targetTenantId: input.tenantId,
    expectedConnectionVersion: input.expectedConnectionVersion,
    expectedPolicyVersion: input.expectedPolicyVersion,
    expectedBusinessPortfolioIdentifier: input.businessPortfolioId,
    expectedWabaIdentifier: input.wabaId,
    expectedPhoneNumberIdentifier: input.phoneNumberId,
    portfolioLimitKind: input.portfolioCapacity.kind,
    portfolioLimitValue:
      input.portfolioCapacity.kind === "bounded"
        ? input.portfolioCapacity.maximumUniqueRecipients
        : null,
    phoneThroughputMessagesPerSecond:
      input.phoneThroughput.maximumMessagesPerSecond,
    maximumOutboundMessagesPerSecond:
      input.phoneThroughput.maximumOutboundMessagesPerSecond,
    reservationDurationSeconds: input.reservationDurationSeconds,
    metaGraphApiVersion: input.metaGraphApiVersion,
    evidenceDigest: input.evidenceDigest,
    evidenceCheckedAt: input.evidenceCheckedAt,
    evidenceExpiresAt: input.evidenceExpiresAt,
  });
}

function createKillSwitchPayload(
  input: Readonly<
    NormalizedSystemAdminWhatsappDeliveryPolicyKillSwitchInput
  >,
): Readonly<RailwayApiJsonObject> {
  return Object.freeze({
    targetTenantId: input.tenantId,
    expectedConnectionVersion: input.expectedConnectionVersion,
    expectedPolicyVersion: input.expectedPolicyVersion,
  });
}

function mapMutationFailure(
  code: string,
): SystemAdminWhatsappDeliveryPolicyActionResult {
  switch (code) {
    case "USER_AUTHENTICATION_REQUIRED":
      return { status: "unauthenticated" };
    case "AUTHORIZATION_DENIED":
      return { status: "permission-denied" };
    case "INVALID_REQUEST":
      return { status: "invalid-input" };
    case "NOT_FOUND":
      return { status: "not-found" };
    case "INVALID_TRANSITION":
      return { status: "connection-not-ready" };
    case "CONFLICT":
      return { status: "conflict" };
    default:
      return { status: "server-error" };
  }
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminWhatsappDeliveryPolicyHandlerDependencies
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
      "Railway system admin WhatsApp delivery policy handler dependencies are invalid",
    );
  }
}

export function createRailwaySystemAdminWhatsappDeliveryPolicyHandler(
  dependencies: Readonly<
    RailwaySystemAdminWhatsappDeliveryPolicyHandlerDependencies
  >,
): Readonly<RailwaySystemAdminWhatsappDeliveryPolicyHandler> {
  requireDependencies(dependencies);

  async function mutate(
    operationId: string,
    payload: Readonly<RailwayApiJsonObject>,
    expected: Readonly<{
      tenantId: number;
      connectionVersion: number;
      policyVersion: number;
      deliveryState: "enabled" | "disabled";
      approval?: Readonly<
        NormalizedSystemAdminWhatsappDeliveryPolicyApprovalInput
      >;
    }>,
  ): Promise<SystemAdminWhatsappDeliveryPolicyActionResult> {
    const configurationState = inspectConfiguredState(dependencies);

    if (
      configurationState === null ||
      configurationState.status !== "configured"
    ) {
      return { status: "configuration-required" };
    }

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

    const result = await callRailway(
      dependencies,
      configurationState,
      Object.freeze({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        operation: operationId,
        requestKind: "mutation",
        idempotencyKey,
        payload,
      }),
    );

    if (result.status !== "response") {
      return { status: result.status };
    }

    return result.response.outcome === "error"
      ? mapMutationFailure(result.response.code)
      : parseMutationSuccess(result.response.data, expected);
  }

  return Object.freeze({
    async read(
      tenantIdInput: unknown,
    ): Promise<CurrentSystemAdminWhatsappDeliveryPolicy> {
      const configurationState = inspectConfiguredState(dependencies);

      if (
        configurationState === null ||
        configurationState.status !== "configured"
      ) {
        return {
          status: "configuration-required",
          connection: null,
          record: null,
        };
      }

      let tenantId: number;

      try {
        tenantId = requireWhatsappDeliveryPolicyPositiveInteger(
          tenantIdInput,
          "tenant",
        );
      } catch {
        return { status: "server-error", connection: null, record: null };
      }

      const result = await callRailway(
        dependencies,
        configurationState,
        Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation: readOperationId,
          requestKind: "query",
          idempotencyKey: null,
          payload: Object.freeze({ targetTenantId: tenantId }),
        }),
      );

      if (result.status !== "response") {
        return {
          status: result.status,
          connection: null,
          record: null,
        };
      }

      if (result.response.outcome === "error") {
        const status =
          result.response.code === "USER_AUTHENTICATION_REQUIRED"
            ? "unauthenticated"
            : result.response.code === "AUTHORIZATION_DENIED"
              ? "permission-denied"
              : result.response.code === "NOT_FOUND"
                ? "not-found"
                : "server-error";

        return { status, connection: null, record: null };
      }

      return parseReadSuccess(result.response.data, tenantId);
    },

    async approve(
      input: unknown,
    ): Promise<SystemAdminWhatsappDeliveryPolicyActionResult> {
      let normalized;

      try {
        normalized =
          normalizeSystemAdminWhatsappDeliveryPolicyApprovalInput(input);
      } catch (error) {
        return error instanceof SystemAdminWhatsappDeliveryPolicyInputError
          ? { status: "invalid-input" }
          : { status: "server-error" };
      }

      return mutate(
        approveOperationId,
        createApprovalPayload(normalized),
        {
          tenantId: normalized.tenantId,
          connectionVersion: normalized.expectedConnectionVersion,
          policyVersion: normalized.expectedPolicyVersion,
          deliveryState: "enabled",
          approval: normalized,
        },
      );
    },

    async activateKillSwitch(
      input: unknown,
    ): Promise<SystemAdminWhatsappDeliveryPolicyActionResult> {
      let normalized;

      try {
        normalized =
          normalizeSystemAdminWhatsappDeliveryPolicyKillSwitchInput(input);
      } catch (error) {
        return error instanceof SystemAdminWhatsappDeliveryPolicyInputError
          ? { status: "invalid-input" }
          : { status: "server-error" };
      }

      return mutate(
        killSwitchOperationId,
        createKillSwitchPayload(normalized),
        {
          tenantId: normalized.tenantId,
          connectionVersion: normalized.expectedConnectionVersion,
          policyVersion: normalized.expectedPolicyVersion,
          deliveryState: "disabled",
        },
      );
    },
  });
}
