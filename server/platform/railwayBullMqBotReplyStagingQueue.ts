import {
  createHash,
} from "node:crypto";

import {
  Queue,
  Worker,
} from "bullmq";

import {
  deriveBotReplyStagingQueueJobId,
  parseBotReplyStagingQueueMessage,
  type BotReplyStagingQueueMessage,
} from "../operations/botReplyStagingQueueMessage.ts";
import {
  inspectRailwayBullMqConfiguration,
  type RailwayBullMqConfiguration,
  type RailwayBullMqEnvironment,
} from "./railwayBullMqConfiguration.ts";

export const railwayBullMqBotReplyStagingAdapterVersion =
  "railway-bullmq-bot-reply-staging-v1" as const;
export const railwayBullMqBotReplyStagingQueueName =
  "bot-reply-staging-v1" as const;
export const railwayBullMqBotReplyStagingDeadLetterQueueName =
  "bot-reply-staging-dlq-v1" as const;

const JOB_NAME = "run-bot-reply-staging-v1";
const DEAD_LETTER_JOB_NAME = "bot-reply-staging-dead-letter-v1";
const SOURCE_JOB_SIZE_LIMIT_BYTES = 8_192;
const DEAD_LETTER_JOB_SIZE_LIMIT_BYTES = 4_096;
const STACK_TRACE_LIMIT = 3;
const STARTUP_TIMEOUT_MILLISECONDS = 15_000;

export type RailwayBullMqBotReplyStagingQueueErrorCode =
  | "configuration-disabled"
  | "configuration-incomplete"
  | "configuration-invalid"
  | "dependencies-invalid"
  | "options-invalid"
  | "already-closed"
  | "not-started"
  | "message-invalid"
  | "publish-failed"
  | "maintenance-failed"
  | "startup-failed"
  | "shutdown-failed";

export class RailwayBullMqBotReplyStagingQueueError extends Error {
  readonly code: RailwayBullMqBotReplyStagingQueueErrorCode;

  constructor(code: RailwayBullMqBotReplyStagingQueueErrorCode) {
    super(`Railway BullMQ bot reply staging queue failed: ${code}`);
    this.name = "RailwayBullMqBotReplyStagingQueueError";
    this.code = code;
  }
}

export type BotReplyStagingDeadLetterReason =
  | "invalid-envelope"
  | "lease-expired"
  | "consumer-failed";

export interface RailwayBullMqBotReplyStagingQueueTelemetry {
  readonly recordConnectionFailure: () => void;
  readonly recordWorkerFailure: () => void;
  readonly recordWorkerRuntimeFailure: () => void;
  readonly recordPublisherFailure: () => void;
  readonly recordDeadLetter: (
    reason: BotReplyStagingDeadLetterReason,
  ) => void;
  readonly recordDeadLetterCleanup: (count: number) => void;
}

interface RuntimeClock {
  readonly now: () => Date;
}

export interface BotReplyStagingQueuePublisher {
  readonly publish: (
    message: Readonly<BotReplyStagingQueueMessage>,
  ) => Promise<void>;
}

export interface BotReplyStagingQueueConsumer {
  readonly handle: (
    message: Readonly<BotReplyStagingQueueMessage>,
  ) => Promise<unknown>;
}

export interface RailwayBullMqBotReplyStagingPublisherOptions {
  readonly environment?: RailwayBullMqEnvironment;
  readonly telemetry: Pick<
    RailwayBullMqBotReplyStagingQueueTelemetry,
    "recordConnectionFailure" | "recordPublisherFailure"
  >;
}

export interface RailwayBullMqBotReplyStagingWorkerOptions {
  readonly environment?: RailwayBullMqEnvironment;
  readonly consumer: BotReplyStagingQueueConsumer;
  readonly telemetry: RailwayBullMqBotReplyStagingQueueTelemetry;
  readonly clock?: RuntimeClock;
}

interface QueueJobOptions {
  readonly jobId?: string;
  readonly attempts?: number;
  readonly removeOnComplete?: Readonly<{ age: number; count: number }>;
  readonly removeOnFail?: Readonly<{ age: number; count: number }>;
  readonly sizeLimit?: number;
  readonly stackTraceLimit?: number;
}

interface QueueConnectionOptions {
  readonly url: string;
  readonly family: 0;
  readonly connectTimeout: 5_000;
  readonly keepAlive: 10_000;
  readonly noDelay: true;
  readonly connectionName: string;
  readonly maxRetriesPerRequest: 1 | null;
  readonly enableOfflineQueue: boolean;
}

interface QueueCreateOptions {
  readonly connection: QueueConnectionOptions;
  readonly prefix: string;
}

interface WorkerCreateOptions {
  readonly connection: QueueConnectionOptions;
  readonly prefix: string;
  readonly autorun: false;
  readonly concurrency: 1;
  readonly maxStalledCount: 0;
}

interface QueuePort {
  readonly add: (
    name: string,
    data: unknown,
    options: QueueJobOptions,
  ) => Promise<void>;
  readonly clean: (
    graceMilliseconds: number,
    limit: number,
    type: "wait",
  ) => Promise<readonly string[]>;
  readonly waitUntilReady: () => Promise<void>;
  readonly close: () => Promise<void>;
  readonly onError: (listener: () => void) => void;
}

interface WorkerJob {
  readonly id?: string;
  readonly name: string;
  readonly data: unknown;
  readonly timestamp: number;
  readonly attemptsMade: number;
}

interface WorkerPort {
  readonly run: () => Promise<void>;
  readonly waitUntilReady: () => Promise<void>;
  readonly close: () => Promise<void>;
  readonly onError: (listener: () => void) => void;
  readonly onFailed: (listener: () => void) => void;
}

export interface RailwayBullMqBotReplyStagingQueueDependencies {
  readonly createQueue: (
    name: string,
    options: QueueCreateOptions,
  ) => QueuePort;
  readonly createWorker: (
    name: string,
    processor: (job: WorkerJob) => Promise<unknown>,
    options: WorkerCreateOptions,
  ) => WorkerPort;
}

export interface RailwayBullMqBotReplyStagingPublisherRuntime {
  readonly publisher: BotReplyStagingQueuePublisher;
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export interface RailwayBullMqBotReplyStagingWorkerRuntime {
  readonly start: () => Promise<void>;
  readonly cleanExpiredDeadLetters: () => Promise<number>;
  readonly close: () => Promise<void>;
}

const defaultClock = Object.freeze({
  now() {
    return new Date();
  },
});

const defaultDependencies = Object.freeze({
  createQueue(name: string, options: QueueCreateOptions): QueuePort {
    const queue = new Queue(name, options);
    return Object.freeze({
      async add(jobName: string, data: unknown, jobOptions: QueueJobOptions) {
        await queue.add(jobName, data, jobOptions);
      },
      async clean(graceMilliseconds: number, limit: number, type: "wait") {
        return queue.clean(graceMilliseconds, limit, type);
      },
      async waitUntilReady() {
        await queue.waitUntilReady();
      },
      async close() {
        await queue.close();
      },
      onError(listener: () => void) {
        queue.on("error", listener);
      },
    });
  },
  createWorker(
    name: string,
    processor: (job: WorkerJob) => Promise<unknown>,
    options: WorkerCreateOptions,
  ): WorkerPort {
    const worker = new Worker(name, processor, options);
    return Object.freeze({
      async run() {
        await worker.run();
      },
      async waitUntilReady() {
        await worker.waitUntilReady();
      },
      async close() {
        await worker.close();
      },
      onError(listener: () => void) {
        worker.on("error", listener);
      },
      onFailed(listener: () => void) {
        worker.on("failed", listener);
      },
    });
  },
}) satisfies RailwayBullMqBotReplyStagingQueueDependencies;

const telemetryKeys = Object.freeze([
  "recordConnectionFailure",
  "recordDeadLetter",
  "recordDeadLetterCleanup",
  "recordPublisherFailure",
  "recordWorkerFailure",
  "recordWorkerRuntimeFailure",
] as const);

function recordSafely(action: () => void): void {
  try {
    action();
  } catch {
    // Telemetry cannot control queue delivery or lifecycle.
  }
}

function dependenciesAreValid(
  value: Readonly<RailwayBullMqBotReplyStagingQueueDependencies>,
): boolean {
  return Boolean(
    value && typeof value === "object" &&
    Object.keys(value).sort().join(",") === "createQueue,createWorker" &&
    typeof value.createQueue === "function" &&
    typeof value.createWorker === "function",
  );
}

function publisherTelemetryIsValid(
  value: RailwayBullMqBotReplyStagingPublisherOptions["telemetry"],
): boolean {
  return Boolean(
    value && typeof value === "object" &&
    Object.keys(value).sort().join(",") ===
      "recordConnectionFailure,recordPublisherFailure" &&
    typeof value.recordConnectionFailure === "function" &&
    typeof value.recordPublisherFailure === "function",
  );
}

function workerTelemetryIsValid(
  value: RailwayBullMqBotReplyStagingQueueTelemetry,
): boolean {
  return Boolean(
    value && typeof value === "object" &&
    Object.keys(value).sort().join(",") ===
      [...telemetryKeys].sort().join(",") &&
    telemetryKeys.every((key) => typeof value[key] === "function"),
  );
}

function requireConfiguration(
  environment?: RailwayBullMqEnvironment,
): Readonly<RailwayBullMqConfiguration> {
  const state = environment === undefined
    ? inspectRailwayBullMqConfiguration()
    : inspectRailwayBullMqConfiguration(environment);
  if (state.status !== "configured") {
    throw new RailwayBullMqBotReplyStagingQueueError(
      state.status === "disabled"
        ? "configuration-disabled"
        : state.status === "incomplete"
        ? "configuration-incomplete"
        : "configuration-invalid",
    );
  }
  return state.configuration;
}

function producerConnection(
  configuration: Readonly<RailwayBullMqConfiguration>,
): QueueConnectionOptions {
  return Object.freeze({
    ...configuration.connection,
    connectionName: "connect-bot-reply-staging-producer-v1",
    maxRetriesPerRequest: 1 as const,
    enableOfflineQueue: false,
  });
}

function backgroundConnection(
  configuration: Readonly<RailwayBullMqConfiguration>,
  connectionName: string,
): QueueConnectionOptions {
  return Object.freeze({
    ...configuration.connection,
    connectionName,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  });
}

function sourceJobOptions(
  configuration: Readonly<RailwayBullMqConfiguration>,
  jobId: string,
): QueueJobOptions {
  return Object.freeze({
    jobId,
    attempts: 1,
    removeOnComplete: Object.freeze({
      age: configuration.retention.completedSeconds,
      count: configuration.retention.completedCount,
    }),
    removeOnFail: Object.freeze({
      age: configuration.retention.failedSeconds,
      count: configuration.retention.failedCount,
    }),
    sizeLimit: SOURCE_JOB_SIZE_LIMIT_BYTES,
    stackTraceLimit: STACK_TRACE_LIMIT,
  });
}

function deadLetterJobOptions(jobId: string): QueueJobOptions {
  return Object.freeze({
    jobId,
    attempts: 1,
    sizeLimit: DEAD_LETTER_JOB_SIZE_LIMIT_BYTES,
    stackTraceLimit: STACK_TRACE_LIMIT,
  });
}

function canonicalTimestamp(clock: RuntimeClock): string {
  const current = clock.now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new Error("BullMQ bot reply staging clock is invalid");
  }
  return current.toISOString();
}

function digest(value: unknown): string {
  let serialized: string;
  try {
    const candidate = JSON.stringify(value);
    serialized = typeof candidate === "string" ? candidate : "undefined";
  } catch {
    serialized = "unserializable";
  }
  return `sha256:${createHash("sha256").update(serialized).digest("hex")}`;
}

async function withStartupTimeout(
  action: Promise<unknown>,
  message: string,
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error(message)),
      STARTUP_TIMEOUT_MILLISECONDS,
    );
  });
  try {
    await Promise.race([action, timeoutPromise]);
  } finally {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
  }
}

export function createRailwayBullMqBotReplyStagingPublisherRuntime(
  options: Readonly<RailwayBullMqBotReplyStagingPublisherOptions>,
  dependencies: Readonly<
    RailwayBullMqBotReplyStagingQueueDependencies
  > = defaultDependencies,
): Readonly<RailwayBullMqBotReplyStagingPublisherRuntime> {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some(
      (key) => key !== "environment" && key !== "telemetry",
    ) ||
    !publisherTelemetryIsValid(options.telemetry)
  ) {
    throw new RailwayBullMqBotReplyStagingQueueError("options-invalid");
  }
  if (!dependenciesAreValid(dependencies)) {
    throw new RailwayBullMqBotReplyStagingQueueError("dependencies-invalid");
  }
  const configuration = requireConfiguration(options.environment);
  const mainQueue = dependencies.createQueue(
    railwayBullMqBotReplyStagingQueueName,
    Object.freeze({
      connection: producerConnection(configuration),
      prefix: configuration.prefix,
    }),
  );
  mainQueue.onError(() => {
    recordSafely(options.telemetry.recordConnectionFailure);
  });

  type RuntimeState = "created" | "starting" | "running" | "closing" |
    "closed";
  let state: RuntimeState = "created";
  let starting: Promise<void> | null = null;
  let closing: Promise<void> | null = null;

  const publisher: BotReplyStagingQueuePublisher = Object.freeze({
    async publish(rawMessage: Readonly<BotReplyStagingQueueMessage>) {
      if (state !== "running") {
        throw new RailwayBullMqBotReplyStagingQueueError("not-started");
      }
      const message = parseBotReplyStagingQueueMessage(rawMessage);
      if (message === null) {
        throw new RailwayBullMqBotReplyStagingQueueError("message-invalid");
      }
      try {
        await mainQueue.add(
          JOB_NAME,
          message,
          sourceJobOptions(
            configuration,
            deriveBotReplyStagingQueueJobId(message),
          ),
        );
      } catch {
        recordSafely(options.telemetry.recordPublisherFailure);
        throw new RailwayBullMqBotReplyStagingQueueError("publish-failed");
      }
    },
  });

  return Object.freeze({
    publisher,
    async start() {
      if (state === "running") return;
      if (state === "closing" || state === "closed") {
        throw new RailwayBullMqBotReplyStagingQueueError("already-closed");
      }
      if (starting !== null) return starting;
      state = "starting";
      starting = (async () => {
        try {
          await withStartupTimeout(
            mainQueue.waitUntilReady(),
            "BullMQ bot reply staging publisher startup timed out",
          );
          state = "running";
        } catch {
          try {
            await mainQueue.close();
          } catch {
            // Startup remains one bounded failure after cleanup.
          }
          state = "closed";
          throw new RailwayBullMqBotReplyStagingQueueError("startup-failed");
        } finally {
          starting = null;
        }
      })();
      return starting;
    },
    async close() {
      if (state === "closed") return;
      if (closing !== null) return closing;
      state = "closing";
      closing = (async () => {
        try {
          await mainQueue.close();
        } catch {
          throw new RailwayBullMqBotReplyStagingQueueError("shutdown-failed");
        } finally {
          state = "closed";
        }
      })();
      return closing;
    },
  });
}

export function createRailwayBullMqBotReplyStagingWorkerRuntime(
  options: Readonly<RailwayBullMqBotReplyStagingWorkerOptions>,
  dependencies: Readonly<
    RailwayBullMqBotReplyStagingQueueDependencies
  > = defaultDependencies,
): Readonly<RailwayBullMqBotReplyStagingWorkerRuntime> {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some(
      (key) => !["clock", "consumer", "environment", "telemetry"].includes(key),
    ) ||
    typeof options.consumer?.handle !== "function" ||
    !workerTelemetryIsValid(options.telemetry) ||
    (options.clock !== undefined && typeof options.clock.now !== "function")
  ) {
    throw new RailwayBullMqBotReplyStagingQueueError("options-invalid");
  }
  if (!dependenciesAreValid(dependencies)) {
    throw new RailwayBullMqBotReplyStagingQueueError("dependencies-invalid");
  }
  const configuration = requireConfiguration(options.environment);
  const clock = options.clock ?? defaultClock;
  const deadLetterQueue = dependencies.createQueue(
    railwayBullMqBotReplyStagingDeadLetterQueueName,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-bot-reply-staging-dlq-v1",
      ),
      prefix: configuration.prefix,
    }),
  );
  deadLetterQueue.onError(() => {
    recordSafely(options.telemetry.recordConnectionFailure);
  });

  async function moveToDeadLetter(
    job: WorkerJob,
    reason: BotReplyStagingDeadLetterReason,
    message: Readonly<BotReplyStagingQueueMessage> | null,
  ): Promise<void> {
    const failedAt = canonicalTimestamp(clock);
    const sourceBodyDigest = digest(job.data);
    const sourceIdentityDigest = digest({
      id: typeof job.id === "string" ? job.id : null,
      name: job.name,
      timestamp: Number.isSafeInteger(job.timestamp) ? job.timestamp : null,
      sourceBodyDigest,
    });
    try {
      await deadLetterQueue.add(
        DEAD_LETTER_JOB_NAME,
        Object.freeze({
          version: 1 as const,
          sourceQueue: railwayBullMqBotReplyStagingQueueName,
          sourceIdentityDigest,
          sourceBodyDigest,
          runKey: message?.run.runKey ?? null,
          claimVersion: message?.claimVersion ?? null,
          failedAt,
          reason,
        }),
        deadLetterJobOptions(
          `bot_reply_staging_dead_letter_v1_${sourceIdentityDigest.slice(7)}`,
        ),
      );
    } catch {
      throw new Error(
        "BullMQ bot reply staging dead-letter persistence failed",
      );
    }
    recordSafely(() => options.telemetry.recordDeadLetter(reason));
  }

  async function processJob(job: WorkerJob): Promise<Readonly<{
    outcome: "acknowledged" | "dead-lettered";
  }>> {
    const message = parseBotReplyStagingQueueMessage(job.data);
    const metadataIsValid =
      typeof job.id === "string" &&
      Number.isSafeInteger(job.timestamp) && job.timestamp > 0 &&
      Number.isSafeInteger(job.attemptsMade) && job.attemptsMade >= 0;
    if (
      message === null ||
      !metadataIsValid ||
      job.name !== JOB_NAME ||
      job.id !== deriveBotReplyStagingQueueJobId(message)
    ) {
      await moveToDeadLetter(job, "invalid-envelope", message);
      return Object.freeze({ outcome: "dead-lettered" });
    }
    const currentTimestamp = canonicalTimestamp(clock);
    if (Date.parse(message.leaseExpiresAt) <= Date.parse(currentTimestamp)) {
      await moveToDeadLetter(job, "lease-expired", message);
      return Object.freeze({ outcome: "dead-lettered" });
    }
    try {
      await options.consumer.handle(message);
    } catch {
      await moveToDeadLetter(job, "consumer-failed", message);
      return Object.freeze({ outcome: "dead-lettered" });
    }
    return Object.freeze({ outcome: "acknowledged" });
  }

  const worker = dependencies.createWorker(
    railwayBullMqBotReplyStagingQueueName,
    processJob,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-bot-reply-staging-worker-v1",
      ),
      prefix: configuration.prefix,
      autorun: false as const,
      concurrency: 1 as const,
      maxStalledCount: 0 as const,
    }),
  );
  worker.onError(() => {
    recordSafely(options.telemetry.recordConnectionFailure);
  });
  worker.onFailed(() => {
    recordSafely(options.telemetry.recordWorkerFailure);
  });

  type RuntimeState = "created" | "starting" | "running" | "closing" |
    "closed";
  let state: RuntimeState = "created";
  let starting: Promise<void> | null = null;
  let closing: Promise<void> | null = null;

  async function closeResources(): Promise<void> {
    const results = await Promise.allSettled([
      worker.close(),
      deadLetterQueue.close(),
    ]);
    if (results.some((result) => result.status === "rejected")) {
      throw new RailwayBullMqBotReplyStagingQueueError("shutdown-failed");
    }
  }

  return Object.freeze({
    async start() {
      if (state === "running") return;
      if (state === "closing" || state === "closed") {
        throw new RailwayBullMqBotReplyStagingQueueError("already-closed");
      }
      if (starting !== null) return starting;
      state = "starting";
      starting = (async () => {
        try {
          await withStartupTimeout(
            Promise.all([
              deadLetterQueue.waitUntilReady(),
              worker.waitUntilReady(),
            ]),
            "BullMQ bot reply staging worker startup timed out",
          );
          state = "running";
          void worker.run().catch(() => {
            if (state === "running") {
              recordSafely(options.telemetry.recordWorkerRuntimeFailure);
            }
          });
        } catch {
          try {
            await closeResources();
          } catch {
            // Startup remains one bounded failure after cleanup.
          }
          state = "closed";
          throw new RailwayBullMqBotReplyStagingQueueError("startup-failed");
        } finally {
          starting = null;
        }
      })();
      return starting;
    },
    async cleanExpiredDeadLetters() {
      if (state !== "running") {
        throw new RailwayBullMqBotReplyStagingQueueError("not-started");
      }
      let removed: readonly string[];
      try {
        removed = await deadLetterQueue.clean(
          configuration.retention.deadLetterSeconds * 1_000,
          configuration.retention.deadLetterCleanBatchSize,
          "wait",
        );
      } catch {
        throw new RailwayBullMqBotReplyStagingQueueError(
          "maintenance-failed",
        );
      }
      recordSafely(
        () => options.telemetry.recordDeadLetterCleanup(removed.length),
      );
      return removed.length;
    },
    async close() {
      if (state === "closed") return;
      if (closing !== null) return closing;
      state = "closing";
      closing = (async () => {
        try {
          await closeResources();
        } finally {
          state = "closed";
        }
      })();
      return closing;
    },
  });
}
