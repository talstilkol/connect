import assert from "node:assert/strict";
import test from "node:test";

import {
  createSystemAdminProductionDecisionService,
  SystemAdminProductionDecisionError,
  SystemAdminProductionDecisionInputError,
} from "../server/operations/systemAdminProductionDecisionService.ts";

const session = {
  externalUserId:
    "system-admin-external-id",
};
const input = {
  checkId: "billing.provider",
  expectedVersion: 0,
  selection:
    "Billing provider choice approved",
  rationale:
    "The selection passed finance and engineering review.",
};
const savedRecord = {
  ...input,
  expectedVersion: undefined,
  version: 1,
  lastEventKey:
    `production_decision_event_v1_${"a".repeat(64)}`,
  decidedByExternalUserId:
    session.externalUserId,
  decidedAt:
    "2026-07-27T13:00:00.000Z",
  updatedAt:
    "2026-07-27T13:00:00.000Z",
};

delete savedRecord.expectedVersion;

test("derives actor and time from the system admin session and server clock", async () => {
  const calls = [];
  const service =
    createSystemAdminProductionDecisionService(
      {
        async list() {
          return [];
        },
        async save(command) {
          calls.push(command);
          return {
            outcome: "created",
            record: savedRecord,
          };
        },
      },
      () =>
        "2026-07-27T13:00:00.000Z",
    );
  const result = await service.save(
    session,
    input,
  );

  assert.equal(
    result.outcome,
    "created",
  );
  assert.deepEqual(calls, [
    {
      ...input,
      actorExternalUserId:
        session.externalUserId,
      occurredAt:
        "2026-07-27T13:00:00.000Z",
    },
  ]);
});

test("rejects client supplied actor, time, and unknown fields", async () => {
  const service =
    createSystemAdminProductionDecisionService(
      {
        async list() {
          return [];
        },
        async save() {
          throw new Error(
            "repository must not be called",
          );
        },
      },
    );

  for (const extendedInput of [
    {
      ...input,
      actorExternalUserId:
        "client-actor",
    },
    {
      ...input,
      occurredAt:
        "2026-07-27T13:00:00.000Z",
    },
    {
      ...input,
      tenantId: 7,
    },
  ]) {
    await assert.rejects(
      service.save(
        session,
        extendedInput,
      ),
      SystemAdminProductionDecisionInputError,
    );
  }
});

test("maps repository conflicts and failures to bounded service errors", async () => {
  const conflictService =
    createSystemAdminProductionDecisionService(
      {
        async list() {
          return [];
        },
        async save() {
          return {
            outcome: "conflict",
            record: null,
          };
        },
      },
    );
  const failedService =
    createSystemAdminProductionDecisionService(
      {
        async list() {
          throw new Error(
            "PRIVATE_D1_FAILURE",
          );
        },
        async save() {
          throw new Error(
            "PRIVATE_D1_FAILURE",
          );
        },
      },
    );

  await assert.rejects(
    conflictService.save(
      session,
      input,
    ),
    (error) =>
      error instanceof
        SystemAdminProductionDecisionError &&
      error.code === "CONFLICT",
  );
  await assert.rejects(
    failedService.save(session, input),
    (error) =>
      error instanceof
        SystemAdminProductionDecisionError &&
      error.code ===
        "PERSISTENCE_FAILED",
  );
  await assert.rejects(
    failedService.list(session),
    (error) =>
      error instanceof
        SystemAdminProductionDecisionError &&
      error.code ===
        "PERSISTENCE_FAILED",
  );
});
