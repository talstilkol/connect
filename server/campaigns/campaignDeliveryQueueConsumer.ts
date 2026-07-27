import type {
  CampaignRepository,
} from "../../db/campaignRepository.ts";
import type {
  CampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
import type {
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
const AMBIGUOUS_ERROR_CODE =
  "DELIVERY_OUTCOME_UNKNOWN";

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

export function createCampaignDeliveryQueueConsumer(
  dispatch: CampaignDispatchRepository,
  campaigns: Pick<CampaignRepository, "findByKey">,
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

        if (!processor.isConfigured()) {
          delivery.retry({
            delaySeconds:
              UNAVAILABLE_RETRY_DELAY_SECONDS,
          });
          result.retried += 1;
          continue;
        }

        const now = currentTimestamp(clock);
        let campaign;

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
          delivery.retry({
            delaySeconds:
              STORAGE_RETRY_DELAY_SECONDS,
          });
          result.retried += 1;
          continue;
        }

        if (prepared.outcome === "skipped") {
          delivery.ack();
          result.skipped += 1;
          continue;
        }

        if (prepared.outcome === "duplicate") {
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
