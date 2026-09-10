import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwaySystemAdminBusinessProfileOperation,
  railwaySystemAdminBusinessProfileOperationPolicy,
} from "../server/platform/railwaySystemAdminBusinessProfileOperation.ts";

const operationId =
  "system-admin.business-profile.update";
const adminIdentity = "system-admin-primary";
const payload = Object.freeze({
  targetTenantId: 7,
  expectedVersion: 3,
  businessName: "Connect Operations",
  timezone: "Asia/Jerusalem",
  interfaceLanguage: "he",
});
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

async function mutationRequest(
  requestPayload = payload,
  overrides = {},
) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation: operationId,
    requestKind: "mutation",
    idempotencyKey:
      await deriveRailwayApiDeterministicIdempotencyKey(
        operationId,
        requestPayload,
      ),
    payload: requestPayload,
    ...overrides,
  };
}

function persistedProfile(overrides = {}) {
  return {
    tenantId: 7,
    businessName: "Connect Operations",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
    version: 4,
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
    ...overrides,
  };
}

function fixture({
  allowedExternalUserIds = [adminIdentity],
  rateLimitDecision = { outcome: "allowed" },
  rateLimitError = null,
  repositoryResult = {
    outcome: "updated",
    profile: persistedProfile(),
  },
  repositoryError = null,
} = {}) {
  const calls = {
    rateLimitSubjects: [],
    repositoryInputs: [],
  };
  const operation =
    createRailwaySystemAdminBusinessProfileOperation({
      allowedExternalUserIds,
      mutationRateLimit: {
        async consume(subject) {
          calls.rateLimitSubjects.push(subject);
          if (rateLimitError) throw rateLimitError;
          return rateLimitDecision;
        },
      },
      businessProfiles: {
        async update(input) {
          calls.repositoryInputs.push(input);
          if (repositoryError) throw repositoryError;
          return repositoryResult;
        },
      },
    });

  return { calls, operation };
}

function hasDispatchCode(code) {
  return (error) =>
    error instanceof RailwayApiDispatchError &&
    error.code === code;
}

test("publishes one immutable system-admin mutation policy", () => {
  assert.deepEqual(
    railwaySystemAdminBusinessProfileOperationPolicy,
    {
      id: operationId,
      requestKind: "mutation",
      authorization: "system-admin-allowlist",
      mutationSafety: {
        rateLimit: "system-admin-mutation",
        idempotency:
          "deterministic-request-key-and-event-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
  );
  assert.equal(
    Object.isFrozen(
      railwaySystemAdminBusinessProfileOperationPolicy,
    ),
    true,
  );
  assert.equal(
    Object.isFrozen(
      railwaySystemAdminBusinessProfileOperationPolicy.mutationSafety,
    ),
    true,
  );
});

test("updates one target profile through allowlist, rate limit, version and audit repository", async () => {
  const testFixture = fixture();
  const result = await testFixture.operation.execute(
    dispatchContext,
    payload,
    await mutationRequest(),
  );

  assert.deepEqual(testFixture.calls.rateLimitSubjects, [
    `${adminIdentity}:${operationId}`,
  ]);
  assert.equal(testFixture.calls.repositoryInputs.length, 1);
  assert.deepEqual(
    {
      ...testFixture.calls.repositoryInputs[0],
      occurredAt: "canonical-server-time",
    },
    {
      tenantId: 7,
      expectedVersion: 3,
      businessName: "Connect Operations",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      actorExternalUserId: adminIdentity,
      occurredAt: "canonical-server-time",
    },
  );
  assert.match(
    testFixture.calls.repositoryInputs[0].occurredAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
  assert.deepEqual(result, {
    outcome: "updated",
    profile: {
      businessName: "Connect Operations",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      version: 4,
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: "2026-08-20T09:00:00.000Z",
    },
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|system-admin-primary/,
  );
});

test("denies a non-allowlisted identity before rate limit or persistence", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.operation.execute(
      {
        ...dispatchContext,
        userIdentity: {
          externalUserId: "authenticated-non-admin",
        },
      },
      payload,
      await mutationRequest(),
    ),
    hasDispatchCode("AUTHORIZATION_DENIED"),
  );
  assert.deepEqual(testFixture.calls.rateLimitSubjects, []);
  assert.deepEqual(testFixture.calls.repositoryInputs, []);
});

test("rejects extended payloads and mismatched idempotency keys before mutation", async () => {
  const extendedPayload = {
    ...payload,
    requestedRole: "owner",
  };
  const extended = fixture();
  const mismatched = fixture();

  await assert.rejects(
    extended.operation.execute(
      dispatchContext,
      extendedPayload,
      await mutationRequest(extendedPayload),
    ),
    hasDispatchCode("INVALID_REQUEST"),
  );
  await assert.rejects(
    mismatched.operation.execute(
      dispatchContext,
      payload,
      await mutationRequest(payload, {
        idempotencyKey:
          `connect_idempotency_v1_${"0".repeat(64)}`,
      }),
    ),
    hasDispatchCode("CONFLICT"),
  );
  assert.deepEqual(extended.calls.rateLimitSubjects, []);
  assert.deepEqual(extended.calls.repositoryInputs, []);
  assert.deepEqual(mismatched.calls.rateLimitSubjects, []);
  assert.deepEqual(mismatched.calls.repositoryInputs, []);
});

test("fails closed on limiter denial, limiter failure and malformed input", async () => {
  const limited = fixture({
    rateLimitDecision: { outcome: "limited" },
  });
  const unavailable = fixture({
    rateLimitError: new Error("private limiter detail"),
  });
  const malformed = fixture();

  await assert.rejects(
    limited.operation.execute(
      dispatchContext,
      payload,
      await mutationRequest(),
    ),
    hasDispatchCode("RATE_LIMITED"),
  );
  await assert.rejects(
    unavailable.operation.execute(
      dispatchContext,
      payload,
      await mutationRequest(),
    ),
    hasDispatchCode("DEPENDENCY_UNAVAILABLE"),
  );
  await assert.rejects(
    malformed.operation.execute(
      dispatchContext,
      { ...payload, expectedVersion: 0 },
      await mutationRequest({ ...payload, expectedVersion: 0 }),
    ),
    hasDispatchCode("INVALID_REQUEST"),
  );
  assert.deepEqual(limited.calls.repositoryInputs, []);
  assert.deepEqual(unavailable.calls.repositoryInputs, []);
  assert.deepEqual(malformed.calls.repositoryInputs, []);
});

test("maps not-found, version conflict and persistence failure to bounded codes", async () => {
  const scenarios = [
    [
      fixture({
        repositoryResult: { outcome: "not-found", profile: null },
      }),
      "NOT_FOUND",
    ],
    [
      fixture({
        repositoryResult: {
          outcome: "conflict",
          profile: persistedProfile({ version: 5 }),
        },
      }),
      "CONFLICT",
    ],
    [
      fixture({
        repositoryError: new Error("private PostgreSQL detail"),
      }),
      "DEPENDENCY_UNAVAILABLE",
    ],
  ];

  for (const [testFixture, code] of scenarios) {
    await assert.rejects(
      testFixture.operation.execute(
        dispatchContext,
        payload,
        await mutationRequest(),
      ),
      hasDispatchCode(code),
    );
  }
});

test("rejects incomplete or extended dependencies", () => {
  assert.throws(
    () =>
      createRailwaySystemAdminBusinessProfileOperation({
        allowedExternalUserIds: [],
        mutationRateLimit: { async consume() {} },
        businessProfiles: { async update() {} },
      }),
    /dependencies are invalid/,
  );
  assert.throws(
    () =>
      createRailwaySystemAdminBusinessProfileOperation({
        allowedExternalUserIds: [adminIdentity],
        mutationRateLimit: { async consume() {} },
        businessProfiles: { async update() {} },
        tenantId: 7,
      }),
    /dependencies are invalid/,
  );
});
