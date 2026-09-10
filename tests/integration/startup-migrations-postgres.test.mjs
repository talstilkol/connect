import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import pg from "pg";

import {
  applyPostgresMigrations,
  requireLocalStartupRehearsalUrl,
} from "../../scripts/verify-railway-api-startup.mjs";

const migrationDirectory = fileURLToPath(new URL("../../postgres/migrations/", import.meta.url));

async function schemaSnapshot(pool) {
  const result = await pool.query(`
    SELECT 'relation' AS kind, relname AS name, relkind::text AS detail
    FROM pg_catalog.pg_class WHERE relnamespace = 'public'::regnamespace
    UNION ALL
    SELECT 'function', proname, pg_catalog.pg_get_function_identity_arguments(oid)
    FROM pg_catalog.pg_proc WHERE pronamespace = 'public'::regnamespace
    UNION ALL
    SELECT 'type', typname, typtype::text
    FROM pg_catalog.pg_type WHERE typnamespace = 'public'::regnamespace
    ORDER BY kind, name, detail
  `);
  return result.rows;
}

test("startup migrations commit as a group and roll back a real late SQL failure", async (t) => {
  const connectionString = requireLocalStartupRehearsalUrl(
    process.env.CONNECT_POSTGRES_STARTUP_REHEARSAL_URL,
  );
  const pool = new pg.Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 2_000,
    statement_timeout: 15_000,
    query_timeout: 20_000,
    lock_timeout: 3_000,
  });
  t.after(() => pool.end());
  const initial = await schemaSnapshot(pool);
  assert.deepEqual(initial, [], "Requires a newly created, empty local rehearsal database");
  const files = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();
  const temporaryRoot = join(tmpdir(), `connect-startup-migration-rollback-${process.pid}`);
  await mkdir(temporaryRoot);
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const copyDirectory = join(temporaryRoot, "migrations");
  await cp(migrationDirectory, copyDirectory, { recursive: true, force: false, errorOnExist: true });
  const lastPath = join(copyDirectory, files.at(-1));
  const lastSql = await readFile(lastPath, "utf8");

  await t.test("a division-by-zero in the last real migration leaves no partial schema", async () => {
    // Fault injection only: all preceding SQL is copied from the real repository.
    await writeFile(lastPath, `${lastSql}\nSELECT 1 / 0;\n`);
    await assert.rejects(applyPostgresMigrations(pool, copyDirectory), { code: "22012" });
    assert.deepEqual(await schemaSnapshot(pool), initial);
    assert.equal(pool.totalCount, pool.idleCount, "The checked-out connection must be returned");
  });

  await t.test("a terminated migration connection is discarded and leaves the pool usable", async () => {
    await writeFile(lastPath, `${lastSql}\nSELECT pg_catalog.pg_terminate_backend(pg_catalog.pg_backend_pid());\n`);
    await assert.rejects(applyPostgresMigrations(pool, copyDirectory), (error) =>
      error.code === "57P01" || error.message === "Connection terminated unexpectedly");
    assert.deepEqual(await schemaSnapshot(pool), initial);
    assert.equal(pool.totalCount, pool.idleCount);
  });

  await t.test("the unchanged source migrations can be retried and committed after rollback", async () => {
    const count = await applyPostgresMigrations(pool);
    assert.equal(count, files.length);
    const rows = await schemaSnapshot(pool);
    assert.ok(rows.some((row) => row.kind === "relation" && row.name === "meta_media_cleanup_jobs"));
    assert.ok(rows.some((row) => row.kind === "function" && row.name === "guard_meta_media_cleanup_v1"));
    assert.equal(pool.totalCount, pool.idleCount);
    t.diagnostic(`Committed ${count} real PostgreSQL migrations; schema SHA-256 ${createHash("sha256").update(JSON.stringify(rows)).digest("hex")}`);
  });

  await t.test("repeating bootstrap is rejected without changing the committed schema", async () => {
    const before = await schemaSnapshot(pool);
    await assert.rejects(applyPostgresMigrations(pool), /RAILWAY_API_STARTUP_REHEARSAL_DATABASE_NOT_EMPTY/);
    assert.deepEqual(await schemaSnapshot(pool), before);
    assert.equal(pool.totalCount, pool.idleCount);
  });
});
