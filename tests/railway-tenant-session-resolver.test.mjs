import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayTenantSessionResolver,
} from "../server/platform/railwayTenantSessionResolver.ts";

const identity = {
  externalUserId: "verified-user",
  externalOrganizationId: "org_verified",
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
    organizations: [],
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
    identityOrganizations: {
      async findByTenantId(tenantId) {
        calls.organizations.push(tenantId);
        return {
          tenantId,
          externalOrganizationId: "org_verified",
        };
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
  assert.deepEqual(testFixture.calls.organizations, [7]);
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

test("returns null only when optional resolution finds no active membership", async () => {
  const missing = fixture([]);
  assert.equal(await missing.resolver.resolveOptional(identity), null);
  assert.deepEqual(missing.calls.memberships, ["verified-user"]);
  assert.deepEqual(missing.calls.selections, []);

  const eligible = fixture([membership(7, "manager")]);
  const session = await eligible.resolver.resolveOptional(identity);
  assert.deepEqual(session, {
    externalUserId: "verified-user",
    tenantId: 7,
    displayName: "workspace-7",
    status: "active",
    role: "manager",
  });
  assert.equal(Object.isFrozen(session), true);
  assert.deepEqual(eligible.calls.selections, []);

  const blocked = fixture([
    membership(7, "owner", "verified-user", "blocked"),
  ]);
  await assert.rejects(
    blocked.resolver.resolveOptional(identity),
    (error) => error?.code === "TENANT_MEMBERSHIP_REQUIRED",
  );
});

test("keeps optional selection and tenant isolation fail closed", async () => {
  const selected = fixture(
    [membership(7), membership(11, "viewer")],
    { tenantId: 11, version: 3 },
  );
  assert.equal(
    (await selected.resolver.resolveOptional(identity))?.tenantId,
    11,
  );

  for (const fixtureCase of [
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
  ]) {
    const testFixture = fixture(
      fixtureCase.memberships,
      fixtureCase.selection,
    );
    await assert.rejects(
      testFixture.resolver.resolveOptional(identity),
      (error) => error.code === fixtureCase.code,
    );
  }
});

test("fails closed when the signed Clerk Organization does not own the tenant", async () => {
  const testFixture = fixture([membership(7)]);

  await assert.rejects(
    testFixture.resolver.resolve({
      ...identity,
      externalOrganizationId: "org_different",
    }),
    /organization binding is unavailable/,
  );
  await assert.rejects(
    testFixture.resolver.resolve({ externalUserId: "verified-user" }),
    /organization identity is unavailable/,
  );
  for (const externalOrganizationId of [
    " org_verified",
    "org_verified ",
    "org_verified\u0000",
  ]) {
    await assert.rejects(
      testFixture.resolver.resolveOptional({
        ...identity,
        externalOrganizationId,
      }),
      /organization identity is unavailable/,
    );
  }
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
    identityOrganizations: {
      async findByTenantId() {
        throw new Error("organization must not run");
      },
    },
  });

  await assert.rejects(
    resolver.resolve(identity),
    /private membership database failure/,
  );
  await assert.rejects(
    resolver.resolveOptional(identity),
    /private membership database failure/,
  );

  const selectionFailure = createRailwayTenantSessionResolver({
    memberships: {
      async findActiveByExternalUserId() {
        return [membership(7), membership(11)];
      },
    },
    selections: {
      async findByExternalUserId() {
        throw new Error("private selection database failure");
      },
    },
    identityOrganizations: {
      async findByTenantId() {
        throw new Error("organization must not run");
      },
    },
  });
  await assert.rejects(
    selectionFailure.resolveOptional(identity),
    /private selection database failure/,
  );
});

test("rejects incomplete repository dependencies", () => {
  assert.throws(
    () =>
      createRailwayTenantSessionResolver({
        memberships: {},
        selections: {},
        identityOrganizations: {},
      }),
    /dependencies are invalid/,
  );
});
