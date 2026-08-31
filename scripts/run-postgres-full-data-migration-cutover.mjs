import { pathToFileURL } from "node:url";

import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  createNodePostgresPool,
  inspectNodePostgresPoolConfiguration,
} from "../server/platform/nodePostgresPoolConfiguration.ts";
import {
  POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION,
  PostgresFullDataMigrationCutoverError,
  createPostgresFullDataMigrationCutoverPreflight,
  executePostgresFullDataMigrationCutover,
} from "../server/platform/postgresFullDataMigrationCutover.ts";
import {
  D1FullDataMigrationSourceError,
  readVerifiedD1FullDataMigrationSnapshot,
} from "./verify-d1-full-data-migration-snapshot.mjs";
import {
  D1DataMigrationSnapshotError,
} from "./read-d1-data-migration-snapshot.mjs";

const commandEnvironmentKey = "CONNECT_POSTGRES_FULL_MIGRATION_COMMAND";
const sourceEnvironmentKey = "CONNECT_D1_FULL_MIGRATION_SOURCE_PATH";
const hmacEnvironmentKey = "CONNECT_POSTGRES_FULL_MIGRATION_HMAC_KEY";
const approvalEnvironmentKey =
  "CONNECT_POSTGRES_FULL_MIGRATION_APPROVED_SOURCE_DIGEST";
const confirmationEnvironmentKey =
  "CONNECT_POSTGRES_FULL_MIGRATION_CONFIRMATION";

export class PostgresFullDataMigrationCutoverRunnerError extends Error {
  constructor(code) {
    super(`PostgreSQL full data migration runner failed: ${code}`);
    this.name = "PostgresFullDataMigrationCutoverRunnerError";
    this.code = code;
  }
}

function fail(code) {
  throw new PostgresFullDataMigrationCutoverRunnerError(code);
}

function requireCommand(value) {
  if (!(["preflight", "execute"]).includes(value)) {
    fail("command-invalid");
  }
  return value;
}

function requireEvidenceKey(value) {
  const decoded = typeof value === "string"
    ? Buffer.from(value, "base64")
    : Buffer.alloc(0);
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9+/]{43}=$/.test(value) ||
    decoded.length !== 32 ||
    decoded.toString("base64") !== value
  ) {
    fail("evidence-key-invalid");
  }
  return value;
}

function requireExecutionApproval(environment) {
  if (
    environment[confirmationEnvironmentKey] !==
      POSTGRES_FULL_DATA_MIGRATION_CONFIRMATION
  ) {
    fail("approval-required");
  }
  const digest = environment[approvalEnvironmentKey];
  if (
    typeof digest !== "string" ||
    !/^hmac_sha256_v1_[a-f0-9]{64}$/.test(digest)
  ) {
    fail("approval-mismatch");
  }
}

function requirePoolConfiguration(environment) {
  const state = inspectNodePostgresPoolConfiguration(environment);
  if (state.status !== "configured") fail("database-configuration-invalid");
  if (!(["staging", "production"]).includes(
    state.configuration.runtimeEnvironment,
  )) {
    fail("target-environment-invalid");
  }
  return state.configuration;
}

function safeReport(report) {
  return `${JSON.stringify(report)}\n`;
}

export async function runPostgresFullDataMigrationCutover(
  environment,
  startedAt,
) {
  const command = requireCommand(environment?.[commandEnvironmentKey]);
  const evidenceHmacKey = requireEvidenceKey(environment[hmacEnvironmentKey]);
  const configuration = command === "execute"
    ? requirePoolConfiguration(environment)
    : null;
  if (command === "execute") requireExecutionApproval(environment);
  const snapshot = readVerifiedD1FullDataMigrationSnapshot(
    environment[sourceEnvironmentKey],
  );
  const common = {
    snapshots: snapshot.slices,
    startedAt,
    evidenceHmacKey,
  };
  if (command === "preflight") {
    return createPostgresFullDataMigrationCutoverPreflight(common);
  }

  let idleErrorObserved = false;
  const pool = createNodePostgresPool(configuration, {
    recordIdleClientError() {
      idleErrorObserved = true;
    },
  });
  try {
    const evidence = await executePostgresFullDataMigrationCutover({
      ...common,
      approvedSourceDigest: environment[approvalEnvironmentKey],
      confirmation: environment[confirmationEnvironmentKey],
      targetEnvironment: configuration.runtimeEnvironment,
      transactions: createNodePostgresTransactionManager(pool),
    });
    if (idleErrorObserved) fail("database-idle-error");
    return evidence;
  } finally {
    await pool.end().catch(() => {
      fail("database-close-failed");
    });
  }
}

function publicErrorCode(error) {
  if (
    error instanceof PostgresFullDataMigrationCutoverRunnerError ||
    error instanceof PostgresFullDataMigrationCutoverError ||
    error instanceof D1FullDataMigrationSourceError ||
    error instanceof D1DataMigrationSnapshotError
  ) {
    return error.code;
  }
  return "operation-failed";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runPostgresFullDataMigrationCutover(
    process.env,
    new Date().toISOString(),
  ).then((report) => {
    process.stdout.write(safeReport(report));
  }).catch((error) => {
    process.stderr.write(
      `PostgreSQL full data migration cutover: FAIL (${publicErrorCode(error)})\n`,
    );
    process.exitCode = 1;
  });
}
