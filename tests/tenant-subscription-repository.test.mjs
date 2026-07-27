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
  createTenantSubscriptionRepository,
} from "../db/tenantSubscriptionRepository.ts";

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
      this.statement.get(...this.values) ??
      null
    );
  }

  async all() {
    return {
      success: true,
      results: this.statement.all(
        ...this.values,
      ),
    };
  }

  async run() {
    const result = this.statement.run(
      ...this.values,
    );

    return {
      success: true,
      meta: {
        changes: Number(result.changes),
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

    this.database.exec("BEGIN IMMEDIATE");

    try {
      for (const statement of statements) {
        results.push(await statement.run());
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
  const migrationDirectory = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrationFiles = (
    await readdir(migrationDirectory)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();
  const database = new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON");

  for (const fileName of migrationFiles) {
    const migration = await readFile(
      new URL(fileName, migrationDirectory),
      "utf8",
    );

    for (const statement of migration.split(
      "--> statement-breakpoint",
    )) {
      if (statement.trim()) {
        database.exec(statement);
      }
    }
  }

  database
    .prepare(
      `INSERT INTO tenants
        (display_name, status)
       VALUES (?, 'trial')`,
    )
    .run("tenant-one");
  database
    .prepare(
      `INSERT INTO tenants
        (display_name, status)
       VALUES (?, 'trial')`,
    )
    .run("tenant-two");

  return {
    database,
    repository:
      createTenantSubscriptionRepository(
        new SqliteD1Database(database),
      ),
  };
}

const startsAt =
  "2026-08-01T00:00:00.000Z";
const firstEndsAt =
  "2026-09-01T00:00:00.000Z";
const extendedEndsAt =
  "2026-10-01T00:00:00.000Z";
const actorExternalUserId =
  "system-admin-external-id";

test("creates, extends, changes, and cancels one subscription atomically with tenant status and history", async () => {
  const fixture = await createFixture();
  const created =
    await fixture.repository.create({
      tenantId: 1,
      status: "active",
      startsAt,
      endsAt: firstEndsAt,
      actorExternalUserId,
      occurredAt:
        "2026-07-26T12:00:00.000Z",
    });

  assert.equal(created.outcome, "created");
  assert.equal(
    created.subscription.version,
    1,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT status FROM tenants WHERE id = 1",
      )
      .get().status,
    "active",
  );

  const extended =
    await fixture.repository.extend({
      tenantId: 1,
      expectedVersion: 1,
      newEndsAt: extendedEndsAt,
      actorExternalUserId,
      occurredAt:
        "2026-08-15T08:00:00.000Z",
    });
  const suspended =
    await fixture.repository.changeStatus({
      tenantId: 1,
      expectedVersion: 2,
      status: "suspended",
      actorExternalUserId,
      occurredAt:
        "2026-08-20T08:00:00.000Z",
    });
  const cancelled =
    await fixture.repository.cancel({
      tenantId: 1,
      expectedVersion: 3,
      actorExternalUserId,
      occurredAt:
        "2026-08-21T08:00:00.000Z",
    });

  assert.equal(extended.outcome, "updated");
  assert.equal(
    extended.subscription.endsAt,
    extendedEndsAt,
  );
  assert.equal(suspended.outcome, "updated");
  assert.equal(
    suspended.subscription.status,
    "suspended",
  );
  assert.equal(cancelled.outcome, "updated");
  assert.deepEqual(
    {
      status:
        cancelled.subscription.status,
      cancelledAt:
        cancelled.subscription.cancelledAt,
      version:
        cancelled.subscription.version,
    },
    {
      status: "cancelled",
      cancelledAt:
        "2026-08-21T08:00:00.000Z",
      version: 4,
    },
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT status FROM tenants WHERE id = 1",
      )
      .get().status,
    "cancelled",
  );

  const events =
    await fixture.repository.listEvents(1);

  assert.deepEqual(
    events.map((event) => ({
      eventType: event.eventType,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      version:
        event.subscriptionVersion,
    })),
    [
      {
        eventType: "cancelled",
        fromStatus: "suspended",
        toStatus: "cancelled",
        version: 4,
      },
      {
        eventType: "status-changed",
        fromStatus: "active",
        toStatus: "suspended",
        version: 3,
      },
      {
        eventType: "extended",
        fromStatus: "active",
        toStatus: "active",
        version: 2,
      },
      {
        eventType: "created",
        fromStatus: null,
        toStatus: "active",
        version: 1,
      },
    ],
  );
  const auditRows =
    fixture.database
      .prepare(
        `SELECT
          actor_external_user_id AS actorExternalUserId,
          action,
          target_type AS targetType,
          target_id AS targetId,
          idempotency_key AS idempotencyKey,
          metadata_json AS metadataJson
         FROM audit_logs
         WHERE tenant_id = 1
         ORDER BY id`,
      )
      .all();

  assert.deepEqual(
    auditRows.map((row) => ({
      actorExternalUserId:
        row.actorExternalUserId,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      metadataJson: row.metadataJson,
    })),
    [
      "created",
      "extended",
      "status_changed",
      "cancelled",
    ].map((operation) => ({
      actorExternalUserId,
      action: `subscription.${operation}`,
      targetType:
        "tenant_subscription",
      targetId: "1",
      metadataJson: null,
    })),
  );
  assert.equal(
    new Set(
      auditRows.map(
        (row) => row.idempotencyKey,
      ),
    ).size,
    4,
  );
  assert.equal(
    await fixture.repository.findByTenantId(
      2,
    ),
    null,
  );
});

test("keeps an identical creation retry idempotent", async () => {
  const fixture = await createFixture();
  const input = {
    tenantId: 1,
    status: "trial",
    startsAt,
    endsAt: firstEndsAt,
    actorExternalUserId,
    occurredAt:
      "2026-07-26T12:00:00.000Z",
  };

  const first =
    await fixture.repository.create(input);
  const repeated =
    await fixture.repository.create({
      ...input,
      occurredAt:
        "2026-07-26T12:05:00.000Z",
    });

  assert.equal(first.outcome, "created");
  assert.equal(
    repeated.outcome,
    "unchanged",
  );
  assert.equal(
    (
      await fixture.repository.listEvents(
        1,
      )
    ).length,
    1,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM audit_logs WHERE tenant_id = 1",
      )
      .get().count,
    1,
  );
});

test("rejects stale versions, shorter extensions, and terminal transitions without partial writes", async () => {
  const fixture = await createFixture();

  await fixture.repository.create({
    tenantId: 1,
    status: "active",
    startsAt,
    endsAt: firstEndsAt,
    actorExternalUserId,
    occurredAt:
      "2026-07-26T12:00:00.000Z",
  });

  const shorter =
    await fixture.repository.extend({
      tenantId: 1,
      expectedVersion: 1,
      newEndsAt:
        "2026-08-15T00:00:00.000Z",
      actorExternalUserId,
      occurredAt:
        "2026-08-01T00:00:00.000Z",
    });
  const stale =
    await fixture.repository.changeStatus({
      tenantId: 1,
      expectedVersion: 2,
      status: "blocked",
      actorExternalUserId,
      occurredAt:
        "2026-08-01T00:00:00.000Z",
    });

  assert.equal(
    shorter.outcome,
    "invalid-transition",
  );
  assert.equal(stale.outcome, "conflict");

  const cancelled =
    await fixture.repository.cancel({
      tenantId: 1,
      expectedVersion: 1,
      actorExternalUserId,
      occurredAt:
        "2026-08-02T00:00:00.000Z",
    });
  const afterCancellation =
    await fixture.repository.extend({
      tenantId: 1,
      expectedVersion: 2,
      newEndsAt: extendedEndsAt,
      actorExternalUserId,
      occurredAt:
        "2026-08-03T00:00:00.000Z",
    });

  assert.equal(
    cancelled.outcome,
    "updated",
  );
  assert.equal(
    afterCancellation.outcome,
    "invalid-transition",
  );
  assert.equal(
    (
      await fixture.repository.listEvents(
        1,
      )
    ).length,
    2,
  );
});

test("does not create a subscription for an unknown tenant", async () => {
  const fixture = await createFixture();
  const result =
    await fixture.repository.create({
      tenantId: 999,
      status: "active",
      startsAt,
      endsAt: firstEndsAt,
      actorExternalUserId,
      occurredAt:
        "2026-07-26T12:00:00.000Z",
    });

  assert.deepEqual(result, {
    outcome: "not-found",
    subscription: null,
  });
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM tenant_subscription_events",
      )
      .get().count,
    0,
  );
});
