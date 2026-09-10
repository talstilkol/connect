import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayCampaignHandler,
} from "../server/campaigns/railwayCampaignHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

const campaignKey = `campaign_v1_${"a".repeat(64)}`;
const templateKey = `template_v1_${"b".repeat(64)}`;

function campaign(overrides = {}) {
  return {
    campaignKey,
    name: "Campaign",
    status: "draft",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    templateName: "service_update",
    templateLanguage: "he",
    recipientCount: 2,
    version: 1,
    activatedAt: null,
    startedAt: null,
    completedAt: null,
    updatedAt: "2026-08-21T10:00:00.000Z",
    ...overrides,
  };
}

function snapshotPayload() {
  return {
    name: "Campaign",
    deliveryMode: "immediate",
    scheduledAt: null,
    templateKey,
    audienceSource: { kind: "all" },
    personalizationMapping: {},
  };
}

function fixture(options = {}) {
  const calls = { identities: 0, requests: [] };
  const handler = createRailwayCampaignHandler({
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
      return options.identity ?? {
        status: "authenticated",
        oidcToken: "oidc.token.value",
        userSessionToken: "session.token.value",
      };
    },
    createClient() {
      return {
        async call(request) {
          calls.requests.push(request);
          if (options.response) return options.response(request);
          if (request.operation === "campaigns.directory.read") {
            return {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: {
                campaigns: [campaign()],
                templates: [{
                  templateKey,
                  name: "service_update",
                  category: "UTILITY",
                  language: "he",
                  personalizationKeys: [],
                }],
                audiences: {
                  lists: [{ id: 1, name: "Customers", contactCount: 2 }],
                  tags: [],
                },
                canWrite: true,
                deliveryStatus: "configuration-required",
              },
            };
          }
          if (request.operation === "campaigns.snapshot.save") {
            return {
              contractVersion: "connect.railway-api.v1",
              outcome: "ok",
              data: { replayed: false, outcome: "saved", campaign: campaign() },
            };
          }
          return {
            contractVersion: "connect.railway-api.v1",
            outcome: "ok",
            data: {
              replayed: false,
              outcome: "activated",
              campaign: {
                campaignKey,
                status: "scheduled",
                version: 2,
                activatedAt: "2026-08-21T10:01:00.000Z",
                startedAt: null,
              },
            },
          };
        },
      };
    },
  });
  return { calls, handler };
}

test("reads a bounded campaign directory through Railway", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.readCurrent();

  assert.equal(result.status, "ready");
  assert.equal(result.campaigns[0].campaignKey, campaignKey);
  assert.equal(result.templates[0].templateKey, templateKey);
  assert.equal(result.audiences.lists[0].contactCount, 2);
  assert.equal(result.deliveryStatus, "configuration-required");
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|oidc\.token|session\.token/,
  );
});

test("saves and activates through deterministic campaign mutations", async () => {
  const testFixture = fixture();
  const savePayload = snapshotPayload();
  const activationPayload = { campaignKey, expectedVersion: 1 };
  const saved = await testFixture.handler.saveSnapshot(savePayload);
  const activated = await testFixture.handler.activate(activationPayload);

  assert.equal(saved.status, "saved");
  assert.equal(activated.status, "activated");
  assert.deepEqual(
    testFixture.calls.requests.map(({ idempotencyKey }) => idempotencyKey),
    await Promise.all([
      deriveRailwayApiDeterministicIdempotencyKey(
        "campaigns.snapshot.save",
        savePayload,
      ),
      deriveRailwayApiDeterministicIdempotencyKey(
        "campaigns.activate",
        activationPayload,
      ),
    ]),
  );
});

test("maps campaign prerequisites without exposing internal errors", async () => {
  for (const [outcome, expectedStatus] of [
    ["profile-required", "profile-required"],
    ["template-unavailable", "template-unavailable"],
    ["audience-invalid", "audience-invalid"],
  ]) {
    const testFixture = fixture({
      response() {
        return {
          contractVersion: "connect.railway-api.v1",
          outcome: "ok",
          data: { replayed: false, outcome },
        };
      },
    });
    assert.deepEqual(
      await testFixture.handler.saveSnapshot(snapshotPayload()),
      { status: expectedStatus },
    );
  }

  const unavailable = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: {
          replayed: false,
          outcome: "delivery-configuration-required",
        },
      };
    },
  });
  assert.deepEqual(
    await unavailable.handler.activate({ campaignKey, expectedVersion: 1 }),
    { status: "delivery-configuration-required" },
  );
});

test("fails closed before Railway for invalid or forged campaign input", async () => {
  const testFixture = fixture();
  assert.deepEqual(
    await testFixture.handler.saveSnapshot({
      ...snapshotPayload(),
      tenantId: 7,
    }),
    { status: "invalid-input" },
  );
  assert.deepEqual(
    await testFixture.handler.activate({ campaignKey: "bad", expectedVersion: 1 }),
    { status: "invalid-input" },
  );
  assert.equal(testFixture.calls.requests.length, 0);
});

test("rejects malformed campaign responses and handles configuration safely", async () => {
  const disabled = fixture({ applicationConfigured: false });
  assert.deepEqual(await disabled.handler.readCurrent(), {
    status: "configuration-required",
    campaigns: [],
    templates: [],
    audiences: { lists: [], tags: [] },
    canWrite: false,
    deliveryStatus: "configuration-required",
  });
  assert.equal(disabled.calls.identities, 0);

  const malformed = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: {
          campaigns: [{ ...campaign(), tenantId: 7 }],
          templates: [],
          audiences: { lists: [], tags: [] },
          canWrite: true,
          deliveryStatus: "ready",
        },
      };
    },
  });
  assert.equal((await malformed.handler.readCurrent()).status, "server-error");
});

test("campaign controls preserve action/version identity across a lost response and retry", async () => {
  const payload = { campaignKey, expectedVersion: 1, action: "pause" };
  let responseNumber = 0;
  const f = fixture({ response() {
    responseNumber += 1;
    if (responseNumber === 1) throw new Error("response lost");
    return { outcome: "ok", data: { outcome: "controlled", replayed: true,
      campaign: campaign({ status: "paused", version: 2, activatedAt: "2026-08-21T10:00:00.000Z" }) } };
  } });
  assert.deepEqual(await f.handler.control(payload), { status: "server-error" });
  assert.equal((await f.handler.control(payload)).status, "controlled");
  assert.deepEqual(f.calls.requests[0], f.calls.requests[1]);
  assert.equal(f.calls.requests[0].idempotencyKey, await deriveRailwayApiDeterministicIdempotencyKey("campaigns.control", payload));
});

test("rejects forged controls and mismatched successful control responses", async () => {
  for (const payload of [null, { campaignKey, expectedVersion: 1, action: "restart" },
    { campaignKey, expectedVersion: 1, action: "pause", tenantId: 7 },
    { campaignKey, expectedVersion: Number.MAX_SAFE_INTEGER, action: "cancel" }]) {
    const f = fixture();
    assert.deepEqual(await f.handler.control(payload), { status: "invalid-input" });
    assert.equal(f.calls.requests.length, 0);
  }
  for (const changed of [{ version: 3 }, { status: "running" }, { campaignKey: `campaign_v1_${"b".repeat(64)}` }]) {
    const f = fixture({ response() { return { outcome: "ok", data: { outcome: "controlled", replayed: false,
      campaign: campaign({ status: "paused", version: 2, activatedAt: "2026-08-21T10:00:00.000Z", ...changed }) } }; } });
    assert.deepEqual(await f.handler.control({ campaignKey, expectedVersion: 1, action: "pause" }), { status: "server-error" });
  }
});

test("maps control conflict and resume configuration without exposing server details", async () => {
  for (const outcome of ["state-conflict", "delivery-configuration-required"]) {
    const f = fixture({ response() { return { outcome: "ok", data: { replayed: false, outcome } }; } });
    assert.deepEqual(await f.handler.control({ campaignKey, expectedVersion: 1, action: "resume" }), { status: outcome });
  }
});
