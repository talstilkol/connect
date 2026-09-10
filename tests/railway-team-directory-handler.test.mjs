import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayTeamDirectoryHandler,
} from "../server/team/railwayTeamDirectoryHandler.ts";

const memberKey = `team_member_v1_${"a".repeat(64)}`;
const directory = Object.freeze({
  identityStatus: "unavailable",
  members: Object.freeze([Object.freeze({
    memberKey,
    referenceCode: memberKey.slice(-12).toUpperCase(),
    displayName: null,
    primaryEmail: null,
    role: "owner",
    version: 1,
    currentUser: true,
  })]),
});

function fixture(options = {}) {
  const calls = { identities: 0, requests: [] };
  const handler = createRailwayTeamDirectoryHandler({
    applicationConfigured: () => options.applicationConfigured ?? true,
    inspectConfiguration: () => options.configuration ?? {
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      configuration: {
        apiOrigin: "https://railway.example.com",
        deploymentEnvironment: "production",
      },
    },
    async resolveIdentity() {
      calls.identities += 1;
      return options.identity ?? {
        status: "authenticated",
        oidcToken: "oidc.token.value",
        userSessionToken: "session.token.value",
      };
    },
    createClient() {
      return {
        async call(request) {
          calls.requests.push(request);
          return options.response?.(request) ?? {
            contractVersion: "connect.railway-api.v1",
            outcome: "ok",
            data: { directory },
          };
        },
      };
    },
  });
  return { calls, handler };
}

test("loads one bounded Railway team directory", async () => {
  const testFixture = fixture();
  assert.deepEqual(await testFixture.handler.read(), {
    status: "ready",
    directory,
  });
  assert.deepEqual(testFixture.calls.requests, [{
    contractVersion: "connect.railway-api.v1",
    operation: "team.directory.read",
    requestKind: "query",
    idempotencyKey: null,
    payload: {},
  }]);
});

test("maps authentication, tenant, and permission failures", async () => {
  for (const [code, status] of [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["DEPENDENCY_UNAVAILABLE", "server-error"],
  ]) {
    const testFixture = fixture({
      response() {
        return {
          contractVersion: "connect.railway-api.v1",
          outcome: "error",
          code,
        };
      },
    });
    const result = await testFixture.handler.read();
    assert.equal(result.status, status);
    assert.deepEqual(result.directory.members, []);
  }
});

test("rejects malformed or identity-leaking success data", async () => {
  for (const malformedDirectory of [
    { ...directory, tenantId: 7 },
    {
      ...directory,
      members: [{ ...directory.members[0], externalUserId: "verified-user" }],
    },
    {
      ...directory,
      members: [{ ...directory.members[0], currentUser: false }],
    },
    {
      identityStatus: "unavailable",
      members: [{ ...directory.members[0], displayName: "Leaked name" }],
    },
  ]) {
    const testFixture = fixture({
      response() {
        return {
          contractVersion: "connect.railway-api.v1",
          outcome: "ok",
          data: { directory: malformedDirectory },
        };
      },
    });
    assert.equal((await testFixture.handler.read()).status, "server-error");
  }
});

test("does not resolve identity while configuration is disabled", async () => {
  const testFixture = fixture({ applicationConfigured: false });
  assert.equal(
    (await testFixture.handler.read()).status,
    "configuration-required",
  );
  assert.equal(testFixture.calls.identities, 0);
});

test("rejects incomplete dependencies", () => {
  assert.throws(
    () => createRailwayTeamDirectoryHandler({}),
    /dependencies are invalid/,
  );
});
