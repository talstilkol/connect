import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwayTeamInvitationAcceptanceOperation,
  RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
  railwayTeamInvitationAcceptanceOperationPolicy,
} from "../server/platform/railwayTeamInvitationAcceptanceOperation.ts";

const invitationKey = `team_invitation_v1_${"a".repeat(64)}`;
const payload = Object.freeze({ invitationKey });
const context = Object.freeze({
  userIdentity: Object.freeze({ externalUserId: "invitee-user" }),
  serviceIdentity: Object.freeze({
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject: "owner:connect-team:project:connect-web:environment:production",
  }),
});

function fixture(options = {}) {
  const calls = [];
  const operation = createRailwayTeamInvitationAcceptanceOperation({
    acceptances: {
      async accept(command) {
        calls.push(["accept", command]);
        if (options.persistenceError) throw options.persistenceError;
        return options.acceptanceResult ?? {
          outcome: "created",
          acceptanceKey: `team_invitation_acceptance_v1_${"b".repeat(64)}`,
          membership: {
            tenantId: 7,
            externalUserId: command.externalUserId,
            role: "agent",
            status: "active",
            version: 1,
          },
        };
      },
    },
    identity: {
      async resolve(externalUserId) {
        calls.push(["identity", externalUserId]);
        return options.identityResult ?? {
          status: "verified",
          verifiedEmail: "invitee@example.com",
        };
      },
    },
    mutationRateLimit: {
      async consume(subject) {
        calls.push(["rate-limit", subject]);
        return { outcome: options.rateLimitOutcome ?? "allowed" };
      },
    },
    clock: () => new Date("2026-08-21T13:00:00.000Z"),
  });

  return { calls, operation };
}

async function execute(testFixture = fixture(), requestPayload = payload) {
  return testFixture.operation.execute(context, requestPayload, {
    contractVersion: "connect.railway-api.v1",
    operation: RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
    requestKind: "mutation",
    idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(
      RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
      requestPayload,
    ),
    payload: requestPayload,
  });
}

test("declares server-resolved identity and transactional acceptance", () => {
  assert.deepEqual(railwayTeamInvitationAcceptanceOperationPolicy, {
    id: "team.invitation.accept",
    requestKind: "mutation",
    permission: "authenticated-user",
    mutationSafety: {
      rateLimit: "tenant-mutation",
      idempotency: "deterministic-invitation-replay",
      identity: "server-resolved-verified-primary-email",
      transaction: "required",
    },
  });
});

test("accepts using only the authenticated Clerk identity", async () => {
  const testFixture = fixture();
  assert.deepEqual(await execute(testFixture), { status: "accepted" });
  assert.deepEqual(testFixture.calls, [
    ["rate-limit", "team-invitation-acceptance:invitee-user"],
    ["identity", "invitee-user"],
    ["accept", {
      invitationKey,
      externalUserId: "invitee-user",
      verifiedEmail: "invitee@example.com",
      acceptedAt: "2026-08-21T13:00:00.000Z",
    }],
  ]);
  assert.doesNotMatch(
    JSON.stringify(await execute(fixture())),
    /externalUserId|verifiedEmail|tenantId|acceptanceKey/,
  );
});

test("rejects browser-supplied identity before external effects", async () => {
  const testFixture = fixture();
  const maliciousPayload = {
    invitationKey,
    verifiedEmail: "forged@example.com",
  };
  await assert.rejects(
    testFixture.operation.execute(context, maliciousPayload, {
      contractVersion: "connect.railway-api.v1",
      operation: RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
      requestKind: "mutation",
      idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(
        RAILWAY_TEAM_INVITATION_ACCEPTANCE_OPERATION,
        maliciousPayload,
      ),
      payload: maliciousPayload,
    }),
    (error) => error instanceof RailwayApiDispatchError &&
      error.code === "INVALID_REQUEST",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("collapses identity, invitation, quota, and dependency failures", async () => {
  const scenarios = [
    [fixture({ rateLimitOutcome: "limited" }), "RATE_LIMITED"],
    [fixture({ identityResult: { status: "rejected" } }), "IDENTITY_VERIFICATION_REQUIRED"],
    [fixture({ identityResult: { status: "unavailable" } }), "DEPENDENCY_UNAVAILABLE"],
    [fixture({ acceptanceResult: { outcome: "not-found" } }), "INVITATION_UNAVAILABLE"],
    [fixture({ acceptanceResult: { outcome: "email-mismatch" } }), "INVITATION_UNAVAILABLE"],
    [fixture({ acceptanceResult: { outcome: "invalid-transition" } }), "INVITATION_UNAVAILABLE"],
    [fixture({ acceptanceResult: { outcome: "conflict" } }), "INVITATION_UNAVAILABLE"],
    [fixture({ persistenceError: new Error("private") }), "DEPENDENCY_UNAVAILABLE"],
  ];

  for (const [testFixture, code] of scenarios) {
    await assert.rejects(
      execute(testFixture),
      (error) => error instanceof RailwayApiDispatchError && error.code === code,
    );
  }
});
