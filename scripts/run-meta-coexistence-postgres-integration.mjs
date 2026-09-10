import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const metaCoexistenceTestUrl = "postgresql://connect_echo_test@127.0.0.1:55439/postgres";
const root = fileURLToPath(new URL("../", import.meta.url));
export const metaCoexistenceTestSuites = Object.freeze([
  { file: "tests/integration/meta-signup-launch-postgres.test.mjs", database: "connect_meta_signup_launch_integration", variable: "CONNECT_META_SIGNUP_LAUNCH_TEST_URL" },
  { file: "tests/integration/meta-coexistence-orchestration-postgres.test.mjs", database: "connect_meta_coexistence_integration", variable: "CONNECT_META_COEXISTENCE_TEST_URL" },
  { file: "tests/integration/meta-message-echo-postgres.test.mjs", database: "connect_meta_echo_integration", variable: "CONNECT_META_ECHO_TEST_URL" },
  { file: "tests/integration/meta-data-sync-postgres.test.mjs", database: "connect_meta_sync_integration", variable: "CONNECT_META_DATA_SYNC_TEST_URL" },
  { file: "tests/integration/meta-history-postgres.test.mjs", database: "connect_meta_history_integration", variable: "CONNECT_META_HISTORY_TEST_URL" },
  { file: "tests/integration/meta-history-inbox-postgres.test.mjs", database: "connect_meta_inbox_integration", variable: "CONNECT_META_HISTORY_INBOX_TEST_URL", timeoutMs: 600_000 },
  { file: "tests/integration/meta-sync-lifecycle-postgres.test.mjs", database: "connect_meta_sync_lifecycle_integration", variable: "CONNECT_META_SYNC_LIFECYCLE_TEST_URL" },
  { file: "tests/integration/meta-account-lifecycle-postgres.test.mjs", database: "connect_meta_account_lifecycle_integration", variable: "CONNECT_META_ACCOUNT_LIFECYCLE_TEST_URL" },
].map((suite) => Object.freeze(suite)));

export function requireMetaCoexistenceTestUrl(environment) {
  if (environment?.CONNECT_META_COEXISTENCE_TEST_URL !== metaCoexistenceTestUrl) {
    throw new Error("META_COEXISTENCE_DEDICATED_TEST_CLUSTER_REQUIRED");
  }
  return metaCoexistenceTestUrl;
}

/** No drops or reuse: an existing application/test database makes the whole run ineligible. */
export async function prepareMetaCoexistenceDatabases(client) {
  const identity = await client.query("SELECT current_database() AS database, current_user AS role");
  if (identity.rows.length !== 1 || identity.rows[0].database !== "postgres" || identity.rows[0].role !== "connect_echo_test") {
    throw new Error("META_COEXISTENCE_TEST_IDENTITY_REQUIRED");
  }
  const databases = await client.query("SELECT datname FROM pg_database WHERE NOT datistemplate AND datname <> 'postgres'");
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')");
  if (databases.rows.length !== 0 || tables.rows.length !== 0) throw new Error("META_COEXISTENCE_EMPTY_TEST_CLUSTER_REQUIRED");
  for (const suite of metaCoexistenceTestSuites) {
    // Names are fixed in this file; no user/environment value is interpolated into SQL.
    await client.query(`CREATE DATABASE ${suite.database}`);
  }
}

function runSuite(suite, environment) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--test", "--test-reporter=tap", suite.file], {
      // CI measured roughly twice the local duration for the full Inbox/media
      // lifecycle. Only that suite gets a larger, still bounded process budget.
      cwd: root, stdio: "inherit", timeout: suite.timeoutMs ?? 300_000, killSignal: "SIGKILL",
      env: { ...environment, [suite.variable]: metaCoexistenceTestUrl.replace(/postgres$/, suite.database) },
    });
    child.once("error", () => resolve(false));
    child.once("close", (code, signal) => {
      const passed = code === 0 && signal === null;
      if (!passed) console.error(`Meta Coexistence PostgreSQL: ${suite.file} failed (exit=${code ?? "none"}, signal=${signal ?? "none"})`);
      resolve(passed);
    });
  });
}

export async function runMetaCoexistenceSuites(environment, execute = runSuite) {
  requireMetaCoexistenceTestUrl(environment);
  const failures = [];
  for (const suite of metaCoexistenceTestSuites) {
    console.log(`Meta Coexistence PostgreSQL: ${suite.file} (timeout=${suite.timeoutMs ?? 300_000}ms)`);
    try { if (!await execute(suite, environment)) failures.push(suite.file); }
    catch { failures.push(suite.file); }
  }
  if (failures.length !== 0) throw new Error(`META_COEXISTENCE_SUITES_FAILED (${failures.length}/${metaCoexistenceTestSuites.length})`);
}

async function main() {
  if (process.argv.length !== 2) throw new Error("META_COEXISTENCE_INVALID_ARGUMENTS");
  const connectionString = requireMetaCoexistenceTestUrl(process.env);
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 2_000, statement_timeout: 10_000 });
  try { await client.connect(); await prepareMetaCoexistenceDatabases(client); }
  finally { await client.end(); }
  await runMetaCoexistenceSuites(process.env);
  console.log(`Meta Coexistence PostgreSQL: PASS (${metaCoexistenceTestSuites.length} isolated suites)`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error && /^META_COEXISTENCE_[A-Z_]+(?: \(\d+\/\d+\))?$/.test(error.message)
      ? error.message : "META_COEXISTENCE_TEST_RUN_FAILED";
    console.error(message); process.exitCode = 1;
  });
}
