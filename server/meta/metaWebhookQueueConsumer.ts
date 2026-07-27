import {
  MetaWebhookEnvelopeError,
} from "./metaWebhookEnvelope.ts";
import {
  MetaWebhookIngressError,
  type MetaWebhookIngress,
} from "./metaWebhookIngress.ts";
import {
  parseMetaWebhookQueueMessage,
} from "./metaWebhookQueueMessage.ts";
import {
  assertQueueBatchCapacity,
} from "../operations/queueBackpressure.ts";

const RETRY_DELAY_SECONDS = 30;

export interface MetaWebhookQueueDelivery {
  readonly id: string;
  readonly timestamp: Date;
  readonly attempts: number;
  body: unknown;
  ack(): void;
  retry(options?: {
    delaySeconds: number;
  }): void;
}

export interface MetaWebhookQueueBatch {
  readonly queue: string;
  messages: readonly MetaWebhookQueueDelivery[];
}

export interface MetaWebhookQueueConsumerResult {
  processed: number;
  discarded: number;
  retried: number;
}

function isPermanentFailure(error: unknown): boolean {
  return (
    error instanceof MetaWebhookEnvelopeError ||
    (error instanceof MetaWebhookIngressError &&
      (error.code === "INVALID_SIGNATURE" ||
        error.code === "CONNECTION_NOT_FOUND"))
  );
}

export function createMetaWebhookQueueConsumer(
  ingress: MetaWebhookIngress,
): {
  handle(
    batch: MetaWebhookQueueBatch,
  ): Promise<MetaWebhookQueueConsumerResult>;
} {
  return {
    async handle(batch) {
      assertQueueBatchCapacity(batch.messages);
      const result: MetaWebhookQueueConsumerResult = {
        processed: 0,
        discarded: 0,
        retried: 0,
      };

      for (const delivery of batch.messages) {
        const message = parseMetaWebhookQueueMessage(
          delivery.body,
        );

        if (message === null) {
          delivery.ack();
          result.discarded += 1;
          continue;
        }

        try {
          await ingress.receive(
            new Uint8Array(message.rawPayload),
            message.signatureHeader,
          );
          delivery.ack();
          result.processed += 1;
        } catch (error) {
          if (isPermanentFailure(error)) {
            delivery.ack();
            result.discarded += 1;
            continue;
          }

          delivery.retry({
            delaySeconds: RETRY_DELAY_SECONDS,
          });
          result.retried += 1;
        }
      }

      return result;
    },
  };
}
