import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwayTeamMembershipOperations,
  railwayTeamMembershipOperationPolicies,
} from "../server/platform/railwayTeamMembershipOperations.ts";
import {
  deriveTeamMemberKey,
} from "../server/team/teamMemberKey.ts";

const context = {
  userIdentity: { externalUserId: "owner-user" },
  serviceIdentity: {
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
  },
};
const session = {
  tenantId: 7,
  displayName: "Connect",
  status: "active",
  role: "owner",
  externalUserId: "owner-user",
};
const targetKey = deriveTeamMemberKey(7, "target-user");

function fixture(options = {}) {
  const calls = [];
  const dependencies = {
    tenantSessions: {
      async resolve() {
        calls.push("session");
        return options.session ?? session;
      },
    },
    membershipMutations: {
      async listByTenantId(tenantId) {
        calls.push(["list", tenantId]);
        return options.memberships ?? [
          {
            tenantId,
            externalUserId: "owner-user",
            role: "owner",
            status: "active",
            version: 3,
          },
          {
            tenantId,
            externalUserId: "target-user",
            role: "agent",
            status: "active",
            version: 2,
          },
        ];
      },
      async changeRole(command) {
        calls.push(["change-role", command]);
        return options.roleResult ?? {
          outcome: "updated",
          membership: {
            tenantId: command.tenantId,
            externalUserId: command.targetExternalUserId,
            role: command.toRole,
            status: "active",
            version: command.expectedVersion + 1,
          },
        };
      },
      async changeStatus(command) {
        calls.push(["change-status", command]);
        return {
          outcome: "updated",
          membership: {
            tenantId: command.tenantId,
            externalUserId: command.targetExternalUserId,
            role: "agent",
            status: command.toStatus,
            version: command.expectedVersion + 1,
          },
        };
      },
      async transferOwner(command) {
        calls.push(["transfer-owner", command]);
        return {
          outcome: "updated",
          formerOwner: {
            tenantId: command.tenantId,
            externalUserId: command.formerOwnerExternalUserId,
            role: command.formerOwnerRole,
            status: "active",
            version: command.formerOwnerExpectedVersion + 1,
          },
          newOwner: {
            tenantId: command.tenantId,
            externalUserId: command.newOwnerExternalUserId,
            role: "owner",
            status: "active",
            version: command.newOwnerExpectedVersion + 1,
          },
        };
      },
    },
    mutationRateLimit: {
      async consume(subject) {
        calls.push(["rate-limit", subject]);
        return { outcome: options.rateLimitOutcome ?? "allowed" };
      },
    },
    clock: () => "2026-08-21T12:00:00.000Z",
  };
  return {
    calls,
    operations: createRailwayTeamMembershipOperations(dependencies),
  };
}

async function execute(operation, payload, testFixture = fixture()) {
  const selected = testFixture.operations.find(({ id }) => id === operation);
  assert.ok(selected);
  return selected.execute(context, payload, {
    contractVersion: "connect.railway-api.v1",
    operation,
    requestKind: "mutation",
    idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(
      operation,
      payload,
    ),
    payload,
  });
}

test("declares three audited deterministic team membership mutations", () => {
  assert.deepEqual(
    railwayTeamMembershipOperationPolicies.map(({ id }) => id),
    [
      "team.membership.role.change",
      "team.membership.status.change",
      "team.membership.owner.transfer",
    ],
  );
  for (const policy of railwayTeamMembershipOperationPolicies) {
    assert.deepEqual(policy.mutationSafety, {
      rateLimit: "tenant-mutation",
      idempotency: "deterministic-domain-event-replay",
      audit: "atomic-immutable-event",
      transaction: "required",
    });
  }
});

test("changes role and status without exposing storage identity", async () => {
  const role = await execute("team.membership.role.change", {
    memberKey: targetKey,
    expectedVersion: 2,
    role: "manager",
  });
  const status = await execute("team.membership.status.change", {
    memberKey: targetKey,
    expectedVersion: 2,
    status: "suspended",
  });
  assert.deepEqual(role, {
    outcome: "updated",
    membership: {
      memberKey: targetKey,
      role: "manager",
      status: "active",
      version: 3,
    },
  });
  assert.equal(status.membership.status, "suspended");
  assert.doesNotMatch(
    JSON.stringify({ role, status }),
    /tenantId|externalUserId|owner-user|target-user|operationKey|eventKey/,
  );
});

test("transfers ownership and returns two bounded memberships", async () => {
  const result = await execute("team.membership.owner.transfer", {
    newOwnerMemberKey: targetKey,
    formerOwnerExpectedVersion: 3,
    newOwnerExpectedVersion: 2,
    formerOwnerRole: "manager",
  });
  assert.equal(result.formerOwner.role, "manager");
  assert.equal(result.newOwner.role, "owner");
  assert.notEqual(result.formerOwner.memberKey, result.newOwner.memberKey);
});

test("rejects a forged idempotency key before tenant resolution", async () => {
  const testFixture = fixture();
  const operation = testFixture.operations[0];
  await assert.rejects(
    operation.execute(context, {
      memberKey: targetKey,
      expectedVersion: 2,
      role: "manager",
    }, {
      contractVersion: "connect.railway-api.v1",
      operation: operation.id,
      requestKind: "mutation",
      idempotencyKey: `connect_idempotency_v1_${"f".repeat(64)}`,
      payload: {
        memberKey: targetKey,
        expectedVersion: 2,
        role: "manager",
      },
    }),
    (error) => error instanceof RailwayApiDispatchError &&
      error.code === "INVALID_REQUEST",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("maps rate limit and stale owner evidence to bounded failures", async () => {
  const limited = fixture({ rateLimitOutcome: "limited" });
  await assert.rejects(
    execute("team.membership.role.change", {
      memberKey: targetKey,
      expectedVersion: 2,
      role: "manager",
    }, limited),
    (error) => error instanceof RailwayApiDispatchError &&
      error.code === "RATE_LIMITED",
  );
  assert.equal(
    limited.calls.some((entry) => Array.isArray(entry) && entry[0] === "list"),
    false,
  );

  const stale = fixture({
    memberships: [{
      tenantId: 7,
      externalUserId: "owner-user",
      role: "manager",
      status: "active",
      version: 3,
    }],
  });
  await assert.rejects(
    execute("team.membership.role.change", {
      memberKey: targetKey,
      expectedVersion: 2,
      role: "manager",
    }, stale),
    (error) => error instanceof RailwayApiDispatchError &&
      error.code === "STALE_SESSION",
  );
});
