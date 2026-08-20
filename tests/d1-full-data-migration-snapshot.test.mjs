import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  POSTGRES_DATA_MIGRATION_SLICES,
} from "../postgres/postgresDataMigrationSliceRegistry.mjs";
import {
  D1DataMigrationSnapshotError,
  readD1DataMigrationSnapshots,
} from "../scripts/read-d1-data-migration-snapshot.mjs";
import {
  D1_FULL_DATA_MIGRATION_SLICE_CONTRACTS,
  D1_FULL_DATA_MIGRATION_SNAPSHOT_VERSION,
  readD1FullDataMigrationSnapshot,
} from "../scripts/read-d1-full-data-migration-snapshot.mjs";
import {
  D1FullDataMigrationSourceError,
  readVerifiedD1FullDataMigrationSnapshot,
  requireD1FullDataMigrationSourcePath,
  verifyD1FullDataMigrationSnapshot,
} from "../scripts/verify-d1-full-data-migration-snapshot.mjs";

function createCurrentD1Database() {
  const database = new DatabaseSync(":memory:");
  applyCurrentD1Schema(database);
  return database;
}

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

function trackTransactions(database) {
  const commands = [];
  const statements = [];
  return {
    commands,
    statements,
    dependency: {
      exec(sql) {
        commands.push(sql);
        return database.exec(sql);
      },
      prepare(sql) {
        statements.push(sql);
        return database.prepare(sql);
      },
    },
  };
}

test("keeps the full snapshot contract aligned with all ten slices", () => {
  assert.equal(D1_FULL_DATA_MIGRATION_SLICE_CONTRACTS.length, 10);
  assert.deepEqual(
    D1_FULL_DATA_MIGRATION_SLICE_CONTRACTS.map(({ id }) => id),
    POSTGRES_DATA_MIGRATION_SLICES.map(({ id }) => id),
  );
  assert.equal(
    D1_FULL_DATA_MIGRATION_SLICE_CONTRACTS.reduce(
      (total, slice) => total + slice.tables.length,
      0,
    ),
    51,
  );
  assert.equal(
    new Set(D1_FULL_DATA_MIGRATION_SLICE_CONTRACTS.flatMap(
      ({ tables }) => tables,
    )).size,
    51,
  );
});

test("reads all 51 current D1 tables under one source transaction", () => {
  const database = createCurrentD1Database();
  try {
    const tracked = trackTransactions(database);
    const snapshot = readD1FullDataMigrationSnapshot(tracked.dependency);

    assert.equal(snapshot.version, D1_FULL_DATA_MIGRATION_SNAPSHOT_VERSION);
    assert.equal(snapshot.tableCount, 51);
    assert.equal(snapshot.totalRowCount, 0);
    assert.equal(snapshot.slices.length, 10);
    assert.deepEqual(
      snapshot.slices.map(({ id }) => id),
      POSTGRES_DATA_MIGRATION_SLICES.map(({ id }) => id),
    );
    for (const [index, slice] of snapshot.slices.entries()) {
      assert.deepEqual(
        Object.keys(slice.snapshot.tables).sort(),
        [...D1_FULL_DATA_MIGRATION_SLICE_CONTRACTS[index].tables].sort(),
      );
    }
    assert.deepEqual(tracked.commands, ["BEGIN DEFERRED", "COMMIT"]);
    assert.equal(
      tracked.statements.filter((sql) => sql === "PRAGMA integrity_check")
        .length,
      1,
    );
    assert.equal(
      tracked.statements.filter((sql) => sql === "PRAGMA foreign_key_check")
        .length,
      1,
    );
    assert.equal(
      tracked.statements.filter((sql) => /^PRAGMA table_info\(/.test(sql))
        .length,
      51,
    );
    assert.equal(
      tracked.statements.filter((sql) => /^SELECT[\s\S]+FROM /m.test(sql))
        .length,
      51,
    );
  } finally {
    database.close();
  }
});

test("rolls back the entire full snapshot when one table drifts", () => {
  const database = createCurrentD1Database();
  try {
    database.exec(
      "ALTER TABLE whatsapp_provider_cooldown_state ADD COLUMN legacy_extra TEXT",
    );
    const tracked = trackTransactions(database);

    assert.throws(
      () => readD1FullDataMigrationSnapshot(tracked.dependency),
      (error) => error instanceof D1DataMigrationSnapshotError &&
        error.code === "schema-mismatch" &&
        error.table === "whatsapp_provider_cooldown_state",
    );
    assert.deepEqual(tracked.commands, ["BEGIN DEFERRED", "ROLLBACK"]);
  } finally {
    database.close();
  }
});

test("rejects duplicate full-snapshot table coverage before BEGIN", () => {
  const database = new DatabaseSync(":memory:");
  try {
    const tracked = trackTransactions(database);
    const table = {
      name: "source_rows",
      columns: [{ name: "id" }],
      orderBy: ["id"],
    };
    assert.throws(
      () => readD1DataMigrationSnapshots({
        database: tracked.dependency,
        slices: [{
          id: "first",
          tableContracts: [table],
          createSnapshot() {},
        }, {
          id: "second",
          tableContracts: [table],
          createSnapshot() {},
        }],
      }),
      (error) => error instanceof D1DataMigrationSnapshotError &&
        error.code === "dependency-invalid" &&
        error.table === "source_rows",
    );
    assert.deepEqual(tracked.commands, []);
  } finally {
    database.close();
  }
});

test("verifies one immutable SQLite export without exposing its path", () => {
  const root = join(
    tmpdir(),
    `connect-d1-full-snapshot-verification-${process.pid}`,
  );
  const sourcePath = join(root, "authorized-export.sqlite");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  try {
    const database = new DatabaseSync(sourcePath);
    applyCurrentD1Schema(database);
    database.close();
    chmodSync(sourcePath, 0o600);
    const before = lstatSync(sourcePath);

    assert.deepEqual(verifyD1FullDataMigrationSnapshot(sourcePath), {
      sliceCount: 10,
      tableCount: 51,
      totalRowCount: 0,
    });
    const snapshot = readVerifiedD1FullDataMigrationSnapshot(sourcePath);
    assert.equal(snapshot.slices.length, 10);
    assert.equal(snapshot.tableCount, 51);
    assert.equal(snapshot.totalRowCount, 0);
    const after = lstatSync(sourcePath);
    assert.equal(after.size, before.size);
    assert.equal(after.mtimeMs, before.mtimeMs);

    const result = spawnSync(
      process.execPath,
      ["scripts/verify-d1-full-data-migration-snapshot.mjs"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          CONNECT_D1_FULL_MIGRATION_SOURCE_PATH: sourcePath,
        },
      },
    );
    assert.equal(result.status, 0);
    assert.equal(result.signal, null);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      "D1 full migration source snapshot: PASS (10 slices, 51 tables, 0 rows)\n",
    );
    assert.equal(result.stdout.includes(sourcePath), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects missing, relative, directory, and symbolic-link sources", () => {
  const root = join(
    tmpdir(),
    `connect-d1-full-snapshot-invalid-${process.pid}`,
  );
  const sourcePath = join(root, "source.sqlite");
  const linkPath = join(root, "source-link.sqlite");
  const directoryPath = join(root, "directory.sqlite");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(directoryPath, { recursive: true });
  try {
    const database = new DatabaseSync(sourcePath);
    database.close();
    chmodSync(sourcePath, 0o600);
    symlinkSync(sourcePath, linkPath);

    for (const invalid of [
      "relative.sqlite",
      join(root, "missing.sqlite"),
      directoryPath,
      linkPath,
      `${sourcePath}.txt`,
    ]) {
      assert.throws(
        () => requireD1FullDataMigrationSourcePath(invalid),
        (error) => error instanceof D1FullDataMigrationSourceError &&
          error.code === "source-invalid",
      );
    }

    chmodSync(sourcePath, 0o644);
    assert.throws(
      () => requireD1FullDataMigrationSourcePath(sourcePath),
      (error) => error instanceof D1FullDataMigrationSourceError &&
        error.code === "source-invalid",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
