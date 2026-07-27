import assert from "node:assert/strict";
import test from "node:test";

import {
  requireTenantPermission,
  resolveTenantSession,
} from "../server/auth/tenantSession.ts";

const identity = {
  externalUserId: "external-user-id",
};

function membership(
  tenantId,
  role = "owner",
  tenantStatus = "active",
  externalUserId =
    identity.externalUserId,
) {
  return {
    tenantId,
    tenantDisplayName: `tenant-${tenantId}`,
    tenantStatus,
    externalUserId,
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

test("resolves an explicit tenant only from the authenticated memberships", async () => {
  const session = await resolveTenantSession(
    identity,
    repositoryWith([
      membership(7, "owner"),
      membership(11, "manager"),
    ]),
    11,
  );

  assert.equal(session.tenantId, 11);
  assert.equal(session.role, "manager");

  await assert.rejects(
    resolveTenantSession(
      identity,
      repositoryWith([
        membership(7),
        membership(11),
      ]),
      13,
    ),
    (error) =>
      error.code ===
      "TENANT_SELECTION_REQUIRED",
  );
});

test("rejects malformed selected tenant identities", async () => {
  for (const selectedTenantId of [
    0,
    -1,
    1.5,
    Number.NaN,
  ]) {
    await assert.rejects(
      resolveTenantSession(
        identity,
        repositoryWith([
          membership(7),
        ]),
        selectedTenantId,
      ),
      (error) =>
        error.code ===
        "TENANT_SELECTION_REQUIRED",
    );
  }
});

test("blocks restricted tenants and memberships from another identity", async () => {
  for (const tenantStatus of [
    "suspended",
    "cancelled",
    "expired",
    "blocked",
  ]) {
    await assert.rejects(
      resolveTenantSession(
        identity,
        repositoryWith([
          membership(
            7,
            "owner",
            tenantStatus,
          ),
        ]),
      ),
      (error) =>
        error.code ===
        "TENANT_MEMBERSHIP_REQUIRED",
    );
  }

  await assert.rejects(
    resolveTenantSession(
      identity,
      repositoryWith([
        membership(
          7,
          "owner",
          "active",
          "different-user",
        ),
      ]),
    ),
    (error) =>
      error.code ===
      "TENANT_MEMBERSHIP_REQUIRED",
  );
});

test("keeps payment-failed distinct from terminal access states", async () => {
  const session = await resolveTenantSession(
    identity,
    repositoryWith([
      membership(
        7,
        "owner",
        "payment_failed",
      ),
    ]),
  );

  assert.equal(
    session.status,
    "payment_failed",
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
