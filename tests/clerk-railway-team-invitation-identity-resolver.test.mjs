import assert from "node:assert/strict";
import test from "node:test";

import {
  createClerkRailwayTeamInvitationIdentityResolver,
} from "../server/platform/clerkRailwayTeamInvitationIdentityResolver.ts";

const configuration = Object.freeze({
  appPublicOrigin: "https://connect.example.com",
  clerkPublishableKey: "publishable-key",
  clerkSecretKey: "secret-key",
  expectedServiceIdentity: Object.freeze({
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
  }),
  issuer: "https://oidc.vercel.com/connect-team",
  audience: "https://vercel.com/connect-team",
  subject: "owner:connect-team:project:connect-web:environment:production",
  jwksUrl: "https://oidc.vercel.com/connect-team/.well-known/jwks",
});

function fixture(userOrError) {
  const calls = [];
  const resolver = createClerkRailwayTeamInvitationIdentityResolver(
    configuration,
    {
      create(receivedConfiguration) {
        calls.push(["create", receivedConfiguration]);
        return {
          users: {
            async getUser(userId) {
              calls.push(["get-user", userId]);
              if (userOrError instanceof Error) throw userOrError;
              return userOrError;
            },
          },
        };
      },
    },
  );
  return { calls, resolver };
}

test("resolves only the authenticated Clerk user's verified primary email", async () => {
  const testFixture = fixture({
    id: "invitee-user",
    primaryEmailAddress: {
      emailAddress: "  Invitee@Example.com ",
      verification: { status: "verified" },
    },
  });

  assert.deepEqual(
    await testFixture.resolver.resolve("invitee-user"),
    { status: "verified", verifiedEmail: "invitee@example.com" },
  );
  assert.deepEqual(testFixture.calls, [
    ["create", {
      publishableKey: "publishable-key",
      secretKey: "secret-key",
    }],
    ["get-user", "invitee-user"],
  ]);
});

test("rejects identity mismatch, unverified email, and invalid identifiers", async () => {
  const scenarios = [
    [
      fixture({
        id: "different-user",
        primaryEmailAddress: {
          emailAddress: "invitee@example.com",
          verification: { status: "verified" },
        },
      }),
      "invitee-user",
    ],
    [
      fixture({
        id: "invitee-user",
        primaryEmailAddress: {
          emailAddress: "invitee@example.com",
          verification: { status: "unverified" },
        },
      }),
      "invitee-user",
    ],
    [fixture(null), " invalid "],
  ];

  for (const [testFixture, externalUserId] of scenarios) {
    assert.deepEqual(
      await testFixture.resolver.resolve(externalUserId),
      { status: "rejected" },
    );
  }

  assert.deepEqual(scenarios[2][0].calls, [
    ["create", {
      publishableKey: "publishable-key",
      secretKey: "secret-key",
    }],
  ]);
});

test("maps Clerk lookup failures to unavailable without leaking errors", async () => {
  const testFixture = fixture(new Error("private Clerk failure"));
  assert.deepEqual(
    await testFixture.resolver.resolve("invitee-user"),
    { status: "unavailable" },
  );
});
