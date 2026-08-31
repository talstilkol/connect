import type {
  ClaimBotReplyProviderRequestResult,
} from "../../db/botReplyDeliveryRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  BotReplyProcessor,
  BotReplyProcessorResult,
  PreparedBotReplyDelivery,
} from "../../shared/domain/botReplyDelivery.ts";
import {
  MetaCredentialVaultError,
} from "../meta/metaCredentialVault.ts";
import {
  MetaGraphError,
} from "../meta/metaGraphTransport.ts";
import type {
  MetaCredentialVault,
} from "../meta/metaPorts.ts";
import {
  MetaBotReplyContractError,
  type MetaBotReplySender,
} from "./metaBotReplyAdapter.ts";
import type {
  BotReplyAdmissionController,
} from "./botReplyAdmission.ts";
import {
  decideMetaBotReplyRetry,
} from "./metaBotReplyRetryPolicy.ts";

const deliveryKeyPattern =
  /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const conversationKeyPattern =
  /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern =
  /^message_v1_[0-9a-f]{64}$/;
const botFlowKeyPattern =
  /^bot_flow_v1_[0-9a-f]{64}$/;
const botFlowVersionKeyPattern =
  /^bot_flow_version_v1_[0-9a-f]{64}$/;
const phoneNumberIdPattern = /^[1-9][0-9]{0,63}$/;
const phoneNumberPattern = /^\+[1-9][0-9]{0,14}$/;
const SERVICE_WINDOW_DURATION_MILLISECONDS =
  24 * 60 * 60 * 1_000;
const LOCAL_DEPENDENCY_RETRY_MILLISECONDS = 60 * 1_000;
const providerRequestKeyPattern =
  /^bot_reply_provider_request_v1_[0-9a-f]{64}$/;

export interface MetaBotReplyProcessorDependencies {
  metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  credentialVault: MetaCredentialVault;
  admission: BotReplyAdmissionController;
  providerRequests: {
    claim(input: Readonly<{
      tenantId: number;
      deliveryKey: string;
      expectedClaimVersion: number;
      reservationKey: string;
      requestedAt: string;
    }>): Promise<ClaimBotReplyProviderRequestResult>;
  };
  sender: MetaBotReplySender;
}

type PendingProviderCooldownDeferral = Readonly<{
  outcome: "deferred";
  errorCode:
    | "META_PHONE_THROUGHPUT_LIMITED"
    | "META_PAIR_RATE_LIMITED";
  retryAt: string;
  providerErrorCode: 130429 | 131056;
  cooldownScope: "sender" | "pair";
  retryAfterSeconds: number;
}>;

type ClassifiedSubmissionFailure =
  | Readonly<{
      result: PendingProviderCooldownDeferral;
      settlement: "provider-cooldown";
    }>
  | Readonly<{
      result: BotReplyProcessorResult;
      settlement:
        | "cancelled-before-submit"
        | "provider-failed";
    }>;

function rejected(
  errorCode: string,
): BotReplyProcessorResult {
  return {
    outcome: "rejected",
    errorCode,
  };
}

function canonicalTimestampMilliseconds(
  value: unknown,
): number | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 40
  ) {
    return null;
  }

  const milliseconds = Date.parse(value);

  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    return null;
  }

  return milliseconds;
}

function serviceWindowIsValid(
  prepared: PreparedBotReplyDelivery,
): boolean {
  const openedAt = canonicalTimestampMilliseconds(
    prepared.serviceWindowOpenedAt,
  );
  const expiresAt = canonicalTimestampMilliseconds(
    prepared.serviceWindowExpiresAt,
  );
  const attemptedAt = canonicalTimestampMilliseconds(
    prepared.attemptedAt,
  );

  return (
    openedAt !== null &&
    expiresAt !== null &&
    attemptedAt !== null &&
    expiresAt - openedAt ===
      SERVICE_WINDOW_DURATION_MILLISECONDS &&
    attemptedAt >= openedAt &&
    attemptedAt < expiresAt
  );
}

function deliveryIsValid(
  prepared: PreparedBotReplyDelivery,
): boolean {
  const delivery = prepared.delivery;

  return (
    phoneNumberIdPattern.test(
      prepared.phoneNumberId,
    ) &&
    serviceWindowIsValid(prepared) &&
    Number.isSafeInteger(delivery.tenantId) &&
    delivery.tenantId > 0 &&
    deliveryKeyPattern.test(delivery.deliveryKey) &&
    conversationKeyPattern.test(
      delivery.conversationKey,
    ) &&
    messageKeyPattern.test(
      delivery.inboundMessageKey,
    ) &&
    botFlowKeyPattern.test(delivery.botFlowKey) &&
    botFlowVersionKeyPattern.test(
      delivery.botFlowVersionKey,
    ) &&
    Number.isSafeInteger(delivery.replyIndex) &&
    delivery.replyIndex > 0 &&
    phoneNumberPattern.test(
      delivery.recipientPhoneNumber,
    ) &&
    delivery.status === "sending" &&
    Number.isSafeInteger(delivery.attemptCount) &&
    delivery.attemptCount === 1 &&
    Number.isSafeInteger(delivery.claimVersion) &&
    delivery.claimVersion > 0 &&
    delivery.senderPhoneNumberId ===
      prepared.phoneNumberId &&
    delivery.nextAttemptAt === null &&
    delivery.deferredAt === null &&
    delivery.lastDeferralReasonCode === null &&
    delivery.providerMessageId === null &&
    delivery.acceptedAt === null
  );
}

function deferredBeforeProvider(
  prepared: PreparedBotReplyDelivery,
  errorCode: string,
): BotReplyProcessorResult {
  const attemptedAt = canonicalTimestampMilliseconds(
    prepared.attemptedAt,
  );
  const expiresAt = canonicalTimestampMilliseconds(
    prepared.serviceWindowExpiresAt,
  );

  if (attemptedAt === null || expiresAt === null) {
    return rejected("META_BOT_REPLY_REQUEST_INVALID");
  }

  const retryAtMilliseconds =
    attemptedAt + LOCAL_DEPENDENCY_RETRY_MILLISECONDS;

  if (retryAtMilliseconds >= expiresAt) {
    return rejected("META_SERVICE_WINDOW_CLOSED_LOCAL");
  }

  return {
    outcome: "deferred",
    errorCode,
    retryAt: new Date(retryAtMilliseconds).toISOString(),
  };
}

function mappedGraphErrorCode(
  graphCode: number | null,
): string {
  switch (graphCode) {
    case 4:
      return "META_APP_RATE_LIMITED";
    case 80007:
      return "META_WABA_RATE_LIMITED";
    case 130429:
      return "META_PHONE_THROUGHPUT_LIMITED";
    case 131026:
      return "META_MESSAGE_UNDELIVERABLE";
    case 131047:
      return "META_SERVICE_WINDOW_CLOSED";
    case 131048:
      return "META_QUALITY_RATE_LIMITED";
    case 131049:
      return "META_RECIPIENT_MARKETING_LIMITED";
    case 131056:
      return "META_PAIR_RATE_LIMITED";
    case 131057:
      return "META_PHONE_MAINTENANCE";
    default:
      return "META_BOT_REPLY_REJECTED";
  }
}

function providerCooldown(
  graphCode: number | null,
): Readonly<{
  providerErrorCode: 130429;
  cooldownScope: "sender";
}> | Readonly<{
  providerErrorCode: 131056;
  cooldownScope: "pair";
}> | null {
  if (graphCode === 130429) {
    return {
      providerErrorCode: 130429,
      cooldownScope: "sender",
    };
  }

  if (graphCode === 131056) {
    return {
      providerErrorCode: 131056,
      cooldownScope: "pair",
    };
  }

  // 131049 is Marketing-only and cannot be projected onto a service reply.
  return null;
}

function providerDeferral(
  error: MetaGraphError,
  prepared: PreparedBotReplyDelivery,
): PendingProviderCooldownDeferral | null {
  const cooldown = providerCooldown(error.graphCode);

  if (!cooldown) {
    return null;
  }

  const decision = decideMetaBotReplyRetry({
    attemptCount: prepared.delivery.attemptCount,
    providerRetryAfterSeconds:
      error.retryAfterSeconds,
    ...cooldown,
  });

  if (decision.action !== "defer") {
    return null;
  }

  const attemptedAt = canonicalTimestampMilliseconds(
    prepared.attemptedAt,
  );
  const expiresAt = canonicalTimestampMilliseconds(
    prepared.serviceWindowExpiresAt,
  );

  if (attemptedAt === null || expiresAt === null) {
    return null;
  }

  const retryAtMilliseconds =
    attemptedAt + decision.retryAfterSeconds * 1_000;

  if (retryAtMilliseconds >= expiresAt) {
    return null;
  }

  return {
    outcome: "deferred",
    errorCode: cooldown.providerErrorCode === 130429
      ? "META_PHONE_THROUGHPUT_LIMITED"
      : "META_PAIR_RATE_LIMITED",
    retryAt: new Date(
      retryAtMilliseconds,
    ).toISOString(),
    ...cooldown,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

function classifySubmissionError(
  error: unknown,
  prepared: PreparedBotReplyDelivery,
): ClassifiedSubmissionFailure {
  if (
    error instanceof MetaBotReplyContractError &&
    error.code === "INVALID_REPLY_REQUEST"
  ) {
    return {
      result: rejected(
        "META_BOT_REPLY_REQUEST_INVALID",
      ),
      settlement: "cancelled-before-submit",
    };
  }

  if (error instanceof MetaGraphError) {
    if (error.code === "INVALID_REQUEST") {
      return {
        result: rejected(
          "META_BOT_REPLY_REQUEST_INVALID",
        ),
        settlement: "cancelled-before-submit",
      };
    }

    if (
      error.code === "API_ERROR" &&
      error.httpStatus !== null &&
      error.httpStatus >= 400 &&
      error.httpStatus < 500
    ) {
      const deferred = providerDeferral(
        error,
        prepared,
      );

      if (deferred) {
        return {
          result: deferred,
          settlement: "provider-cooldown",
        };
      }

      return {
        result: rejected(
          mappedGraphErrorCode(error.graphCode),
        ),
        settlement: "provider-failed",
      };
    }
  }

  throw new Error(
    "Meta bot reply outcome is uncertain",
  );
}

function requireDependencies(
  dependencies: MetaBotReplyProcessorDependencies,
): void {
  if (
    typeof dependencies.metaConnections
      ?.findConnectionByTenantId !== "function" ||
    typeof dependencies.credentialVault
      ?.withAccessToken !== "function" ||
    typeof dependencies.admission
      ?.isConfigured !== "function" ||
    typeof dependencies.admission
      ?.reserve !== "function" ||
    typeof dependencies.admission
      ?.settleBeforeSubmit !== "function" ||
    typeof dependencies.admission
      ?.settleProviderFailure !== "function" ||
    typeof dependencies.admission
      ?.deferProviderRejection !== "function" ||
    typeof dependencies.providerRequests?.claim !== "function" ||
    typeof dependencies.sender?.send !== "function"
  ) {
    throw new Error(
      "Meta bot reply processor dependencies are invalid",
    );
  }
}

export function createMetaBotReplyProcessor(
  dependencies: MetaBotReplyProcessorDependencies,
): BotReplyProcessor {
  requireDependencies(dependencies);

  return {
    isConfigured() {
      try {
        return dependencies.admission.isConfigured() === true;
      } catch {
        return false;
      }
    },

    async process(prepared) {
      if (!deliveryIsValid(prepared)) {
        return rejected(
          "META_BOT_REPLY_REQUEST_INVALID",
        );
      }

      const delivery = prepared.delivery;
      let connection;

      try {
        connection =
          await dependencies.metaConnections
            .findConnectionByTenantId(
              delivery.tenantId,
            );
      } catch {
        return deferredBeforeProvider(
          prepared,
          "META_CONNECTION_UNAVAILABLE",
        );
      }

      if (
        !connection ||
        connection.tenantId !== delivery.tenantId ||
        connection.status !== "connected" ||
        !phoneNumberIdPattern.test(
          connection.phoneNumberId,
        ) ||
        connection.phoneNumberId !==
          prepared.phoneNumberId
      ) {
        return deferredBeforeProvider(
          prepared,
          "META_CONNECTION_UNAVAILABLE",
        );
      }

      try {
        return await dependencies.credentialVault
          .withAccessToken(
            delivery.tenantId,
            async (accessToken) => {
              let admission;

              try {
                admission =
                  await dependencies.admission.reserve({
                  tenantId: delivery.tenantId,
                  businessPortfolioId:
                    connection.businessPortfolioId,
                  wabaId: connection.wabaId,
                  phoneNumberId:
                    connection.phoneNumberId,
                  recipientPhoneNumber:
                    delivery.recipientPhoneNumber,
                  deliveryKey: delivery.deliveryKey,
                  deliveryAttemptNumber:
                    delivery.claimVersion,
                  reservedAt: prepared.attemptedAt,
                  serviceWindowExpiresAt:
                    prepared.serviceWindowExpiresAt,
                });
              } catch {
                return deferredBeforeProvider(
                  prepared,
                  "WHATSAPP_ADMISSION_UNAVAILABLE",
                );
              }

              if (admission.outcome === "deferred") {
                return admission;
              }

              const providerRequest =
                await dependencies.providerRequests.claim({
                  tenantId: delivery.tenantId,
                  deliveryKey: delivery.deliveryKey,
                  expectedClaimVersion: delivery.claimVersion,
                  reservationKey: admission.reservationKey,
                  requestedAt: prepared.attemptedAt,
                });

              if (
                !providerRequest ||
                Object.keys(providerRequest).sort().join(",") !==
                  "outcome,requestKey" ||
                providerRequest.outcome !== "created" ||
                !providerRequestKeyPattern.test(providerRequest.requestKey)
              ) {
                throw new Error(
                  "Meta bot reply provider request is already claimed",
                );
              }

              try {
                const acceptance =
                  await dependencies.sender.send({
                    phoneNumberId:
                      connection.phoneNumberId,
                    recipientPhoneNumber:
                      delivery.recipientPhoneNumber,
                    deliveryKey:
                      delivery.deliveryKey,
                    accessToken,
                    reply: delivery.reply,
                  });

                return {
                  outcome: "accepted",
                  providerMessageId:
                    acceptance.providerMessageId,
                  reservationKey:
                    admission.reservationKey,
                } as const;
              } catch (error) {
                const classified =
                  classifySubmissionError(
                    error,
                    prepared,
                  );

                if (
                  classified.settlement ===
                  "provider-cooldown"
                ) {
                  const result = classified.result;

                  if (
                    result.outcome !== "deferred" ||
                    result.providerErrorCode === undefined ||
                    result.cooldownScope === undefined ||
                    result.retryAfterSeconds === undefined
                  ) {
                    throw new Error(
                      "Meta bot reply cooldown result is invalid",
                    );
                  }

                  await dependencies.admission
                    .deferProviderRejection(
                      admission.reservationKey,
                      result.cooldownScope,
                      result.providerErrorCode,
                      result.retryAfterSeconds,
                      prepared.attemptedAt,
                    );
                  return {
                    ...classified.result,
                    reservationKey:
                      admission.reservationKey,
                  };
                }

                if (
                  classified.settlement ===
                  "cancelled-before-submit"
                ) {
                  await dependencies.admission
                    .settleBeforeSubmit(
                      admission.reservationKey,
                      prepared.attemptedAt,
                    );
                } else {
                  await dependencies.admission
                    .settleProviderFailure(
                      admission.reservationKey,
                      prepared.attemptedAt,
                    );
                }

                if (
                  classified.settlement === "provider-failed" &&
                  classified.result.outcome === "rejected" &&
                  classified.result.errorCode ===
                    "META_SERVICE_WINDOW_CLOSED" &&
                  error instanceof MetaGraphError &&
                  error.graphCode === 131047
                ) {
                  return {
                    outcome: "rejected",
                    errorCode: "META_SERVICE_WINDOW_CLOSED",
                    reservationKey: admission.reservationKey,
                    providerErrorCode: 131047,
                  } as const;
                }

                return classified.result;
              }
            },
          );
      } catch (error) {
        if (
          error instanceof MetaCredentialVaultError
        ) {
          return deferredBeforeProvider(
            prepared,
            "META_CREDENTIAL_UNAVAILABLE",
          );
        }

        throw error;
      }
    },
  };
}
