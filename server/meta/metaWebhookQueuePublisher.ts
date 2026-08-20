import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import {
  parseMetaWebhookEnvelope,
} from "./metaWebhookEnvelope.ts";
import {
  MetaWebhookIngressError,
} from "./metaWebhookIngress.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import {
  verifyMetaWebhookSignature,
} from "./metaWebhookSecurity.ts";
import {
  createMetaWebhookQueueMessage,
  MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES,
} from "./metaWebhookQueueMessage.ts";
import type {
  MetaWebhookQueuePort,
} from "./metaWebhookQueuePort.ts";

export {
  MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES,
  type MetaWebhookQueueBinding,
  type MetaWebhookQueueMessage,
} from "./metaWebhookQueueMessage.ts";

export type MetaWebhookQueuePublisherErrorCode =
  | "PAYLOAD_TOO_LARGE"
  | "QUEUE_UNAVAILABLE"
  | "RATE_LIMITED";

export class MetaWebhookQueuePublisherError extends Error {
  readonly code: MetaWebhookQueuePublisherErrorCode;

  constructor(
    code: MetaWebhookQueuePublisherErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MetaWebhookQueuePublisherError";
    this.code = code;
  }
}

export interface MetaWebhookQueuePublisher {
  receive(
    rawPayload: Uint8Array,
    signatureHeader: string | null,
  ): Promise<{
    outcome: "queued";
  }>;
}

export function createMetaWebhookQueuePublisher(
  repository: Pick<MetaRepository, "findConnectionByWabaId">,
  queue: MetaWebhookQueuePort,
  appSecret: string,
  rateLimitGuard: RateLimitGuard,
): MetaWebhookQueuePublisher {
  if (
    typeof appSecret !== "string" ||
    appSecret.trim().length === 0
  ) {
    throw new Error("META_APP_SECRET must be configured");
  }

  if (!queue || typeof queue.publish !== "function") {
    throw new Error(
      "META_WEBHOOK_QUEUE binding must be configured",
    );
  }

  if (
    !rateLimitGuard ||
    typeof rateLimitGuard.consume !== "function"
  ) {
    throw new Error(
      "Meta webhook rate limit guard must be configured",
    );
  }

  return {
    async receive(rawPayload, signatureHeader) {
      if (
        !(rawPayload instanceof Uint8Array) ||
        rawPayload.byteLength === 0
      ) {
        throw new MetaWebhookQueuePublisherError(
          "QUEUE_UNAVAILABLE",
          "Meta webhook queue payload is invalid",
        );
      }

      if (
        rawPayload.byteLength >
        MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES
      ) {
        throw new MetaWebhookQueuePublisherError(
          "PAYLOAD_TOO_LARGE",
          "Meta webhook exceeds the queue payload limit",
        );
      }

      if (
        typeof signatureHeader !== "string" ||
        !/^sha256=[0-9a-f]{64}$/.test(signatureHeader)
      ) {
        throw new MetaWebhookIngressError(
          "INVALID_SIGNATURE",
          "Meta webhook signature is invalid",
        );
      }

      const signatureValid = await verifyMetaWebhookSignature(
        rawPayload,
        signatureHeader,
        appSecret,
      );

      if (!signatureValid) {
        throw new MetaWebhookIngressError(
          "INVALID_SIGNATURE",
          "Meta webhook signature is invalid",
        );
      }

      const envelope = parseMetaWebhookEnvelope(rawPayload);
      let rateLimitDecision:
        | { outcome: "allowed" }
        | { outcome: "limited" };

      try {
        rateLimitDecision =
          await rateLimitGuard.consume(
          envelope.wabaId,
        );
      } catch {
        throw new MetaWebhookQueuePublisherError(
          "QUEUE_UNAVAILABLE",
          "Meta webhook rate limit enforcement is unavailable",
        );
      }

      if (
        rateLimitDecision.outcome ===
        "limited"
      ) {
        throw new MetaWebhookQueuePublisherError(
          "RATE_LIMITED",
          "Meta webhook rate limit exceeded",
        );
      }

      const connection = await repository.findConnectionByWabaId(
        envelope.wabaId,
      );

      if (!connection || connection.status !== "connected") {
        throw new MetaWebhookIngressError(
          "CONNECTION_NOT_FOUND",
          "Meta webhook WABA is not connected to a tenant",
        );
      }

      try {
        await queue.publish(
          createMetaWebhookQueueMessage(
            rawPayload,
            signatureHeader,
          ),
        );
      } catch {
        throw new MetaWebhookQueuePublisherError(
          "QUEUE_UNAVAILABLE",
          "Meta webhook could not be queued",
        );
      }

      return { outcome: "queued" };
    },
  };
}
