import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION,
  POSTGRES_FULL_DATA_MIGRATION_CUTOVER_VERSION,
  PostgresFullDataMigrationCutoverError,
  createPostgresFullDataMigrationCutoverPreflight,
  executePostgresFullDataMigrationCutover,
} from "../server/platform/postgresFullDataMigrationCutover.ts";
import {
  readD1FullDataMigrationSnapshot,
} from "../scripts/read-d1-full-data-migration-snapshot.mjs";
import {
  PostgresFullDataMigrationCutoverRunnerError,
  runPostgresFullDataMigrationCutover,
} from "../scripts/run-postgres-full-data-migration-cutover.mjs";

const evidenceHmacKey = Buffer.alloc(32, 31).toString("base64");
const startedAt = "2026-08-20T16:00:00.000Z";

function applyCurrentD1Schema(database) {
  database.exec("PRAGMA foreign_keys = ON");
  for (const fileName of readdirSync("drizzle")
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort()) {
    database.exec(
      readFileSync(`drizzle/${fileName}`, "utf8")
        .replaceAll("--> statement-breakpoint", ""),
    );
  }
}

function emptyFullSnapshot() {
  const database = new DatabaseSync(":memory:");
  try {
    applyCurrentD1Schema(database);
    return readD1FullDataMigrationSnapshot(database);
  } finally {
    database.close();
  }
}

test("builds a bounded ten-minute cutover preflight without payload", () => {
  const snapshot = emptyFullSnapshot();
  const preflight = createPostgresFullDataMigrationCutoverPreflight({
    snapshots: snapshot.slices,
    startedAt,
    evidenceHmacKey,
  });

  assert.equal(preflight.version, POSTGRES_FULL_DATA_MIGRATION_CUTOVER_VERSION);
  assert.equal(preflight.createdAt, startedAt);
  assert.equal(preflight.expiresAt, "2026-08-20T16:10:00.000Z");
  assert.equal(preflight.sliceCount, 10);
  assert.equal(preflight.tableCount, 51);
  assert.equal(preflight.totalRowCount, 0);
  assert.equal(preflight.slices.length, 10);
  assert.match(preflight.sourceDigest, /^hmac_sha256_v1_[a-f0-9]{64}$/);
  const serialized = JSON.stringify(preflight);
  assert.equal(serialized.includes("payload"), false);
  assert.equal(serialized.includes("tables"), false);
  assert.equal(serialized.includes(evidenceHmacKey), false);
});

test("rejects environment, confirmation, digest, and extended input before target access", async () => {
  const snapshot = emptyFullSnapshot();
  const preflight = createPostgresFullDataMigrationCutoverPreflight({
    snapshots: snapshot.slices,
    startedAt,
    evidenceHmacKey,
  });
  let transactionCount = 0;
  const transactions = {
    async transaction() {
      transactionCount += 1;
      throw new Error("target must not be reached");
    },
  };
  const valid = {
    snapshots: snapshot.slices,
    startedAt,
    evidenceHmacKey,
    approvedSourceDigest: preflight.sourceDigest,
    confirmation: POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION,
    targetEnvironment: "staging",
    transactions,
  };
  const cases = [
    [{ ...valid, targetEnvironment: "test" }, "target-environment-invalid"],
    [{ ...valid, confirmation: "approve" }, "approval-required"],
    [{
      ...valid,
      approvedSourceDigest: `hmac_sha256_v1_${"0".repeat(64)}`,
    }, "approval-mismatch"],
    [{ ...valid, evidenceHmacKey: "not-a-key" }, "evidence-key-invalid"],
    [{ ...valid, browserApproved: true }, "input-invalid"],
  ];

  for (const [input, code] of cases) {
    await assert.rejects(
      executePostgresFullDataMigrationCutover(input),
      (error) => error instanceof PostgresFullDataMigrationCutoverError &&
        error.code === code,
    );
  }
  assert.equal(transactionCount, 0);
});

test("runs a source-only CLI preflight without exposing path, key, or rows", () => {
  const root = join(tmpdir(), `connect-cutover-preflight-${process.pid}`);
  const sourcePath = join(root, "authorized-export.sqlite");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  try {
    const database = new DatabaseSync(sourcePath);
    applyCurrentD1Schema(database);
    database.close();
    chmodSync(sourcePath, 0o600);

    const result = spawnSync(
      process.execPath,
      ["scripts/run-postgres-full-data-migration-cutover.mjs"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          CONNECT_POSTGRES_FULL_MIGRATION_COMMAND: "preflight",
          CONNECT_D1_FULL_MIGRATION_SOURCE_PATH: sourcePath,
          CONNECT_POSTGRES_FULL_MIGRATION_HMAC_KEY: evidenceHmacKey,
        },
      },
    );
    assert.equal(result.status, 0);
    assert.equal(result.signal, null);
    assert.equal(result.stderr, "");
    const report = JSON.parse(result.stdout);
    assert.equal(report.sliceCount, 10);
    assert.equal(report.tableCount, 51);
    assert.equal(report.totalRowCount, 0);
    assert.equal(result.stdout.includes(sourcePath), false);
    assert.equal(result.stdout.includes(evidenceHmacKey), false);
    assert.equal(result.stdout.includes("payload"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects target configuration and approval before reading the source", async () => {
  const missingSource = join(tmpdir(), "connect-cutover-missing.sqlite");
  const productionEnvironment = {
    CONNECT_POSTGRES_FULL_MIGRATION_COMMAND: "execute",
    CONNECT_D1_FULL_MIGRATION_SOURCE_PATH: missingSource,
    CONNECT_POSTGRES_FULL_MIGRATION_HMAC_KEY: evidenceHmacKey,
    CONNECT_POSTGRES_FULL_MIGRATION_APPROVED_SOURCE_DIGEST:
      `hmac_sha256_v1_${"1".repeat(64)}`,
    CONNECT_POSTGRES_FULL_MIGRATION_CONFIRMATION:
      POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION,
    APP_RUNTIME_ENVIRONMENT: "production",
    DATABASE_URL:
      "postgresql://connect:credential@postgres.railway.internal:5432/connect",
    POSTGRES_APPLICATION_NAME: "connect-cutover",
    POSTGRES_MAX_CONNECTIONS: "1",
    POSTGRES_CONNECTION_TIMEOUT_MS: "2000",
    POSTGRES_IDLE_TIMEOUT_MS: "2000",
    POSTGRES_STATEMENT_TIMEOUT_MS: "15000",
    POSTGRES_QUERY_TIMEOUT_MS: "20000",
    POSTGRES_LOCK_TIMEOUT_MS: "3000",
    POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS: "10000",
    POSTGRES_MAX_LIFETIME_SECONDS: "1800",
    POSTGRES_TLS_MODE: "verify-full",
  };

  await assert.rejects(
    runPostgresFullDataMigrationCutover(
      { ...productionEnvironment, POSTGRES_TLS_MODE: "disabled" },
      startedAt,
    ),
    (error) => error instanceof PostgresFullDataMigrationCutoverRunnerError &&
      error.code === "database-configuration-invalid",
  );
  await assert.rejects(
    runPostgresFullDataMigrationCutover(
      {
        ...productionEnvironment,
        CONNECT_POSTGRES_FULL_MIGRATION_CONFIRMATION: "approve",
      },
      startedAt,
    ),
    (error) => error instanceof PostgresFullDataMigrationCutoverRunnerError &&
      error.code === "approval-required" &&
      !error.message.includes(missingSource) &&
      !error.message.includes(evidenceHmacKey),
  );
});

test("keeps the operator command and runbook aligned with the safety contract", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const runbook = readFileSync(
    "docs/postgresql-full-data-migration-cutover-runbook.md",
    "utf8",
  );

  assert.equal(
    packageJson.scripts["cutover:postgres-full"],
    "node scripts/run-postgres-full-data-migration-cutover.mjs",
  );
  for (const required of [
    "CONNECT_POSTGRES_FULL_MIGRATION_COMMAND",
    "CONNECT_D1_FULL_MIGRATION_SOURCE_PATH",
    "CONNECT_POSTGRES_FULL_MIGRATION_HMAC_KEY",
    "CONNECT_POSTGRES_FULL_MIGRATION_APPROVED_SOURCE_DIGEST",
    "CONNECT_POSTGRES_FULL_MIGRATION_CONFIRMATION",
    POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION,
    "POSTGRES_TLS_MODE=verify-full",
    "target-already-cut-over",
  ]) {
    assert.equal(runbook.includes(required), true);
  }
  assert.match(runbook, /Plan[\s\S]+בזיכרון התהליך בלבד/);
  assert.match(runbook, /אינו מחליף Point-in-time recovery/);
});
