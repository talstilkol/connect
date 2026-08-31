import assert from "node:assert/strict";
import test from "node:test";

import {
  ContactOrganizationTargetNotFoundError,
} from "../db/contactOrganizationRepository.ts";
import {
  createPostgresContactOrganizationRepository,
  postgresContactOrganizationSql,
} from "../server/platform/postgresContactOrganizationRepository.ts";

function scriptedQueries(results) {
  const calls = [];
  let index = 0;

  return {
    calls,
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        const rows = results[index] ?? [];
        index += 1;
        return { rows, rowCount: rows.length };
      },
    },
  };
}

test("upserts tenant-scoped tags and lists through one returning statement", async () => {
  const fixture = scriptedQueries([
    [{ id: "11", name: "Priority", contactCount: "0" }],
    [{ id: "12", name: "Pilot", contactCount: "0" }],
  ]);
  const repository = createPostgresContactOrganizationRepository(
    fixture.queries,
  );

  assert.deepEqual(
    await repository.saveTag(7, "Priority", "priority"),
    { id: 11, name: "Priority", contactCount: 0 },
  );
  assert.deepEqual(
    await repository.saveList(7, "Pilot", "pilot"),
    { id: 12, name: "Pilot", contactCount: 0 },
  );
  assert.deepEqual(fixture.calls, [
    {
      sql: postgresContactOrganizationSql.upsertTag,
      parameters: [7, "Priority", "priority"],
    },
    {
      sql: postgresContactOrganizationSql.upsertList,
      parameters: [7, "Pilot", "pilot"],
    },
  ]);
  assert.match(
    postgresContactOrganizationSql.upsertTag,
    /ON CONFLICT \(tenant_id, normalized_name\)/,
  );
  assert.match(postgresContactOrganizationSql.upsertTag, /RETURNING id/);
});

test("reads group counts and only the requested contact relationships", async () => {
  const fixture = scriptedQueries([
    [{ id: "11", name: "Priority", contactCount: "1" }],
    [{ id: "12", name: "Pilot", contactCount: "1" }],
    [{ contactId: "23", groupId: "11" }],
    [{ contactId: "24", groupId: "12" }],
  ]);
  const repository = createPostgresContactOrganizationRepository(
    fixture.queries,
  );

  assert.deepEqual(await repository.readSnapshot(7, [23, 24]), {
    scopeContactIds: [23, 24],
    tags: [{ id: 11, name: "Priority", contactCount: 1 }],
    lists: [{ id: 12, name: "Pilot", contactCount: 1 }],
    tagAssignments: [{ contactId: 23, tagId: 11 }],
    listMemberships: [{ contactId: 24, listId: 12 }],
  });
  assert.equal(fixture.calls.length, 4);
  assert.deepEqual(fixture.calls[2].parameters, [7, 23, 24]);
  assert.deepEqual(fixture.calls[3].parameters, [7, 23, 24]);
  assert.match(fixture.calls[2].sql, /tenant_id = \$1/);
  assert.match(fixture.calls[2].sql, /contact_id IN \(\$2, \$3\)/);
  assert.match(fixture.calls[3].sql, /contact_id IN \(\$2, \$3\)/);
});

test("does not query relationships for an empty contact scope", async () => {
  const fixture = scriptedQueries([[], []]);

  assert.deepEqual(
    await createPostgresContactOrganizationRepository(
      fixture.queries,
    ).readSnapshot(7, []),
    {
      scopeContactIds: [],
      tags: [],
      lists: [],
      tagAssignments: [],
      listMemberships: [],
    },
  );
  assert.equal(fixture.calls.length, 2);
});

test("sets and removes relationships only after a same-tenant target exists", async () => {
  const fixture = scriptedQueries([
    [{ found: true }],
    [{ found: true }],
  ]);
  const repository = createPostgresContactOrganizationRepository(
    fixture.queries,
  );

  await repository.setTagAssignment(7, 23, 11, true);
  await repository.setListMembership(7, 23, 12, false);

  assert.deepEqual(
    fixture.calls.map(({ parameters }) => parameters),
    [
      [7, 23, 11],
      [7, 23, 12],
    ],
  );
  assert.match(
    fixture.calls[0].sql,
    /contact_group\.tenant_id = contact\.tenant_id/,
  );
  assert.match(fixture.calls[0].sql, /INSERT INTO contact_tag_assignments/);
  assert.match(fixture.calls[1].sql, /DELETE FROM contact_list_memberships/);
  assert.match(fixture.calls[1].sql, /EXISTS \(SELECT 1 FROM target\)/);
});

test("maps a missing or malformed relationship target fail-closed", async () => {
  await assert.rejects(
    createPostgresContactOrganizationRepository(
      scriptedQueries([[{ found: false }]]).queries,
    ).setTagAssignment(7, 23, 11, true),
    (error) => error instanceof ContactOrganizationTargetNotFoundError,
  );
  await assert.rejects(
    createPostgresContactOrganizationRepository(
      scriptedQueries([[{ found: 1 }]]).queries,
    ).setTagAssignment(7, 23, 11, true),
    /invalid relationship target/,
  );
  await assert.rejects(
    createPostgresContactOrganizationRepository(
      scriptedQueries([[]]).queries,
    ).setTagAssignment(7, 23, 11, true),
    /invalid relationship write/,
  );
});

test("rejects cross-scope and malformed snapshot rows", async () => {
  const invalidFixtures = [
    [
      [{ id: "11", name: "Priority", contactCount: "1" }],
      [],
      [{ contactId: "99", groupId: "11" }],
      [],
    ],
    [
      [{ id: "11", name: "Priority", contactCount: "1" }],
      [],
      [{ contactId: "23", groupId: "12" }],
      [],
    ],
    [
      [{ id: "11", name: " Priority ", contactCount: "1" }],
      [],
      [],
      [],
    ],
  ];

  for (const results of invalidFixtures) {
    await assert.rejects(
      createPostgresContactOrganizationRepository(
        scriptedQueries(results).queries,
      ).readSnapshot(7, [23]),
      /PostgreSQL returned|trimmed string/,
    );
  }
});

test("rejects invalid input and dependencies before PostgreSQL access", async () => {
  const fixture = scriptedQueries([]);
  const repository = createPostgresContactOrganizationRepository(
    fixture.queries,
  );

  await assert.rejects(
    repository.saveTag(0, "Priority", "priority"),
    /tenantId must be a positive integer/,
  );
  await assert.rejects(
    repository.saveTag(7, " Priority ", "priority"),
    /name must be a non-blank trimmed string/,
  );
  await assert.rejects(
    repository.readSnapshot(7, Array.from({ length: 51 }, (_, index) => index + 1)),
    /contactIds must not exceed 50/,
  );
  await assert.rejects(
    repository.setTagAssignment(7, 23, 11, "yes"),
    /assigned must be a boolean/,
  );
  assert.equal(fixture.calls.length, 0);
  assert.throws(
    () => createPostgresContactOrganizationRepository({}),
    /dependencies are invalid/,
  );
});
