import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
} from "../server/ai/aiAgentKey.ts";
import {
  createPostgresAiAgentRepository,
  postgresAiAgentSql,
} from "../server/platform/postgresAiAgentRepository.ts";

const timestamp = new Date("2026-08-19T08:00:00.000Z");
const sourceKey = `knowledge_source_v1_${"a".repeat(64)}`;

async function definitionFixture(versionNumber = 1) {
  const definition = {
    name: "מענה מבוסס ידע",
    systemPrompt: versionNumber === 1
      ? "יש לענות רק על בסיס מקורות ידע מאושרים."
      : "יש לענות בקצרה ורק על בסיס מקורות ידע מאושרים.",
    handoffMessage: "לא נמצא מידע מאושר. השיחה עוברת לנציג.",
    responseMode: null,
    minimumGroundingScoreBasisPoints: null,
    monthlyCostLimitMinorUnits: null,
    billingCurrency: null,
    knowledgeSourceKeys: [sourceKey],
  };
  const aiAgentKey = await deriveAiAgentKey(7, definition.name);
  const aiAgentVersionKey = await deriveAiAgentVersionKey(
    7,
    aiAgentKey,
    versionNumber,
    definition,
  );
  return { aiAgentKey, aiAgentVersionKey, definition, versionNumber };
}

function agentRow(fixture, overrides = {}) {
  return {
    aiAgentKey: fixture.aiAgentKey,
    tenantId: "7",
    name: fixture.definition.name,
    status: "draft",
    latestVersionKey: fixture.aiAgentVersionKey,
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
    aiAgentVersionKey: fixture.aiAgentVersionKey,
    aiAgentKey: fixture.aiAgentKey,
    tenantId: "7",
    versionNumber: String(fixture.versionNumber),
    status: "draft",
    definitionJson: fixture.definition,
    publishedAt: null,
    createdAt: timestamp,
    ...overrides,
  };
}

function sourceRow(value = sourceKey) {
  return { sourceKey: value };
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
    repository: createPostgresAiAgentRepository({
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

function saveInput(fixture, expectedAgentVersion = null) {
  return {
    tenantId: 7,
    aiAgentKey: fixture.aiAgentKey,
    aiAgentVersionKey: fixture.aiAgentVersionKey,
    versionNumber: fixture.versionNumber,
    expectedAgentVersion,
    definition: fixture.definition,
  };
}

test("creates a deterministic AI agent draft, version, and source link atomically", async () => {
  const fixture = await definitionFixture();
  const database = repositoryFixture([
    { rows: [agentRow(fixture)], rowCount: 1 },
    { rows: [], rowCount: 0 },
    { rows: [sourceRow()], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
    { rows: [sourceRow()], rowCount: 1 },
  ]);

  const result = await database.repository.saveDraft(saveInput(fixture));

  assert.equal(result.outcome, "created");
  assert.deepEqual(result.draftVersion.definition.knowledgeSourceKeys, [sourceKey]);
  assert.deepEqual(database.transactionCalls, [{ isolationLevel: "read-committed" }]);
  assert.match(postgresAiAgentSql.insertAgent, /jsonb_array_elements_text/);
  assert.match(postgresAiAgentSql.insertVersionSources, /ON CONFLICT DO NOTHING/);
  database.transactions.assertConsumed();
});

test("returns an exact concurrent replay and rejects mismatched create state", async () => {
  const fixture = await definitionFixture();
  const exact = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [agentRow(fixture)], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
    { rows: [sourceRow()], rowCount: 1 },
  ]);
  assert.equal(
    (await exact.repository.saveDraft(saveInput(fixture))).outcome,
    "unchanged",
  );

  const conflict = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [agentRow(fixture, { version: "2" })], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await conflict.repository.saveDraft(saveInput(fixture))).outcome,
    "conflict",
  );
});

test("appends an immutable version only behind the exact agent version", async () => {
  const first = await definitionFixture(1);
  const second = await definitionFixture(2);
  const database = repositoryFixture([
    { rows: [agentRow(first)], rowCount: 1 },
    { rows: [], rowCount: 0 },
    { rows: [sourceRow()], rowCount: 1 },
    { rows: [versionRow(second)], rowCount: 1 },
    { rows: [sourceRow()], rowCount: 1 },
    { rows: [agentRow(second)], rowCount: 1 },
  ]);

  const result = await database.repository.saveDraft(saveInput(second, 1));

  assert.equal(result.outcome, "updated");
  assert.deepEqual(database.transactions.calls[5].parameters, [
    7,
    second.aiAgentKey,
    1,
    second.aiAgentVersionKey,
    2,
    second.definition.name,
  ]);
  assert.match(postgresAiAgentSql.findAgentByKeyForUpdate, /FOR UPDATE/);
});

test("rejects absent or cross-tenant knowledge sources without version writes", async () => {
  const fixture = await definitionFixture();
  const missing = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await missing.repository.saveDraft(saveInput(fixture))).outcome,
    "conflict",
  );
  assert.equal(missing.transactions.calls.length, 2);

  const current = await definitionFixture(1);
  const next = await definitionFixture(2);
  const crossTenant = repositoryFixture([
    { rows: [agentRow(current)], rowCount: 1 },
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await crossTenant.repository.saveDraft(saveInput(next, 1))).outcome,
    "conflict",
  );
  assert.equal(crossTenant.transactions.calls.length, 3);
});

test("publishes a draft and archives the previous publication atomically", async () => {
  const fixture = await definitionFixture();
  const publishedAt = new Date("2026-08-19T08:01:00.000Z");
  const archivedKey = `ai_agent_version_v1_${"f".repeat(64)}`;
  const database = repositoryFixture([
    { rows: [agentRow(fixture)], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
    { rows: [sourceRow()], rowCount: 1 },
    { rows: [{ aiAgentVersionKey: archivedKey }], rowCount: 1 },
    {
      rows: [versionRow(fixture, { status: "published", publishedAt })],
      rowCount: 1,
    },
    {
      rows: [agentRow(fixture, {
        status: "active",
        activeVersionKey: fixture.aiAgentVersionKey,
        version: "2",
        updatedAt: publishedAt,
      })],
      rowCount: 1,
    },
    { rows: [sourceRow()], rowCount: 1 },
  ]);

  const result = await database.repository.publishDraft(
    7,
    fixture.aiAgentKey,
    fixture.aiAgentVersionKey,
    1,
  );

  assert.equal(result.outcome, "updated");
  assert.equal(result.publishedVersion.status, "published");
  assert.match(postgresAiAgentSql.archivePublishedVersions, /status = 'archived'/);
  assert.match(postgresAiAgentSql.activateAgent, /version = version \+ 1/);
});

test("classifies publication replay, conflict, invalid state, and not found", async () => {
  const fixture = await definitionFixture();
  const publishedAt = new Date("2026-08-19T08:01:00.000Z");
  const replay = repositoryFixture([
    { rows: [agentRow(fixture, {
      status: "active",
      activeVersionKey: fixture.aiAgentVersionKey,
      version: "2",
      updatedAt: publishedAt,
    })], rowCount: 1 },
    { rows: [versionRow(fixture, { status: "published", publishedAt })], rowCount: 1 },
    { rows: [sourceRow()], rowCount: 1 },
  ]);
  assert.equal(
    (await replay.repository.publishDraft(
      7,
      fixture.aiAgentKey,
      fixture.aiAgentVersionKey,
      1,
    )).outcome,
    "unchanged",
  );

  const conflict = repositoryFixture([
    { rows: [agentRow(fixture, { version: "3" })], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
    { rows: [sourceRow()], rowCount: 1 },
  ]);
  assert.equal(
    (await conflict.repository.publishDraft(
      7,
      fixture.aiAgentKey,
      fixture.aiAgentVersionKey,
      1,
    )).outcome,
    "conflict",
  );

  const invalid = repositoryFixture([
    { rows: [agentRow(fixture)], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await invalid.repository.publishDraft(
      7,
      fixture.aiAgentKey,
      fixture.aiAgentVersionKey,
      1,
    )).outcome,
    "invalid-state",
  );

  const absent = repositoryFixture([{ rows: [], rowCount: 0 }]);
  assert.equal(
    (await absent.repository.publishDraft(
      7,
      fixture.aiAgentKey,
      fixture.aiAgentVersionKey,
      1,
    )).outcome,
    "not-found",
  );
});

test("reads only tenant-scoped agents, versions, and exact source links", async () => {
  const fixture = await definitionFixture();
  const database = repositoryFixture([], [
    { rows: [agentRow(fixture)], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
    { rows: [sourceRow()], rowCount: 1 },
    { rows: [agentRow(fixture)], rowCount: 1 },
    { rows: [agentRow(fixture, {
      status: "active",
      activeVersionKey: fixture.aiAgentVersionKey,
    })], rowCount: 1 },
    { rows: [versionRow(fixture)], rowCount: 1 },
    { rows: [sourceRow()], rowCount: 1 },
  ]);

  assert.equal((await database.repository.findByKey(7, fixture.aiAgentKey))?.tenantId, 7);
  assert.equal(
    (await database.repository.findVersionByKey(
      7,
      fixture.aiAgentKey,
      fixture.aiAgentVersionKey,
    ))?.versionNumber,
    1,
  );
  assert.equal((await database.repository.listByTenant(7, 50)).length, 1);
  assert.equal((await database.repository.listActiveByTenant(7, 2)).length, 1);
  assert.equal((await database.repository.listVersions(7, fixture.aiAgentKey, 50)).length, 1);

  const mismatched = repositoryFixture([], [
    { rows: [versionRow(fixture)], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  await assert.rejects(
    mismatched.repository.findVersionByKey(
      7,
      fixture.aiAgentKey,
      fixture.aiAgentVersionKey,
    ),
    /mismatched sources/,
  );
});

test("rejects invalid identities, malformed rows, and dependencies", async () => {
  const fixture = await definitionFixture();
  const database = repositoryFixture();
  await assert.rejects(
    database.repository.saveDraft({
      ...saveInput(fixture),
      aiAgentVersionKey: `ai_agent_version_v1_${"f".repeat(64)}`,
    }),
    /identity is invalid/,
  );

  const malformed = repositoryFixture([], [{
    rows: [agentRow(fixture, { tenantId: "8" })],
    rowCount: 1,
  }]);
  await assert.rejects(
    malformed.repository.findByKey(7, fixture.aiAgentKey),
    /invalid AI agent identity/,
  );
  assert.throws(
    () => createPostgresAiAgentRepository({}),
    /dependencies are invalid/,
  );
});
