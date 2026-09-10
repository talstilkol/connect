import type {
  WhatsappCampaignDeliveryPolicyRepository,
} from "../../db/whatsappCampaignDeliveryPolicyRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  toWhatsappCampaignDeliveryPolicyRecordView,
  type WhatsappCampaignDeliveryPolicyRecord,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import {
  resolveSystemAdminSession,
  SystemAdminSessionError,
} from "../auth/systemAdminSession.ts";
import {
  createSystemAdminWhatsappDeliveryPolicyService,
  SystemAdminWhatsappDeliveryPolicyError,
  SystemAdminWhatsappDeliveryPolicyInputError,
} from "../campaigns/systemAdminWhatsappDeliveryPolicyService.ts";
import {
  requireWhatsappDeliveryPolicyPositiveInteger,
} from "../campaigns/whatsappCampaignDeliveryPolicyValidation.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import type {
  RailwayApiJsonObject,
  RailwayApiRequestEnvelope,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "./railwayApiMutationExecutor.ts";

export const railwaySystemAdminWhatsappDeliveryPolicyOperationPolicies =
  Object.freeze([
    Object.freeze({
      id: "system-admin.whatsapp-delivery-policy.read",
      requestKind: "query" as const,
      authorization: "system-admin-allowlist" as const,
      mutationSafety: null,
    }),
    Object.freeze({
      id: "system-admin.whatsapp-delivery-policy.approve",
      requestKind: "mutation" as const,
      authorization: "system-admin-allowlist" as const,
      mutationSafety: Object.freeze({
        rateLimit: "system-admin-mutation" as const,
        idempotency:
          "deterministic-request-key-and-event-replay" as const,
        audit: "atomic-immutable-policy-event" as const,
        transaction: "required" as const,
      }),
    }),
    Object.freeze({
      id: "system-admin.whatsapp-delivery-policy.kill-switch",
      requestKind: "mutation" as const,
      authorization: "system-admin-allowlist" as const,
      mutationSafety: Object.freeze({
        rateLimit: "system-admin-mutation" as const,
        idempotency:
          "deterministic-request-key-and-event-replay" as const,
        audit: "atomic-immutable-policy-event" as const,
        transaction: "required" as const,
      }),
    }),
  ]);

export interface RailwaySystemAdminWhatsappDeliveryPolicyOperationDependencies {
  readonly allowedExternalUserIds: readonly UserId[];
  readonly clock: () => string;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  readonly policies: Pick<
    WhatsappCampaignDeliveryPolicyRepository,
    "findLatestPolicyEvent" | "recordPolicyEvent"
  >;
}

const approvalPayloadKeys = Object.freeze([
  "evidenceCheckedAt",
  "evidenceDigest",
  "evidenceExpiresAt",
  "expectedBusinessPortfolioIdentifier",
  "expectedConnectionVersion",
  "expectedPhoneNumberIdentifier",
  "expectedPolicyVersion",
  "expectedWabaIdentifier",
  "maximumOutboundMessagesPerSecond",
  "metaGraphApiVersion",
  "phoneThroughputMessagesPerSecond",
  "portfolioLimitKind",
  "portfolioLimitValue",
  "reservationDurationSeconds",
  "targetTenantId",
]);
const killSwitchPayloadKeys = Object.freeze([
  "expectedConnectionVersion",
  "expectedPolicyVersion",
  "targetTenantId",
]);

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function toRailwayPolicyView(
  record: Readonly<WhatsappCampaignDeliveryPolicyRecord>,
) {
  const view = toWhatsappCampaignDeliveryPolicyRecordView(record);

  return Object.freeze({
    eventKey: view.eventKey,
    connectionVersion: view.connectionVersion,
    policyVersion: view.policyVersion,
    deliveryState: view.deliveryState,
    portfolioCapacity: view.portfolioCapacity,
    phoneThroughput: view.phoneThroughput,
    reservationDurationSeconds: view.reservationDurationSeconds,
    metaGraphApiVersion: view.metaGraphApiVersion,
    evidenceDigest: view.evidenceDigest,
    evidenceCheckedAt: view.evidenceCheckedAt,
    evidenceExpiresAt: view.evidenceExpiresAt,
    recordedAt: view.recordedAt,
  });
}

function hasExactKeys(
  payload: Readonly<RailwayApiJsonObject>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(payload).sort();
  const expected = [...expectedKeys].sort();

  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function requireDependencies(
  dependencies: Readonly<
    RailwaySystemAdminWhatsappDeliveryPolicyOperationDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "allowedExternalUserIds,clock,metaConnections,mutationRateLimit,policies" ||
    !Array.isArray(dependencies.allowedExternalUserIds) ||
    dependencies.allowedExternalUserIds.length === 0 ||
    dependencies.allowedExternalUserIds.some(
      (identity) =>
        typeof identity !== "string" ||
        identity.length === 0 ||
        identity.length > 255 ||
        identity.trim() !== identity ||
        /[\u0000-\u001f\u007f]/.test(identity),
    ) ||
    new Set(dependencies.allowedExternalUserIds).size !==
      dependencies.allowedExternalUserIds.length ||
    typeof dependencies.clock !== "function" ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    typeof dependencies.metaConnections?.findConnectionByTenantId !==
      "function" ||
    typeof dependencies.policies?.findLatestPolicyEvent !== "function" ||
    typeof dependencies.policies?.recordPolicyEvent !== "function"
  ) {
    throw new Error(
      "Railway system admin WhatsApp delivery policy dependencies are invalid",
    );
  }
}

function mapError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) {
    throw error;
  }

  if (error instanceof SystemAdminSessionError) {
    throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
  }

  if (error instanceof SystemAdminWhatsappDeliveryPolicyInputError) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }

  if (error instanceof SystemAdminWhatsappDeliveryPolicyError) {
    switch (error.code) {
      case "NOT_FOUND":
        throw new RailwayApiDispatchError("NOT_FOUND");
      case "CONFLICT":
        throw new RailwayApiDispatchError("CONFLICT");
      case "CONNECTION_NOT_READY":
        throw new RailwayApiDispatchError("INVALID_TRANSITION");
      default:
        throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
    }
  }

  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

async function consumeMutationQuota(
  dependencies: Readonly<
    RailwaySystemAdminWhatsappDeliveryPolicyOperationDependencies
  >,
  externalUserId: string,
  operationId: string,
): Promise<void> {
  let decision;

  try {
    decision = await dependencies.mutationRateLimit.consume(
      `${externalUserId}:${operationId}`,
    );
  } catch {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }

  if (decision.outcome === "limited") {
    throw new RailwayApiDispatchError("RATE_LIMITED");
  }

  if (decision.outcome !== "allowed") {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
}

async function requireMutationRequest(
  dependencies: Readonly<
    RailwaySystemAdminWhatsappDeliveryPolicyOperationDependencies
  >,
  context: Readonly<RailwayApiDispatchContext>,
  payload: RailwayApiJsonObject,
  request: Readonly<RailwayApiRequestEnvelope>,
  operationId: string,
  expectedKeys: readonly string[],
) {
  if (
    !hasExactKeys(payload, expectedKeys) ||
    request.operation !== operationId ||
    request.requestKind !== "mutation" ||
    request.idempotencyKey === null
  ) {
    invalidRequest();
  }

  const session = resolveSystemAdminSession(
    context.userIdentity,
    dependencies.allowedExternalUserIds,
  );
  const expectedIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      payload,
    );

  if (request.idempotencyKey !== expectedIdempotencyKey) {
    throw new RailwayApiDispatchError("CONFLICT");
  }

  await consumeMutationQuota(
    dependencies,
    session.externalUserId,
    operationId,
  );
  return session;
}

export function createRailwaySystemAdminWhatsappDeliveryPolicyOperations(
  dependencies: Readonly<
    RailwaySystemAdminWhatsappDeliveryPolicyOperationDependencies
  >,
): readonly Readonly<RailwayApiOperation>[] {
  requireDependencies(dependencies);
  const service = createSystemAdminWhatsappDeliveryPolicyService({
    metaRepository: dependencies.metaConnections,
    policyRepository: dependencies.policies,
  }, dependencies.clock);
  const [readPolicy, approvePolicy, killSwitchPolicy] =
    railwaySystemAdminWhatsappDeliveryPolicyOperationPolicies;

  return Object.freeze([
    Object.freeze({
      id: readPolicy.id,
      requestKind: readPolicy.requestKind,
      async execute(
        context: Readonly<RailwayApiDispatchContext>,
        payload: RailwayApiJsonObject,
        request: Readonly<RailwayApiRequestEnvelope>,
      ) {
        try {
          if (
            !hasExactKeys(payload, ["targetTenantId"]) ||
            request.operation !== readPolicy.id ||
            request.requestKind !== "query" ||
            request.idempotencyKey !== null
          ) {
            invalidRequest();
          }

          resolveSystemAdminSession(
            context.userIdentity,
            dependencies.allowedExternalUserIds,
          );
          const tenantId =
            requireWhatsappDeliveryPolicyPositiveInteger(
              payload.targetTenantId,
              "tenant",
            );
          const [connection, record] = await Promise.all([
            dependencies.metaConnections.findConnectionByTenantId(tenantId),
            dependencies.policies.findLatestPolicyEvent(tenantId),
          ]);

          if (!connection) {
            throw new RailwayApiDispatchError("NOT_FOUND");
          }

          if (
            connection.tenantId !== tenantId ||
            (record !== null && record.tenantId !== tenantId)
          ) {
            throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
          }

          return Object.freeze({
            connection: Object.freeze({
              businessPortfolioIdentifier: connection.businessPortfolioId,
              wabaIdentifier: connection.wabaId,
              phoneNumberIdentifier: connection.phoneNumberId,
              status: connection.status,
              version: connection.version,
            }),
            record:
              record === null
                ? null
                : toRailwayPolicyView(record),
          });
        } catch (error) {
          mapError(error);
        }
      },
    }),
    Object.freeze({
      id: approvePolicy.id,
      requestKind: approvePolicy.requestKind,
      async execute(
        context: Readonly<RailwayApiDispatchContext>,
        payload: RailwayApiJsonObject,
        request: Readonly<RailwayApiRequestEnvelope>,
      ) {
        try {
          const session = await requireMutationRequest(
            dependencies,
            context,
            payload,
            request,
            approvePolicy.id,
            approvalPayloadKeys,
          );
          const result = await service.approve(session, {
            tenantId: payload.targetTenantId,
            expectedConnectionVersion: payload.expectedConnectionVersion,
            expectedPolicyVersion: payload.expectedPolicyVersion,
            businessPortfolioId:
              payload.expectedBusinessPortfolioIdentifier,
            wabaId: payload.expectedWabaIdentifier,
            phoneNumberId: payload.expectedPhoneNumberIdentifier,
            portfolioLimitKind: payload.portfolioLimitKind,
            portfolioLimitValue: payload.portfolioLimitValue,
            phoneThroughputMessagesPerSecond:
              payload.phoneThroughputMessagesPerSecond,
            maximumOutboundMessagesPerSecond:
              payload.maximumOutboundMessagesPerSecond,
            reservationDurationSeconds: payload.reservationDurationSeconds,
            metaGraphApiVersion: payload.metaGraphApiVersion,
            evidenceDigest: payload.evidenceDigest,
            evidenceCheckedAt: payload.evidenceCheckedAt,
            evidenceExpiresAt: payload.evidenceExpiresAt,
          });

          if (result.outcome === "conflict") {
            throw new RailwayApiDispatchError("CONFLICT");
          }

          return Object.freeze({
            outcome: result.outcome,
            record: toRailwayPolicyView(result.record),
          });
        } catch (error) {
          mapError(error);
        }
      },
    }),
    Object.freeze({
      id: killSwitchPolicy.id,
      requestKind: killSwitchPolicy.requestKind,
      async execute(
        context: Readonly<RailwayApiDispatchContext>,
        payload: RailwayApiJsonObject,
        request: Readonly<RailwayApiRequestEnvelope>,
      ) {
        try {
          const session = await requireMutationRequest(
            dependencies,
            context,
            payload,
            request,
            killSwitchPolicy.id,
            killSwitchPayloadKeys,
          );
          const result = await service.activateKillSwitch(session, {
            tenantId: payload.targetTenantId,
            expectedConnectionVersion: payload.expectedConnectionVersion,
            expectedPolicyVersion: payload.expectedPolicyVersion,
          });

          if (result.outcome === "conflict") {
            throw new RailwayApiDispatchError("CONFLICT");
          }

          return Object.freeze({
            outcome: result.outcome,
            record: toRailwayPolicyView(result.record),
          });
        } catch (error) {
          mapError(error);
        }
      },
    }),
  ]);
}
