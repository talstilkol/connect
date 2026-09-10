import assert from "node:assert/strict";
import test from "node:test";

import {
  RAILWAY_API_CONTRACT_VERSION,
} from "../server/platform/railwayApiContract.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwayTeamMembershipHandler,
} from "../server/team/railwayTeamMembershipHandler.ts";
import {
  deriveTeamMemberKey,
} from "../server/team/teamMemberKey.ts";

const memberKey = deriveTeamMemberKey(7, "member-user");
const formerOwnerKey = deriveTeamMemberKey(7, "owner-user");

function fixture(options = {}) {
  const calls = [];
  const handler = createRailwayTeamMembershipHandler({
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
          if (options.response) return options.response;
          if (request.operation === "team.membership.owner.transfer") {
            return {
              contractVersion: RAILWAY_API_CONTRACT_VERSION,
              outcome: "ok",
              data: {
                outcome: "updated",
                formerOwner: {
                  memberKey: formerOwnerKey,
                  role: "manager",
                  status: "active",
                  version: 4,
                },
                newOwner: {
                  memberKey,
                  role: "owner",
                  status: "active",
                  version: 3,
                },
              },
            };
          }
          return {
            contractVersion: RAILWAY_API_CONTRACT_VERSION,
            outcome: "ok",
            data: {
              outcome: "updated",
              membership: {
                memberKey,
                role: request.operation.endsWith("role.change")
                  ? request.payload.role
                  : "agent",
                status: request.operation.endsWith("status.change")
                  ? request.payload.status
                  : "active",
                version: request.payload.expectedVersion + 1,
              },
            },
          };
        },
      };
    },
  });
  return { calls, handler };
}

test("sends a deterministic role mutation through the Railway client", async () => {
  const testFixture = fixture();
  const payload = { memberKey, expectedVersion: 2, role: "manager" };
  const result = await testFixture.handler.changeRole(payload);
  assert.deepEqual(result, {
    status: "saved",
    outcome: "updated",
    membership: {
      memberKey,
      role: "manager",
      status: "active",
      version: 3,
    },
  });
  const request = testFixture.calls.find(
    (entry) => Array.isArray(entry) && entry[0] === "request",
  )[1];
  assert.equal(
    request.idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      "team.membership.role.change",
      payload,
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(request),
    /tenantId|externalUserId|owner-user|member-user/,
  );
});

test("supports status changes and owner transfer with strict responses", async () => {
  const testFixture = fixture();
  const status = await testFixture.handler.changeStatus({
    memberKey,
    expectedVersion: 2,
    status: "suspended",
  });
  const transfer = await testFixture.handler.transferOwner({
    newOwnerMemberKey: memberKey,
    formerOwnerExpectedVersion: 3,
    newOwnerExpectedVersion: 2,
    formerOwnerRole: "manager",
  });
  assert.equal(status.status, "saved");
  assert.equal(status.membership.status, "suspended");
  assert.equal(transfer.status, "saved");
  assert.equal(transfer.formerOwner.role, "manager");
  assert.equal(transfer.newOwner.role, "owner");
});

test("rejects malformed input before identity or network access", async () => {
  const testFixture = fixture();
  for (const result of [
    await testFixture.handler.changeRole({
      memberKey,
      expectedVersion: 2,
      role: "owner",
    }),
    await testFixture.handler.changeStatus({
      memberKey,
      expectedVersion: 0,
      status: "active",
    }),
    await testFixture.handler.transferOwner({
      newOwnerMemberKey: memberKey,
      formerOwnerExpectedVersion: 3,
      newOwnerExpectedVersion: 2,
      formerOwnerRole: "owner",
    }),
  ]) {
    assert.deepEqual(result, { status: "invalid-input" });
  }
  assert.deepEqual(testFixture.calls, []);
});

test("maps every Railway failure without exposing provider details", async () => {
  const scenarios = [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["NOT_FOUND", "not-found"],
    ["CONFLICT", "conflict"],
    ["INVALID_TRANSITION", "invalid-transition"],
    ["STALE_SESSION", "stale-session"],
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
    }).handler.changeRole({ memberKey, expectedVersion: 2, role: "manager" });
    assert.deepEqual(result, { status });
  }
});

test("fails closed for malformed success and unavailable configuration", async () => {
  assert.deepEqual(
    await fixture({ configured: false }).handler.changeRole({
      memberKey,
      expectedVersion: 2,
      role: "manager",
    }),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await fixture({
      response: {
        contractVersion: RAILWAY_API_CONTRACT_VERSION,
        outcome: "ok",
        data: {
          outcome: "updated",
          membership: {
            memberKey,
            role: "owner",
            status: "active",
            version: 3,
          },
        },
      },
    }).handler.changeRole({ memberKey, expectedVersion: 2, role: "manager" }),
    { status: "server-error" },
  );
});
