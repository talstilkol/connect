import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveKnowledgePassageKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  sha256Hex,
} from "../server/meta/metaWebhookSecurity.ts";
import {
  createPostgresKnowledgePassageRepository,
  postgresKnowledgePassageSql,
} from "../server/platform/postgresKnowledgePassageRepository.ts";

const timestamp = new Date("2026-08-17T08:00:00.000Z");
const readyTimestamp = new Date("2026-08-17T08:01:00.000Z");

async function sourceFixture(digestCharacter = "a") {
  const contentSha256 = digestCharacter.repeat(64);
  const sourceKey = await deriveKnowledgeSourceKey(7, contentSha256);
  return { contentSha256, sourceKey };
}

function sourceRow(fixture, overrides = {}) {
  return {
    sourceKey: fixture.sourceKey,
    tenantId: "7",
    contentSha256: fixture.contentSha256,
    fileName: "knowledge.pdf",
    mediaType: "application/pdf",
    sizeBytes: "4096",
    storageObjectKey: `knowledge/v1/${fixture.sourceKey}`,
    status: "scanning",
    lastErrorCode: null,
    readyAt: null,
    version: "3",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

async function passageFixture(source, ordinal, content) {
  const contentSha256 = await sha256Hex(new TextEncoder().encode(content));
  const passageKey = await deriveKnowledgePassageKey(
    7,
    source.sourceKey,
    ordinal,
    contentSha256,
  );
  return { passageKey, passageOrdinal: ordinal, contentSha256, content };
}

function passageRow(source, passage, overrides = {}) {
  return {
    passageKey: passage.passageKey,
    tenantId: "7",
    sourceKey: source.sourceKey,
    passageOrdinal: String(passage.passageOrdinal),
    contentSha256: passage.contentSha256,
    content: passage.content,
    createdAt: timestamp,
    ...overrides,
  };
}

function queryFixture(responses) {
  const calls = [];
  const remaining = [...responses];
  return {
    calls,
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      const response = remaining.shift();
      if (response instanceof Error) throw response;
      if (!response) throw new Error("Unexpected PostgreSQL query");
      return response;
    },
    assertConsumed() {
      assert.equal(remaining.length, 0);
    },
  };
}

function repositoryFixture(transactionResponses = [], queryResponses = []) {
  const transactions = queryFixture(transactionResponses);
  const queries = queryFixture(queryResponses);
  const transactionCalls = [];
  return {
    transactions,
    queries,
    transactionCalls,
    repository: createPostgresKnowledgePassageRepository({
      queries,
      transactions: {
        async transaction(options, execute) {
          transactionCalls.push(options);
          return execute(transactions);
        },
      },
    }),
  };
}

test("stores all verified passages and marks the source ready atomically", async () => {
  const source = await sourceFixture();
  const passages = [
    await passageFixture(source, 1, "שעות הפעילות מופיעות באתר."),
    await passageFixture(source, 2, "ניתן לפנות לשירות דרך WhatsApp."),
  ];
  const database = repositoryFixture([
    { rows: [sourceRow(source)], rowCount: 1 },
    { rows: [], rowCount: 0 },
    {
      rows: passages.map((passage) => passageRow(source, passage)),
      rowCount: 2,
    },
    {
      rows: [sourceRow(source, {
        status: "ready",
        readyAt: readyTimestamp,
        version: "4",
        updatedAt: readyTimestamp,
      })],
      rowCount: 1,
    },
  ]);

  const result = await database.repository.storeProcessedAndMarkReady({
    tenantId: 7,
    sourceKey: source.sourceKey,
    expectedSourceVersion: 3,
    passages,
  });

  assert.equal(result.outcome, "updated");
  assert.equal(result.source.status, "ready");
  assert.equal(result.passages.length, 2);
  assert.deepEqual(database.transactionCalls, [
    { isolationLevel: "read-committed" },
  ]);
  assert.match(postgresKnowledgePassageSql.findSourceForUpdate, /FOR UPDATE/);
  assert.match(postgresKnowledgePassageSql.insertPassages, /jsonb_array_elements/);
  assert.match(postgresKnowledgePassageSql.markSourceReady, /count\(\*\)/);
  database.transactions.assertConsumed();
});

test("returns an exact ready replay without inserting passages again", async () => {
  const source = await sourceFixture("b");
  const passage = await passageFixture(
    source,
    1,
    "המערכת שומרת רק ידע מאושר.",
  );
  const database = repositoryFixture([
    {
      rows: [sourceRow(source, {
        status: "ready",
        readyAt: readyTimestamp,
        version: "4",
        updatedAt: readyTimestamp,
      })],
      rowCount: 1,
    },
    { rows: [passageRow(source, passage)], rowCount: 1 },
  ]);

  const result = await database.repository.storeProcessedAndMarkReady({
    tenantId: 7,
    sourceKey: source.sourceKey,
    expectedSourceVersion: 3,
    passages: [passage],
  });
  assert.equal(result.outcome, "unchanged");
  assert.equal(database.transactions.calls.length, 2);
});

test("separates stale versions, missing sources, and invalid states", async () => {
  const source = await sourceFixture("c");
  const passage = await passageFixture(source, 1, "תוכן מאומת בלבד.");
  const input = {
    tenantId: 7,
    sourceKey: source.sourceKey,
    expectedSourceVersion: 3,
    passages: [passage],
  };

  const stale = repositoryFixture([{
    rows: [sourceRow(source, { version: "5" })],
    rowCount: 1,
  }]);
  assert.equal(
    (await stale.repository.storeProcessedAndMarkReady(input)).outcome,
    "conflict",
  );

  const missing = repositoryFixture([{ rows: [], rowCount: 0 }]);
  assert.equal(
    (await missing.repository.storeProcessedAndMarkReady(input)).outcome,
    "not-found",
  );

  const invalid = repositoryFixture([{
    rows: [sourceRow(source, {
      status: "pending-scan",
      version: "3",
    })],
    rowCount: 1,
  }]);
  assert.equal(
    (await invalid.repository.storeProcessedAndMarkReady(input)).outcome,
    "invalid-state",
  );
});

test("fails the transaction when PostgreSQL stores only a partial passage set", async () => {
  const source = await sourceFixture("d");
  const passages = [
    await passageFixture(source, 1, "מקטע ראשון."),
    await passageFixture(source, 2, "מקטע שני."),
  ];
  const database = repositoryFixture([
    { rows: [sourceRow(source)], rowCount: 1 },
    { rows: [], rowCount: 0 },
    { rows: [passageRow(source, passages[0])], rowCount: 1 },
  ]);
  await assert.rejects(
    database.repository.storeProcessedAndMarkReady({
      tenantId: 7,
      sourceKey: source.sourceKey,
      expectedSourceVersion: 3,
      passages,
    }),
    /knowledge processing write failed/,
  );
});

test("lists only ready passages from selected tenant sources", async () => {
  const source = await sourceFixture("e");
  const passage = await passageFixture(source, 1, "מענה מבוסס מקור מותר.");
  const database = repositoryFixture([], [
    { rows: [passageRow(source, passage)], rowCount: 1 },
  ]);
  const result = await database.repository.listApprovedBySourceKeys(
    7,
    [source.sourceKey],
    100,
  );
  assert.equal(result.length, 1);
  assert.deepEqual(database.queries.calls[0].parameters, [
    7,
    JSON.stringify([source.sourceKey]),
    100,
  ]);
  assert.match(
    postgresKnowledgePassageSql.listApprovedBySourceKeys,
    /source\.status = 'ready'/,
  );
});

test("rejects forged identities, duplicate ordinals, and invalid dependencies", async () => {
  const source = await sourceFixture("f");
  const passage = await passageFixture(source, 1, "זהות מקורית.");
  const database = repositoryFixture();
  await assert.rejects(
    database.repository.storeProcessedAndMarkReady({
      tenantId: 7,
      sourceKey: source.sourceKey,
      expectedSourceVersion: 3,
      passages: [{
        ...passage,
        passageKey: `knowledge_passage_v1_${"0".repeat(64)}`,
      }],
    }),
    /identity is invalid/,
  );
  await assert.rejects(
    database.repository.storeProcessedAndMarkReady({
      tenantId: 7,
      sourceKey: source.sourceKey,
      expectedSourceVersion: 3,
      passages: [passage, passage],
    }),
    /identity is invalid/,
  );
  assert.throws(
    () => createPostgresKnowledgePassageRepository({}),
    /dependencies are invalid/,
  );
});
