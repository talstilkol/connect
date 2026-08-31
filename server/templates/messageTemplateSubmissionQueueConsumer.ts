import {
  assertQueueBatchCapacity,
} from "../operations/queueBackpressure.ts";
import {
  parseMessageTemplateSubmissionQueueMessage,
} from "./messageTemplateSubmissionQueueMessage.ts";
import type {
  MessageTemplateSubmissionWorkerResult,
} from "./messageTemplateSubmissionWorker.ts";

const STORAGE_RETRY_DELAY_SECONDS = 30;

export interface MessageTemplateSubmissionQueueDelivery {
  readonly id: string;
  readonly timestamp: Date;
  readonly attempts: number;
  readonly body: unknown;
  ack(): void;
  retry(options: Readonly<{ delaySeconds: number }>): void;
}

export interface MessageTemplateSubmissionQueueBatch {
  readonly queue: string;
  readonly messages: readonly MessageTemplateSubmissionQueueDelivery[];
}

export interface MessageTemplateSubmissionQueueConsumerResult {
  submitted: number;
  rejected: number;
  ambiguous: number;
  blocked: number;
  duplicates: number;
  discarded: number;
  retried: number;
}

interface SubmissionWorker {
  process(
    tenantId: unknown,
    submissionKey: unknown,
  ): Promise<MessageTemplateSubmissionWorkerResult>;
}

function increment(
  result: MessageTemplateSubmissionQueueConsumerResult,
  outcome: unknown,
): boolean {
  if (outcome === "submitted") {
    result.submitted += 1;
    return true;
  }
  if (outcome === "rejected") {
    result.rejected += 1;
    return true;
  }
  if (outcome === "ambiguous") {
    result.ambiguous += 1;
    return true;
  }
  if (outcome === "blocked") {
    result.blocked += 1;
    return true;
  }
  if (outcome === "duplicate" || outcome === "not-found") {
    result.duplicates += 1;
    return true;
  }

  return false;
}

export function createMessageTemplateSubmissionQueueConsumer(
  worker: SubmissionWorker,
) {
  if (!worker || typeof worker.process !== "function") {
    throw new Error("Message template submission worker is required");
  }

  return Object.freeze({
    async handle(
      batch: MessageTemplateSubmissionQueueBatch,
    ): Promise<MessageTemplateSubmissionQueueConsumerResult> {
      assertQueueBatchCapacity(batch?.messages);
      const result: MessageTemplateSubmissionQueueConsumerResult = {
        submitted: 0,
        rejected: 0,
        ambiguous: 0,
        blocked: 0,
        duplicates: 0,
        discarded: 0,
        retried: 0,
      };

      for (const delivery of batch.messages) {
        const message = parseMessageTemplateSubmissionQueueMessage(
          delivery.body,
        );

        if (message === null) {
          delivery.ack();
          result.discarded += 1;
          continue;
        }

        try {
          const workerResult = await worker.process(
            message.tenantId,
            message.submissionKey,
          );

          if (!increment(result, workerResult?.outcome)) {
            throw new Error("Message template worker result is invalid");
          }

          delivery.ack();
        } catch {
          delivery.retry({ delaySeconds: STORAGE_RETRY_DELAY_SECONDS });
          result.retried += 1;
        }
      }

      return Object.freeze(result);
    },
  });
}
