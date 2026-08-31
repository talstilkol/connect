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
  createSystemAdminBusinessProfileRepository,
} from "../db/systemAdminBusinessProfileRepository.ts";

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
  const database = new DatabaseSync(
    ":memory:",
  );

  database.exec("PRAGMA foreign_keys = ON");

  for (const fileName of migrationFiles) {
    const migration = await readFile(
      new URL(
        fileName,
        migrationDirectory,
      ),
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
    .run("Original Business");
  database
    .prepare(
      `INSERT INTO business_profiles (
        tenant_id,
        business_name,
        timezone,
        interface_language
      )
      VALUES (1, ?, ?, ?)`,
    )
    .run(
      "Original Business",
      "Asia/Jerusalem",
      "he",
    );

  return {
    database,
    repository:
      createSystemAdminBusinessProfileRepository(
        new SqliteD1Database(database),
      ),
  };
}

const actorExternalUserId =
  "system-admin-external-id";
const occurredAt =
  "2026-08-16T12:00:00.000Z";
const updatedProfile = {
  businessName: "Updated Business",
  timezone: "Europe/London",
  interfaceLanguage: "en",
};

test("updates the profile, tenant display name, immutable event, and audit atomically", async () => {
  const fixture = await createFixture();
  const result =
    await fixture.repository.update({
      tenantId: 1,
      expectedVersion: 1,
      ...updatedProfile,
      actorExternalUserId,
      occurredAt,
    });

  assert.equal(result.outcome, "updated");
  assert.deepEqual(
    {
      businessName:
        result.profile.businessName,
      timezone: result.profile.timezone,
      interfaceLanguage:
        result.profile.interfaceLanguage,
      version: result.profile.version,
      updatedAt: result.profile.updatedAt,
    },
    {
      ...updatedProfile,
      version: 2,
      updatedAt: occurredAt,
    },
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT display_name AS displayName FROM tenants WHERE id = 1",
      )
      .get().displayName,
    updatedProfile.businessName,
  );

  const event = fixture.database
    .prepare(
      `SELECT
        event_key AS eventKey,
        previous_profile_digest AS previousProfileDigest,
        new_profile_digest AS newProfileDigest,
        changed_fields AS changedFields,
        actor_external_user_id AS actorExternalUserId,
        profile_version AS profileVersion,
        occurred_at AS occurredAt
       FROM business_profile_admin_events
       WHERE tenant_id = 1`,
    )
    .get();

  assert.match(
    event.eventKey,
    /^business_profile_admin_event_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    event.previousProfileDigest,
    /^[0-9a-f]{64}$/,
  );
  assert.match(
    event.newProfileDigest,
    /^[0-9a-f]{64}$/,
  );
  assert.notEqual(
    event.previousProfileDigest,
    event.newProfileDigest,
  );
  assert.deepEqual(
    {
      changedFields:
        event.changedFields,
      actorExternalUserId:
        event.actorExternalUserId,
      profileVersion:
        event.profileVersion,
      occurredAt: event.occurredAt,
    },
    {
      changedFields:
        "businessName,timezone,interfaceLanguage",
      actorExternalUserId,
      profileVersion: 2,
      occurredAt,
    },
  );

  const audit = fixture.database
    .prepare(
      `SELECT
        action,
        target_type AS targetType,
        target_id AS targetId,
        actor_external_user_id AS actorExternalUserId,
        idempotency_key AS idempotencyKey,
        metadata_json AS metadataJson
       FROM audit_logs
       WHERE tenant_id = 1`,
    )
    .get();

  assert.deepEqual({ ...audit }, {
    action: "business_profile.updated",
    targetType: "business_profile",
    targetId: "1",
    actorExternalUserId,
    idempotencyKey: event.eventKey,
    metadataJson: null,
  });
  assert.throws(
    () =>
      fixture.database
        .prepare(
          "UPDATE business_profile_admin_events SET changed_fields = 'timezone' WHERE tenant_id = 1",
        )
        .run(),
    /immutable/,
  );
  assert.throws(
    () =>
      fixture.database
        .prepare(
          "DELETE FROM business_profile_admin_events WHERE tenant_id = 1",
        )
        .run(),
    /immutable/,
  );
});

test("keeps an identical retry idempotent and rejects a different stale update", async () => {
  const fixture = await createFixture();
  const input = {
    tenantId: 1,
    expectedVersion: 1,
    ...updatedProfile,
    actorExternalUserId,
    occurredAt,
  };

  const first =
    await fixture.repository.update(input);
  const retry =
    await fixture.repository.update({
      ...input,
      occurredAt:
        "2026-08-16T12:05:00.000Z",
    });
  const stale =
    await fixture.repository.update({
      ...input,
      businessName:
        "Conflicting Business",
      occurredAt:
        "2026-08-16T12:10:00.000Z",
    });

  assert.equal(first.outcome, "updated");
  assert.equal(
    retry.outcome,
    "unchanged",
  );
  assert.equal(stale.outcome, "conflict");
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM business_profile_admin_events",
      )
      .get().count,
    1,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM audit_logs",
      )
      .get().count,
    1,
  );
});

test("does not create audit for an unchanged profile or an unknown tenant", async () => {
  const fixture = await createFixture();
  const unchanged =
    await fixture.repository.update({
      tenantId: 1,
      expectedVersion: 1,
      businessName:
        "Original Business",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      actorExternalUserId,
      occurredAt,
    });
  const missing =
    await fixture.repository.update({
      tenantId: 999,
      expectedVersion: 1,
      ...updatedProfile,
      actorExternalUserId,
      occurredAt,
    });

  assert.equal(
    unchanged.outcome,
    "unchanged",
  );
  assert.equal(
    unchanged.profile.version,
    1,
  );
  assert.deepEqual(missing, {
    outcome: "not-found",
    profile: null,
  });
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM business_profile_admin_events",
      )
      .get().count,
    0,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM audit_logs",
      )
      .get().count,
    0,
  );
});

test("rejects malformed direct repository input before mutation", async () => {
  const fixture = await createFixture();

  await assert.rejects(
    fixture.repository.update({
      tenantId: 1,
      expectedVersion: 0,
      ...updatedProfile,
      actorExternalUserId,
      occurredAt,
    }),
    /version is invalid/,
  );
  await assert.rejects(
    fixture.repository.update({
      tenantId: 1,
      expectedVersion: 1,
      ...updatedProfile,
      timezone: "not-a-timezone",
      actorExternalUserId,
      occurredAt,
    }),
    /input is invalid/,
  );

  assert.equal(
    fixture.database
      .prepare(
        "SELECT version FROM business_profiles WHERE tenant_id = 1",
      )
      .get().version,
    1,
  );
});

test("database rejects an audit event that is not linked to the current profile version", async () => {
  const fixture = await createFixture();

  assert.throws(
    () =>
      fixture.database
        .prepare(
          `INSERT INTO business_profile_admin_events (
            event_key,
            tenant_id,
            previous_profile_digest,
            new_profile_digest,
            changed_fields,
            actor_external_user_id,
            profile_version,
            occurred_at
          ) VALUES (?, 1, ?, ?, 'businessName', ?, 2, ?)`,
        )
        .run(
          `business_profile_admin_event_v1_${"0".repeat(64)}`,
          "a".repeat(64),
          "b".repeat(64),
          actorExternalUserId,
          occurredAt,
        ),
    /not linked to current state/,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM business_profile_admin_events",
      )
      .get().count,
    0,
  );
  assert.equal(
    fixture.database
      .prepare(
        "SELECT count(*) AS count FROM audit_logs",
      )
      .get().count,
    0,
  );
});
