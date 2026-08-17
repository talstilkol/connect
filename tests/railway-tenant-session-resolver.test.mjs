import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayTenantSessionResolver,
} from "../server/platform/railwayTenantSessionResolver.ts";

const identity = {
  externalUserId: "verified-user",
};

function membership(
  tenantId,
  role = "owner",
  externalUserId = identity.externalUserId,
  tenantStatus = "active",
) {
  return {
    tenantId,
    tenantDisplayName: `workspace-${tenantId}`,
    tenantStatus,
    externalUserId,
    role,
    version: 1,
  };
}

function fixture(memberships, selection = null) {
  const calls = {
    memberships: [],
    selections: [],
  };
  const resolver = createRailwayTenantSessionResolver({
    memberships: {
      async findActiveByExternalUserId(externalUserId) {
        calls.memberships.push(externalUserId);
        return memberships;
      },
      async findActiveByTenantId() {
        throw new Error("unused membership method");
      },
    },
    selections: {
      async findByExternalUserId(externalUserId) {
        calls.selections.push(externalUserId);
        return selection;
      },
      async save() {
        throw new Error("unused selection method");
      },
    },
  });

  return { calls, resolver };
}

test("uses the only eligible tenant without reading a stored selection", async () => {
  const testFixture = fixture([
    membership(7, "manager"),
  ]);

  const session = await testFixture.resolver.resolve(identity);

  assert.deepEqual(session, {
    externalUserId: "verified-user",
    tenantId: 7,
    displayName: "workspace-7",
    status: "active",
    role: "manager",
  });
  assert.deepEqual(testFixture.calls.memberships, ["verified-user"]);
  assert.deepEqual(testFixture.calls.selections, []);
  assert.equal(Object.isFrozen(session), true);
});

test("resolves multiple memberships only through the stored selection", async () => {
  const testFixture = fixture(
    [membership(7), membership(11, "viewer")],
    { tenantId: 11, version: 3 },
  );

  const session = await testFixture.resolver.resolve(identity);

  assert.equal(session.tenantId, 11);
  assert.equal(session.role, "viewer");
  assert.deepEqual(testFixture.calls.selections, ["verified-user"]);
});

test("fails closed for missing, stale or cross-user tenant selection", async () => {
  const cases = [
    {
      memberships: [membership(7), membership(11)],
      selection: null,
      code: "TENANT_SELECTION_REQUIRED",
    },
    {
      memberships: [membership(7), membership(11)],
      selection: { tenantId: 19, version: 2 },
      code: "TENANT_SELECTION_REQUIRED",
    },
    {
      memberships: [membership(7, "owner", "other-user")],
      selection: null,
      code: "TENANT_MEMBERSHIP_REQUIRED",
    },
    {
      memberships: [membership(7, "owner", "verified-user", "blocked")],
      selection: null,
      code: "TENANT_MEMBERSHIP_REQUIRED",
    },
  ];

  for (const fixtureCase of cases) {
    const testFixture = fixture(
      fixtureCase.memberships,
      fixtureCase.selection,
    );

    await assert.rejects(
      testFixture.resolver.resolve(identity),
      (error) => error.code === fixtureCase.code,
    );
  }
});

test("propagates repository outages without replacing tenant state", async () => {
  const resolver = createRailwayTenantSessionResolver({
    memberships: {
      async findActiveByExternalUserId() {
        throw new Error("private membership database failure");
      },
    },
    selections: {
      async findByExternalUserId() {
        throw new Error("selection must not run");
      },
    },
  });

  await assert.rejects(
    resolver.resolve(identity),
    /private membership database failure/,
  );
});

test("rejects incomplete repository dependencies", () => {
  assert.throws(
    () =>
      createRailwayTenantSessionResolver({
        memberships: {},
        selections: {},
      }),
    /dependencies are invalid/,
  );
});
