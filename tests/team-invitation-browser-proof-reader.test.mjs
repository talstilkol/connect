import assert from "node:assert/strict";
import {
  DatabaseSync,
} from "node:sqlite";
import test from "node:test";

import {
  createTeamInvitationBrowserProofReader,
  TeamInvitationBrowserProofReaderError,
} from "../db/teamInvitationBrowserProofReader.ts";

const invitationKey =
  `team_invitation_v1_${"a".repeat(64)}`;

class SqliteStatement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return (
      this.statement.get(
        ...this.values,
      ) ?? null
    );
  }
}

class SqliteD1 {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteStatement(
      this.database.prepare(sql),
    );
  }
}

function createSqliteProofDatabase() {
  const database =
    new DatabaseSync(":memory:");

  database.exec(`
    CREATE TABLE team_invitations (
      tenant_id INTEGER NOT NULL,
      invitation_key TEXT NOT NULL UNIQUE
    );
    CREATE TABLE tenant_memberships (
      tenant_id INTEGER NOT NULL,
      external_user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      UNIQUE (tenant_id, external_user_id)
    );
    CREATE TABLE team_invitation_acceptances (
      tenant_id INTEGER NOT NULL,
      invitation_key TEXT NOT NULL UNIQUE,
      external_user_id TEXT NOT NULL
    );
  `);

  return {
    database,
    d1: new SqliteD1(database),
  };
}

function fixture(options = {}) {
  const calls = [];
  const database = {
    prepare(sql) {
      calls.push({ sql });

      if (options.prepareError) {
        throw options.prepareError;
      }

      return {
        bind(...values) {
          calls.at(-1).values = values;
          return this;
        },
        async first() {
          if (options.firstError) {
            throw options.firstError;
          }

          return Object.hasOwn(
            options,
            "row",
          )
            ? options.row
            : {
            invitationCount: 1,
            membershipCount: 0,
            activeMembershipCount: 0,
            acceptanceAuditCount: 0,
          };
        },
      };
    },
  };

  return {
    calls,
    reader:
      createTeamInvitationBrowserProofReader(
        database,
      ),
  };
}

test("reads one external-user proof through a single read-only statement", async () => {
  const testFixture = fixture({
    row: {
      invitationCount: 1,
      membershipCount: 1,
      activeMembershipCount: 1,
      acceptanceAuditCount: 1,
    },
  });
  const result =
    await testFixture.reader.read({
      invitationKey,
      scope: {
        kind: "external-user",
        externalUserId:
          "staging-user-scope",
      },
    });

  assert.deepEqual(result, {
    invitationCount: 1,
    membershipCount: 1,
    activeMembershipCount: 1,
    acceptanceAuditCount: 1,
  });
  assert.deepEqual(
    testFixture.calls[0].values,
    [
      invitationKey,
      "staging-user-scope",
    ],
  );
  assert.match(
    testFixture.calls[0].sql,
    /^\s*WITH target_invitation AS/,
  );
  assert.doesNotMatch(
    testFixture.calls[0].sql,
    /\b(?:INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE)\b/i,
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /invitationKey|externalUserId|tenantId|email/i,
  );
});

test("supports a tenant-total baseline without accepting an external identity", async () => {
  const testFixture = fixture({
    row: {
      invitationCount: 1,
      membershipCount: 8,
      activeMembershipCount: 7,
      acceptanceAuditCount: 0,
    },
  });

  assert.deepEqual(
    await testFixture.reader.read({
      invitationKey,
      scope: {
        kind: "tenant-total",
      },
    }),
    {
      invitationCount: 1,
      membershipCount: 8,
      activeMembershipCount: 7,
      acceptanceAuditCount: 0,
    },
  );
  assert.deepEqual(
    testFixture.calls[0].values,
    [invitationKey],
  );
});

test("executes both proof scopes against SQLite-compatible D1 data", async () => {
  const { database, d1 } =
    createSqliteProofDatabase();

  database.prepare(
    `INSERT INTO team_invitations
      (tenant_id, invitation_key)
    VALUES (?, ?)`,
  ).run(1, invitationKey);
  database.prepare(
    `INSERT INTO tenant_memberships
      (tenant_id, external_user_id, status)
    VALUES (?, ?, ?)`,
  ).run(
    1,
    "staging-user-scope",
    "active",
  );
  database.prepare(
    `INSERT INTO tenant_memberships
      (tenant_id, external_user_id, status)
    VALUES (?, ?, ?)`,
  ).run(
    1,
    "staging-existing-scope",
    "suspended",
  );
  database.prepare(
    `INSERT INTO team_invitation_acceptances
      (tenant_id, invitation_key, external_user_id)
    VALUES (?, ?, ?)`,
  ).run(
    1,
    invitationKey,
    "staging-user-scope",
  );

  const reader =
    createTeamInvitationBrowserProofReader(
      d1,
    );

  assert.deepEqual(
    await reader.read({
      invitationKey,
      scope: {
        kind: "external-user",
        externalUserId:
          "staging-user-scope",
      },
    }),
    {
      invitationCount: 1,
      membershipCount: 1,
      activeMembershipCount: 1,
      acceptanceAuditCount: 1,
    },
  );
  assert.deepEqual(
    await reader.read({
      invitationKey,
      scope: {
        kind: "tenant-total",
      },
    }),
    {
      invitationCount: 1,
      membershipCount: 2,
      activeMembershipCount: 1,
      acceptanceAuditCount: 1,
    },
  );

  database.close();
});

test("rejects malformed and extended proof requests before D1 access", async () => {
  const inputs = [
    null,
    {},
    {
      invitationKey: "invalid",
      scope: {
        kind: "tenant-total",
      },
    },
    {
      invitationKey,
      scope: {
        kind: "tenant-total",
        externalUserId: "forbidden",
      },
    },
    {
      invitationKey,
      scope: {
        kind: "external-user",
        externalUserId: "",
      },
    },
    {
      invitationKey,
      scope: {
        kind: "external-user",
        externalUserId: "bounded",
      },
      tenantId: 1,
    },
  ];

  for (const input of inputs) {
    const testFixture = fixture();

    await assert.rejects(
      () =>
        testFixture.reader.read(input),
      (error) =>
        error instanceof
          TeamInvitationBrowserProofReaderError &&
        error.code === "INVALID_INPUT",
    );
    assert.deepEqual(
      testFixture.calls,
      [],
    );
  }
});

test("fails closed for malformed or excessive D1 counts", async () => {
  const rows = [
    null,
    {
      invitationCount: "1",
      membershipCount: 0,
      activeMembershipCount: 0,
      acceptanceAuditCount: 0,
    },
    {
      invitationCount: 1,
      membershipCount: 0,
      activeMembershipCount: 1,
      acceptanceAuditCount: 0,
    },
    {
      invitationCount: 2,
      membershipCount: 0,
      activeMembershipCount: 0,
      acceptanceAuditCount: 0,
    },
    {
      invitationCount: 1,
      membershipCount: 10_001,
      activeMembershipCount: 0,
      acceptanceAuditCount: 0,
    },
    {
      invitationCount: 1,
      membershipCount: 0,
      activeMembershipCount: 0,
      acceptanceAuditCount: 0,
      privateRow: "forbidden",
    },
  ];

  for (const row of rows) {
    await assert.rejects(
      () =>
        fixture({ row }).reader.read({
          invitationKey,
          scope: {
            kind: "tenant-total",
          },
        }),
      (error) =>
        error instanceof
          TeamInvitationBrowserProofReaderError &&
        error.code ===
          "PERSISTENCE_INVALID",
    );
  }
});

test("maps D1 failures to one bounded unavailable error", async () => {
  for (
    const options of [
      {
        prepareError:
          new Error("private prepare"),
      },
      {
        firstError:
          new Error("private read"),
      },
    ]
  ) {
    await assert.rejects(
      () =>
        fixture(options).reader.read({
          invitationKey,
          scope: {
            kind: "tenant-total",
          },
        }),
      (error) =>
        error instanceof
          TeamInvitationBrowserProofReaderError &&
        error.code ===
          "PERSISTENCE_UNAVAILABLE" &&
        error.message ===
          "PERSISTENCE_UNAVAILABLE",
    );
  }
});
