import assert from "node:assert/strict";
import test from "node:test";

import {
  createCampaignActionHandler,
} from "../server/campaigns/campaignActionHandler.ts";
import {
  CampaignActivationError,
} from "../server/campaigns/campaignActivationService.ts";
import {
  CampaignSnapshotError,
} from "../server/campaigns/campaignSnapshotService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const campaignKey =
  `campaign_v1_${"a".repeat(64)}`;
const templateKey =
  `template_v1_${"b".repeat(64)}`;
const session = {
  externalUserId: "external-user-id",
  tenantId: 7,
  displayName: "tenant-name",
  status: "active",
  role: "owner",
};

function campaign() {
  return {
    campaignKey,
    tenantId: 7,
    name: "עדכון שירות",
    status: "draft",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: {
      templateKey,
      metaTemplateId: "400004",
      version: 3,
      name: "service_update",
      category: "UTILITY",
      language: "he",
      header: "",
      body: "עדכון",
      footer: "",
      variableExamples: {},
      buttonMode: "none",
      quickReplies: [],
      urlButton: {
        enabled: false,
        mode: "static",
        text: "",
        value: "",
        example: "",
      },
      phoneButton: {
        enabled: false,
        text: "",
        value: "",
      },
    },
    audienceSnapshotKey: "c".repeat(64),
    recipientCount: 2,
    version: 1,
    activatedAt: null,
    startedAt: null,
    completedAt: null,
    lastErrorCode: null,
    createdAt: "2026-07-26T09:00:00.000Z",
    updatedAt: "2026-07-26T09:00:00.000Z",
  };
}

function fixture(options = {}) {
  const calls = [];
  const handler = createCampaignActionHandler({
    applicationConfigured: () =>
      options.applicationConfigured ?? true,
    deliveryConfigured: () =>
      options.deliveryConfigured ?? true,
    async createSnapshotContext() {
      calls.push("snapshot-context");

      if (options.snapshotContextError) {
        throw options.snapshotContextError;
      }

      return {
        session,
        service: {
          async list() {
            throw new Error("must-not-run");
          },
          async save() {
            calls.push("save");

            if (options.saveError) {
              throw options.saveError;
            }

            return campaign();
          },
        },
      };
    },
    async createActivationContext() {
      calls.push("activation-context");

      if (options.activationContextError) {
        throw options.activationContextError;
      }

      return {
        session,
        service: {
          async activate() {
            calls.push("activate");

            if (options.activationError) {
              throw options.activationError;
            }

            return {
              campaignKey,
              tenantId: 7,
              status: "scheduled",
              version: 2,
              activatedAt:
                "2026-07-26T10:00:00.000Z",
              startedAt: null,
            };
          },
        },
      };
    },
  });

  return { calls, handler };
}

test("stops campaign actions before context when the application is unavailable", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.saveSnapshot({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await testFixture.handler.activate({}),
    { status: "configuration-required" },
  );
  assert.deepEqual(testFixture.calls, []);
});

test("returns a bounded campaign DTO after a server snapshot save", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.handler.saveSnapshot({
      name: "עדכון שירות",
    });

  assert.equal(result.status, "saved");
  assert.equal(
    result.campaign.name,
    "עדכון שירות",
  );
  assert.equal(
    "tenantId" in result.campaign,
    false,
  );
  assert.equal(
    "audienceSnapshotKey" in result.campaign,
    false,
  );
  assert.deepEqual(testFixture.calls, [
    "snapshot-context",
    "save",
  ]);
});

test("blocks activation before context until delivery is configured", async () => {
  const testFixture = fixture({
    deliveryConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.activate({
      campaignKey,
      expectedVersion: 1,
    }),
    {
      status:
        "delivery-configuration-required",
    },
  );
  assert.deepEqual(testFixture.calls, []);
});

test("returns only the scheduled activation state", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.handler.activate({
      campaignKey,
      expectedVersion: 1,
    });

  assert.deepEqual(result, {
    status: "activated",
    campaign: {
      campaignKey,
      status: "scheduled",
      version: 2,
      activatedAt:
        "2026-07-26T10:00:00.000Z",
      startedAt: null,
    },
  });
  assert.deepEqual(testFixture.calls, [
    "activation-context",
    "activate",
  ]);
});

test("maps every campaign service failure to a bounded public status", async () => {
  const snapshotMappings = [
    ["INVALID_INPUT", "invalid-input"],
    ["PROFILE_REQUIRED", "profile-required"],
    ["TEMPLATE_NOT_FOUND", "template-unavailable"],
    ["TEMPLATE_NOT_APPROVED", "template-unavailable"],
    ["INVALID_AUDIENCE", "audience-invalid"],
    ["PERSISTENCE_FAILED", "server-error"],
  ];

  for (const [code, status] of snapshotMappings) {
    const testFixture = fixture({
      saveError: new CampaignSnapshotError(code),
    });

    assert.deepEqual(
      await testFixture.handler.saveSnapshot({}),
      { status },
    );
  }

  const activationMappings = [
    ["INVALID_INPUT", "invalid-input"],
    ["TRANSITION_CONFLICT", "state-conflict"],
    ["PERSISTENCE_FAILED", "server-error"],
  ];

  for (const [code, status] of activationMappings) {
    const testFixture = fixture({
      activationError:
        new CampaignActivationError(code),
    });

    assert.deepEqual(
      await testFixture.handler.activate({}),
      { status },
    );
  }
});

test("maps tenant failures without exposing their internal message", async () => {
  const missingTenant = fixture({
    snapshotContextError: new TenantSessionError(
      "TENANT_MEMBERSHIP_REQUIRED",
      "private membership detail",
    ),
  });
  const denied = fixture({
    activationContextError: new TenantSessionError(
      "PERMISSION_DENIED",
      "private role detail",
    ),
  });

  assert.deepEqual(
    await missingTenant.handler.saveSnapshot({}),
    { status: "onboarding-required" },
  );
  assert.deepEqual(
    await denied.handler.activate({}),
    { status: "permission-denied" },
  );
});
