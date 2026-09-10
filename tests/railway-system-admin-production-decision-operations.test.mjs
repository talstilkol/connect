import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwaySystemAdminProductionDecisionOperations,
  railwaySystemAdminProductionDecisionOperationPolicies,
} from "../server/platform/railwaySystemAdminProductionDecisionOperations.ts";

const listOperationId = "system-admin.production-decisions.list";
const saveOperationId = "system-admin.production-decisions.save";
const adminIdentity = "system-admin-primary";
const payload = Object.freeze({
  checkId: "ai.provider",
  expectedVersion: 0,
  selection: "Provider choice approved",
  rationale:
    "The decision passed product and security review.",
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

function record(overrides = {}) {
  return {
    checkId: "ai.provider",
    selection: "Provider choice approved",
    rationale:
      "The decision passed product and security review.",
    version: 1,
    lastEventKey:
      `production_decision_event_v1_${"a".repeat(64)}`,
    decidedByExternalUserId: adminIdentity,
    decidedAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
    ...overrides,
  };
}

async function queryRequest(overrides = {}) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation: listOperationId,
    requestKind: "query",
    idempotencyKey: null,
    payload: {},
    ...overrides,
  };
}

async function mutationRequest(requestPayload = payload, overrides = {}) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation: saveOperationId,
    requestKind: "mutation",
    idempotencyKey:
      await deriveRailwayApiDeterministicIdempotencyKey(
        saveOperationId,
        requestPayload,
      ),
    payload: requestPayload,
    ...overrides,
  };
}

function fixture({
  allowedExternalUserIds = [adminIdentity],
  rateLimitDecision = { outcome: "allowed" },
  rateLimitError = null,
  listResult = [record()],
  listError = null,
  saveResult = { outcome: "created", record: record() },
  saveError = null,
} = {}) {
  const calls = {
    lists: 0,
    rateLimitSubjects: [],
    saveInputs: [],
  };
  const operations =
    createRailwaySystemAdminProductionDecisionOperations({
      allowedExternalUserIds,
      mutationRateLimit: {
        async consume(subject) {
          calls.rateLimitSubjects.push(subject);
          if (rateLimitError) throw rateLimitError;
          return rateLimitDecision;
        },
      },
      productionDecisions: {
        async list() {
          calls.lists += 1;
          if (listError) throw listError;
          return listResult;
        },
        async save(input) {
          calls.saveInputs.push(input);
          if (saveError) throw saveError;
          return saveResult;
        },
      },
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

test("publishes immutable list and save policies", () => {
  assert.deepEqual(
    railwaySystemAdminProductionDecisionOperationPolicies,
    [
      {
        id: listOperationId,
        requestKind: "query",
        authorization: "system-admin-allowlist",
        mutationSafety: null,
      },
      {
        id: saveOperationId,
        requestKind: "mutation",
        authorization: "system-admin-allowlist",
        mutationSafety: {
          rateLimit: "system-admin-mutation",
          idempotency: "deterministic-request-key-and-event-replay",
          audit: "atomic-immutable-event",
          transaction: "required",
        },
      },
    ],
  );
  assert.equal(
    Object.isFrozen(railwaySystemAdminProductionDecisionOperationPolicies),
    true,
  );
  assert.equal(
    Object.isFrozen(
      railwaySystemAdminProductionDecisionOperationPolicies[1]
        .mutationSafety,
    ),
    true,
  );
});

test("lists bounded records without consuming the mutation quota", async () => {
  const testFixture = fixture();
  const result = await testFixture.operation(listOperationId).execute(
    dispatchContext,
    {},
    await queryRequest(),
  );

  assert.deepEqual(result, {
    records: [
      {
        checkId: "ai.provider",
        selection: "Provider choice approved",
        rationale:
          "The decision passed product and security review.",
        version: 1,
        decidedAt: "2026-08-20T09:00:00.000Z",
        updatedAt: "2026-08-20T09:00:00.000Z",
      },
    ],
  });
  assert.equal(testFixture.calls.lists, 1);
  assert.deepEqual(testFixture.calls.rateLimitSubjects, []);
  assert.doesNotMatch(
    JSON.stringify(result),
    /externalUserId|lastEventKey|system-admin-primary/,
  );
});

test("saves through allowlist, deterministic idempotency, rate limit and audit repository", async () => {
  const testFixture = fixture();
  const result = await testFixture.operation(saveOperationId).execute(
    dispatchContext,
    payload,
    await mutationRequest(),
  );

  assert.equal(result.outcome, "created");
  assert.deepEqual(testFixture.calls.rateLimitSubjects, [
    `${adminIdentity}:${saveOperationId}`,
  ]);
  assert.equal(testFixture.calls.saveInputs.length, 1);
  assert.deepEqual(
    {
      ...testFixture.calls.saveInputs[0],
      occurredAt: "canonical-server-time",
    },
    {
      ...payload,
      actorExternalUserId: adminIdentity,
      occurredAt: "canonical-server-time",
    },
  );
  assert.match(
    testFixture.calls.saveInputs[0].occurredAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
});

test("denies a non-allowlisted identity before query, quota, or persistence", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.operation(listOperationId).execute(
      {
        ...dispatchContext,
        userIdentity: { externalUserId: "authenticated-non-admin" },
      },
      {},
      await queryRequest(),
    ),
    hasDispatchCode("AUTHORIZATION_DENIED"),
  );
  assert.equal(testFixture.calls.lists, 0);
  assert.deepEqual(testFixture.calls.rateLimitSubjects, []);
  assert.deepEqual(testFixture.calls.saveInputs, []);
});

test("rejects extended payloads and mismatched idempotency before mutation", async () => {
  const extendedPayload = {
    ...payload,
    actorExternalUserId: "forged-admin",
  };
  const extended = fixture();
  const mismatched = fixture();

  await assert.rejects(
    extended.operation(saveOperationId).execute(
      dispatchContext,
      extendedPayload,
      await mutationRequest(extendedPayload),
    ),
    hasDispatchCode("INVALID_REQUEST"),
  );
  await assert.rejects(
    mismatched.operation(saveOperationId).execute(
      dispatchContext,
      payload,
      await mutationRequest(payload, {
        idempotencyKey: `connect_idempotency_v1_${"0".repeat(64)}`,
      }),
    ),
    hasDispatchCode("CONFLICT"),
  );
  assert.deepEqual(extended.calls.saveInputs, []);
  assert.deepEqual(mismatched.calls.saveInputs, []);
});

test("fails closed on limiter denial, repository conflict and dependency failures", async () => {
  const limited = fixture({
    rateLimitDecision: { outcome: "limited" },
  });
  const limiterFailed = fixture({
    rateLimitError: new Error("private limiter detail"),
  });
  const conflicted = fixture({
    saveResult: { outcome: "conflict", record: null },
  });
  const listFailed = fixture({
    listError: new Error("private PostgreSQL detail"),
  });

  await assert.rejects(
    limited.operation(saveOperationId).execute(
      dispatchContext,
      payload,
      await mutationRequest(),
    ),
    hasDispatchCode("RATE_LIMITED"),
  );
  await assert.rejects(
    limiterFailed.operation(saveOperationId).execute(
      dispatchContext,
      payload,
      await mutationRequest(),
    ),
    hasDispatchCode("DEPENDENCY_UNAVAILABLE"),
  );
  await assert.rejects(
    conflicted.operation(saveOperationId).execute(
      dispatchContext,
      payload,
      await mutationRequest(),
    ),
    hasDispatchCode("CONFLICT"),
  );
  await assert.rejects(
    listFailed.operation(listOperationId).execute(
      dispatchContext,
      {},
      await queryRequest(),
    ),
    hasDispatchCode("DEPENDENCY_UNAVAILABLE"),
  );
});

test("rejects incomplete and extended dependencies", () => {
  const productionDecisions = {
    async list() {},
    async save() {},
  };

  assert.throws(
    () =>
      createRailwaySystemAdminProductionDecisionOperations({
        allowedExternalUserIds: [],
        mutationRateLimit: { async consume() {} },
        productionDecisions,
      }),
    /dependencies are invalid/,
  );
  assert.throws(
    () =>
      createRailwaySystemAdminProductionDecisionOperations({
        allowedExternalUserIds: [adminIdentity],
        mutationRateLimit: { async consume() {} },
        productionDecisions,
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
