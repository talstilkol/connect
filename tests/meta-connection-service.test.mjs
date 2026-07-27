import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaConnectionService,
} from "../server/meta/metaConnectionService.ts";

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function connection() {
  return {
    tenantId: 7,
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
    status: "pending",
    webhookSubscribedAt: null,
    connectedAt: null,
    version: 1,
    createdAt: "2026-07-25 10:00:00",
    updatedAt: "2026-07-25 10:00:00",
  };
}

function fixture() {
  const calls = [];
  const record = connection();
  const repository = {
    async findConnectionByTenantId(tenantId) {
      calls.push({ operation: "read", tenantId });
      return record;
    },
    async findConnectionByWabaId() {
      return null;
    },
    async saveAssetSnapshot(input) {
      calls.push({ operation: "save", input });
      return record;
    },
    async markConnectionConnected(tenantId) {
      calls.push({ operation: "connect", tenantId });
      return record;
    },
    async markConnectionStatus(tenantId, status) {
      calls.push({ operation: "problem", tenantId, status });
      return record;
    },
    async claimWebhookReceipt() {
      throw new Error("not used");
    },
    async completeWebhookReceipt() {
      throw new Error("not used");
    },
    async failWebhookReceipt() {
      throw new Error("not used");
    },
  };

  return {
    calls,
    service: createMetaConnectionService(repository),
  };
}

test("derives Meta connection tenant scope from the server session", async () => {
  const testFixture = fixture();

  await testFixture.service.captureVerifiedAssets(session(), {
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
  });
  await testFixture.service.confirmWebhookSubscription(session());
  await testFixture.service.recordConnectionProblem(
    session(),
    "verification_required",
  );

  assert.deepEqual(testFixture.calls, [
    {
      operation: "save",
      input: {
        tenantId: 7,
        businessPortfolioId: "business-portfolio-id",
        wabaId: "waba-id",
        phoneNumberId: "phone-number-id",
      },
    },
    { operation: "connect", tenantId: 7 },
    {
      operation: "problem",
      tenantId: 7,
      status: "verification_required",
    },
  ]);
});

test("blocks Meta connection reads and writes for roles without workspace management", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.read(session("viewer")),
    (error) => error.code === "PERMISSION_DENIED",
  );
  await assert.rejects(
    testFixture.service.captureVerifiedAssets(session("viewer"), {
      businessPortfolioId: "business-portfolio-id",
      wabaId: "waba-id",
      phoneNumberId: "phone-number-id",
    }),
    (error) => error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(testFixture.calls, []);
});
