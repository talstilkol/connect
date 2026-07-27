import assert from "node:assert/strict";
import test from "node:test";

import {
  createAiAgentActionHandler,
} from "../server/ai/aiAgentActionHandler.ts";
import {
  AiAgentActivationError,
  AiAgentInputError,
  AiAgentServiceError,
} from "../server/ai/aiAgentService.ts";
import {
  toKnowledgeSourceView,
} from "../server/ai/aiAgentView.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const aiAgentKey =
  `ai_agent_v1_${"a".repeat(64)}`;
const aiAgentVersionKey =
  `ai_agent_version_v1_${"b".repeat(64)}`;
const sourceKey =
  `knowledge_source_v1_${"c".repeat(64)}`;

const session = {
  externalUserId: "external-user-id",
  tenantId: 7,
  displayName: "tenant-name",
  status: "active",
  role: "manager",
};

function definition() {
  return {
    name: "מענה מבוסס ידע",
    systemPrompt:
      "יש לענות רק על בסיס ידע מאושר.",
    handoffMessage:
      "אין מידע מאושר. השיחה עוברת לנציג.",
    responseMode: "agent-approval",
    minimumGroundingScoreBasisPoints:
      8_000,
    monthlyCostLimitMinorUnits: 50_000,
    billingCurrency: "ILS",
    knowledgeSourceKeys: [sourceKey],
  };
}

function agent(overrides = {}) {
  return {
    aiAgentKey,
    tenantId: 7,
    name: "מענה מבוסס ידע",
    status: "draft",
    latestVersionKey: aiAgentVersionKey,
    latestVersionNumber: 1,
    activeVersionKey: null,
    version: 1,
    createdAt: "2026-07-26 09:00:00",
    updatedAt: "2026-07-26 09:00:00",
    ...overrides,
  };
}

function agentVersion(overrides = {}) {
  return {
    aiAgentVersionKey,
    aiAgentKey,
    tenantId: 7,
    versionNumber: 1,
    status: "draft",
    definition: definition(),
    publishedAt: null,
    createdAt: "2026-07-26 09:00:00",
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = [];
  const handler = createAiAgentActionHandler({
    applicationConfigured: () =>
      options.applicationConfigured ?? true,
    async createContext() {
      calls.push("context");

      if (options.contextError) {
        throw options.contextError;
      }

      return {
        session,
        service: {
          async list() {
            throw new Error("must-not-run");
          },
          async listKnowledgeSources() {
            throw new Error("must-not-run");
          },
          async readDetails() {
            calls.push("read-details");

            if (options.readError) {
              throw options.readError;
            }

            return {
              agent: agent({
                storageObjectKey:
                  "must-not-be-exposed",
                contentSha256:
                  "must-not-be-exposed",
              }),
              versions: [agentVersion()],
              activationReadiness: {
                ready: false,
                issues: [
                  "provider-required",
                ],
              },
            };
          },
          async saveDraft() {
            calls.push("save-draft");

            if (options.saveError) {
              throw options.saveError;
            }

            return {
              outcome: "created",
              agent: agent(),
              draftVersion: agentVersion(),
            };
          },
          async publishDraft() {
            calls.push("publish-draft");

            if (options.publishError) {
              throw options.publishError;
            }

            return {
              outcome: "updated",
              agent: agent({
                status: "active",
                activeVersionKey:
                  aiAgentVersionKey,
                version: 2,
              }),
              publishedVersion:
                agentVersion({
                  status: "published",
                  publishedAt:
                    "2026-07-26 09:05:00",
                }),
            };
          },
        },
      };
    },
  });

  return { calls, handler };
}

test("stops AI agent actions before context when configuration is missing", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.loadDetails(
      aiAgentKey,
    ),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await testFixture.handler.saveDraft({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await testFixture.handler.publishDraft({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(testFixture.calls, []);
});

test("returns a bounded AI agent view without tenant or storage fields", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.handler.loadDetails(
      aiAgentKey,
    );
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "loaded");
  assert.deepEqual(
    result.aiAgent.activationReadiness,
    {
      ready: false,
      issues: ["provider-required"],
    },
  );
  assert.doesNotMatch(
    serialized,
    /tenantId|externalUserId|displayName|storageObjectKey|contentSha256|lastErrorCode/,
  );
});

test("maps knowledge source metadata without storage identity, digest, or internal errors", () => {
  const view = toKnowledgeSourceView({
    sourceKey,
    tenantId: 7,
    contentSha256: "d".repeat(64),
    fileName: "מדיניות-שירות.pdf",
    mediaType: "application/pdf",
    sizeBytes: 4_096,
    storageObjectKey:
      `knowledge/v1/${sourceKey}`,
    status: "rejected",
    lastErrorCode:
      "PRIVATE_SCANNER_DETAIL",
    readyAt: null,
    version: 4,
    createdAt: "2026-07-26 09:00:00",
    updatedAt: "2026-07-26 09:01:00",
  });
  const serialized = JSON.stringify(view);

  assert.equal(view.sourceKey, sourceKey);
  assert.equal(view.status, "rejected");
  assert.doesNotMatch(
    serialized,
    /tenantId|contentSha256|storageObjectKey|lastErrorCode|PRIVATE_SCANNER_DETAIL/,
  );
});

test("returns only public draft and publication state", async () => {
  const saved =
    await fixture().handler.saveDraft({
      definition: definition(),
      expectedAgentVersion: null,
    });
  const published =
    await fixture().handler.publishDraft({
      aiAgentKey,
      aiAgentVersionKey,
      expectedAgentVersion: 1,
    });

  assert.equal(saved.status, "saved");
  assert.equal(saved.outcome, "created");
  assert.equal(
    published.status,
    "published",
  );
  assert.equal(
    published.agent.activeVersionKey,
    aiAgentVersionKey,
  );
  assert.doesNotMatch(
    JSON.stringify({ saved, published }),
    /tenantId|externalUserId/,
  );
});

test("returns bounded validation and activation blockers", async () => {
  const validationFixture = fixture({
    saveError: new AiAgentInputError([
      "invalid-system-prompt",
    ]),
  });
  const activationFixture = fixture({
    publishError:
      new AiAgentActivationError([
        "provider-required",
        "audit-sink-required",
      ]),
  });

  assert.deepEqual(
    await validationFixture.handler.saveDraft(
      {},
    ),
    {
      status: "validation-error",
      issues: ["invalid-system-prompt"],
    },
  );
  assert.deepEqual(
    await activationFixture.handler
      .publishDraft({}),
    {
      status: "activation-blocked",
      issues: [
        "provider-required",
        "audit-sink-required",
      ],
    },
  );
});

test("maps service and tenant failures without exposing internal messages", async () => {
  const serviceMappings = [
    ["INVALID_INPUT", "invalid-input"],
    ["NOT_FOUND", "not-found"],
    ["STATE_CONFLICT", "state-conflict"],
    ["INVALID_STATE", "invalid-state"],
    ["PERSISTENCE_FAILED", "server-error"],
  ];

  for (const [code, status] of serviceMappings) {
    const testFixture = fixture({
      readError:
        new AiAgentServiceError(code),
    });

    assert.deepEqual(
      await testFixture.handler.loadDetails(
        aiAgentKey,
      ),
      { status },
    );
  }

  const unauthenticated = fixture({
    contextError: new TenantSessionError(
      "AUTHENTICATION_REQUIRED",
      "private authentication detail",
    ),
  });
  const denied = fixture({
    contextError: new TenantSessionError(
      "PERMISSION_DENIED",
      "private permission detail",
    ),
  });

  assert.deepEqual(
    await unauthenticated.handler.loadDetails(
      aiAgentKey,
    ),
    { status: "unauthenticated" },
  );
  assert.deepEqual(
    await denied.handler.publishDraft({}),
    { status: "permission-denied" },
  );
});
