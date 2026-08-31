import type {
  CampaignDeliveryQueueBatch,
  CampaignDeliveryQueueConsumerResult,
} from "../campaigns/campaignDeliveryQueueConsumer.ts";
import type {
  MetaWebhookQueueBatch,
  MetaWebhookQueueConsumerResult,
} from "../meta/metaWebhookQueueConsumer.ts";
import {
  recordOperationalTelemetry,
  type OperationalTelemetryEvent,
  type OperationalTelemetrySink,
} from "./operationalTelemetry.ts";

export interface OperationalTelemetryClock {
  now(): Date;
}

interface MetaWebhookQueueHandler {
  handle(
    batch: MetaWebhookQueueBatch,
  ): Promise<MetaWebhookQueueConsumerResult>;
}

interface CampaignDeliveryQueueHandler {
  handle(
    batch: CampaignDeliveryQueueBatch,
  ): Promise<CampaignDeliveryQueueConsumerResult>;
}

function readClock(
  clock: OperationalTelemetryClock,
): Date | null {
  try {
    const current = clock.now();

    if (
      !(current instanceof Date) ||
      !Number.isFinite(current.getTime())
    ) {
      return null;
    }

    return current;
  } catch {
    return null;
  }
}

async function recordSafely(
  sink: OperationalTelemetrySink,
  event: OperationalTelemetryEvent | null,
): Promise<void> {
  if (!event) {
    return;
  }

  await recordOperationalTelemetry(sink, event);
}

function timing(
  started: Date | null,
  completed: Date | null,
): {
  startedAt: string;
  completedAt: string;
  durationMilliseconds: number;
} | null {
  if (
    !started ||
    !completed ||
    completed.getTime() < started.getTime()
  ) {
    return null;
  }

  return {
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMilliseconds:
      completed.getTime() - started.getTime(),
  };
}

export function observeMetaWebhookQueueHandler(
  handler: MetaWebhookQueueHandler,
  sink: OperationalTelemetrySink,
  clock: OperationalTelemetryClock,
): MetaWebhookQueueHandler {
  return {
    async handle(batch) {
      const started = readClock(clock);

      try {
        const result = await handler.handle(batch);
        const measured = timing(
          started,
          readClock(clock),
        );

        await recordSafely(
          sink,
          measured
            ? {
                version: 1,
                kind: "queue-batch",
                queue: "meta-webhook",
                outcome: "completed",
                ...measured,
                counts: { ...result },
              }
            : null,
        );

        return result;
      } catch (error) {
        const measured = timing(
          started,
          readClock(clock),
        );

        await recordSafely(
          sink,
          measured
            ? {
                version: 1,
                kind: "queue-batch",
                queue: "meta-webhook",
                outcome: "failed",
                ...measured,
                counts: {
                  processed: 0,
                  discarded: 0,
                  retried: 0,
                },
              }
            : null,
        );

        throw error;
      }
    },
  };
}

export function observeCampaignDeliveryQueueHandler(
  handler: CampaignDeliveryQueueHandler,
  sink: OperationalTelemetrySink,
  clock: OperationalTelemetryClock,
): CampaignDeliveryQueueHandler {
  return {
    async handle(batch) {
      const started = readClock(clock);

      try {
        const result = await handler.handle(batch);
        const measured = timing(
          started,
          readClock(clock),
        );

        await recordSafely(
          sink,
          measured
            ? {
                version: 1,
                kind: "queue-batch",
                queue: "campaign-delivery",
                outcome: "completed",
                ...measured,
                counts: { ...result },
              }
            : null,
        );

        return result;
      } catch (error) {
        const measured = timing(
          started,
          readClock(clock),
        );

        await recordSafely(
          sink,
          measured
            ? {
                version: 1,
                kind: "queue-batch",
                queue: "campaign-delivery",
                outcome: "failed",
                ...measured,
                counts: {
                  accepted: 0,
                  rejected: 0,
                  deferred: 0,
                  skipped: 0,
                  duplicates: 0,
                  ambiguous: 0,
                  discarded: 0,
                  retried: 0,
                },
              }
            : null,
        );

        throw error;
      }
    },
  };
}
