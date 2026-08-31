import {
  requireDatabase,
  type DatabaseEnvironment,
} from "../../db/d1.ts";
import { createMetaRepository } from "../../db/metaRepository.ts";
import {
  requireMetaWebhookConfiguration,
  type MetaWebhookEnvironment,
} from "./metaWebhookConfiguration.ts";
import {
  createMetaWebhookHttpHandler,
  type MetaWebhookHttpHandler,
} from "./metaWebhookHttpHandler.ts";
import {
  createMetaWebhookIngress,
  type MetaWebhookProcessor,
} from "./metaWebhookIngress.ts";
import {
  createMetaWebhookQueueConsumer,
  type MetaWebhookQueueBatch,
  type MetaWebhookQueueConsumerResult,
} from "./metaWebhookQueueConsumer.ts";
import {
  createMetaWebhookQueuePublisher,
  MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES,
  type MetaWebhookQueueBinding,
} from "./metaWebhookQueuePublisher.ts";
import {
  createCloudflareMetaWebhookQueuePort,
} from "./metaWebhookQueuePort.ts";
import {
  createRateLimitGuard,
  type RateLimitBinding,
} from "../security/rateLimit.ts";
import {
  readCurrentOperationalTelemetrySink,
} from "../operations/currentOperationalTelemetry.ts";
import {
  observeMetaWebhookQueueHandler,
} from "../operations/queueTelemetry.ts";

export interface MetaWebhookQueueEnvironment
  extends DatabaseEnvironment,
    MetaWebhookEnvironment {
  META_WEBHOOK_QUEUE?: MetaWebhookQueueBinding;
  META_WEBHOOK_RATE_LIMITER?: RateLimitBinding;
}

function requireQueue(
  environment: MetaWebhookQueueEnvironment,
): MetaWebhookQueueBinding {
  if (
    !environment.META_WEBHOOK_QUEUE ||
    typeof environment.META_WEBHOOK_QUEUE.send !== "function"
  ) {
    throw new Error(
      "Missing required queue binding: META_WEBHOOK_QUEUE",
    );
  }

  return environment.META_WEBHOOK_QUEUE;
}

function unavailableResponse(): Response {
  return new Response("WEBHOOK_UNAVAILABLE", {
    status: 503,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

export function createMetaWebhookQueueHttpHandler(
  environment: MetaWebhookQueueEnvironment,
): MetaWebhookHttpHandler {
  const configuration =
    requireMetaWebhookConfiguration(environment);
  const repository = createMetaRepository(
    requireDatabase(environment),
  );
  const publisher = createMetaWebhookQueuePublisher(
    repository,
    createCloudflareMetaWebhookQueuePort(
      requireQueue(environment),
    ),
    configuration.appSecret,
    createRateLimitGuard(
      environment.META_WEBHOOK_RATE_LIMITER,
      "meta-webhook",
    ),
  );

  return createMetaWebhookHttpHandler(
    publisher,
    configuration.verifyToken,
    {
      maximumBodyBytes:
        MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES,
    },
  );
}

export async function handleMetaWebhookQueueRoute(
  request: Request,
  environment: MetaWebhookQueueEnvironment,
): Promise<Response> {
  try {
    return await createMetaWebhookQueueHttpHandler(
      environment,
    ).handle(request);
  } catch {
    return unavailableResponse();
  }
}

export function createMetaWebhookQueueBatchHandler(
  environment: MetaWebhookQueueEnvironment,
  processor: MetaWebhookProcessor,
): {
  handle(
    batch: MetaWebhookQueueBatch,
  ): Promise<MetaWebhookQueueConsumerResult>;
} {
  const configuration =
    requireMetaWebhookConfiguration(environment);
  const repository = createMetaRepository(
    requireDatabase(environment),
  );
  const ingress = createMetaWebhookIngress(
    repository,
    processor,
    configuration.appSecret,
  );

  return observeMetaWebhookQueueHandler(
    createMetaWebhookQueueConsumer(ingress),
    readCurrentOperationalTelemetrySink(),
    {
      now() {
        return new Date();
      },
    },
  );
}
