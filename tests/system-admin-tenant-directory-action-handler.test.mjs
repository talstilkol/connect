import assert from "node:assert/strict";
import test from "node:test";

import {
  createSystemAdminTenantDirectoryActionHandler,
} from "../server/admin/systemAdminTenantDirectoryActionHandler.ts";
import {
  SystemAdminTenantDirectoryInputError,
} from "../server/admin/systemAdminTenantDirectoryService.ts";
import {
  SystemAdminSessionError,
} from "../server/auth/systemAdminSession.ts";

const session = {
  externalUserId:
    "system-admin-external-id",
};

function fixture(options = {}) {
  const calls = [];
  const handler =
    createSystemAdminTenantDirectoryActionHandler({
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
            async list(
              currentSession,
              input,
            ) {
              calls.push({
                currentSession,
                input,
              });

              if (options.listError) {
                throw options.listError;
              }

              return {
                tenants: [],
                nextCursor: null,
              };
            },
          },
        };
      },
    });

  return {
    calls,
    handler,
  };
}

test("stops directory actions before identity when configuration is missing", async () => {
  const testFixture = fixture({
    applicationConfigured: false,
  });

  assert.deepEqual(
    await testFixture.handler.load({}),
    {
      status: "configuration-required",
    },
  );
  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("passes the system admin session and bounded input to the service", async () => {
  const testFixture = fixture();
  const input = {
    afterTenantId: 50,
    search: "tenant",
    tenantStatus: "active",
    subscription: "with-subscription",
  };
  const result =
    await testFixture.handler.load(input);

  assert.deepEqual(result, {
    status: "loaded",
    directory: {
      tenants: [],
      nextCursor: null,
    },
  });
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

test("maps authentication and authorization failures without tenant fallback", async () => {
  const unauthenticated =
    await fixture({
      contextError:
        new SystemAdminSessionError(
          "AUTHENTICATION_REQUIRED",
        ),
    }).handler.load({});
  const denied =
    await fixture({
      contextError:
        new SystemAdminSessionError(
          "SYSTEM_ADMIN_REQUIRED",
        ),
    }).handler.load({});

  assert.deepEqual(unauthenticated, {
    status: "unauthenticated",
  });
  assert.deepEqual(denied, {
    status: "permission-denied",
  });
});

test("maps invalid and internal failures to bounded results", async () => {
  const invalid =
    await fixture({
      listError:
        new SystemAdminTenantDirectoryInputError(),
    }).handler.load({});
  const failed =
    await fixture({
      listError: new Error(
        "PRIVATE_D1_DIRECTORY_FAILURE",
      ),
    }).handler.load({});

  assert.deepEqual(invalid, {
    status: "invalid-input",
  });
  assert.deepEqual(failed, {
    status: "server-error",
  });
  assert.doesNotMatch(
    JSON.stringify(failed),
    /PRIVATE_D1_DIRECTORY_FAILURE/,
  );
});
