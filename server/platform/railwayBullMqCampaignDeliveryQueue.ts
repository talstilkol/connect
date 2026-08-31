import {
  Queue,
  Worker,
} from "bullmq";

import {
  QUEUE_BATCH_CAPACITY,
} from "../../shared/domain/queuePolicy.ts";
import type {
  CampaignDeliveryQueueBinding,
} from "../campaigns/campaignScheduler.ts";
import {
  parseCampaignDeliveryQueueMessage,
  type CampaignDeliveryQueueMessage,
} from "../campaigns/campaignDeliveryQueueMessage.ts";
import type {
  CampaignDeliveryQueueBatch,
} from "../campaigns/campaignDeliveryQueueConsumer.ts";
import {
  inspectRailwayBullMqConfiguration,
  type RailwayBullMqConfiguration,
  type RailwayBullMqEnvironment,
} from "./railwayBullMqConfiguration.ts";

export const railwayBullMqCampaignDeliveryAdapterVersion =
  "railway-bullmq-campaign-delivery-v1" as const;

export const railwayBullMqCampaignDeliveryQueueName =
  "campaign-delivery-v1" as const;

export const railwayBullMqCampaignDeliveryDeadLetterQueueName =
  "campaign-delivery-dlq-v1" as const;

const JOB_NAME = "deliver-campaign-message-v1";
const DEAD_LETTER_JOB_NAME = "campaign-delivery-dead-letter-v1";
const DYNAMIC_BACKOFF_TYPE = "campaign-delivery-bounded-v1";
const MAXIMUM_RETRIES = 10;
const MAXIMUM_DELIVERY_ATTEMPTS = MAXIMUM_RETRIES + 1;
const FALLBACK_RETRY_DELAY_SECONDS = 30;
const MAXIMUM_RETRY_DELAY_SECONDS = 24 * 60 * 60;
const SOURCE_JOB_SIZE_LIMIT_BYTES = 4_096;
const DEAD_LETTER_JOB_SIZE_LIMIT_BYTES = 8_192;
const STACK_TRACE_LIMIT = 3;
const STARTUP_TIMEOUT_MILLISECONDS = 15_000;
const deliveryKeyPattern =
  /^campaign_delivery_v1_[0-9a-f]{64}$/;

export type RailwayBullMqCampaignDeliveryQueueErrorCode =
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

export class RailwayBullMqCampaignDeliveryQueueError extends Error {
  readonly code: RailwayBullMqCampaignDeliveryQueueErrorCode;

  constructor(code: RailwayBullMqCampaignDeliveryQueueErrorCode) {
    super(`Railway BullMQ campaign queue failed: ${code}`);
    this.name = "RailwayBullMqCampaignDeliveryQueueError";
    this.code = code;
  }
}

class CampaignDeliveryRetryError extends Error {
  readonly delayMilliseconds: number;

  constructor(delaySeconds: number) {
    super("BullMQ campaign delivery requires retry");
    this.name = "CampaignDeliveryRetryError";
    this.delayMilliseconds = delaySeconds * 1_000;
  }
}

export interface RailwayBullMqCampaignDeliveryQueueTelemetry {
  readonly recordConnectionFailure: () => void;
  readonly recordWorkerFailure: () => void;
  readonly recordWorkerRuntimeFailure: () => void;
  readonly recordPublisherFailure: () => void;
  readonly recordDeadLetter: (
    reason: "invalid-envelope" | "retry-exhausted",
  ) => void;
  readonly recordDeadLetterCleanup: (count: number) => void;
}

interface CampaignDeliveryQueueConsumer {
  readonly handle: (
    batch: CampaignDeliveryQueueBatch,
  ) => Promise<unknown>;
}

interface RuntimeClock {
  readonly now: () => Date;
}

export interface RailwayBullMqCampaignDeliveryQueueOptions {
  readonly environment?: RailwayBullMqEnvironment;
  readonly consumer: CampaignDeliveryQueueConsumer;
  readonly telemetry: RailwayBullMqCampaignDeliveryQueueTelemetry;
  readonly clock?: RuntimeClock;
}

interface QueueJobOptions {
  readonly jobId?: string;
  readonly attempts?: number;
  readonly backoff?: Readonly<{
    type: typeof DYNAMIC_BACKOFF_TYPE;
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
  readonly settings: Readonly<{
    backoffStrategy: (
      attemptsMade: number,
      type?: string,
      error?: Error,
    ) => number;
  }>;
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

export interface RailwayBullMqCampaignDeliveryQueueDependencies {
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

export interface RailwayBullMqCampaignDeliveryQueueRuntime {
  readonly queue: CampaignDeliveryQueueBinding;
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
}) satisfies RailwayBullMqCampaignDeliveryQueueDependencies;

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
  options: Readonly<RailwayBullMqCampaignDeliveryQueueOptions>,
  dependencies: Readonly<
    RailwayBullMqCampaignDeliveryQueueDependencies
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
    throw new RailwayBullMqCampaignDeliveryQueueError(
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
    throw new RailwayBullMqCampaignDeliveryQueueError(
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
    throw new RailwayBullMqCampaignDeliveryQueueError(
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
    connectionName: "connect-campaign-delivery-producer-v1",
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
      type: DYNAMIC_BACKOFF_TYPE,
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
    !deliveryKeyPattern.test(job.id) ||
    !Number.isSafeInteger(job.timestamp) ||
    job.timestamp <= 0
  ) {
    throw new Error("BullMQ campaign job identity is invalid");
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
    throw new Error("BullMQ campaign job attempt is invalid");
  }

  return job.attemptsMade + 1;
}

function canonicalTimestamp(clock: RuntimeClock): string {
  const current = clock.now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new Error("BullMQ campaign queue clock is invalid");
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
    !(error instanceof CampaignDeliveryRetryError) ||
    !Number.isSafeInteger(error.delayMilliseconds) ||
    error.delayMilliseconds < 1_000 ||
    error.delayMilliseconds > MAXIMUM_RETRY_DELAY_SECONDS * 1_000
  ) {
    return -1;
  }

  return error.delayMilliseconds;
}

function parseQueueEntry(value: unknown): CampaignDeliveryQueueMessage | null {
  if (
    !value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "body,contentType" ||
    !("contentType" in value) || value.contentType !== "json" ||
    !("body" in value)
  ) {
    return null;
  }

  return parseCampaignDeliveryQueueMessage(value.body);
}

export function createRailwayBullMqCampaignDeliveryQueueRuntime(
  options: Readonly<RailwayBullMqCampaignDeliveryQueueOptions>,
  dependencies: Readonly<
    RailwayBullMqCampaignDeliveryQueueDependencies
  > = defaultDependencies,
): Readonly<RailwayBullMqCampaignDeliveryQueueRuntime> {
  const clock = requireOptions(options, dependencies);
  const configuration = requireConfiguration(options.environment);
  const mainQueue = dependencies.createQueue(
    railwayBullMqCampaignDeliveryQueueName,
    Object.freeze({
      connection: producerConnection(configuration),
      prefix: configuration.prefix,
      defaultJobOptions: sourceJobOptions(configuration),
    }),
  );
  const deadLetterQueue = dependencies.createQueue(
    railwayBullMqCampaignDeliveryDeadLetterQueueName,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-campaign-delivery-dlq-v1",
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
          sourceQueue: railwayBullMqCampaignDeliveryQueueName,
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
      throw new Error("BullMQ campaign dead-letter persistence failed");
    }
    recordSafely(() => options.telemetry.recordDeadLetter(reason));
  }

  async function processJob(job: WorkerJob): Promise<Readonly<{
    outcome: "acknowledged" | "dead-lettered";
  }>> {
    const attempt = deliveryAttempt(job);
    const message = parseCampaignDeliveryQueueMessage(job.data);
    const identityMatches = message !== null &&
      job.name === JOB_NAME &&
      job.id === message.deliveryKey;

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
        throw new Error("BullMQ campaign delivery action is not isolated");
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
          !retryDelayIsValid(retryOptions.delaySeconds)
        ) {
          throw new Error("BullMQ campaign retry delay is invalid");
        }
        deliveryState.requestedDelaySeconds = retryOptions.delaySeconds;
      },
    });

    try {
      await options.consumer.handle(Object.freeze({
        queue: railwayBullMqCampaignDeliveryQueueName,
        messages: Object.freeze([delivery]),
      }));
    } catch {
      deliveryState.action = "retry";
      deliveryState.requestedDelaySeconds =
        FALLBACK_RETRY_DELAY_SECONDS;
    }

    if (deliveryState.action === "ack") {
      return Object.freeze({ outcome: "acknowledged" });
    }

    const retryDelaySeconds =
      deliveryState.action === "retry" &&
        deliveryState.requestedDelaySeconds !== null &&
        retryDelayIsValid(deliveryState.requestedDelaySeconds)
        ? deliveryState.requestedDelaySeconds
        : FALLBACK_RETRY_DELAY_SECONDS;

    if (attempt >= MAXIMUM_DELIVERY_ATTEMPTS) {
      await moveToDeadLetter(job, "retry-exhausted", attempt);
      return Object.freeze({ outcome: "dead-lettered" });
    }

    throw new CampaignDeliveryRetryError(retryDelaySeconds);
  }

  const worker = dependencies.createWorker(
    railwayBullMqCampaignDeliveryQueueName,
    processJob,
    Object.freeze({
      connection: backgroundConnection(
        configuration,
        "connect-campaign-delivery-worker-v1",
      ),
      prefix: configuration.prefix,
      autorun: false as const,
      concurrency: 1 as const,
      maxStalledCount: 2 as const,
      settings: Object.freeze({
        backoffStrategy: dynamicBackoffStrategy,
      }),
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
        reject(new Error("BullMQ campaign queue startup timed out"));
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
    const workerResults = await Promise.allSettled([
      worker.close(),
    ]);
    const queueResults = await Promise.allSettled([
      mainQueue.close(),
      deadLetterQueue.close(),
    ]);

    if (
      [...workerResults, ...queueResults].some(
        (result) => result.status === "rejected",
      )
    ) {
      throw new RailwayBullMqCampaignDeliveryQueueError(
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

  const queue: CampaignDeliveryQueueBinding = Object.freeze({
    async sendBatch(
      messages: readonly {
        body: CampaignDeliveryQueueMessage;
        contentType: "json";
      }[],
    ) {
      if (state !== "running") {
        throw new RailwayBullMqCampaignDeliveryQueueError(
          "not-started",
        );
      }
      if (
        !Array.isArray(messages) ||
        messages.length > QUEUE_BATCH_CAPACITY
      ) {
        throw new RailwayBullMqCampaignDeliveryQueueError(
          "message-invalid",
        );
      }

      const jobs: QueueInput[] = [];
      for (const entry of messages) {
        const message = parseQueueEntry(entry);
        if (message === null) {
          throw new RailwayBullMqCampaignDeliveryQueueError(
            "message-invalid",
          );
        }
        jobs.push(Object.freeze({
          name: JOB_NAME,
          data: message,
          opts: Object.freeze({ jobId: message.deliveryKey }),
        }));
      }

      if (jobs.length === 0) {
        return;
      }

      try {
        await mainQueue.addBulk(Object.freeze(jobs));
      } catch {
        recordSafely(options.telemetry.recordPublisherFailure);
        throw new RailwayBullMqCampaignDeliveryQueueError(
          "publish-failed",
        );
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
        throw new RailwayBullMqCampaignDeliveryQueueError(
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
          throw new RailwayBullMqCampaignDeliveryQueueError(
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
        throw new RailwayBullMqCampaignDeliveryQueueError(
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
        throw new RailwayBullMqCampaignDeliveryQueueError(
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
