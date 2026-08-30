import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayTeamDirectoryOperation,
} from "../server/platform/railwayTeamDirectoryOperation.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const context = Object.freeze({
  serviceIdentity: Object.freeze({
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject: "verified-service",
  }),
  userIdentity: Object.freeze({ externalUserId: "verified-user" }),
});

const request = Object.freeze({
  contractVersion: "connect.railway-api.v1",
  operation: "team.directory.read",
  requestKind: "query",
  idempotencyKey: null,
  payload: Object.freeze({}),
});

function membership(externalUserId, role) {
  return Object.freeze({
    tenantId: 7,
    tenantDisplayName: "Verified workspace",
    tenantStatus: "active",
    externalUserId,
    role,
    version: 1,
  });
}

function fixture(role = "owner") {
  const calls = { resolves: 0, tenantReads: [] };
  const operation = createRailwayTeamDirectoryOperation({
    tenantSessions: {
      async resolve(identity) {
        calls.resolves += 1;
        return {
          tenantId: 7,
          displayName: "Verified workspace",
          status: "active",
          role,
          externalUserId: identity.externalUserId,
        };
      },
    },
    memberships: {
      async findActiveByExternalUserId() {
        throw new Error("unexpected identity membership read");
      },
      async findActiveByTenantId(tenantId) {
        calls.tenantReads.push(tenantId);
        return [
          membership("verified-user", role),
          membership("other-user", "agent"),
        ];
      },
    },
  });
  return { calls, operation };
}

test("returns a bounded opaque team directory through the selected tenant", async () => {
  const testFixture = fixture();
  const result = await testFixture.operation.execute(context, {}, request);

  assert.deepEqual(testFixture.calls, { resolves: 1, tenantReads: [7] });
  assert.equal(result.directory.identityStatus, "unavailable");
  assert.equal(result.directory.members.length, 2);
  assert.deepEqual(
    result.directory.members.map(({ role, currentUser }) => ({
      role,
      currentUser,
    })),
    [
      { role: "owner", currentUser: true },
      { role: "agent", currentUser: false },
    ],
  );
  assert.equal(
    result.directory.members.every(({ memberKey, referenceCode }) =>
      /^team_member_v1_[a-f0-9]{64}$/.test(memberKey) &&
      referenceCode === memberKey.slice(-12).toUpperCase(),
    ),
    true,
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|verified-user|other-user/,
  );
});

test("denies a role without team management before the tenant directory read", async () => {
  const testFixture = fixture("agent");

  await assert.rejects(
    testFixture.operation.execute(context, {}, request),
    (error) => error?.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(testFixture.calls, { resolves: 1, tenantReads: [] });
});

test("rejects extended or mutation-shaped input before tenant resolution", async () => {
  for (const [payload, candidateRequest] of [
    [{ tenantId: 7 }, request],
    [{}, { ...request, idempotencyKey: `connect_idempotency_v1_${"a".repeat(64)}` }],
    [{}, { ...request, requestKind: "mutation" }],
  ]) {
    const testFixture = fixture();
    await assert.rejects(
      testFixture.operation.execute(context, payload, candidateRequest),
      (error) => error?.code === "INVALID_REQUEST",
    );
    assert.equal(testFixture.calls.resolves, 0);
  }
});

test("maps session and repository failures to bounded API errors", async () => {
  const sessionFailure = createRailwayTeamDirectoryOperation({
    tenantSessions: {
      async resolve() {
        throw new TenantSessionError(
          "TENANT_SELECTION_REQUIRED",
          "selection required",
        );
      },
    },
    memberships: {
      async findActiveByExternalUserId() { return []; },
      async findActiveByTenantId() { return []; },
    },
  });
  await assert.rejects(
    sessionFailure.execute(context, {}, request),
    (error) => error?.code === "TENANT_SELECTION_REQUIRED",
  );

  const repositoryFailure = createRailwayTeamDirectoryOperation({
    tenantSessions: {
      async resolve() {
        return {
          tenantId: 7,
          displayName: "Verified workspace",
          status: "active",
          role: "owner",
          externalUserId: "verified-user",
        };
      },
    },
    memberships: {
      async findActiveByExternalUserId() { return []; },
      async findActiveByTenantId() {
        throw new Error("database unavailable");
      },
    },
  });
  await assert.rejects(
    repositoryFailure.execute(context, {}, request),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );
});

test("rejects incomplete dependencies", () => {
  assert.throws(
    () => createRailwayTeamDirectoryOperation({}),
    /dependencies are invalid/,
  );
});
