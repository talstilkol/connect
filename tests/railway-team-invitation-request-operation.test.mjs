import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwayTeamInvitationRequestOperation,
  RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
  railwayTeamInvitationRequestOperationPolicy,
} from "../server/platform/railwayTeamInvitationRequestOperation.ts";
import {
  TeamInvitationPolicyConfigurationError,
} from "../server/team/teamInvitationPolicy.ts";

const context = Object.freeze({
  userIdentity: Object.freeze({ externalUserId: "owner-user" }),
  serviceIdentity: Object.freeze({
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject: "owner:connect-team:project:connect-web:environment:production",
  }),
});
const session = Object.freeze({
  tenantId: 7,
  displayName: "Connect",
  status: "active",
  role: "owner",
  externalUserId: "owner-user",
});
const payload = Object.freeze({
  email: "member@example.com",
  role: "agent",
});

function fixture(options = {}) {
  const calls = [];
  const operation = createRailwayTeamInvitationRequestOperation({
    tenantSessions: {
      async resolve(identity) {
        calls.push(["session", identity]);
        return options.session ?? session;
      },
    },
    invitations: {
      async find(tenantId, invitationKey) {
        calls.push(["find", tenantId, invitationKey]);
        return options.current ?? null;
      },
      async request(command) {
        calls.push(["request", command]);
        return options.requestResult ?? {
          outcome: "created",
          invitation: {
            invitationKey:
              `team_invitation_v1_${"a".repeat(64)}`,
            tenantId: command.tenantId,
            normalizedEmail: command.email,
            role: command.role,
            status: "pending",
            version: 1,
            invitedByExternalUserId: command.actorExternalUserId,
            lastActor: { kind: "user", id: command.actorExternalUserId },
            requestedAt: command.requestedAt,
            expiresAt: command.expiresAt,
            updatedAt: command.requestedAt,
          },
        };
      },
      async transition(command) {
        calls.push(["transition", command]);
        return options.transitionResult ?? {
          outcome: "conflict",
          invitation: null,
        };
      },
    },
    publisher: {
      async publish(tenantId, deliveryKey) {
        calls.push(["publish", tenantId, deliveryKey]);
        if (options.publisherError) throw options.publisherError;
        return { outcome: "queued" };
      },
    },
    policyProvider() {
      calls.push("policy");
      if (options.policyError) throw options.policyError;
      return { ttlHours: 72, reRequest: "after-terminal" };
    },
    mutationRateLimit: {
      async consume(subject) {
        calls.push(["rate-limit", subject]);
        return { outcome: options.rateLimitOutcome ?? "allowed" };
      },
    },
    clock: () => "2026-08-21T12:00:00.000Z",
  });

  return { calls, operation };
}

async function execute(testFixture = fixture(), requestPayload = payload) {
  return testFixture.operation.execute(context, requestPayload, {
    contractVersion: "connect.railway-api.v1",
    operation: RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
    requestKind: "mutation",
    idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(
      RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
      requestPayload,
    ),
    payload: requestPayload,
  });
}

test("declares one rate-limited audited invitation request", () => {
  assert.deepEqual(railwayTeamInvitationRequestOperationPolicy, {
    id: "team.invitation.request",
    requestKind: "mutation",
    permission: "team.manage",
    mutationSafety: {
      rateLimit: "tenant-mutation",
      idempotency: "deterministic-domain-event-replay",
      audit: "atomic-immutable-event",
      transaction: "required",
    },
  });
});

test("persists and publishes a bounded invitation through the tenant session", async () => {
  const testFixture = fixture();
  assert.deepEqual(await execute(testFixture), { status: "queued" });
  assert.equal(
    testFixture.calls.some(
      (entry) => Array.isArray(entry) && entry[0] === "request",
    ),
    true,
  );
  assert.equal(
    testFixture.calls.some(
      (entry) => Array.isArray(entry) && entry[0] === "publish",
    ),
    true,
  );
  assert.deepEqual(
    testFixture.calls.find(
      (entry) => Array.isArray(entry) && entry[0] === "rate-limit",
    ),
    ["rate-limit", "7:owner-user:team.invitation.request"],
  );
  assert.doesNotMatch(
    JSON.stringify(await execute(fixture())),
    /tenantId|externalUserId|email|invitationKey|deliveryKey/,
  );
});

test("rejects forged idempotency before policy, identity, or persistence", async () => {
  const testFixture = fixture();
  await assert.rejects(
    testFixture.operation.execute(context, payload, {
      contractVersion: "connect.railway-api.v1",
      operation: RAILWAY_TEAM_INVITATION_REQUEST_OPERATION,
      requestKind: "mutation",
      idempotencyKey: `connect_idempotency_v1_${"f".repeat(64)}`,
      payload,
    }),
    (error) => error instanceof RailwayApiDispatchError &&
      error.code === "INVALID_REQUEST",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("maps missing policy, quota, and queue failure without leaking details", async () => {
  const scenarios = [
    [
      fixture({ policyError: new TeamInvitationPolicyConfigurationError() }),
      "CONFIGURATION_REQUIRED",
    ],
    [fixture({ rateLimitOutcome: "limited" }), "RATE_LIMITED"],
    [fixture({ publisherError: new Error("private") }), "DEPENDENCY_UNAVAILABLE"],
  ];

  for (const [testFixture, code] of scenarios) {
    await assert.rejects(
      execute(testFixture),
      (error) => error instanceof RailwayApiDispatchError &&
        error.code === code,
    );
  }
});
