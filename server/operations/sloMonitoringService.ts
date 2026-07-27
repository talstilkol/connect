import {
  AvailabilitySloMeasurementError,
  measureAvailabilitySlo,
  type AvailabilitySloDataSource,
  type AvailabilitySloResult,
} from "./availabilitySlo.ts";
import {
  evaluateSloAlert,
  sendOperationalAlert,
  type OperationalAlertSink,
  type SloAlertPolicyConfiguration,
} from "./sloAlertPolicy.ts";

export interface SloMonitoringClock {
  now(): Date;
}

export interface SloMonitoringService {
  run(): Promise<SloMonitoringRunResult>;
}

export interface SloMonitoringRunResult {
  measurement: AvailabilitySloResult;
  alertDelivery:
    | "not-required"
    | "accepted";
}

export type SloMonitoringErrorCode =
  | "CONFIGURATION_INVALID"
  | "CLOCK_UNAVAILABLE"
  | "MEASUREMENT_UNAVAILABLE"
  | "ALERT_DELIVERY_UNAVAILABLE";

export class SloMonitoringError extends Error {
  readonly code: SloMonitoringErrorCode;

  constructor(code: SloMonitoringErrorCode) {
    super("SLO monitoring run failed");
    this.name = "SloMonitoringError";
    this.code = code;
  }
}

function resolveWindow(
  clock: SloMonitoringClock,
  measurementWindowMinutes: number,
) {
  if (
    !Number.isSafeInteger(
      measurementWindowMinutes,
    ) ||
    measurementWindowMinutes <= 0
  ) {
    throw new SloMonitoringError(
      "CONFIGURATION_INVALID",
    );
  }

  let endedAtDate: Date;

  try {
    endedAtDate = clock.now();
  } catch {
    throw new SloMonitoringError(
      "CLOCK_UNAVAILABLE",
    );
  }

  const endedAtMilliseconds =
    endedAtDate.getTime();
  const durationMilliseconds =
    measurementWindowMinutes * 60_000;
  const startedAtMilliseconds =
    endedAtMilliseconds - durationMilliseconds;

  if (
    !Number.isFinite(endedAtMilliseconds) ||
    !Number.isSafeInteger(
      durationMilliseconds,
    ) ||
    !Number.isFinite(startedAtMilliseconds)
  ) {
    throw new SloMonitoringError(
      "CLOCK_UNAVAILABLE",
    );
  }

  try {
    return {
      startedAt: new Date(
        startedAtMilliseconds,
      ).toISOString(),
      endedAt: new Date(
        endedAtMilliseconds,
      ).toISOString(),
    };
  } catch {
    throw new SloMonitoringError(
      "CLOCK_UNAVAILABLE",
    );
  }
}

export function createSloMonitoringService(
  dependencies: {
    source: AvailabilitySloDataSource;
    alertSink: OperationalAlertSink;
    configuration:
      SloAlertPolicyConfiguration;
    clock: SloMonitoringClock;
  },
): SloMonitoringService {
  return {
    async run() {
      const window = resolveWindow(
        dependencies.clock,
        dependencies.configuration
          .measurementWindowMinutes,
      );
      let measurement: AvailabilitySloResult;

      try {
        measurement =
          await measureAvailabilitySlo(
            dependencies.source,
            window,
          );
      } catch (error) {
        if (
          error instanceof
          AvailabilitySloMeasurementError
        ) {
          throw new SloMonitoringError(
            "MEASUREMENT_UNAVAILABLE",
          );
        }

        throw error;
      }

      let decision;

      try {
        decision = evaluateSloAlert(
          dependencies.configuration,
          measurement,
        );
      } catch {
        throw new SloMonitoringError(
          "CONFIGURATION_INVALID",
        );
      }

      if (decision.outcome === "healthy") {
        return {
          measurement,
          alertDelivery: "not-required",
        };
      }

      const delivery =
        await sendOperationalAlert(
          dependencies.alertSink,
          decision,
        );

      if (delivery.outcome !== "accepted") {
        throw new SloMonitoringError(
          "ALERT_DELIVERY_UNAVAILABLE",
        );
      }

      return {
        measurement,
        alertDelivery: "accepted",
      };
    },
  };
}
