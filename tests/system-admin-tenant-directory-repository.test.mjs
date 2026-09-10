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
  createSystemAdminTenantDirectoryRepository,
} from "../db/systemAdminTenantDirectoryRepository.ts";

class SqliteD1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async all() {
    return {
      success: true,
      results: this.statement.all(
        ...this.values,
      ),
    };
  }

  async first() {
    return (
      this.statement.get(...this.values) ??
      null
    );
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
    return Promise.all(
      statements.map(
        (statement) => statement.run(),
      ),
    );
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

  const insertTenant = database.prepare(
    `INSERT INTO tenants
      (display_name, status)
     VALUES (?, ?)`,
  );

  for (
    let tenantId = 1;
    tenantId <= 52;
    tenantId += 1
  ) {
    insertTenant.run(
      `tenant-${tenantId}`,
      tenantId === 1
        ? "active"
        : "trial",
    );
  }

  database
    .prepare(
      `INSERT INTO tenant_subscriptions (
        tenant_id,
        status,
        starts_at,
        ends_at,
        cancelled_at,
        version
      )
      VALUES (?, ?, ?, ?, NULL, ?)`,
    )
    .run(
      1,
      "active",
      "2026-08-01T00:00:00.000Z",
      "2026-09-01T00:00:00.000Z",
      1,
    );
  database
    .prepare(
      `INSERT INTO business_profiles (
        tenant_id,
        business_name,
        timezone,
        interface_language
      )
      VALUES (?, ?, ?, ?)`,
    )
    .run(
      1,
      "tenant-1",
      "Asia/Jerusalem",
      "he",
    );

  return {
    database,
    repository:
      createSystemAdminTenantDirectoryRepository(
        new SqliteD1Database(database),
      ),
  };
}

function query(
  afterTenantId = null,
  overrides = {},
) {
  return {
    afterTenantId,
    search: "",
    tenantStatus: "all",
    subscription: "all",
    ...overrides,
  };
}

test("loads a bounded first page with real subscription state", async () => {
  const fixture = await createFixture();
  const page =
    await fixture.repository.listPage(
      query(),
    );

  assert.equal(page.tenants.length, 50);
  assert.equal(page.nextCursor, 50);
  assert.deepEqual(page.tenants[0], {
    tenantId: 1,
    displayName: "tenant-1",
    tenantStatus: "active",
    businessProfile: {
      businessName: "tenant-1",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      version: 1,
      createdAt:
        page.tenants[0].businessProfile
          .createdAt,
      updatedAt:
        page.tenants[0].businessProfile
          .updatedAt,
    },
    subscription: {
      status: "active",
      startsAt:
        "2026-08-01T00:00:00.000Z",
      endsAt:
        "2026-09-01T00:00:00.000Z",
      cancelledAt: null,
      version: 1,
      createdAt:
        page.tenants[0].subscription
          .createdAt,
      updatedAt:
        page.tenants[0].subscription
          .updatedAt,
    },
  });
  assert.equal(
    page.tenants[1].subscription,
    null,
  );
  assert.equal(
    page.tenants[1].businessProfile,
    null,
  );
});

test("uses an exclusive keyset cursor and reports the end", async () => {
  const fixture = await createFixture();
  const page =
    await fixture.repository.listPage(
      query(50),
    );

  assert.deepEqual(
    page.tenants.map(
      (tenant) => tenant.tenantId,
    ),
    [51, 52],
  );
  assert.equal(page.nextCursor, null);
});

test("rejects an invalid cursor before D1 access", async () => {
  let prepareCalls = 0;
  const repository =
    createSystemAdminTenantDirectoryRepository(
      {
        prepare() {
          prepareCalls += 1;
          throw new Error("must not run");
        },
        async batch() {
          throw new Error("must not run");
        },
      },
    );

  await assert.rejects(
    repository.listPage(query(0)),
    /positive/,
  );
  assert.equal(prepareCalls, 0);
});

test("fails closed when tenant and subscription states diverge", async () => {
  const fixture = await createFixture();

  fixture.database
    .prepare(
      "UPDATE tenants SET status = 'suspended' WHERE id = 1",
    )
    .run();

  await assert.rejects(
    fixture.repository.listPage(query()),
    /invalid system admin subscription/,
  );
});

test("fails closed when tenant and business profile names diverge", async () => {
  const fixture = await createFixture();

  fixture.database
    .prepare(
      "UPDATE tenants SET display_name = 'drifted-name' WHERE id = 1",
    )
    .run();

  await assert.rejects(
    fixture.repository.listPage(query()),
    /invalid system admin business profile/,
  );
});

test("searches and filters the complete tenant directory before keyset pagination", async () => {
  const fixture = await createFixture();
  const byName =
    await fixture.repository.listPage(
      query(null, {
        search: "tenant-51",
      }),
    );
  const byId =
    await fixture.repository.listPage(
      query(null, {
        search: "52",
      }),
    );
  const activeWithSubscription =
    await fixture.repository.listPage(
      query(null, {
        tenantStatus: "active",
        subscription:
          "with-subscription",
      }),
    );
  const withoutSubscription =
    await fixture.repository.listPage(
      query(null, {
        subscription:
          "without-subscription",
      }),
    );
  const withoutSubscriptionEnd =
    await fixture.repository.listPage(
      query(
        withoutSubscription.nextCursor,
        {
          subscription:
            "without-subscription",
        },
      ),
    );
  const literalWildcard =
    await fixture.repository.listPage(
      query(null, {
        search: "%",
      }),
    );

  assert.deepEqual(
    byName.tenants.map(
      (tenant) => tenant.tenantId,
    ),
    [51],
  );
  assert.deepEqual(
    byId.tenants.map(
      (tenant) => tenant.tenantId,
    ),
    [52],
  );
  assert.deepEqual(
    activeWithSubscription.tenants.map(
      (tenant) => tenant.tenantId,
    ),
    [1],
  );
  assert.equal(
    withoutSubscription.tenants.length,
    50,
  );
  assert.equal(
    withoutSubscription.nextCursor,
    51,
  );
  assert.deepEqual(
    withoutSubscriptionEnd.tenants.map(
      (tenant) => tenant.tenantId,
    ),
    [52],
  );
  assert.equal(
    withoutSubscriptionEnd.nextCursor,
    null,
  );
  assert.deepEqual(
    literalWildcard.tenants,
    [],
  );
});
