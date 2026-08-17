import assert from "node:assert/strict";
import test from "node:test";

import {
  RAILWAY_API_CONTRACT_VERSION,
  VERCEL_OIDC_HEADER,
} from "../server/platform/railwayApiContract.ts";
import {
  createRailwayApiRuntime,
} from "../server/platform/railwayApiRuntime.ts";

const compactJwt = "header.payload.signature";
const environment = {
  APP_PUBLIC_ORIGIN: "https://connect.example.com",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    "publishable-key-for-runtime-test",
  CLERK_SECRET_KEY: "secret-key-for-runtime-test",
  VERCEL_OIDC_TEAM_SLUG: "connect-team",
  VERCEL_OIDC_PROJECT_NAME: "connect-web",
  VERCEL_OIDC_ENVIRONMENT: "production",
  NODE_ENV: "production",
};

function membership(tenantId, role) {
  return {
    tenantId,
    tenantDisplayName: `workspace-${tenantId}`,
    tenantStatus: "active",
    externalUserId: "verified-user",
    role,
    version: 1,
  };
}

function fixture(selectedRole = "owner") {
  const calls = {
    memberships: 0,
    contacts: [],
    reports: [],
  };
  const handler = createRailwayApiRuntime({
    environment,
    identityDependencies: {
      vercelOidc: {
        createRemoteKeySet() {
          return async () => {};
        },
        async verifyJwt() {},
      },
      clerk: {
        create() {
          return {
            async authenticateRequest() {
              return {
                isAuthenticated: true,
                toAuth() {
                  return {
                    isAuthenticated: true,
                    tokenType: "session_token",
                    userId: "verified-user",
                  };
                },
              };
            },
          };
        },
      },
    },
    memberships: {
      async findActiveByExternalUserId() {
        calls.memberships += 1;
        return [
          membership(7, "owner"),
          membership(11, selectedRole),
        ];
      },
      async findActiveByTenantId() {
        throw new Error("unused membership method");
      },
    },
    selections: {
      async findByExternalUserId() {
        return { tenantId: 11, version: 2 };
      },
      async save() {
        throw new Error("unused selection method");
      },
    },
    contacts: {
      async list(session, beforeContactId) {
        calls.contacts.push({ session, beforeContactId });
        return {
          contacts: [],
          nextCursor: null,
        };
      },
    },
    reports: {
      async read(session, input) {
        calls.reports.push({ session, input });
        return {
          period: input,
          snapshot: {
            messages: {
              total: 0,
            },
          },
        };
      },
    },
  });

  return { calls, handler };
}

function request(operation, payload) {
  return new Request("https://railway.example.com/v1/connect", {
    method: "POST",
    headers: {
      authorization: `Bearer ${compactJwt}`,
      "content-type": "application/json",
      [VERCEL_OIDC_HEADER]: compactJwt,
    },
    body: JSON.stringify({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation,
      requestKind: "query",
      idempotencyKey: null,
      payload,
    }),
  });
}

test("runs a selected-tenant contact query through the complete boundary", async () => {
  const testFixture = fixture("agent");
  const response = await testFixture.handler.handle(
    request("contacts.list", { beforeContactId: null }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "ok",
    data: {
      contacts: [],
      nextCursor: null,
    },
  });
  assert.equal(testFixture.calls.memberships, 1);
  assert.equal(testFixture.calls.contacts.length, 1);
  assert.equal(testFixture.calls.contacts[0].session.tenantId, 11);
  assert.equal(
    testFixture.calls.contacts[0].session.externalUserId,
    "verified-user",
  );
});

test("returns only bounded workspace context through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const response = await testFixture.handler.handle(
    request("workspace.context.read", {}),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    displayName: "workspace-11",
    status: "active",
    role: "manager",
  });
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user/,
  );
});

test("returns authorization denied before an agent reaches reports", async () => {
  const testFixture = fixture("agent");
  const response = await testFixture.handler.handle(
    request("reports.read", {
      startDate: "2026-08-01",
      endDate: "2026-08-17",
    }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "error",
    code: "AUTHORIZATION_DENIED",
  });
  assert.deepEqual(testFixture.calls.reports, []);
});

test("rejects invalid operation payload before tenant lookup", async () => {
  const testFixture = fixture();
  const response = await testFixture.handler.handle(
    request("contacts.list", {
      beforeContactId: null,
      tenantId: 11,
    }),
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_REQUEST");
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(testFixture.calls.contacts, []);
});
