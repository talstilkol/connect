import {
  Queue,
  Worker,
} from "bullmq";

import {
  QUEUE_BATCH_CAPACITY,
} from "../../shared/domain/queuePolicy.ts";
import {
  parseMessageTemplateSubmissionQueueMessage,
  type MessageTemplateSubmissionQueueMessage,
} from "../templates/messageTemplateSubmissionQueueMessage.ts";
import type {
  MessageTemplateSubmissionQueueBatch,
} from "../templates/messageTemplateSubmissionQueueConsumer.ts";
import type {
  MessageTemplateSubmissionQueuePublisher,
} from "../templates/messageTemplateSubmissionMaintenanceRunner.ts";
import {
  inspectRailwayBullMqConfiguration,
  type RailwayBullMqConfiguration,
  type RailwayBullMqEnvironment,
} from "./railwayBullMqConfiguration.ts";

export const railwayBullMqMessageTemplateSubmissionAdapterVersion =
  "railway-bullmq-message-template-submission-v1" as const;

export const railwayBullMqMessageTemplateSubmissionQueueName =
  "message-template-submission-v1" as const;

export const railwayBullMqMessageTemplateSubmissionDeadLetterQueueName =
  "message-template-submission-dlq-v1" as const;

const JOB_NAME = "submit-message-template-v1";
const DEAD_LETTER_JOB_NAME = "message-template-submission-dead-letter-v1";
const MAXIMUM_RETRIES = 10;
const MAXIMUM_DELIVERY_ATTEMPTS = MAXIMUM_RETRIES + 1;
const RETRY_DELAY_MILLISECONDS = 30_000;
const SOURCE_JOB_SIZE_LIMIT_BYTES = 4_096;
const DEAD_LETTER_JOB_SIZE_LIMIT_BYTES = 8_192;
const STACK_TRACE_LIMIT = 3;
const STARTUP_TIMEOUT_MILLISECONDS = 15_000;
const sourceJobIdPattern = /^[A-Za-z0-9_-]{1,100}$/;

export type RailwayBullMqMessageTemplateSubmissionQueueErrorCode =
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

export class RailwayBullMqMessageTemplateSubmissionQueueError
  extends Error {
  readonly code: RailwayBullMqMessageTemplateSubmissionQueueErrorCode;

  constructor(code: RailwayBullMqMessageTemplateSubmissionQueueErrorCode) {
    super(`Railway BullMQ template queue failed: ${code}`);
    this.name = "RailwayBullMqMessageTemplateSubmissionQueueError";
    this.code = code;
  }
}

export interface RailwayBullMqMessageTemplateSubmissionQueueTelemetry {
  readonly recordConnectionFailure: () => void;
  readonly recordWorkerFailure: () => void;
  readonly recordWorkerRuntimeFailure: () => void;
  readonly recordPublisherFailure: () => void;
  readonly recordDeadLetter: (
    reason: "invalid-envelope" | "retry-exhausted",
  ) => void;
  readonly recordDeadLetterCleanup: (count: number) => void;
}

interface MessageTemplateSubmissionQueueConsumer {
  readonly handle: (
    batch: MessageTemplateSubmissionQueueBatch,
  ) => Promise<unknown>;
}

interface RuntimeClock {
  readonly now: () => Date;
}

export interface RailwayBullMqMessageTemplateSubmissionQueueOptions {
  readonly environment?: RailwayBullMqEnvironment;
  readonly consumer: MessageTemplateSubmissionQueueConsumer;
  readonly telemetry: RailwayBullMqMessageTemplateSubmissionQueueTelemetry;
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

interface QueueInput {
  readonly name: string;
  readonly data: unknown;
  readonly opts?: QueueJobOptions;
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
  readonly addBulk: (jobs: readonly QueueInput[]) => Promise<void>;
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

export interface RailwayBullMqMessageTemplateSubmissionQueueDependencies {
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

export interface RailwayBullMqMessageTemplateSubmissionQueueRuntime {
  readonly publisher: MessageTemplateSubmissionQueuePublisher;
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
      async addBulk(jobs: readonly QueueInput[]) {
        await queue.addBulk([...jobs]);
      },
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
}) satisfies RailwayBullMqMessageTemplateSubmissionQueueDependencies;

const optionKeys = Object.freeze([
  "clock",
  "consumer",
  "environment",
  "telemetry",
]);

const telemetryKeys = Object.freeze([
  "recordConnectionFailure",
  "recordDeadLetter",
  "recordDeadLetterCleanup",
  "recordPublisherFailure",
  "recordWorkerFailure",
  "recordWorkerRuntimeFailure",
] as const);

const dependencyKeys = Object.freeze([
  "createQueue",
  "createWorker",
]);

function recordSafely(action: () => void): void {
  try {
    action();
  } catch {
    // Telemetry cannot control queue delivery or lifecycle.
  }
}

function requireOptions(
  options: Readonly<RailwayBullMqMessageTemplateSubmissionQueueOptions>,
  dependencies: Readonly<
    RailwayBullMqMessageTemplateSubmissionQueueDependencies
  >,
): RuntimeClock {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    typeof options.consumer?.handle !== "function" ||
    !options.telemetry || typeof options.telemetry !== "object" ||
    Object.keys(options.telemetry).sort().join(",") !==
      [...telemetryKeys].sort().join(",") ||
    telemetryKeys.some(
      (key) => typeof options.telemetry[key] !== "function",
    ) ||
    (options.clock !== undefined && typeof options.clock.now !== "function")
  ) {
    throw new RailwayBullMqMessageTemplateSubmissionQueueError(
      "options-invalid",
    );
  }

  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      [...dependencyKeys].sort().join(",") ||
    typeof dependencies.createQueue !== "function" ||
    typeof dependencies.createWorker !== "function"
  ) {
    throw new RailwayBullMqMessageTemplateSubmissionQueueError(
      "dependencies-invalid",
    );
  }

  return options.clock ?? defaultClock;
}

function requireConfiguration(
  environment?: RailwayBullMqEnvironment,
): Readonly<RailwayBullMqConfiguration> {
  const state = environment === undefined
    ? inspectRailwayBullMqConfiguration()
    : inspectRailwayBullMqConfiguration(environment);

  if (state.status !== "configured") {
    throw new RailwayBullMqMessageTemplateSubmissionQueueError(
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
    connectionName: "connect-template-submission-producer-v1",
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
): QueueJobOptions {
  return Object.freeze({
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
    throw new Error("BullMQ template job identity is invalid");
  }

  return Object.freeze({
    sourceJobId: job.id,
    sourceTimestamp: job.timestamp,
  });
}

function deliveryAttempt(job: WorkerJob): number {
  if (
    !Number.isSafeInteger(job.attemptsMade) ||
    job.attemptsMade < 0
  ) {
    throw new Error("BullMQ template job attempt is invalid");
  }

  return job.attemptsMade + 1;
}

function canonicalTimestamp(clock: RuntimeClock): string {
  const current = clock.now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new Error("BullMQ template queue clock is invalid");
  }

  return current.toISOString();
}

export function createRailwayBullMqMessageTemplateSubmissionQueueRuntime(
  options: Readonly<RailwayBullMqMessageTemplateSubmissionQueueOptions>,
  dependencies: Readonly<
    RailwayBullMqMessageTemplateSubmissionQueueDependencies
  > = defaultDependencies,
): Readonly<RailwayBullMqMessageTemplateSubmissionQueueRuntime> {
  const clock = requireOptions(options, dependencies);
  const configuration = requireConfiguration(options.environment);
  const mainQueue = dependencies.createQueue(
    railwayBullMqMessageTemplateSubmissionQueueName,
    Object.freeze({
      connection: producerConnection(configuration),
      prefix: configuration.prefix,
      defaultJobOptions: sourceJobOptions(configuration),
    }),
  );
  const deadLetterQueue = dependencies.createQueue(
    railwayBullMqMessageTemplateSubmissionDeadLetterQueueName,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-template-submission-dlq-v1",
      ),
      prefix: configuration.prefix,
    }),
  );
  mainQueue.onError(() => {
    recordSafely(options.telemetry.recordConnectionFailure);
  });
  deadLetterQueue.onError(() => {
    recordSafely(options.telemetry.recordConnectionFailure);
  });

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
          sourceQueue: railwayBullMqMessageTemplateSubmissionQueueName,
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
      throw new Error("BullMQ template dead-letter persistence failed");
    }
    recordSafely(() => options.telemetry.recordDeadLetter(reason));
  }

  async function processJob(job: WorkerJob): Promise<Readonly<{
    outcome: "acknowledged" | "dead-lettered";
  }>> {
    const attempt = deliveryAttempt(job);
    const message = parseMessageTemplateSubmissionQueueMessage(job.data);
    const identityMatches = message !== null &&
      job.name === JOB_NAME &&
      job.id === message.submissionKey;

    if (!identityMatches) {
      await moveToDeadLetter(job, "invalid-envelope", attempt);
      return Object.freeze({ outcome: "dead-lettered" });
    }

    const deliveryState: {
      action: "ack" | "retry" | null;
      requestedDelaySeconds: number | null;
    } = {
      action: null,
      requestedDelaySeconds: null,
    };
    const chooseAction = (next: "ack" | "retry"): void => {
      if (deliveryState.action !== null) {
        throw new Error("BullMQ template delivery action is not isolated");
      }
      deliveryState.action = next;
    };
    const delivery = Object.freeze({
      id: job.id,
      timestamp: new Date(job.timestamp),
      attempts: attempt,
      body: job.data,
      ack() {
        chooseAction("ack");
      },
      retry(retryOptions: Readonly<{ delaySeconds: number }>) {
        chooseAction("retry");
        if (
          !retryOptions ||
          !Number.isSafeInteger(retryOptions.delaySeconds) ||
          retryOptions.delaySeconds * 1_000 !== RETRY_DELAY_MILLISECONDS
        ) {
          throw new Error("BullMQ template retry delay is invalid");
        }
        deliveryState.requestedDelaySeconds = retryOptions.delaySeconds;
      },
    });

    try {
      await options.consumer.handle(Object.freeze({
        queue: railwayBullMqMessageTemplateSubmissionQueueName,
        messages: Object.freeze([delivery]),
      }));
    } catch {
      deliveryState.action = "retry";
      deliveryState.requestedDelaySeconds =
        RETRY_DELAY_MILLISECONDS / 1_000;
    }

    if (deliveryState.action === "ack") {
      return Object.freeze({ outcome: "acknowledged" });
    }

    if (
      deliveryState.action !== "retry" ||
      deliveryState.requestedDelaySeconds !==
        RETRY_DELAY_MILLISECONDS / 1_000
    ) {
      deliveryState.action = "retry";
    }

    if (attempt >= MAXIMUM_DELIVERY_ATTEMPTS) {
      await moveToDeadLetter(job, "retry-exhausted", attempt);
      return Object.freeze({ outcome: "dead-lettered" });
    }

    throw new Error("BullMQ template delivery requires retry");
  }

  const worker = dependencies.createWorker(
    railwayBullMqMessageTemplateSubmissionQueueName,
    processJob,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-template-submission-worker-v1",
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

  type RuntimeState =
    | "created"
    | "starting"
    | "running"
    | "closing"
    | "closed";
  let state: RuntimeState = "created";
  let starting: Promise<void> | null = null;
  let closing: Promise<void> | null = null;

  async function waitUntilReady(): Promise<void> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        reject(new Error("BullMQ template queue startup timed out"));
      }, STARTUP_TIMEOUT_MILLISECONDS);
    });

    try {
      await Promise.race([
        Promise.all([
          mainQueue.waitUntilReady(),
          deadLetterQueue.waitUntilReady(),
          worker.waitUntilReady(),
        ]),
        timeoutPromise,
      ]);
    } finally {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
    }
  }

  async function closeResources(): Promise<void> {
    const workerResult = await Promise.allSettled([
      worker.close(),
    ]);
    const queueResults = await Promise.allSettled([
      mainQueue.close(),
      deadLetterQueue.close(),
    ]);

    if (
      [...workerResult, ...queueResults].some(
        (result) => result.status === "rejected",
      )
    ) {
      throw new RailwayBullMqMessageTemplateSubmissionQueueError(
        "shutdown-failed",
      );
    }
  }

  async function closeRuntime(): Promise<void> {
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
  }

  const publisher: MessageTemplateSubmissionQueuePublisher = Object.freeze({
    async publish(
      messages: readonly Readonly<MessageTemplateSubmissionQueueMessage>[],
    ) {
      if (state !== "running") {
        throw new RailwayBullMqMessageTemplateSubmissionQueueError(
          "not-started",
        );
      }
      if (
        !Array.isArray(messages) ||
        messages.length > QUEUE_BATCH_CAPACITY
      ) {
        throw new RailwayBullMqMessageTemplateSubmissionQueueError(
          "message-invalid",
        );
      }

      const jobs: QueueInput[] = [];
      for (const message of messages) {
        const parsed = parseMessageTemplateSubmissionQueueMessage(message);
        if (parsed === null) {
          throw new RailwayBullMqMessageTemplateSubmissionQueueError(
            "message-invalid",
          );
        }
        jobs.push(Object.freeze({
          name: JOB_NAME,
          data: parsed,
          opts: Object.freeze({ jobId: parsed.submissionKey }),
        }));
      }

      if (jobs.length === 0) {
        return;
      }

      try {
        await mainQueue.addBulk(Object.freeze(jobs));
      } catch {
        recordSafely(options.telemetry.recordPublisherFailure);
        throw new RailwayBullMqMessageTemplateSubmissionQueueError(
          "publish-failed",
        );
      }
    },
  });

  return Object.freeze({
    publisher,
    async start() {
      if (state === "running") {
        return;
      }
      if (state === "closing" || state === "closed") {
        throw new RailwayBullMqMessageTemplateSubmissionQueueError(
          "already-closed",
        );
      }
      if (starting !== null) {
        return starting;
      }

      state = "starting";
      starting = (async () => {
        try {
          await waitUntilReady();
          state = "running";
          void worker.run().catch(() => {
            if (state === "running") {
              recordSafely(options.telemetry.recordWorkerRuntimeFailure);
            }
          });
        } catch {
          state = "closing";
          try {
            await closeResources();
          } catch {
            // Startup is reported as one bounded failure after cleanup.
          }
          state = "closed";
          throw new RailwayBullMqMessageTemplateSubmissionQueueError(
            "startup-failed",
          );
        } finally {
          starting = null;
        }
      })();

      return starting;
    },
    async cleanExpiredDeadLetters() {
      if (state !== "running") {
        throw new RailwayBullMqMessageTemplateSubmissionQueueError(
          "not-started",
        );
      }

      let removed: readonly string[];
      try {
        removed = await deadLetterQueue.clean(
          configuration.retention.deadLetterSeconds * 1_000,
          configuration.retention.deadLetterCleanBatchSize,
          "wait",
        );
      } catch {
        throw new RailwayBullMqMessageTemplateSubmissionQueueError(
          "maintenance-failed",
        );
      }
      recordSafely(
        () => options.telemetry.recordDeadLetterCleanup(removed.length),
      );
      return removed.length;
    },
    close: closeRuntime,
  });
}
