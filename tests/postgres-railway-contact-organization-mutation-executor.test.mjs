import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresRailwayContactOrganizationMutationExecutor,
  postgresRailwayContactOrganizationMutationSql,
} from "../server/platform/postgresRailwayContactOrganizationMutationExecutor.ts";

const idempotencyKey =
  `connect_idempotency_v1_${"a".repeat(64)}`;
const requestDigest =
  `railway_mutation_request_v1_${"b".repeat(64)}`;
const session = {
  tenantId: 7,
  externalUserId: "verified-user",
  displayName: "Verified workspace",
  status: "active",
  role: "manager",
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

function transactionFixture(results) {
  const queue = [...results];
  const calls = {
    options: [],
    locks: [],
    queries: [],
    committed: 0,
    rolledBack: 0,
  };
  const manager = {
    async transaction(options, execute) {
      calls.options.push(options);
      try {
        const value = await execute({
          async query(sql, parameters) {
            if (sql === postgresRailwayContactOrganizationMutationSql.lockTenant) {
              calls.locks.push({ sql, parameters });
              return result([{ id: "7" }]);
            }
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

test("commits a tag, audit, snapshot, and receipt atomically", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([{ id: "5", name: "Priority", contactCount: "0" }]),
    result([{ revision: "90" }]),
    result([{ id: "5", name: "Priority", contactCount: "0" }]),
    result([]),
    result([{ id: "91" }]),
    result([{ idempotencyKey }]),
  ]);
  const mutation = command(
    "contacts.organization.tag.save",
    { name: "Priority" },
  );
  const saved = await createPostgresRailwayContactOrganizationMutationExecutor(
    fixture.manager,
  ).execute(mutation);

  assert.deepEqual(saved, {
    outcome: "committed",
    tenantId: 7,
    organization: {
      revision: 91,
      scopeContactIds: [],
      tags: [{ id: 5, name: "Priority", contactCount: 0 }],
      lists: [],
      tagAssignments: [],
      listMemberships: [],
    },
  });
  assert.deepEqual(fixture.calls.options, [
    { isolationLevel: "read-committed" },
  ]);
  assert.deepEqual(fixture.calls.locks, [{ sql: postgresRailwayContactOrganizationMutationSql.lockTenant, parameters: [7] }]);
  assert.equal(fixture.calls.committed, 1);
  assert.equal(fixture.calls.rolledBack, 0);
  assert.deepEqual(fixture.calls.queries[0].parameters, [
    7,
    "contacts.organization.tag.save",
    idempotencyKey,
    requestDigest,
    "verified-user",
  ]);
  assert.deepEqual(fixture.calls.queries[1].parameters, [
    7,
    "Priority",
    "priority",
  ]);
  assert.deepEqual(fixture.calls.queries[5].parameters.slice(0, 6), [
    7,
    "verified-user",
    "contacts.organization.tag.save",
    "contact_tag",
    "priority",
    idempotencyKey,
  ]);
  assert.deepEqual(
    JSON.parse(fixture.calls.queries[6].parameters[4]),
    saved.organization,
  );
  assert.equal(fixture.queue.length, 0);
});

test("sets a relationship and returns one-contact organization scope", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([{ revision: "91" }]),
    result([{ found: true }]),
    result([{ revision: "91" }]),
    result([{ id: "5", name: "Priority", contactCount: "1" }]),
    result([]),
    result([{ contactId: "23", groupId: "5" }]),
    result([]),
    result([{ id: "92" }]),
    result([{ idempotencyKey }]),
  ]);
  const saved = await createPostgresRailwayContactOrganizationMutationExecutor(
    fixture.manager,
  ).execute(command(
    "contacts.organization.tag-assignment",
    { contactId: 23, groupId: 5, assigned: true, expectedRevision: 91 },
  ));

  assert.equal(saved.outcome, "committed");
  assert.deepEqual(saved.organization.scopeContactIds, [23]);
  assert.deepEqual(saved.organization.tagAssignments, [
    { contactId: 23, tagId: 5 },
  ]);
  assert.match(
    fixture.calls.queries[2].sql,
    /INSERT INTO contact_tag_assignments/,
  );
  assert.deepEqual(fixture.calls.queries[8].parameters.slice(3, 5), [
    "contact_tag_assignment",
    "23:5",
  ]);
});

test("replays the receipt with current groups without another domain or audit write", async () => {
  const stored = {
    scopeContactIds: [],
    tags: [],
    lists: [{ id: 8, name: "Pilot", contactCount: 0 }],
    tagAssignments: [],
    listMemberships: [],
  };
  const fixture = transactionFixture([
    result([], 0),
    result([{
      requestDigest,
      status: "completed",
      responseJson: JSON.stringify(stored),
    }]),
    result([{ revision: "94" }]),
    result([{ id: "5", name: "Added later", contactCount: "0" }]),
    result([{ id: "8", name: "Pilot", contactCount: "0" }]),
  ]);
  const replayed = await createPostgresRailwayContactOrganizationMutationExecutor(
    fixture.manager,
  ).execute(command(
    "contacts.organization.list.save",
    { name: "Pilot" },
  ));

  assert.deepEqual(replayed, {
    outcome: "replayed",
    tenantId: 7,
    organization: {
      ...stored,
      revision: 94,
      tags: [{ id: 5, name: "Added later", contactCount: 0 }],
    },
  });
  assert.equal(fixture.calls.queries.length, 5);
  assert.equal(fixture.queue.length, 0);
  assert.equal(
    fixture.calls.queries[1].sql,
    postgresRailwayContactOrganizationMutationSql.lockReceipt,
  );
});

test("replays relationship receipts using the current contact scope and assignments", async () => {
  const stored = {
    scopeContactIds: [23],
    tags: [{ id: 5, name: "Priority", contactCount: 1 }],
    lists: [],
    tagAssignments: [{ contactId: 23, tagId: 5 }],
    listMemberships: [],
  };
  const fixture = transactionFixture([
    result([]),
    result([{ requestDigest, status: "completed", responseJson: stored }]),
    result([{ revision: "95" }]),
    result([{ id: "5", name: "Priority", contactCount: "0" }]),
    result([]),
    result([]),
    result([]),
  ]);
  const replayed = await createPostgresRailwayContactOrganizationMutationExecutor(
    fixture.manager,
  ).execute(command("contacts.organization.tag-assignment", {
    contactId: 23, groupId: 5, assigned: true,
  }));
  assert.equal(replayed.outcome, "replayed");
  assert.deepEqual(replayed.organization.scopeContactIds, [23]);
  assert.deepEqual(replayed.organization.tagAssignments, []);
  assert.equal(replayed.organization.tags[0].contactCount, 0);
  assert.equal(fixture.queue.length, 0);
  for (const query of fixture.calls.queries.slice(2)) {
    assert.match(query.sql, /^\s*SELECT/);
    assert.equal(query.parameters[0], session.tenantId);
  }
});

test("fails closed if the current replay snapshot cannot be read", async () => {
  const fixture = transactionFixture([
    result([]),
    result([{ requestDigest, status: "completed", responseJson: {
      scopeContactIds: [], tags: [], lists: [], tagAssignments: [], listMemberships: [],
    } }]),
    new Error("database read unavailable"),
    result([]),
  ]);
  const replayed = await createPostgresRailwayContactOrganizationMutationExecutor(
    fixture.manager,
  ).execute(command("contacts.organization.tag.save", { name: "Priority" }));
  assert.equal(replayed.outcome, "unavailable");
  assert.equal(replayed.organization, null);
});

test("separates conflict, missing target, and unavailable outcomes", async () => {
  const conflict = transactionFixture([
    result([], 0),
    result([{
      requestDigest: `railway_mutation_request_v1_${"c".repeat(64)}`,
      status: "completed",
      responseJson: null,
    }]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayContactOrganizationMutationExecutor(
      conflict.manager,
    ).execute(command(
      "contacts.organization.list.save",
      { name: "Pilot" },
    )),
    { outcome: "conflict", tenantId: null, organization: null },
  );

  const missing = transactionFixture([
    result([{ idempotencyKey }]),
    result([{ revision: "0" }]),
    result([{ found: false }]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayContactOrganizationMutationExecutor(
      missing.manager,
    ).execute(command(
      "contacts.organization.list-membership",
      { contactId: 23, groupId: 8, assigned: true, expectedRevision: 0 },
    )),
    { outcome: "not-found", tenantId: null, organization: null },
  );
  assert.equal(missing.calls.rolledBack, 1);

  const malformed = transactionFixture([
    result([{ idempotencyKey }]),
    result([{ id: "5", name: " Priority ", contactCount: "0" }]),
  ]);
  assert.deepEqual(
    await createPostgresRailwayContactOrganizationMutationExecutor(
      malformed.manager,
    ).execute(command(
      "contacts.organization.tag.save",
      { name: "Priority" },
    )),
    { outcome: "unavailable", tenantId: null, organization: null },
  );
});

test("rejects invalid commands before opening a transaction", async () => {
  const fixture = transactionFixture([]);
  const executor = createPostgresRailwayContactOrganizationMutationExecutor(
    fixture.manager,
  );
  const invalid = [
    ...[-1, 0.5, "1", null, undefined, Number.MAX_SAFE_INTEGER + 1].map(expectedRevision =>
      command("contacts.organization.tag-assignment", { contactId: 23, groupId: 5, assigned: true, expectedRevision })),
    command("contacts.organization.tag.save", { name: " Priority " }),
    command("contacts.organization.tag.save", { name: "A".repeat(129) }),
    command("contacts.organization.tag-assignment", {
      contactId: 0,
      groupId: 5,
      assigned: true,
    }),
    command("contacts.organization.tag-assignment", {
      contactId: 23,
      groupId: 5,
      assigned: true,
      tenantId: 11,
    }),
    command("contacts.organization.list.save", { name: "Pilot" }, {
      idempotencyKey: "invalid",
    }),
  ];

  for (const candidate of invalid) {
    assert.deepEqual(await executor.execute(candidate), {
      outcome: "unavailable",
      tenantId: null,
      organization: null,
    });
  }

  assert.deepEqual(fixture.calls.options, []);
});

test("freezes receipt and audit SQL without randomized identifiers", () => {
  assert.equal(
    Object.isFrozen(postgresRailwayContactOrganizationMutationSql),
    true,
  );
  assert.match(
    postgresRailwayContactOrganizationMutationSql.claimReceipt,
    /ON CONFLICT \(tenant_id, operation, idempotency_key\)/,
  );
  assert.match(
    postgresRailwayContactOrganizationMutationSql.lockReceipt,
    /FOR UPDATE/,
  );
  assert.match(
    postgresRailwayContactOrganizationMutationSql.insertAudit,
    /audit_logs/,
  );
  assert.doesNotMatch(
    Object.values(postgresRailwayContactOrganizationMutationSql).join("\n"),
    /Math\.random|randomUUID/,
  );
});

test("rejects a missing PostgreSQL transaction manager", () => {
  assert.throws(
    () => createPostgresRailwayContactOrganizationMutationExecutor({}),
    /transaction manager is invalid/,
  );
});

for (const operation of ["contacts.organization.tag-assignment", "contacts.organization.list-membership"]) {
  test(`${operation} rolls back a stale revision before domain or audit writes`, async () => {
    const fixture = transactionFixture([
      result([{ idempotencyKey }]), result([{ revision: "92" }]),
    ]);
    const outcome = await createPostgresRailwayContactOrganizationMutationExecutor(fixture.manager)
      .execute(command(operation, { contactId: 23, groupId: 5, assigned: true, expectedRevision: 91 }));
    assert.deepEqual(outcome, { outcome: "conflict", tenantId: null, organization: null });
    assert.equal(fixture.calls.rolledBack, 1);
    assert.equal(fixture.calls.committed, 0);
    assert.equal(fixture.calls.queries.length, 2);
    assert.match(fixture.calls.queries[1].sql, /SELECT COALESCE/);
    assert.equal(fixture.queue.length, 0);
  });
}

for (const operation of ["contacts.organization.tag-assignment", "contacts.organization.list-membership"]) {
  test(`${operation} rejects a newly claimed legacy request without a revision`, async () => {
    const fixture = transactionFixture([result([{ idempotencyKey }])]);
    const outcome = await createPostgresRailwayContactOrganizationMutationExecutor(fixture.manager)
      .execute(command(operation, { contactId: 23, groupId: 5, assigned: true }));
    assert.deepEqual(outcome, { outcome: "conflict", tenantId: null, organization: null });
    assert.equal(fixture.calls.rolledBack, 1);
    assert.equal(fixture.calls.committed, 0);
    assert.equal(fixture.calls.queries.length, 1);
    assert.equal(fixture.queue.length, 0);
  });
}
