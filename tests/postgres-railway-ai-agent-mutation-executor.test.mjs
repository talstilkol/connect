import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";
import { createPostgresRailwayAiAgentMutationExecutor } from
  "../server/platform/postgresRailwayAiAgentMutationExecutor.ts";

const idempotencyKey = `connect_idempotency_v1_${"a".repeat(64)}`;
const requestDigest = `railway_mutation_request_v1_${"b".repeat(64)}`;
const contentDigest = "c".repeat(64);
const sourceKey = await deriveKnowledgeSourceKey(7, contentDigest);
const definition = Object.freeze({
  name: "מענה מבוסס ידע",
  systemPrompt: "יש לענות רק על בסיס מידע מאושר.",
  handoffMessage: "השיחה עוברת לנציג.",
  responseMode: "agent-approval",
  minimumGroundingScoreBasisPoints: 8_000,
  monthlyCostLimitMinorUnits: 50_000,
  billingCurrency: "ILS",
  knowledgeSourceKeys: [sourceKey],
});
const aiAgentKey = await deriveAiAgentKey(7, definition.name);
const aiAgentVersionKey = await deriveAiAgentVersionKey(
  7,
  aiAgentKey,
  1,
  definition,
);
const session = Object.freeze({
  tenantId: 7,
  externalUserId: "verified-user",
  displayName: "Verified workspace",
  status: "active",
  role: "manager",
});
const timestamp = new Date("2026-08-21T08:00:00.000Z");

function command(operation, payload, overrides = {}) {
  return {
    session,
    operation,
    idempotencyKey,
    requestDigest,
    payload,
    ...overrides,
  };
}

function result(rows, rowCount = rows.length) {
  return { rows, rowCount };
}

function sourceRow() {
  return {
    sourceKey,
    tenantId: "7",
    contentSha256: contentDigest,
    fileName: "מדיניות.pdf",
    mediaType: "application/pdf",
    sizeBytes: "4096",
    storageObjectKey: `knowledge/v1/${sourceKey}`,
    status: "ready",
    lastErrorCode: null,
    readyAt: timestamp,
    version: "1",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function agentRow(overrides = {}) {
  return {
    aiAgentKey,
    tenantId: "7",
    name: definition.name,
    status: "draft",
    latestVersionKey: aiAgentVersionKey,
    latestVersionNumber: "1",
    activeVersionKey: null,
    version: "1",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function versionRow(overrides = {}) {
  return {
    aiAgentVersionKey,
    aiAgentKey,
    tenantId: "7",
    versionNumber: "1",
    status: "draft",
    definitionJson: definition,
    publishedAt: null,
    createdAt: timestamp,
    ...overrides,
  };
}

function transactionFixture(responses) {
  const queue = [...responses];
  const calls = { queries: [], committed: 0, rolledBack: 0 };
  return {
    calls,
    queue,
    manager: {
      async transaction(_options, execute) {
        try {
          const value = await execute({
            async query(sql, parameters) {
              calls.queries.push({ sql, parameters });
              const next = queue.shift();
              if (next instanceof Error) throw next;
              if (next === undefined) throw new Error("unexpected query");
              return next;
            },
          });
          calls.committed += 1;
          return value;
        } catch (error) {
          calls.rolledBack += 1;
          throw error;
        }
      },
    },
  };
}

test("commits an AI draft, immutable audit, and receipt together", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([sourceRow()]),
    result([agentRow()]),
    result([], 0),
    result([{ sourceKey }]),
    result([versionRow()]),
    result([{ sourceKey }]),
    result([{ id: "101" }]),
    result([{ idempotencyKey }]),
  ]);
  const saved = await createPostgresRailwayAiAgentMutationExecutor(
    fixture.manager,
  ).execute(command("ai.agents.draft.save", {
    definition,
    expectedAgentVersion: null,
  }));

  assert.equal(saved.outcome, "committed");
  assert.equal(saved.state.outcome, "created");
  assert.equal(saved.state.agent.aiAgentKey, aiAgentKey);
  assert.equal(fixture.calls.committed, 1);
  assert.equal(fixture.calls.rolledBack, 0);
  assert.equal(fixture.queue.length, 0);
  assert.deepEqual(fixture.calls.queries[7].parameters.slice(0, 5), [
    7,
    "verified-user",
    "ai.agents.draft.save",
    aiAgentKey,
    idempotencyKey,
  ]);
});

test("replays a completed AI draft without another domain write", async () => {
  const state = {
    outcome: "created",
    agent: {
      aiAgentKey,
      name: definition.name,
      status: "draft",
      latestVersionKey: aiAgentVersionKey,
      latestVersionNumber: 1,
      activeVersionKey: null,
      version: 1,
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString(),
    },
    draftVersion: {
      aiAgentVersionKey,
      versionNumber: 1,
      status: "draft",
      definition,
      publishedAt: null,
      createdAt: timestamp.toISOString(),
    },
  };
  const fixture = transactionFixture([
    result([], 0),
    result([{
      requestDigest,
      status: "completed",
      responseJson: JSON.stringify(state),
    }]),
  ]);
  const replayed = await createPostgresRailwayAiAgentMutationExecutor(
    fixture.manager,
  ).execute(command("ai.agents.draft.save", {
    definition,
    expectedAgentVersion: null,
  }));

  assert.equal(replayed.outcome, "replayed");
  assert.deepEqual(replayed.state, state);
  assert.equal(fixture.calls.queries.length, 2);
});

test("rolls back the receipt when publication readiness is blocked", async () => {
  const fixture = transactionFixture([
    result([{ idempotencyKey }]),
    result([versionRow()]),
    result([{ sourceKey }]),
    result([sourceRow()]),
  ]);
  const blocked = await createPostgresRailwayAiAgentMutationExecutor(
    fixture.manager,
  ).execute(command("ai.agents.publish", {
    aiAgentKey,
    aiAgentVersionKey,
    expectedAgentVersion: 1,
  }));

  assert.equal(blocked.outcome, "activation-blocked");
  assert.ok(blocked.issues.includes("provider-required"));
  assert.equal(fixture.calls.committed, 0);
  assert.equal(fixture.calls.rolledBack, 1);
  assert.equal(fixture.calls.queries.length, 4);
});

test("rejects malformed commands before opening PostgreSQL", async () => {
  const fixture = transactionFixture([]);
  const invalid = await createPostgresRailwayAiAgentMutationExecutor(
    fixture.manager,
  ).execute(command("ai.agents.publish", {
    aiAgentKey: "invalid",
    aiAgentVersionKey,
    expectedAgentVersion: 1,
  }));

  assert.deepEqual(invalid, {
    outcome: "unavailable",
    tenantId: null,
    state: null,
  });
  assert.equal(fixture.calls.queries.length, 0);
});
