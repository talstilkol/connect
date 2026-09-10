import type {
  RailwayWorkerSchedulerService,
} from "./railwayWorkerSchedulerService.ts";

type ShutdownSignal = "SIGINT" | "SIGTERM";

export interface RailwayWorkerSignalSource {
  readonly on: (
    signal: ShutdownSignal,
    listener: () => void,
  ) => void;
  readonly off: (
    signal: ShutdownSignal,
    listener: () => void,
  ) => void;
}

export interface RailwayWorkerProcessDependencies {
  readonly signals: RailwayWorkerSignalSource;
  readonly recordShutdownFailure: () => void;
}

export interface RailwayWorkerProcessOptions {
  readonly service: RailwayWorkerSchedulerService;
}

export interface RailwayWorkerProcessController {
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export type RailwayWorkerProcessErrorCode =
  | "options-invalid"
  | "already-closed"
  | "start-failed"
  | "shutdown-failed";

export class RailwayWorkerProcessError extends Error {
  readonly code: RailwayWorkerProcessErrorCode;

  constructor(code: RailwayWorkerProcessErrorCode) {
    super(`Railway worker process failed: ${code}`);
    this.name = "RailwayWorkerProcessError";
    this.code = code;
  }
}

const shutdownSignals = Object.freeze([
  "SIGINT",
  "SIGTERM",
] as const);

const defaultDependencies = Object.freeze({
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

function requireOptions(
  options: Readonly<RailwayWorkerProcessOptions>,
  dependencies: Readonly<RailwayWorkerProcessDependencies>,
): void {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).join(",") !== "service" ||
    typeof options.service?.start !== "function" ||
    typeof options.service?.close !== "function" ||
    typeof dependencies?.signals?.on !== "function" ||
    typeof dependencies?.signals?.off !== "function" ||
    typeof dependencies?.recordShutdownFailure !== "function"
  ) {
    throw new RailwayWorkerProcessError("options-invalid");
  }
}

export function createRailwayWorkerProcess(
  options: Readonly<RailwayWorkerProcessOptions>,
  dependencies: Readonly<RailwayWorkerProcessDependencies> =
    defaultDependencies,
): Readonly<RailwayWorkerProcessController> {
  requireOptions(options, dependencies);
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
    if (closed && closing === null) {
      return;
    }

    if (!closing) {
      closing = (async () => {
        removeSignalListeners();
        try {
          await options.service.close();
        } catch {
          throw new RailwayWorkerProcessError("shutdown-failed");
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
      try {
        dependencies.recordShutdownFailure();
      } catch {
        // A telemetry failure cannot reopen a closing process.
      }
    });
  }

  return Object.freeze({
    async start() {
      if (closed) {
        throw new RailwayWorkerProcessError("already-closed");
      }

      if (started) {
        return;
      }

      try {
        await options.service.start();
        for (const signal of shutdownSignals) {
          dependencies.signals.on(signal, handleShutdownSignal);
          registeredSignals.push(signal);
        }
        started = true;
      } catch {
        removeSignalListeners();
        try {
          await options.service.close();
        } catch {
          // Startup remains one bounded failure after cleanup attempts.
        }
        closed = true;
        throw new RailwayWorkerProcessError("start-failed");
      }
    },
    close: closeProcess,
  });
}
