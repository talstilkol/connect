import type {
  BotReplyProcessor,
  BotReplyProcessorResult,
  PreparedBotReplyDelivery,
} from "../../shared/domain/botReplyDelivery.ts";
import {
  recordOperationalTelemetry,
  type OperationalTelemetrySink,
  type ProviderRequestTelemetry,
} from "./operationalTelemetry.ts";
import type {
  ProviderRequestTelemetryScope,
} from "./providerRequestTelemetry.ts";

export interface BotReplyDeliveryTelemetryClock {
  readonly now: () => Date;
}

function readClock(
  clock: Readonly<BotReplyDeliveryTelemetryClock>,
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
  outcome: BotReplyProcessorResult["outcome"] | "failed",
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
    queue: "bot-reply",
    outcome,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMilliseconds: completed.getTime() - started.getTime(),
    ...(providerRequests.length === 0 ? {} : { providerRequests }),
  });
}

export function observeBotReplyProcessor(
  processor: Readonly<BotReplyProcessor>,
  sink: Readonly<OperationalTelemetrySink>,
  clock: Readonly<BotReplyDeliveryTelemetryClock>,
  providerRequestTelemetry: Readonly<ProviderRequestTelemetryScope>,
): Readonly<BotReplyProcessor> {
  if (
    typeof processor?.isConfigured !== "function" ||
    typeof processor?.process !== "function" ||
    typeof sink?.record !== "function" ||
    typeof clock?.now !== "function" ||
    typeof providerRequestTelemetry?.run !== "function" ||
    typeof providerRequestTelemetry?.snapshot !== "function"
  ) {
    throw new Error("Bot reply delivery telemetry is invalid");
  }

  return Object.freeze({
    isConfigured() {
      return processor.isConfigured();
    },
    async process(
      delivery: PreparedBotReplyDelivery,
    ): Promise<BotReplyProcessorResult> {
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
