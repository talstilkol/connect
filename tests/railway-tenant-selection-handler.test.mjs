import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayTenantSelectionHandler,
} from "../server/auth/railwayTenantSelectionHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

const selectionKey = `tenant_selection_option_v1_${"a".repeat(64)}`;
const directory = Object.freeze({
  version: 0,
  selectionRequired: false,
  options: Object.freeze([Object.freeze({
    selectionKey,
    displayName: "Connect",
    role: "owner",
    selected: true,
  })]),
});

function fixture(options = {}) {
  const calls = { identities: 0, requests: [] };
  const handler = createRailwayTenantSelectionHandler({
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
          if (options.response) return options.response(request);
          return request.requestKind === "query"
            ? {
                contractVersion: "connect.railway-api.v1",
                outcome: "ok",
                data: { directory },
              }
            : {
                contractVersion: "connect.railway-api.v1",
                outcome: "ok",
                data: { version: 1, unchanged: false, replayed: false },
              };
        },
      };
    },
  });
  return { calls, handler };
}

test("loads one bounded opaque Railway tenant directory", async () => {
  const testFixture = fixture();
  assert.deepEqual(await testFixture.handler.load(), {
    status: "ready",
    directory,
  });
  assert.deepEqual(testFixture.calls.requests[0], {
    contractVersion: "connect.railway-api.v1",
    operation: "tenant-selection.directory.read",
    requestKind: "query",
    idempotencyKey: null,
    payload: {},
  });
  assert.doesNotMatch(
    JSON.stringify(testFixture.calls.requests[0]),
    /tenantId|externalUserId/,
  );
});

test("saves one opaque selection with a deterministic idempotency key", async () => {
  const testFixture = fixture();
  const input = Object.freeze({ selectionKey, expectedVersion: 0 });
  assert.deepEqual(await testFixture.handler.select(input), {
    status: "selected",
    version: 1,
    unchanged: false,
  });
  assert.equal(testFixture.calls.requests.length, 1);
  assert.equal(
    testFixture.calls.requests[0].idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      "tenant-selection.save",
      input,
    ),
  );
  assert.deepEqual(testFixture.calls.requests[0].payload, input);
});

test("rejects malformed input before calling Railway", async () => {
  const testFixture = fixture();
  for (const [input, issue] of [
    [{ selectionKey }, "INVALID_INPUT"],
    [{ selectionKey: "forged", expectedVersion: 0 }, "INVALID_SELECTION_KEY"],
    [{ selectionKey, expectedVersion: -1 }, "INVALID_EXPECTED_VERSION"],
    [{ selectionKey, expectedVersion: 0, tenantId: 7 }, "INVALID_INPUT"],
  ]) {
    assert.deepEqual(await testFixture.handler.select(input), {
      status: "validation-error",
      issue,
    });
  }
  assert.equal(testFixture.calls.requests.length, 0);
});

test("maps bounded API failures and rejects malformed success", async () => {
  for (const [code, status] of [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "selection-required"],
    ["PERMISSION_DENIED", "selection-required"],
    ["CONFLICT", "conflict"],
    ["RATE_LIMITED", "rate-limited"],
    ["DEPENDENCY_UNAVAILABLE", "temporarily-unavailable"],
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
    assert.deepEqual(
      await testFixture.handler.select({ selectionKey, expectedVersion: 0 }),
      { status },
    );
  }

  const malformed = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: { version: 1, unchanged: false, replayed: true, tenantId: 7 },
      };
    },
  });
  assert.deepEqual(
    await malformed.handler.select({ selectionKey, expectedVersion: 0 }),
    { status: "server-error" },
  );
});

test("does not resolve identity while Railway configuration is disabled", async () => {
  const disabled = fixture({ applicationConfigured: false });
  assert.deepEqual(await disabled.handler.load(), {
    status: "configuration-required",
  });
  assert.equal(disabled.calls.identities, 0);
});
