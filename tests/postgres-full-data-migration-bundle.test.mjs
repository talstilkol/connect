import assert from "node:assert/strict";
import {
  readFileSync,
  readdirSync,
} from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  POSTGRES_DATA_MIGRATION_SLICES,
} from "../postgres/postgresDataMigrationSliceRegistry.mjs";
import {
  readD1FullDataMigrationSnapshot,
} from "../scripts/read-d1-full-data-migration-snapshot.mjs";
import {
  PostgresDataMigrationBundleError,
  createPostgresDataMigrationBundleProtocol,
} from "../server/platform/postgresDataMigrationBundleProtocol.ts";
import {
  POSTGRES_FULL_DATA_MIGRATION_BUNDLE_SLICES,
  POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION,
  createPostgresFullDataMigrationBundlePlan,
} from "../server/platform/postgresFullDataMigrationBundle.ts";
import {
  createPostgresDataMigrationProtocol,
} from "../server/platform/postgresDataMigrationProtocol.ts";

const evidenceHmacKey = Buffer.alloc(32, 23).toString("base64");
const firstWindow = Object.freeze({
  createdAt: "2026-08-20T08:00:00.000Z",
  expiresAt: "2026-08-20T08:15:00.000Z",
});
const secondWindow = Object.freeze({
  createdAt: "2026-08-20T09:00:00.000Z",
  expiresAt: "2026-08-20T09:15:00.000Z",
});

function childProtocol(id, lock) {
  return createPostgresDataMigrationProtocol({
    version: `connect_postgres_bundle_${id}_v1`,
    planKind: `postgres-bundle-${id}-migration-plan`,
    evidenceKind: `postgres-bundle-${id}-migration-evidence`,
    advisoryLockKey: [1129270867, lock],
    tables: [{
      name: `${id}_records`,
      columns: [{ name: "record_key", kind: "text" }],
      orderBy: ["record_key"],
    }],
  });
}

function testProtocol({ failSecond = false } = {}) {
  const alpha = childProtocol("alpha", 8);
  const beta = childProtocol("beta", 9);
  return createPostgresDataMigrationBundleProtocol({
    version: "connect_postgres_test_data_migration_bundle_v1",
    planKind: "postgres-test-data-migration-bundle-plan",
    evidenceKind: "postgres-test-data-migration-bundle-evidence",
    advisoryLockKeys: [
      [1129270867, 8],
      [1129270867, 9],
    ],
    slices: [{
      id: "alpha",
      requires: [],
      version: alpha.version,
      planKind: "postgres-bundle-alpha-migration-plan",
      evidenceKind: "postgres-bundle-alpha-migration-evidence",
      createPlan: alpha.createPlan,
      execute: alpha.execute,
    }, {
      id: "beta",
      requires: ["alpha"],
      version: beta.version,
      planKind: "postgres-bundle-beta-migration-plan",
      evidenceKind: "postgres-bundle-beta-migration-evidence",
      createPlan: beta.createPlan,
      execute: failSecond
        ? async () => {
          throw new Error("private target failure");
        }
        : beta.execute,
    }],
  });
}

function emptySnapshots() {
  return [{
    id: "alpha",
    requires: [],
    snapshot: {
      version: "connect_postgres_bundle_alpha_v1",
      tables: { alpha_records: [] },
    },
  }, {
    id: "beta",
    requires: ["alpha"],
    snapshot: {
      version: "connect_postgres_bundle_beta_v1",
      tables: { beta_records: [] },
    },
  }];
}

function bundlePlan(protocol = testProtocol(), window = firstWindow) {
  return protocol.createPlan({
    snapshots: emptySnapshots(),
    ...window,
    evidenceHmacKey,
  });
}

function transactionFixture({ receiptExists = false } = {}) {
  const calls = [];
  let transactionCount = 0;
  let committed = false;
  let rolledBack = false;
  return {
    calls,
    manager: {
      async transaction(options, execute) {
        transactionCount += 1;
        assert.deepEqual(options, { isolationLevel: "read-committed" });
        try {
          const result = await execute({
            async query(sql, parameters) {
              calls.push({ sql, parameters });
              if (/^SELECT bundle_id[\s\S]+data_migration_bundle_receipts/.test(sql)) {
                return receiptExists
                  ? { rows: [{ bundle_id: "existing" }], rowCount: 1 }
                  : { rows: [], rowCount: 0 };
              }
              if (/^SELECT count\(\*\)::bigint AS count FROM /.test(sql)) {
                return { rows: [{ count: "0" }], rowCount: 1 };
              }
              if (/^SELECT [\s\S]+FROM (?:alpha|beta)_records/.test(sql)) {
                return { rows: [], rowCount: 0 };
              }
              if (/^INSERT INTO data_migration_bundle_receipts/.test(sql)) {
                return { rows: [], rowCount: 1 };
              }
              return { rows: [{}], rowCount: 1 };
            },
          });
          committed = true;
          return result;
        } catch (error) {
          rolledBack = true;
          throw error;
        }
      },
    },
    get transactionCount() {
      return transactionCount;
    },
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
  };
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

test("creates a signed bundle with a stable source identity", () => {
  const protocol = testProtocol();
  const first = bundlePlan(protocol, firstWindow);
  const second = bundlePlan(protocol, secondWindow);

  assert.match(
    first.bundleId,
    /^connect_postgres_test_data_migration_bundle_v1_[0-9a-f]{64}$/,
  );
  assert.match(first.sourceDigest, /^hmac_sha256_v1_[0-9a-f]{64}$/);
  assert.match(first.bundleDigest, /^hmac_sha256_v1_[0-9a-f]{64}$/);
  assert.equal(first.sourceDigest, second.sourceDigest);
  assert.notEqual(first.bundleId, second.bundleId);
  assert.deepEqual(
    first.manifest.map(({ id, tableCount, totalRowCount }) => ({
      id,
      tableCount,
      totalRowCount,
    })),
    [
      { id: "alpha", tableCount: 1, totalRowCount: 0 },
      { id: "beta", tableCount: 1, totalRowCount: 0 },
    ],
  );
});

test("rejects expired and tampered bundles before opening a transaction", async () => {
  const protocol = testProtocol();
  const plan = bundlePlan(protocol);
  const expired = transactionFixture();

  await assert.rejects(
    protocol.execute({
      plan,
      transactions: expired.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:15:00.001Z",
    }),
    (error) => error instanceof PostgresDataMigrationBundleError &&
      error.code === "bundle-expired",
  );
  assert.equal(expired.transactionCount, 0);

  const tampered = transactionFixture();
  await assert.rejects(
    protocol.execute({
      plan: {
        ...plan,
        slices: plan.slices.map((slice, index) => index === 1
          ? {
            ...slice,
            plan: {
              ...slice.plan,
              manifest: [{ ...slice.plan.manifest[0], rowCount: 1 }],
            },
          }
          : slice),
      },
      transactions: tampered.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:05:00.000Z",
    }),
    (error) => error instanceof PostgresDataMigrationBundleError &&
      error.code === "bundle-mismatch" &&
      error.sliceId === "beta",
  );
  assert.equal(tampered.transactionCount, 0);
});

test("executes every slice and writes its receipt in one transaction", async () => {
  const protocol = testProtocol();
  const fixture = transactionFixture();
  const evidence = await protocol.execute({
    plan: bundlePlan(protocol),
    transactions: fixture.manager,
    evidenceHmacKey,
    now: "2026-08-20T08:05:00.000Z",
  });

  assert.equal(fixture.transactionCount, 1);
  assert.equal(fixture.committed, true);
  assert.equal(fixture.rolledBack, false);
  assert.equal(evidence.sliceCount, 2);
  assert.equal(evidence.tableCount, 2);
  assert.equal(evidence.totalRowCount, 0);
  assert.match(evidence.evidenceDigest, /^hmac_sha256_v1_[0-9a-f]{64}$/);

  const statements = fixture.calls.map(({ sql }) => sql);
  const alphaRead = statements.findIndex((sql) =>
    /FROM alpha_records/.test(sql));
  const betaRead = statements.findIndex((sql) =>
    /FROM beta_records/.test(sql));
  const receiptInsert = statements.findIndex((sql) =>
    /^INSERT INTO data_migration_bundle_receipts/.test(sql));
  assert.equal(alphaRead < betaRead, true);
  assert.equal(betaRead < receiptInsert, true);
});

test("rejects a replay before invoking a child slice", async () => {
  const protocol = testProtocol();
  const fixture = transactionFixture({ receiptExists: true });

  await assert.rejects(
    protocol.execute({
      plan: bundlePlan(protocol),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:05:00.000Z",
    }),
    (error) => error instanceof PostgresDataMigrationBundleError &&
      error.code === "bundle-replayed",
  );
  assert.equal(fixture.committed, false);
  assert.equal(fixture.rolledBack, true);
  assert.equal(
    fixture.calls.some(({ sql }) => /FROM alpha_records/.test(sql)),
    false,
  );
  const receiptLookup = fixture.calls.find(({ sql }) =>
    /^SELECT bundle_id[\s\S]+data_migration_bundle_receipts/.test(sql));
  assert.deepEqual(receiptLookup?.parameters, ["full-d1-cutover"]);
});

test("rolls back earlier slices when a later slice fails", async () => {
  const protocol = testProtocol({ failSecond: true });
  const fixture = transactionFixture();

  await assert.rejects(
    protocol.execute({
      plan: bundlePlan(protocol),
      transactions: fixture.manager,
      evidenceHmacKey,
      now: "2026-08-20T08:05:00.000Z",
    }),
    (error) => error instanceof PostgresDataMigrationBundleError &&
      error.code === "slice-execution-failed" &&
      error.sliceId === "beta" &&
      !error.message.includes("private target failure"),
  );
  assert.equal(fixture.committed, false);
  assert.equal(fixture.rolledBack, true);
  assert.equal(
    fixture.calls.some(({ sql }) =>
      /^INSERT INTO data_migration_bundle_receipts/.test(sql)),
    false,
  );
});

test("binds the production bundle to all ten rehearsed slices and 55 tables", () => {
  const database = new DatabaseSync(":memory:");
  try {
    applyCurrentD1Schema(database);
    const source = readD1FullDataMigrationSnapshot(database);
    const plan = createPostgresFullDataMigrationBundlePlan({
      snapshots: source.slices,
      ...firstWindow,
      evidenceHmacKey,
    });

    assert.equal(plan.version, POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION);
    assert.equal(
      POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION,
      "connect_postgres_full_data_migration_bundle_v1",
    );
    const childVersions = Object.fromEntries(
      POSTGRES_FULL_DATA_MIGRATION_BUNDLE_SLICES.map(({ id, version }) =>
        [id, version]),
    );
    assert.equal(
      childVersions["tenant-access"],
      "connect_postgres_tenant_access_data_v2",
    );
    assert.equal(
      childVersions["bot-runtime"],
      "connect_postgres_bot_runtime_data_v2",
    );
    assert.equal(
      childVersions["whatsapp-delivery-policy"],
      "connect_postgres_whatsapp_delivery_policy_data_v2",
    );
    assert.deepEqual(
      POSTGRES_FULL_DATA_MIGRATION_BUNDLE_SLICES.map(({ id }) => id),
      POSTGRES_DATA_MIGRATION_SLICES.map(({ id }) => id),
    );
    assert.deepEqual(
      POSTGRES_FULL_DATA_MIGRATION_BUNDLE_SLICES.map(({ requires }) =>
        [...requires]),
      POSTGRES_DATA_MIGRATION_SLICES.map(({ requires }) =>
        [...requires]),
    );
    assert.equal(plan.manifest.length, 10);
    assert.equal(
      plan.manifest.reduce((total, slice) => total + slice.tableCount, 0),
      55,
    );
    assert.equal(
      plan.manifest.reduce((total, slice) => total + slice.totalRowCount, 0),
      0,
    );
  } finally {
    database.close();
  }
});
