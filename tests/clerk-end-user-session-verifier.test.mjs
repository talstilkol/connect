import assert from "node:assert/strict";
import test from "node:test";

import {
  createClerkEndUserSessionVerifier,
} from "../server/platform/clerkEndUserSessionVerifier.ts";
import {
  inspectRailwayApiIdentityConfiguration,
} from "../server/platform/railwayApiIdentityConfiguration.ts";

const sessionToken = "header.payload.signature";

function configuration(overrides = {}) {
  const state = inspectRailwayApiIdentityConfiguration({
    APP_PUBLIC_ORIGIN: "https://connect.example.com",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      "publishable-key-for-contract-test",
    CLERK_SECRET_KEY: "secret-key-for-contract-test",
    VERCEL_OIDC_TEAM_SLUG: "connect-team",
    VERCEL_OIDC_PROJECT_NAME: "connect-web",
    VERCEL_OIDC_ENVIRONMENT: "production",
    NODE_ENV: "production",
    ...overrides,
  });

  assert.equal(state.status, "configured");
  return state.configuration;
}

function signedInState(overrides = {}) {
  return {
    isAuthenticated: true,
    toAuth() {
      return {
        isAuthenticated: true,
        tokenType: "session_token",
        userId: "user_from_verified_session",
        orgId: "org_from_verified_session",
        ...overrides,
      };
    },
  };
}

function fixture(state = signedInState(), configurationOverrides = {}) {
  const calls = {
    clientConfigurations: [],
    requests: [],
  };
  const verifier = createClerkEndUserSessionVerifier(
    {
      ...configuration(),
      ...configurationOverrides,
    },
    {
      create(clientConfiguration) {
        calls.clientConfigurations.push(clientConfiguration);
        return {
          async authenticateRequest(request, options) {
            calls.requests.push({ request, options });
            return state;
          },
        };
      },
    },
  );

  return { calls, verifier };
}

test("accepts only a Clerk session token from the configured party", async () => {
  const testFixture = fixture();

  const identity = await testFixture.verifier.verify(sessionToken);

  assert.deepEqual(testFixture.calls.clientConfigurations, [
    {
      publishableKey: "publishable-key-for-contract-test",
      secretKey: "secret-key-for-contract-test",
    },
  ]);
  assert.equal(testFixture.calls.requests.length, 1);
  assert.equal(
    testFixture.calls.requests[0].request.url,
    "https://connect.example.com/v1/connect",
  );
  assert.equal(
    testFixture.calls.requests[0].request.headers.get(
      "authorization",
    ),
    `Bearer ${sessionToken}`,
  );
  assert.deepEqual(testFixture.calls.requests[0].options, {
    acceptsToken: "session_token",
    authorizedParties: ["https://connect.example.com"],
  });
  assert.deepEqual(identity, {
    externalUserId: "user_from_verified_session",
    externalOrganizationId: "org_from_verified_session",
  });
  assert.equal(Object.isFrozen(identity), true);
});

test("rejects signed-out and malformed Clerk identities", async () => {
  const states = [
    {
      isAuthenticated: false,
      toAuth() {
        throw new Error("toAuth must not run for signed-out state");
      },
    },
    signedInState({ isAuthenticated: false }),
    signedInState({ tokenType: "oauth_token" }),
    signedInState({ userId: null }),
    signedInState({ userId: "" }),
    signedInState({ userId: "u".repeat(256) }),
    signedInState({ orgId: null }),
    signedInState({ orgId: "" }),
    signedInState({ orgId: "o".repeat(256) }),
  ];

  for (const state of states) {
    const testFixture = fixture(state);
    assert.equal(
      await testFixture.verifier.verify(sessionToken),
      null,
    );
  }
});

test("does not hide a Clerk dependency outage", async () => {
  const verifier = createClerkEndUserSessionVerifier(
    configuration(),
    {
      create() {
        return {
          async authenticateRequest() {
            throw new Error("private provider response");
          },
        };
      },
    },
  );

  await assert.rejects(
    verifier.verify(sessionToken),
    /private provider response/,
  );
});

test("rejects non-canonical or untrusted authorized parties", () => {
  const trusted = configuration();
  const clientFactory = {
    create() {
      return {
        async authenticateRequest() {
          return signedInState();
        },
      };
    },
  };
  const origins = [
    "http://connect.example.com",
    "https://connect.example.com/path",
    "https://user:password@connect.example.com",
    "https://connect.example.com?redirect=attacker",
  ];

  for (const appPublicOrigin of origins) {
    assert.throws(
      () =>
        createClerkEndUserSessionVerifier(
          { ...trusted, appPublicOrigin },
          clientFactory,
        ),
      /authorized party is invalid/,
    );
  }
});

test("allows loopback HTTP only for the development identity", async () => {
  const developmentConfiguration = configuration({
    APP_PUBLIC_ORIGIN: "http://localhost:3000",
    VERCEL_OIDC_ENVIRONMENT: "development",
    NODE_ENV: "development",
  });
  const testFixture = fixture(signedInState(), {
    ...developmentConfiguration,
  });

  assert.deepEqual(
    await testFixture.verifier.verify(sessionToken),
    {
      externalUserId: "user_from_verified_session",
      externalOrganizationId: "org_from_verified_session",
    },
  );
  assert.equal(
    testFixture.calls.requests[0].request.url,
    "http://localhost:3000/v1/connect",
  );

  assert.throws(
    () =>
      createClerkEndUserSessionVerifier(
        {
          ...developmentConfiguration,
          expectedServiceIdentity: {
            ...developmentConfiguration.expectedServiceIdentity,
            environment: "production",
          },
        },
        {
          create() {
            return {
              async authenticateRequest() {
                return signedInState();
              },
            };
          },
        },
      ),
    /authorized party is invalid/,
  );
});

test("rejects invalid factories and configuration without leaking values", () => {
  const trusted = configuration();

  assert.throws(
    () =>
      createClerkEndUserSessionVerifier(
        { ...trusted, clerkSecretKey: "" },
        { create() {} },
      ),
    (error) => {
      assert.equal(error.message, "Clerk secret key is invalid");
      assert.doesNotMatch(error.message, /publishable-key|secret-key/);
      return true;
    },
  );
  assert.throws(
    () =>
      createClerkEndUserSessionVerifier(trusted, {
        create() {
          return {};
        },
      }),
    /authentication client is invalid/,
  );
});
