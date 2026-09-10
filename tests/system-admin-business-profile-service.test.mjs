import assert from "node:assert/strict";
import test from "node:test";

import {
  createSystemAdminBusinessProfileService,
  SystemAdminBusinessProfileError,
  SystemAdminBusinessProfileInputError,
} from "../server/admin/systemAdminBusinessProfileService.ts";

const session = {
  externalUserId:
    "system-admin-external-id",
};
const occurredAt =
  "2026-08-16T12:00:00.000Z";

function profile(overrides = {}) {
  return {
    tenantId: 7,
    businessName: "Updated Business",
    timezone: "Europe/London",
    interfaceLanguage: "en",
    version: 2,
    createdAt:
      "2026-08-01 10:00:00",
    updatedAt: occurredAt,
    ...overrides,
  };
}

function validInput(overrides = {}) {
  return {
    tenantId: 7,
    expectedVersion: 1,
    businessName: " Updated Business ",
    timezone: " Europe/London ",
    interfaceLanguage: "en",
    ...overrides,
  };
}

function fixture() {
  const calls = [];
  const repository = {
    async update(input) {
      calls.push(input);
      return {
        outcome: "updated",
        profile: profile(),
      };
    },
  };
  const service =
    createSystemAdminBusinessProfileService(
      repository,
      () => occurredAt,
    );

  return {
    calls,
    repository,
    service,
  };
}

test("derives audit identity and time on the server and normalizes profile fields", async () => {
  const testFixture = fixture();
  const result =
    await testFixture.service.update(
      session,
      validInput(),
    );

  assert.equal(result.outcome, "updated");
  assert.deepEqual(testFixture.calls, [
    {
      tenantId: 7,
      expectedVersion: 1,
      businessName: "Updated Business",
      timezone: "Europe/London",
      interfaceLanguage: "en",
      actorExternalUserId:
        session.externalUserId,
      occurredAt,
    },
  ]);
});

test("rejects extended, malformed, and unsupported input before persistence", async () => {
  const testFixture = fixture();
  const invalidInputs = [
    validInput({
      actorExternalUserId: "forged-admin",
    }),
    validInput({ expectedVersion: 0 }),
    validInput({
      timezone: "not-a-timezone",
    }),
    validInput({
      interfaceLanguage: "fr",
    }),
    validInput({ businessName: " " }),
  ];

  for (const input of invalidInputs) {
    await assert.rejects(
      testFixture.service.update(
        session,
        input,
      ),
      SystemAdminBusinessProfileInputError,
    );
  }

  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("requires a bounded system admin session and canonical server clock", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.update(
      { externalUserId: "" },
      validInput(),
    ),
    (error) =>
      error instanceof
        SystemAdminBusinessProfileError &&
      error.code ===
        "PERSISTENCE_FAILED",
  );

  const invalidClockService =
    createSystemAdminBusinessProfileService(
      testFixture.repository,
      () => "not-a-timestamp",
    );

  await assert.rejects(
    invalidClockService.update(
      session,
      validInput(),
    ),
    (error) =>
      error instanceof
        SystemAdminBusinessProfileError &&
      error.code ===
        "PERSISTENCE_FAILED",
  );
  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("maps bounded repository outcomes and failures", async () => {
  const scenarios = [
    ["not-found", "NOT_FOUND", null],
    ["conflict", "CONFLICT", profile()],
  ];

  for (const [
    outcome,
    expectedCode,
    currentProfile,
  ] of scenarios) {
    const testFixture = fixture();
    testFixture.repository.update =
      async () => ({
        outcome,
        profile: currentProfile,
      });

    await assert.rejects(
      testFixture.service.update(
        session,
        validInput(),
      ),
      (error) =>
        error instanceof
          SystemAdminBusinessProfileError &&
        error.code === expectedCode,
    );
  }

  const failedFixture = fixture();
  failedFixture.repository.update =
    async () => {
      throw new Error("PRIVATE_D1_ERROR");
    };

  await assert.rejects(
    failedFixture.service.update(
      session,
      validInput(),
    ),
    (error) =>
      error instanceof
        SystemAdminBusinessProfileError &&
      error.code ===
        "PERSISTENCE_FAILED",
  );
});
