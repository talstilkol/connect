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
  createTenantSelectionRepository,
} from "../db/tenantSelectionRepository.ts";

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
      for (const statement of statements) {
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
    await readdir(migrationDirectory)
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

  database.exec(`
    INSERT INTO tenants (
      id,
      display_name,
      status
    )
    VALUES
      (1, 'tenant-one', 'active'),
      (2, 'tenant-two', 'trial'),
      (3, 'tenant-three', 'suspended'),
      (4, 'tenant-four', 'active');

    INSERT INTO tenant_memberships (
      tenant_id,
      external_user_id,
      role,
      status
    )
    VALUES
      (1, 'user-a', 'owner', 'active'),
      (2, 'user-a', 'manager', 'active'),
      (3, 'user-a', 'viewer', 'active'),
      (4, 'user-a', 'agent', 'suspended'),
      (4, 'user-b', 'owner', 'active');
  `);

  return {
    database,
    repository:
      createTenantSelectionRepository(
        new SqliteD1Database(
          database,
        ),
      ),
  };
}

test("creates and reads one eligible tenant selection", async () => {
  const { repository } =
    await createFixture();
  const result =
    await repository.save({
      externalUserId: "user-a",
      tenantId: 1,
      expectedVersion: 0,
    });

  assert.deepEqual(result, {
    outcome: "saved",
    selection: {
      tenantId: 1,
      version: 1,
    },
  });
  assert.deepEqual(
    await repository
      .findByExternalUserId(
        "user-a",
      ),
    {
      tenantId: 1,
      version: 1,
    },
  );
});

test("preserves exact retries and updates behind the expected version", async () => {
  const { repository } =
    await createFixture();
  const command = {
    externalUserId: "user-a",
    tenantId: 1,
    expectedVersion: 0,
  };

  await repository.save(command);
  assert.equal(
    (
      await repository.save(command)
    ).outcome,
    "unchanged",
  );

  const updated =
    await repository.save({
      ...command,
      tenantId: 2,
      expectedVersion: 1,
    });

  assert.deepEqual(updated, {
    outcome: "saved",
    selection: {
      tenantId: 2,
      version: 2,
    },
  });
  assert.equal(
    (
      await repository.save({
        ...command,
        tenantId: 2,
        expectedVersion: 1,
      })
    ).outcome,
    "unchanged",
  );
});

test("rejects stale selection versions without overwriting", async () => {
  const { repository } =
    await createFixture();

  await repository.save({
    externalUserId: "user-a",
    tenantId: 1,
    expectedVersion: 0,
  });
  await repository.save({
    externalUserId: "user-a",
    tenantId: 2,
    expectedVersion: 1,
  });

  const stale =
    await repository.save({
      externalUserId: "user-a",
      tenantId: 1,
      expectedVersion: 1,
    });

  assert.equal(
    stale.outcome,
    "conflict",
  );
  assert.equal(
    (
      await repository
        .findByExternalUserId(
          "user-a",
        )
    ).tenantId,
    2,
  );
});

test("rejects inaccessible tenant and membership states", async () => {
  const { repository } =
    await createFixture();

  for (const tenantId of [
    3,
    4,
  ]) {
    assert.equal(
      (
        await repository.save({
          externalUserId:
            "user-a",
          tenantId,
          expectedVersion: 0,
        })
      ).outcome,
      "rejected",
    );
  }

  assert.equal(
    (
      await repository.save({
        externalUserId: "user-b",
        tenantId: 1,
        expectedVersion: 0,
      })
    ).outcome,
    "rejected",
  );
});

test("removes a selection when its membership is removed", async () => {
  const {
    database,
    repository,
  } = await createFixture();

  await repository.save({
    externalUserId: "user-a",
    tenantId: 1,
    expectedVersion: 0,
  });
  database
    .prepare(`
      DELETE FROM tenant_memberships
      WHERE tenant_id = 1
        AND external_user_id = 'user-a'
    `)
    .run();

  assert.equal(
    await repository
      .findByExternalUserId(
        "user-a",
      ),
    null,
  );
});

test("replaces a now-ineligible stored selection using its exact version", async () => {
  const {
    database,
    repository,
  } = await createFixture();

  await repository.save({
    externalUserId: "user-a",
    tenantId: 1,
    expectedVersion: 0,
  });
  database
    .prepare(`
      UPDATE tenants
      SET status = 'suspended'
      WHERE id = 1
    `)
    .run();

  assert.deepEqual(
    await repository
      .findByExternalUserId(
        "user-a",
      ),
    {
      tenantId: 1,
      version: 1,
    },
  );
  assert.deepEqual(
    await repository.save({
      externalUserId: "user-a",
      tenantId: 2,
      expectedVersion: 1,
    }),
    {
      outcome: "saved",
      selection: {
        tenantId: 2,
        version: 2,
      },
    },
  );
});
