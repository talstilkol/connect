import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresSystemAdminBusinessProfileRepository,
  postgresSystemAdminBusinessProfileSql,
} from "../server/platform/postgresSystemAdminBusinessProfileRepository.ts";
import {
  deriveBusinessProfileAdminEventKey,
  deriveBusinessProfileDigest,
} from "../server/admin/systemAdminBusinessProfileKey.ts";

const actorExternalUserId = "system-admin-external-id";
const occurredAt = "2026-08-19T12:00:00.000Z";
const createdAt = new Date("2026-08-01T08:00:00.000Z");
const original = Object.freeze({
  businessName: "Original Business",
  timezone: "Asia/Jerusalem",
  interfaceLanguage: "he",
});
const target = Object.freeze({
  businessName: "Updated Business",
  timezone: "Europe/London",
  interfaceLanguage: "en",
});

function profileRow(profile, version, updatedAt) {
  return {
    tenantId: "1",
    ...profile,
    version,
    createdAt,
    updatedAt: new Date(updatedAt),
  };
}

function result(rows) {
  return { rows, rowCount: rows.length };
}

function input(overrides = {}) {
  return {
    tenantId: 1,
    expectedVersion: 1,
    ...target,
    actorExternalUserId,
    occurredAt,
    ...overrides,
  };
}

function fixture(transactionResults) {
  const pending = [...transactionResults];
  const calls = [];
  const repository = createPostgresSystemAdminBusinessProfileRepository({
    queries: {
      async query() {
        throw new Error("Unexpected direct query");
      },
    },
    transactions: {
      async transaction(options, execute) {
        assert.deepEqual(options, { isolationLevel: "read-committed" });
        return execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            const next = pending.shift();
            if (next === undefined) throw new Error("Unexpected transaction query");
            return next;
          },
        });
      },
    },
  });
  return {
    repository,
    calls,
    assertConsumed() {
      assert.equal(pending.length, 0);
    },
  };
}

const newProfileDigest = await deriveBusinessProfileDigest(target);
const eventKey = await deriveBusinessProfileAdminEventKey(1, {
  expectedVersion: 1,
  newProfileDigest,
  actorExternalUserId,
});

test("updates a locked profile, tenant name, and immutable event in one transaction", async () => {
  const database = fixture([
    result([profileRow(original, 1, "2026-08-01T08:00:00.000Z")]),
    result([profileRow(target, 2, occurredAt)]),
    result([{ tenantId: "1" }]),
    result([{ eventKey }]),
  ]);
  const mutation = await database.repository.update(input());

  assert.equal(mutation.outcome, "updated");
  assert.equal(mutation.profile.version, 2);
  assert.deepEqual(database.calls.map(({ sql }) => sql), [
    postgresSystemAdminBusinessProfileSql.lockProfile,
    postgresSystemAdminBusinessProfileSql.updateProfile,
    postgresSystemAdminBusinessProfileSql.syncTenantDisplayName,
    postgresSystemAdminBusinessProfileSql.insertEvent,
  ]);
  assert.deepEqual(database.calls[3].parameters.slice(4, 8), [
    "businessName,timezone,interfaceLanguage",
    actorExternalUserId,
    2,
    occurredAt,
  ]);
  database.assertConsumed();
});

test("classifies an exact retry as unchanged only when its event exists", async () => {
  const retry = fixture([
    result([profileRow(target, 2, occurredAt)]),
    result([{ eventKey }]),
  ]);
  assert.equal((await retry.repository.update(input({
    occurredAt: "2026-08-19T12:05:00.000Z",
  }))).outcome, "unchanged");
  retry.assertConsumed();

  const missingEvidence = fixture([
    result([profileRow(target, 2, occurredAt)]),
    result([]),
  ]);
  assert.equal(
    (await missingEvidence.repository.update(input())).outcome,
    "conflict",
  );
});

test("returns conflict, unchanged, and not-found before any write", async () => {
  const stale = fixture([
    result([profileRow(target, 2, occurredAt)]),
  ]);
  assert.equal((await stale.repository.update(input({
    businessName: "Conflicting Business",
  }))).outcome, "conflict");

  const unchanged = fixture([
    result([profileRow(original, 1, "2026-08-01T08:00:00.000Z")]),
  ]);
  assert.equal((await unchanged.repository.update(input(original))).outcome, "unchanged");

  const missing = fixture([result([])]);
  assert.deepEqual(await missing.repository.update(input({ tenantId: 99 })), {
    outcome: "not-found",
    profile: null,
  });
});

test("rejects malformed input, result identities, and dependencies", async () => {
  const invalid = fixture([]);
  await assert.rejects(
    invalid.repository.update(input({ expectedVersion: 0 })),
    /version is invalid/,
  );

  const crossTenant = fixture([
    result([{
      ...profileRow(original, 1, "2026-08-01T08:00:00.000Z"),
      tenantId: "2",
    }]),
  ]);
  await assert.rejects(
    crossTenant.repository.update(input()),
    /invalid business profile/,
  );

  assert.throws(
    () => createPostgresSystemAdminBusinessProfileRepository({}),
    /dependencies are invalid/,
  );
});
