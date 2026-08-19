import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName = "connect_startup_rehearsal";
const databaseEnvironmentKey = "CONNECT_POSTGRES_STARTUP_REHEARSAL_URL";
const portEnvironmentKey = "CONNECT_RAILWAY_API_REHEARSAL_PORT";
const maximumCapturedOutputBytes = 4_096;

function fail(code) {
  throw new Error(`RAILWAY_API_STARTUP_REHEARSAL_${code}`);
}

export function requireLocalStartupRehearsalUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    fail("URL_INVALID");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("URL_INVALID");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== `/${databaseName}` ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    fail("URL_INVALID");
  }
  const port = Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail("URL_INVALID");
  }
  return url.toString();
}

export function requireStartupRehearsalPort(value, databaseUrl) {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,4}$/.test(value)) {
    fail("PORT_INVALID");
  }
  const port = Number(value);
  const databasePort = Number(new URL(databaseUrl).port);
  if (
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    port === databasePort
  ) {
    fail("PORT_INVALID");
  }
  return port;
}

async function applyPostgresMigrations(pool) {
  const existing = await pool.query(
    `SELECT count(*)::integer AS count
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'`,
  );
  if (existing.rows[0]?.count !== 0) {
    fail("DATABASE_NOT_EMPTY");
  }

  const directory = join(projectRoot, "postgres", "migrations");
  const files = (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  for (const fileName of files) {
    await pool.query(await readFile(join(directory, fileName), "utf8"));
  }
  return files.length;
}

function childEnvironment(databaseUrl, port) {
  return {
    APP_PUBLIC_ORIGIN: "http://127.0.0.1:3000",
    APP_RUNTIME_ENVIRONMENT: "test",
    CLERK_SECRET_KEY: "startup-rehearsal-clerk-key",
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      "startup-rehearsal-clerk-publishable-key",
    NODE_ENV: "development",
    PORT: String(port),
    POSTGRES_APPLICATION_NAME: "connect-startup-rehearsal",
    POSTGRES_CONNECTION_TIMEOUT_MS: "2000",
    POSTGRES_IDLE_TIMEOUT_MS: "2000",
    POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS: "10000",
    POSTGRES_LOCK_TIMEOUT_MS: "3000",
    POSTGRES_MAX_CONNECTIONS: "2",
    POSTGRES_MAX_LIFETIME_SECONDS: "1800",
    POSTGRES_QUERY_TIMEOUT_MS: "20000",
    POSTGRES_STATEMENT_TIMEOUT_MS: "15000",
    POSTGRES_TLS_MODE: "disabled",
    TENANT_MUTATION_RATE_LIMIT_CAPACITY: "2",
    TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION: "1",
    TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS: "60",
    VERCEL_OIDC_ENVIRONMENT: "development",
    VERCEL_OIDC_PROJECT_NAME: "connect-web",
    VERCEL_OIDC_TEAM_SLUG: "connect-team",
  };
}

function captureBounded(stream) {
  let captured = Buffer.alloc(0);
  stream?.on("data", (chunk) => {
    if (captured.byteLength >= maximumCapturedOutputBytes) {
      return;
    }
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    captured = Buffer.concat(
      [captured, bytes.subarray(
        0,
        maximumCapturedOutputBytes - captured.byteLength,
      )],
    );
  });
  return () => captured.toString("utf8");
}

async function waitForHealth(port, childState) {
  const expected = [
    ["/health/live", 200, { status: "live" }],
    ["/health/ready", 200, { status: "ready" }],
  ];
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (childState.exited) {
      fail("PROCESS_EXITED_EARLY");
    }
    try {
      const results = await Promise.all(
        expected.map(async ([path, status, body]) => {
          const response = await fetch(
            `http://127.0.0.1:${port}${path}`,
            { signal: AbortSignal.timeout(500) },
          );
          return response.status === status &&
            JSON.stringify(await response.json()) === JSON.stringify(body);
        }),
      );
      if (results.every(Boolean)) {
        return;
      }
    } catch {
      // The bounded startup window continues until health is available.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  fail("HEALTH_TIMEOUT");
}

async function waitForExit(child, childState) {
  if (childState.exited) {
    return childState.exit;
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("RAILWAY_API_STARTUP_REHEARSAL_SHUTDOWN_TIMEOUT"));
    }, 5_000);
    const onExit = (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    };
    child.once("exit", onExit);
    if (childState.exited) {
      child.off("exit", onExit);
      clearTimeout(timeout);
      resolve(childState.exit);
    }
  });
}

export async function verifyRailwayApiStartup({
  connectionString,
  apiPort,
}) {
  const checkedUrl = requireLocalStartupRehearsalUrl(connectionString);
  const checkedPort = requireStartupRehearsalPort(apiPort, checkedUrl);
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: checkedUrl,
    max: 1,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 2_000,
  });
  let child = null;
  let poolClosed = false;
  const childState = { exited: false, exit: null };

  try {
    const identity = await pool.query(
      `SELECT current_database() AS database,
              current_setting('server_version') AS version`,
    );
    assert.equal(identity.rows[0]?.database, databaseName);
    assert.match(identity.rows[0]?.version, /^16\./);
    const migrationCount = await applyPostgresMigrations(pool);
    await pool.end();
    poolClosed = true;

    child = spawn(
      process.execPath,
      [join(projectRoot, "scripts", "start-railway-api.mjs")],
      {
        cwd: projectRoot,
        env: childEnvironment(checkedUrl, checkedPort),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const readStdout = captureBounded(child.stdout);
    const readStderr = captureBounded(child.stderr);
    child.once("exit", (code, signal) => {
      childState.exited = true;
      childState.exit = { code, signal };
    });

    await waitForHealth(checkedPort, childState);
    assert.equal(child.kill("SIGTERM"), true);
    const exit = await waitForExit(child, childState);
    assert.deepEqual(exit, { code: 0, signal: null });
    assert.equal(readStdout(), "");
    assert.equal(readStderr(), "");

    return Object.freeze({
      status: "passed",
      postgresMigrationCount: migrationCount,
      liveness: "passed",
      readiness: "passed",
      gracefulShutdown: "passed",
    });
  } finally {
    if (!poolClosed) {
      await pool.end().catch(() => {});
    }
    if (child && !childState.exited) {
      child.kill("SIGKILL");
      await waitForExit(child, childState).catch(() => {});
    }
  }
}

async function main() {
  const result = await verifyRailwayApiStartup({
    connectionString: process.env[databaseEnvironmentKey],
    apiPort: process.env[portEnvironmentKey],
  });
  process.stdout.write(
    `Railway API startup rehearsal: PASS (${result.postgresMigrationCount} PostgreSQL migrations, liveness, readiness, SIGTERM shutdown)\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
