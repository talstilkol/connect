import assert from "node:assert/strict";
import test from "node:test";

import {
  ActiveAiRuntimeAgentError,
  createActiveAiRuntimeAgentLoader,
} from "../server/ai/activeAiRuntimeAgent.ts";
import {
  deriveAiAgentKey,
  deriveAiAgentVersionKey,
  deriveKnowledgeSourceKey,
} from "../server/ai/aiAgentKey.ts";

async function activeAgentRecords() {
  const tenantId = 7;
  const sourceKey =
    await deriveKnowledgeSourceKey(
      tenantId,
      "a".repeat(64),
    );
  const definition = {
    name: "סוכן שירות פעיל",
    systemPrompt:
      "יש לענות רק לפי מידע מאושר.",
    handoffMessage:
      "השיחה עוברת לנציג.",
    responseMode: "automatic",
    minimumGroundingScoreBasisPoints:
      8_000,
    monthlyCostLimitMinorUnits: 50_000,
    billingCurrency: "ILS",
    knowledgeSourceKeys: [sourceKey],
  };
  const aiAgentKey = await deriveAiAgentKey(
    tenantId,
    definition.name,
  );
  const aiAgentVersionKey =
    await deriveAiAgentVersionKey(
      tenantId,
      aiAgentKey,
      1,
      definition,
    );
  const agent = {
    aiAgentKey,
    tenantId,
    name: definition.name,
    status: "active",
    latestVersionKey: aiAgentVersionKey,
    latestVersionNumber: 1,
    activeVersionKey: aiAgentVersionKey,
    version: 2,
    createdAt: "2026-07-26 09:00:00",
    updatedAt: "2026-07-26 09:05:00",
  };
  const version = {
    aiAgentVersionKey,
    aiAgentKey,
    tenantId,
    versionNumber: 1,
    status: "published",
    definition,
    publishedAt:
      "2026-07-26 09:05:00",
    createdAt: "2026-07-26 09:00:00",
  };

  return {
    tenantId,
    agent,
    version,
  };
}

test("loads exactly one active published AI agent version within the tenant", async () => {
  const records = await activeAgentRecords();
  const calls = [];
  const loader =
    createActiveAiRuntimeAgentLoader({
      async listActiveByTenant(
        tenantId,
        limit,
      ) {
        calls.push([
          "list-active",
          tenantId,
          limit,
        ]);
        return [records.agent];
      },
      async findVersionByKey(
        tenantId,
        aiAgentKey,
        aiAgentVersionKey,
      ) {
        calls.push([
          "find-version",
          tenantId,
          aiAgentKey,
          aiAgentVersionKey,
        ]);
        return records.version;
      },
    });

  const result = await loader.load(
    records.tenantId,
  );

  assert.equal(result.outcome, "loaded");
  assert.equal(
    result.agent.aiAgentKey,
    records.agent.aiAgentKey,
  );
  assert.equal(
    result.version.aiAgentVersionKey,
    records.version.aiAgentVersionKey,
  );
  assert.equal(calls[0][2], 2);
});

test("fails closed when no active agent or more than one active agent exists", async () => {
  const records = await activeAgentRecords();
  const absent =
    createActiveAiRuntimeAgentLoader({
      async listActiveByTenant() {
        return [];
      },
    });
  const ambiguous =
    createActiveAiRuntimeAgentLoader({
      async listActiveByTenant() {
        return [
          records.agent,
          records.agent,
        ];
      },
    });

  assert.deepEqual(
    await absent.load(records.tenantId),
    {
      outcome: "unavailable",
      reason: "no-active-agent",
    },
  );
  assert.deepEqual(
    await ambiguous.load(records.tenantId),
    {
      outcome: "unavailable",
      reason: "ambiguous-active-agent",
    },
  );
});

test("rejects a missing or mismatched active version", async () => {
  const records = await activeAgentRecords();
  const missing =
    createActiveAiRuntimeAgentLoader({
      async listActiveByTenant() {
        return [records.agent];
      },
      async findVersionByKey() {
        return null;
      },
    });
  const mismatched =
    createActiveAiRuntimeAgentLoader({
      async listActiveByTenant() {
        return [records.agent];
      },
      async findVersionByKey() {
        return {
          ...records.version,
          status: "archived",
        };
      },
    });

  for (const loader of [
    missing,
    mismatched,
  ]) {
    await assert.rejects(
      loader.load(records.tenantId),
      (error) =>
        error instanceof
          ActiveAiRuntimeAgentError &&
        error.code ===
          "AGENT_CONFIGURATION_INVALID",
    );
  }
});

test("maps repository failures to a bounded persistence error", async () => {
  const loader =
    createActiveAiRuntimeAgentLoader({
      async listActiveByTenant() {
        throw new Error(
          "private D1 details",
        );
      },
    });

  await assert.rejects(
    loader.load(7),
    (error) =>
      error instanceof
        ActiveAiRuntimeAgentError &&
      error.code === "PERSISTENCE_FAILED" &&
      !error.message.includes("private"),
  );
});
