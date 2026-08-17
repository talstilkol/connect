import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveBotFlowBlockKey,
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "../server/bot/botFlowKey.ts";
import {
  createPostgresBotFlowRepository,
  postgresBotFlowSql,
} from "../server/platform/postgresBotFlowRepository.ts";

const timestamp = new Date("2026-08-17T08:00:00.000Z");

async function definitionFixture(versionNumber = 1) {
  const name = "מענה ראשוני ללקוחות";
  const botFlowKey = await deriveBotFlowKey(7, name);
  const triggerKey = await deriveBotFlowBlockKey(botFlowKey, 1);
  const textKey = await deriveBotFlowBlockKey(botFlowKey, 2);
  const endKey = await deriveBotFlowBlockKey(botFlowKey, 3);
  const definition = {
    name,
    entryBlockKey: triggerKey,
    blocks: [
      { blockKey: triggerKey, type: "trigger", nextBlockKey: textKey },
      {
        blockKey: textKey,
        type: "text",
        text: versionNumber === 1 ? "כיצד אפשר לעזור?" : "כיצד נוכל לעזור?",
        nextBlockKey: endKey,
      },
      { blockKey: endKey, type: "end" },
    ].sort((first, second) => first.blockKey.localeCompare(second.blockKey)),
  };
  const botFlowVersionKey = await deriveBotFlowVersionKey(
    7,
    botFlowKey,
    versionNumber,
    definition,
  );
  return { botFlowKey, botFlowVersionKey, definition, versionNumber };
}

function flowRow(fixture, overrides = {}) {
  return {
    botFlowKey: fixture.botFlowKey,
    tenantId: "7",
    name: fixture.definition.name,
    status: "draft",
    latestVersionKey: fixture.botFlowVersionKey,
    latestVersionNumber: String(fixture.versionNumber),
    activeVersionKey: null,
    version: String(fixture.versionNumber),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function versionRow(fixture, overrides = {}) {
  return {
    botFlowVersionKey: fixture.botFlowVersionKey,
    botFlowKey: fixture.botFlowKey,
    tenantId: "7",
    versionNumber: String(fixture.versionNumber),
    status: "draft",
    definitionJson: fixture.definition,
    publishedAt: null,
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
    repository: createPostgresBotFlowRepository({
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

function saveInput(fixture, expectedFlowVersion = null) {
  return {
    tenantId: 7,
    botFlowKey: fixture.botFlowKey,
    botFlowVersionKey: fixture.botFlowVersionKey,
    versionNumber: fixture.versionNumber,
    expectedFlowVersion,
    definition: fixture.definition,
  };
}

test("creates a deterministic draft and immutable version atomically", async () => {
  const fixture = await definitionFixture();
  const database = repositoryFixture([
    { rows: [flowRow(fixture)], rowCount: 1 },
    { rows: [], rowCount: 0 },
    { rows: [versionRow(fixture)], rowCount: 1 },
  ]);

  const result = await database.repository.saveDraft(saveInput(fixture));

  assert.equal(result.outcome, "created");
  assert.equal(result.draftVersion.status, "draft");
  assert.deepEqual(database.transactionCalls, [{ isolationLevel: "read-committed" }]);
  assert.match(postgresBotFlowSql.insertFlow, /ON CONFLICT DO NOTHING/);
  assert.match(postgresBotFlowSql.insertVersion, /\$5::jsonb/);
  database.transactions.assertConsumed();
});

test("returns an exact concurrent create replay and rejects mismatched state", async () => {
  const fixture = await definitionFixture();
  const exact = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [flowRow(fixture)], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
  ]);
  assert.equal(
    (await exact.repository.saveDraft(saveInput(fixture))).outcome,
    "unchanged",
  );

  const conflict = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [flowRow(fixture, { name: "זרימה אחרת" })], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await conflict.repository.saveDraft(saveInput(fixture))).outcome,
    "conflict",
  );
});

test("appends the next draft only behind the exact flow version", async () => {
  const first = await definitionFixture(1);
  const second = await definitionFixture(2);
  const database = repositoryFixture([
    { rows: [flowRow(first)], rowCount: 1 },
    { rows: [], rowCount: 0 },
    { rows: [versionRow(second)], rowCount: 1 },
    { rows: [flowRow(second)], rowCount: 1 },
  ]);

  const result = await database.repository.saveDraft(saveInput(second, 1));

  assert.equal(result.outcome, "updated");
  assert.deepEqual(database.transactions.calls[3].parameters, [
    7,
    second.botFlowKey,
    1,
    second.botFlowVersionKey,
    2,
    second.definition.name,
  ]);
  assert.match(postgresBotFlowSql.findFlowByKeyForUpdate, /FOR UPDATE/);
});

test("classifies missing and stale draft updates without partial writes", async () => {
  const second = await definitionFixture(2);
  const missing = repositoryFixture([{ rows: [], rowCount: 0 }]);
  assert.equal(
    (await missing.repository.saveDraft(saveInput(second, 1))).outcome,
    "not-found",
  );

  const stale = repositoryFixture([
    { rows: [flowRow(second, { version: "3" })], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await stale.repository.saveDraft(saveInput(second, 1))).outcome,
    "conflict",
  );
});

test("publishes a draft and archives the previous publication in one transaction", async () => {
  const fixture = await definitionFixture();
  const publishedAt = new Date("2026-08-17T08:01:00.000Z");
  const database = repositoryFixture([
    { rows: [flowRow(fixture)], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
    {
      rows: [{ botFlowVersionKey: `bot_flow_version_v1_${"f".repeat(64)}` }],
      rowCount: 1,
    },
    {
      rows: [versionRow(fixture, {
        status: "published",
        publishedAt,
      })],
      rowCount: 1,
    },
    {
      rows: [flowRow(fixture, {
        status: "active",
        activeVersionKey: fixture.botFlowVersionKey,
        version: "2",
        updatedAt: publishedAt,
      })],
      rowCount: 1,
    },
  ]);

  const result = await database.repository.publishDraft(
    7,
    fixture.botFlowKey,
    fixture.botFlowVersionKey,
    1,
  );

  assert.equal(result.outcome, "updated");
  assert.equal(result.publishedVersion.status, "published");
  assert.match(postgresBotFlowSql.archivePublishedVersions, /status = 'archived'/);
  assert.match(postgresBotFlowSql.activateFlow, /version = version \+ 1/);
});

test("classifies publication replay, conflict, invalid state, and not found", async () => {
  const fixture = await definitionFixture();
  const publishedAt = new Date("2026-08-17T08:01:00.000Z");
  const replay = repositoryFixture([
    { rows: [flowRow(fixture, {
      status: "active",
      activeVersionKey: fixture.botFlowVersionKey,
      version: "2",
      updatedAt: publishedAt,
    })], rowCount: 1 },
    { rows: [versionRow(fixture, { status: "published", publishedAt })], rowCount: 1 },
  ]);
  assert.equal(
    (await replay.repository.publishDraft(
      7,
      fixture.botFlowKey,
      fixture.botFlowVersionKey,
      1,
    )).outcome,
    "unchanged",
  );

  const conflict = repositoryFixture([
    { rows: [flowRow(fixture, { version: "3" })], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
  ]);
  assert.equal(
    (await conflict.repository.publishDraft(7, fixture.botFlowKey, fixture.botFlowVersionKey, 1)).outcome,
    "conflict",
  );

  const invalid = repositoryFixture([
    { rows: [flowRow(fixture)], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await invalid.repository.publishDraft(7, fixture.botFlowKey, fixture.botFlowVersionKey, 1)).outcome,
    "invalid-state",
  );

  const missing = repositoryFixture([{ rows: [], rowCount: 0 }]);
  assert.equal(
    (await missing.repository.publishDraft(7, fixture.botFlowKey, fixture.botFlowVersionKey, 1)).outcome,
    "not-found",
  );
});

test("reads tenant-scoped flows and versions with bounded lists", async () => {
  const fixture = await definitionFixture();
  const database = repositoryFixture([], [
    { rows: [flowRow(fixture)], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
    { rows: [flowRow(fixture)], rowCount: 1 },
    { rows: [flowRow(fixture, {
      status: "active",
      activeVersionKey: fixture.botFlowVersionKey,
    })], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
  ]);

  assert.equal((await database.repository.findByKey(7, fixture.botFlowKey))?.tenantId, 7);
  assert.equal(
    (await database.repository.findVersionByKey(
      7,
      fixture.botFlowKey,
      fixture.botFlowVersionKey,
    ))?.versionNumber,
    1,
  );
  assert.equal((await database.repository.listByTenant(7, 50)).length, 1);
  assert.equal((await database.repository.listActiveByTenant(7, 2)).length, 1);
  assert.equal((await database.repository.listVersions(7, fixture.botFlowKey, 50)).length, 1);
});

test("rejects invalid identities, malformed rows, and dependencies", async () => {
  const fixture = await definitionFixture();
  const database = repositoryFixture();
  await assert.rejects(
    database.repository.saveDraft({
      ...saveInput(fixture),
      botFlowVersionKey: `bot_flow_version_v1_${"f".repeat(64)}`,
    }),
    /identity is invalid/,
  );

  const malformed = repositoryFixture([], [{
    rows: [flowRow(fixture, { tenantId: "8" })],
    rowCount: 1,
  }]);
  await assert.rejects(
    malformed.repository.findByKey(7, fixture.botFlowKey),
    /outside the requested scope/,
  );
  assert.throws(
    () => createPostgresBotFlowRepository({}),
    /dependencies are invalid/,
  );
});
