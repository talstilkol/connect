import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaConnectionRuntime,
} from "../server/meta/metaConnectionRuntime.ts";

const environment = {
  META_APP_ID: "111111111",
  META_APP_SECRET: "runtime-fixture-app-secret",
  META_GRAPH_API_VERSION: "v21.0",
};

const signupInput = {
  authorizationCode: "runtime-fixture-authorization-code",
  businessPortfolioId: "333333333",
  wabaId: "222222222",
  phoneNumberId: "444444444",
};

const tenantSession = {
  externalUserId: "runtime-external-user",
  tenantId: 7,
  displayName: "runtime-tenant",
  status: "active",
  role: "owner",
};

function connection(status) {
  return {
    tenantId: 7,
    businessPortfolioId: signupInput.businessPortfolioId,
    wabaId: signupInput.wabaId,
    phoneNumberId: signupInput.phoneNumberId,
    status,
    webhookSubscribedAt:
      status === "connected" ? "2026-07-25 10:00:00" : null,
    connectedAt:
      status === "connected" ? "2026-07-25 10:00:00" : null,
    version: status === "connected" ? 2 : 1,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 10:00:00",
  };
}

function createRuntimeFixture() {
  const calls = [];
  const storedTokens = new Map();
  const pendingConnection = connection("pending");
  const connectedConnection = connection("connected");
  const runtime = createMetaConnectionRuntime({
    environment,
    credentialVault: {
      async storeAccessToken(tenantId, accessToken) {
        calls.push({
          operation: "store-token",
          tenantId,
          accessToken,
        });
        storedTokens.set(tenantId, accessToken);
      },
      async withAccessToken(tenantId, operation) {
        const accessToken = storedTokens.get(tenantId);

        if (!accessToken) {
          throw new Error("fixture token is unavailable");
        }

        return operation(accessToken);
      },
    },
    connectionService: {
      async read() {
        return pendingConnection;
      },
      async captureVerifiedAssets(currentSession, snapshot) {
        calls.push({
          operation: "capture-assets",
          session: currentSession,
          snapshot,
        });
        return pendingConnection;
      },
      async confirmWebhookSubscription(currentSession) {
        calls.push({
          operation: "confirm-connection",
          session: currentSession,
        });
        return connectedConnection;
      },
      async recordConnectionProblem() {
        throw new Error("not used");
      },
    },
    options: {
      async fetchImplementation(url, init) {
        calls.push({
          operation: "fetch",
          url,
          init,
        });

        if (url.pathname === "/v21.0/oauth/access_token") {
          return Response.json({
            access_token: "runtime-fixture-access-token",
          });
        }

        if (url.pathname === "/v21.0/222222222") {
          return Response.json({
            id: "222222222",
            owner_business_info: {
              id: "333333333",
            },
          });
        }

        if (
          url.pathname ===
          "/v21.0/222222222/phone_numbers"
        ) {
          return Response.json({
            data: [{ id: "444444444" }],
          });
        }

        if (
          url.pathname ===
            "/v21.0/222222222/subscribed_apps" &&
          init.method === "POST"
        ) {
          return Response.json({ success: true });
        }

        return Response.json(
          {
            error: {
              code: 100,
            },
          },
          { status: 400 },
        );
      },
    },
  });

  return { calls, runtime };
}

test("wires the concrete Meta adapters into one fail-closed runtime", async () => {
  const fixture = createRuntimeFixture();

  const result =
    await fixture.runtime.completeEmbeddedSignup(
      tenantSession,
      signupInput,
    );

  assert.equal(result.status, "connected");
  assert.deepEqual(
    fixture.calls.map((call) => {
      if (call.operation !== "fetch") {
        return call.operation;
      }

      return `${call.init.method}:${call.url.pathname}`;
    }),
    [
      "GET:/v21.0/oauth/access_token",
      "GET:/v21.0/222222222",
      "GET:/v21.0/222222222/phone_numbers",
      "capture-assets",
      "store-token",
      "POST:/v21.0/222222222/subscribed_apps",
      "confirm-connection",
    ],
  );
});

test("keeps exchange secrets out of subsequent Graph requests", async () => {
  const fixture = createRuntimeFixture();

  await fixture.runtime.completeEmbeddedSignup(
    tenantSession,
    signupInput,
  );

  const fetchCalls = fixture.calls.filter(
    (call) => call.operation === "fetch",
  );
  const exchangeRequest = fetchCalls[0];

  assert.equal(
    exchangeRequest.url.searchParams.get("client_secret"),
    environment.META_APP_SECRET,
  );
  assert.equal(
    exchangeRequest.url.searchParams.get("code"),
    signupInput.authorizationCode,
  );

  for (const graphRequest of fetchCalls.slice(1)) {
    assert.equal(
      graphRequest.url.searchParams.has("client_secret"),
      false,
    );
    assert.equal(
      graphRequest.url.searchParams.has("code"),
      false,
    );
    assert.equal(
      graphRequest.url.searchParams.has("access_token"),
      false,
    );
    assert.equal(
      graphRequest.init.headers.authorization,
      "Bearer runtime-fixture-access-token",
    );
  }
});

test("fails runtime creation before adapters when server configuration is incomplete", () => {
  let dependencyCalls = 0;

  assert.throws(
    () =>
      createMetaConnectionRuntime({
        environment: {
          META_APP_ID: "111111111",
          META_GRAPH_API_VERSION: "v21.0",
        },
        credentialVault: {
          async storeAccessToken() {
            dependencyCalls += 1;
          },
          async withAccessToken() {
            dependencyCalls += 1;
          },
        },
        connectionService: {
          async read() {
            dependencyCalls += 1;
            return null;
          },
          async captureVerifiedAssets() {
            dependencyCalls += 1;
          },
          async confirmWebhookSubscription() {
            dependencyCalls += 1;
          },
          async recordConnectionProblem() {
            dependencyCalls += 1;
          },
        },
      }),
    /META_APP_SECRET/,
  );
  assert.equal(dependencyCalls, 0);
});
