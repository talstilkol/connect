import {
  workerSchedulerOwnerKeyPattern,
} from "../../shared/domain/workerScheduler.ts";
import type {
  NodePostgresPoolTelemetry,
} from "./nodePostgresPoolConfiguration.ts";
import type {
  RailwayWorkerSchedulerService,
  RailwayWorkerSchedulerServiceTelemetry,
} from "./railwayWorkerSchedulerService.ts";
import type {
  RailwayWorkerProcessController,
} from "./railwayWorkerProcess.ts";

export interface RailwayWorkerMainEnvironment {
  readonly RAILWAY_WORKER_SCHEDULER_OWNER_KEY?: string;
}

export type RailwayWorkerMainConfigurationState =
  | Readonly<{
      status: "configured";
      ownerKey: string;
    }>
  | Readonly<{
      status: "disabled" | "invalid";
      ownerKey: null;
    }>;

export type RailwayWorkerMainErrorCode =
  | "configuration-disabled"
  | "configuration-invalid"
  | "dependencies-invalid"
  | "startup-failed";

export class RailwayWorkerMainError extends Error {
  readonly code: RailwayWorkerMainErrorCode;

  constructor(code: RailwayWorkerMainErrorCode) {
    super(`Railway worker bootstrap failed: ${code}`);
    this.name = "RailwayWorkerMainError";
    this.code = code;
  }
}

export interface RailwayWorkerMainTelemetry {
  readonly recordPostgresIdleClientError: () => void;
  readonly recordSchedulerRunFailure: () => void;
  readonly recordSchedulerTimerFailure: () => void;
  readonly recordSchedulerOverlapSuppressed: () => void;
}

export interface RailwayWorkerMainDependencies {
  readonly readEnvironment: () => RailwayWorkerMainEnvironment;
  readonly createService: (
    options: Readonly<{
      ownerKey: string;
      postgresTelemetry: NodePostgresPoolTelemetry;
      schedulerTelemetry: RailwayWorkerSchedulerServiceTelemetry;
    }>,
  ) => Promise<Readonly<RailwayWorkerSchedulerService>>;
  readonly createProcess: (
    options: Readonly<{
      service: RailwayWorkerSchedulerService;
    }>,
  ) => Readonly<RailwayWorkerProcessController>;
  readonly telemetry: RailwayWorkerMainTelemetry;
}

const environmentKeys = Object.freeze([
  "RAILWAY_WORKER_SCHEDULER_OWNER_KEY",
]);

export function inspectRailwayWorkerMainConfiguration(
  environment: RailwayWorkerMainEnvironment,
): RailwayWorkerMainConfigurationState {
  if (!environment || typeof environment !== "object") {
    return Object.freeze({ status: "invalid", ownerKey: null });
  }

  if (
    Object.keys(environment).some(
      (key) => !environmentKeys.includes(key),
    )
  ) {
    return Object.freeze({ status: "invalid", ownerKey: null });
  }

  const ownerKey = environment.RAILWAY_WORKER_SCHEDULER_OWNER_KEY;
  if (ownerKey === undefined || ownerKey === "") {
    return Object.freeze({ status: "disabled", ownerKey: null });
  }

  return workerSchedulerOwnerKeyPattern.test(ownerKey)
    ? Object.freeze({ status: "configured", ownerKey })
    : Object.freeze({ status: "invalid", ownerKey: null });
}

function requireDependencies(
  dependencies: Readonly<RailwayWorkerMainDependencies>,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createProcess,createService,readEnvironment,telemetry" ||
    typeof dependencies.readEnvironment !== "function" ||
    typeof dependencies.createService !== "function" ||
    typeof dependencies.createProcess !== "function" ||
    !dependencies.telemetry || typeof dependencies.telemetry !== "object" ||
    Object.keys(dependencies.telemetry).sort().join(",") !==
      "recordPostgresIdleClientError,recordSchedulerOverlapSuppressed,recordSchedulerRunFailure,recordSchedulerTimerFailure" ||
    typeof dependencies.telemetry.recordPostgresIdleClientError !== "function" ||
    typeof dependencies.telemetry.recordSchedulerRunFailure !== "function" ||
    typeof dependencies.telemetry.recordSchedulerTimerFailure !== "function" ||
    typeof dependencies.telemetry.recordSchedulerOverlapSuppressed !== "function"
  ) {
    throw new RailwayWorkerMainError("dependencies-invalid");
  }
}

function recordSafely(action: () => void): void {
  try {
    action();
  } catch {
    // Telemetry cannot control worker startup or scheduling.
  }
}

async function closeService(
  service: Readonly<RailwayWorkerSchedulerService>,
): Promise<void> {
  try {
    await service.close();
  } catch {
    // Startup remains one bounded failure after cleanup is attempted.
  }
}

/**
 * Provider-neutral bootstrap boundary. The service factory must capture the
 * approved queue adapters and environments; this module never selects them.
 */
export async function startRailwayWorkerBootstrap(
  dependencies: Readonly<RailwayWorkerMainDependencies>,
): Promise<Readonly<RailwayWorkerProcessController>> {
  requireDependencies(dependencies);

  let environment: RailwayWorkerMainEnvironment;
  try {
    environment = dependencies.readEnvironment();
  } catch {
    throw new RailwayWorkerMainError("startup-failed");
  }

  const configuration = inspectRailwayWorkerMainConfiguration(environment);
  if (configuration.status !== "configured") {
    throw new RailwayWorkerMainError(
      configuration.status === "disabled"
        ? "configuration-disabled"
        : "configuration-invalid",
    );
  }

  let service: Readonly<RailwayWorkerSchedulerService>;
  try {
    service = await dependencies.createService({
      ownerKey: configuration.ownerKey,
      postgresTelemetry: Object.freeze({
        recordIdleClientError() {
          recordSafely(
            dependencies.telemetry.recordPostgresIdleClientError,
          );
        },
      }),
      schedulerTelemetry: Object.freeze({
        recordRunFailure() {
          recordSafely(dependencies.telemetry.recordSchedulerRunFailure);
        },
        recordTimerFailure() {
          recordSafely(dependencies.telemetry.recordSchedulerTimerFailure);
        },
        recordOverlapSuppressed() {
          recordSafely(
            dependencies.telemetry.recordSchedulerOverlapSuppressed,
          );
        },
      }),
    });
  } catch {
    throw new RailwayWorkerMainError("startup-failed");
  }

  try {
    const controller = dependencies.createProcess({ service });
    await controller.start();
    return controller;
  } catch {
    await closeService(service);
    throw new RailwayWorkerMainError("startup-failed");
  }
}
