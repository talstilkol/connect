import assert from "node:assert/strict";
import test from "node:test";

import {
  RAILWAY_API_CONTRACT_VERSION,
} from "../server/platform/railwayApiContract.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwayTeamInvitationAcceptanceHandler,
} from "../server/team/railwayTeamInvitationAcceptanceHandler.ts";

const invitationKey = `team_invitation_v1_${"a".repeat(64)}`;

function fixture(options = {}) {
  const calls = [];
  const handler = createRailwayTeamInvitationAcceptanceHandler({
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
            data: { status: "accepted" },
          };
        },
      };
    },
  });

  return { calls, handler };
}

test("sends one deterministic acceptance request without user identity fields", async () => {
  const testFixture = fixture();
  assert.deepEqual(
    await testFixture.handler.accept({ invitationKey }),
    { status: "accepted" },
  );
  const request = testFixture.calls.find(
    (entry) => Array.isArray(entry) && entry[0] === "request",
  )[1];
  assert.deepEqual(request.payload, { invitationKey });
  assert.equal(
    request.idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      "team.invitation.accept",
      request.payload,
    ),
  );
  assert.doesNotMatch(JSON.stringify(request), /externalUserId|verifiedEmail/);
});

test("rejects invalid input before identity and network", async () => {
  const testFixture = fixture();
  assert.deepEqual(
    await testFixture.handler.accept({
      invitationKey,
      verifiedEmail: "forged@example.com",
    }),
    { status: "invalid-input" },
  );
  assert.deepEqual(testFixture.calls, []);
});

test("maps approved acceptance failures without exposing invitation state", async () => {
  const scenarios = [
    ["CONFIGURATION_REQUIRED", "configuration-required"],
    ["USER_AUTHENTICATION_REQUIRED", "sign-in-required"],
    ["IDENTITY_VERIFICATION_REQUIRED", "identity-verification-required"],
    ["INVITATION_UNAVAILABLE", "invitation-unavailable"],
    ["NOT_FOUND", "invitation-unavailable"],
    ["CONFLICT", "invitation-unavailable"],
    ["RATE_LIMITED", "temporarily-unavailable"],
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
    }).handler.accept({ invitationKey });
    assert.deepEqual(result, { status });
  }
});

test("fails closed for activation, sign-in, and malformed success", async () => {
  assert.deepEqual(
    await fixture({ configured: false }).handler.accept({ invitationKey }),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await fixture({ identity: { status: "unauthenticated" } })
      .handler.accept({ invitationKey }),
    { status: "sign-in-required" },
  );
  assert.deepEqual(
    await fixture({
      response: {
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        outcome: "ok",
        data: { status: "queued" },
      },
    }).handler.accept({ invitationKey }),
    { status: "server-error" },
  );
});
