import {
  Queue,
  Worker,
} from "bullmq";

import type {
  TeamInvitationQueueBatch,
} from "../team/teamInvitationQueueConsumer.ts";
import {
  parseTeamInvitationQueueMessage,
  type TeamInvitationQueueMessage,
} from "../team/teamInvitationQueueMessage.ts";
import {
  createTeamInvitationQueuePublisher,
  type TeamInvitationQueueBinding,
} from "../team/teamInvitationQueuePublisher.ts";
import {
  inspectRailwayBullMqConfiguration,
  type RailwayBullMqConfiguration,
  type RailwayBullMqEnvironment,
} from "./railwayBullMqConfiguration.ts";

export const railwayBullMqTeamInvitationAdapterVersion =
  "railway-bullmq-team-invitation-v1" as const;
export const railwayBullMqTeamInvitationQueueName =
  "team-invitation-v1" as const;
export const railwayBullMqTeamInvitationDeadLetterQueueName =
  "team-invitation-dlq-v1" as const;

const JOB_NAME = "deliver-team-invitation-v1";
const DEAD_LETTER_JOB_NAME = "team-invitation-dead-letter-v1";
const DYNAMIC_BACKOFF_TYPE = "team-invitation-bounded-v1";
const MAXIMUM_DELIVERY_ATTEMPTS = 11;
const FALLBACK_RETRY_DELAY_SECONDS = 30;
const MAXIMUM_RETRY_DELAY_SECONDS = 86_400;
const SOURCE_JOB_SIZE_LIMIT_BYTES = 4_096;
const DEAD_LETTER_JOB_SIZE_LIMIT_BYTES = 8_192;
const STACK_TRACE_LIMIT = 3;
const STARTUP_TIMEOUT_MILLISECONDS = 15_000;
const deliveryKeyPattern =
  /^team_invitation_delivery_v1_[0-9a-f]{64}$/;

export type RailwayBullMqTeamInvitationQueueErrorCode =
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

export class RailwayBullMqTeamInvitationQueueError extends Error {
  readonly code: RailwayBullMqTeamInvitationQueueErrorCode;

  constructor(code: RailwayBullMqTeamInvitationQueueErrorCode) {
    super(`Railway BullMQ team invitation queue failed: ${code}`);
    this.name = "RailwayBullMqTeamInvitationQueueError";
    this.code = code;
  }
}

class TeamInvitationRetryError extends Error {
  readonly delayMilliseconds: number;

  constructor(delaySeconds: number) {
    super("BullMQ team invitation delivery requires retry");
    this.name = "TeamInvitationRetryError";
    this.delayMilliseconds = delaySeconds * 1_000;
  }
}

export interface RailwayBullMqTeamInvitationQueueTelemetry {
  readonly recordConnectionFailure: () => void;
  readonly recordWorkerFailure: () => void;
  readonly recordWorkerRuntimeFailure: () => void;
  readonly recordPublisherFailure: () => void;
  readonly recordDeadLetter: (
    reason: "invalid-envelope" | "retry-exhausted",
  ) => void;
  readonly recordDeadLetterCleanup: (count: number) => void;
}

interface RuntimeClock {
  readonly now: () => Date;
}

interface TeamInvitationQueueConsumer {
  readonly handle: (batch: TeamInvitationQueueBatch) => Promise<unknown>;
}

export interface RailwayBullMqTeamInvitationPublisherOptions {
  readonly environment?: RailwayBullMqEnvironment;
  readonly telemetry: Pick<
    RailwayBullMqTeamInvitationQueueTelemetry,
    "recordConnectionFailure" | "recordPublisherFailure"
  >;
}

export interface RailwayBullMqTeamInvitationWorkerOptions {
  readonly environment?: RailwayBullMqEnvironment;
  readonly consumer: TeamInvitationQueueConsumer;
  readonly telemetry: RailwayBullMqTeamInvitationQueueTelemetry;
  readonly clock?: RuntimeClock;
}

interface QueueJobOptions {
  readonly jobId?: string;
  readonly attempts?: number;
  readonly backoff?: Readonly<{ type: typeof DYNAMIC_BACKOFF_TYPE }>;
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
  readonly maxStalledCount: 2;
  readonly settings: Readonly<{
    backoffStrategy: (
      attemptsMade: number,
      type?: string,
      error?: Error,
    ) => number;
  }>;
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

export interface RailwayBullMqTeamInvitationQueueDependencies {
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

export interface RailwayBullMqTeamInvitationPublisherRuntime {
  readonly publisher: ReturnType<typeof createTeamInvitationQueuePublisher>;
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export interface RailwayBullMqTeamInvitationWorkerRuntime {
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
}) satisfies RailwayBullMqTeamInvitationQueueDependencies;

const workerTelemetryKeys = Object.freeze([
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
  value: Readonly<RailwayBullMqTeamInvitationQueueDependencies>,
): boolean {
  return Boolean(
    value && typeof value === "object" &&
    Object.keys(value).sort().join(",") === "createQueue,createWorker" &&
    typeof value.createQueue === "function" &&
    typeof value.createWorker === "function",
  );
}

function publisherTelemetryIsValid(
  value: RailwayBullMqTeamInvitationPublisherOptions["telemetry"],
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
  value: RailwayBullMqTeamInvitationQueueTelemetry,
): boolean {
  return Boolean(
    value && typeof value === "object" &&
    Object.keys(value).sort().join(",") ===
      [...workerTelemetryKeys].sort().join(",") &&
    workerTelemetryKeys.every((key) => typeof value[key] === "function"),
  );
}

function requireConfiguration(
  environment?: RailwayBullMqEnvironment,
): Readonly<RailwayBullMqConfiguration> {
  const state = environment === undefined
    ? inspectRailwayBullMqConfiguration()
    : inspectRailwayBullMqConfiguration(environment);
  if (state.status !== "configured") {
    throw new RailwayBullMqTeamInvitationQueueError(
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
    connectionName: "connect-team-invitation-producer-v1",
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
    attempts: MAXIMUM_DELIVERY_ATTEMPTS,
    backoff: Object.freeze({ type: DYNAMIC_BACKOFF_TYPE }),
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
    throw new Error("BullMQ team invitation clock is invalid");
  }
  return current.toISOString();
}

function retryDelayIsValid(value: number): boolean {
  return Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= MAXIMUM_RETRY_DELAY_SECONDS;
}

function dynamicBackoffStrategy(
  _attemptsMade: number,
  type?: string,
  error?: Error,
): number {
  if (
    type !== DYNAMIC_BACKOFF_TYPE ||
    !(error instanceof TeamInvitationRetryError) ||
    !Number.isSafeInteger(error.delayMilliseconds) ||
    !retryDelayIsValid(error.delayMilliseconds / 1_000)
  ) {
    return -1;
  }
  return error.delayMilliseconds;
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

export function createRailwayBullMqTeamInvitationPublisherRuntime(
  options: Readonly<RailwayBullMqTeamInvitationPublisherOptions>,
  dependencies: Readonly<RailwayBullMqTeamInvitationQueueDependencies> =
    defaultDependencies,
): Readonly<RailwayBullMqTeamInvitationPublisherRuntime> {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some(
      (key) => key !== "environment" && key !== "telemetry",
    ) ||
    !publisherTelemetryIsValid(options.telemetry)
  ) {
    throw new RailwayBullMqTeamInvitationQueueError("options-invalid");
  }
  if (!dependenciesAreValid(dependencies)) {
    throw new RailwayBullMqTeamInvitationQueueError("dependencies-invalid");
  }
  const configuration = requireConfiguration(options.environment);
  const mainQueue = dependencies.createQueue(
    railwayBullMqTeamInvitationQueueName,
    Object.freeze({
      connection: producerConnection(configuration),
      prefix: configuration.prefix,
    }),
  );
  mainQueue.onError(() => {
    recordSafely(options.telemetry.recordConnectionFailure);
  });

  type RuntimeState = "created" | "starting" | "running" | "closing" | "closed";
  let state: RuntimeState = "created";
  let starting: Promise<void> | null = null;
  let closing: Promise<void> | null = null;

  const binding: TeamInvitationQueueBinding = Object.freeze({
    async send(
      body: TeamInvitationQueueMessage,
      sendOptions: { contentType: "json" },
    ) {
      if (state !== "running") {
        throw new RailwayBullMqTeamInvitationQueueError("not-started");
      }
      const message = parseTeamInvitationQueueMessage(body);
      if (
        message === null ||
        !sendOptions ||
        Object.keys(sendOptions).join(",") !== "contentType" ||
        sendOptions.contentType !== "json"
      ) {
        throw new RailwayBullMqTeamInvitationQueueError("message-invalid");
      }
      try {
        await mainQueue.add(
          JOB_NAME,
          message,
          sourceJobOptions(configuration, message.deliveryKey),
        );
      } catch {
        recordSafely(options.telemetry.recordPublisherFailure);
        throw new RailwayBullMqTeamInvitationQueueError("publish-failed");
      }
    },
  });

  return Object.freeze({
    publisher: createTeamInvitationQueuePublisher(binding),
    async start() {
      if (state === "running") {
        return;
      }
      if (state === "closing" || state === "closed") {
        throw new RailwayBullMqTeamInvitationQueueError("already-closed");
      }
      if (starting !== null) {
        return starting;
      }
      state = "starting";
      starting = (async () => {
        try {
          await withStartupTimeout(
            mainQueue.waitUntilReady(),
            "BullMQ team invitation publisher startup timed out",
          );
          state = "running";
        } catch {
          try {
            await mainQueue.close();
          } catch {
            // Startup remains one bounded failure after cleanup.
          }
          state = "closed";
          throw new RailwayBullMqTeamInvitationQueueError("startup-failed");
        } finally {
          starting = null;
        }
      })();
      return starting;
    },
    async close() {
      if (state === "closed") {
        return;
      }
      if (closing !== null) {
        return closing;
      }
      state = "closing";
      closing = (async () => {
        try {
          await mainQueue.close();
        } catch {
          throw new RailwayBullMqTeamInvitationQueueError("shutdown-failed");
        } finally {
          state = "closed";
        }
      })();
      return closing;
    },
  });
}

export function createRailwayBullMqTeamInvitationWorkerRuntime(
  options: Readonly<RailwayBullMqTeamInvitationWorkerOptions>,
  dependencies: Readonly<RailwayBullMqTeamInvitationQueueDependencies> =
    defaultDependencies,
): Readonly<RailwayBullMqTeamInvitationWorkerRuntime> {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some(
      (key) => !["clock", "consumer", "environment", "telemetry"].includes(key),
    ) ||
    typeof options.consumer?.handle !== "function" ||
    !workerTelemetryIsValid(options.telemetry) ||
    (options.clock !== undefined && typeof options.clock.now !== "function")
  ) {
    throw new RailwayBullMqTeamInvitationQueueError("options-invalid");
  }
  if (!dependenciesAreValid(dependencies)) {
    throw new RailwayBullMqTeamInvitationQueueError("dependencies-invalid");
  }
  const configuration = requireConfiguration(options.environment);
  const clock = options.clock ?? defaultClock;
  const deadLetterQueue = dependencies.createQueue(
    railwayBullMqTeamInvitationDeadLetterQueueName,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-team-invitation-dlq-v1",
      ),
      prefix: configuration.prefix,
    }),
  );
  deadLetterQueue.onError(() => {
    recordSafely(options.telemetry.recordConnectionFailure);
  });

  function deliveryAttempt(job: WorkerJob): number {
    if (!Number.isSafeInteger(job.attemptsMade) || job.attemptsMade < 0) {
      throw new Error("BullMQ team invitation attempt is invalid");
    }
    return job.attemptsMade + 1;
  }

  async function moveToDeadLetter(
    job: WorkerJob,
    reason: "invalid-envelope" | "retry-exhausted",
    attempt: number,
  ): Promise<void> {
    if (
      typeof job.id !== "string" ||
      !deliveryKeyPattern.test(job.id) ||
      !Number.isSafeInteger(job.timestamp) ||
      job.timestamp <= 0
    ) {
      throw new Error("BullMQ team invitation identity is invalid");
    }
    try {
      await deadLetterQueue.add(
        DEAD_LETTER_JOB_NAME,
        Object.freeze({
          version: 1 as const,
          sourceQueue: railwayBullMqTeamInvitationQueueName,
          sourceJobId: job.id,
          sourceTimestamp: job.timestamp,
          failedAt: canonicalTimestamp(clock),
          attempts: attempt,
          reason,
          body: job.data,
        }),
        deadLetterJobOptions(`${job.id}_${job.timestamp}`),
      );
    } catch {
      throw new Error("BullMQ team invitation dead-letter persistence failed");
    }
    recordSafely(() => options.telemetry.recordDeadLetter(reason));
  }

  async function processJob(job: WorkerJob): Promise<Readonly<{
    outcome: "acknowledged" | "dead-lettered";
  }>> {
    const attempt = deliveryAttempt(job);
    const message = parseTeamInvitationQueueMessage(job.data);
    if (
      message === null ||
      job.name !== JOB_NAME ||
      job.id !== message.deliveryKey
    ) {
      await moveToDeadLetter(job, "invalid-envelope", attempt);
      return Object.freeze({ outcome: "dead-lettered" });
    }
    const deliveryState: {
      action: "ack" | "retry" | null;
      delaySeconds: number | null;
    } = { action: null, delaySeconds: null };
    const chooseAction = (action: "ack" | "retry"): void => {
      if (deliveryState.action !== null) {
        throw new Error("BullMQ team invitation action is not isolated");
      }
      deliveryState.action = action;
    };
    const delivery = Object.freeze({
      id: job.id,
      timestamp: new Date(job.timestamp),
      attempts: attempt,
      body: message,
      ack() {
        chooseAction("ack");
      },
      retry(retryOptions: Readonly<{ delaySeconds: number }>) {
        chooseAction("retry");
        if (!retryOptions || !retryDelayIsValid(retryOptions.delaySeconds)) {
          throw new Error("BullMQ team invitation retry delay is invalid");
        }
        deliveryState.delaySeconds = retryOptions.delaySeconds;
      },
    });

    try {
      await options.consumer.handle(Object.freeze({
        queue: railwayBullMqTeamInvitationQueueName,
        messages: Object.freeze([delivery]),
      }));
    } catch {
      deliveryState.action = "retry";
      deliveryState.delaySeconds = FALLBACK_RETRY_DELAY_SECONDS;
    }
    if (deliveryState.action === "ack") {
      return Object.freeze({ outcome: "acknowledged" });
    }
    const delaySeconds =
      deliveryState.action === "retry" &&
        deliveryState.delaySeconds !== null &&
        retryDelayIsValid(deliveryState.delaySeconds)
        ? deliveryState.delaySeconds
        : FALLBACK_RETRY_DELAY_SECONDS;
    if (attempt >= MAXIMUM_DELIVERY_ATTEMPTS) {
      await moveToDeadLetter(job, "retry-exhausted", attempt);
      return Object.freeze({ outcome: "dead-lettered" });
    }
    throw new TeamInvitationRetryError(delaySeconds);
  }

  const worker = dependencies.createWorker(
    railwayBullMqTeamInvitationQueueName,
    processJob,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-team-invitation-worker-v1",
      ),
      prefix: configuration.prefix,
      autorun: false as const,
      concurrency: 1 as const,
      maxStalledCount: 2 as const,
      settings: Object.freeze({ backoffStrategy: dynamicBackoffStrategy }),
    }),
  );
  worker.onError(() => {
    recordSafely(options.telemetry.recordConnectionFailure);
  });
  worker.onFailed(() => {
    recordSafely(options.telemetry.recordWorkerFailure);
  });

  type RuntimeState = "created" | "starting" | "running" | "closing" | "closed";
  let state: RuntimeState = "created";
  let starting: Promise<void> | null = null;
  let closing: Promise<void> | null = null;

  async function closeResources(): Promise<void> {
    const results = await Promise.allSettled([
      worker.close(),
      deadLetterQueue.close(),
    ]);
    if (results.some((result) => result.status === "rejected")) {
      throw new RailwayBullMqTeamInvitationQueueError("shutdown-failed");
    }
  }

  return Object.freeze({
    async start() {
      if (state === "running") {
        return;
      }
      if (state === "closing" || state === "closed") {
        throw new RailwayBullMqTeamInvitationQueueError("already-closed");
      }
      if (starting !== null) {
        return starting;
      }
      state = "starting";
      starting = (async () => {
        try {
          await withStartupTimeout(
            Promise.all([
              deadLetterQueue.waitUntilReady(),
              worker.waitUntilReady(),
            ]),
            "BullMQ team invitation worker startup timed out",
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
          throw new RailwayBullMqTeamInvitationQueueError("startup-failed");
        } finally {
          starting = null;
        }
      })();
      return starting;
    },
    async cleanExpiredDeadLetters() {
      if (state !== "running") {
        throw new RailwayBullMqTeamInvitationQueueError("not-started");
      }
      let removed: readonly string[];
      try {
        removed = await deadLetterQueue.clean(
          configuration.retention.deadLetterSeconds * 1_000,
          configuration.retention.deadLetterCleanBatchSize,
          "wait",
        );
      } catch {
        throw new RailwayBullMqTeamInvitationQueueError("maintenance-failed");
      }
      recordSafely(
        () => options.telemetry.recordDeadLetterCleanup(removed.length),
      );
      return removed.length;
    },
    async close() {
      if (state === "closed") {
        return;
      }
      if (closing !== null) {
        return closing;
      }
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
