import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  createRailwaySystemAdminTenantDirectoryOperation,
  railwaySystemAdminTenantDirectoryOperationPolicy,
} from "../server/platform/railwaySystemAdminTenantDirectoryOperation.ts";

const operationId = "system-admin.tenant-directory.list";
const adminIdentity = "system-admin-primary";
const payload = Object.freeze({
  afterTenantId: null,
  search: " connect ",
  tenantStatus: "active",
  subscription: "with-subscription",
});
const request = Object.freeze({
  contractVersion: "connect.railway-api.v1",
  operation: operationId,
  requestKind: "query",
  idempotencyKey: null,
  payload,
});
const dispatchContext = Object.freeze({
  serviceIdentity: Object.freeze({
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject:
      "owner:connect-team:project:connect-web:environment:production",
  }),
  userIdentity: Object.freeze({
    externalUserId: adminIdentity,
  }),
});

function tenantRecord() {
  return {
    tenantId: 19,
    displayName: "Connect Support",
    tenantStatus: "active",
    businessProfile: {
      businessName: "Connect Support",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      version: 2,
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: "2026-08-20T09:00:00.000Z",
    },
    subscription: {
      status: "active",
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2026-10-01T00:00:00.000Z",
      cancelledAt: null,
      version: 2,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-20T09:00:00.000Z",
    },
  };
}

function fixture({
  allowedExternalUserIds = [adminIdentity],
  result = { tenants: [tenantRecord()], nextCursor: null },
  repositoryError = null,
} = {}) {
  const queries = [];
  const operation = createRailwaySystemAdminTenantDirectoryOperation({
    allowedExternalUserIds,
    tenantDirectory: {
      async listPage(query) {
        queries.push(query);
        if (repositoryError) throw repositoryError;
        return result;
      },
    },
  });

  return { operation, queries };
}

function hasDispatchCode(code) {
  return (error) =>
    error instanceof RailwayApiDispatchError && error.code === code;
}

test("publishes an immutable read-only allowlisted directory policy", () => {
  assert.deepEqual(
    railwaySystemAdminTenantDirectoryOperationPolicy,
    {
      id: operationId,
      requestKind: "query",
      authorization: "system-admin-allowlist",
      mutationSafety: null,
    },
  );
  assert.equal(
    Object.isFrozen(railwaySystemAdminTenantDirectoryOperationPolicy),
    true,
  );
});

test("normalizes the query and exposes only a target tenant alias", async () => {
  const testFixture = fixture();
  const result = await testFixture.operation.execute(
    dispatchContext,
    payload,
    request,
  );

  assert.deepEqual(testFixture.queries, [{
    afterTenantId: null,
    search: "connect",
    tenantStatus: "active",
    subscription: "with-subscription",
  }]);
  assert.equal(result.directory.tenants[0].targetTenantId, 19);
  assert.equal(result.directory.tenants[0].displayName, "Connect Support");
  assert.doesNotMatch(
    JSON.stringify(result),
    /"tenantId"|externalUserId|system-admin-primary/,
  );
});

test("denies non-allowlisted identities before repository access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.operation.execute(
      {
        ...dispatchContext,
        userIdentity: { externalUserId: "authenticated-non-admin" },
      },
      payload,
      request,
    ),
    hasDispatchCode("AUTHORIZATION_DENIED"),
  );
  assert.deepEqual(testFixture.queries, []);
});

test("rejects extended, invalid, and mismatched query envelopes", async () => {
  const scenarios = [
    {
      payload: { ...payload, externalUserId: "forged-admin" },
      request,
    },
    {
      payload: { ...payload, afterTenantId: 0 },
      request,
    },
    {
      payload,
      request: { ...request, operation: "contacts.list" },
    },
    {
      payload,
      request: { ...request, idempotencyKey: `connect_idempotency_v1_${"0".repeat(64)}` },
    },
  ];

  for (const scenario of scenarios) {
    const testFixture = fixture();
    await assert.rejects(
      testFixture.operation.execute(
        dispatchContext,
        scenario.payload,
        scenario.request,
      ),
      hasDispatchCode("INVALID_REQUEST"),
    );
    assert.deepEqual(testFixture.queries, []);
  }
});

test("sanitizes repository failures as dependency unavailability", async () => {
  const testFixture = fixture({
    repositoryError: new Error("private PostgreSQL address"),
  });

  await assert.rejects(
    testFixture.operation.execute(dispatchContext, payload, request),
    hasDispatchCode("DEPENDENCY_UNAVAILABLE"),
  );
});

test("rejects incomplete and extended dependencies", () => {
  const tenantDirectory = { async listPage() {} };

  assert.throws(
    () =>
      createRailwaySystemAdminTenantDirectoryOperation({
        allowedExternalUserIds: [],
        tenantDirectory,
      }),
    /dependencies are invalid/,
  );
  assert.throws(
    () =>
      createRailwaySystemAdminTenantDirectoryOperation({
        allowedExternalUserIds: [adminIdentity],
        tenantDirectory,
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
