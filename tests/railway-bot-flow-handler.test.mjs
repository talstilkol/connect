import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayBotFlowHandler,
} from "../server/bot/railwayBotFlowHandler.ts";
import {
  parseRailwayBotFlowDetails,
} from "../server/bot/railwayBotFlowResult.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

const botFlowKey = `bot_flow_v1_${"a".repeat(64)}`;
const botFlowVersionKey = `bot_flow_version_v1_${"b".repeat(64)}`;
const triggerKey = `bot_block_v1_${"c".repeat(64)}`;
const endKey = `bot_block_v1_${"d".repeat(64)}`;

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
    name: "מענה ראשוני",
    status: "draft",
    latestVersionKey: botFlowVersionKey,
    latestVersionNumber: 1,
    activeVersionKey: null,
    version: 1,
    createdAt: "2026-08-21T08:00:00.000Z",
    updatedAt: "2026-08-21T08:00:00.000Z",
    ...overrides,
  };
}

function details(overrides = {}) {
  return {
    flow: flow(),
    versions: [{
      botFlowVersionKey,
      versionNumber: 1,
      status: "draft",
      definition: definition(),
      publishedAt: null,
      createdAt: "2026-08-21T08:00:00.000Z",
    }],
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = {
    identities: 0,
    configurations: [],
    requests: [],
  };
  const handler = createRailwayBotFlowHandler({
    applicationConfigured: () => options.applicationConfigured ?? true,
    inspectConfiguration: () => options.configuration ?? {
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      configuration: {
        apiOrigin: "https://railway.example.com",
        deploymentEnvironment: "production",
      },
    },
    async resolveIdentity() {
      calls.identities += 1;
      if (options.identityError) throw options.identityError;
      return options.identity ?? {
        status: "authenticated",
        oidcToken: "oidc.token.value",
        userSessionToken: "user.token.value",
      };
    },
    createClient(configuration) {
      calls.configurations.push(configuration);
      return {
        async call(request) {
          calls.requests.push(request);
          if (options.response) return options.response(request);
          if (request.operation === "bot.flows.list") {
            return {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: { flows: [flow()], canWrite: true },
            };
          }
          if (request.operation === "bot.flows.draft.save") {
            return {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: {
                replayed: false,
                outcome: "created",
                flow: flow(),
                draftVersion: details().versions[0],
              },
            };
          }
          if (request.operation === "bot.flows.publish") {
            return {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: {
                replayed: false,
                outcome: "updated",
                flow: flow({
                  status: "active",
                  activeVersionKey: botFlowVersionKey,
                  version: 2,
                  updatedAt: "2026-08-21T08:01:00.000Z",
                }),
                publishedVersion: {
                  ...details().versions[0],
                  status: "published",
                  publishedAt: "2026-08-21T08:01:00.000Z",
                },
              },
            };
          }
          return {
            contractVersion: "connect.railway-api.v1",
            outcome: "ok",
            data: { botFlow: details() },
          };
        },
      };
    },
  });

  return { calls, handler };
}

test("reads the bot flow directory and selected details through Railway", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.readCurrent();

  assert.equal(result.status, "ready");
  assert.equal(result.botFlows.flows[0].botFlowKey, botFlowKey);
  assert.equal(
    result.botFlows.selectedFlow.versions[0].botFlowVersionKey,
    botFlowVersionKey,
  );
  assert.deepEqual(
    testFixture.calls.requests.map(({ operation }) => operation),
    ["bot.flows.list", "bot.flows.details.read"],
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|oidc\.token|user\.token/,
  );
});

test("returns a ready empty directory without requesting details", async () => {
  const testFixture = fixture({
    response(request) {
      assert.equal(request.operation, "bot.flows.list");
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: { flows: [], canWrite: false },
      };
    },
  });

  const result = await testFixture.handler.readCurrent();
  assert.deepEqual(result, {
    status: "ready",
    botFlows: { flows: [], selectedFlow: null, canWrite: false },
  });
  assert.equal(testFixture.calls.requests.length, 1);
});

test("loads one validated bot flow through the bounded query", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.loadDetails(botFlowKey);

  assert.equal(result.status, "loaded");
  assert.equal(result.botFlow.flow.botFlowKey, botFlowKey);
  assert.deepEqual(testFixture.calls.requests[0], {
    contractVersion: "connect.railway-api.v1",
    operation: "bot.flows.details.read",
    requestKind: "query",
    idempotencyKey: null,
    payload: { botFlowKey },
  });
});

test("saves and publishes through deterministic Railway mutations", async () => {
  const testFixture = fixture();
  const draftPayload = {
    definition: definition(),
    expectedFlowVersion: null,
  };
  const publishPayload = {
    botFlowKey,
    botFlowVersionKey,
    expectedFlowVersion: 1,
  };
  const saved = await testFixture.handler.saveDraft(draftPayload);
  const published = await testFixture.handler.publishDraft(publishPayload);

  assert.equal(saved.status, "saved");
  assert.equal(saved.outcome, "created");
  assert.equal(published.status, "published");
  assert.equal(published.flow.status, "active");
  const expectedKeys = await Promise.all([
    deriveRailwayApiDeterministicIdempotencyKey(
      "bot.flows.draft.save",
      draftPayload,
    ),
    deriveRailwayApiDeterministicIdempotencyKey(
      "bot.flows.publish",
      publishPayload,
    ),
  ]);
  assert.deepEqual(
    testFixture.calls.requests.map(({ idempotencyKey }) => idempotencyKey),
    expectedKeys,
  );
});

test("fails closed for configuration, authentication, invalid input, and API errors", async () => {
  const disabled = fixture({ applicationConfigured: false });
  assert.deepEqual(await disabled.handler.readCurrent(), {
    status: "configuration-required",
    botFlows: { flows: [], selectedFlow: null, canWrite: false },
  });
  assert.equal(disabled.calls.identities, 0);

  const unauthenticated = fixture({
    identity: {
      status: "unauthenticated",
      oidcToken: null,
      userSessionToken: null,
    },
  });
  assert.deepEqual(await unauthenticated.handler.loadDetails(botFlowKey), {
    status: "unauthenticated",
  });

  const invalid = fixture();
  assert.deepEqual(await invalid.handler.loadDetails("bad-key"), {
    status: "invalid-input",
  });
  assert.equal(invalid.calls.requests.length, 0);

  const missing = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code: "NOT_FOUND",
      };
    },
  });
  assert.deepEqual(await missing.handler.loadDetails(botFlowKey), {
    status: "not-found",
  });

  const conflict = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code: "CONFLICT",
      };
    },
  });
  assert.deepEqual(await conflict.handler.saveDraft({
    definition: definition(),
    expectedFlowVersion: null,
  }), { status: "state-conflict" });

  const forbidden = fixture();
  assert.deepEqual(await forbidden.handler.saveDraft({
    definition: definition(),
    expectedFlowVersion: null,
    tenantId: 7,
  }), { status: "invalid-input" });
  assert.equal(forbidden.calls.requests.length, 0);
});

test("rejects malformed Railway bot flow responses", async () => {
  const malformed = fixture({
    response(request) {
      return request.operation === "bot.flows.list"
        ? {
            contractVersion: "connect.railway-api.v1",
            outcome: "ok",
            data: {
              flows: [{ ...flow(), tenantId: 7 }],
              canWrite: true,
            },
          }
        : {
            contractVersion: "connect.railway-api.v1",
            outcome: "ok",
            data: { botFlow: details() },
          };
    },
  });

  assert.deepEqual(await malformed.handler.readCurrent(), {
    status: "server-error",
    botFlows: { flows: [], selectedFlow: null, canWrite: false },
  });
});

test("allows an older active version outside the bounded version page", () => {
  const olderActiveVersionKey =
    `bot_flow_version_v1_${"e".repeat(64)}`;
  const parsed = parseRailwayBotFlowDetails(
    details({
      flow: flow({
        status: "active",
        activeVersionKey: olderActiveVersionKey,
      }),
    }),
    botFlowKey,
  );

  assert.ok(parsed);
  assert.equal(parsed.flow.activeVersionKey, olderActiveVersionKey);
  assert.equal(parsed.versions.length, 1);
});
