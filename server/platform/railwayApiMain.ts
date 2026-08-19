import {
  createRailwayNodeProcess,
  inspectRailwayNodeProcessConfiguration,
  type RailwayNodeProcessController,
  type RailwayNodeProcessEnvironment,
} from "./railwayNodeProcess.ts";
import {
  createRailwayPostgresApiRuntime,
  type RailwayPostgresApiRuntime,
} from "./railwayPostgresApiRuntime.ts";

export type RailwayApiMainErrorCode =
  | "configuration-disabled"
  | "configuration-invalid"
  | "dependencies-invalid"
  | "startup-failed";

export class RailwayApiMainError extends Error {
  readonly code: RailwayApiMainErrorCode;

  constructor(code: RailwayApiMainErrorCode) {
    super(`Railway API executable failed: ${code}`);
    this.name = "RailwayApiMainError";
    this.code = code;
  }
}

export interface RailwayApiMainDependencies {
  readonly readEnvironment: () => RailwayNodeProcessEnvironment;
  readonly createRuntime: (
    options: Readonly<{
      postgresTelemetry: Readonly<{
        recordIdleClientError: () => void;
      }>;
    }>,
  ) => Promise<Readonly<RailwayPostgresApiRuntime>>;
  readonly createProcess: (
    options: Readonly<{
      environment: RailwayNodeProcessEnvironment;
      runtime: RailwayPostgresApiRuntime;
    }>,
  ) => Readonly<RailwayNodeProcessController>;
  readonly recordIdleClientError: () => void;
}

function writeBoundedIdleClientFailure(): void {
  try {
    process.stderr.write("Railway PostgreSQL idle client failure\n");
  } catch {
    process.exitCode = 1;
  }
}

const defaultDependencies = Object.freeze({
  readEnvironment(): RailwayNodeProcessEnvironment {
    return { PORT: process.env.PORT };
  },
  createRuntime: createRailwayPostgresApiRuntime,
  createProcess: createRailwayNodeProcess,
  recordIdleClientError: writeBoundedIdleClientFailure,
});

function requireDependencies(
  dependencies: Readonly<RailwayApiMainDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createProcess,createRuntime,readEnvironment,recordIdleClientError" ||
    typeof dependencies.readEnvironment !== "function" ||
    typeof dependencies.createRuntime !== "function" ||
    typeof dependencies.createProcess !== "function" ||
    typeof dependencies.recordIdleClientError !== "function"
  ) {
    throw new RailwayApiMainError("dependencies-invalid");
  }
}

async function closeRuntime(
  runtime: Readonly<RailwayPostgresApiRuntime>,
): Promise<void> {
  try {
    await runtime.close();
  } catch {
    // Startup still returns one bounded failure after cleanup is attempted.
  }
}

export async function startRailwayApiExecutable(
  dependencies: Readonly<RailwayApiMainDependencies> = defaultDependencies,
): Promise<Readonly<RailwayNodeProcessController>> {
  requireDependencies(dependencies);

  let environment: RailwayNodeProcessEnvironment;
  try {
    environment = dependencies.readEnvironment();
  } catch {
    throw new RailwayApiMainError("startup-failed");
  }

  const configuration = inspectRailwayNodeProcessConfiguration(environment);
  if (configuration.status !== "configured") {
    throw new RailwayApiMainError(
      configuration.status === "disabled"
        ? "configuration-disabled"
        : "configuration-invalid",
    );
  }

  let runtime: Readonly<RailwayPostgresApiRuntime>;
  try {
    runtime = await dependencies.createRuntime({
      postgresTelemetry: Object.freeze({
        recordIdleClientError() {
          try {
            dependencies.recordIdleClientError();
          } catch {
            // Telemetry must never turn an idle client event into an exception.
          }
        },
      }),
    });
  } catch {
    throw new RailwayApiMainError("startup-failed");
  }

  try {
    const controller = dependencies.createProcess({
      environment,
      runtime,
    });
    await controller.start();
    return controller;
  } catch {
    await closeRuntime(runtime);
    throw new RailwayApiMainError("startup-failed");
  }
}
