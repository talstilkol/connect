import assert from "node:assert/strict";
import test from "node:test";

import {
  SystemAdminSessionError,
} from "../server/auth/systemAdminSession.ts";
import {
  createSystemAdminProductionDecisionActionHandler,
} from "../server/operations/systemAdminProductionDecisionActionHandler.ts";
import {
  SystemAdminProductionDecisionError,
  SystemAdminProductionDecisionInputError,
} from "../server/operations/systemAdminProductionDecisionService.ts";

const session = {
  externalUserId:
    "system-admin-external-id",
};

function fixture(options = {}) {
  const calls = [];
  const handler =
    createSystemAdminProductionDecisionActionHandler(
      {
        applicationConfigured: () =>
          options.applicationConfigured ??
          true,
        async createContext() {
          calls.push("context");

          if (options.contextError) {
            throw options.contextError;
          }

          return {
            session,
            service: {
              async list() {
                return [];
              },
              async save(
                currentSession,
                input,
              ) {
                calls.push({
                  currentSession,
                  input,
                });

                if (options.serviceError) {
                  throw options.serviceError;
                }

                return {
                  outcome:
                    options.outcome ??
                    "updated",
                  record: {
                    checkId:
                      "ai.provider",
                    selection:
                      "Provider choice approved",
                    rationale:
                      "The decision passed the required review.",
                    version: 2,
                    lastEventKey:
                      `production_decision_event_v1_${"b".repeat(64)}`,
                    decidedByExternalUserId:
                      session.externalUserId,
                    decidedAt:
                      "2026-07-27T14:00:00.000Z",
                    updatedAt:
                      "2026-07-27T14:00:00.000Z",
                  },
                };
              },
            },
          };
        },
      },
    );

  return {
    calls,
    handler,
  };
}

test("stops decision mutations before identity when configuration is missing", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.save({}),
    {
      status: "configuration-required",
    },
  );
  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("returns a bounded decision view without actor or event identity", async () => {
  const input = {
    checkId: "ai.provider",
    expectedVersion: 1,
    selection:
      "Provider choice approved",
    rationale:
      "The decision passed the required review.",
  };
  const result =
    await fixture().handler.save(input);
  const serialized = JSON.stringify(
    result,
  );

  assert.equal(result.status, "saved");
  assert.equal(result.record.version, 2);
  assert.doesNotMatch(
    serialized,
    /externalUserId|lastEventKey/,
  );
});

test("maps authentication, authority, validation, conflict, and persistence failures", async () => {
  const scenarios = [
    [
      new SystemAdminSessionError(
        "AUTHENTICATION_REQUIRED",
      ),
      "unauthenticated",
    ],
    [
      new SystemAdminSessionError(
        "SYSTEM_ADMIN_REQUIRED",
      ),
      "permission-denied",
    ],
    [
      new SystemAdminProductionDecisionInputError(),
      "invalid-input",
    ],
    [
      new SystemAdminProductionDecisionError(
        "CONFLICT",
      ),
      "conflict",
    ],
    [
      new SystemAdminProductionDecisionError(
        "PERSISTENCE_FAILED",
      ),
      "server-error",
    ],
  ];

  for (const [
    error,
    expectedStatus,
  ] of scenarios) {
    const contextError =
      error instanceof
      SystemAdminSessionError
        ? error
        : undefined;
    const serviceError =
      contextError ? undefined : error;
    const result = await fixture({
      contextError,
      serviceError,
    }).handler.save({});

    assert.deepEqual(result, {
      status: expectedStatus,
    });
  }
});
