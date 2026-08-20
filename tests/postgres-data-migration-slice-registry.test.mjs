import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  POSTGRES_DATA_MIGRATION_SLICES,
} from "../postgres/postgresDataMigrationSliceRegistry.mjs";

const railwayOnlyTables = new Set([
  "api_mutation_rate_limit_buckets",
  "railway_api_mutation_receipts",
  "worker_scheduler_leases",
]);

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
    for (const match of sql.matchAll(/CREATE TABLE\s+([a-z_]+)/g)) {
      if (!railwayOnlyTables.has(match[1])) names.push(match[1]);
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

test("marks nine slices rehearsed and the next slice explicitly", () => {
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
  ]);
  assert.equal(
    rehearsed.reduce((total, slice) => total + slice.tables.length, 0),
    43,
  );
  assert.deepEqual(next.map(({ id }) => id), ["whatsapp-delivery-policy"]);
  assert.deepEqual(next[0].requires, [
    "core",
    "meta-connection",
    "templates-campaigns",
  ]);
  assert.equal(next[0].tables.length, 8);
  assert.equal(remainingCount, 8);
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
