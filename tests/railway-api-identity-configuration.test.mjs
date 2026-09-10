import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRailwayApiIdentityConfiguration,
  railwayApiIdentityEnvironmentKeys,
} from "../server/platform/railwayApiIdentityConfiguration.ts";

function configuredEnvironment(overrides = {}) {
  return {
    APP_PUBLIC_ORIGIN: "https://connect.example.com",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      "publishable-key-for-contract-test",
    CLERK_SECRET_KEY: "secret-key-for-contract-test",
    VERCEL_OIDC_TEAM_SLUG: "connect-team",
    VERCEL_OIDC_PROJECT_NAME: "connect-web",
    VERCEL_OIDC_ENVIRONMENT: "production",
    NODE_ENV: "production",
    ...overrides,
  };
}

test("derives the complete Vercel and Clerk trust configuration", () => {
  const state = inspectRailwayApiIdentityConfiguration(
    configuredEnvironment(),
  );

  assert.equal(state.status, "configured");
  assert.deepEqual(state.missingKeys, []);
  assert.deepEqual(state.invalidKeys, []);
  assert.deepEqual(state.configuration.expectedServiceIdentity, {
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
  });
  assert.equal(
    state.configuration.issuer,
    "https://oidc.vercel.com/connect-team",
  );
  assert.equal(
    state.configuration.audience,
    "https://vercel.com/connect-team",
  );
  assert.equal(
    state.configuration.subject,
    "owner:connect-team:project:connect-web:environment:production",
  );
  assert.equal(
    state.configuration.jwksUrl,
    "https://oidc.vercel.com/connect-team/.well-known/jwks",
  );
  assert.equal(
    state.configuration.appPublicOrigin,
    "https://connect.example.com",
  );
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.configuration), true);
  assert.equal(
    Object.isFrozen(state.configuration.expectedServiceIdentity),
    true,
  );
});

test("distinguishes a disabled boundary from partial configuration", () => {
  const disabled = inspectRailwayApiIdentityConfiguration({});
  const incomplete = inspectRailwayApiIdentityConfiguration({
    APP_PUBLIC_ORIGIN: "https://connect.example.com",
    CLERK_SECRET_KEY: "must-not-appear-in-state",
  });

  assert.equal(disabled.status, "disabled");
  assert.deepEqual(
    disabled.missingKeys,
    railwayApiIdentityEnvironmentKeys,
  );
  assert.equal(incomplete.status, "incomplete");
  assert.deepEqual(incomplete.invalidKeys, []);
  assert.equal(incomplete.configuration, null);
  assert.doesNotMatch(
    JSON.stringify(incomplete),
    /must-not-appear-in-state/,
  );
});

test("reports only invalid key names for unsafe configuration", () => {
  const state = inspectRailwayApiIdentityConfiguration(
    configuredEnvironment({
      APP_PUBLIC_ORIGIN:
        "https://user:password@connect.example.com",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "x".repeat(8_193),
      CLERK_SECRET_KEY: "y".repeat(8_193),
      VERCEL_OIDC_TEAM_SLUG: "team/other",
      VERCEL_OIDC_PROJECT_NAME: "project:other",
      VERCEL_OIDC_ENVIRONMENT: "staging",
    }),
  );

  assert.equal(state.status, "invalid");
  assert.deepEqual(state.missingKeys, []);
  assert.deepEqual(state.invalidKeys, [
    "APP_PUBLIC_ORIGIN",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "VERCEL_OIDC_TEAM_SLUG",
    "VERCEL_OIDC_PROJECT_NAME",
    "VERCEL_OIDC_ENVIRONMENT",
  ]);
  assert.equal(state.configuration, null);
  assert.equal(JSON.stringify(state).includes("password"), false);
  assert.equal(JSON.stringify(state).includes("team/other"), false);
});

test("allows HTTP loopback only in local development", () => {
  const development = inspectRailwayApiIdentityConfiguration(
    configuredEnvironment({
      APP_PUBLIC_ORIGIN: "http://127.0.0.1:3000",
      VERCEL_OIDC_ENVIRONMENT: "development",
      NODE_ENV: "development",
    }),
  );
  const production = inspectRailwayApiIdentityConfiguration(
    configuredEnvironment({
      APP_PUBLIC_ORIGIN: "http://127.0.0.1:3000",
    }),
  );

  assert.equal(development.status, "configured");
  assert.equal(
    development.configuration.appPublicOrigin,
    "http://127.0.0.1:3000",
  );
  assert.equal(production.status, "invalid");
  assert.deepEqual(production.invalidKeys, ["APP_PUBLIC_ORIGIN"]);
});

test("treats whitespace-only values as missing", () => {
  const state = inspectRailwayApiIdentityConfiguration(
    configuredEnvironment({
      CLERK_SECRET_KEY: "  ",
      VERCEL_OIDC_PROJECT_NAME: "\n",
    }),
  );

  assert.equal(state.status, "incomplete");
  assert.deepEqual(state.missingKeys, [
    "CLERK_SECRET_KEY",
    "VERCEL_OIDC_PROJECT_NAME",
  ]);
});
