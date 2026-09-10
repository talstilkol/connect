import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import {
  createPostgresKnowledgeSourceRepository,
  postgresKnowledgeSourceSql,
} from "../server/platform/postgresKnowledgeSourceRepository.ts";

const timestamp = new Date("2026-08-17T08:00:00.000Z");
const laterTimestamp = new Date("2026-08-17T08:01:00.000Z");

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
    fileName: "מסמך-שירות.pdf",
    mediaType: "application/pdf",
    sizeBytes: "4096",
    storageObjectKey: `knowledge/v1/${fixture.sourceKey}`,
    status: "pending-validation",
    lastErrorCode: null,
    readyAt: null,
    version: "1",
    createdAt: timestamp,
    updatedAt: timestamp,
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
    repository: createPostgresKnowledgeSourceRepository({
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

function registerInput(fixture) {
  return {
    tenantId: 7,
    sourceKey: fixture.sourceKey,
    contentSha256: fixture.contentSha256,
    fileName: "  מסמך-שירות.pdf  ",
    mediaType: " APPLICATION/PDF ",
    sizeBytes: 4096,
  };
}

function transitionInput(fixture, overrides = {}) {
  return {
    tenantId: 7,
    sourceKey: fixture.sourceKey,
    expectedVersion: 1,
    action: "validation-passed",
    errorCode: null,
    ...overrides,
  };
}

test("registers normalized metadata atomically with a deterministic identity", async () => {
  const fixture = await sourceFixture();
  const database = repositoryFixture([
    { rows: [sourceRow(fixture)], rowCount: 1 },
  ]);

  const result = await database.repository.registerUploaded(
    registerInput(fixture),
  );

  assert.equal(result.outcome, "created");
  assert.equal(result.source.fileName, "מסמך-שירות.pdf");
  assert.equal(result.source.mediaType, "application/pdf");
  assert.deepEqual(database.transactionCalls, [
    { isolationLevel: "read-committed" },
  ]);
  assert.match(postgresKnowledgeSourceSql.insert, /ON CONFLICT DO NOTHING/);
  database.transactions.assertConsumed();
});

test("returns an exact concurrent registration replay and detects conflicts", async () => {
  const fixture = await sourceFixture();
  const replay = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [sourceRow(fixture)], rowCount: 1 },
  ]);
  assert.equal(
    (await replay.repository.registerUploaded(registerInput(fixture))).outcome,
    "unchanged",
  );

  const conflict = repositoryFixture([
    { rows: [], rowCount: 0 },
    {
      rows: [sourceRow(fixture, { fileName: "מסמך-אחר.pdf" })],
      rowCount: 1,
    },
  ]);
  assert.equal(
    (await conflict.repository.registerUploaded(registerInput(fixture))).outcome,
    "conflict",
  );
  assert.match(postgresKnowledgeSourceSql.findByKeyForUpdate, /FOR UPDATE/);
});

test("advances a source only behind the exact version and classifies replay", async () => {
  const fixture = await sourceFixture();
  const updatedRow = sourceRow(fixture, {
    status: "pending-scan",
    version: "2",
    updatedAt: laterTimestamp,
  });
  const updated = repositoryFixture([
    { rows: [sourceRow(fixture)], rowCount: 1 },
    { rows: [updatedRow], rowCount: 1 },
  ]);
  const result = await updated.repository.transition(transitionInput(fixture));
  assert.equal(result.outcome, "updated");
  assert.equal(result.source.status, "pending-scan");

  const replay = repositoryFixture([
    { rows: [updatedRow], rowCount: 1 },
  ]);
  assert.equal(
    (await replay.repository.transition(transitionInput(fixture))).outcome,
    "unchanged",
  );
});

test("keeps recovery claims exclusive and separates stale from invalid state", async () => {
  const fixture = await sourceFixture("b");
  const scanning = sourceRow(fixture, {
    status: "scanning",
    version: "3",
    updatedAt: laterTimestamp,
  });
  const claimed = repositoryFixture([
    { rows: [scanning], rowCount: 1 },
    {
      rows: [sourceRow(fixture, {
        status: "scanning",
        version: "4",
        updatedAt: laterTimestamp,
      })],
      rowCount: 1,
    },
  ]);
  assert.equal(
    (await claimed.repository.transition(transitionInput(fixture, {
      action: "scan-retry-started",
      expectedVersion: 3,
    }))).outcome,
    "updated",
  );

  const stale = repositoryFixture([
    {
      rows: [sourceRow(fixture, {
        status: "scanning",
        version: "4",
        updatedAt: laterTimestamp,
      })],
      rowCount: 1,
    },
  ]);
  assert.equal(
    (await stale.repository.transition(transitionInput(fixture, {
      action: "scan-retry-started",
      expectedVersion: 3,
    }))).outcome,
    "conflict",
  );

  const invalid = repositoryFixture([
    { rows: [sourceRow(fixture)], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(
    (await invalid.repository.transition(transitionInput(fixture, {
      action: "archive",
    }))).outcome,
    "invalid-state",
  );
});

test("records rejection evidence and preserves it when archived", async () => {
  const fixture = await sourceFixture("c");
  const rejected = sourceRow(fixture, {
    status: "rejected",
    lastErrorCode: "MALWARE_DETECTED",
    version: "2",
    updatedAt: laterTimestamp,
  });
  const database = repositoryFixture([
    { rows: [sourceRow(fixture)], rowCount: 1 },
    { rows: [rejected], rowCount: 1 },
  ]);
  const result = await database.repository.transition(transitionInput(fixture, {
    action: "rejected",
    errorCode: "MALWARE_DETECTED",
  }));
  assert.equal(result.outcome, "updated");
  assert.equal(result.source.lastErrorCode, "MALWARE_DETECTED");
  assert.deepEqual(database.transactions.calls[1].parameters, [
    7,
    fixture.sourceKey,
    1,
    "MALWARE_DETECTED",
  ]);
});

test("reads only tenant-scoped sources through bounded queries", async () => {
  const fixture = await sourceFixture("d");
  const database = repositoryFixture([], [
    { rows: [sourceRow(fixture)], rowCount: 1 },
    { rows: [sourceRow(fixture)], rowCount: 1 },
  ]);
  assert.equal(
    (await database.repository.findByKey(7, fixture.sourceKey))?.tenantId,
    7,
  );
  assert.equal((await database.repository.listByTenant(7, 100)).length, 1);
  assert.deepEqual(database.queries.calls[0].parameters, [7, fixture.sourceKey]);
  assert.deepEqual(database.queries.calls[1].parameters, [7, 100]);
});

test("rejects invalid identities, malformed rows, and dependencies", async () => {
  const fixture = await sourceFixture("e");
  const database = repositoryFixture();
  await assert.rejects(
    database.repository.registerUploaded({
      ...registerInput(fixture),
      sourceKey: `knowledge_source_v1_${"f".repeat(64)}`,
    }),
    /identity is invalid/,
  );

  const malformed = repositoryFixture([], [{
    rows: [sourceRow(fixture, { tenantId: "8" })],
    rowCount: 1,
  }]);
  await assert.rejects(
    malformed.repository.findByKey(7, fixture.sourceKey),
    /invalid knowledge source identity/,
  );
  assert.throws(
    () => createPostgresKnowledgeSourceRepository({}),
    /dependencies are invalid/,
  );
});
