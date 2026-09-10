import type {
  CampaignDeliveryProcessor,
  CampaignDeliveryProcessorResult,
  PreparedCampaignDelivery,
} from "../../shared/domain/campaignDelivery.ts";
import {
  recordOperationalTelemetry,
  type OperationalTelemetrySink,
  type ProviderRequestTelemetry,
} from "./operationalTelemetry.ts";
import type {
  ProviderRequestTelemetryScope,
} from "./providerRequestTelemetry.ts";

export interface CampaignDeliveryTelemetryClock {
  readonly now: () => Date;
}

function readClock(
  clock: Readonly<CampaignDeliveryTelemetryClock>,
): Date | null {
  try {
    const value = clock.now();
    return value instanceof Date && Number.isFinite(value.getTime())
      ? value
      : null;
  } catch {
    return null;
  }
}

async function recordAttempt(
  sink: Readonly<OperationalTelemetrySink>,
  started: Date | null,
  completed: Date | null,
  outcome: CampaignDeliveryProcessorResult["outcome"] | "failed",
  providerRequests: readonly ProviderRequestTelemetry[],
): Promise<void> {
  if (
    started === null ||
    completed === null ||
    completed.getTime() < started.getTime()
  ) {
    return;
  }

  await recordOperationalTelemetry(sink, {
    version: 1,
    kind: "delivery-attempt",
    queue: "campaign-delivery",
    outcome,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMilliseconds: completed.getTime() - started.getTime(),
    ...(providerRequests.length === 0 ? {} : { providerRequests }),
  });
}

export function observeCampaignDeliveryProcessor(
  processor: Readonly<CampaignDeliveryProcessor>,
  sink: Readonly<OperationalTelemetrySink>,
  clock: Readonly<CampaignDeliveryTelemetryClock>,
  providerRequestTelemetry: Readonly<ProviderRequestTelemetryScope>,
): Readonly<CampaignDeliveryProcessor> {
  if (
    typeof processor?.isConfigured !== "function" ||
    typeof processor?.process !== "function" ||
    typeof sink?.record !== "function" ||
    typeof clock?.now !== "function" ||
    typeof providerRequestTelemetry?.run !== "function" ||
    typeof providerRequestTelemetry?.snapshot !== "function"
  ) {
    throw new Error("Campaign delivery telemetry is invalid");
  }

  return Object.freeze({
    isConfigured() {
      return processor.isConfigured();
    },
    async process(
      delivery: PreparedCampaignDelivery,
    ): Promise<CampaignDeliveryProcessorResult> {
      return providerRequestTelemetry.run(async () => {
        const started = readClock(clock);
        try {
          const result = await processor.process(delivery);
          await recordAttempt(
            sink,
            started,
            readClock(clock),
            result.outcome,
            providerRequestTelemetry.snapshot(),
          );
          return result;
        } catch (error) {
          await recordAttempt(
            sink,
            started,
            readClock(clock),
            "failed",
            providerRequestTelemetry.snapshot(),
          );
          throw error;
        }
      });
    },
  });
}
