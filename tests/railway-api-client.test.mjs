import assert from "node:assert/strict";
import test from "node:test";

import {
  RAILWAY_API_CONTRACT_VERSION,
  VERCEL_OIDC_HEADER,
} from "../server/platform/railwayApiContract.ts";
import {
  createRailwayApiClient,
  RailwayApiClientError,
} from "../server/platform/railwayApiClient.ts";

const oidcToken = "oidcHeader.oidcPayload.oidcSignature";
const userToken = "userHeader.userPayload.userSignature";

function queryEnvelope(payload = {}) {
  return {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    operation: "contacts.list",
    requestKind: "query",
    idempotencyKey: null,
    payload,
  };
}

function jsonResponse(body, options = {}) {
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...options.headers,
    },
  });
}

function createFixture(response = jsonResponse({
  contractVersion: RAILWAY_API_CONTRACT_VERSION,
  outcome: "ok",
  data: { items: [] },
})) {
  const fetchCalls = [];
  const tokenCalls = [];
  const options = {
    apiOrigin: "https://connect-api.up.railway.app",
    deploymentEnvironment: "production",
    oidcTokenProvider: {
      async getToken() {
        tokenCalls.push("oidc");
        return oidcToken;
      },
    },
    userSessionTokenProvider: {
      async getToken() {
        tokenCalls.push("user");
        return userToken;
      },
    },
    async fetchImplementation(url, init) {
      fetchCalls.push({ url, init });
      return response;
    },
  };

  return { fetchCalls, options, tokenCalls };
}

test("calls only the fixed Railway endpoint with separated identity proofs", async () => {
  const fixture = createFixture();
  const client = createRailwayApiClient(fixture.options);
  const request = queryEnvelope({ cursor: "cursor_123" });
  const result = await client.call(request);

  assert.deepEqual(result, {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "ok",
    data: { items: [] },
  });
  assert.equal(fixture.fetchCalls.length, 1);
  const [call] = fixture.fetchCalls;
  assert.equal(
    call.url.toString(),
    "https://connect-api.up.railway.app/v1/connect",
  );
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.redirect, "error");
  assert.equal(call.init.credentials, "omit");
  assert.equal(
    call.init.headers.authorization,
    `Bearer ${userToken}`,
  );
  assert.equal(call.init.headers[VERCEL_OIDC_HEADER], oidcToken);
  assert.deepEqual(JSON.parse(call.init.body), request);
  assert.doesNotMatch(call.init.body, /oidcToken|userToken|authorization/i);
  assert.deepEqual(fixture.tokenCalls.sort(), ["oidc", "user"]);
});

test("accepts loopback HTTP only in development", () => {
  const fixture = createFixture();

  assert.doesNotThrow(() =>
    createRailwayApiClient({
      ...fixture.options,
      apiOrigin: "http://127.0.0.1:3001",
      deploymentEnvironment: "development",
    }),
  );

  for (const configuration of [
    {
      apiOrigin: "http://127.0.0.1:3001",
      deploymentEnvironment: "production",
    },
    {
      apiOrigin: "http://connect-api.up.railway.app",
      deploymentEnvironment: "development",
    },
    {
      apiOrigin: "https://user:password@connect.invalid",
      deploymentEnvironment: "production",
    },
    {
      apiOrigin: "https://connect.invalid/private",
      deploymentEnvironment: "production",
    },
    {
      apiOrigin: "https://connect.invalid?target=internal",
      deploymentEnvironment: "production",
    },
    {
      apiOrigin: "not-a-url",
      deploymentEnvironment: "production",
    },
  ]) {
    assert.throws(
      () =>
        createRailwayApiClient({
          ...fixture.options,
          ...configuration,
        }),
      (error) =>
        error instanceof RailwayApiClientError &&
        error.code === "INVALID_CONFIGURATION",
    );
  }
});

test("rejects invalid requests before reading identity tokens", async () => {
  const fixture = createFixture();
  const client = createRailwayApiClient(fixture.options);

  await assert.rejects(
    () =>
      client.call({
        ...queryEnvelope(),
        payload: { tenantId: 7 },
      }),
    (error) =>
      error instanceof RailwayApiClientError &&
      error.code === "INVALID_REQUEST",
  );
  assert.deepEqual(fixture.tokenCalls, []);
  assert.deepEqual(fixture.fetchCalls, []);
});

test("fails closed when either identity proof is unavailable", async (context) => {
  const cases = [
    ["oidc", "oidcTokenProvider"],
    ["user", "userSessionTokenProvider"],
  ];

  for (const [name, providerName] of cases) {
    await context.test(name, async () => {
      const fixture = createFixture();
      fixture.options[providerName] = {
        async getToken() {
          return null;
        },
      };
      const client = createRailwayApiClient(fixture.options);

      await assert.rejects(
        () => client.call(queryEnvelope()),
        (error) =>
          error instanceof RailwayApiClientError &&
          error.code === "AUTHENTICATION_UNAVAILABLE" &&
          !/token|oidc|user/i.test(error.message),
      );
      assert.deepEqual(fixture.fetchCalls, []);
    });
  }
});

test("returns a bounded Railway failure without inventing success", async () => {
  const fixture = createFixture(
    jsonResponse(
      {
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        outcome: "error",
        code: "RATE_LIMITED",
      },
      { status: 429 },
    ),
  );
  const client = createRailwayApiClient(fixture.options);

  assert.deepEqual(await client.call(queryEnvelope()), {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "error",
    code: "RATE_LIMITED",
  });
});

test("rejects malformed, mismatched, and oversized responses", async (context) => {
  const cases = [
    {
      name: "media type",
      response: new Response("{}", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    },
    {
      name: "invalid JSON",
      response: new Response("{", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    },
    {
      name: "success status mismatch",
      response: jsonResponse(
        {
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          outcome: "ok",
          data: {},
        },
        { status: 201 },
      ),
    },
    {
      name: "failure status mismatch",
      response: jsonResponse({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        outcome: "error",
        code: "CONFLICT",
      }),
    },
    {
      name: "identity leak",
      response: jsonResponse({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        outcome: "ok",
        data: { externalUserId: "user_fixture_123" },
      }),
    },
    {
      name: "declared oversized",
      response: jsonResponse(
        {
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          outcome: "ok",
          data: {},
        },
        { headers: { "content-length": "65" } },
      ),
      maximumResponseBytes: 64,
    },
    {
      name: "actual oversized",
      response: jsonResponse({
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        outcome: "ok",
        data: { value: "x".repeat(100) },
      }),
      maximumResponseBytes: 64,
    },
  ];

  for (const fixtureCase of cases) {
    await context.test(fixtureCase.name, async () => {
      const fixture = createFixture(fixtureCase.response);
      const client = createRailwayApiClient({
        ...fixture.options,
        maximumResponseBytes: fixtureCase.maximumResponseBytes,
      });

      await assert.rejects(
        () => client.call(queryEnvelope()),
        (error) =>
          error instanceof RailwayApiClientError &&
          error.code === "INVALID_RESPONSE",
      );
    });
  }
});

test("maps network failures and bounded timeouts without exposing details", async (context) => {
  await context.test("network", async () => {
    const fixture = createFixture();
    fixture.options.fetchImplementation = async () => {
      throw new Error("private network address");
    };
    const client = createRailwayApiClient(fixture.options);

    await assert.rejects(
      () => client.call(queryEnvelope()),
      (error) =>
        error instanceof RailwayApiClientError &&
        error.code === "NETWORK_ERROR" &&
        !/private|address/i.test(error.message),
    );
  });

  await context.test("timeout", async () => {
    const fixture = createFixture();
    fixture.options.fetchImplementation = async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener(
          "abort",
          () => reject(new Error("private timeout detail")),
          { once: true },
        );
      });
    const client = createRailwayApiClient({
      ...fixture.options,
      requestTimeoutMs: 1,
    });

    await assert.rejects(
      () => client.call(queryEnvelope()),
      (error) =>
        error instanceof RailwayApiClientError &&
        error.code === "TIMEOUT" &&
        !/private|detail/i.test(error.message),
    );
  });
});
