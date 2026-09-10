import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayBotReplyRuntime,
} from "../server/platform/railwayBotReplyRuntime.ts";

const key =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
const now = "2026-08-21T12:00:00.000Z";

function options(overrides = {}) {
  return {
    environment: {
      META_GRAPH_API_VERSION: "v21.0",
      META_CREDENTIAL_ENCRYPTION_KEY_V1: key,
      WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: key,
    },
    deliveries: {
      async stage() {
        throw new Error("not used");
      },
      async claim() {
        throw new Error("not used");
      },
      async defer() {
        throw new Error("not used");
      },
      async claimProviderRequest() {
        throw new Error("not used");
      },
      async listDueDeferrals() {
        return [];
      },
      async markAccepted() {
        throw new Error("not used");
      },
      async markRejected() {
        throw new Error("not used");
      },
      async markAmbiguous() {
        throw new Error("not used");
      },
    },
    metaConnections: {
      async findConnectionByTenantId() {
        return null;
      },
    },
    credentials: {
      async findByTenantId() {
        return null;
      },
      async store() {
        throw new Error("not used");
      },
    },
    deliveryPolicies: {
      async findCurrentEnabledPolicy() {
        return null;
      },
      async findLatestPolicyEvent() {
        return null;
      },
      async recordPolicyEvent() {
        throw new Error("not used");
      },
    },
    rateLimits: {
      async reserveServiceReply() {
        throw new Error("not used");
      },
      async settle() {
        throw new Error("not used");
      },
      async applyProviderCooldown() {
        throw new Error("not used");
      },
    },
    clock: {
      now() {
        return new Date(now);
      },
    },
    telemetrySink: {
      async record() {
        return { outcome: "recorded" };
      },
    },
    batchSize: 25,
    ...overrides,
  };
}

test("composes admitted Meta bot replies and a bounded due-delivery task", async () => {
  const runtime = createRailwayBotReplyRuntime(options());

  assert.equal(runtime.processor.isConfigured(), true);
  assert.deepEqual(await runtime.dueDeliveries.run(), {
    scanned: 0,
    accepted: 0,
    rejected: 0,
    deferred: 0,
    ambiguous: 0,
    duplicates: 0,
    inProgress: 0,
  });
});

test("rejects extended, incomplete, and oversized runtime options", () => {
  assert.throws(
    () => createRailwayBotReplyRuntime({}),
    /options are invalid/,
  );
  assert.throws(
    () => createRailwayBotReplyRuntime(options({ batchSize: 101 })),
    /options are invalid/,
  );
  assert.throws(
    () => createRailwayBotReplyRuntime(options({ unsupported: true })),
    /options are invalid/,
  );
});
