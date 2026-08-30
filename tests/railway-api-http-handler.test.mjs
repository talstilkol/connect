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
import {
  W3C_TRACEPARENT_HEADER,
} from "../server/platform/w3cTraceContext.ts";

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
  externalOrganizationId: "org_fixture_123",
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
  const telemetryEvents = [];

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
    telemetry: {
      record(event) {
        telemetryEvents.push(event);
        return true;
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
    telemetryEvents,
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
  assert.equal(fixture.dispatchCalls[0].context.traceContext, null);
  assert.doesNotMatch(JSON.stringify(body), /externalUserId|teamSlug/);
});

test("accepts correlation only after service authentication and records one bounded event", async () => {
  const fixture = createFixture();
  const clockValues = [1_000, 1_025];
  fixture.options.clock = () => clockValues.shift();
  const traceparent =
    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
  const handler = createRailwayApiHttpHandler(fixture.options);
  const response = await handler.handle(postRequest(queryBody(), {
    [W3C_TRACEPARENT_HEADER]: traceparent,
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(fixture.dispatchCalls[0].context.traceContext, {
    traceparent,
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    parentSpanId: "00f067aa0ba902b7",
    traceFlags: 1,
  });
  assert.deepEqual(fixture.telemetryEvents, [{
    version: 1,
    service: "connect-railway-api",
    kind: "api-request",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "ok",
    code: "OK",
    durationMilliseconds: 25,
    traceContext: fixture.dispatchCalls[0].context.traceContext,
  }]);
  assert.doesNotMatch(
    JSON.stringify(fixture.telemetryEvents),
    /externalUserId|organization|payload|authorization|compactJwt/i,
  );
});

test("rejects malformed trace context after OIDC but before user verification", async () => {
  const fixture = createFixture();
  const handler = createRailwayApiHttpHandler(fixture.options);
  const response = await handler.handle(postRequest(queryBody(), {
    [W3C_TRACEPARENT_HEADER]:
      "00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01",
  }));

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_REQUEST");
  assert.equal(fixture.oidcCalls.length, 1);
  assert.deepEqual(fixture.sessionCalls, []);
  assert.deepEqual(fixture.dispatchCalls, []);
  assert.equal(fixture.telemetryEvents.length, 1);
  assert.equal(fixture.telemetryEvents[0].code, "INVALID_REQUEST");
  assert.equal(fixture.telemetryEvents[0].traceContext, null);
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
      assert.deepEqual(fixture.telemetryEvents, []);
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
    ["CONFIGURATION_REQUIRED", 503],
    ["IDENTITY_VERIFICATION_REQUIRED", 403],
    ["AUTHORIZATION_DENIED", 403],
    ["TENANT_MEMBERSHIP_REQUIRED", 403],
    ["TENANT_SELECTION_REQUIRED", 403],
    ["PERMISSION_DENIED", 403],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
    ["INVALID_TRANSITION", 409],
    ["INVITATION_UNAVAILABLE", 404],
    ["STALE_SESSION", 409],
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
