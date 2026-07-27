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
  createCampaignAudienceRepository,
} from "../db/campaignAudienceRepository.ts";

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.database.recordings.push({
      sql: this.sql,
      values,
    });
    return this;
  }

  async all() {
    return (
      this.database.allResults.shift() ?? {
        success: true,
        results: [],
      }
    );
  }
}

class RecordingDatabase {
  constructor() {
    this.recordings = [];
    this.allResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }
}

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
      results: this.statement.all(...this.values),
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
}

async function createSqliteD1() {
  const migrationsUrl = new URL(
    "../drizzle/",
    import.meta.url,
  );
  const migrationFiles = (await readdir(migrationsUrl))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const migrationParts = await Promise.all(
    migrationFiles.map((fileName) =>
      readFile(new URL(fileName, migrationsUrl), "utf8"),
    ),
  );
  const database = new DatabaseSync(":memory:");

  database.exec("PRAGMA foreign_keys = ON");
  database.exec(
    migrationParts
      .join("\n")
      .replaceAll("--> statement-breakpoint", ""),
  );

  return {
    database,
    d1: new SqliteD1Database(database),
  };
}

function audienceRow(overrides = {}) {
  return {
    contactId: 17,
    phoneNumber: "+972501234567",
    firstName: "שם",
    lastName: null,
    email: null,
    company: null,
    mailingStatus: "subscribed",
    consentStatus: "granted",
    version: 2,
    ...overrides,
  };
}

test("reads only eligible contacts through a tenant-scoped source", async () => {
  const database = new RecordingDatabase();
  database.allResults.push({
    success: true,
    results: [audienceRow()],
  });
  const repository =
    createCampaignAudienceRepository(database);

  const contacts =
    await repository.listEligibleBySource(
      7,
      {
        kind: "list",
        listId: 11,
      },
      100_001,
    );

  assert.equal(contacts.length, 1);
  assert.deepEqual(database.recordings[0].values, [
    7,
    "list",
    11,
    100_001,
  ]);
  assert.match(
    database.recordings[0].sql,
    /contacts\.tenant_id = \?1/,
  );
  assert.match(
    database.recordings[0].sql,
    /contacts\.mailing_status = 'subscribed'/,
  );
  assert.match(
    database.recordings[0].sql,
    /contacts\.consent_status = 'granted'/,
  );
  assert.match(
    database.recordings[0].sql,
    /lists\.tenant_id = memberships\.tenant_id/,
  );
  assert.match(
    database.recordings[0].sql,
    /ORDER BY contacts\.id ASC/,
  );
});

test("uses no group ID for the complete eligible audience", async () => {
  const database = new RecordingDatabase();
  const repository =
    createCampaignAudienceRepository(database);

  await repository.listEligibleBySource(
    7,
    {
      kind: "all",
    },
    100,
  );

  assert.deepEqual(database.recordings[0].values, [
    7,
    "all",
    0,
    100,
  ]);
});

test("rejects malformed source, limit, and D1 rows", async () => {
  const database = new RecordingDatabase();
  const repository =
    createCampaignAudienceRepository(database);

  await assert.rejects(
    repository.listEligibleBySource(
      7,
      {
        kind: "list",
        listId: 0,
      },
      100,
    ),
    /query is invalid/,
  );
  await assert.rejects(
    repository.listEligibleBySource(
      7,
      {
        kind: "all",
      },
      100_002,
    ),
    /query is invalid/,
  );

  database.allResults.push({
    success: true,
    results: [
      audienceRow({
        consentStatus: "withdrawn",
      }),
    ],
  });

  await assert.rejects(
    repository.listEligibleBySource(
      7,
      {
        kind: "tag",
        tagId: 12,
      },
      100,
    ),
    /invalid campaign audience contact/,
  );
});

test("isolates real SQLite list membership and consent by tenant", async () => {
  const { database, d1 } = await createSqliteD1();

  database
    .prepare(
      "INSERT INTO tenants (display_name) VALUES (?), (?)",
    )
    .run("tenant-one", "tenant-two");
  database
    .prepare(
      `INSERT INTO contacts (
        tenant_id,
        phone_e164,
        first_name,
        mailing_status,
        consent_status,
        consent_source,
        consent_recorded_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      1,
      "+972501234567",
      "נמען מאושר",
      "subscribed",
      "granted",
      "documented-consent",
      "2026-07-26T08:00:00.000Z",
    );
  database
    .prepare(
      `INSERT INTO contacts (
        tenant_id,
        phone_e164,
        first_name,
        mailing_status,
        consent_status
      )
      VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      1,
      "+972509876543",
      "נמען חסום",
      "unsubscribed",
      "unknown",
    );
  database
    .prepare(
      `INSERT INTO contacts (
        tenant_id,
        phone_e164,
        first_name,
        mailing_status,
        consent_status,
        consent_source,
        consent_recorded_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      2,
      "+972502222222",
      "חשבון אחר",
      "subscribed",
      "granted",
      "documented-consent",
      "2026-07-26T08:00:00.000Z",
    );
  database
    .prepare(
      `INSERT INTO contact_lists (
        tenant_id,
        name,
        normalized_name
      )
      VALUES (?, ?, ?), (?, ?, ?)`,
    )
    .run(
      1,
      "רשימה ראשונה",
      "list-one",
      2,
      "רשימה שנייה",
      "list-two",
    );
  database
    .prepare(
      `INSERT INTO contact_list_memberships (
        tenant_id,
        contact_id,
        list_id
      )
      VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)`,
    )
    .run(1, 1, 1, 1, 2, 1, 2, 3, 2);

  const repository =
    createCampaignAudienceRepository(d1);
  const tenantAudience =
    await repository.listEligibleBySource(
      1,
      {
        kind: "list",
        listId: 1,
      },
      100,
    );
  const foreignList =
    await repository.listEligibleBySource(
      1,
      {
        kind: "list",
        listId: 2,
      },
      100,
    );

  assert.deepEqual(
    tenantAudience.map(
      (currentContact) => currentContact.contactId,
    ),
    [1],
  );
  assert.deepEqual(foreignList, []);

  database.close();
});
