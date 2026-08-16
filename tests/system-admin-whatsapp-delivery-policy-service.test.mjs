import assert from "node:assert/strict";
import test from "node:test";

import {
  createSystemAdminWhatsappDeliveryPolicyService,
  SystemAdminWhatsappDeliveryPolicyError,
  SystemAdminWhatsappDeliveryPolicyInputError,
} from "../server/campaigns/systemAdminWhatsappDeliveryPolicyService.ts";

const recordedAt =
  "2026-08-16T10:01:00.000Z";
const evidenceCheckedAt =
  "2026-08-16T10:00:00.000Z";
const evidenceExpiresAt =
  "2026-08-16T11:00:00.000Z";
const session = {
  externalUserId:
    "system-admin-external-id",
};

function connection(overrides = {}) {
  return {
    tenantId: 7,
    businessPortfolioId: "400001",
    wabaId: "400002",
    phoneNumberId: "400003",
    status: "connected",
    webhookSubscribedAt:
      evidenceCheckedAt,
    connectedAt: evidenceCheckedAt,
    version: 3,
    createdAt: evidenceCheckedAt,
    updatedAt: evidenceCheckedAt,
    ...overrides,
  };
}

function policyRecord(overrides = {}) {
  return {
    eventKey:
      `whatsapp_delivery_policy_event_v1_${"a".repeat(64)}`,
    tenantId: 7,
    connectionVersion: 3,
    policyVersion: 1,
    deliveryState: "enabled",
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 250,
    },
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v21.0",
    evidenceDigest: "b".repeat(64),
    evidenceCheckedAt,
    evidenceExpiresAt,
    actorExternalUserId:
      session.externalUserId,
    recordedAt,
    ...overrides,
  };
}

function approvalInput(overrides = {}) {
  return {
    tenantId: 7,
    expectedConnectionVersion: 3,
    expectedPolicyVersion: 0,
    businessPortfolioId: "400001",
    wabaId: "400002",
    phoneNumberId: "400003",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 250,
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v21.0",
    evidenceDigest: "b".repeat(64),
    evidenceCheckedAt,
    evidenceExpiresAt,
    ...overrides,
  };
}

function fixture(overrides = {}) {
  const calls = [];
  const state = {
    connection: connection(),
    latestPolicy: null,
    ...overrides,
  };
  const dependencies = {
    metaRepository: {
      async findConnectionByTenantId(
        tenantId,
      ) {
        calls.push({
          operation: "findConnection",
          tenantId,
        });
        return state.connection;
      },
    },
    policyRepository: {
      async findLatestPolicyEvent(
        tenantId,
      ) {
        calls.push({
          operation: "findLatestPolicy",
          tenantId,
        });
        return state.latestPolicy;
      },
      async recordPolicyEvent(command) {
        calls.push({
          operation: "recordPolicy",
          command,
        });
        const record = policyRecord({
          connectionVersion:
            command.connectionVersion,
          policyVersion:
            command.expectedPolicyVersion + 1,
          deliveryState:
            command.deliveryState,
          portfolioCapacity:
            command.portfolioLimitKind ===
            "bounded"
              ? {
                  kind: "bounded",
                  maximumUniqueRecipients:
                    command.portfolioLimitValue,
                }
              : { kind: "unlimited" },
          reservationDurationSeconds:
            command.reservationDurationSeconds,
          metaGraphApiVersion:
            command.metaGraphApiVersion,
          evidenceDigest:
            command.evidenceDigest,
          evidenceCheckedAt:
            command.evidenceCheckedAt,
          evidenceExpiresAt:
            command.evidenceExpiresAt,
          actorExternalUserId:
            command.actorExternalUserId,
          recordedAt: command.recordedAt,
        });

        return {
          outcome:
            command.expectedPolicyVersion === 0
              ? "created"
              : "updated",
          record,
        };
      },
    },
  };

  return {
    calls,
    dependencies,
    service:
      createSystemAdminWhatsappDeliveryPolicyService(
        dependencies,
        () => recordedAt,
      ),
  };
}

test("approves only evidence bound to the exact live Meta connection", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.service.approve(
      session,
      approvalInput(),
    );
  const mutation =
    testFixture.calls.find(
      (call) =>
        call.operation === "recordPolicy",
    );

  assert.equal(result.outcome, "created");
  assert.deepEqual(mutation?.command, {
    tenantId: 7,
    connectionVersion: 3,
    expectedPolicyVersion: 0,
    deliveryState: "enabled",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 250,
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v21.0",
    evidenceDigest: "b".repeat(64),
    evidenceCheckedAt,
    evidenceExpiresAt,
    actorExternalUserId:
      session.externalUserId,
    recordedAt,
  });
});

test("rejects client-supplied audit fields, unknown fields, and expired evidence before mutation", async () => {
  for (const invalidInput of [
    {
      ...approvalInput(),
      actorExternalUserId:
        "forged-operator",
    },
    {
      ...approvalInput(),
      recordedAt:
        "2026-08-16T09:00:00.000Z",
    },
    approvalInput({
      evidenceExpiresAt: recordedAt,
    }),
    approvalInput({
      evidenceCheckedAt:
        "2026-08-16T10:02:00.000Z",
    }),
  ]) {
    const testFixture = fixture();

    await assert.rejects(
      testFixture.service.approve(
        session,
        invalidInput,
      ),
      SystemAdminWhatsappDeliveryPolicyInputError,
    );
    assert.equal(
      testFixture.calls.some(
        (call) =>
          call.operation ===
          "recordPolicy",
      ),
      false,
    );
  }
});

test("fails closed for provider identity, connection version, policy version, and connection state drift", async () => {
  const scenarios = [
    {
      fixtureOverrides: {},
      inputOverrides: {
        phoneNumberId: "499999",
      },
      expectedCode: "CONFLICT",
    },
    {
      fixtureOverrides: {
        connection: connection({
          version: 4,
        }),
      },
      inputOverrides: {},
      expectedCode: "CONFLICT",
    },
    {
      fixtureOverrides: {
        latestPolicy: policyRecord(),
      },
      inputOverrides: {},
      expectedCode: "CONFLICT",
    },
    {
      fixtureOverrides: {
        connection: connection({
          status: "restricted",
        }),
      },
      inputOverrides: {},
      expectedCode:
        "CONNECTION_NOT_READY",
    },
  ];

  for (const scenario of scenarios) {
    const testFixture = fixture(
      scenario.fixtureOverrides,
    );

    await assert.rejects(
      testFixture.service.approve(
        session,
        approvalInput(
          scenario.inputOverrides,
        ),
      ),
      (error) =>
        error instanceof
          SystemAdminWhatsappDeliveryPolicyError &&
        error.code ===
          scenario.expectedCode,
    );
    assert.equal(
      testFixture.calls.some(
        (call) =>
          call.operation ===
          "recordPolicy",
      ),
      false,
    );
  }
});

test("kill switch inherits the last approved snapshot and remains available after evidence expiry", async () => {
  const expiredPolicy = policyRecord({
    evidenceExpiresAt:
      "2026-08-16T09:00:00.000Z",
  });
  const testFixture = fixture({
    latestPolicy: expiredPolicy,
  });
  const result =
    await testFixture.service.activateKillSwitch(
      session,
      {
        tenantId: 7,
        expectedConnectionVersion: 3,
        expectedPolicyVersion: 1,
      },
    );
  const mutation =
    testFixture.calls.find(
      (call) =>
        call.operation === "recordPolicy",
    );

  assert.equal(result.outcome, "updated");
  assert.equal(
    mutation?.command.deliveryState,
    "disabled",
  );
  assert.equal(
    mutation?.command.evidenceDigest,
    expiredPolicy.evidenceDigest,
  );
  assert.equal(
    mutation?.command.reservationDurationSeconds,
    expiredPolicy.reservationDurationSeconds,
  );
  assert.equal(
    mutation?.command.connectionVersion,
    3,
  );
  assert.equal(
    mutation?.command.actorExternalUserId,
    session.externalUserId,
  );
});

test("repeated kill switch is unchanged and cannot create another event", async () => {
  const disabled = policyRecord({
    deliveryState: "disabled",
  });
  const testFixture = fixture({
    latestPolicy: disabled,
  });
  const result =
    await testFixture.service.activateKillSwitch(
      session,
      {
        tenantId: 7,
        expectedConnectionVersion: 3,
        expectedPolicyVersion: 1,
      },
    );

  assert.deepEqual(result, {
    outcome: "unchanged",
    record: disabled,
  });
  assert.equal(
    testFixture.calls.some(
      (call) =>
        call.operation === "recordPolicy",
    ),
    false,
  );
});

test("sanitizes persistence failures and cross-tenant results", async () => {
  const failedFixture = fixture();
  failedFixture.dependencies.policyRepository
    .recordPolicyEvent = async () => {
      throw new Error("PRIVATE_D1_DETAILS");
    };

  await assert.rejects(
    failedFixture.service.approve(
      session,
      approvalInput(),
    ),
    (error) =>
      error instanceof
        SystemAdminWhatsappDeliveryPolicyError &&
      error.code ===
        "PERSISTENCE_FAILED" &&
      !error.message.includes(
        "PRIVATE_D1_DETAILS",
      ),
  );

  const crossTenantFixture = fixture();
  crossTenantFixture.dependencies
    .policyRepository.recordPolicyEvent =
    async () => ({
      outcome: "created",
      record: policyRecord({
        tenantId: 8,
      }),
    });

  await assert.rejects(
    crossTenantFixture.service.approve(
      session,
      approvalInput(),
    ),
    (error) =>
      error instanceof
        SystemAdminWhatsappDeliveryPolicyError &&
      error.code ===
        "PERSISTENCE_FAILED",
  );
});
