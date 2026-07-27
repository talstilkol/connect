import assert from "node:assert/strict";
import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  DatabaseSync,
} from "node:sqlite";
import test from "node:test";

const migrationsUrl =
  new URL(
    "../drizzle/",
    import.meta.url,
  );

async function applyMigration(
  database,
  fileName,
) {
  const migration = await readFile(
    new URL(fileName, migrationsUrl),
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

async function createFixture() {
  const migrationFiles = (
    await readdir(migrationsUrl)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql"),
    )
    .sort();
  const lifecycleMigration =
    "0022_tenant_membership_lifecycle.sql";
  const database =
    new DatabaseSync(":memory:");

  database.exec(
    "PRAGMA foreign_keys = ON",
  );

  for (const fileName of migrationFiles) {
    if (
      fileName ===
      lifecycleMigration
    ) {
      break;
    }

    await applyMigration(
      database,
      fileName,
    );
  }

  database.exec(`
    INSERT INTO tenants (
      id,
      display_name,
      status
    )
    VALUES (
      7,
      'workspace',
      'active'
    );

    INSERT INTO tenant_memberships (
      tenant_id,
      external_user_id,
      role,
      status
    )
    VALUES
      (
        7,
        'owner-user',
        'owner',
        'active'
      ),
      (
        7,
        'agent-user',
        'agent',
        'active'
      );
  `);

  await applyMigration(
    database,
    lifecycleMigration,
  );

  return database;
}

test("migrates every existing membership to version one with intact foreign keys", async () => {
  const database =
    await createFixture();
  const rows = database
    .prepare(`
      SELECT
        external_user_id AS externalUserId,
        version
      FROM tenant_memberships
      ORDER BY external_user_id ASC
    `)
    .all();

  assert.deepEqual(
    rows.map((row) => ({
      ...row,
    })),
    [
      {
        externalUserId:
          "agent-user",
        version: 1,
      },
      {
        externalUserId:
          "owner-user",
        version: 1,
      },
    ],
  );
  assert.deepEqual(
    database
      .prepare(
        "PRAGMA foreign_key_check",
      )
      .all(),
    [],
  );
});

test("requires exact membership versions and preserves one active owner", async () => {
  const database =
    await createFixture();

  assert.throws(
    () =>
      database.exec(`
        UPDATE tenant_memberships
        SET role = 'manager'
        WHERE tenant_id = 7
          AND external_user_id =
            'agent-user'
      `),
    /exact version transition/,
  );
  database.exec(`
    UPDATE tenant_memberships
    SET
      role = 'manager',
      version = 2
    WHERE tenant_id = 7
      AND external_user_id =
        'agent-user'
  `);
  assert.throws(
    () =>
      database.exec(`
        UPDATE tenant_memberships
        SET
          status = 'suspended',
          version = 2
        WHERE tenant_id = 7
          AND external_user_id =
            'owner-user'
      `),
    /at least one active owner/,
  );
  assert.throws(
    () =>
      database.exec(`
        DELETE FROM tenant_memberships
        WHERE tenant_id = 7
          AND external_user_id =
            'owner-user'
      `),
    /at least one active owner/,
  );

  database.exec(`
    UPDATE tenant_memberships
    SET
      role = 'owner',
      version = 3
    WHERE tenant_id = 7
      AND external_user_id =
        'agent-user'
  `);
  database.exec(`
    UPDATE tenant_memberships
    SET
      role = 'manager',
      version = 2
    WHERE tenant_id = 7
      AND external_user_id =
        'owner-user'
  `);

  assert.deepEqual(
    database
      .prepare(`
        SELECT
          external_user_id AS externalUserId,
          role,
          version
        FROM tenant_memberships
        WHERE tenant_id = 7
        ORDER BY external_user_id ASC
      `)
      .all()
      .map((row) => ({
        ...row,
      })),
    [
      {
        externalUserId:
          "agent-user",
        role: "owner",
        version: 3,
      },
      {
        externalUserId:
          "owner-user",
        role: "manager",
        version: 2,
      },
    ],
  );
});

test("accepts only state-linked immutable membership audit events", async () => {
  const database =
    await createFixture();

  database.exec(`
    UPDATE tenant_memberships
    SET
      role = 'manager',
      version = 2
    WHERE tenant_id = 7
      AND external_user_id =
        'agent-user'
  `);

  const insertEvent =
    database.prepare(`
      INSERT INTO tenant_membership_events (
        event_key,
        operation_key,
        tenant_id,
        target_external_user_id,
        actor_external_user_id,
        event_type,
        from_role,
        to_role,
        from_status,
        to_status,
        from_version,
        to_version,
        occurred_at
      )
      VALUES (
        ?1, ?2, 7,
        'agent-user',
        'owner-user',
        ?3, ?4, ?5,
        ?6, ?7, ?8, ?9,
        '2026-07-27T12:00:00.000Z'
      )
    `);
  const eventKey =
    `tenant_membership_event_v1_${"a".repeat(
      64,
    )}`;
  const operationKey =
    `tenant_membership_operation_v1_${"b".repeat(
      64,
    )}`;

  insertEvent.run(
    eventKey,
    operationKey,
    "role-changed",
    "agent",
    "manager",
    "active",
    "active",
    1,
    2,
  );

  assert.throws(
    () =>
      database
        .prepare(`
          UPDATE tenant_membership_events
          SET occurred_at =
            '2026-07-27T13:00:00.000Z'
          WHERE event_key = ?1
        `)
        .run(eventKey),
    /immutable/,
  );
  assert.throws(
    () =>
      database
        .prepare(`
          DELETE FROM tenant_membership_events
          WHERE event_key = ?1
        `)
        .run(eventKey),
    /immutable/,
  );
  assert.throws(
    () =>
      insertEvent.run(
        `tenant_membership_event_v1_${"c".repeat(
          64,
        )}`,
        `tenant_membership_operation_v1_${"d".repeat(
          64,
        )}`,
        "role-changed",
        "manager",
        "viewer",
        "active",
        "active",
        2,
        3,
      ),
    /does not match persisted state/,
  );
  database.exec(`
    UPDATE tenant_memberships
    SET
      role = 'viewer',
      status = 'suspended',
      version = 3
    WHERE tenant_id = 7
      AND external_user_id =
        'agent-user'
  `);
  assert.throws(
    () =>
      insertEvent.run(
        `tenant_membership_event_v1_${"e".repeat(
          64,
        )}`,
        `tenant_membership_operation_v1_${"f".repeat(
          64,
        )}`,
        "suspended",
        "manager",
        "viewer",
        "active",
        "suspended",
        2,
        3,
      ),
    /CHECK constraint failed/,
  );
});
