import type {
  RailwayWorkerSchedulerResult,
} from "./railwayWorkerScheduler.ts";

export interface RailwayWorkerSchedulerRuntime {
  readonly scheduler: Readonly<{
    run: () => Promise<RailwayWorkerSchedulerResult>;
  }>;
  readonly close: () => Promise<void>;
}

export interface RailwayWorkerSchedulerService {
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export type RailwayWorkerSchedulerServiceErrorCode =
  | "options-invalid"
  | "already-closed"
  | "start-failed"
  | "shutdown-failed";

export class RailwayWorkerSchedulerServiceError extends Error {
  readonly code: RailwayWorkerSchedulerServiceErrorCode;

  constructor(code: RailwayWorkerSchedulerServiceErrorCode) {
    super(`Railway worker scheduler service failed: ${code}`);
    this.name = "RailwayWorkerSchedulerServiceError";
    this.code = code;
  }
}

export interface RailwayWorkerSchedulerServiceTelemetry {
  readonly recordRunFailure: () => void;
  readonly recordTimerFailure: () => void;
  readonly recordOverlapSuppressed: () => void;
}

export interface RailwayWorkerSchedulerServiceClock {
  readonly now: () => Date;
}

type TimerHandle = ReturnType<typeof setTimeout>;

export interface RailwayWorkerSchedulerTimers {
  readonly schedule: (
    callback: () => Promise<void>,
    delayMilliseconds: number,
  ) => TimerHandle;
  readonly cancel: (handle: TimerHandle) => void;
}

export interface RailwayWorkerSchedulerServiceOptions {
  readonly runtime: RailwayWorkerSchedulerRuntime;
  readonly telemetry: RailwayWorkerSchedulerServiceTelemetry;
  readonly clock?: RailwayWorkerSchedulerServiceClock;
  readonly timers?: RailwayWorkerSchedulerTimers;
}

const optionKeys = Object.freeze([
  "clock",
  "runtime",
  "telemetry",
  "timers",
]);
const minuteMilliseconds = 60_000;

const defaultClock = Object.freeze({
  now() {
    return new Date();
  },
});

const defaultTimers = Object.freeze({
  schedule(callback: () => Promise<void>, delayMilliseconds: number) {
    return setTimeout(() => {
      void callback();
    }, delayMilliseconds);
  },
  cancel(handle: TimerHandle) {
    clearTimeout(handle);
  },
});

function requireOptions(
  options: Readonly<RailwayWorkerSchedulerServiceOptions>,
): Readonly<{
  clock: RailwayWorkerSchedulerServiceClock;
  timers: RailwayWorkerSchedulerTimers;
}> {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    typeof options.runtime?.scheduler?.run !== "function" ||
    typeof options.runtime?.close !== "function" ||
    typeof options.telemetry?.recordRunFailure !== "function" ||
    typeof options.telemetry?.recordTimerFailure !== "function" ||
    typeof options.telemetry?.recordOverlapSuppressed !== "function"
  ) {
    throw new RailwayWorkerSchedulerServiceError("options-invalid");
  }

  const clock = options.clock ?? defaultClock;
  const timers = options.timers ?? defaultTimers;

  if (
    typeof clock.now !== "function" ||
    typeof timers.schedule !== "function" ||
    typeof timers.cancel !== "function"
  ) {
    throw new RailwayWorkerSchedulerServiceError("options-invalid");
  }

  return Object.freeze({ clock, timers });
}

function nextMinuteDelay(clock: RailwayWorkerSchedulerServiceClock): number {
  const current = clock.now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new RailwayWorkerSchedulerServiceError("start-failed");
  }

  const remainder = current.getTime() % minuteMilliseconds;
  const delay = remainder === 0
    ? minuteMilliseconds
    : minuteMilliseconds - remainder;

  if (
    !Number.isSafeInteger(delay) ||
    delay < 1 ||
    delay > minuteMilliseconds
  ) {
    throw new RailwayWorkerSchedulerServiceError("start-failed");
  }

  return delay;
}

function recordSafely(action: () => void): void {
  try {
    action();
  } catch {
    // Telemetry must not control the scheduler lifecycle.
  }
}

export function createRailwayWorkerSchedulerService(
  options: Readonly<RailwayWorkerSchedulerServiceOptions>,
): Readonly<RailwayWorkerSchedulerService> {
  const dependencies = requireOptions(options);
  let started = false;
  let closed = false;
  let pendingTimer: TimerHandle | null = null;
  let activeRun: Promise<void> | null = null;
  let closing: Promise<void> | null = null;

  function schedule(delayMilliseconds: number): void {
    if (closed) {
      return;
    }

    if (pendingTimer !== null) {
      throw new RailwayWorkerSchedulerServiceError("start-failed");
    }

    pendingTimer = dependencies.timers.schedule(async () => {
      pendingTimer = null;
      await runOnce();
    }, delayMilliseconds);
  }

  function scheduleNextMinute(): void {
    try {
      schedule(nextMinuteDelay(dependencies.clock));
    } catch {
      recordSafely(options.telemetry.recordTimerFailure);
    }
  }

  async function runOnce(): Promise<void> {
    if (closed) {
      return;
    }

    if (activeRun !== null) {
      recordSafely(options.telemetry.recordOverlapSuppressed);
      return;
    }

    activeRun = (async () => {
      try {
        await options.runtime.scheduler.run();
      } catch {
        recordSafely(options.telemetry.recordRunFailure);
      }
    })();

    try {
      await activeRun;
    } finally {
      activeRun = null;
      if (!closed) {
        scheduleNextMinute();
      }
    }
  }

  async function closeService(): Promise<void> {
    if (closed && closing === null) {
      return;
    }

    if (!closing) {
      closing = (async () => {
        closed = true;

        if (pendingTimer !== null) {
          dependencies.timers.cancel(pendingTimer);
          pendingTimer = null;
        }

        if (activeRun !== null) {
          await activeRun;
        }

        try {
          await options.runtime.close();
        } catch {
          throw new RailwayWorkerSchedulerServiceError("shutdown-failed");
        } finally {
          started = false;
        }
      })();
    }

    await closing;
  }

  return Object.freeze({
    async start() {
      if (closed) {
        throw new RailwayWorkerSchedulerServiceError("already-closed");
      }

      if (started) {
        return;
      }

      try {
        schedule(0);
        started = true;
      } catch {
        closed = true;
        try {
          await options.runtime.close();
        } catch {
          // Startup remains one bounded failure after cleanup attempts.
        }
        throw new RailwayWorkerSchedulerServiceError("start-failed");
      }
    },
    close: closeService,
  });
}
