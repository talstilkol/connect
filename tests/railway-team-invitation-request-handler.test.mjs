import assert from "node:assert/strict";
import test from "node:test";

import {
  RAILWAY_API_CONTRACT_VERSION,
} from "../server/platform/railwayApiContract.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwayTeamInvitationRequestHandler,
} from "../server/team/railwayTeamInvitationRequestHandler.ts";

function fixture(options = {}) {
  const calls = [];
  const handler = createRailwayTeamInvitationRequestHandler({
    applicationConfigured: () => options.configured ?? true,
    inspectConfiguration: () => ({
      status: "configured",
      configuration: {
        apiOrigin: "https://api.example.com",
        deploymentEnvironment: "production",
      },
    }),
    async resolveIdentity() {
      calls.push("identity");
      return options.identity ?? {
        status: "authenticated",
        oidcToken: "oidc-token",
        userSessionToken: "session-token",
      };
    },
    createClient(configuration) {
      calls.push(["client", configuration]);
      return {
        async call(request) {
          calls.push(["request", request]);
          return options.response ?? {
            contractVersion: RAILWAY_API_CONTRACT_VERSION,
            outcome: "ok",
            data: { status: "queued" },
          };
        },
      };
    },
  });

  return { calls, handler };
}

test("normalizes and sends one deterministic Railway invitation request", async () => {
  const testFixture = fixture();
  const result = await testFixture.handler.invite({
    email: "  Member@Example.com ",
    role: "agent",
  });
  assert.deepEqual(result, { status: "queued" });
  const request = testFixture.calls.find(
    (entry) => Array.isArray(entry) && entry[0] === "request",
  )[1];
  assert.deepEqual(request.payload, {
    email: "member@example.com",
    role: "agent",
  });
  assert.equal(
    request.idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      "team.invitation.request",
      request.payload,
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(request),
    /tenantId|externalUserId|owner-user/,
  );
});

test("rejects invalid invitation input before identity and network", async () => {
  const testFixture = fixture();
  assert.deepEqual(
    await testFixture.handler.invite({
      email: "invalid",
      role: "owner",
    }),
    { status: "invalid-input" },
  );
  assert.deepEqual(testFixture.calls, []);
});

test("maps every approved Railway invitation failure", async () => {
  const scenarios = [
    ["CONFIGURATION_REQUIRED", "configuration-required"],
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["CONFLICT", "conflict"],
    ["RATE_LIMITED", "rate-limited"],
    ["DEPENDENCY_UNAVAILABLE", "temporarily-unavailable"],
    ["SERVER_ERROR", "server-error"],
  ];

  for (const [code, status] of scenarios) {
    const result = await fixture({
      response: {
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        outcome: "error",
        code,
      },
    }).handler.invite({ email: "member@example.com", role: "agent" });
    assert.deepEqual(result, { status });
  }
});

test("fails closed for malformed success and unavailable configuration", async () => {
  assert.deepEqual(
    await fixture({ configured: false }).handler.invite({
      email: "member@example.com",
      role: "agent",
    }),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await fixture({
      response: {
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        outcome: "ok",
        data: { status: "accepted" },
      },
    }).handler.invite({ email: "member@example.com", role: "agent" }),
    { status: "server-error" },
  );
});
