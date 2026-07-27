import assert from "node:assert/strict";
import test from "node:test";

import {
  createTenantSubscriptionService,
} from "../server/billing/tenantSubscriptionService.ts";

function session(
  role,
  tenantId = 7,
) {
  return {
    externalUserId: "external-user-id",
    tenantId,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function recordingRepository() {
  const tenantIds = [];

  return {
    tenantIds,
    async findByTenantId(tenantId) {
      tenantIds.push(tenantId);
      return null;
    },
  };
}

test("reads a subscription only from the tenant scope in the server session", async () => {
  const repository = recordingRepository();
  const service =
    createTenantSubscriptionService(
      repository,
    );

  await service.readCurrent(
    session("owner", 19),
  );

  assert.deepEqual(
    repository.tenantIds,
    [19],
  );
});

test("allows billing readers and denies an agent before repository access", async () => {
  const repository = recordingRepository();
  const service =
    createTenantSubscriptionService(
      repository,
    );

  for (const role of [
    "owner",
    "manager",
    "viewer",
  ]) {
    await service.readCurrent(
      session(role),
    );
  }

  await assert.rejects(
    service.readCurrent(
      session("agent"),
    ),
    (error) =>
      error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(
    repository.tenantIds,
    [7, 7, 7],
  );
});
