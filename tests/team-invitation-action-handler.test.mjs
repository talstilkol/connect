import assert from "node:assert/strict";
import test from "node:test";

import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";
import {
  TenantMutationRateLimitError,
} from "../server/security/tenantMutationRateLimit.ts";
import {
  createTeamInvitationActionHandler,
} from "../server/team/teamInvitationActionHandler.ts";
import {
  TeamInvitationError,
  TeamInvitationInputError,
} from "../server/team/teamInvitationService.ts";

const session = {
  tenantId: 7,
  displayName: "workspace",
  status: "active",
  role: "owner",
  externalUserId: "owner-user",
};

function fixture(options = {}) {
  const calls = [];
  const handler =
    createTeamInvitationActionHandler(
      {
        applicationConfigured: () =>
          options
            .applicationConfigured ??
          true,
        async createContext() {
          calls.push("context");

          if (
            options.contextError
          ) {
            throw options
              .contextError;
          }

          return {
            session,
            service: {
              async invite(
                currentSession,
                input,
              ) {
                calls.push({
                  currentSession,
                  input,
                });

                if (
                  options
                    .serviceError
                ) {
                  throw options
                    .serviceError;
                }

                return {
                  status:
                    options.status ??
                    "submitted",
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

test("stops before identity when Clerk configuration is missing", async () => {
  const testFixture =
    fixture({
      applicationConfigured:
        false,
    });

  assert.deepEqual(
    await testFixture.handler
      .invite({}),
    {
      status:
        "configuration-required",
    },
  );
  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("returns bounded submitted and idempotent outcomes", async () => {
  for (
    const status of [
      "submitted",
      "already-pending",
    ]
  ) {
    const result =
      await fixture({
        status,
      }).handler.invite({
        email:
          "member@example.com",
        role: "agent",
      });

    assert.deepEqual(
      result,
      { status },
    );
    assert.doesNotMatch(
      JSON.stringify(result),
      /email|tenantId|externalUserId|requestKey/,
    );
  }
});

test("maps authentication, rate limit, input, and provider failures", async () => {
  const scenarios = [
    [
      new TenantSessionError(
        "AUTHENTICATION_REQUIRED",
        "private",
      ),
      "unauthenticated",
      "contextError",
    ],
    [
      new TenantSessionError(
        "TENANT_MEMBERSHIP_REQUIRED",
        "private",
      ),
      "onboarding-required",
      "contextError",
    ],
    [
      new TenantSessionError(
        "TENANT_SELECTION_REQUIRED",
        "private",
      ),
      "tenant-selection-required",
      "contextError",
    ],
    [
      new TenantSessionError(
        "PERMISSION_DENIED",
        "private",
      ),
      "permission-denied",
      "contextError",
    ],
    [
      new TenantMutationRateLimitError(
        "RATE_LIMITED",
      ),
      "rate-limited",
      "contextError",
    ],
    [
      new TenantMutationRateLimitError(
        "RATE_LIMIT_UNAVAILABLE",
      ),
      "temporarily-unavailable",
      "contextError",
    ],
    [
      new TeamInvitationInputError(),
      "invalid-input",
      "serviceError",
    ],
    [
      new TeamInvitationError(
        "PROVIDER_UNAVAILABLE",
      ),
      "provider-unavailable",
      "serviceError",
    ],
    [
      new TeamInvitationError(
        "PROVIDER_FAILED",
      ),
      "temporarily-unavailable",
      "serviceError",
    ],
    [
      new Error("private"),
      "server-error",
      "serviceError",
    ],
  ];

  for (
    const [
      error,
      expected,
      errorLocation,
    ] of scenarios
  ) {
    const result =
      await fixture({
        [errorLocation]:
          error,
      }).handler.invite({});

    assert.deepEqual(
      result,
      { status: expected },
    );
  }
});
