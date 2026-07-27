import {
  unavailableOperationalTelemetrySink,
  type OperationalTelemetrySink,
} from "./operationalTelemetry.ts";

export function readCurrentOperationalTelemetrySink(): OperationalTelemetrySink {
  return unavailableOperationalTelemetrySink;
}
