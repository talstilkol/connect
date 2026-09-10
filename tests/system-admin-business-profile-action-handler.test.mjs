import assert from "node:assert/strict";
import test from "node:test";

import {
  createSystemAdminBusinessProfileActionHandler,
} from "../server/admin/systemAdminBusinessProfileActionHandler.ts";
import {
  SystemAdminBusinessProfileError,
  SystemAdminBusinessProfileInputError,
} from "../server/admin/systemAdminBusinessProfileService.ts";
import {
  SystemAdminSessionError,
} from "../server/auth/systemAdminSession.ts";

const session = {
  externalUserId:
    "system-admin-external-id",
};

function resultProfile() {
  return {
    tenantId: 7,
    businessName: "Updated Business",
    timezone: "Europe/London",
    interfaceLanguage: "en",
    version: 2,
    createdAt:
      "2026-08-01 10:00:00",
    updatedAt:
      "2026-08-16T12:00:00.000Z",
    actorExternalUserId:
      "must-not-be-exposed",
    previousProfileDigest:
      "a".repeat(64),
  };
}

function fixture(options = {}) {
  const calls = [];
  const handler =
    createSystemAdminBusinessProfileActionHandler({
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
            async update(
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
                profile: resultProfile(),
              };
            },
          },
        };
      },
    });

  return { calls, handler };
}

test("stops before identity access when configuration is missing", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.update({}),
    {
      status: "configuration-required",
    },
  );
  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("returns a bounded profile view without tenant, actor, or digests", async () => {
  const testFixture = fixture();
  const input = {
    tenantId: 7,
    expectedVersion: 1,
    businessName: "Updated Business",
    timezone: "Europe/London",
    interfaceLanguage: "en",
  };
  const result =
    await testFixture.handler.update(
      input,
    );
  const serialized = JSON.stringify(
    result,
  );

  assert.deepEqual(result, {
    status: "saved",
    outcome: "updated",
    profile: {
      businessName: "Updated Business",
      timezone: "Europe/London",
      interfaceLanguage: "en",
      version: 2,
      createdAt:
        "2026-08-01 10:00:00",
      updatedAt:
        "2026-08-16T12:00:00.000Z",
    },
  });
  assert.doesNotMatch(
    serialized,
    /tenantId|externalUserId|Digest/,
  );
  assert.equal(
    testFixture.calls[1]
      .currentSession,
    session,
  );
  assert.equal(
    testFixture.calls[1].input,
    input,
  );
});

test("maps authentication, validation, state, and internal failures", async () => {
  const scenarios = [
    [
      {
        contextError:
          new SystemAdminSessionError(
            "AUTHENTICATION_REQUIRED",
          ),
      },
      "unauthenticated",
    ],
    [
      {
        contextError:
          new SystemAdminSessionError(
            "SYSTEM_ADMIN_REQUIRED",
          ),
      },
      "permission-denied",
    ],
    [
      {
        serviceError:
          new SystemAdminBusinessProfileInputError(),
      },
      "invalid-input",
    ],
    [
      {
        serviceError:
          new SystemAdminBusinessProfileError(
            "NOT_FOUND",
          ),
      },
      "not-found",
    ],
    [
      {
        serviceError:
          new SystemAdminBusinessProfileError(
            "CONFLICT",
          ),
      },
      "conflict",
    ],
    [
      {
        serviceError:
          new SystemAdminBusinessProfileError(
            "PERSISTENCE_FAILED",
          ),
      },
      "server-error",
    ],
    [
      {
        serviceError: new Error(
          "PRIVATE_PROFILE_FAILURE",
        ),
      },
      "server-error",
    ],
  ];

  for (const [options, status] of scenarios) {
    const result =
      await fixture(options).handler.update(
        {},
      );

    assert.deepEqual(result, {
      status,
    });
    assert.doesNotMatch(
      JSON.stringify(result),
      /PRIVATE_PROFILE_FAILURE/,
    );
  }
});
