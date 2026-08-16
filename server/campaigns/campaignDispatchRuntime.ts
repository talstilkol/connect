import {
  createCampaignRepository,
} from "../../db/campaignRepository.ts";
import {
  createMetaRepository,
} from "../../db/metaRepository.ts";
import {
  createCampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
import {
  createCampaignDeliveryProviderRepository,
} from "../../db/campaignDeliveryProviderRepository.ts";
import {
  createWhatsappRateLimitRepository,
} from "../../db/whatsappRateLimitRepository.ts";
import {
  requireDatabase,
  type DatabaseEnvironment,
} from "../../db/d1.ts";
import type {
  CampaignDeliveryProcessor,
} from "../../shared/domain/campaignDelivery.ts";
import {
  createCampaignDeliveryAdmission,
} from "./campaignDeliveryAdmission.ts";
import {
  createCampaignDeliveryRateLimitContextResolver,
  type CampaignDeliveryRateLimitPolicySource,
} from "./campaignDeliveryRateLimitContextResolver.ts";
import {
  createWhatsappRateLimitKeyDeriver,
  type WhatsappRateLimitKeyEnvironment,
} from "./whatsappRateLimitKeyDeriver.ts";
import {
  createCampaignDeliveryQueueConsumer,
  type CampaignDeliveryQueueBatch,
  type CampaignDeliveryQueueConsumerResult,
} from "./campaignDeliveryQueueConsumer.ts";
import {
  createCampaignScheduler,
  type CampaignDeliveryQueueBinding,
  type CampaignSchedulerResult,
} from "./campaignScheduler.ts";
import {
  readCurrentOperationalTelemetrySink,
} from "../operations/currentOperationalTelemetry.ts";
import {
  observeCampaignDeliveryQueueHandler,
} from "../operations/queueTelemetry.ts";

export interface CampaignDispatchEnvironment
  extends DatabaseEnvironment,
    WhatsappRateLimitKeyEnvironment {
  CAMPAIGN_DELIVERY_QUEUE?:
    CampaignDeliveryQueueBinding;
}

function requireQueue(
  environment: CampaignDispatchEnvironment,
): CampaignDeliveryQueueBinding {
  if (
    !environment.CAMPAIGN_DELIVERY_QUEUE ||
    typeof environment.CAMPAIGN_DELIVERY_QUEUE
      .sendBatch !== "function"
  ) {
    throw new Error(
      "Missing required queue binding: CAMPAIGN_DELIVERY_QUEUE",
    );
  }

  return environment.CAMPAIGN_DELIVERY_QUEUE;
}

function runtimeClock(): {
  now(): Date;
} {
  return {
    now() {
      return new Date();
    },
  };
}

export function createCampaignScheduledHandler(
  environment: CampaignDispatchEnvironment,
): {
  run(): Promise<CampaignSchedulerResult>;
} {
  const repository =
    createCampaignDispatchRepository(
      requireDatabase(environment),
    );

  return createCampaignScheduler(
    repository,
    requireQueue(environment),
    runtimeClock(),
  );
}

export function createCampaignDeliveryBatchHandler(
  environment: CampaignDispatchEnvironment,
  rateLimitPolicy:
    CampaignDeliveryRateLimitPolicySource,
  processor: CampaignDeliveryProcessor,
): {
  handle(
    batch: CampaignDeliveryQueueBatch,
  ): Promise<CampaignDeliveryQueueConsumerResult>;
} {
  const database = requireDatabase(environment);

  return observeCampaignDeliveryQueueHandler(
    createCampaignDeliveryQueueConsumer(
      createCampaignDispatchRepository(database),
      createCampaignRepository(database),
      createCampaignDeliveryProviderRepository(
        database,
      ),
      createCampaignDeliveryAdmission(
        createWhatsappRateLimitRepository(database),
        createCampaignDeliveryRateLimitContextResolver(
          createMetaRepository(database),
          createWhatsappRateLimitKeyDeriver(
            environment,
          ),
          rateLimitPolicy,
        ),
      ),
      processor,
      runtimeClock(),
    ),
    readCurrentOperationalTelemetrySink(),
    runtimeClock(),
  );
}
