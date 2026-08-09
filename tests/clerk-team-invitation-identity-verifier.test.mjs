import assert from "node:assert/strict";
import test from "node:test";

import {
  createClerkTeamInvitationIdentityContext,
} from "../server/team/clerkTeamInvitationIdentityVerifier.ts";

function createContext(
  user,
  options = {},
) {
  const calls = [];
  const context =
    createClerkTeamInvitationIdentityContext(
      {
        async readCurrentUser() {
          calls.push("identity");

          if (
            options.identityError
          ) {
            throw options
              .identityError;
          }

          return user;
        },
        async authorize(
          externalUserId,
        ) {
          calls.push({
            externalUserId,
          });

          if (
            options
              .authorizationError
          ) {
            throw options
              .authorizationError;
          }
        },
      },
    );

  return {
    calls,
    context,
  };
}

test("rejects a caller-supplied proof before Clerk access", async () => {
  const fixture =
    createContext(null);

  assert.deepEqual(
    await fixture.context
      .identityVerifier
      .verify({
        kind:
          "current-clerk-session-v1",
      }),
    { status: "rejected" },
  );
  assert.deepEqual(
    fixture.calls,
    [],
  );
});

test("accepts only a verified Clerk primary email", async () => {
  const fixture =
    createContext({
      id: "clerk-user-accepted",
      primaryEmailAddress: {
        emailAddress:
          " Accepted.User@Example.COM ",
        verification: {
          status: "verified",
        },
      },
    });

  assert.deepEqual(
    await fixture.context
      .identityVerifier
      .verify(
        fixture.context.proof,
      ),
    {
      status: "verified",
      externalUserId:
        "clerk-user-accepted",
      verifiedEmail:
        "accepted.user@example.com",
    },
  );
  assert.deepEqual(
    fixture.calls,
    [
      "identity",
      {
        externalUserId:
          "clerk-user-accepted",
      },
    ],
  );
});

test("rejects absent, malformed, and unverified Clerk identities", async () => {
  const users = [
    null,
    {},
    {
      id: "clerk-user-accepted",
      primaryEmailAddress: null,
    },
    {
      id: "clerk-user-accepted",
      primaryEmailAddress: {
        emailAddress:
          "accepted.user@example.com",
        verification: {
          status: "unverified",
        },
      },
    },
  ];

  for (const user of users) {
    const fixture =
      createContext(user);

    assert.deepEqual(
      await fixture.context
        .identityVerifier
        .verify(
          fixture.context.proof,
        ),
      { status: "rejected" },
    );
    assert.deepEqual(
      fixture.calls,
      ["identity"],
    );
  }
});

test("fails closed when Clerk or rate limiting is unavailable", async () => {
  const verifiedUser = {
    id: "clerk-user-accepted",
    primaryEmailAddress: {
      emailAddress:
        "accepted.user@example.com",
      verification: {
        status: "verified",
      },
    },
  };
  const scenarios = [
    createContext(
      verifiedUser,
      {
        identityError:
          new Error("private"),
      },
    ),
    createContext(
      verifiedUser,
      {
        authorizationError:
          new Error("private"),
      },
    ),
  ];

  for (const fixture of scenarios) {
    assert.deepEqual(
      await fixture.context
        .identityVerifier
        .verify(
          fixture.context.proof,
        ),
      { status: "unavailable" },
    );
  }
});
