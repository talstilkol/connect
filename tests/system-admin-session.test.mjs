import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveSystemAdminSession,
  SystemAdminSessionError,
} from "../server/auth/systemAdminSession.ts";

const allowedExternalUserIds = [
  "system-admin-primary",
];

test("creates a system admin session only for an exact allowlisted identity", () => {
  assert.deepEqual(
    resolveSystemAdminSession(
      {
        externalUserId:
          "system-admin-primary",
      },
      allowedExternalUserIds,
    ),
    {
      externalUserId:
        "system-admin-primary",
    },
  );
});

test("rejects an unauthenticated request before authorization", () => {
  assert.throws(
    () =>
      resolveSystemAdminSession(
        null,
        allowedExternalUserIds,
      ),
    (error) =>
      error instanceof
        SystemAdminSessionError &&
      error.code ===
        "AUTHENTICATION_REQUIRED",
  );
});

test("does not grant system authority to a non-allowlisted tenant user", () => {
  const tenantOwnerIdentity = {
    externalUserId: "tenant-owner",
    tenantId: 7,
    role: "owner",
  };

  assert.throws(
    () =>
      resolveSystemAdminSession(
        tenantOwnerIdentity,
        allowedExternalUserIds,
      ),
    (error) =>
      error instanceof
        SystemAdminSessionError &&
      error.code ===
        "SYSTEM_ADMIN_REQUIRED",
  );
});
