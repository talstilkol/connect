import type {
  CampaignRepository,
} from "../../db/campaignRepository.ts";
import type {
  CampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
import type {
  CampaignDeliveryProviderRepository,
} from "../../db/campaignDeliveryProviderRepository.ts";
import type {
  CampaignDeliveryAdmissionController,
  CampaignDeliveryAdmissionResult,
  CampaignDeliveryProcessor,
  CampaignDeliveryProcessorResult,
} from "../../shared/domain/campaignDelivery.ts";
import {
  parseCampaignDeliveryQueueMessage,
} from "./campaignDeliveryQueueMessage.ts";
import {
  assertQueueBatchCapacity,
} from "../operations/queueBackpressure.ts";

const UNAVAILABLE_RETRY_DELAY_SECONDS = 60;
const STORAGE_RETRY_DELAY_SECONDS = 30;
const MAXIMUM_QUEUE_RETRY_DELAY_SECONDS =
  24 * 60 * 60;
const AMBIGUOUS_ERROR_CODE =
  "DELIVERY_OUTCOME_UNKNOWN";
const PROVIDER_RETRY_STATE_ERROR_CODE =
  "PROVIDER_RETRY_STATE_UNKNOWN";
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;

export interface CampaignDeliveryQueueDelivery {
  readonly id: string;
  readonly timestamp: Date;
  readonly attempts: number;
  body: unknown;
  ack(): void;
  retry(options?: {
    delaySeconds: number;
  }): void;
}

export interface CampaignDeliveryQueueBatch {
  readonly queue: string;
  messages: readonly CampaignDeliveryQueueDelivery[];
}

export interface CampaignDeliveryQueueConsumerResult {
  accepted: number;
  rejected: number;
  deferred: number;
  skipped: number;
  duplicates: number;
  ambiguous: number;
  discarded: number;
  retried: number;
}

export interface CampaignDeliveryConsumerClock {
  now(): Date;
}

function currentTimestamp(
  clock: CampaignDeliveryConsumerClock,
): string {
  const current = clock.now();

  if (
    !(current instanceof Date) ||
    !Number.isFinite(current.getTime())
  ) {
    throw new Error(
      "campaign delivery clock is invalid",
    );
  }

  return current.toISOString();
}

function isErrorCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Z0-9_]{1,100}$/.test(value)
  );
}

function parseProcessorResult(
  value: CampaignDeliveryProcessorResult,
): CampaignDeliveryProcessorResult | null {
  if (
    value &&
    value.outcome === "accepted" &&
    typeof value.providerMessageId === "string" &&
    value.providerMessageId.trim() ===
      value.providerMessageId &&
    value.providerMessageId.length > 0 &&
    value.providerMessageId.length <= 255
  ) {
    return {
      outcome: "accepted",
      providerMessageId: value.providerMessageId,
    };
  }

  if (
    value &&
    value.outcome === "deferred" &&
    isErrorCode(value.errorCode) &&
    Number.isSafeInteger(value.retryAfterSeconds) &&
    value.retryAfterSeconds > 0 &&
    value.retryAfterSeconds <=
      MAXIMUM_QUEUE_RETRY_DELAY_SECONDS &&
    (
      (value.providerErrorCode === 130429 &&
        value.cooldownScope === "sender") ||
      (value.providerErrorCode === 131049 &&
        value.cooldownScope ===
          "portfolio-recipient" &&
        value.retryAfterSeconds ===
          MAXIMUM_QUEUE_RETRY_DELAY_SECONDS) ||
      (value.providerErrorCode === 131056 &&
        value.cooldownScope === "pair")
    )
  ) {
    return {
      outcome: "deferred",
      errorCode: value.errorCode,
      providerErrorCode: value.providerErrorCode,
      cooldownScope: value.cooldownScope,
      retryAfterSeconds: value.retryAfterSeconds,
    };
  }

  if (
    value &&
    value.outcome === "rejected" &&
    isErrorCode(value.errorCode)
  ) {
    return {
      outcome: "rejected",
      errorCode: value.errorCode,
    };
  }

  return null;
}

function parseAdmissionResult(
  value: CampaignDeliveryAdmissionResult,
): CampaignDeliveryAdmissionResult | null {
  if (
    value &&
    value.outcome === "reserved" &&
    reservationKeyPattern.test(value.reservationKey)
  ) {
    return {
      outcome: "reserved",
      reservationKey: value.reservationKey,
    };
  }

  if (
    value &&
    value.outcome === "deferred" &&
    isErrorCode(value.errorCode) &&
    Number.isSafeInteger(value.retryAfterSeconds) &&
    value.retryAfterSeconds > 0 &&
    value.retryAfterSeconds <=
      MAXIMUM_QUEUE_RETRY_DELAY_SECONDS
  ) {
    return {
      outcome: "deferred",
      errorCode: value.errorCode,
      retryAfterSeconds: value.retryAfterSeconds,
    };
  }

  return null;
}

async function settleSafely(
  admission: CampaignDeliveryAdmissionController,
  reservationKey: string,
  outcome:
    | "provider-failed"
    | "cancelled-before-submit",
  settledAt: string,
): Promise<void> {
  try {
    await admission.settle(
      reservationKey,
      outcome,
      settledAt,
    );
  } catch {
    // A leaked reservation expires fail-closed. It must
    // never cause a duplicate provider submission.
  }
}

export function createCampaignDeliveryQueueConsumer(
  dispatch: CampaignDispatchRepository,
  campaigns: Pick<CampaignRepository, "findByKey">,
  providerDeliveries:
    Pick<CampaignDeliveryProviderRepository, "recordAccepted">,
  admission: CampaignDeliveryAdmissionController,
  processor: CampaignDeliveryProcessor,
  clock: CampaignDeliveryConsumerClock,
): {
  handle(
    batch: CampaignDeliveryQueueBatch,
  ): Promise<CampaignDeliveryQueueConsumerResult>;
} {
  return {
    async handle(batch) {
      assertQueueBatchCapacity(batch.messages);
      const result: CampaignDeliveryQueueConsumerResult = {
        accepted: 0,
        rejected: 0,
        deferred: 0,
        skipped: 0,
        duplicates: 0,
        ambiguous: 0,
        discarded: 0,
        retried: 0,
      };

      for (const delivery of batch.messages) {
        const message =
          parseCampaignDeliveryQueueMessage(
            delivery.body,
          );

        if (!message) {
          delivery.ack();
          result.discarded += 1;
          continue;
        }

        if (
          !Number.isSafeInteger(delivery.attempts) ||
          delivery.attempts < 1 ||
          typeof delivery.id !== "string" ||
          delivery.id.trim() !== delivery.id ||
          !/^[^\u0000-\u001f\u007f]{1,255}$/.test(
            delivery.id,
          )
        ) {
          delivery.ack();
          result.discarded += 1;
          continue;
        }

        if (
          !admission.isConfigured() ||
          !processor.isConfigured()
        ) {
          delivery.retry({
            delaySeconds:
              UNAVAILABLE_RETRY_DELAY_SECONDS,
          });
          result.retried += 1;
          continue;
        }

        const now = currentTimestamp(clock);
        let campaign;
        let recipientPhoneNumber: string;
        let deliveryAttemptNumber: number;

        try {
          const context =
            await dispatch.findQueuedDeliveryContext(
              message.deliveryKey,
            );

          if (!context) {
            delivery.ack();
            result.duplicates += 1;
            continue;
          }

          campaign = await campaigns.findByKey(
            context.tenantId,
            context.campaignKey,
          );

          if (
            !campaign ||
            campaign.status !== "running"
          ) {
            throw new Error(
              "campaign delivery context is unavailable",
            );
          }

          recipientPhoneNumber =
            context.recipientPhoneNumber;
          deliveryAttemptNumber =
            context.nextDeliveryAttemptNumber;
        } catch {
          delivery.retry({
            delaySeconds:
              STORAGE_RETRY_DELAY_SECONDS,
          });
          result.retried += 1;
          continue;
        }

        let reservationKey: string;

        try {
          const admissionResult =
            parseAdmissionResult(
              await admission.reserve({
                campaign,
                deliveryKey: message.deliveryKey,
                recipientPhoneNumber,
                deliveryAttemptNumber,
                queueAttemptNumber: delivery.attempts,
                queueMessageId: delivery.id,
                reservedAt: now,
              }),
            );

          if (!admissionResult) {
            throw new Error(
              "campaign delivery admission result is invalid",
            );
          }

          if (admissionResult.outcome === "deferred") {
            delivery.retry({
              delaySeconds:
                admissionResult.retryAfterSeconds,
            });
            result.deferred += 1;
            result.retried += 1;
            continue;
          }

          reservationKey =
            admissionResult.reservationKey;
        } catch {
          delivery.retry({
            delaySeconds:
              STORAGE_RETRY_DELAY_SECONDS,
          });
          result.retried += 1;
          continue;
        }

        let prepared;

        try {
          prepared = await dispatch.prepareDelivery(
            message.deliveryKey,
            now,
          );
        } catch {
          await settleSafely(
            admission,
            reservationKey,
            "cancelled-before-submit",
            now,
          );
          delivery.retry({
            delaySeconds:
              STORAGE_RETRY_DELAY_SECONDS,
          });
          result.retried += 1;
          continue;
        }

        if (prepared.outcome === "skipped") {
          await settleSafely(
            admission,
            reservationKey,
            "cancelled-before-submit",
            now,
          );
          delivery.ack();
          result.skipped += 1;
          continue;
        }

        if (prepared.outcome === "duplicate") {
          await settleSafely(
            admission,
            reservationKey,
            "cancelled-before-submit",
            now,
          );
          delivery.ack();
          result.duplicates += 1;
          continue;
        }

        try {
          const processorResult =
            parseProcessorResult(
              await processor.process({
                campaign,
                recipient: prepared.recipient,
                rateLimitReservationKey:
                  reservationKey,
                deliveryAttemptNumber,
                queueAttemptNumber: delivery.attempts,
              }),
            );

          if (!processorResult) {
            throw new Error(
              "campaign delivery result is invalid",
            );
          }

          if (
            processorResult.outcome === "deferred" &&
            processorResult.providerErrorCode ===
              131049 &&
            campaign.template.category !== "MARKETING"
          ) {
            throw new Error(
              "marketing cooldown cannot apply to this campaign",
            );
          }

          if (
            processorResult.outcome === "accepted"
          ) {
            await providerDeliveries.recordAccepted({
              tenantId: campaign.tenantId,
              deliveryKey: message.deliveryKey,
              providerMessageId:
                processorResult.providerMessageId,
              reservationKey,
              acceptedAt: now,
            });
            delivery.ack();
            result.accepted += 1;
            continue;
          }

          if (
            processorResult.outcome === "deferred"
          ) {
            try {
              await admission.deferProviderRejection(
                reservationKey,
                processorResult.cooldownScope,
                processorResult.providerErrorCode,
                processorResult.retryAfterSeconds,
                now,
              );
              await dispatch.markDeferred(
                message.deliveryKey,
                processorResult.errorCode,
                now,
              );
              delivery.retry({
                delaySeconds:
                  processorResult.retryAfterSeconds,
              });
              result.deferred += 1;
              result.retried += 1;
            } catch {
              try {
                await dispatch.markAmbiguous(
                  message.deliveryKey,
                  PROVIDER_RETRY_STATE_ERROR_CODE,
                  now,
                );
              } catch {
                // The claimed delivery remains fail-closed.
              }

              delivery.ack();
              result.ambiguous += 1;
            }

            continue;
          }

          await dispatch.markRejected(
            message.deliveryKey,
            processorResult.errorCode,
            now,
          );
          await settleSafely(
            admission,
            reservationKey,
            "provider-failed",
            now,
          );
          delivery.ack();
          result.rejected += 1;
        } catch {
          try {
            await dispatch.markAmbiguous(
              message.deliveryKey,
              AMBIGUOUS_ERROR_CODE,
              now,
            );
          } catch {
            // The delivery remains claimed. Never retry an
            // unknown external outcome automatically.
          }

          delivery.ack();
          result.ambiguous += 1;
        }
      }

      return result;
    },
  };
}
