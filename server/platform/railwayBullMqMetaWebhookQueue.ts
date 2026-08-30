import {
  Queue,
  Worker,
} from "bullmq";

import {
  parseMetaWebhookQueueMessage,
  type MetaWebhookQueueMessage,
} from "../meta/metaWebhookQueueMessage.ts";
import type {
  MetaWebhookQueueBatch,
} from "../meta/metaWebhookQueueConsumer.ts";
import type {
  MetaWebhookQueuePort,
} from "../meta/metaWebhookQueuePort.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  inspectRailwayBullMqConfiguration,
  type RailwayBullMqConfiguration,
  type RailwayBullMqEnvironment,
} from "./railwayBullMqConfiguration.ts";

export const railwayBullMqMetaWebhookAdapterVersion =
  "railway-bullmq-meta-webhook-v1" as const;

export const railwayBullMqMetaWebhookQueueName =
  "meta-webhook-v1" as const;

export const railwayBullMqMetaWebhookDeadLetterQueueName =
  "meta-webhook-dlq-v1" as const;

const JOB_NAME = "process-meta-webhook-v1";
const DEAD_LETTER_JOB_NAME = "meta-webhook-dead-letter-v1";
const MAXIMUM_RETRIES = 10;
const MAXIMUM_DELIVERY_ATTEMPTS = MAXIMUM_RETRIES + 1;
const RETRY_DELAY_MILLISECONDS = 30_000;
const SOURCE_JOB_SIZE_LIMIT_BYTES = 192_000;
const DEAD_LETTER_JOB_SIZE_LIMIT_BYTES = 196_000;
const STACK_TRACE_LIMIT = 3;
const STARTUP_TIMEOUT_MILLISECONDS = 15_000;
const sourceJobIdPattern = /^[A-Za-z0-9_-]{1,100}$/;
const signaturePattern = /^sha256=[0-9a-f]{64}$/;
const base64Pattern =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

interface MetaWebhookWireMessage {
  readonly version: 1;
  readonly rawPayloadBase64: string;
  readonly signatureHeader: string;
}

export type RailwayBullMqMetaWebhookQueueErrorCode =
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

export class RailwayBullMqMetaWebhookQueueError extends Error {
  readonly code: RailwayBullMqMetaWebhookQueueErrorCode;

  constructor(code: RailwayBullMqMetaWebhookQueueErrorCode) {
    super(`Railway BullMQ Meta webhook queue failed: ${code}`);
    this.name = "RailwayBullMqMetaWebhookQueueError";
    this.code = code;
  }
}

export interface RailwayBullMqMetaWebhookQueueTelemetry {
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

interface MetaWebhookQueueConsumer {
  readonly handle: (
    batch: MetaWebhookQueueBatch,
  ) => Promise<unknown>;
}

export interface RailwayBullMqMetaWebhookPublisherOptions {
  readonly environment?: RailwayBullMqEnvironment;
  readonly telemetry: Pick<
    RailwayBullMqMetaWebhookQueueTelemetry,
    "recordConnectionFailure" | "recordPublisherFailure"
  >;
}

export interface RailwayBullMqMetaWebhookWorkerOptions {
  readonly environment?: RailwayBullMqEnvironment;
  readonly consumer: MetaWebhookQueueConsumer;
  readonly telemetry: RailwayBullMqMetaWebhookQueueTelemetry;
  readonly clock?: RuntimeClock;
}

interface QueueJobOptions {
  readonly jobId?: string;
  readonly attempts?: number;
  readonly backoff?: Readonly<{
    type: "fixed";
    delay: number;
  }>;
  readonly removeOnComplete?: Readonly<{
    age: number;
    count: number;
  }>;
  readonly removeOnFail?: Readonly<{
    age: number;
    count: number;
  }>;
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
  readonly defaultJobOptions?: QueueJobOptions;
}

interface WorkerCreateOptions {
  readonly connection: QueueConnectionOptions;
  readonly prefix: string;
  readonly autorun: false;
  readonly concurrency: 1;
  readonly maxStalledCount: 2;
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

export interface RailwayBullMqMetaWebhookQueueDependencies {
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

export interface RailwayBullMqMetaWebhookPublisherRuntime {
  readonly queue: MetaWebhookQueuePort;
  readonly start: () => Promise<void>;
  readonly close: () => Promise<void>;
}

export interface RailwayBullMqMetaWebhookWorkerRuntime {
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
      async add(
        jobName: string,
        data: unknown,
        jobOptions: QueueJobOptions,
      ) {
        await queue.add(jobName, data, jobOptions);
      },
      async clean(
        graceMilliseconds: number,
        limit: number,
        type: "wait",
      ) {
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
}) satisfies RailwayBullMqMetaWebhookQueueDependencies;

function recordSafely(action: () => void): void {
  try {
    action();
  } catch {
    // Telemetry cannot control queue delivery or lifecycle.
  }
}

function requireConfiguration(
  environment?: RailwayBullMqEnvironment,
): Readonly<RailwayBullMqConfiguration> {
  const state = environment === undefined
    ? inspectRailwayBullMqConfiguration()
    : inspectRailwayBullMqConfiguration(environment);

  if (state.status !== "configured") {
    throw new RailwayBullMqMetaWebhookQueueError(
      state.status === "disabled"
        ? "configuration-disabled"
        : state.status === "incomplete"
        ? "configuration-incomplete"
        : "configuration-invalid",
    );
  }

  return state.configuration;
}

function dependenciesAreValid(
  dependencies: Readonly<RailwayBullMqMetaWebhookQueueDependencies>,
): boolean {
  return Boolean(
    dependencies && typeof dependencies === "object" &&
    Object.keys(dependencies).sort().join(",") ===
      "createQueue,createWorker" &&
    typeof dependencies.createQueue === "function" &&
    typeof dependencies.createWorker === "function",
  );
}

function publisherTelemetryIsValid(
  telemetry: RailwayBullMqMetaWebhookPublisherOptions["telemetry"],
): boolean {
  return Boolean(
    telemetry && typeof telemetry === "object" &&
    Object.keys(telemetry).sort().join(",") ===
      "recordConnectionFailure,recordPublisherFailure" &&
    typeof telemetry.recordConnectionFailure === "function" &&
    typeof telemetry.recordPublisherFailure === "function",
  );
}

const workerTelemetryKeys = Object.freeze([
  "recordConnectionFailure",
  "recordDeadLetter",
  "recordDeadLetterCleanup",
  "recordPublisherFailure",
  "recordWorkerFailure",
  "recordWorkerRuntimeFailure",
] as const);

function workerTelemetryIsValid(
  telemetry: RailwayBullMqMetaWebhookQueueTelemetry,
): boolean {
  return Boolean(
    telemetry && typeof telemetry === "object" &&
    Object.keys(telemetry).sort().join(",") ===
      [...workerTelemetryKeys].sort().join(",") &&
    workerTelemetryKeys.every(
      (key) => typeof telemetry[key] === "function",
    ),
  );
}

function producerConnection(
  configuration: Readonly<RailwayBullMqConfiguration>,
): QueueConnectionOptions {
  return Object.freeze({
    ...configuration.connection,
    connectionName: "connect-meta-webhook-producer-v1",
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
    backoff: Object.freeze({
      type: "fixed" as const,
      delay: RETRY_DELAY_MILLISECONDS,
    }),
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
    throw new Error("BullMQ Meta webhook queue clock is invalid");
  }
  return current.toISOString();
}

function encodeWireMessage(
  message: Readonly<MetaWebhookQueueMessage>,
): Readonly<MetaWebhookWireMessage> | null {
  const parsed = parseMetaWebhookQueueMessage(message);
  if (parsed === null) {
    return null;
  }

  return Object.freeze({
    version: 1 as const,
    rawPayloadBase64: Buffer.from(parsed.rawPayload).toString("base64"),
    signatureHeader: parsed.signatureHeader,
  });
}

function decodeWireMessage(value: unknown): MetaWebhookQueueMessage | null {
  if (
    !value || typeof value !== "object" || Array.isArray(value)
  ) {
    return null;
  }
  const candidate = value as Readonly<Record<string, unknown>>;
  if (
    Object.keys(candidate).sort().join(",") !==
      "rawPayloadBase64,signatureHeader,version" ||
    candidate.version !== 1 ||
    typeof candidate.rawPayloadBase64 !== "string" ||
    candidate.rawPayloadBase64.length === 0 ||
    candidate.rawPayloadBase64.length > 160_000 ||
    !base64Pattern.test(candidate.rawPayloadBase64) ||
    typeof candidate.signatureHeader !== "string" ||
    !signaturePattern.test(candidate.signatureHeader)
  ) {
    return null;
  }

  const decoded = Buffer.from(candidate.rawPayloadBase64, "base64");
  if (
    decoded.length === 0 ||
    decoded.toString("base64") !== candidate.rawPayloadBase64
  ) {
    return null;
  }

  const rawPayload = Uint8Array.from(decoded).buffer;
  return parseMetaWebhookQueueMessage({
    version: 1,
    rawPayload,
    signatureHeader: candidate.signatureHeader,
  });
}

async function withStartupTimeout(
  action: Promise<unknown>,
  message: string,
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(message)),
      STARTUP_TIMEOUT_MILLISECONDS);
  });

  try {
    await Promise.race([action, timeoutPromise]);
  } finally {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
  }
}

export function createRailwayBullMqMetaWebhookPublisherRuntime(
  options: Readonly<RailwayBullMqMetaWebhookPublisherOptions>,
  dependencies: Readonly<RailwayBullMqMetaWebhookQueueDependencies> =
    defaultDependencies,
): Readonly<RailwayBullMqMetaWebhookPublisherRuntime> {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some(
      (key) => key !== "environment" && key !== "telemetry",
    ) ||
    !publisherTelemetryIsValid(options.telemetry)
  ) {
    throw new RailwayBullMqMetaWebhookQueueError("options-invalid");
  }
  if (!dependenciesAreValid(dependencies)) {
    throw new RailwayBullMqMetaWebhookQueueError("dependencies-invalid");
  }

  const configuration = requireConfiguration(options.environment);
  const mainQueue = dependencies.createQueue(
    railwayBullMqMetaWebhookQueueName,
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

  const queue: MetaWebhookQueuePort = Object.freeze({
    async publish(message: Readonly<MetaWebhookQueueMessage>) {
      if (state !== "running") {
        throw new RailwayBullMqMetaWebhookQueueError("not-started");
      }
      const wireMessage = encodeWireMessage(message);
      if (wireMessage === null) {
        throw new RailwayBullMqMetaWebhookQueueError("message-invalid");
      }
      const eventKey = await sha256Hex(
        new Uint8Array(message.rawPayload),
      );

      try {
        await mainQueue.add(
          JOB_NAME,
          wireMessage,
          sourceJobOptions(configuration, eventKey),
        );
      } catch {
        recordSafely(options.telemetry.recordPublisherFailure);
        throw new RailwayBullMqMetaWebhookQueueError("publish-failed");
      }
    },
  });

  return Object.freeze({
    queue,
    async start() {
      if (state === "running") {
        return;
      }
      if (state === "closing" || state === "closed") {
        throw new RailwayBullMqMetaWebhookQueueError("already-closed");
      }
      if (starting !== null) {
        return starting;
      }

      state = "starting";
      starting = (async () => {
        try {
          await withStartupTimeout(
            mainQueue.waitUntilReady(),
            "BullMQ Meta webhook publisher startup timed out",
          );
          state = "running";
        } catch {
          try {
            await mainQueue.close();
          } catch {
            // Startup is one bounded failure after cleanup is attempted.
          }
          state = "closed";
          throw new RailwayBullMqMetaWebhookQueueError("startup-failed");
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
          throw new RailwayBullMqMetaWebhookQueueError("shutdown-failed");
        } finally {
          state = "closed";
        }
      })();
      return closing;
    },
  });
}

export function createRailwayBullMqMetaWebhookWorkerRuntime(
  options: Readonly<RailwayBullMqMetaWebhookWorkerOptions>,
  dependencies: Readonly<RailwayBullMqMetaWebhookQueueDependencies> =
    defaultDependencies,
): Readonly<RailwayBullMqMetaWebhookWorkerRuntime> {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some(
      (key) => !["clock", "consumer", "environment", "telemetry"].includes(key),
    ) ||
    typeof options.consumer?.handle !== "function" ||
    !workerTelemetryIsValid(options.telemetry) ||
    (options.clock !== undefined && typeof options.clock.now !== "function")
  ) {
    throw new RailwayBullMqMetaWebhookQueueError("options-invalid");
  }
  if (!dependenciesAreValid(dependencies)) {
    throw new RailwayBullMqMetaWebhookQueueError("dependencies-invalid");
  }

  const configuration = requireConfiguration(options.environment);
  const clock = options.clock ?? defaultClock;
  const deadLetterQueue = dependencies.createQueue(
    railwayBullMqMetaWebhookDeadLetterQueueName,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-meta-webhook-dlq-v1",
      ),
      prefix: configuration.prefix,
    }),
  );
  deadLetterQueue.onError(() => {
    recordSafely(options.telemetry.recordConnectionFailure);
  });

  function requireSourceJobIdentity(job: WorkerJob): Readonly<{
    sourceJobId: string;
    sourceTimestamp: number;
  }> {
    if (
      typeof job.id !== "string" ||
      !sourceJobIdPattern.test(job.id) ||
      !Number.isSafeInteger(job.timestamp) ||
      job.timestamp <= 0
    ) {
      throw new Error("BullMQ Meta webhook job identity is invalid");
    }
    return Object.freeze({
      sourceJobId: job.id,
      sourceTimestamp: job.timestamp,
    });
  }

  function deliveryAttempt(job: WorkerJob): number {
    if (!Number.isSafeInteger(job.attemptsMade) || job.attemptsMade < 0) {
      throw new Error("BullMQ Meta webhook job attempt is invalid");
    }
    return job.attemptsMade + 1;
  }

  async function moveToDeadLetter(
    job: WorkerJob,
    reason: "invalid-envelope" | "retry-exhausted",
    attempt: number,
  ): Promise<void> {
    const identity = requireSourceJobIdentity(job);
    const deadLetterId =
      `${identity.sourceJobId}_${identity.sourceTimestamp}`;
    try {
      await deadLetterQueue.add(
        DEAD_LETTER_JOB_NAME,
        Object.freeze({
          version: 1 as const,
          sourceQueue: railwayBullMqMetaWebhookQueueName,
          sourceJobId: identity.sourceJobId,
          sourceTimestamp: identity.sourceTimestamp,
          failedAt: canonicalTimestamp(clock),
          attempts: attempt,
          reason,
          body: job.data,
        }),
        deadLetterJobOptions(deadLetterId),
      );
    } catch {
      throw new Error("BullMQ Meta webhook dead-letter persistence failed");
    }
    recordSafely(() => options.telemetry.recordDeadLetter(reason));
  }

  async function processJob(job: WorkerJob): Promise<Readonly<{
    outcome: "acknowledged" | "dead-lettered";
  }>> {
    const attempt = deliveryAttempt(job);
    const message = decodeWireMessage(job.data);
    const expectedJobId = message === null
      ? null
      : await sha256Hex(new Uint8Array(message.rawPayload));
    if (
      message === null ||
      job.name !== JOB_NAME ||
      job.id !== expectedJobId
    ) {
      await moveToDeadLetter(job, "invalid-envelope", attempt);
      return Object.freeze({ outcome: "dead-lettered" });
    }

    const deliveryState: {
      action: "ack" | "retry" | null;
    } = { action: null };
    const chooseAction = (action: "ack" | "retry"): void => {
      if (deliveryState.action !== null) {
        throw new Error("BullMQ Meta webhook delivery action is not isolated");
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
      retry(retryOptions?: Readonly<{ delaySeconds: number }>) {
        chooseAction("retry");
        if (
          !retryOptions ||
          !Number.isSafeInteger(retryOptions.delaySeconds) ||
          retryOptions.delaySeconds * 1_000 !== RETRY_DELAY_MILLISECONDS
        ) {
          throw new Error("BullMQ Meta webhook retry delay is invalid");
        }
      },
    });

    try {
      await options.consumer.handle(Object.freeze({
        queue: railwayBullMqMetaWebhookQueueName,
        messages: Object.freeze([delivery]),
      }));
    } catch {
      deliveryState.action = "retry";
    }

    if (deliveryState.action === "ack") {
      return Object.freeze({ outcome: "acknowledged" });
    }
    if (attempt >= MAXIMUM_DELIVERY_ATTEMPTS) {
      await moveToDeadLetter(job, "retry-exhausted", attempt);
      return Object.freeze({ outcome: "dead-lettered" });
    }
    throw new Error("BullMQ Meta webhook delivery requires retry");
  }

  const worker = dependencies.createWorker(
    railwayBullMqMetaWebhookQueueName,
    processJob,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-meta-webhook-worker-v1",
      ),
      prefix: configuration.prefix,
      autorun: false as const,
      concurrency: 1 as const,
      maxStalledCount: 2 as const,
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
      throw new RailwayBullMqMetaWebhookQueueError("shutdown-failed");
    }
  }

  return Object.freeze({
    async start() {
      if (state === "running") {
        return;
      }
      if (state === "closing" || state === "closed") {
        throw new RailwayBullMqMetaWebhookQueueError("already-closed");
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
            "BullMQ Meta webhook worker startup timed out",
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
            // Startup is one bounded failure after cleanup is attempted.
          }
          state = "closed";
          throw new RailwayBullMqMetaWebhookQueueError("startup-failed");
        } finally {
          starting = null;
        }
      })();
      return starting;
    },
    async cleanExpiredDeadLetters() {
      if (state !== "running") {
        throw new RailwayBullMqMetaWebhookQueueError("not-started");
      }
      let removed: readonly string[];
      try {
        removed = await deadLetterQueue.clean(
          configuration.retention.deadLetterSeconds * 1_000,
          configuration.retention.deadLetterCleanBatchSize,
          "wait",
        );
      } catch {
        throw new RailwayBullMqMetaWebhookQueueError("maintenance-failed");
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
