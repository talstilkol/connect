import type {
  KnowledgeScanRecoveryService,
  RecoverKnowledgeScanResult,
} from "../ai/knowledgeScanRecoveryService.ts";
import type {
  TenantSession,
} from "../auth/tenantSession.ts";
import {
  recordOperationalTelemetry,
  type OperationalTelemetrySink,
} from "./operationalTelemetry.ts";
import type {
  OperationalTelemetryClock,
} from "./queueTelemetry.ts";

function readClock(
  clock: OperationalTelemetryClock,
): Date | null {
  try {
    const current = clock.now();

    return (
      current instanceof Date &&
      Number.isFinite(current.getTime())
    )
      ? current
      : null;
  } catch {
    return null;
  }
}

async function recordRecovery(
  sink: OperationalTelemetrySink,
  started: Date | null,
  completed: Date | null,
  outcome:
    | RecoverKnowledgeScanResult["outcome"]
    | "failed",
): Promise<void> {
  if (
    !started ||
    !completed ||
    completed.getTime() < started.getTime()
  ) {
    return;
  }

  await recordOperationalTelemetry(sink, {
    version: 1,
    kind: "knowledge-scan-recovery",
    outcome,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    durationMilliseconds:
      completed.getTime() - started.getTime(),
  });
}

export function observeKnowledgeScanRecoveryService(
  service: KnowledgeScanRecoveryService,
  sink: OperationalTelemetrySink,
  clock: OperationalTelemetryClock,
): KnowledgeScanRecoveryService {
  return {
    async recover(
      session: TenantSession,
      input: unknown,
    ) {
      const started = readClock(clock);

      try {
        const result = await service.recover(
          session,
          input,
        );

        await recordRecovery(
          sink,
          started,
          readClock(clock),
          result.outcome,
        );

        return result;
      } catch (error) {
        await recordRecovery(
          sink,
          started,
          readClock(clock),
          "failed",
        );

        throw error;
      }
    },
  };
}
