import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwaySystemAdminSubscriptionOperations,
  railwaySystemAdminSubscriptionOperationPolicies,
} from "../server/platform/railwaySystemAdminSubscriptionOperations.ts";

const adminIdentity = "system-admin-primary";
const startsAt = "2026-08-01T00:00:00.000Z";
const endsAt = "2026-09-01T00:00:00.000Z";
const newEndsAt = "2026-10-01T00:00:00.000Z";
const dispatchContext = Object.freeze({
  serviceIdentity: Object.freeze({
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject:
      "owner:connect-team:project:connect-web:environment:production",
  }),
  userIdentity: Object.freeze({
    externalUserId: adminIdentity,
  }),
});
const payloads = Object.freeze({
  "system-admin.subscription.create": Object.freeze({
    targetTenantId: 7,
    status: "active",
    startsAt,
    endsAt,
  }),
  "system-admin.subscription.extend": Object.freeze({
    targetTenantId: 7,
    expectedVersion: 3,
    newEndsAt,
  }),
  "system-admin.subscription.status.change": Object.freeze({
    targetTenantId: 7,
    expectedVersion: 3,
    status: "suspended",
  }),
  "system-admin.subscription.cancel": Object.freeze({
    targetTenantId: 7,
    expectedVersion: 3,
  }),
});

async function mutationRequest(operationId, payload, overrides = {}) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation: operationId,
    requestKind: "mutation",
    idempotencyKey:
      await deriveRailwayApiDeterministicIdempotencyKey(
        operationId,
        payload,
      ),
    payload,
    ...overrides,
  };
}

function subscriptionFromInput(operation, input) {
  const createdAt = "2026-08-01T00:00:00.000Z";

  switch (operation) {
    case "create":
      return {
        tenantId: input.tenantId,
        status: input.status,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        cancelledAt: null,
        version: 1,
        createdAt: input.occurredAt,
        updatedAt: input.occurredAt,
      };
    case "extend":
      return {
        tenantId: input.tenantId,
        status: "active",
        startsAt,
        endsAt: input.newEndsAt,
        cancelledAt: null,
        version: input.expectedVersion + 1,
        createdAt,
        updatedAt: input.occurredAt,
      };
    case "changeStatus":
      return {
        tenantId: input.tenantId,
        status: input.status,
        startsAt,
        endsAt: newEndsAt,
        cancelledAt: null,
        version: input.expectedVersion + 1,
        createdAt,
        updatedAt: input.occurredAt,
      };
    case "cancel":
      return {
        tenantId: input.tenantId,
        status: "cancelled",
        startsAt,
        endsAt: newEndsAt,
        cancelledAt: input.occurredAt,
        version: input.expectedVersion + 1,
        createdAt,
        updatedAt: input.occurredAt,
      };
  }
}

function fixture({
  allowedExternalUserIds = [adminIdentity],
  rateLimitDecision = { outcome: "allowed" },
  rateLimitError = null,
  repositoryOutcome = null,
  repositoryError = null,
} = {}) {
  const calls = {
    rateLimitSubjects: [],
    repositoryInputs: [],
  };
  const subscriptions = {};

  for (const operation of [
    "create",
    "extend",
    "changeStatus",
    "cancel",
  ]) {
    subscriptions[operation] = async (input) => {
      calls.repositoryInputs.push({ operation, input });
      if (repositoryError) throw repositoryError;
      if (repositoryOutcome) return repositoryOutcome;

      return {
        outcome: operation === "create" ? "created" : "updated",
        subscription: subscriptionFromInput(operation, input),
      };
    };
  }

  const operations = createRailwaySystemAdminSubscriptionOperations({
    allowedExternalUserIds,
    mutationRateLimit: {
      async consume(subject) {
        calls.rateLimitSubjects.push(subject);
        if (rateLimitError) throw rateLimitError;
        return rateLimitDecision;
      },
    },
    subscriptions,
  });

  return {
    calls,
    operations,
    operation(operationId) {
      return operations.find((candidate) => candidate.id === operationId);
    },
  };
}

function hasDispatchCode(code) {
  return (error) =>
    error instanceof RailwayApiDispatchError && error.code === code;
}

test("publishes four immutable system-admin subscription policies", () => {
  assert.deepEqual(
    railwaySystemAdminSubscriptionOperationPolicies.map((policy) => ({
      id: policy.id,
      serviceMethod: policy.serviceMethod,
      requestKind: policy.requestKind,
      authorization: policy.authorization,
      mutationSafety: policy.mutationSafety,
    })),
    [
      ["system-admin.subscription.create", "create"],
      ["system-admin.subscription.extend", "extend"],
      ["system-admin.subscription.status.change", "changeStatus"],
      ["system-admin.subscription.cancel", "cancel"],
    ].map(([id, serviceMethod]) => ({
      id,
      serviceMethod,
      requestKind: "mutation",
      authorization: "system-admin-allowlist",
      mutationSafety: {
        rateLimit: "system-admin-mutation",
        idempotency: "deterministic-request-key-and-event-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    })),
  );
  assert.equal(
    Object.isFrozen(railwaySystemAdminSubscriptionOperationPolicies),
    true,
  );
  assert.equal(
    railwaySystemAdminSubscriptionOperationPolicies.every(
      (policy) =>
        Object.isFrozen(policy) &&
        Object.isFrozen(policy.mutationSafety),
    ),
    true,
  );
});

test("executes all four mutations through allowlist, isolated rate limit and bounded views", async () => {
  const testFixture = fixture();

  for (const policy of railwaySystemAdminSubscriptionOperationPolicies) {
    const payload = payloads[policy.id];
    const result = await testFixture.operation(policy.id).execute(
      dispatchContext,
      payload,
      await mutationRequest(policy.id, payload),
    );

    assert.equal(result.subscription.version > 0, true);
    assert.doesNotMatch(
      JSON.stringify(result),
      /tenantId|externalUserId|system-admin-primary/,
    );
  }

  assert.deepEqual(
    testFixture.calls.rateLimitSubjects,
    railwaySystemAdminSubscriptionOperationPolicies.map(
      (policy) => `${adminIdentity}:${policy.id}`,
    ),
  );
  assert.deepEqual(
    testFixture.calls.repositoryInputs.map((call) => call.operation),
    ["create", "extend", "changeStatus", "cancel"],
  );
  for (const call of testFixture.calls.repositoryInputs) {
    assert.equal(call.input.tenantId, 7);
    assert.equal(call.input.actorExternalUserId, adminIdentity);
    assert.match(
      call.input.occurredAt,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  }
});

test("denies a non-allowlisted identity before rate limit or persistence", async () => {
  const testFixture = fixture();
  const operationId = "system-admin.subscription.cancel";
  const payload = payloads[operationId];

  await assert.rejects(
    testFixture.operation(operationId).execute(
      {
        ...dispatchContext,
        userIdentity: { externalUserId: "authenticated-non-admin" },
      },
      payload,
      await mutationRequest(operationId, payload),
    ),
    hasDispatchCode("AUTHORIZATION_DENIED"),
  );
  assert.deepEqual(testFixture.calls.rateLimitSubjects, []);
  assert.deepEqual(testFixture.calls.repositoryInputs, []);
});

test("rejects extended payloads and mismatched idempotency before mutation", async () => {
  const operationId = "system-admin.subscription.extend";
  const extendedPayload = {
    ...payloads[operationId],
    actorExternalUserId: "forged-admin",
  };
  const extended = fixture();
  const mismatched = fixture();

  await assert.rejects(
    extended.operation(operationId).execute(
      dispatchContext,
      extendedPayload,
      await mutationRequest(operationId, extendedPayload),
    ),
    hasDispatchCode("INVALID_REQUEST"),
  );
  await assert.rejects(
    mismatched.operation(operationId).execute(
      dispatchContext,
      payloads[operationId],
      await mutationRequest(operationId, payloads[operationId], {
        idempotencyKey: `connect_idempotency_v1_${"0".repeat(64)}`,
      }),
    ),
    hasDispatchCode("CONFLICT"),
  );
  assert.deepEqual(extended.calls.repositoryInputs, []);
  assert.deepEqual(mismatched.calls.repositoryInputs, []);
});

test("fails closed on limiter denial, limiter failure and invalid input", async () => {
  const operationId = "system-admin.subscription.status.change";
  const limited = fixture({
    rateLimitDecision: { outcome: "limited" },
  });
  const unavailable = fixture({
    rateLimitError: new Error("private limiter detail"),
  });
  const invalid = fixture();
  const invalidPayload = {
    ...payloads[operationId],
    status: "expired",
  };

  await assert.rejects(
    limited.operation(operationId).execute(
      dispatchContext,
      payloads[operationId],
      await mutationRequest(operationId, payloads[operationId]),
    ),
    hasDispatchCode("RATE_LIMITED"),
  );
  await assert.rejects(
    unavailable.operation(operationId).execute(
      dispatchContext,
      payloads[operationId],
      await mutationRequest(operationId, payloads[operationId]),
    ),
    hasDispatchCode("DEPENDENCY_UNAVAILABLE"),
  );
  await assert.rejects(
    invalid.operation(operationId).execute(
      dispatchContext,
      invalidPayload,
      await mutationRequest(operationId, invalidPayload),
    ),
    hasDispatchCode("INVALID_REQUEST"),
  );
  assert.deepEqual(limited.calls.repositoryInputs, []);
  assert.deepEqual(unavailable.calls.repositoryInputs, []);
  assert.deepEqual(invalid.calls.repositoryInputs, []);
});

test("maps repository outcomes and failures to bounded API codes", async () => {
  const operationId = "system-admin.subscription.cancel";
  const payload = payloads[operationId];
  const scenarios = [
    [fixture({ repositoryOutcome: { outcome: "not-found", subscription: null } }), "NOT_FOUND"],
    [fixture({ repositoryOutcome: { outcome: "conflict", subscription: subscriptionFromInput("cancel", { tenantId: 7, expectedVersion: 3, occurredAt: "2026-08-20T09:00:00.000Z" }) } }), "CONFLICT"],
    [fixture({ repositoryOutcome: { outcome: "invalid-transition", subscription: subscriptionFromInput("cancel", { tenantId: 7, expectedVersion: 3, occurredAt: "2026-08-20T09:00:00.000Z" }) } }), "INVALID_TRANSITION"],
    [fixture({ repositoryError: new Error("private PostgreSQL detail") }), "DEPENDENCY_UNAVAILABLE"],
  ];

  for (const [testFixture, code] of scenarios) {
    await assert.rejects(
      testFixture.operation(operationId).execute(
        dispatchContext,
        payload,
        await mutationRequest(operationId, payload),
      ),
      hasDispatchCode(code),
    );
  }
});

test("rejects incomplete and extended operation dependencies", () => {
  const subscriptions = {
    async create() {},
    async extend() {},
    async changeStatus() {},
    async cancel() {},
  };

  assert.throws(
    () =>
      createRailwaySystemAdminSubscriptionOperations({
        allowedExternalUserIds: [],
        mutationRateLimit: { async consume() {} },
        subscriptions,
      }),
    /dependencies are invalid/,
  );
  assert.throws(
    () =>
      createRailwaySystemAdminSubscriptionOperations({
        allowedExternalUserIds: [adminIdentity],
        mutationRateLimit: { async consume() {} },
        subscriptions,
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
