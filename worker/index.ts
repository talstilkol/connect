/** Cloudflare Worker entry point for the Connect web application. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import type { D1DatabaseBinding } from "../db/d1";
import {
  createConversationRepository,
} from "../db/conversationRepository.ts";
import {
  createBotFlowRepository,
} from "../db/botFlowRepository.ts";
import {
  createBotRuntimeRepository,
} from "../db/botRuntimeRepository.ts";
import {
  createAiAgentRepository,
} from "../db/aiAgentRepository.ts";
import {
  createAiReplyOutboxRepository,
} from "../db/aiReplyOutboxRepository.ts";
import {
  createAiRuntimePersistence,
} from "../db/aiRuntimeRepository.ts";
import {
  createBotReplyDeliveryRepository,
} from "../db/botReplyDeliveryRepository.ts";
import {
  createMessageTemplateRepository,
} from "../db/messageTemplateRepository.ts";
import {
  createCampaignDeliveryBatchHandler,
  createCampaignScheduledHandler,
} from "../server/campaigns/campaignDispatchRuntime.ts";
import {
  type CampaignDeliveryQueueBinding,
} from "../server/campaigns/campaignScheduler.ts";
import {
  createUnavailableCampaignDeliveryProcessor,
} from "../server/campaigns/unavailableCampaignDeliveryProcessor.ts";
import {
  createMetaWebhookEventDispatcher,
} from "../server/meta/metaWebhookEventDispatcher.ts";
import {
  createMetaWebhookBusinessBatchProcessor,
} from "../server/meta/metaWebhookBusinessProcessor.ts";
import {
  createMetaWebhookQueueBatchHandler,
  handleMetaWebhookQueueRoute,
} from "../server/meta/metaWebhookQueueRuntime.ts";
import type {
  MetaWebhookQueueBatch,
} from "../server/meta/metaWebhookQueueConsumer.ts";
import type {
  MetaWebhookQueueBinding,
} from "../server/meta/metaWebhookQueuePublisher.ts";
import type {
  R2BucketBinding,
} from "../server/ai/knowledgeObjectStorage.ts";
import {
  createBotRuntimeService,
} from "../server/bot/botRuntimeService.ts";
import {
  createBotInboundRuntimeProcessor,
} from "../server/bot/botInboundRuntimeProcessor.ts";
import {
  createUnavailableBotReplyProcessor,
} from "../server/bot/unavailableBotReplyProcessor.ts";
import {
  createActiveAiRuntimeAgentLoader,
} from "../server/ai/activeAiRuntimeAgent.ts";
import {
  createAiInboundRuntimeProcessor,
} from "../server/ai/aiInboundRuntimeProcessor.ts";
import {
  createAiRuntimeService,
} from "../server/ai/aiRuntimeService.ts";
import {
  unavailableAiKnowledgeRetriever,
  unavailableAiResponseProvider,
} from "../server/ai/unavailableAiRuntimeDependencies.ts";
import {
  createInboundAutomationProcessor,
} from "../server/automation/inboundAutomationProcessor.ts";
import type {
  RateLimitBinding,
} from "../server/security/rateLimit.ts";
import {
  createTeamInvitationQueueBatchHandler,
} from "../server/team/teamInvitationQueueRuntime.ts";
import {
  createUnavailableTeamInvitationProvider,
} from "../server/team/teamInvitationProvider.ts";
import type {
  TeamInvitationQueueBinding,
} from "../server/team/teamInvitationQueuePublisher.ts";
import {
  createTeamInvitationExpirationScheduledHandler,
} from "../server/team/teamInvitationExpirationRuntime.ts";

interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
  DB: D1DatabaseBinding;
  FILES: R2BucketBinding;
  META_APP_SECRET?: string;
  META_WEBHOOK_VERIFY_TOKEN?: string;
  META_WEBHOOK_QUEUE?: MetaWebhookQueueBinding;
  META_WEBHOOK_RATE_LIMITER?: RateLimitBinding;
  TENANT_MUTATION_RATE_LIMITER?: RateLimitBinding;
  SYSTEM_ADMIN_MUTATION_RATE_LIMITER?: RateLimitBinding;
  CAMPAIGN_DELIVERY_QUEUE?:
    CampaignDeliveryQueueBinding;
  TEAM_INVITATION_QUEUE?:
    TeamInvitationQueueBinding;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const META_WEBHOOK_QUEUE_NAME = "connect-meta-webhooks";
const CAMPAIGN_DELIVERY_QUEUE_NAME =
  "connect-campaign-deliveries";
const TEAM_INVITATION_QUEUE_NAME =
  "connect-team-invitations";
const CAMPAIGN_SCHEDULER_CRON = "* * * * *";

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    if (url.pathname === "/webhooks/meta") {
      return handleMetaWebhookQueueRoute(request, env);
    }

    return handler.fetch(request, env, ctx);
  },

  async queue(
    batch: MetaWebhookQueueBatch,
    env: Env,
  ): Promise<void> {
    if (batch.queue === META_WEBHOOK_QUEUE_NAME) {
      const botRuntimeRepository =
        createBotRuntimeRepository(env.DB);
      const aiRuntimePersistence =
        createAiRuntimePersistence(env.DB);
      const inboundRuntime =
        createInboundAutomationProcessor(
          createBotInboundRuntimeProcessor(
            createBotRuntimeService(
              createBotFlowRepository(env.DB),
              botRuntimeRepository,
            ),
            createBotReplyDeliveryRepository(
              env.DB,
            ),
            createUnavailableBotReplyProcessor(),
            {
              now() {
                return new Date();
              },
            },
          ),
          createAiInboundRuntimeProcessor(
            botRuntimeRepository,
            createActiveAiRuntimeAgentLoader(
              createAiAgentRepository(env.DB),
            ),
            createAiRuntimeService({
              retriever:
                unavailableAiKnowledgeRetriever,
              costGate:
                aiRuntimePersistence.costGate,
              provider:
                unavailableAiResponseProvider,
              audit:
                aiRuntimePersistence.auditSink,
            }),
            createAiReplyOutboxRepository(
              env.DB,
            ),
          ),
        );
      const processor = createMetaWebhookEventDispatcher(
        createMetaWebhookBusinessBatchProcessor({
          conversations:
            createConversationRepository(env.DB),
          templates:
            createMessageTemplateRepository(env.DB),
          inboundRuntime,
        }),
      );
      const consumer = createMetaWebhookQueueBatchHandler(
        env,
        processor,
      );

      await consumer.handle(batch);
      return;
    }

    if (
      batch.queue === CAMPAIGN_DELIVERY_QUEUE_NAME
    ) {
      const consumer =
        createCampaignDeliveryBatchHandler(
          env,
          createUnavailableCampaignDeliveryProcessor(),
        );

      await consumer.handle(batch);
      return;
    }

    if (
      batch.queue ===
      TEAM_INVITATION_QUEUE_NAME
    ) {
      const consumer =
        createTeamInvitationQueueBatchHandler(
          env,
          createUnavailableTeamInvitationProvider(),
        );

      await consumer.handle(batch);
      return;
    }

    throw new Error("Unsupported queue");
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
  ): Promise<void> {
    if (controller.cron !== CAMPAIGN_SCHEDULER_CRON) {
      throw new Error("Unsupported cron trigger");
    }

    await Promise.all([
      Promise.resolve().then(() =>
        createCampaignScheduledHandler(
          env,
        ).run(),
      ),
      Promise.resolve().then(() =>
        createTeamInvitationExpirationScheduledHandler(
          env,
          controller.scheduledTime,
        ).run(),
      ),
    ]);
  },
};

export default worker;
