import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRailwayContactImportMutationExecutor,
  postgresRailwayContactImportMutationSql,
} from "../server/platform/postgresRailwayContactImportMutationExecutor.ts";
import { postgresContactImportSql } from "../server/platform/postgresContactImportRepository.ts";

const idempotencyKey = `connect_idempotency_v1_${"a".repeat(64)}`;
const requestDigest = `railway_mutation_request_v1_${"b".repeat(64)}`;
const domainKey = `contact_import_v1_${"c".repeat(64)}`;
const occurredAt = new Date("2026-08-21T00:00:00.000Z");
const session = {
  tenantId: 7,
  externalUserId: "verified-user",
  displayName: "Verified workspace",
  status: "active",
  role: "manager",
};
const startPayload = {
  fileName: "contacts.csv",
  sourceDigest: "d".repeat(64),
  totalRows: 2,
  mapping: {
    phoneNumber: 0,
    firstName: 1,
    lastName: null,
    email: null,
    company: null,
  },
};

function command(operation, payload, overrides = {}) {
  return {
    session,
    operation,
    idempotencyKey,
    requestDigest,
    payload,
    ...overrides,
  };
}

function result(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function jobRow(overrides = {}) {
  return {
    id: "31",
    tenantId: "7",
    idempotencyKey: domainKey,
    fileName: "contacts.csv",
    totalRows: 2,
    processedRows: 0,
    createdRows: 0,
    updatedRows: 0,
    unchangedRows: 0,
    rejectedRows: 0,
    duplicateRows: 0,
    status: "processing",
    createdByExternalUserId: "verified-user",
    createdAt: occurredAt,
    updatedAt: occurredAt,
    completedAt: null,
    ...overrides,
  };
}

function transactionFixture(results) {
  const queue = [...results];
  const calls = { options: [], queries: [], committed: 0, rolledBack: 0 };
  const manager = {
    async transaction(options, execute) {
      calls.options.push(options);
      try {
        const value = await execute({
          async query(sql, parameters) {
            calls.queries.push({ sql, parameters });
            const next = queue.shift();
            if (next instanceof Error) throw next;
            if (next === undefined) throw new Error("unexpected query");
            return next;
          },
        });
        calls.committed += 1;
        return value;
      } catch (error) {
        calls.rolledBack += 1;
        throw error;
      }
    },
  };

  return { calls, manager, queue };
}

test("starts a job, audit, response, and receipt atomically", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([{ id: "31" }]),
    result([jobRow()]),
    result([{ id: "91" }]),
    result([{ idempotencyKey }]),
  ]);
  const saved = await createPostgresRailwayContactImportMutationExecutor(
    fixture.manager,
  ).execute(command("contacts.import.start", startPayload));

  assert.deepEqual(saved, {
    outcome: "committed",
    tenantId: 7,
    result: {
      job: {
        id: 31,
        fileName: "contacts.csv",
        totalRows: 2,
        processedRows: 0,
        createdRows: 0,
        updatedRows: 0,
        unchangedRows: 0,
        rejectedRows: 0,
        duplicateRows: 0,
        status: "processing",
      },
      contacts: [],
    },
  });
  assert.deepEqual(fixture.calls.options, [
    { isolationLevel: "read-committed" },
  ]);
  assert.equal(fixture.calls.committed, 1);
  assert.equal(fixture.calls.rolledBack, 0);
  assert.equal(fixture.calls.queries[1].sql, postgresContactImportSql.insertJob);
  assert.equal(
    fixture.calls.queries[3].sql,
    postgresRailwayContactImportMutationSql.insertAudit,
  );
  assert.deepEqual(
    JSON.parse(fixture.calls.queries[4].parameters[4]),
    saved.result,
  );
  assert.equal(fixture.queue.length, 0);
});

test("replays the exact stored response without domain writes", async () => {
  const stored = {
    job: {
      id: 31,
      fileName: "contacts.csv",
      totalRows: 2,
      processedRows: 0,
      createdRows: 0,
      updatedRows: 0,
      unchangedRows: 0,
      rejectedRows: 0,
      duplicateRows: 0,
      status: "processing",
    },
    contacts: [],
  };
  const fixture = transactionFixture([
    result([], 0),
    result([{
      requestDigest,
      status: "completed",
      responseJson: JSON.stringify(stored),
    }]),
  ]);
  const replayed = await createPostgresRailwayContactImportMutationExecutor(
    fixture.manager,
  ).execute(command("contacts.import.start", startPayload));

  assert.deepEqual(replayed, {
    outcome: "replayed",
    tenantId: 7,
    result: stored,
  });
  assert.equal(fixture.calls.queries.length, 2);
});

test("locks a chunk job and rolls back when it does not exist", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([], 0),
  ]);
  const saved = await createPostgresRailwayContactImportMutationExecutor(
    fixture.manager,
  ).execute(command("contacts.import.chunk", {
    jobId: 31,
    rows: [{
      sourceRowNumber: 2,
      phoneNumber: "+972501234569",
      firstName: "Imported",
      lastName: "",
      email: "",
      company: "Connect",
    }],
  }));

  assert.deepEqual(saved, {
    outcome: "not-found",
    tenantId: null,
    result: null,
  });
  assert.equal(fixture.calls.queries[1].sql, postgresContactImportSql.lockJobById);
  assert.equal(fixture.calls.rolledBack, 1);
});

test("separates receipt conflict from unavailable persistence", async () => {
  const conflict = transactionFixture([
    result([], 0),
    result([{
      requestDigest: `railway_mutation_request_v1_${"e".repeat(64)}`,
      status: "completed",
      responseJson: null,
    }]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayContactImportMutationExecutor(
      conflict.manager,
    ).execute(command("contacts.import.start", startPayload)),
    { outcome: "conflict", tenantId: null, result: null },
  );

  const unavailable = transactionFixture([
    result([{ idempotencyKey }]),
    new Error("private database detail"),
  ]);
  assert.deepEqual(
    await createPostgresRailwayContactImportMutationExecutor(
      unavailable.manager,
    ).execute(command("contacts.import.start", startPayload)),
    { outcome: "unavailable", tenantId: null, result: null },
  );
  assert.equal(unavailable.calls.rolledBack, 1);
});

test("rejects unsafe commands before opening a transaction", async () => {
  const fixture = transactionFixture([]);
  const executor = createPostgresRailwayContactImportMutationExecutor(
    fixture.manager,
  );
  const invalid = [
    command("contacts.import.start", { ...startPayload, tenantId: 7 }),
    command("contacts.import.start", { ...startPayload, sourceDigest: "bad" }),
    command("contacts.import.chunk", { jobId: 0, rows: [] }),
    command("contacts.import.start", startPayload, { idempotencyKey: "bad" }),
  ];

  for (const candidate of invalid) {
    assert.deepEqual(await executor.execute(candidate), {
      outcome: "unavailable",
      tenantId: null,
      result: null,
    });
  }

  assert.deepEqual(fixture.calls.options, []);
});

test("freezes SQL and rejects a missing transaction manager", () => {
  assert.equal(Object.isFrozen(postgresRailwayContactImportMutationSql), true);
  assert.match(postgresRailwayContactImportMutationSql.lockReceipt, /FOR UPDATE/);
  assert.match(postgresRailwayContactImportMutationSql.insertAudit, /audit_logs/);
  assert.doesNotMatch(
    Object.values(postgresRailwayContactImportMutationSql).join("\n"),
    /Math\.random|randomUUID/,
  );
  assert.throws(
    () => createPostgresRailwayContactImportMutationExecutor({}),
    /transaction manager is invalid/,
  );
});
