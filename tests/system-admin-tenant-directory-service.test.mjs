import assert from "node:assert/strict";
import test from "node:test";

import {
  createSystemAdminTenantDirectoryService,
  SystemAdminTenantDirectoryInputError,
} from "../server/admin/systemAdminTenantDirectoryService.ts";

const session = {
  externalUserId:
    "system-admin-external-id",
};

function fixture() {
  const queries = [];
  const service =
    createSystemAdminTenantDirectoryService(
      {
        async listPage(query) {
          queries.push(query);
          return {
            tenants: [],
            nextCursor: null,
          };
        },
      },
    );

  return {
    queries,
    service,
  };
}

function query(
  afterTenantId = null,
  overrides = {},
) {
  return {
    afterTenantId,
    search: "",
    tenantStatus: "all",
    subscription: "all",
    ...overrides,
  };
}

test("passes only a normalized filter query and keyset cursor to the directory repository", async () => {
  const testFixture = fixture();

  await testFixture.service.list(
    session,
    query(),
  );
  await testFixture.service.list(
    session,
    query(50, {
      search: "  TENANT-51  ",
      tenantStatus: "trial",
      subscription:
        "without-subscription",
    }),
  );

  assert.deepEqual(
    testFixture.queries,
    [
      query(),
      query(50, {
        search: "tenant-51",
        tenantStatus: "trial",
        subscription:
          "without-subscription",
      }),
    ],
  );
});

test("rejects extended and invalid filter input before persistence", async () => {
  const testFixture = fixture();
  const invalidInputs = [
    {},
    {
      ...query(),
      tenantId: 7,
    },
    query(0),
    query("50"),
    query(null, {
      search: "a".repeat(81),
    }),
    query(null, {
      search: " ".repeat(81),
    }),
    query(null, {
      search: "tenant\n1",
    }),
    query(null, {
      tenantStatus: "unknown",
    }),
    query(null, {
      subscription: "unknown",
    }),
  ];

  for (const input of invalidInputs) {
    await assert.rejects(
      testFixture.service.list(
        session,
        input,
      ),
      SystemAdminTenantDirectoryInputError,
    );
  }

  assert.deepEqual(
    testFixture.queries,
    [],
  );
});

test("requires a valid system admin session before directory access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.list(
      {
        externalUserId: "",
      },
      query(),
    ),
    /session is invalid/,
  );
  assert.deepEqual(
    testFixture.queries,
    [],
  );
});
