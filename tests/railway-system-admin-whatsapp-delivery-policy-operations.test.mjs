import assert from "node:assert/strict";
import test from "node:test";

import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwaySystemAdminWhatsappDeliveryPolicyOperations,
  railwaySystemAdminWhatsappDeliveryPolicyOperationPolicies,
} from "../server/platform/railwaySystemAdminWhatsappDeliveryPolicyOperations.ts";

const adminIdentity = "system-admin-primary";
const readOperationId =
  "system-admin.whatsapp-delivery-policy.read";
const approveOperationId =
  "system-admin.whatsapp-delivery-policy.approve";
const killSwitchOperationId =
  "system-admin.whatsapp-delivery-policy.kill-switch";
const dispatchContext = Object.freeze({
  serviceIdentity: Object.freeze({
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject:
      "owner:connect-team:project:connect-web:environment:production",
  }),
  userIdentity: Object.freeze({ externalUserId: adminIdentity }),
});
const approvalPayload = Object.freeze({
  targetTenantId: 19,
  expectedConnectionVersion: 2,
  expectedPolicyVersion: 1,
  expectedBusinessPortfolioIdentifier: "portfolio-19",
  expectedWabaIdentifier: "waba-19",
  expectedPhoneNumberIdentifier: "phone-19",
  portfolioLimitKind: "bounded",
  portfolioLimitValue: 2000,
  phoneThroughputMessagesPerSecond: 80,
  maximumOutboundMessagesPerSecond: 65,
  reservationDurationSeconds: 60,
  metaGraphApiVersion: "v23.0",
  evidenceDigest: "f".repeat(64),
  evidenceCheckedAt: "2026-08-21T04:00:00.000Z",
  evidenceExpiresAt: "2026-08-22T04:00:00.000Z",
});
const killSwitchPayload = Object.freeze({
  targetTenantId: 19,
  expectedConnectionVersion: 2,
  expectedPolicyVersion: 1,
});

function connection(overrides = {}) {
  return {
    tenantId: 19,
    businessPortfolioId: "portfolio-19",
    wabaId: "waba-19",
    phoneNumberId: "phone-19",
    status: "connected",
    version: 2,
    ...overrides,
  };
}

function currentRecord(overrides = {}) {
  return {
    eventKey:
      `whatsapp_delivery_policy_event_v1_${"a".repeat(64)}`,
    tenantId: 19,
    connectionVersion: 2,
    policyVersion: 1,
    deliveryState: "enabled",
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 2000,
    },
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 70,
    },
    reservationDurationSeconds: 60,
    metaGraphApiVersion: "v23.0",
    evidenceDigest: "d".repeat(64),
    evidenceCheckedAt: "2026-08-21T03:00:00.000Z",
    evidenceExpiresAt: "2026-08-22T03:00:00.000Z",
    actorExternalUserId: adminIdentity,
    recordedAt: "2026-08-21T04:00:00.000Z",
    ...overrides,
  };
}

function recordFromCommand(command) {
  return {
    eventKey:
      `whatsapp_delivery_policy_event_v1_${"b".repeat(64)}`,
    tenantId: command.tenantId,
    connectionVersion: command.connectionVersion,
    policyVersion: command.expectedPolicyVersion + 1,
    deliveryState: command.deliveryState,
    portfolioCapacity:
      command.portfolioLimitKind === "bounded"
        ? {
            kind: "bounded",
            maximumUniqueRecipients: command.portfolioLimitValue,
          }
        : { kind: "unlimited" },
    phoneThroughput:
      command.phoneThroughputMessagesPerSecond === null
        ? null
        : {
            maximumMessagesPerSecond:
              command.phoneThroughputMessagesPerSecond,
            maximumOutboundMessagesPerSecond:
              command.maximumOutboundMessagesPerSecond,
          },
    reservationDurationSeconds: command.reservationDurationSeconds,
    metaGraphApiVersion: command.metaGraphApiVersion,
    evidenceDigest: command.evidenceDigest,
    evidenceCheckedAt: command.evidenceCheckedAt,
    evidenceExpiresAt: command.evidenceExpiresAt,
    actorExternalUserId: command.actorExternalUserId,
    recordedAt: command.recordedAt,
  };
}

function fixture({
  allowedExternalUserIds = [adminIdentity],
  rateLimitDecision = { outcome: "allowed" },
  rateLimitError = null,
  connectionResult = connection(),
  latestResult = currentRecord(),
  readError = null,
  mutationResult = null,
  mutationError = null,
} = {}) {
  const calls = {
    connectionReads: [],
    policyReads: [],
    policyMutations: [],
    rateLimitSubjects: [],
  };
  const operations =
    createRailwaySystemAdminWhatsappDeliveryPolicyOperations({
      allowedExternalUserIds,
      clock() {
        return "2026-08-21T05:00:00.000Z";
      },
      mutationRateLimit: {
        async consume(subject) {
          calls.rateLimitSubjects.push(subject);
          if (rateLimitError) throw rateLimitError;
          return rateLimitDecision;
        },
      },
      metaConnections: {
        async findConnectionByTenantId(tenantId) {
          calls.connectionReads.push(tenantId);
          if (readError) throw readError;
          return connectionResult;
        },
      },
      policies: {
        async findLatestPolicyEvent(tenantId) {
          calls.policyReads.push(tenantId);
          if (readError) throw readError;
          return latestResult;
        },
        async recordPolicyEvent(command) {
          calls.policyMutations.push(command);
          if (mutationError) throw mutationError;
          return mutationResult ?? {
            outcome: "updated",
            record: recordFromCommand(command),
          };
        },
      },
    });

  return {
    calls,
    operation(id) {
      return operations.find((candidate) => candidate.id === id);
    },
  };
}

function queryRequest() {
  return {
    contractVersion: "connect.railway-api.v1",
    operation: readOperationId,
    requestKind: "query",
    idempotencyKey: null,
    payload: { targetTenantId: 19 },
  };
}

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

function hasDispatchCode(code) {
  return (error) =>
    error instanceof RailwayApiDispatchError && error.code === code;
}

test("publishes one query and two immutable mutation policies", () => {
  assert.deepEqual(
    railwaySystemAdminWhatsappDeliveryPolicyOperationPolicies.map(
      ({ id, requestKind, authorization, mutationSafety }) => ({
        id,
        requestKind,
        authorization,
        mutationSafety,
      }),
    ),
    [
      {
        id: readOperationId,
        requestKind: "query",
        authorization: "system-admin-allowlist",
        mutationSafety: null,
      },
      ...[approveOperationId, killSwitchOperationId].map((id) => ({
        id,
        requestKind: "mutation",
        authorization: "system-admin-allowlist",
        mutationSafety: {
          rateLimit: "system-admin-mutation",
          idempotency: "deterministic-request-key-and-event-replay",
          audit: "atomic-immutable-policy-event",
          transaction: "required",
        },
      })),
    ],
  );
  assert.equal(
    railwaySystemAdminWhatsappDeliveryPolicyOperationPolicies.every(
      (policy) =>
        Object.isFrozen(policy) &&
        (policy.mutationSafety === null ||
          Object.isFrozen(policy.mutationSafety)),
    ),
    true,
  );
});

test("reads bounded policy data without quota or secret identifiers", async () => {
  const testFixture = fixture();
  const result = await testFixture.operation(readOperationId).execute(
    dispatchContext,
    { targetTenantId: 19 },
    queryRequest(),
  );

  assert.equal(result.connection.status, "connected");
  assert.equal(result.record.policyVersion, 1);
  assert.deepEqual(testFixture.calls.rateLimitSubjects, []);
  assert.doesNotMatch(
    JSON.stringify(result),
    /"tenantId"|"businessPortfolioId"|"wabaId"|"phoneNumberId"|externalUserId|system-admin-primary/,
  );
});

test("approves and disables policy through idempotency, quota and immutable audit", async () => {
  const approved = fixture();
  const approval = await approved.operation(approveOperationId).execute(
    dispatchContext,
    approvalPayload,
    await mutationRequest(approveOperationId, approvalPayload),
  );
  const disabled = fixture();
  const killSwitch = await disabled.operation(killSwitchOperationId).execute(
    dispatchContext,
    killSwitchPayload,
    await mutationRequest(killSwitchOperationId, killSwitchPayload),
  );

  assert.equal(approval.record.deliveryState, "enabled");
  assert.equal(killSwitch.record.deliveryState, "disabled");
  assert.deepEqual(approved.calls.rateLimitSubjects, [
    `${adminIdentity}:${approveOperationId}`,
  ]);
  assert.deepEqual(disabled.calls.rateLimitSubjects, [
    `${adminIdentity}:${killSwitchOperationId}`,
  ]);
  assert.equal(
    approved.calls.policyMutations[0].actorExternalUserId,
    adminIdentity,
  );
  assert.equal(
    disabled.calls.policyMutations[0].actorExternalUserId,
    adminIdentity,
  );
  assert.doesNotMatch(
    JSON.stringify([approval, killSwitch]),
    /tenantId|externalUserId|system-admin-primary/,
  );
});

test("replays already committed approval and kill switch without another policy event", async () => {
  const approvedRecord = currentRecord({
    policyVersion: 2,
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 65,
    },
    evidenceDigest: "f".repeat(64),
    evidenceCheckedAt: "2026-08-21T04:00:00.000Z",
    evidenceExpiresAt: "2026-08-22T04:00:00.000Z",
  });
  const approved = fixture({ latestResult: approvedRecord });
  const approval = await approved.operation(approveOperationId).execute(
    dispatchContext,
    approvalPayload,
    await mutationRequest(approveOperationId, approvalPayload),
  );
  const disabledRecord = currentRecord({
    policyVersion: 2,
    deliveryState: "disabled",
  });
  const disabled = fixture({ latestResult: disabledRecord });
  const killSwitch = await disabled.operation(killSwitchOperationId).execute(
    dispatchContext,
    killSwitchPayload,
    await mutationRequest(killSwitchOperationId, killSwitchPayload),
  );

  assert.equal(approval.outcome, "unchanged");
  assert.equal(approval.record.policyVersion, 2);
  assert.equal(killSwitch.outcome, "unchanged");
  assert.equal(killSwitch.record.deliveryState, "disabled");
  assert.deepEqual(approved.calls.policyMutations, []);
  assert.deepEqual(disabled.calls.policyMutations, []);
});

test("denies non-admin and forged payloads before quota or persistence", async () => {
  const unauthorized = fixture();
  const extended = fixture();
  const forgedPayload = {
    ...approvalPayload,
    actorExternalUserId: "forged-admin",
  };

  await assert.rejects(
    unauthorized.operation(approveOperationId).execute(
      {
        ...dispatchContext,
        userIdentity: { externalUserId: "authenticated-non-admin" },
      },
      approvalPayload,
      await mutationRequest(approveOperationId, approvalPayload),
    ),
    hasDispatchCode("AUTHORIZATION_DENIED"),
  );
  await assert.rejects(
    extended.operation(approveOperationId).execute(
      dispatchContext,
      forgedPayload,
      await mutationRequest(approveOperationId, forgedPayload),
    ),
    hasDispatchCode("INVALID_REQUEST"),
  );
  assert.deepEqual(unauthorized.calls.rateLimitSubjects, []);
  assert.deepEqual(extended.calls.rateLimitSubjects, []);
  assert.deepEqual(unauthorized.calls.policyMutations, []);
  assert.deepEqual(extended.calls.policyMutations, []);
});

test("fails closed on idempotency mismatch, limiter denial and connection drift", async () => {
  const mismatched = fixture();
  const limited = fixture({ rateLimitDecision: { outcome: "limited" } });
  const unavailableLimiter = fixture({
    rateLimitError: new Error("private limiter detail"),
  });
  const drifted = fixture({
    connectionResult: connection({ status: "needs_reauth" }),
  });

  await assert.rejects(
    mismatched.operation(approveOperationId).execute(
      dispatchContext,
      approvalPayload,
      await mutationRequest(approveOperationId, approvalPayload, {
        idempotencyKey: `connect_idempotency_v1_${"0".repeat(64)}`,
      }),
    ),
    hasDispatchCode("CONFLICT"),
  );
  await assert.rejects(
    limited.operation(approveOperationId).execute(
      dispatchContext,
      approvalPayload,
      await mutationRequest(approveOperationId, approvalPayload),
    ),
    hasDispatchCode("RATE_LIMITED"),
  );
  await assert.rejects(
    unavailableLimiter.operation(approveOperationId).execute(
      dispatchContext,
      approvalPayload,
      await mutationRequest(approveOperationId, approvalPayload),
    ),
    hasDispatchCode("DEPENDENCY_UNAVAILABLE"),
  );
  await assert.rejects(
    drifted.operation(approveOperationId).execute(
      dispatchContext,
      approvalPayload,
      await mutationRequest(approveOperationId, approvalPayload),
    ),
    hasDispatchCode("INVALID_TRANSITION"),
  );
});

test("rejects cross-tenant reads and incomplete operation dependencies", async () => {
  const crossTenant = fixture({
    connectionResult: connection({ tenantId: 20 }),
  });

  await assert.rejects(
    crossTenant.operation(readOperationId).execute(
      dispatchContext,
      { targetTenantId: 19 },
      queryRequest(),
    ),
    hasDispatchCode("DEPENDENCY_UNAVAILABLE"),
  );
  assert.throws(
    () =>
      createRailwaySystemAdminWhatsappDeliveryPolicyOperations({
        allowedExternalUserIds: [],
        clock() {
          return "2026-08-21T05:00:00.000Z";
        },
        mutationRateLimit: { async consume() {} },
        metaConnections: { async findConnectionByTenantId() {} },
        policies: {
          async findLatestPolicyEvent() {},
          async recordPolicyEvent() {},
        },
      }),
    /dependencies are invalid/,
  );
  assert.throws(
    () =>
      createRailwaySystemAdminWhatsappDeliveryPolicyOperations({
        allowedExternalUserIds: [adminIdentity],
        clock() {
          return "2026-08-21T05:00:00.000Z";
        },
        mutationRateLimit: { async consume() {} },
        metaConnections: { async findConnectionByTenantId() {} },
        policies: {
          async findLatestPolicyEvent() {},
          async recordPolicyEvent() {},
        },
        database: "forbidden-fallback",
      }),
    /dependencies are invalid/,
  );
});
