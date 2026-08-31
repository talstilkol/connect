import {
  spawn,
} from "node:child_process";
import {
  createHash,
} from "node:crypto";
import {
  mkdir,
  rm,
} from "node:fs/promises";
import {
  createServer,
} from "node:net";

import {
  Queue,
  Worker,
} from "bullmq";
import Redis from "ioredis";

const redisPort = 56_379;
const redisHost = "127.0.0.1";
const rehearsalDirectory =
  `/private/tmp/connect-redis-resilience-${process.pid}`;
const queuePrefix = "connect-resilience-rehearsal-v1";
const durabilityQueueName = "redis-durability-rehearsal-v1";
const loadQueueName = "redis-load-rehearsal-v1";
const loadJobCount = 500;
const maximumWaitMilliseconds = 20_000;

class RedisResilienceRehearsalError extends Error {
  constructor(code) {
    super(code);
    this.name = "RedisResilienceRehearsalError";
    this.code = code;
  }
}

function fail(code) {
  throw new RedisResilienceRehearsalError(code);
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function withTimeout(promise, code) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          reject(new RedisResilienceRehearsalError(code));
        }, maximumWaitMilliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function requireUnusedLoopbackPort() {
  const server = createServer();
  server.unref();

  await new Promise((resolve, reject) => {
    server.once("error", () => reject(
      new RedisResilienceRehearsalError("PORT_UNAVAILABLE"),
    ));
    server.listen(redisPort, redisHost, resolve);
  });

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(new RedisResilienceRehearsalError("PORT_UNAVAILABLE"));
        return;
      }
      resolve();
    });
  });
}

function redisArguments() {
  return [
    "--bind", redisHost,
    "--port", String(redisPort),
    "--dir", rehearsalDirectory,
    "--appendonly", "yes",
    "--appendfsync", "everysec",
    "--maxmemory-policy", "noeviction",
    "--save", "",
    "--protected-mode", "yes",
    "--daemonize", "no",
    "--loglevel", "warning",
  ];
}

function createAdminClient() {
  const client = new Redis({
    host: redisHost,
    port: redisPort,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 500,
    retryStrategy: null,
  });
  client.on("error", () => {
    // The bounded rehearsal result reports connectivity without raw errors.
  });
  return client;
}

async function waitForRedisReady(processHandle) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (processHandle.exitCode !== null) {
      fail("REDIS_STARTUP_FAILED");
    }

    const client = createAdminClient();
    let ready = false;
    try {
      await client.connect();
      if (await client.ping() === "PONG") {
        ready = true;
        return client;
      }
    } catch {
      // Redis may still be replaying AOF; retry on a fixed local cadence.
    } finally {
      if (!ready && client.status !== "end") {
        client.disconnect();
      }
    }
    await wait(50);
  }

  fail("REDIS_STARTUP_TIMEOUT");
}

async function startRedis() {
  const processHandle = spawn("redis-server", redisArguments(), {
    stdio: "ignore",
  });
  processHandle.once("error", () => {
    // waitForRedisReady observes the terminal child state without raw errors.
  });
  const client = await waitForRedisReady(processHandle);
  return { processHandle, client };
}

async function stopRedis(processHandle, signal) {
  if (!processHandle || processHandle.exitCode !== null) {
    return;
  }

  const exited = new Promise((resolve) => {
    processHandle.once("exit", resolve);
  });
  processHandle.kill(signal);
  await withTimeout(exited, "REDIS_SHUTDOWN_TIMEOUT");
}

function parseConfigPair(value, expectedKey) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value[0] !== expectedKey ||
    typeof value[1] !== "string"
  ) {
    fail("REDIS_CONFIGURATION_INVALID");
  }
  return value[1];
}

function parseInfo(value) {
  if (typeof value !== "string" || value.length > 100_000) {
    fail("REDIS_PERSISTENCE_INVALID");
  }

  return Object.fromEntries(
    value.split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf(":");
        return separator > 0
          ? [line.slice(0, separator), line.slice(separator + 1)]
          : ["", ""];
      })
      .filter(([key]) => key.length > 0),
  );
}

async function verifyRedisDurabilityConfiguration(client) {
  const [appendOnly, appendFsync, maxmemoryPolicy, serverInfo, persistenceInfo] =
    await Promise.all([
      client.config("GET", "appendonly"),
      client.config("GET", "appendfsync"),
      client.config("GET", "maxmemory-policy"),
      client.info("server"),
      client.info("persistence"),
    ]);
  const server = parseInfo(serverInfo);
  const persistence = parseInfo(persistenceInfo);

  if (
    parseConfigPair(appendOnly, "appendonly") !== "yes" ||
    parseConfigPair(appendFsync, "appendfsync") !== "everysec" ||
    parseConfigPair(maxmemoryPolicy, "maxmemory-policy") !== "noeviction" ||
    persistence.aof_enabled !== "1" ||
    persistence.aof_last_write_status !== "ok" ||
    persistence.aof_last_bgrewrite_status !== "ok" ||
    typeof server.redis_version !== "string" ||
    !/^(?:[1-9][0-9]{0,2})\.(?:0|[1-9][0-9]{0,2})\.(?:0|[1-9][0-9]{0,2})$/.test(
      server.redis_version,
    )
  ) {
    fail("REDIS_DURABILITY_POLICY_REJECTED");
  }

  return server.redis_version;
}

const producerConnection = Object.freeze({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 500,
});

const workerConnection = Object.freeze({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  connectTimeout: 500,
});

async function queueDurableJob() {
  const queue = new Queue(durabilityQueueName, {
    connection: producerConnection,
    prefix: queuePrefix,
  });
  queue.on("error", () => {});
  const jobId = `durability_${createHash("sha256")
    .update("connect-redis-durability-rehearsal-v1")
    .digest("hex")}`;

  try {
    await queue.waitUntilReady();
    await queue.add(
      "persist-before-outage-v1",
      { version: 1, purpose: "redis-durability-rehearsal" },
      {
        jobId,
        delay: 5_000,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  } finally {
    await queue.close();
  }

  return jobId;
}

async function verifyPublisherFailsDuringOutage() {
  const queue = new Queue(durabilityQueueName, {
    connection: producerConnection,
    prefix: queuePrefix,
  });
  queue.on("error", () => {});
  let rejected = false;

  try {
    await withTimeout(
      queue.add(
        "must-fail-during-outage-v1",
        { version: 1 },
        { jobId: "outage_publish_must_fail_v1" },
      ),
      "OUTAGE_PUBLISH_TIMEOUT",
    );
  } catch {
    rejected = true;
  } finally {
    await queue.close().catch(() => {});
  }

  if (!rejected) {
    fail("OUTAGE_PUBLISH_DID_NOT_FAIL");
  }
}

async function recoverDurableJob(expectedJobId) {
  let resolveDelivery;
  const delivered = new Promise((resolve) => {
    resolveDelivery = resolve;
  });
  const worker = new Worker(
    durabilityQueueName,
    async (job) => {
      if (
        job.id !== expectedJobId ||
        job.data?.version !== 1 ||
        job.data?.purpose !== "redis-durability-rehearsal"
      ) {
        fail("RECOVERED_JOB_INVALID");
      }
      resolveDelivery();
    },
    {
      connection: workerConnection,
      prefix: queuePrefix,
      concurrency: 1,
    },
  );
  worker.on("error", () => {});

  try {
    await worker.waitUntilReady();
    await withTimeout(delivered, "QUEUED_WORK_RECOVERY_TIMEOUT");
  } finally {
    await worker.close();
  }
}

async function runLosslessLoadRehearsal() {
  let completed = 0;
  let failed = false;
  let resolveAll;
  const allCompleted = new Promise((resolve) => {
    resolveAll = resolve;
  });
  const worker = new Worker(
    loadQueueName,
    async (job) => {
      if (
        !Number.isSafeInteger(job.data?.ordinal) ||
        job.data.ordinal < 0 ||
        job.data.ordinal >= loadJobCount
      ) {
        fail("LOAD_JOB_INVALID");
      }
    },
    {
      connection: workerConnection,
      prefix: queuePrefix,
      concurrency: 8,
    },
  );
  const queue = new Queue(loadQueueName, {
    connection: producerConnection,
    prefix: queuePrefix,
  });
  worker.on("error", () => {});
  worker.on("completed", () => {
    completed += 1;
    if (completed === loadJobCount) {
      resolveAll();
    }
  });
  worker.on("failed", () => {
    failed = true;
    resolveAll();
  });
  queue.on("error", () => {});
  const startedAt = Date.now();

  try {
    await Promise.all([worker.waitUntilReady(), queue.waitUntilReady()]);
    await queue.addBulk(Array.from({ length: loadJobCount }, (_, ordinal) => ({
      name: "lossless-load-v1",
      data: { ordinal },
      opts: {
        jobId: `load_${String(ordinal).padStart(6, "0")}`,
        removeOnComplete: false,
        removeOnFail: false,
      },
    })));
    await withTimeout(allCompleted, "LOAD_REHEARSAL_TIMEOUT");
    const counts = await queue.getJobCounts(
      "completed",
      "failed",
      "waiting",
      "active",
      "delayed",
    );
    if (
      failed ||
      completed !== loadJobCount ||
      counts.completed !== loadJobCount ||
      counts.failed !== 0 ||
      counts.waiting !== 0 ||
      counts.active !== 0 ||
      counts.delayed !== 0
    ) {
      fail("LOAD_REHEARSAL_INCOMPLETE");
    }
  } finally {
    await Promise.allSettled([worker.close(), queue.close()]);
  }

  return Math.max(1, Date.now() - startedAt);
}

async function cleanupQueues() {
  for (const queueName of [durabilityQueueName, loadQueueName]) {
    const queue = new Queue(queueName, {
      connection: producerConnection,
      prefix: queuePrefix,
    });
    queue.on("error", () => {});
    try {
      await queue.obliterate({ force: true });
    } finally {
      await queue.close();
    }
  }
}

async function run() {
  let redisProcess = null;
  let adminClient = null;

  try {
    await requireUnusedLoopbackPort();
    await mkdir(rehearsalDirectory, { recursive: false, mode: 0o700 });
    ({ processHandle: redisProcess, client: adminClient } = await startRedis());
    const redisVersion = await verifyRedisDurabilityConfiguration(adminClient);
    const durableJobId = await queueDurableJob();

    await wait(1_500);
    adminClient.disconnect();
    adminClient = null;
    await stopRedis(redisProcess, "SIGKILL");
    redisProcess = null;

    await verifyPublisherFailsDuringOutage();

    ({ processHandle: redisProcess, client: adminClient } = await startRedis());
    const restartedVersion = await verifyRedisDurabilityConfiguration(adminClient);
    if (restartedVersion !== redisVersion) {
      fail("REDIS_VERSION_CHANGED");
    }

    await recoverDurableJob(durableJobId);
    const loadDurationMilliseconds = await runLosslessLoadRehearsal();
    await verifyRedisDurabilityConfiguration(adminClient);
    await cleanupQueues();

    process.stdout.write(
      `Redis resilience rehearsal: PASS (Redis ${redisVersion}, ` +
      `${loadJobCount}/${loadJobCount} jobs, ` +
      `${loadDurationMilliseconds}ms, AOF everysec, noeviction)\n`,
    );
  } finally {
    if (adminClient && adminClient.status !== "end") {
      adminClient.disconnect();
    }
    await stopRedis(redisProcess, "SIGTERM").catch(() => {});
    await rm(rehearsalDirectory, { recursive: true, force: true });
  }
}

try {
  await run();
} catch (error) {
  const code = error instanceof RedisResilienceRehearsalError
    ? error.code
    : "UNEXPECTED_FAILURE";
  process.stderr.write(`Redis resilience rehearsal: FAIL (${code})\n`);
  process.exitCode = 1;
}
