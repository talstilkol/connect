import assert from "node:assert/strict";
import test from "node:test";

import {
  createSystemAdminSubscriptionService,
  SystemAdminSubscriptionError,
  SystemAdminSubscriptionInputError,
} from "../server/billing/systemAdminSubscriptionService.ts";

const session = {
  externalUserId:
    "system-admin-external-id",
};
const occurredAt =
  "2026-07-26T12:00:00.000Z";

function subscription(overrides = {}) {
  return {
    tenantId: 7,
    status: "active",
    startsAt:
      "2026-08-01T00:00:00.000Z",
    endsAt:
      "2026-09-01T00:00:00.000Z",
    cancelledAt: null,
    version: 1,
    createdAt:
      "2026-07-26 12:00:00",
    updatedAt:
      "2026-07-26 12:00:00",
    ...overrides,
  };
}

function fixture() {
  const calls = [];
  const repository = {
    async create(input) {
      calls.push({
        operation: "create",
        input,
      });
      return {
        outcome: "created",
        subscription: subscription(),
      };
    },
    async extend(input) {
      calls.push({
        operation: "extend",
        input,
      });
      return {
        outcome: "updated",
        subscription: subscription({
          endsAt:
            "2026-10-01T00:00:00.000Z",
          version: 2,
        }),
      };
    },
    async changeStatus(input) {
      calls.push({
        operation: "changeStatus",
        input,
      });
      return {
        outcome: "updated",
        subscription: subscription({
          status: "suspended",
          version: 2,
        }),
      };
    },
    async cancel(input) {
      calls.push({
        operation: "cancel",
        input,
      });
      return {
        outcome: "updated",
        subscription: subscription({
          status: "cancelled",
          cancelledAt: occurredAt,
          version: 2,
        }),
      };
    },
  };
  const service =
    createSystemAdminSubscriptionService(
      repository,
      () => occurredAt,
    );

  return {
    calls,
    repository,
    service,
  };
}

test("derives the audit actor and time from the system admin session and server clock", async () => {
  const testFixture = fixture();

  await testFixture.service.create(
    session,
    {
      tenantId: 7,
      status: "active",
      startsAt:
        "2026-08-01T00:00:00.000Z",
      endsAt:
        "2026-09-01T00:00:00.000Z",
    },
  );
  await testFixture.service.extend(
    session,
    {
      tenantId: 7,
      expectedVersion: 1,
      newEndsAt:
        "2026-10-01T00:00:00.000Z",
    },
  );
  await testFixture.service.changeStatus(
    session,
    {
      tenantId: 7,
      expectedVersion: 1,
      status: "suspended",
    },
  );
  await testFixture.service.cancel(
    session,
    {
      tenantId: 7,
      expectedVersion: 1,
    },
  );

  assert.deepEqual(
    testFixture.calls.map(
      (call) => call.operation,
    ),
    [
      "create",
      "extend",
      "changeStatus",
      "cancel",
    ],
  );

  for (const call of testFixture.calls) {
    assert.equal(
      call.input.actorExternalUserId,
      session.externalUserId,
    );
    assert.equal(
      call.input.occurredAt,
      occurredAt,
    );
    assert.equal(
      call.input.tenantId,
      7,
    );
  }
});

test("rejects extended input including a client supplied audit actor or time", async () => {
  const testFixture = fixture();

  for (const extraField of [
    {
      actorExternalUserId:
        "forged-admin",
    },
    {
      occurredAt:
        "2026-07-01T00:00:00.000Z",
    },
  ]) {
    await assert.rejects(
      testFixture.service.cancel(
        session,
        {
          tenantId: 7,
          expectedVersion: 1,
          ...extraField,
        },
      ),
      SystemAdminSubscriptionInputError,
    );
  }

  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("validates operation-specific status, version, and timestamps before persistence", async () => {
  const testFixture = fixture();
  const operations = [
    () =>
      testFixture.service.create(
        session,
        {
          tenantId: 7,
          status: "payment_failed",
          startsAt:
            "2026-08-01T00:00:00.000Z",
          endsAt:
            "2026-09-01T00:00:00.000Z",
        },
      ),
    () =>
      testFixture.service.extend(
        session,
        {
          tenantId: 7,
          expectedVersion: 0,
          newEndsAt:
            "2026-10-01T00:00:00.000Z",
        },
      ),
    () =>
      testFixture.service.changeStatus(
        session,
        {
          tenantId: 7,
          expectedVersion: 1,
          status: "expired",
        },
      ),
  ];

  for (const operation of operations) {
    await assert.rejects(
      operation(),
      SystemAdminSubscriptionInputError,
    );
  }

  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("maps repository outcomes to bounded state errors", async () => {
  const scenarios = [
    ["not-found", "NOT_FOUND"],
    ["conflict", "CONFLICT"],
    [
      "invalid-transition",
      "INVALID_TRANSITION",
    ],
  ];

  for (const [
    outcome,
    expectedCode,
  ] of scenarios) {
    const testFixture = fixture();
    testFixture.repository.cancel =
      async () => ({
        outcome,
        subscription:
          outcome === "not-found"
            ? null
            : subscription(),
      });

    await assert.rejects(
      testFixture.service.cancel(
        session,
        {
          tenantId: 7,
          expectedVersion: 1,
        },
      ),
      (error) =>
        error instanceof
          SystemAdminSubscriptionError &&
        error.code === expectedCode,
    );
  }
});

test("sanitizes persistence failures and cross-tenant results", async () => {
  const failedFixture = fixture();
  failedFixture.repository.cancel =
    async () => {
      throw new Error(
        "PRIVATE_D1_DETAILS",
      );
    };

  await assert.rejects(
    failedFixture.service.cancel(
      session,
      {
        tenantId: 7,
        expectedVersion: 1,
      },
    ),
    (error) =>
      error instanceof
        SystemAdminSubscriptionError &&
      error.code ===
        "PERSISTENCE_FAILED" &&
      !error.message.includes(
        "PRIVATE_D1_DETAILS",
      ),
  );

  const crossTenantFixture = fixture();
  crossTenantFixture.repository.cancel =
    async () => ({
      outcome: "updated",
      subscription: subscription({
        tenantId: 8,
      }),
    });

  await assert.rejects(
    crossTenantFixture.service.cancel(
      session,
      {
        tenantId: 7,
        expectedVersion: 1,
      },
    ),
    (error) =>
      error instanceof
        SystemAdminSubscriptionError &&
      error.code ===
        "PERSISTENCE_FAILED",
  );
});
