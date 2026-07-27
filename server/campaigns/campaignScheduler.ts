import type {
  CampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
import {
  createCampaignDeliveryQueueMessage,
  type CampaignDeliveryQueueMessage,
} from "./campaignDeliveryQueueMessage.ts";

const CAMPAIGN_PROMOTION_LIMIT = 50;
const CAMPAIGN_RECIPIENT_BATCH_SIZE = 50;
const CAMPAIGN_COMPLETION_LIMIT = 50;

export interface CampaignDeliveryQueueBinding {
  sendBatch(
    messages: readonly {
      body: CampaignDeliveryQueueMessage;
      contentType: "json";
    }[],
  ): Promise<unknown>;
}

export interface CampaignSchedulerClock {
  now(): Date;
}

export interface CampaignSchedulerResult {
  completedCampaigns: number;
  promotedCampaigns: number;
  queuedRecipients: number;
}

export class CampaignSchedulerError extends Error {
  constructor() {
    super("Campaign scheduler failed");
    this.name = "CampaignSchedulerError";
  }
}

function currentTimestamp(
  clock: CampaignSchedulerClock,
): string {
  const current = clock.now();

  if (
    !(current instanceof Date) ||
    !Number.isFinite(current.getTime())
  ) {
    throw new CampaignSchedulerError();
  }

  return current.toISOString();
}

export function createCampaignScheduler(
  repository: CampaignDispatchRepository,
  queue: CampaignDeliveryQueueBinding,
  clock: CampaignSchedulerClock,
): {
  run(): Promise<CampaignSchedulerResult>;
} {
  if (
    !queue ||
    typeof queue.sendBatch !== "function"
  ) {
    throw new Error(
      "CAMPAIGN_DELIVERY_QUEUE binding must be configured",
    );
  }

  return {
    async run() {
      const now = currentTimestamp(clock);
      let completedCampaigns;
      let promoted;
      let jobs;

      try {
        completedCampaigns =
          await repository.completeSettledCampaigns(
            now,
            CAMPAIGN_COMPLETION_LIMIT,
          );
        promoted =
          await repository.promoteDueCampaigns(
            now,
            CAMPAIGN_PROMOTION_LIMIT,
          );
        jobs =
          await repository.claimPendingRecipients(
            now,
            CAMPAIGN_RECIPIENT_BATCH_SIZE,
          );
      } catch {
        throw new CampaignSchedulerError();
      }

      if (jobs.length === 0) {
        return {
          completedCampaigns,
          promotedCampaigns: promoted.length,
          queuedRecipients: 0,
        };
      }

      try {
        await queue.sendBatch(
          jobs.map((job) => ({
            body:
              createCampaignDeliveryQueueMessage(
                job.deliveryKey,
              ),
            contentType: "json" as const,
          })),
        );
      } catch {
        try {
          await repository.releaseQueuedRecipients(
            jobs.map((job) => job.deliveryKey),
            now,
          );
        } catch {
          throw new CampaignSchedulerError();
        }

        throw new CampaignSchedulerError();
      }

      return {
        completedCampaigns,
        promotedCampaigns: promoted.length,
        queuedRecipients: jobs.length,
      };
    },
  };
}
