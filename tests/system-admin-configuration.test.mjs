import assert from "node:assert/strict";
import test from "node:test";

import {
  hasSystemAdminConfiguration,
  inspectSystemAdminConfiguration,
} from "../server/auth/systemAdminConfiguration.ts";

test("reports the system admin allowlist as disabled when it is absent", () => {
  assert.deepEqual(
    inspectSystemAdminConfiguration({}),
    {
      status: "disabled",
      externalUserIds: [],
    },
  );
  assert.equal(
    hasSystemAdminConfiguration({}),
    false,
  );
});

test("accepts a non-empty JSON allowlist with exact external identities", () => {
  const environment = {
    CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
      JSON.stringify([
        "system-admin-primary",
        "system-admin-support",
      ]),
  };
  const configuration =
    inspectSystemAdminConfiguration(
      environment,
    );

  assert.equal(
    configuration.status,
    "configured",
  );
  assert.deepEqual(
    configuration.externalUserIds,
    [
      "system-admin-primary",
      "system-admin-support",
    ],
  );
  assert.equal(
    hasSystemAdminConfiguration(
      environment,
    ),
    true,
  );
});

test("rejects malformed, empty, duplicate, and extended allowlists", () => {
  const invalidValues = [
    "not-json",
    "{}",
    "[]",
    '[""]',
    '[" system-admin"]',
    '["system-admin\\n"]',
    '["system-admin","system-admin"]',
    JSON.stringify(
      Array.from(
        { length: 51 },
        (_, index) =>
          `system-admin-${index + 1}`,
      ),
    ),
  ];

  for (const rawValue of invalidValues) {
    assert.deepEqual(
      inspectSystemAdminConfiguration({
        CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
          rawValue,
      }),
      {
        status: "invalid",
        externalUserIds: [],
      },
    );
  }
});

test("does not expose configured identities when configuration is invalid", () => {
  const secretIdentity =
    "private-system-admin-identity";
  const configuration =
    inspectSystemAdminConfiguration({
      CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
        `["${secretIdentity}",]`,
    });

  assert.equal(
    configuration.status,
    "invalid",
  );
  assert.doesNotMatch(
    JSON.stringify(configuration),
    new RegExp(secretIdentity),
  );
});
