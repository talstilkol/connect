import assert from "node:assert/strict";
import test from "node:test";

import {
  POSTGRES_MIGRATION_PARITY_REGISTRY,
  POSTGRES_TARGET_ONLY_MIGRATIONS,
} from "../postgres/postgresMigrationParityRegistry.mjs";
import {
  inspectPostgresMigrationParityContract,
} from "../scripts/verify-postgres-migration-parity.mjs";

function mutableRegistry() {
  return POSTGRES_MIGRATION_PARITY_REGISTRY.map((entry) => ({
    ...entry,
    postgresMigrations: [...entry.postgresMigrations],
    targetEvidence: entry.targetEvidence.map((evidence) => ({
      ...evidence,
    })),
  }));
}

function mutableTargetOnly() {
  return POSTGRES_TARGET_ONLY_MIGRATIONS.map((entry) => ({ ...entry }));
}

test("maps every D1 migration and table to the PostgreSQL inventory", async () => {
  assert.deepEqual(
    await inspectPostgresMigrationParityContract(),
    {
      status: "passed",
      d1MigrationCount: 36,
      postgresMigrationCount: 23,
      coveredD1TableCount: 51,
      targetOnlyMigrationCount: 2,
    },
  );
  assert.equal(
    POSTGRES_MIGRATION_PARITY_REGISTRY.every(
      ({ status }) => status === "covered",
    ),
    true,
  );
});

test("rejects a missing, duplicate, or unrecognized migration mapping", async () => {
  await assert.rejects(
    inspectPostgresMigrationParityContract({
      registry: mutableRegistry().slice(1),
      targetOnly: mutableTargetOnly(),
    }),
    /D1_INVENTORY_MISMATCH/,
  );

  const duplicate = mutableRegistry();
  duplicate.push({ ...duplicate[0] });
  await assert.rejects(
    inspectPostgresMigrationParityContract({
      registry: duplicate,
      targetOnly: mutableTargetOnly(),
    }),
    /D1_MAPPING_DUPLICATE/,
  );

  const unknown = mutableRegistry();
  unknown[0].postgresMigrations = ["9999_missing.sql"];
  await assert.rejects(
    inspectPostgresMigrationParityContract({
      registry: unknown,
      targetOnly: mutableTargetOnly(),
    }),
    /TARGET_MISSING/,
  );
});

test("rejects stale evidence and an unexplained PostgreSQL migration", async () => {
  const stale = mutableRegistry();
  stale[0].targetEvidence[0].token = "CREATE TABLE missing_evidence";
  await assert.rejects(
    inspectPostgresMigrationParityContract({
      registry: stale,
      targetOnly: mutableTargetOnly(),
    }),
    /EVIDENCE_TOKEN_MISSING/,
  );

  await assert.rejects(
    inspectPostgresMigrationParityContract({
      registry: mutableRegistry(),
      targetOnly: mutableTargetOnly().slice(1),
    }),
    /POSTGRES_INVENTORY_MISMATCH/,
  );
});

test("keeps target-only migrations separate from D1 parity claims", async () => {
  const targetOnly = mutableTargetOnly();
  targetOnly.push({
    migration: "0000_core_contacts.sql",
    token: "CREATE TABLE tenants",
    summary: "Invalidly marks a mapped migration as target-only.",
  });
  await assert.rejects(
    inspectPostgresMigrationParityContract({
      registry: mutableRegistry(),
      targetOnly,
    }),
    /TARGET_ONLY_IS_MAPPED/,
  );
});
