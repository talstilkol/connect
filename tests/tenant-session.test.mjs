import assert from "node:assert/strict";
import test from "node:test";

import {
  requireTenantPermission,
  resolveTenantSession,
} from "../server/auth/tenantSession.ts";

const identity = {
  externalUserId: "external-user-id",
};

function membership(tenantId, role = "owner") {
  return {
    tenantId,
    tenantDisplayName: `tenant-${tenantId}`,
    tenantStatus: "active",
    externalUserId: identity.externalUserId,
    role,
  };
}

function repositoryWith(memberships) {
  return {
    async findActiveByExternalUserId(externalUserId) {
      assert.equal(externalUserId, identity.externalUserId);
      return memberships;
    },
  };
}

test("rejects a request without an authenticated identity", async () => {
  await assert.rejects(
    resolveTenantSession(null, repositoryWith([])),
    (error) => error.code === "AUTHENTICATION_REQUIRED",
  );
});

test("rejects an identity without an active tenant membership", async () => {
  await assert.rejects(
    resolveTenantSession(identity, repositoryWith([])),
    (error) => error.code === "TENANT_MEMBERSHIP_REQUIRED",
  );
});

test("requires explicit selection when a user belongs to multiple tenants", async () => {
  await assert.rejects(
    resolveTenantSession(
      identity,
      repositoryWith([membership(7), membership(11)]),
    ),
    (error) => error.code === "TENANT_SELECTION_REQUIRED",
  );
});

test("creates a tenant session from one active membership", async () => {
  const session = await resolveTenantSession(
    identity,
    repositoryWith([membership(7, "manager")]),
  );

  assert.deepEqual(session, {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-7",
    status: "active",
    role: "manager",
  });
});

test("enforces the central role permission matrix", async () => {
  const managerSession = await resolveTenantSession(
    identity,
    repositoryWith([membership(7, "manager")]),
  );
  const viewerSession = await resolveTenantSession(
    identity,
    repositoryWith([membership(7, "viewer")]),
  );

  assert.doesNotThrow(() =>
    requireTenantPermission(managerSession, "campaigns.write"),
  );
  assert.throws(
    () => requireTenantPermission(viewerSession, "campaigns.write"),
    (error) => error.code === "PERMISSION_DENIED",
  );
});

test("does not grant subscription mutation authority to a tenant owner", async () => {
  const ownerSession =
    await resolveTenantSession(
      identity,
      repositoryWith([
        membership(7, "owner"),
      ]),
    );

  assert.throws(
    () =>
      requireTenantPermission(
        ownerSession,
        "billing.write",
      ),
    (error) =>
      error.code === "PERMISSION_DENIED",
  );
});
