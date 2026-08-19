import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresCampaignAudienceRepository,
  postgresCampaignAudienceSql,
} from "../server/platform/postgresCampaignAudienceRepository.ts";

function audienceRow(overrides = {}) {
  return {
    tenantId: "7",
    contactId: "17",
    phoneNumber: "+972501234567",
    firstName: "Tal",
    lastName: null,
    email: "tal@example.com",
    company: "Connect",
    mailingStatus: "subscribed",
    consentStatus: "granted",
    version: "2",
    ...overrides,
  };
}

function queryFixture(results) {
  const pending = [...results];
  const calls = [];
  return {
    calls,
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        const next = pending.shift();
        if (next === undefined) throw new Error("Unexpected query");
        return next;
      },
    },
    assertConsumed() {
      assert.equal(pending.length, 0);
    },
  };
}

function result(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

test("reads one ordered eligible list audience inside the tenant", async () => {
  const database = queryFixture([
    result([
      audienceRow(),
      audienceRow({
        contactId: "18",
        phoneNumber: "+972501234568",
      }),
    ]),
  ]);
  const contacts = await createPostgresCampaignAudienceRepository(
    database.queries,
  ).listEligibleBySource(7, { kind: "list", listId: 11 }, 100_001);

  assert.deepEqual(contacts.map(({ contactId }) => contactId), [17, 18]);
  assert.equal(Object.isFrozen(contacts), true);
  assert.equal(Object.isFrozen(contacts[0]), true);
  assert.deepEqual(database.calls, [{
    sql: postgresCampaignAudienceSql.listEligibleBySource,
    parameters: [7, "list", 11, 100_001],
  }]);
  assert.match(
    postgresCampaignAudienceSql.listEligibleBySource,
    /contact\.tenant_id = \$1[\s\S]*contact\.mailing_status = 'subscribed'[\s\S]*contact\.consent_status = 'granted'/,
  );
  assert.match(
    postgresCampaignAudienceSql.listEligibleBySource,
    /contact_list\.tenant_id = membership\.tenant_id[\s\S]*tag\.tenant_id = assignment\.tenant_id/,
  );
  assert.match(
    postgresCampaignAudienceSql.listEligibleBySource,
    /ORDER BY contact\.id ASC[\s\S]*LIMIT \$4/,
  );
  database.assertConsumed();
});

test("uses an explicit zero group only for the complete audience", async () => {
  const database = queryFixture([result([]), result([])]);
  const repository = createPostgresCampaignAudienceRepository(
    database.queries,
  );

  await repository.listEligibleBySource(7, { kind: "all" }, 100);
  await repository.listEligibleBySource(7, { kind: "tag", tagId: 13 }, 100);

  assert.deepEqual(database.calls.map(({ parameters }) => parameters), [
    [7, "all", 0, 100],
    [7, "tag", 13, 100],
  ]);
  database.assertConsumed();
});

test("rejects malformed input before PostgreSQL access", async () => {
  const database = queryFixture([]);
  const repository = createPostgresCampaignAudienceRepository(
    database.queries,
  );

  await assert.rejects(
    repository.listEligibleBySource(0, { kind: "all" }, 100),
    /tenantId must be a positive integer/,
  );
  await assert.rejects(
    repository.listEligibleBySource(7, { kind: "list", listId: 0 }, 100),
    /query is invalid/,
  );
  await assert.rejects(
    repository.listEligibleBySource(7, { kind: "all", tagId: 13 }, 100),
    /query is invalid/,
  );
  await assert.rejects(
    repository.listEligibleBySource(7, { kind: "all" }, 100_002),
    /query is invalid/,
  );
  assert.equal(database.calls.length, 0);
});

test("fails closed for cross-tenant, ineligible, and malformed rows", async () => {
  for (const row of [
    audienceRow({ tenantId: "8" }),
    audienceRow({ consentStatus: "withdrawn" }),
    audienceRow({ mailingStatus: "unsubscribed" }),
    audienceRow({ phoneNumber: "0501234567" }),
    audienceRow({ firstName: 7 }),
    audienceRow({ unexpected: true }),
  ]) {
    const repository = createPostgresCampaignAudienceRepository(
      queryFixture([result([row])]).queries,
    );
    await assert.rejects(
      repository.listEligibleBySource(7, { kind: "all" }, 100),
      /cross-tenant|invalid campaign audience|invalid audience profile|invalid row shape/,
    );
  }
});

test("fails closed for duplicate, unordered, excessive, and invalid results", async () => {
  const invalidResults = [
    result([audienceRow(), audienceRow()]),
    result([
      audienceRow({ contactId: "18" }),
      audienceRow({ contactId: "17" }),
    ]),
    result([audienceRow()], 2),
    result([audienceRow(), audienceRow({ contactId: "18" })]),
  ];
  const limits = [100, 100, 100, 1];

  for (let index = 0; index < invalidResults.length; index += 1) {
    const repository = createPostgresCampaignAudienceRepository(
      queryFixture([invalidResults[index]]).queries,
    );
    await assert.rejects(
      repository.listEligibleBySource(
        7,
        { kind: "all" },
        limits[index],
      ),
      /unordered campaign audience|invalid result/,
    );
  }
});

test("rejects an invalid PostgreSQL dependency", () => {
  assert.throws(
    () => createPostgresCampaignAudienceRepository({}),
    /dependency is invalid/,
  );
});
