import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveTenantProvisioningKey,
} from "../server/onboarding/tenantProvisioningKey.ts";

test("derives one deterministic opaque provisioning key per external user", async () => {
  const first = await deriveTenantProvisioningKey("external-user-id");
  const repeated = await deriveTenantProvisioningKey("external-user-id");
  const different = await deriveTenantProvisioningKey(
    "different-external-user-id",
  );

  assert.equal(first, repeated);
  assert.notEqual(first, different);
  assert.match(first, /^tenant_v1_[0-9a-f]{64}$/);
  assert.equal(first.includes("external-user-id"), false);
});

test("rejects a blank external user ID", async () => {
  await assert.rejects(
    deriveTenantProvisioningKey("  "),
    /externalUserId must not be blank/,
  );
});
