import assert from "node:assert/strict";
import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  DatabaseSync,
} from "node:sqlite";
import test from "node:test";

import {
  createTenantMembershipMutationRepository,
} from "../db/tenantMembershipMutationRepository.ts";

class SqliteD1Statement {
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

  async all() {
    return {
      success: true,
      results:
        this.statement.all(
          ...this.values,
        ),
    };
  }

  async run() {
    const result =
      this.statement.run(
        ...this.values,
      );

    return {
      success: true,
      meta: {
        changes:
          Number(result.changes),
      },
    };
  }
}

class SqliteD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(
      this.database.prepare(sql),
    );
  }

  async batch(statements) {
    const results = [];

    this.database.exec(
      "BEGIN IMMEDIATE",
    );

    try {
      for (
        const statement of statements
      ) {
        results.push(
          await statement.run(),
        );
      }

      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

async function createFixture() {
  const migrationDirectory =
    new URL(
      "../drizzle/",
      import.meta.url,
    );
  const migrationFiles = (
    await readdir(
      migrationDirectory,
    )
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();
  const database =
    new DatabaseSync(":memory:");

  database.exec(
    "PRAGMA foreign_keys = ON",
  );

  for (
    const fileName of migrationFiles
  ) {
    const migration =
      await readFile(
        new URL(
          fileName,
          migrationDirectory,
        ),
        "utf8",
      );

    for (
      const statement of migration.split(
        "--> statement-breakpoint",
      )
    ) {
      if (statement.trim()) {
        database.exec(statement);
      }
    }
  }

  database.exec(`
    INSERT INTO tenants (
      id,
      display_name,
      status
    )
    VALUES
      (7, 'workspace', 'active'),
      (8, 'other-workspace', 'active');

    INSERT INTO tenant_memberships (
      tenant_id,
      external_user_id,
      role,
      status
    )
    VALUES
      (7, 'owner-user', 'owner', 'active'),
      (7, 'manager-user', 'manager', 'active'),
      (7, 'agent-user', 'agent', 'active'),
      (8, 'foreign-owner', 'owner', 'active');
  `);

  return {
    database,
    repository:
      createTenantMembershipMutationRepository(
        new SqliteD1Database(
          database,
        ),
      ),
  };
}

const actorExternalUserId =
  "owner-user";
const firstOccurredAt =
  "2026-08-05T09:00:00.000Z";

test("changes role and status with exact versions and immutable events", async () => {
  const fixture =
    await createFixture();
  const roleChanged =
    await fixture.repository.changeRole(
      {
        tenantId: 7,
        targetExternalUserId:
          "agent-user",
        expectedVersion: 1,
        toRole: "viewer",
        actorExternalUserId,
        occurredAt:
          firstOccurredAt,
      },
    );
  const suspended =
    await fixture.repository.changeStatus(
      {
        tenantId: 7,
        targetExternalUserId:
          "agent-user",
        expectedVersion: 2,
        toStatus: "suspended",
        actorExternalUserId,
        occurredAt:
          "2026-08-05T09:01:00.000Z",
      },
    );
  const repeated =
    await fixture.repository.changeStatus(
      {
        tenantId: 7,
        targetExternalUserId:
          "agent-user",
        expectedVersion: 2,
        toStatus: "suspended",
        actorExternalUserId,
        occurredAt:
          "2026-08-05T09:02:00.000Z",
      },
    );
  const reactivated =
    await fixture.repository.changeStatus(
      {
        tenantId: 7,
        targetExternalUserId:
          "agent-user",
        expectedVersion: 3,
        toStatus: "active",
        actorExternalUserId,
        occurredAt:
          "2026-08-05T09:03:00.000Z",
      },
    );

  assert.deepEqual(
    [
      roleChanged.outcome,
      suspended.outcome,
      repeated.outcome,
      reactivated.outcome,
    ],
    [
      "updated",
      "updated",
      "unchanged",
      "updated",
    ],
  );
  assert.deepEqual(
    {
      role:
        reactivated.membership.role,
      status:
        reactivated.membership.status,
      version:
        reactivated.membership.version,
    },
    {
      role: "viewer",
      status: "active",
      version: 4,
    },
  );

  const events =
    fixture.database
      .prepare(`
        SELECT
          event_type AS eventType,
          from_version AS fromVersion,
          to_version AS toVersion
        FROM tenant_membership_events
        WHERE tenant_id = 7
          AND target_external_user_id =
            'agent-user'
        ORDER BY to_version ASC
      `)
      .all()
      .map((row) => ({
        ...row,
      }));

  assert.deepEqual(events, [
    {
      eventType: "role-changed",
      fromVersion: 1,
      toVersion: 2,
    },
    {
      eventType: "suspended",
      fromVersion: 2,
      toVersion: 3,
    },
    {
      eventType: "reactivated",
      fromVersion: 3,
      toVersion: 4,
    },
  ]);
});

test("transfers ownership atomically and keeps exact retries idempotent", async () => {
  const fixture =
    await createFixture();
  const command = {
    tenantId: 7,
    formerOwnerExternalUserId:
      "owner-user",
    formerOwnerExpectedVersion: 1,
    newOwnerExternalUserId:
      "manager-user",
    newOwnerExpectedVersion: 1,
    formerOwnerRole: "manager",
    actorExternalUserId,
    occurredAt:
      firstOccurredAt,
  };
  const transferred =
    await fixture.repository.transferOwner(
      command,
    );
  const repeated =
    await fixture.repository.transferOwner(
      {
        ...command,
        occurredAt:
          "2026-08-05T09:05:00.000Z",
      },
    );

  assert.equal(
    transferred.outcome,
    "updated",
  );
  assert.equal(
    repeated.outcome,
    "unchanged",
  );
  assert.deepEqual(
    {
      formerRole:
        repeated.formerOwner.role,
      formerVersion:
        repeated.formerOwner.version,
      newRole:
        repeated.newOwner.role,
      newVersion:
        repeated.newOwner.version,
    },
    {
      formerRole: "manager",
      formerVersion: 2,
      newRole: "owner",
      newVersion: 2,
    },
  );
  assert.deepEqual(
    fixture.database
      .prepare(`
        SELECT
          event_type AS eventType
        FROM tenant_membership_events
        WHERE tenant_id = 7
        ORDER BY event_type ASC
      `)
      .all()
      .map((row) => row.eventType),
    [
      "owner-transfer-in",
      "owner-transfer-out",
    ],
  );
  assert.equal(
    fixture.database
      .prepare(`
        SELECT count(*) AS count
        FROM tenant_memberships
        WHERE tenant_id = 7
          AND role = 'owner'
          AND status = 'active'
      `)
      .get().count,
    1,
  );
});

test("rejects stale, owner, missing, and cross-tenant mutations without writes", async () => {
  const fixture =
    await createFixture();
  const stale =
    await fixture.repository.changeRole(
      {
        tenantId: 7,
        targetExternalUserId:
          "agent-user",
        expectedVersion: 2,
        toRole: "viewer",
        actorExternalUserId,
        occurredAt:
          firstOccurredAt,
      },
    );
  const ownerPromotion =
    await fixture.repository.changeRole(
      {
        tenantId: 7,
        targetExternalUserId:
          "agent-user",
        expectedVersion: 1,
        toRole: "owner",
        actorExternalUserId,
        occurredAt:
          firstOccurredAt,
      },
    );
  const missing =
    await fixture.repository.changeRole(
      {
        tenantId: 7,
        targetExternalUserId:
          "foreign-owner",
        expectedVersion: 1,
        toRole: "viewer",
        actorExternalUserId,
        occurredAt:
          firstOccurredAt,
      },
    );

  assert.equal(
    stale.outcome,
    "conflict",
  );
  assert.equal(
    ownerPromotion.outcome,
    "invalid-transition",
  );
  assert.equal(
    missing.outcome,
    "not-found",
  );
  assert.equal(
    fixture.database
      .prepare(`
        SELECT count(*) AS count
        FROM tenant_membership_events
      `)
      .get().count,
    0,
  );
});

test("rolls back the membership update when audit persistence fails", async () => {
  const fixture =
    await createFixture();

  fixture.database.exec(`
    CREATE TRIGGER reject_test_membership_event
    BEFORE INSERT
    ON tenant_membership_events
    BEGIN
      SELECT RAISE(
        ABORT,
        'test audit rejection'
      );
    END;
  `);

  await assert.rejects(
    fixture.repository.changeRole({
      tenantId: 7,
      targetExternalUserId:
        "agent-user",
      expectedVersion: 1,
      toRole: "viewer",
      actorExternalUserId,
      occurredAt:
        firstOccurredAt,
    }),
    /persistence failed/,
  );
  assert.deepEqual(
    {
      role:
        fixture.database
          .prepare(`
            SELECT role
            FROM tenant_memberships
            WHERE tenant_id = 7
              AND external_user_id =
                'agent-user'
          `)
          .get().role,
      eventCount:
        fixture.database
          .prepare(`
            SELECT count(*) AS count
            FROM tenant_membership_events
          `)
          .get().count,
    },
    {
      role: "agent",
      eventCount: 0,
    },
  );
});
