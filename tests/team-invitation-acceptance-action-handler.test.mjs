import assert from "node:assert/strict";
import test from "node:test";

import {
  createTeamInvitationAcceptanceActionHandler,
} from "../server/team/teamInvitationAcceptanceActionHandler.ts";
import {
  TeamInvitationAcceptanceServiceError,
} from "../server/team/teamInvitationAcceptanceService.ts";

const invitationKey =
  `team_invitation_v1_${"a".repeat(64)}`;

function fixture(options = {}) {
  const calls = [];
  const handler =
    createTeamInvitationAcceptanceActionHandler(
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
            async accept(
              acceptedInvitationKey,
            ) {
              calls.push({
                invitationKey:
                  acceptedInvitationKey,
              });

              if (
                options.serviceError
              ) {
                throw options
                  .serviceError;
              }

              return {
                status:
                  options.status ??
                  "accepted",
              };
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

test("stops before parsing identity when Clerk is unavailable", async () => {
  const testFixture =
    fixture({
      applicationConfigured:
        false,
    });

  assert.deepEqual(
    await testFixture.handler
      .accept({
        invitationKey,
      }),
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

test("rejects extended and malformed browser input before context creation", async () => {
  const inputs = [
    null,
    {},
    {
      invitationKey:
        "invalid",
    },
    {
      invitationKey,
      proof: "caller-proof",
    },
  ];

  for (const input of inputs) {
    const testFixture =
      fixture();

    assert.deepEqual(
      await testFixture.handler
        .accept(input),
      {
        status:
          "invalid-input",
      },
    );
    assert.deepEqual(
      testFixture.calls,
      [],
    );
  }
});

test("returns bounded acceptance outcomes without invitation identity", async () => {
  for (
    const status of [
      "accepted",
      "already-accepted",
    ]
  ) {
    const testFixture =
      fixture({ status });
    const result =
      await testFixture.handler
        .accept({
          invitationKey,
        });

    assert.deepEqual(
      result,
      { status },
    );
    assert.doesNotMatch(
      JSON.stringify(result),
      /invitationKey|email|externalUserId|proof/,
    );
    assert.deepEqual(
      testFixture.calls,
      [
        "context",
        { invitationKey },
      ],
    );
  }
});

test("maps service and infrastructure failures without invitation enumeration", async () => {
  const scenarios = [
    [
      "INVALID_INPUT",
      "invalid-input",
    ],
    [
      "AUTHENTICATION_REQUIRED",
      "sign-in-required",
    ],
    [
      "IDENTITY_REJECTED",
      "identity-verification-required",
    ],
    [
      "IDENTITY_UNAVAILABLE",
      "temporarily-unavailable",
    ],
    [
      "INVITATION_NOT_FOUND",
      "invitation-unavailable",
    ],
    [
      "EMAIL_MISMATCH",
      "invitation-unavailable",
    ],
    [
      "INVITATION_INELIGIBLE",
      "invitation-unavailable",
    ],
    [
      "CONFLICT",
      "invitation-unavailable",
    ],
    [
      "PERSISTENCE_UNAVAILABLE",
      "temporarily-unavailable",
    ],
  ];

  for (
    const [
      code,
      expectedStatus,
    ] of scenarios
  ) {
    const result =
      await fixture({
        serviceError:
          new TeamInvitationAcceptanceServiceError(
            code,
          ),
      }).handler.accept({
        invitationKey,
      });

    assert.deepEqual(
      result,
      {
        status:
          expectedStatus,
      },
    );
  }

  assert.deepEqual(
    await fixture({
      contextError:
        new Error("private"),
    }).handler.accept({
      invitationKey,
    }),
    { status: "server-error" },
  );
});

test("fails closed for malformed acceptance service output", async () => {
  const testFixture =
    fixture({
      status: "unexpected",
    });

  assert.deepEqual(
    await testFixture.handler
      .accept({
        invitationKey,
      }),
    { status: "server-error" },
  );
});
