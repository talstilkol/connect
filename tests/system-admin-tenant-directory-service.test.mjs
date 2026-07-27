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
  const cursors = [];
  const service =
    createSystemAdminTenantDirectoryService(
      {
        async listPage(cursor) {
          cursors.push(cursor);
          return {
            tenants: [],
            nextCursor: null,
          };
        },
      },
    );

  return {
    cursors,
    service,
  };
}

test("passes only a validated keyset cursor to the directory repository", async () => {
  const testFixture = fixture();

  await testFixture.service.list(
    session,
    {
      afterTenantId: null,
    },
  );
  await testFixture.service.list(
    session,
    {
      afterTenantId: 50,
    },
  );

  assert.deepEqual(
    testFixture.cursors,
    [null, 50],
  );
});

test("rejects extended and invalid cursor input before persistence", async () => {
  const testFixture = fixture();
  const invalidInputs = [
    {},
    {
      afterTenantId: null,
      tenantId: 7,
    },
    {
      afterTenantId: 0,
    },
    {
      afterTenantId: "50",
    },
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
    testFixture.cursors,
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
      {
        afterTenantId: null,
      },
    ),
    /session is invalid/,
  );
  assert.deepEqual(
    testFixture.cursors,
    [],
  );
});
