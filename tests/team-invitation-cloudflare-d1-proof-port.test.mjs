import assert from "node:assert/strict";
import test from "node:test";

import {
  createTeamInvitationCloudflareD1ProofPort,
  TeamInvitationCloudflareD1ProofPortError,
} from "../scripts/team-invitation-cloudflare-d1-proof-port.mjs";

const accountId = "a".repeat(32);
const databaseId =
  "11111111-2222-4333-8444-555555555555";
const apiToken =
  "TEST_ONLY_D1_READ_CREDENTIAL_VALUE";
const invitationKey =
  `team_invitation_v1_${"b".repeat(64)}`;
const endpoint =
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

function responseBody(
  row = {
    invitationCount: 1,
    membershipCount: 0,
    activeMembershipCount: 0,
    acceptanceAuditCount: 0,
  },
  overrides = {},
) {
  return {
    errors: [],
    messages: [],
    result: [
      {
        meta: {
          changed_db: false,
          changes: 0,
          rows_read: 4,
          rows_written: 0,
        },
        results: [row],
        success: true,
      },
    ],
    success: true,
    ...overrides,
  };
}

function jsonResponse(value, overrides = {}) {
  return new Response(
    JSON.stringify(value),
    {
      status: 200,
      headers: {
        "content-type":
          "application/json; charset=utf-8",
      },
      ...overrides,
    },
  );
}

function createPort(fetchImpl) {
  return createTeamInvitationCloudflareD1ProofPort({
    accountId,
    apiToken,
    databaseId,
    fetchImpl,
  });
}

function expectsCode(code) {
  return (error) =>
    error instanceof
      TeamInvitationCloudflareD1ProofPortError &&
    error.code === code &&
    error.message === code;
}

test("reads one bounded tenant-total proof through the fixed Cloudflare D1 endpoint", async () => {
  const calls = [];
  const port = createPort(
    async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(responseBody());
    },
  );
  const controller = new AbortController();
  const proof = await port.readDatabaseProof(
    {
      invitationKey,
      scope: {
        kind: "tenant-total",
      },
    },
    controller.signal,
  );

  assert.deepEqual(proof, {
    invitationCount: 1,
    membershipCount: 0,
    activeMembershipCount: 0,
    acceptanceAuditCount: 0,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, endpoint);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(
    calls[0].init.headers.Authorization,
    `Bearer ${apiToken}`,
  );
  assert.equal(
    calls[0].init.headers["Content-Type"],
    "application/json",
  );
  assert.equal(
    calls[0].init.cache,
    "no-store",
  );
  assert.equal(
    calls[0].init.redirect,
    "error",
  );
  assert.equal(
    calls[0].init.signal,
    controller.signal,
  );

  const request = JSON.parse(
    calls[0].init.body,
  );

  assert.deepEqual(request.params, [
    invitationKey,
  ]);
  assert.match(
    request.sql,
    /^\s*WITH target_invitation AS/,
  );
  assert.doesNotMatch(
    request.sql,
    /\b(?:INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE)\b/i,
  );
  assert.doesNotMatch(
    JSON.stringify(proof),
    /invitationKey|tenantId|externalUserId|credential/i,
  );
});

test("binds an external-user scope as a second query parameter without changing SQL", async () => {
  let request;
  const port = createPort(
    async (_url, init) => {
      request = JSON.parse(init.body);
      return jsonResponse(
        responseBody({
          invitationCount: 1,
          membershipCount: 1,
          activeMembershipCount: 1,
          acceptanceAuditCount: 1,
        }),
      );
    },
  );

  const proof = await port.readDatabaseProof(
    {
      invitationKey,
      scope: {
        kind: "external-user",
        externalUserId:
          "staging-external-user-scope",
      },
    },
    new AbortController().signal,
  );

  assert.deepEqual(request.params, [
    invitationKey,
    "staging-external-user-scope",
  ]);
  assert.deepEqual(proof, {
    invitationCount: 1,
    membershipCount: 1,
    activeMembershipCount: 1,
    acceptanceAuditCount: 1,
  });
});

test("rejects invalid configuration before retaining or calling a transport", () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
  };
  const valid = {
    accountId,
    apiToken,
    databaseId,
    fetchImpl,
  };

  for (const configuration of [
    null,
    {
      ...valid,
      accountId: "invalid",
    },
    {
      ...valid,
      databaseId: "invalid",
    },
    {
      ...valid,
      apiToken: "short",
    },
    {
      ...valid,
      apiToken:
        `${apiToken}\nsecond-line`,
    },
    {
      ...valid,
      extra: true,
    },
  ]) {
    assert.throws(
      () =>
        createTeamInvitationCloudflareD1ProofPort(
          configuration,
        ),
      expectsCode("INVALID_CONFIGURATION"),
    );
  }

  assert.equal(calls, 0);
});

test("rejects invalid or aborted proof input before network access", async () => {
  let calls = 0;
  const port = createPort(async () => {
    calls += 1;
  });

  await assert.rejects(
    port.readDatabaseProof(
      {
        invitationKey: "invalid",
        scope: {
          kind: "tenant-total",
        },
      },
      new AbortController().signal,
    ),
    expectsCode("INVALID_INPUT"),
  );

  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    port.readDatabaseProof(
      {
        invitationKey,
        scope: {
          kind: "tenant-total",
        },
      },
      controller.signal,
    ),
    expectsCode("ABORTED"),
  );
  assert.equal(calls, 0);
});

test("maps transport failure and forwards cancellation without leaking provider details", async () => {
  const controller = new AbortController();
  const port = createPort(
    async (_url, init) => {
      assert.equal(
        init.signal,
        controller.signal,
      );
      throw new Error(
        "provider response contains private details",
      );
    },
  );

  await assert.rejects(
    port.readDatabaseProof(
      {
        invitationKey,
        scope: {
          kind: "tenant-total",
        },
      },
      controller.signal,
    ),
    expectsCode("NETWORK_UNAVAILABLE"),
  );
});

test("rejects HTTP, content-type, mutation metadata, API errors, and malformed proof rows", async () => {
  const invalidResponses = [
    new Response("unavailable", {
      status: 503,
      headers: {
        "content-type": "text/plain",
      },
    }),
    new Response("{}", {
      status: 200,
      headers: {
        "content-type": "text/plain",
      },
    }),
    jsonResponse(
      responseBody(undefined, {
        errors: [
          {
            code: 1_000,
            message: "not exposed",
          },
        ],
        success: false,
      }),
    ),
    jsonResponse({
      ...responseBody(),
      result: [
        {
          meta: {
            changed_db: true,
            changes: 1,
            rows_written: 1,
          },
          results: [
            {
              invitationCount: 1,
              membershipCount: 0,
              activeMembershipCount: 0,
              acceptanceAuditCount: 0,
            },
          ],
          success: true,
        },
      ],
    }),
    jsonResponse(
      responseBody({
        invitationCount: 1,
        membershipCount: 0,
        activeMembershipCount: 2,
        acceptanceAuditCount: 0,
      }),
    ),
    jsonResponse({
      ...responseBody(),
      unexpected: true,
    }),
  ];

  for (const response of invalidResponses) {
    const port = createPort(
      async () => response,
    );

    await assert.rejects(
      port.readDatabaseProof(
        {
          invitationKey,
          scope: {
            kind: "tenant-total",
          },
        },
        new AbortController().signal,
      ),
      expectsCode("RESPONSE_INVALID"),
    );
  }
});

test("rejects oversized and invalid JSON responses", async () => {
  const responses = [
    new Response("x".repeat(16_385), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }),
    new Response("{", {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }),
  ];

  for (const response of responses) {
    await assert.rejects(
      createPort(
        async () => response,
      ).readDatabaseProof(
        {
          invitationKey,
          scope: {
            kind: "tenant-total",
          },
        },
        new AbortController().signal,
      ),
      expectsCode("RESPONSE_INVALID"),
    );
  }
});
