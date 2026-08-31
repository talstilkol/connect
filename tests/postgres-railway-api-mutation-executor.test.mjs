import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRailwayApiMutationExecutor,
  postgresRailwayMutationSql,
} from "../server/platform/postgresRailwayApiMutationExecutor.ts";

const idempotencyKey =
  `connect_idempotency_v1_${"c".repeat(64)}`;
const requestDigest =
  `railway_mutation_request_v1_${"d".repeat(64)}`;
const profile = {
  phoneNumber: "+972501234567",
  firstName: "Tal",
  lastName: null,
  email: null,
  company: "Connect",
};

function command(overrides = {}) {
  return {
    session: {
      tenantId: 7,
      externalUserId: "verified-user",
      displayName: "Verified workspace",
      status: "active",
      role: "manager",
    },
    idempotencyKey,
    requestDigest,
    profile,
    ...overrides,
  };
}

function contactRow(overrides = {}) {
  return {
    id: "31",
    tenantId: "7",
    ...profile,
    mailingStatus: "subscribed",
    consentStatus: "unknown",
    consentSource: null,
    consentRecordedAt: null,
    consentWithdrawnAt: null,
    version: "1",
    ...overrides,
  };
}

function contactRecord(overrides = {}) {
  const row = contactRow(overrides);

  return {
    id: row.id,
    phoneNumber: row.phoneNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    company: row.company,
    mailingStatus: row.mailingStatus,
    consentStatus: row.consentStatus,
    consentSource: row.consentSource,
    consentRecordedAt: row.consentRecordedAt,
    consentWithdrawnAt: row.consentWithdrawnAt,
    version: row.version,
  };
}

function queryResult(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function transactionFixture(results) {
  const queue = [...results];
  const calls = {
    options: [],
    queries: [],
    committed: 0,
    rolledBack: 0,
  };
  const manager = {
    async transaction(options, execute) {
      calls.options.push(options);

      try {
        const result = await execute({
          async query(sql, parameters) {
            calls.queries.push({ sql, parameters });

            if (queue.length === 0) {
              throw new Error("unexpected query");
            }

            const next = queue.shift();

            if (next instanceof Error) {
              throw next;
            }

            return next;
          },
        });
        calls.committed += 1;
        return result;
      } catch (error) {
        calls.rolledBack += 1;
        throw error;
      }
    },
  };

  return { calls, manager, queue };
}

test("commits contact, audit, and replay receipt in one transaction", async () => {
  const fixture = transactionFixture([
    queryResult([{ idempotencyKey }]),
    queryResult([contactRow()]),
    queryResult([{ id: 91 }]),
    queryResult([{ idempotencyKey }]),
  ]);
  const executor = createPostgresRailwayApiMutationExecutor(
    fixture.manager,
  );
  const result = await executor.saveContact(command());

  assert.equal(result.outcome, "committed");
  assert.equal(result.tenantId, 7);
  assert.equal(result.contact.id, 31);
  assert.deepEqual(fixture.calls.options, [
    { isolationLevel: "read-committed" },
  ]);
  assert.equal(fixture.calls.committed, 1);
  assert.equal(fixture.calls.rolledBack, 0);
  assert.equal(fixture.calls.queries.length, 4);
  assert.deepEqual(fixture.calls.queries[0].parameters, [
    7,
    "contacts.save",
    idempotencyKey,
    requestDigest,
    "verified-user",
  ]);
  assert.deepEqual(fixture.calls.queries[1].parameters, [
    7,
    profile.phoneNumber,
    profile.firstName,
    profile.lastName,
    profile.email,
    profile.company,
  ]);
  assert.deepEqual(fixture.calls.queries[2].parameters.slice(0, 5), [
    7,
    "verified-user",
    "contacts.save",
    "31",
    idempotencyKey,
  ]);
  assert.deepEqual(
    JSON.parse(fixture.calls.queries[2].parameters[5]),
    { requestDigest, outcome: "saved" },
  );
  const replayPayload = JSON.parse(
    fixture.calls.queries[3].parameters[4],
  );
  assert.deepEqual(replayPayload, result.contact);
  assert.doesNotMatch(
    JSON.stringify(replayPayload),
    /tenantId|externalUserId|evidence|createdAt|updatedAt/,
  );
  assert.equal(fixture.queue.length, 0);
});

test("reads an unchanged contact without increasing its version", async () => {
  const fixture = transactionFixture([
    queryResult([{ idempotencyKey }]),
    queryResult([], 0),
    queryResult([contactRow({ version: "8" })]),
    queryResult([{ id: 92 }]),
    queryResult([{ idempotencyKey }]),
  ]);
  const result = await createPostgresRailwayApiMutationExecutor(
    fixture.manager,
  ).saveContact(command());

  assert.equal(result.outcome, "committed");
  assert.equal(result.contact.version, 8);
  assert.equal(fixture.calls.queries.length, 5);
  assert.equal(
    fixture.calls.queries[2].sql,
    postgresRailwayMutationSql.selectContact,
  );
});

test("replays an identical completed mutation without another write", async () => {
  const fixture = transactionFixture([
    queryResult([], 0),
    queryResult([
      {
        requestDigest,
        status: "completed",
        responseJson: JSON.stringify(contactRecord()),
      },
    ]),
  ]);
  const result = await createPostgresRailwayApiMutationExecutor(
    fixture.manager,
  ).saveContact(command());

  assert.equal(result.outcome, "replayed");
  assert.equal(result.contact.id, 31);
  assert.equal(fixture.calls.queries.length, 2);
  assert.equal(
    fixture.calls.queries[1].sql,
    postgresRailwayMutationSql.lockReceipt,
  );
  assert.equal(fixture.calls.committed, 1);
});

test("returns conflict when an idempotency key has another digest", async () => {
  const fixture = transactionFixture([
    queryResult([], 0),
    queryResult([
      {
        requestDigest:
          `railway_mutation_request_v1_${"e".repeat(64)}`,
        status: "completed",
        responseJson: contactRow(),
      },
    ]),
  ]);
  const result = await createPostgresRailwayApiMutationExecutor(
    fixture.manager,
  ).saveContact(command());

  assert.deepEqual(result, {
    outcome: "conflict",
    tenantId: null,
    contact: null,
  });
  assert.equal(fixture.calls.queries.length, 2);
  assert.equal(fixture.calls.committed, 1);
});

test("rolls back a malformed, cross-tenant, or incomplete result", async () => {
  const cases = [
    [
      queryResult([{ idempotencyKey }]),
      queryResult([contactRow({ tenantId: "11" })]),
    ],
    [
      queryResult([], 0),
      queryResult([
        {
          requestDigest,
          status: "processing",
          responseJson: null,
        },
      ]),
    ],
    [
      queryResult([{ idempotencyKey }]),
      queryResult([contactRow()]),
      queryResult([], 0),
    ],
    [new Error("private database failure")],
  ];

  for (const results of cases) {
    const fixture = transactionFixture(results);
    const result = await createPostgresRailwayApiMutationExecutor(
      fixture.manager,
    ).saveContact(command());

    assert.deepEqual(result, {
      outcome: "unavailable",
      tenantId: null,
      contact: null,
    });
    assert.equal(fixture.calls.committed, 0);
    assert.equal(fixture.calls.rolledBack, 1);
  }
});

test("rejects an invalid command before opening a transaction", async () => {
  const fixture = transactionFixture([]);
  const executor = createPostgresRailwayApiMutationExecutor(
    fixture.manager,
  );
  const invalidCommands = [
    command({ idempotencyKey: "invalid" }),
    command({ requestDigest: "invalid" }),
    command({
      session: {
        ...command().session,
        tenantId: 0,
      },
    }),
    command({
      profile: {
        ...profile,
        phoneNumber: "0501234567",
      },
    }),
  ];

  for (const invalidCommand of invalidCommands) {
    assert.deepEqual(await executor.saveContact(invalidCommand), {
      outcome: "unavailable",
      tenantId: null,
      contact: null,
    });
  }

  assert.deepEqual(fixture.calls.options, []);
});

test("freezes SQL with atomic claim, lock, no-op guard, audit, and completion", () => {
  assert.equal(Object.isFrozen(postgresRailwayMutationSql), true);
  assert.match(
    postgresRailwayMutationSql.claimReceipt,
    /ON CONFLICT \(tenant_id, operation, idempotency_key\)/,
  );
  assert.match(postgresRailwayMutationSql.lockReceipt, /FOR UPDATE/);
  assert.match(
    postgresRailwayMutationSql.upsertContact,
    /IS DISTINCT FROM/,
  );
  assert.match(postgresRailwayMutationSql.insertAudit, /audit_logs/);
  assert.match(
    postgresRailwayMutationSql.completeReceipt,
    /status = 'processing'/,
  );
  assert.doesNotMatch(
    Object.values(postgresRailwayMutationSql).join("\n"),
    /Math\.random|randomUUID/,
  );
});

test("rejects a missing PostgreSQL transaction manager", () => {
  assert.throws(
    () => createPostgresRailwayApiMutationExecutor({}),
    /transaction manager is invalid/,
  );
});
