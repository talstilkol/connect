import type {
  RailwayPostgresApiRuntime,
} from "./railwayPostgresApiRuntime.ts";
import {
  createRailwayNodeService,
  type RailwayNodeService,
} from "./railwayNodeService.ts";

export interface RailwayNodeProcessEnvironment {
  readonly PORT?: string;
}

export type RailwayNodeProcessConfigurationState =
  | Readonly<{
      status: "configured";
      port: number;
    }>
  | Readonly<{
      status: "disabled" | "invalid";
      port: null;
    }>;

export type RailwayNodeProcessErrorCode =
  | "configuration-disabled"
  | "configuration-invalid"
  | "options-invalid"
  | "start-failed"
  | "already-closed";

export class RailwayNodeProcessError extends Error {
  readonly code: RailwayNodeProcessErrorCode;

  constructor(code: RailwayNodeProcessErrorCode) {
    super(`Railway Node process failed: ${code}`);
    this.name = "RailwayNodeProcessError";
    this.code = code;
  }
}

export interface RailwayNodeProcessOptions {
  readonly environment?: RailwayNodeProcessEnvironment;
  readonly runtime: RailwayPostgresApiRuntime;
}

export interface RailwayNodeProcessController {
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
}

type ShutdownSignal = "SIGINT" | "SIGTERM";

export interface RailwayNodeSignalSource {
  readonly on: (
    signal: ShutdownSignal,
    listener: () => void,
  ) => void;
  readonly off: (
    signal: ShutdownSignal,
    listener: () => void,
  ) => void;
}

export interface RailwayNodeProcessDependencies {
  readonly createService: (
    options: Readonly<{
      port: number;
      runtime: RailwayPostgresApiRuntime;
    }>,
  ) => Readonly<RailwayNodeService>;
  readonly signals: RailwayNodeSignalSource;
  readonly recordShutdownFailure: () => void;
}

const shutdownSignals = Object.freeze([
  "SIGINT",
  "SIGTERM",
] as const);

const defaultDependencies = Object.freeze({
  createService: createRailwayNodeService,
  signals: Object.freeze({
    on(signal: ShutdownSignal, listener: () => void) {
      process.on(signal, listener);
    },
    off(signal: ShutdownSignal, listener: () => void) {
      process.off(signal, listener);
    },
  }),
  recordShutdownFailure() {
    process.exitCode = 1;
  },
});

function readProcessEnvironment(): RailwayNodeProcessEnvironment {
  return { PORT: process.env.PORT };
}

export function inspectRailwayNodeProcessConfiguration(
  environment: RailwayNodeProcessEnvironment =
    readProcessEnvironment(),
): RailwayNodeProcessConfigurationState {
  if (!environment || typeof environment !== "object") {
    return Object.freeze({ status: "invalid", port: null });
  }

  const keys = Object.keys(environment);

  if (keys.some((key) => key !== "PORT")) {
    return Object.freeze({ status: "invalid", port: null });
  }

  if (environment.PORT === undefined || environment.PORT === "") {
    return Object.freeze({ status: "disabled", port: null });
  }

  if (!/^[1-9][0-9]{0,4}$/.test(environment.PORT)) {
    return Object.freeze({ status: "invalid", port: null });
  }

  const port = Number(environment.PORT);
  return Number.isSafeInteger(port) && port <= 65_535
    ? Object.freeze({ status: "configured", port })
    : Object.freeze({ status: "invalid", port: null });
}

function requireOptions(
  options: Readonly<RailwayNodeProcessOptions>,
  dependencies: Readonly<RailwayNodeProcessDependencies>,
): void {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).some(
      (key) => key !== "environment" && key !== "runtime",
    ) ||
    typeof options.runtime?.handler?.handle !== "function" ||
    typeof options.runtime?.readiness?.check !== "function" ||
    typeof options.runtime?.close !== "function" ||
    typeof dependencies?.createService !== "function" ||
    typeof dependencies?.signals?.on !== "function" ||
    typeof dependencies?.signals?.off !== "function" ||
    typeof dependencies?.recordShutdownFailure !== "function"
  ) {
    throw new RailwayNodeProcessError("options-invalid");
  }
}

export function createRailwayNodeProcess(
  options: Readonly<RailwayNodeProcessOptions>,
  dependencies: Readonly<RailwayNodeProcessDependencies> =
    defaultDependencies,
): Readonly<RailwayNodeProcessController> {
  requireOptions(options, dependencies);
  const configuration = inspectRailwayNodeProcessConfiguration(
    options.environment,
  );

  if (configuration.status !== "configured") {
    throw new RailwayNodeProcessError(
      configuration.status === "disabled"
        ? "configuration-disabled"
        : "configuration-invalid",
    );
  }

  const service = dependencies.createService({
    port: configuration.port,
    runtime: options.runtime,
  });
  let started = false;
  let closed = false;
  let closing: Promise<void> | null = null;
  const registeredSignals: ShutdownSignal[] = [];

  function removeSignalListeners(): void {
    for (const signal of registeredSignals.splice(0)) {
      dependencies.signals.off(signal, handleShutdownSignal);
    }
  }

  async function closeProcess(): Promise<void> {
    if (closed) {
      return;
    }

    if (!closing) {
      closing = (async () => {
        removeSignalListeners();
        try {
          await service.close();
        } finally {
          started = false;
          closed = true;
        }
      })();
    }

    await closing;
  }

  function handleShutdownSignal(): void {
    void closeProcess().catch(() => {
      dependencies.recordShutdownFailure();
    });
  }

  return Object.freeze({
    async start() {
      if (closed) {
        throw new RailwayNodeProcessError("already-closed");
      }

      if (started) {
        return;
      }

      try {
        await service.start();
        for (const signal of shutdownSignals) {
          dependencies.signals.on(signal, handleShutdownSignal);
          registeredSignals.push(signal);
        }
        started = true;
      } catch {
        removeSignalListeners();
        try {
          await service.close();
        } catch {
          // Startup remains a single bounded failure after cleanup attempts.
        }
        closed = true;
        throw new RailwayNodeProcessError("start-failed");
      }
    },
    close: closeProcess,
  });
}
