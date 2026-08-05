import assert from "node:assert/strict";
import test from "node:test";

import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";
import {
  TenantMutationRateLimitError,
} from "../server/security/tenantMutationRateLimit.ts";
import {
  createTeamMembershipActionHandler,
} from "../server/team/teamMembershipActionHandler.ts";
import {
  TeamMembershipMutationError,
  TeamMembershipMutationInputError,
} from "../server/team/teamMembershipMutationService.ts";

const session = {
  tenantId: 7,
  displayName: "workspace",
  status: "active",
  role: "owner",
  externalUserId: "owner-user",
};
const agent = {
  tenantId: 7,
  externalUserId: "agent-user",
  role: "viewer",
  status: "active",
  version: 2,
};

function fixture(options = {}) {
  const calls = [];
  const handler =
    createTeamMembershipActionHandler(
      {
        applicationConfigured: () =>
          options
            .applicationConfigured ??
          true,
        async createContext() {
          calls.push("context");

          if (options.contextError) {
            throw options.contextError;
          }

          return {
            session,
            service: {
              async changeRole(
                currentSession,
                input,
              ) {
                calls.push({
                  operation:
                    "changeRole",
                  currentSession,
                  input,
                });

                if (
                  options.serviceError
                ) {
                  throw options
                    .serviceError;
                }

                return {
                  outcome:
                    options.outcome ??
                    "updated",
                  membership:
                    Object.hasOwn(
                      options,
                      "membership",
                    )
                      ? options
                          .membership
                      : agent,
                };
              },
              async changeStatus(
                currentSession,
                input,
              ) {
                calls.push({
                  operation:
                    "changeStatus",
                  currentSession,
                  input,
                });
                return {
                  outcome: "updated",
                  membership: {
                    ...agent,
                    status:
                      "suspended",
                  },
                };
              },
              async transferOwner(
                currentSession,
                input,
              ) {
                calls.push({
                  operation:
                    "transferOwner",
                  currentSession,
                  input,
                });
                return {
                  outcome: "updated",
                  formerOwner: {
                    tenantId: 7,
                    externalUserId:
                      "owner-user",
                    role: "manager",
                    status: "active",
                    version: 2,
                  },
                  newOwner: {
                    ...agent,
                    role: "owner",
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

test("stops team mutations before identity when configuration is missing", async () => {
  const testFixture =
    fixture({
      applicationConfigured: false,
    });

  for (
    const operation of [
      () =>
        testFixture.handler
          .changeRole({}),
      () =>
        testFixture.handler
          .changeStatus({}),
      () =>
        testFixture.handler
          .transferOwner({}),
    ]
  ) {
    assert.deepEqual(
      await operation(),
      {
        status:
          "configuration-required",
      },
    );
  }
  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("returns bounded role and status views without storage identities", async () => {
  const testFixture = fixture();
  const roleResult =
    await testFixture.handler
      .changeRole({
        memberKey: "opaque",
      });
  const statusResult =
    await testFixture.handler
      .changeStatus({
        memberKey: "opaque",
      });

  for (
    const result of [
      roleResult,
      statusResult,
    ]
  ) {
    assert.equal(
      result.status,
      "saved",
    );
    assert.match(
      result.membership.memberKey,
      /^team_member_v1_[0-9a-f]{64}$/,
    );
    assert.doesNotMatch(
      JSON.stringify(result),
      /tenantId|externalUserId|actor|eventKey|operationKey/,
    );
  }
});

test("returns two bounded views for an owner transfer", async () => {
  const result =
    await fixture().handler
      .transferOwner({
        newOwnerMemberKey:
          "opaque",
      });
  const serialized =
    JSON.stringify(result);

  assert.equal(
    result.status,
    "saved",
  );
  assert.equal(
    result.formerOwner.role,
    "manager",
  );
  assert.equal(
    result.newOwner.role,
    "owner",
  );
  assert.doesNotMatch(
    serialized,
    /tenantId|externalUserId|actor|eventKey|operationKey/,
  );
});

test("maps authentication, rate limit, validation, state, and persistence failures", async () => {
  const scenarios = [
    [
      new TenantSessionError(
        "AUTHENTICATION_REQUIRED",
        "private",
      ),
      "unauthenticated",
      "context",
    ],
    [
      new TenantSessionError(
        "TENANT_MEMBERSHIP_REQUIRED",
        "private",
      ),
      "onboarding-required",
      "context",
    ],
    [
      new TenantSessionError(
        "TENANT_SELECTION_REQUIRED",
        "private",
      ),
      "tenant-selection-required",
      "context",
    ],
    [
      new TenantSessionError(
        "PERMISSION_DENIED",
        "private",
      ),
      "permission-denied",
      "context",
    ],
    [
      new TenantMutationRateLimitError(
        "RATE_LIMITED",
      ),
      "rate-limited",
      "context",
    ],
    [
      new TenantMutationRateLimitError(
        "RATE_LIMIT_UNAVAILABLE",
      ),
      "temporarily-unavailable",
      "context",
    ],
    [
      new TeamMembershipMutationInputError(),
      "invalid-input",
      "service",
    ],
    [
      new TeamMembershipMutationError(
        "NOT_FOUND",
      ),
      "not-found",
      "service",
    ],
    [
      new TeamMembershipMutationError(
        "CONFLICT",
      ),
      "conflict",
      "service",
    ],
    [
      new TeamMembershipMutationError(
        "INVALID_TRANSITION",
      ),
      "invalid-transition",
      "service",
    ],
    [
      new TeamMembershipMutationError(
        "STALE_SESSION",
      ),
      "stale-session",
      "service",
    ],
    [
      new TeamMembershipMutationError(
        "PERSISTENCE_FAILED",
      ),
      "server-error",
      "service",
    ],
  ];

  for (
    const [
      error,
      expectedStatus,
      source,
    ] of scenarios
  ) {
    const result =
      await fixture({
        contextError:
          source === "context"
            ? error
            : undefined,
        serviceError:
          source === "service"
            ? error
            : undefined,
      }).handler.changeRole({});

    assert.deepEqual(result, {
      status: expectedStatus,
    });
  }
});

test("fails closed for malformed successful service results", async () => {
  for (
    const options of [
      {
        outcome: "conflict",
      },
      {
        membership: null,
      },
      {
        membership: {
          ...agent,
          tenantId: 8,
        },
      },
      {
        membership: {
          ...agent,
          role: "administrator",
        },
      },
      {
        membership: {
          ...agent,
          version: 0,
        },
      },
    ]
  ) {
    assert.deepEqual(
      await fixture(options)
        .handler.changeRole({}),
      {
        status: "server-error",
      },
    );
  }
});
