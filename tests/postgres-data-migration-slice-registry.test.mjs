import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  POSTGRES_DATA_MIGRATION_SLICES,
} from "../postgres/postgresDataMigrationSliceRegistry.mjs";
import {
  POSTGRES_TARGET_ONLY_MIGRATIONS,
} from "../postgres/postgresMigrationParityRegistry.mjs";

const postgresTargetOnlyTables = new Set(
  POSTGRES_TARGET_ONLY_MIGRATIONS.flatMap(({ migration }) => {
    const sql = readFileSync(`postgres/migrations/${migration}`, "utf8");
    return [...sql.matchAll(
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z0-9_]+)/gi,
    )].map((match) => match[1]);
  }),
);

function currentD1Tables() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  try {
    for (const fileName of readdirSync("drizzle")
      .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
      .sort()) {
      database.exec(
        readFileSync(`drizzle/${fileName}`, "utf8")
          .replaceAll("--> statement-breakpoint", ""),
      );
    }
    return database.prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    ).all().map(({ name }) => name);
  } finally {
    database.close();
  }
}

function currentPostgresTables() {
  const names = [];
  for (const fileName of readdirSync("postgres/migrations")
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort()) {
    const sql = readFileSync(`postgres/migrations/${fileName}`, "utf8");
    for (const match of sql.matchAll(
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z0-9_]+)/gi,
    )) {
      if (!postgresTargetOnlyTables.has(match[1])) names.push(match[1]);
    }
  }
  return names.sort();
}

test("partitions every D1 table exactly once and matches PostgreSQL", () => {
  const registered = POSTGRES_DATA_MIGRATION_SLICES
    .flatMap(({ tables }) => tables);
  const unique = [...new Set(registered)].sort();

  assert.equal(registered.length, 51);
  assert.equal(unique.length, registered.length);
  assert.deepEqual(unique, currentD1Tables());
  assert.deepEqual(unique, currentPostgresTables());
});

test("keeps readiness v2 evidence outside the legacy D1 data slices", () => {
  const readinessTables = [...postgresTargetOnlyTables]
    .filter((table) => table.startsWith("production_readiness_release_"))
    .sort();
  const registered = new Set(
    POSTGRES_DATA_MIGRATION_SLICES.flatMap(({ tables }) => tables),
  );

  assert.deepEqual(readinessTables, [
    "production_readiness_release_activation_events_v2",
    "production_readiness_release_candidates_v2",
    "production_readiness_release_heads_v2",
  ]);
  assert.equal(readinessTables.some((table) => registered.has(table)), false);
});

test("keeps slice dependencies ordered and linked to real migrations", () => {
  const seen = new Set();
  const d1Files = new Set(readdirSync("drizzle"));
  const postgresFiles = new Set(readdirSync("postgres/migrations"));

  for (const [index, slice] of POSTGRES_DATA_MIGRATION_SLICES.entries()) {
    assert.equal(slice.order, index + 1);
    assert.match(slice.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.equal(seen.has(slice.id), false);
    assert.equal(slice.requires.every((dependency) => seen.has(dependency)), true);
    assert.equal(slice.d1Migrations.every((file) => d1Files.has(file)), true);
    assert.equal(
      slice.postgresMigrations.every((file) => postgresFiles.has(file)),
      true,
    );
    assert.equal(Object.isFrozen(slice), true);
    assert.equal(Object.isFrozen(slice.tables), true);
    seen.add(slice.id);
  }
});

test("marks all ten slices and every D1 table rehearsed", () => {
  const rehearsed = POSTGRES_DATA_MIGRATION_SLICES
    .filter(({ status }) => status === "rehearsed");
  const next = POSTGRES_DATA_MIGRATION_SLICES
    .filter(({ status }) => status === "next");
  const remainingCount = POSTGRES_DATA_MIGRATION_SLICES
    .filter(({ status }) => status !== "rehearsed")
    .reduce((total, slice) => total + slice.tables.length, 0);

  assert.deepEqual(rehearsed.map(({ id }) => id), [
    "core",
    "tenant-access",
    "contact-organization-import",
    "meta-connection",
    "templates-campaigns",
    "conversations-messages",
    "bot-runtime",
    "ai-knowledge-runtime",
    "governance-billing",
    "whatsapp-delivery-policy",
  ]);
  assert.equal(
    rehearsed.reduce((total, slice) => total + slice.tables.length, 0),
    51,
  );
  assert.deepEqual(next, []);
  assert.equal(remainingCount, 0);
});

test("keeps provider delivery evidence with its rate-limit proof", () => {
  const templates = POSTGRES_DATA_MIGRATION_SLICES.find(
    ({ id }) => id === "templates-campaigns",
  );
  const deliveryPolicy = POSTGRES_DATA_MIGRATION_SLICES.find(
    ({ id }) => id === "whatsapp-delivery-policy",
  );

  assert.equal(
    templates.tables.includes("campaign_delivery_provider_links"),
    false,
  );
  assert.equal(
    deliveryPolicy.tables.includes("campaign_delivery_provider_links"),
    true,
  );
  assert.equal(
    deliveryPolicy.requires.includes("templates-campaigns"),
    true,
  );
  assert.equal(
    deliveryPolicy.tables.includes("whatsapp_rate_limit_reservations"),
    true,
  );
});
