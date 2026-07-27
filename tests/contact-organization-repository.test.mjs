import assert from "node:assert/strict";
import test from "node:test";

import {
  createContactOrganizationRepository,
} from "../db/contactOrganizationRepository.ts";

class RecordingStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.database.recordings.push({ sql: this.sql, values });
    return this;
  }

  async run() {
    return this.database.runResults.shift() ?? { success: true };
  }

  async first() {
    return this.database.firstResults.shift() ?? null;
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
    this.runResults = [];
    this.firstResults = [];
    this.allResults = [];
  }

  prepare(sql) {
    return new RecordingStatement(this, sql);
  }
}

test("upserts and reloads a tag through tenant and normalized name", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push({
    id: 11,
    name: "tag-name",
    contactCount: 0,
  });
  const repository = createContactOrganizationRepository(database);

  const tag = await repository.saveTag(
    7,
    "tag-name",
    "tag-name",
  );

  assert.deepEqual(tag, {
    id: 11,
    name: "tag-name",
    contactCount: 0,
  });
  assert.match(
    database.recordings[0].sql,
    /INSERT INTO contact_tags/,
  );
  assert.match(
    database.recordings[0].sql,
    /ON CONFLICT \(tenant_id, normalized_name\)/,
  );
  assert.deepEqual(database.recordings[0].values, [
    7,
    "tag-name",
    "tag-name",
  ]);
  assert.match(
    database.recordings[1].sql,
    /WHERE tenant_id = \?1[\s\S]+normalized_name = \?2/,
  );
});

test("reads group counts and relationships only for requested contacts", async () => {
  const database = new RecordingDatabase();
  database.allResults.push(
    {
      success: true,
      results: [{ id: 11, name: "tag-name", contactCount: 2 }],
    },
    {
      success: true,
      results: [{ id: 12, name: "list-name", contactCount: 1 }],
    },
    {
      success: true,
      results: [{ contactId: 23, tagId: 11 }],
    },
    {
      success: true,
      results: [{ contactId: 23, listId: 12 }],
    },
  );
  const repository = createContactOrganizationRepository(database);

  const snapshot = await repository.readSnapshot(7, [23, 24]);

  assert.deepEqual(snapshot.scopeContactIds, [23, 24]);
  assert.deepEqual(snapshot.tagAssignments, [
    { contactId: 23, tagId: 11 },
  ]);
  assert.deepEqual(snapshot.listMemberships, [
    { contactId: 23, listId: 12 },
  ]);
  assert.deepEqual(database.recordings[2].values, [7, 23, 24]);
  assert.match(
    database.recordings[2].sql,
    /tenant_id = \?1[\s\S]+contact_id IN \(\?2, \?3\)/,
  );
});

test("checks tenant ownership before assigning and never changes consent", async () => {
  const database = new RecordingDatabase();
  database.firstResults.push({ found: 1 });
  const repository = createContactOrganizationRepository(database);

  await repository.setTagAssignment(7, 23, 11, true);

  assert.match(
    database.recordings[0].sql,
    /contacts\.tenant_id = \?1[\s\S]+contacts\.id = \?2[\s\S]+tags\.id = \?3/,
  );
  assert.match(
    database.recordings[1].sql,
    /INSERT INTO contact_tag_assignments/,
  );
  assert.doesNotMatch(
    database.recordings[1].sql,
    /mailing_status|consent_status|UPDATE contacts/,
  );
  assert.deepEqual(database.recordings[1].values, [7, 23, 11]);
});
