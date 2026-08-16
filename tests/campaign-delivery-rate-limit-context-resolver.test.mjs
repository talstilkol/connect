import assert from "node:assert/strict";
import test from "node:test";

import {
  createCampaignDeliveryRateLimitContextResolver,
} from "../server/campaigns/campaignDeliveryRateLimitContextResolver.ts";
import {
  createWhatsappRateLimitKeyDeriver,
} from "../server/campaigns/whatsappRateLimitKeyDeriver.ts";

const hmacKey = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const reservedAt = "2026-08-16T10:00:00.000Z";
const request = {
  campaign: { tenantId: 7 },
  deliveryKey:
    `campaign_delivery_v1_${"a".repeat(64)}`,
  recipientPhoneNumber: "+972501234567",
  reservedAt,
};

function connection(overrides = {}) {
  return {
    tenantId: 7,
    businessPortfolioId: "400001",
    wabaId: "400002",
    phoneNumberId: "400003",
    status: "connected",
    webhookSubscribedAt: reservedAt,
    connectedAt: reservedAt,
    version: 2,
    createdAt: reservedAt,
    updatedAt: reservedAt,
    ...overrides,
  };
}

function policy(overrides = {}) {
  return {
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 250,
    },
    reservationDurationSeconds: 300,
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = [];
  const resolver =
    createCampaignDeliveryRateLimitContextResolver(
      {
        async findConnectionByTenantId(tenantId) {
          calls.push({
            operation: "connection",
            tenantId,
          });

          return options.currentConnection === undefined
            ? connection()
            : options.currentConnection;
        },
      },
      options.keys ??
        createWhatsappRateLimitKeyDeriver({
          WHATSAPP_RATE_LIMIT_HMAC_KEY_V1:
            hmacKey,
        }),
      {
        isConfigured() {
          return options.policyConfigured !== false;
        },
        async load(policyRequest) {
          calls.push({
            operation: "policy",
            request: policyRequest,
          });

          return options.currentPolicy === undefined
            ? policy()
            : options.currentPolicy;
        },
      },
    );

  return { calls, resolver };
}

test("resolves connected provider state into opaque D1 reservation context", async () => {
  const testFixture = fixture();
  const result = await testFixture.resolver.resolve(
    request,
  );

  assert.equal(testFixture.resolver.isConfigured(), true);
  assert.equal(result.tenantId, 7);
  assert.deepEqual(result.portfolioCapacity, {
    kind: "bounded",
    maximumUniqueRecipients: 250,
  });
  assert.equal(
    result.reservationExpiresAt,
    "2026-08-16T10:05:00.000Z",
  );
  assert.match(
    result.reservationKey,
    /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/,
  );
  assert.equal(
    Object.values(result).some(
      (value) =>
        typeof value === "string" &&
        (value.includes("400001") ||
          value.includes("400003") ||
          value.includes("+972")),
    ),
    false,
  );
  assert.deepEqual(testFixture.calls[1], {
    operation: "policy",
    request: {
      tenantId: 7,
      businessPortfolioId: "400001",
      wabaId: "400002",
      phoneNumberId: "400003",
      checkedAt: reservedAt,
    },
  });
});

test("fails closed before D1 when key or policy configuration is unavailable", async () => {
  const missingKey = fixture({
    keys: createWhatsappRateLimitKeyDeriver({}),
  });
  const missingPolicy = fixture({
    policyConfigured: false,
  });

  assert.equal(missingKey.resolver.isConfigured(), false);
  assert.equal(missingPolicy.resolver.isConfigured(), false);
  await assert.rejects(
    missingKey.resolver.resolve(request),
    /resolver is not configured/,
  );
  await assert.rejects(
    missingPolicy.resolver.resolve(request),
    /resolver is not configured/,
  );
  assert.deepEqual(missingKey.calls, []);
  assert.deepEqual(missingPolicy.calls, []);
});

test("rejects missing, restricted, or cross-tenant Meta connections", async () => {
  const missing = fixture({
    currentConnection: null,
  });
  const restricted = fixture({
    currentConnection: connection({
      status: "restricted",
    }),
  });
  const crossTenant = fixture({
    currentConnection: connection({ tenantId: 8 }),
  });

  assert.equal(
    await missing.resolver.resolve(request),
    null,
  );
  assert.equal(
    await restricted.resolver.resolve(request),
    null,
  );
  assert.equal(
    await crossTenant.resolver.resolve(request),
    null,
  );
  assert.equal(
    restricted.calls.some(
      (call) => call.operation === "policy",
    ),
    false,
  );
});

test("requires an exact approved capacity and explicit reservation duration", async () => {
  const unavailable = fixture({
    currentPolicy: null,
  });
  const unsupportedTier = fixture({
    currentPolicy: policy({
      portfolioCapacity: {
        kind: "bounded",
        maximumUniqueRecipients: 500,
      },
    }),
  });
  const unsafeDuration = fixture({
    currentPolicy: policy({
      reservationDurationSeconds: 5,
    }),
  });
  const extended = fixture({
    currentPolicy: {
      ...policy(),
      source: "untrusted-extension",
    },
  });

  assert.equal(
    await unavailable.resolver.resolve(request),
    null,
  );
  assert.equal(
    await unsupportedTier.resolver.resolve(request),
    null,
  );
  assert.equal(
    await unsafeDuration.resolver.resolve(request),
    null,
  );
  assert.equal(
    await extended.resolver.resolve(request),
    null,
  );
});

test("rejects malformed delivery scope before D1 or policy access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.resolver.resolve({
      ...request,
      recipientPhoneNumber: "0501234567",
    }),
    /request is invalid/,
  );
  await assert.rejects(
    testFixture.resolver.resolve({
      ...request,
      reservedAt: "2026-08-16 10:00:00",
    }),
    /request is invalid/,
  );
  assert.deepEqual(testFixture.calls, []);
});
