import assert from "node:assert/strict";
import test from "node:test";

import {
  RAILWAY_API_CONTRACT_VERSION,
  VERCEL_OIDC_HEADER,
} from "../server/platform/railwayApiContract.ts";
import {
  createRailwayApiHttpHandler,
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";

const compactJwt = "header.payload.signature";
const expectedServiceIdentity = Object.freeze({
  teamSlug: "connect-team",
  projectName: "connect-web",
  environment: "production",
});
const verifiedServiceIdentity = Object.freeze({
  provider: "vercel",
  ...expectedServiceIdentity,
  subject:
    "owner:connect-team:project:connect-web:environment:production",
});
const userIdentity = Object.freeze({
  externalUserId: "user_fixture_123",
});

function queryBody(payload = {}) {
  return JSON.stringify({
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    operation: "contacts.list",
    requestKind: "query",
    idempotencyKey: null,
    payload,
  });
}

function postRequest(body, headers = {}) {
  return new Request("https://api.connect.invalid/v1/connect", {
    method: "POST",
    headers: {
      authorization: `Bearer ${compactJwt}`,
      "content-type": "application/json; charset=utf-8",
      [VERCEL_OIDC_HEADER]: compactJwt,
      ...headers,
    },
    body,
  });
}

function createFixture(execute = async () => ({ items: [] })) {
  const oidcCalls = [];
  const sessionCalls = [];
  const dispatchCalls = [];

  const operation = {
    id: "contacts.list",
    requestKind: "query",
    async execute(context, payload, request) {
      dispatchCalls.push({ context, payload, request });
      return execute(context, payload, request);
    },
  };
  const options = {
    expectedServiceIdentity,
    oidcVerifier: {
      async verify(token, expected) {
        oidcCalls.push({ token, expected });
        return verifiedServiceIdentity;
      },
    },
    endUserSessionVerifier: {
      async verify(token) {
        sessionCalls.push(token);
        return userIdentity;
      },
    },
    operations: [operation],
  };

  return {
    dispatchCalls,
    oidcCalls,
    operation,
    options,
    sessionCalls,
  };
}

test("authenticates the Vercel service and end user before dispatch", async () => {
  const fixture = createFixture(async (_context, payload) => ({
    items: [{ key: payload.cursor ?? "first" }],
  }));
  const handler = createRailwayApiHttpHandler(fixture.options);
  const response = await handler.handle(
    postRequest(queryBody({ cursor: "cursor_123" })),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("x-content-type-options"),
    "nosniff",
  );
  assert.deepEqual(body, {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "ok",
    data: {
      items: [{ key: "cursor_123" }],
    },
  });
  assert.equal(fixture.oidcCalls.length, 1);
  assert.deepEqual(
    fixture.oidcCalls[0].expected,
    expectedServiceIdentity,
  );
  assert.deepEqual(fixture.sessionCalls, [compactJwt]);
  assert.equal(fixture.dispatchCalls.length, 1);
  assert.deepEqual(
    fixture.dispatchCalls[0].context.serviceIdentity,
    verifiedServiceIdentity,
  );
  assert.deepEqual(
    fixture.dispatchCalls[0].context.userIdentity,
    userIdentity,
  );
  assert.doesNotMatch(JSON.stringify(body), /externalUserId|teamSlug/);
});

test("rejects invalid service proof before user verification or dispatch", async (context) => {
  const cases = [
    {
      name: "missing OIDC",
      headers: { [VERCEL_OIDC_HEADER]: "" },
      verify: async () => verifiedServiceIdentity,
    },
    {
      name: "invalid OIDC",
      headers: { [VERCEL_OIDC_HEADER]: "not-a-jwt" },
      verify: async () => verifiedServiceIdentity,
    },
    {
      name: "rejected OIDC",
      headers: {},
      verify: async () => null,
    },
    {
      name: "preview identity",
      headers: {},
      verify: async () => ({
        ...verifiedServiceIdentity,
        environment: "preview",
      }),
    },
  ];

  for (const fixtureCase of cases) {
    await context.test(fixtureCase.name, async () => {
      const fixture = createFixture();
      fixture.options.oidcVerifier.verify = fixtureCase.verify;
      const handler = createRailwayApiHttpHandler(fixture.options);
      const response = await handler.handle(
        postRequest(queryBody(), fixtureCase.headers),
      );

      assert.equal(response.status, 401);
      assert.equal(
        (await response.json()).code,
        "SERVICE_AUTHENTICATION_REQUIRED",
      );
      assert.deepEqual(fixture.sessionCalls, []);
      assert.deepEqual(fixture.dispatchCalls, []);
    });
  }
});

test("rejects an invalid user session before dispatch", async (context) => {
  const cases = [
    {
      name: "missing bearer",
      headers: { authorization: "" },
      verify: async () => userIdentity,
    },
    {
      name: "invalid bearer",
      headers: { authorization: "Bearer invalid" },
      verify: async () => userIdentity,
    },
    {
      name: "rejected session",
      headers: {},
      verify: async () => null,
    },
  ];

  for (const fixtureCase of cases) {
    await context.test(fixtureCase.name, async () => {
      const fixture = createFixture();
      fixture.options.endUserSessionVerifier.verify = fixtureCase.verify;
      const handler = createRailwayApiHttpHandler(fixture.options);
      const response = await handler.handle(
        postRequest(queryBody(), fixtureCase.headers),
      );

      assert.equal(response.status, 401);
      assert.equal(
        (await response.json()).code,
        "USER_AUTHENTICATION_REQUIRED",
      );
      assert.deepEqual(fixture.dispatchCalls, []);
    });
  }
});

test("maps identity provider outages without exposing their errors", async (context) => {
  for (const provider of ["oidc", "user"]) {
    await context.test(provider, async () => {
      const fixture = createFixture();
      const privateError = new Error(
        "private identity provider connection detail",
      );

      if (provider === "oidc") {
        fixture.options.oidcVerifier.verify = async () => {
          throw privateError;
        };
      } else {
        fixture.options.endUserSessionVerifier.verify = async () => {
          throw privateError;
        };
      }

      const handler = createRailwayApiHttpHandler(fixture.options);
      const response = await handler.handle(postRequest(queryBody()));
      const responseText = await response.text();

      assert.equal(response.status, 503);
      assert.match(responseText, /DEPENDENCY_UNAVAILABLE/);
      assert.doesNotMatch(responseText, /private|connection/i);
      assert.deepEqual(fixture.dispatchCalls, []);
    });
  }
});

test("rejects unsupported HTTP shapes and bounded body violations", async (context) => {
  const fixture = createFixture();
  const handler = createRailwayApiHttpHandler({
    ...fixture.options,
    maximumBodyBytes: 32,
  });
  const cases = [
    {
      name: "method",
      request: new Request(
        "https://api.connect.invalid/v1/connect",
        { method: "GET" },
      ),
      status: 405,
    },
    {
      name: "media",
      request: postRequest("{}", {
        "content-type": "text/plain",
      }),
      status: 415,
    },
    {
      name: "encoding",
      request: postRequest("{}", {
        "content-encoding": "gzip",
      }),
      status: 415,
    },
    {
      name: "declared length",
      request: postRequest("{}", {
        "content-length": "33",
      }),
      status: 413,
    },
    {
      name: "invalid length",
      request: postRequest("{}", {
        "content-length": "invalid",
      }),
      status: 400,
    },
    {
      name: "actual length",
      request: postRequest("x".repeat(33)),
      status: 413,
    },
  ];

  for (const fixtureCase of cases) {
    await context.test(fixtureCase.name, async () => {
      const response = await handler.handle(fixtureCase.request);

      assert.equal(response.status, fixtureCase.status);
      assert.equal((await response.json()).code, "INVALID_REQUEST");
    });
  }

  assert.deepEqual(fixture.dispatchCalls, []);
});

test("rejects unknown operations and request-kind mismatches", async (context) => {
  const fixture = createFixture();
  const handler = createRailwayApiHttpHandler(fixture.options);
  const cases = [
    {
      ...JSON.parse(queryBody()),
      operation: "campaigns.list",
    },
    {
      ...JSON.parse(queryBody()),
      requestKind: "mutation",
      idempotencyKey: `connect_idempotency_v1_${"b".repeat(64)}`,
    },
  ];

  for (const body of cases) {
    await context.test(body.operation, async () => {
      const response = await handler.handle(
        postRequest(JSON.stringify(body)),
      );

      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, "INVALID_REQUEST");
    });
  }

  assert.deepEqual(fixture.dispatchCalls, []);
});

test("maps only approved operation failure codes", async (context) => {
  const cases = [
    ["INVALID_REQUEST", 400],
    ["AUTHORIZATION_DENIED", 403],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
    ["RATE_LIMITED", 429],
    ["DEPENDENCY_UNAVAILABLE", 503],
  ];

  for (const [code, status] of cases) {
    await context.test(code, async () => {
      const fixture = createFixture(async () => {
        throw new RailwayApiDispatchError(code);
      });
      const handler = createRailwayApiHttpHandler(fixture.options);
      const response = await handler.handle(postRequest(queryBody()));

      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), {
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        outcome: "error",
        code,
      });
    });
  }
});

test("fails closed when an operation leaks identity or exceeds the response bound", async (context) => {
  const cases = [
    {
      name: "identity leak",
      execute: async () => ({ tenantId: 7 }),
      maximumResponseBytes: 1_024,
    },
    {
      name: "oversized response",
      execute: async () => ({ value: "x".repeat(200) }),
      maximumResponseBytes: 64,
    },
    {
      name: "private exception",
      execute: async () => {
        throw new Error("private database detail");
      },
      maximumResponseBytes: 1_024,
    },
  ];

  for (const fixtureCase of cases) {
    await context.test(fixtureCase.name, async () => {
      const fixture = createFixture(fixtureCase.execute);
      const handler = createRailwayApiHttpHandler({
        ...fixture.options,
        maximumResponseBytes: fixtureCase.maximumResponseBytes,
      });
      const response = await handler.handle(postRequest(queryBody()));
      const responseText = await response.text();

      assert.equal(response.status, 500);
      assert.match(responseText, /SERVER_ERROR/);
      assert.doesNotMatch(responseText, /tenantId|private|database/i);
    });
  }
});

test("fails closed for empty, duplicate, and malformed operation configuration", () => {
  const fixture = createFixture();

  assert.throws(
    () =>
      createRailwayApiHttpHandler({
        ...fixture.options,
        operations: [],
      }),
    /operations/,
  );
  assert.throws(
    () =>
      createRailwayApiHttpHandler({
        ...fixture.options,
        operations: [fixture.operation, fixture.operation],
      }),
    /operations/,
  );
  assert.throws(
    () =>
      createRailwayApiHttpHandler({
        ...fixture.options,
        operations: [
          {
            ...fixture.operation,
            id: "invalid",
          },
        ],
      }),
  );
  assert.throws(
    () => new RailwayApiDispatchError("PRIVATE_FAILURE"),
    /dispatch error code/,
  );
});
