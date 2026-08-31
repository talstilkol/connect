import assert from "node:assert/strict";
import test from "node:test";

import {
  createRailwayApiIdentityAdapters,
} from "../server/platform/railwayApiIdentityAdapters.ts";

const configuredEnvironment = {
  APP_PUBLIC_ORIGIN: "https://connect.example.com",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    "publishable-key-for-contract-test",
  CLERK_SECRET_KEY: "secret-key-for-contract-test",
  VERCEL_OIDC_TEAM_SLUG: "connect-team",
  VERCEL_OIDC_PROJECT_NAME: "connect-web",
  VERCEL_OIDC_ENVIRONMENT: "production",
  NODE_ENV: "production",
};

test("builds both verifiers from one fail-closed configuration", async () => {
  const calls = [];
  const adapters = createRailwayApiIdentityAdapters(
    configuredEnvironment,
    {
      vercelOidc: {
        createRemoteKeySet(url) {
          calls.push(["jwks", url.toString()]);
          return async () => {};
        },
        async verifyJwt(_token, _keySet, options) {
          calls.push(["oidc", options]);
        },
      },
      clerk: {
        create() {
          return {
            async authenticateRequest(_request, options) {
              calls.push(["clerk", options]);
              return {
                isAuthenticated: true,
                toAuth() {
                  return {
                    isAuthenticated: true,
                    tokenType: "session_token",
                    userId: "verified-user",
                    orgId: "org_verified",
                  };
                },
              };
            },
          };
        },
      },
    },
  );

  assert.deepEqual(adapters.expectedServiceIdentity, {
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
  });
  assert.equal(
    (
      await adapters.oidcVerifier.verify(
        "header.payload.signature",
        adapters.expectedServiceIdentity,
      )
    ).provider,
    "vercel",
  );
  assert.deepEqual(
    await adapters.endUserSessionVerifier.verify(
      "header.payload.signature",
    ),
    {
      externalUserId: "verified-user",
      externalOrganizationId: "org_verified",
    },
  );
  assert.deepEqual(calls.map(([name]) => name), [
    "jwks",
    "oidc",
    "clerk",
  ]);
});

test("fails before constructing providers when configuration is absent", () => {
  let dependencyCalls = 0;

  assert.throws(
    () =>
      createRailwayApiIdentityAdapters(
        {},
        {
          vercelOidc: {
            createRemoteKeySet() {
              dependencyCalls += 1;
              return async () => {};
            },
            async verifyJwt() {
              dependencyCalls += 1;
            },
          },
          clerk: {
            create() {
              dependencyCalls += 1;
              return {};
            },
          },
        },
      ),
    /identity configuration is unavailable/,
  );
  assert.equal(dependencyCalls, 0);
});
