import type {
  CampaignRepository,
} from "../../db/campaignRepository.ts";
import type {
  CampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
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
    value.outcome === "accepted"
  ) {
    return { outcome: "accepted" };
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
              }),
            );

          if (!processorResult) {
            throw new Error(
              "campaign delivery result is invalid",
            );
          }

          if (
            processorResult.outcome === "accepted"
          ) {
            await dispatch.markAccepted(
              message.deliveryKey,
              now,
            );
            delivery.ack();
            result.accepted += 1;
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
