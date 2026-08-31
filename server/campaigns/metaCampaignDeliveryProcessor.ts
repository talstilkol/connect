import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  CampaignDeliveryProcessor,
  CampaignDeliveryProcessorResult,
  PreparedCampaignDelivery,
} from "../../shared/domain/campaignDelivery.ts";
import type {
  WhatsappProviderCooldownErrorCode,
  WhatsappProviderCooldownScope,
} from "../../shared/domain/whatsappRateLimit.ts";
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
  MetaCampaignTemplateContractError,
  type MetaCampaignTemplateSender,
} from "./metaCampaignTemplateAdapter.ts";

const campaignKeyPattern =
  /^campaign_v1_[0-9a-f]{64}$/;
const campaignDeliveryKeyPattern =
  /^campaign_delivery_v1_[0-9a-f]{64}$/;
const rateLimitReservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const providerMessageIdPattern = /^wamid\.\S{1,249}$/;
const phoneNumberIdPattern = /^[1-9][0-9]{0,63}$/;

export interface MetaCampaignDeliveryProcessorDependencies {
  metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  credentialVault: MetaCredentialVault;
  sender: MetaCampaignTemplateSender;
  retryPolicy: MetaCampaignDeliveryRetryPolicy;
}

export interface MetaCampaignDeliveryRetryPolicyRequest {
  tenantId: number;
  templateCategory: "MARKETING" | "UTILITY";
  attemptCount: number;
  providerErrorCode: WhatsappProviderCooldownErrorCode;
  cooldownScope: WhatsappProviderCooldownScope;
  providerRetryAfterSeconds: number | null;
}

export type MetaCampaignDeliveryRetryPolicyDecision =
  | {
      action: "stop";
    }
  | {
      action: "defer";
      retryAfterSeconds: number;
    };

export interface MetaCampaignDeliveryRetryPolicy {
  isConfigured(): boolean;
  decide(
    request: MetaCampaignDeliveryRetryPolicyRequest,
  ):
    | MetaCampaignDeliveryRetryPolicyDecision
    | Promise<MetaCampaignDeliveryRetryPolicyDecision>;
}

function rejected(
  errorCode: string,
): CampaignDeliveryProcessorResult {
  return {
    outcome: "rejected",
    errorCode,
  };
}

function deliveryIsValid(
  delivery: PreparedCampaignDelivery,
): boolean {
  const { campaign, recipient } = delivery;

  return (
    Number.isSafeInteger(campaign.tenantId) &&
    campaign.tenantId > 0 &&
    campaign.tenantId === recipient.tenantId &&
    campaign.campaignKey === recipient.campaignKey &&
    campaign.status === "running" &&
    recipient.status === "sending" &&
    Number.isSafeInteger(recipient.attemptCount) &&
    recipient.attemptCount > 0 &&
    recipient.attemptCount ===
      delivery.deliveryAttemptNumber &&
    Number.isSafeInteger(
      delivery.queueAttemptNumber,
    ) &&
    delivery.queueAttemptNumber > 0 &&
    campaignKeyPattern.test(campaign.campaignKey) &&
    campaignDeliveryKeyPattern.test(
      recipient.deliveryKey,
    ) &&
    rateLimitReservationKeyPattern.test(
      delivery.rateLimitReservationKey,
    )
  );
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
    case 131064:
      return "META_TEMPLATE_CLASSIFICATION_BLOCKED";
    case 132000:
      return "META_TEMPLATE_PARAMETER_MISMATCH";
    case 132012:
      return "META_TEMPLATE_UNAVAILABLE";
    case 132015:
      return "META_TEMPLATE_PAUSED";
    case 132016:
      return "META_TEMPLATE_DISABLED";
    default:
      return "META_DELIVERY_REJECTED";
  }
}

function providerCooldown(
  graphCode: number | null,
): {
  providerErrorCode: WhatsappProviderCooldownErrorCode;
  cooldownScope: WhatsappProviderCooldownScope;
} | null {
  switch (graphCode) {
    case 130429:
      return {
        providerErrorCode: 130429,
        cooldownScope: "sender",
      };
    case 131049:
      return {
        providerErrorCode: 131049,
        cooldownScope: "portfolio-recipient",
      };
    case 131056:
      return {
        providerErrorCode: 131056,
        cooldownScope: "pair",
      };
    default:
      return null;
  }
}

function retryPolicyIsConfigured(
  policy: MetaCampaignDeliveryRetryPolicy,
): boolean {
  try {
    return policy.isConfigured() === true;
  } catch {
    return false;
  }
}

function validRetryDecision(
  value: MetaCampaignDeliveryRetryPolicyDecision,
  providerErrorCode: WhatsappProviderCooldownErrorCode,
): value is MetaCampaignDeliveryRetryPolicyDecision {
  if (
    value &&
    value.action === "stop" &&
    Object.keys(value).length === 1
  ) {
    return true;
  }

  return (
    value !== null &&
    typeof value === "object" &&
    value.action === "defer" &&
    Object.keys(value).length === 2 &&
    Number.isSafeInteger(value.retryAfterSeconds) &&
    value.retryAfterSeconds > 0 &&
    value.retryAfterSeconds <= 24 * 60 * 60 &&
    (providerErrorCode !== 131049 ||
      value.retryAfterSeconds === 24 * 60 * 60)
  );
}

async function classifySubmissionError(
  error: unknown,
  delivery: PreparedCampaignDelivery,
  retryPolicy: MetaCampaignDeliveryRetryPolicy,
): Promise<CampaignDeliveryProcessorResult> {
  if (
    error instanceof MetaCampaignTemplateContractError &&
    error.code === "INVALID_DELIVERY_REQUEST"
  ) {
    return rejected("META_DELIVERY_REQUEST_INVALID");
  }

  if (error instanceof MetaGraphError) {
    if (error.code === "INVALID_REQUEST") {
      return rejected("META_DELIVERY_REQUEST_INVALID");
    }

    if (
      error.code === "API_ERROR" &&
      error.httpStatus !== null &&
      error.httpStatus >= 400 &&
      error.httpStatus < 500
    ) {
      const errorCode = mappedGraphErrorCode(
        error.graphCode,
      );
      const cooldown = providerCooldown(
        error.graphCode,
      );

      if (!cooldown) {
        return rejected(errorCode);
      }

      if (
        cooldown.providerErrorCode === 131049 &&
        delivery.campaign.template.category !==
          "MARKETING"
      ) {
        return rejected(errorCode);
      }

      try {
        const decision = await retryPolicy.decide({
          tenantId: delivery.campaign.tenantId,
          templateCategory:
            delivery.campaign.template.category,
          attemptCount:
            delivery.recipient.attemptCount,
          providerRetryAfterSeconds:
            error.retryAfterSeconds,
          ...cooldown,
        });

        if (
          !validRetryDecision(
            decision,
            cooldown.providerErrorCode,
          ) ||
          decision.action === "stop"
        ) {
          return rejected(errorCode);
        }

        return {
          outcome: "deferred",
          errorCode,
          ...cooldown,
          retryAfterSeconds:
            decision.retryAfterSeconds,
        };
      } catch {
        return rejected(errorCode);
      }
    }
  }

  throw new Error(
    "Meta campaign delivery outcome is uncertain",
  );
}

export function createMetaCampaignDeliveryProcessor(
  dependencies: MetaCampaignDeliveryProcessorDependencies,
): CampaignDeliveryProcessor {
  return {
    isConfigured() {
      return retryPolicyIsConfigured(
        dependencies.retryPolicy,
      );
    },

    async process(delivery) {
      if (
        !retryPolicyIsConfigured(
          dependencies.retryPolicy,
        )
      ) {
        return rejected("META_RETRY_POLICY_UNAVAILABLE");
      }

      if (!deliveryIsValid(delivery)) {
        return rejected("META_DELIVERY_REQUEST_INVALID");
      }

      let connection;

      try {
        connection =
          await dependencies.metaConnections
            .findConnectionByTenantId(
              delivery.campaign.tenantId,
            );
      } catch {
        return rejected("META_CONNECTION_UNAVAILABLE");
      }

      if (
        !connection ||
        connection.tenantId !==
          delivery.campaign.tenantId ||
        connection.status !== "connected" ||
        !phoneNumberIdPattern.test(
          connection.phoneNumberId,
        )
      ) {
        return rejected("META_CONNECTION_UNAVAILABLE");
      }

      try {
        return await dependencies.credentialVault
          .withAccessToken(
            delivery.campaign.tenantId,
            async (accessToken) => {
              try {
                const acceptance =
                  await dependencies.sender.send({
                    phoneNumberId:
                      connection.phoneNumberId,
                    recipientPhoneNumber:
                      delivery.recipient.phoneNumber,
                    deliveryKey:
                      delivery.recipient.deliveryKey,
                    accessToken,
                    template:
                      delivery.campaign.template,
                    personalization:
                      delivery.recipient.personalization,
                  });

                if (
                  !acceptance ||
                  !providerMessageIdPattern.test(
                    acceptance.providerMessageId,
                  ) ||
                  acceptance.providerMessageId.length >
                    255
                ) {
                  throw new Error(
                    "Meta campaign delivery response is invalid",
                  );
                }

                return {
                  outcome: "accepted" as const,
                  providerMessageId:
                    acceptance.providerMessageId,
                };
              } catch (error) {
                return classifySubmissionError(
                  error,
                  delivery,
                  dependencies.retryPolicy,
                );
              }
            },
          );
      } catch (error) {
        if (error instanceof MetaCredentialVaultError) {
          return rejected("META_CREDENTIAL_UNAVAILABLE");
        }

        throw new Error(
          "Meta campaign delivery outcome is uncertain",
        );
      }
    },
  };
}
