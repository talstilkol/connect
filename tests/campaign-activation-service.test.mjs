import assert from "node:assert/strict";
import test from "node:test";

import {
  CampaignActivationError,
  createCampaignActivationService,
} from "../server/campaigns/campaignActivationService.ts";

const campaignKey =
  `campaign_v1_${"a".repeat(64)}`;
const activatedAt = "2026-07-26T10:00:00.000Z";

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function fixture(options = {}) {
  const calls = [];
  const repository = {
    async activateCampaign(
      tenantId,
      requestedCampaignKey,
      expectedVersion,
      timestamp,
    ) {
      calls.push({
        tenantId,
        campaignKey: requestedCampaignKey,
        expectedVersion,
        timestamp,
      });

      if (options.error) {
        throw options.error;
      }

      if (options.conflict) {
        return null;
      }

      return {
        campaignKey: requestedCampaignKey,
        tenantId,
        status: "scheduled",
        version: expectedVersion + 1,
        activatedAt: timestamp,
        startedAt: null,
      };
    },
  };
  const service = createCampaignActivationService(
    repository,
    {
      now() {
        return new Date(activatedAt);
      },
    },
  );

  return { calls, service };
}

test("activates one tenant campaign with optimistic version control", async () => {
  const testFixture = fixture();
  const result = await testFixture.service.activate(
    session(),
    {
      campaignKey,
      expectedVersion: 1,
    },
  );

  assert.equal(result.status, "scheduled");
  assert.equal(result.version, 2);
  assert.deepEqual(testFixture.calls, [
    {
      tenantId: 7,
      campaignKey,
      expectedVersion: 1,
      timestamp: activatedAt,
    },
  ]);
});

test("checks permission and exact input before activation", async () => {
  const viewer = fixture();
  const invalid = fixture();

  await assert.rejects(
    viewer.service.activate(session("viewer"), {
      campaignKey,
      expectedVersion: 1,
    }),
    (error) => error.code === "PERMISSION_DENIED",
  );
  await assert.rejects(
    invalid.service.activate(session(), {
      campaignKey,
      expectedVersion: 1,
      tenantId: 7,
    }),
    (error) =>
      error instanceof CampaignActivationError &&
      error.code === "INVALID_INPUT",
  );
  assert.deepEqual(viewer.calls, []);
  assert.deepEqual(invalid.calls, []);
});

test("separates transition conflicts from persistence failures", async () => {
  const conflict = fixture({ conflict: true });
  const failure = fixture({
    error: new Error("private D1 detail"),
  });

  await assert.rejects(
    conflict.service.activate(session(), {
      campaignKey,
      expectedVersion: 1,
    }),
    (error) =>
      error instanceof CampaignActivationError &&
      error.code === "TRANSITION_CONFLICT",
  );
  await assert.rejects(
    failure.service.activate(session(), {
      campaignKey,
      expectedVersion: 1,
    }),
    (error) => {
      assert.ok(error instanceof CampaignActivationError);
      assert.equal(error.code, "PERSISTENCE_FAILED");
      assert.doesNotMatch(error.message, /private|D1/);
      return true;
    },
  );
});
