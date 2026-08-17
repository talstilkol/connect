import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresContactReadRepository,
  postgresContactReadSql,
} from "../server/platform/postgresContactReadRepository.ts";

function contactRow(overrides = {}) {
  return {
    id: "23",
    tenantId: "7",
    phoneNumber: "+972501234567",
    firstName: "Tal",
    lastName: null,
    email: null,
    company: "Connect",
    mailingStatus: "unsubscribed",
    consentStatus: "unknown",
    consentSource: null,
    consentRecordedAt: null,
    consentWithdrawnAt: null,
    consentEvidenceReference: null,
    version: "1",
    createdAt: new Date("2026-08-17T08:00:00.000Z"),
    updatedAt: new Date("2026-08-17T08:00:00.000Z"),
    ...overrides,
  };
}

function queryFixture(rows) {
  const calls = [];
  return {
    calls,
    queries: {
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        return { rows, rowCount: rows.length };
      },
    },
  };
}

test("reads one bounded tenant page in descending keyset order", async () => {
  const fixture = queryFixture([
    contactRow(),
    contactRow({
      id: "22",
      phoneNumber: "+972501234568",
    }),
  ]);
  const repository = createPostgresContactReadRepository(
    fixture.queries,
  );

  const contacts = await repository.listPageByTenant(7, 24, 51);

  assert.deepEqual(
    contacts.map(({ id, tenantId, createdAt }) => ({
      id,
      tenantId,
      createdAt,
    })),
    [
      {
        id: 23,
        tenantId: 7,
        createdAt: "2026-08-17T08:00:00.000Z",
      },
      {
        id: 22,
        tenantId: 7,
        createdAt: "2026-08-17T08:00:00.000Z",
      },
    ],
  );
  assert.deepEqual(fixture.calls, [
    {
      sql: postgresContactReadSql.listPageByTenant,
      parameters: [7, 24, 51],
    },
  ]);
  assert.match(postgresContactReadSql.listPageByTenant, /tenant_id = \$1/);
  assert.match(postgresContactReadSql.listPageByTenant, /id < \$2/);
  assert.match(postgresContactReadSql.listPageByTenant, /ORDER BY id DESC/);
});

test("accepts a valid granted consent row", async () => {
  const fixture = queryFixture([
    contactRow({
      mailingStatus: "subscribed",
      consentStatus: "granted",
      consentSource: "whatsapp-opt-in",
      consentRecordedAt: new Date("2026-08-17T08:01:00.000Z"),
      consentEvidenceReference: "consent-evidence-v1",
    }),
  ]);

  const [contact] = await createPostgresContactReadRepository(
    fixture.queries,
  ).listPageByTenant(7, null, 50);

  assert.equal(contact.consentStatus, "granted");
  assert.equal(contact.mailingStatus, "subscribed");
  assert.equal(contact.consentRecordedAt, "2026-08-17T08:01:00.000Z");
});

test("rejects cross-tenant, cursor, duplicate, and unordered rows", async () => {
  const invalidPages = [
    [contactRow({ tenantId: "8" })],
    [contactRow({ id: "24" })],
    [contactRow(), contactRow()],
    [
      contactRow({ id: "22" }),
      contactRow({ id: "23", phoneNumber: "+972501234568" }),
    ],
  ];

  for (const rows of invalidPages) {
    await assert.rejects(
      createPostgresContactReadRepository(
        queryFixture(rows).queries,
      ).listPageByTenant(7, 24, 51),
      /invalid contact page/,
    );
  }
});

test("rejects malformed profile, consent, timeline, and row shape", async () => {
  const malformedRows = [
    contactRow({ phoneNumber: "0501234567" }),
    contactRow({ firstName: " Tal " }),
    contactRow({ mailingStatus: "subscribed" }),
    contactRow({ consentStatus: "granted" }),
    contactRow({
      createdAt: new Date("2026-08-17T08:02:00.000Z"),
      updatedAt: new Date("2026-08-17T08:01:00.000Z"),
    }),
    { ...contactRow(), unexpected: "field" },
  ];

  for (const row of malformedRows) {
    await assert.rejects(
      createPostgresContactReadRepository(
        queryFixture([row]).queries,
      ).listPageByTenant(7, null, 50),
      /PostgreSQL returned/,
    );
  }
});

test("rejects invalid input and excessive or malformed results", async () => {
  const repository = createPostgresContactReadRepository(
    queryFixture([]).queries,
  );

  await assert.rejects(
    repository.listPageByTenant(0, null, 50),
    /tenantId must be a positive integer/,
  );
  await assert.rejects(
    repository.listPageByTenant(7, 0, 50),
    /beforeContactId must be a positive integer/,
  );
  await assert.rejects(
    repository.listPageByTenant(7, null, 101),
    /limit must not exceed 100/,
  );

  await assert.rejects(
    createPostgresContactReadRepository({
      async query() {
        return { rows: [], rowCount: 1 };
      },
    }).listPageByTenant(7, null, 50),
    /invalid result/,
  );
  assert.throws(
    () => createPostgresContactReadRepository({}),
    /dependencies are invalid/,
  );
});
