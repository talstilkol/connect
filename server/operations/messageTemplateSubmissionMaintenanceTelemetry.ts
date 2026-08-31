import type {
  MessageTemplateSubmissionMaintenanceResult,
} from "../templates/messageTemplateSubmissionMaintenanceRunner.ts";
import {
  recordOperationalTelemetry,
  type MessageTemplateSubmissionMaintenanceTelemetryCounts,
  type OperationalTelemetrySink,
  type ProviderRequestTelemetry,
} from "./operationalTelemetry.ts";
import {
  createProviderRequestTelemetryScope,
  type ProviderRequestTelemetryScope,
} from "./providerRequestTelemetry.ts";
import type {
  OperationalTelemetryClock,
} from "./queueTelemetry.ts";

interface MessageTemplateSubmissionMaintenanceService {
  readonly run: () => Promise<
    Readonly<MessageTemplateSubmissionMaintenanceResult>
  >;
}

const emptyCounts = Object.freeze({
  pendingCandidates: 0,
  published: 0,
  ambiguousCandidates: 0,
  resolvedSubmitted: 0,
  resolvedRejected: 0,
  deferred: 0,
  duplicates: 0,
  missing: 0,
  failed: 0,
});

function readClock(clock: OperationalTelemetryClock): Date | null {
  try {
    const current = clock.now();
    return current instanceof Date && Number.isFinite(current.getTime())
      ? current
      : null;
  } catch {
    return null;
  }
}

async function recordMaintenance(
  sink: OperationalTelemetrySink,
  started: Date | null,
  completed: Date | null,
  outcome: "completed" | "failed",
  counts: Readonly<MessageTemplateSubmissionMaintenanceTelemetryCounts>,
  providerRequests: readonly ProviderRequestTelemetry[],
): Promise<void> {
  if (
    !started || !completed || completed.getTime() < started.getTime()
  ) {
    return;
  }

  await recordOperationalTelemetry(sink, {
    version: 1,
    kind: "message-template-submission-maintenance",
    outcome,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMilliseconds: completed.getTime() - started.getTime(),
    counts: { ...counts },
    ...(providerRequests.length === 0 ? {} : { providerRequests }),
  });
}

export function observeMessageTemplateSubmissionMaintenance(
  service: MessageTemplateSubmissionMaintenanceService,
  sink: OperationalTelemetrySink,
  clock: OperationalTelemetryClock,
  providerRequestTelemetry: Readonly<ProviderRequestTelemetryScope> =
    createProviderRequestTelemetryScope(),
): MessageTemplateSubmissionMaintenanceService {
  if (
    typeof service?.run !== "function" ||
    typeof sink?.record !== "function" ||
    typeof clock?.now !== "function" ||
    typeof providerRequestTelemetry?.run !== "function" ||
    typeof providerRequestTelemetry?.snapshot !== "function"
  ) {
    throw new Error("Message template maintenance telemetry is invalid");
  }

  return Object.freeze({
    async run() {
      return providerRequestTelemetry.run(async () => {
        const started = readClock(clock);

        try {
          const result = await service.run();
          await recordMaintenance(
            sink,
            started,
            readClock(clock),
            "completed",
            result,
            providerRequestTelemetry.snapshot(),
          );
          return result;
        } catch (error) {
          await recordMaintenance(
            sink,
            started,
            readClock(clock),
            "failed",
            emptyCounts,
            providerRequestTelemetry.snapshot(),
          );
          throw error;
        }
      });
    },
  });
}
