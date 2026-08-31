import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayCampaignDeliveryConsumerRuntime,
} from "../server/platform/railwayCampaignDeliveryConsumerRuntime.ts";

const encryptionKey =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";

function options(overrides = {}) {
  return {
    environment: {
      META_GRAPH_API_VERSION: "v21.0",
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
      WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: encryptionKey,
    },
    dispatch: {
      async findQueuedDeliveryContext() {
        throw new Error("must not load delivery context");
      },
      async prepareDelivery() {
        throw new Error("must not prepare delivery");
      },
      async markDeferred() {},
      async markRejected() {},
      async markAmbiguous() {},
    },
    campaigns: {
      async findByKey() {
        throw new Error("must not load a campaign");
      },
    },
    providerDeliveries: {
      async recordAccepted() {},
    },
    metaConnections: {
      async findConnectionByTenantId() {
        throw new Error("must not load a Meta connection");
      },
    },
    credentials: {
      async findByTenantId() {
        return null;
      },
      async store() {},
    },
    deliveryPolicies: {
      async findCurrentEnabledPolicy() {
        throw new Error("must not load a policy");
      },
    },
    rateLimits: {
      async reserveBusinessInitiatedMessage() {
        throw new Error("must not reserve capacity");
      },
      async settle() {
        throw new Error("must not settle capacity");
      },
      async applyProviderCooldown() {
        throw new Error("must not apply a cooldown");
      },
    },
    retryEvidenceSource: {
      isConfigured() {
        return false;
      },
      async load() {
        return null;
      },
    },
    telemetrySink: {
      async record() {
        return { outcome: "recorded" };
      },
    },
    clock: {
      now() {
        return new Date("2026-08-21T12:00:00.000Z");
      },
    },
    ...overrides,
  };
}

test("composes the PostgreSQL campaign consumer and fails closed before data access", async () => {
  const consumer = createRailwayCampaignDeliveryConsumerRuntime(options());
  const actions = [];
  const result = await consumer.handle({
    queue: "campaign-delivery-v1",
    messages: [{
      id: `campaign_delivery_v1_${"a".repeat(64)}`,
      timestamp: new Date("2026-08-21T11:59:00.000Z"),
      attempts: 1,
      body: {
        version: 1,
        deliveryKey: `campaign_delivery_v1_${"a".repeat(64)}`,
      },
      ack() {
        actions.push("ack");
      },
      retry(retryOptions) {
        actions.push(["retry", retryOptions.delaySeconds]);
      },
    }],
  });

  assert.deepEqual(result, {
    accepted: 0,
    rejected: 0,
    deferred: 0,
    skipped: 0,
    duplicates: 0,
    ambiguous: 0,
    discarded: 0,
    retried: 1,
  });
  assert.deepEqual(actions, [["retry", 60]]);
});

test("rejects an incomplete consumer composition before provider access", () => {
  assert.throws(
    () => createRailwayCampaignDeliveryConsumerRuntime({}),
    /options are invalid/,
  );
  assert.throws(
    () => createRailwayCampaignDeliveryConsumerRuntime(options({
      retryEvidenceSource: {},
    })),
    /options are invalid/,
  );
});
