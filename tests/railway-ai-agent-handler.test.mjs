import assert from "node:assert/strict";
import test from "node:test";

import { createRailwayAiAgentHandler } from
  "../server/ai/railwayAiAgentHandler.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from
  "../server/platform/railwayApiMutationExecutor.ts";

const aiAgentKey = `ai_agent_v1_${"a".repeat(64)}`;
const aiAgentVersionKey = `ai_agent_version_v1_${"b".repeat(64)}`;
const definition = Object.freeze({
  name: "מענה מבוסס ידע",
  systemPrompt: "יש לענות רק על בסיס מידע מאושר.",
  handoffMessage: "השיחה עוברת לנציג.",
  responseMode: "agent-approval",
  minimumGroundingScoreBasisPoints: 8_000,
  monthlyCostLimitMinorUnits: 50_000,
  billingCurrency: "ILS",
  knowledgeSourceKeys: [],
});

function agent(overrides = {}) {
  return {
    aiAgentKey,
    name: definition.name,
    status: "draft",
    latestVersionKey: aiAgentVersionKey,
    latestVersionNumber: 1,
    activeVersionKey: null,
    version: 1,
    createdAt: "2026-08-21T08:00:00.000Z",
    updatedAt: "2026-08-21T08:00:00.000Z",
    ...overrides,
  };
}

function version(overrides = {}) {
  return {
    aiAgentVersionKey,
    versionNumber: 1,
    status: "draft",
    definition,
    publishedAt: null,
    createdAt: "2026-08-21T08:00:00.000Z",
    ...overrides,
  };
}

function fixture(responseOverride) {
  const calls = { identities: 0, requests: [] };
  const handler = createRailwayAiAgentHandler({
    applicationConfigured: () => true,
    inspectConfiguration: () => ({
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      configuration: {
        apiOrigin: "https://connect-api.up.railway.app",
        deploymentEnvironment: "production",
      },
    }),
    async resolveIdentity() {
      calls.identities += 1;
      return {
        status: "authenticated",
        oidcToken: "oidc.header.signature",
        userSessionToken: "session.header.signature",
      };
    },
    createClient() {
      return {
        async call(request) {
          calls.requests.push(request);
          if (responseOverride) return responseOverride(request);
          if (request.operation === "ai.agents.directory.read") {
            return {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: { agents: [agent()], knowledgeSources: [], canWrite: true },
            };
          }
          return {
            contractVersion: "connect.railway-api.v1",
            outcome: "ok",
            data: {
              aiAgent: {
                agent: agent(),
                versions: [version()],
                activationReadiness: {
                  ready: false,
                  issues: ["provider-required"],
                },
              },
            },
          };
        },
      };
    },
  });
  return { calls, handler };
}

test("reads a bounded AI directory and selected details through Railway", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.readCurrent();

  assert.equal(result.status, "ready");
  assert.equal(result.aiAgents.selectedAgent.agent.aiAgentKey, aiAgentKey);
  assert.deepEqual(
    testFixture.calls.requests.map(({ operation }) => operation),
    ["ai.agents.directory.read", "ai.agents.details.read"],
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|storageObjectKey|contentSha256|oidc\.header/,
  );
});

test("saves a canonical draft with a deterministic Railway key", async () => {
  const testFixture = fixture(() => ({
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: {
      replayed: false,
      outcome: "created",
      agent: agent(),
      draftVersion: version(),
    },
  }));
  const input = { definition, expectedAgentVersion: null };
  const result = await testFixture.handler.saveDraft(input);
  const [request] = testFixture.calls.requests;

  assert.equal(result.status, "saved");
  assert.equal(result.outcome, "created");
  assert.equal(request.operation, "ai.agents.draft.save");
  assert.equal(
    request.idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      "ai.agents.draft.save",
      request.payload,
    ),
  );
});

test("accepts a new draft while the previously published agent stays active", async () => {
  const previousPublishedVersionKey = `ai_agent_version_v1_${"c".repeat(64)}`;
  const testFixture = fixture(() => ({
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: {
      replayed: false,
      outcome: "updated",
      agent: agent({
        status: "active",
        latestVersionNumber: 2,
        activeVersionKey: previousPublishedVersionKey,
        version: 3,
      }),
      draftVersion: version({ versionNumber: 2 }),
    },
  }));

  const result = await testFixture.handler.saveDraft({
    definition,
    expectedAgentVersion: 2,
  });

  assert.equal(result.status, "saved");
  assert.equal(result.outcome, "updated");
  assert.equal(result.agent.status, "active");
  assert.equal(result.draftVersion.status, "draft");
});

test("preserves bounded activation blockers without claiming publication", async () => {
  const testFixture = fixture(() => ({
    contractVersion: "connect.railway-api.v1",
    outcome: "ok",
    data: {
      replayed: false,
      outcome: "activation-blocked",
      issues: ["provider-required", "audit-sink-required"],
    },
  }));
  const result = await testFixture.handler.publishDraft({
    aiAgentKey,
    aiAgentVersionKey,
    expectedAgentVersion: 1,
  });

  assert.deepEqual(result, {
    status: "activation-blocked",
    issues: ["provider-required", "audit-sink-required"],
  });
});

test("rejects invalid input and response extensions before UI exposure", async () => {
  const invalid = fixture();
  assert.equal((await invalid.handler.saveDraft({})).status, "validation-error");
  assert.equal(invalid.calls.identities, 0);

  const extended = fixture((request) => request.operation ===
    "ai.agents.directory.read"
    ? {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: {
          agents: [{ ...agent(), tenantId: 7 }],
          knowledgeSources: [],
          canWrite: true,
        },
      }
    : null);
  assert.equal((await extended.handler.readCurrent()).status, "server-error");
});
