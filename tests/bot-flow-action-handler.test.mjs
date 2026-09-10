import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotFlowActionHandler,
} from "../server/bot/botFlowActionHandler.ts";
import {
  BotFlowInputError,
  BotFlowServiceError,
} from "../server/bot/botFlowService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const botFlowKey =
  `bot_flow_v1_${"a".repeat(64)}`;
const botFlowVersionKey =
  `bot_flow_version_v1_${"b".repeat(64)}`;
const triggerKey =
  `bot_block_v1_${"c".repeat(64)}`;
const endKey =
  `bot_block_v1_${"d".repeat(64)}`;

const session = {
  externalUserId: "external-user-id",
  tenantId: 7,
  displayName: "tenant-name",
  status: "active",
  role: "manager",
};

function definition() {
  return {
    name: "מענה ראשוני",
    entryBlockKey: triggerKey,
    blocks: [
      {
        blockKey: triggerKey,
        type: "trigger",
        nextBlockKey: endKey,
      },
      {
        blockKey: endKey,
        type: "end",
      },
    ],
  };
}

function flow(overrides = {}) {
  return {
    botFlowKey,
    tenantId: 7,
    name: "מענה ראשוני",
    status: "draft",
    latestVersionKey: botFlowVersionKey,
    latestVersionNumber: 1,
    activeVersionKey: null,
    version: 1,
    createdAt: "2026-07-26 09:00:00",
    updatedAt: "2026-07-26 09:00:00",
    ...overrides,
  };
}

function flowVersion(overrides = {}) {
  return {
    botFlowVersionKey,
    botFlowKey,
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
  const handler = createBotFlowActionHandler({
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
          async readDetails() {
            calls.push("read-details");

            if (options.readError) {
              throw options.readError;
            }

            return {
              flow: flow(),
              versions: [flowVersion()],
            };
          },
          async saveDraft() {
            calls.push("save-draft");

            if (options.saveError) {
              throw options.saveError;
            }

            return {
              outcome: "created",
              flow: flow(),
              draftVersion: flowVersion(),
            };
          },
          async publishDraft() {
            calls.push("publish-draft");

            if (options.publishError) {
              throw options.publishError;
            }

            return {
              outcome: "updated",
              flow: flow({
                status: "active",
                activeVersionKey:
                  botFlowVersionKey,
                version: 2,
              }),
              publishedVersion: flowVersion({
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

test("stops bot flow actions before context when configuration is missing", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.loadDetails(
      botFlowKey,
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

test("returns bounded flow details without tenant persistence fields", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.handler.loadDetails(
      botFlowKey,
    );
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "loaded");
  assert.equal(
    result.botFlow.versions[0].definition.name,
    "מענה ראשוני",
  );
  assert.doesNotMatch(
    serialized,
    /tenantId|externalUserId|displayName/,
  );
  assert.deepEqual(testFixture.calls, [
    "context",
    "read-details",
  ]);
});

test("returns only public save and publication state", async () => {
  const saveFixture = fixture();
  const publishFixture = fixture();
  const saved =
    await saveFixture.handler.saveDraft({
      definition: definition(),
      expectedFlowVersion: null,
    });
  const published =
    await publishFixture.handler.publishDraft({
      botFlowKey,
      botFlowVersionKey,
      expectedFlowVersion: 1,
    });

  assert.equal(saved.status, "saved");
  assert.equal(saved.outcome, "created");
  assert.equal(
    published.status,
    "published",
  );
  assert.equal(
    published.flow.activeVersionKey,
    botFlowVersionKey,
  );
  assert.doesNotMatch(
    JSON.stringify({ saved, published }),
    /tenantId|externalUserId/,
  );
});

test("returns bounded validation issues without an internal error", async () => {
  const testFixture = fixture({
    saveError: new BotFlowInputError([
      "invalid-trigger",
    ]),
  });

  assert.deepEqual(
    await testFixture.handler.saveDraft({}),
    {
      status: "validation-error",
      issues: ["invalid-trigger"],
    },
  );

  const publication = fixture({
    publishError: new BotFlowInputError([
      "whatsapp-button-count-exceeded",
    ]),
  });

  assert.deepEqual(
    await publication.handler.publishDraft({}),
    {
      status: "validation-error",
      issues: [
        "whatsapp-button-count-exceeded",
      ],
    },
  );
});

test("maps every bot flow service failure to a public status", async () => {
  const mappings = [
    ["INVALID_INPUT", "invalid-input"],
    ["NOT_FOUND", "not-found"],
    ["STATE_CONFLICT", "state-conflict"],
    ["INVALID_STATE", "invalid-state"],
    ["PERSISTENCE_FAILED", "server-error"],
  ];

  for (const [code, status] of mappings) {
    const readFixture = fixture({
      readError: new BotFlowServiceError(code),
    });
    const saveFixture = fixture({
      saveError: new BotFlowServiceError(code),
    });
    const publishFixture = fixture({
      publishError:
        new BotFlowServiceError(code),
    });

    assert.deepEqual(
      await readFixture.handler.loadDetails(
        botFlowKey,
      ),
      { status },
    );
    assert.deepEqual(
      await saveFixture.handler.saveDraft({}),
      { status },
    );
    assert.deepEqual(
      await publishFixture.handler.publishDraft(
        {},
      ),
      { status },
    );
  }
});

test("maps tenant failures without exposing their messages", async () => {
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
      botFlowKey,
    ),
    { status: "unauthenticated" },
  );
  assert.deepEqual(
    await denied.handler.publishDraft({}),
    { status: "permission-denied" },
  );
});
