import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRailwayApiClientConfiguration,
  railwayApiClientEnvironmentKeys,
} from "../server/platform/railwayApiClientConfiguration.ts";

test("accepts one canonical HTTPS Railway origin and Vercel environment", () => {
  assert.deepEqual(
    inspectRailwayApiClientConfiguration({
      RAILWAY_API_ORIGIN:
        "https://connect-api.up.railway.app",
      VERCEL_OIDC_ENVIRONMENT: "production",
    }),
    {
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      configuration: {
        apiOrigin:
          "https://connect-api.up.railway.app",
        deploymentEnvironment: "production",
      },
    },
  );
});

test("distinguishes disabled and incomplete client configuration", () => {
  assert.deepEqual(
    inspectRailwayApiClientConfiguration({}),
    {
      status: "disabled",
      missingKeys: railwayApiClientEnvironmentKeys,
      invalidKeys: [],
      configuration: null,
    },
  );
  assert.deepEqual(
    inspectRailwayApiClientConfiguration({
      RAILWAY_API_ORIGIN:
        "https://connect-api.up.railway.app",
    }),
    {
      status: "incomplete",
      missingKeys: ["VERCEL_OIDC_ENVIRONMENT"],
      invalidKeys: [],
      configuration: null,
    },
  );
});

test("allows loopback HTTP only for development and rejects hostile origins", () => {
  assert.equal(
    inspectRailwayApiClientConfiguration({
      RAILWAY_API_ORIGIN: "http://127.0.0.1:3001",
      VERCEL_OIDC_ENVIRONMENT: "development",
    }).status,
    "configured",
  );

  const invalidOrigins = [
    "http://127.0.0.1:3001",
    "http://connect-api.up.railway.app",
    "https://user:password@connect.invalid",
    "https://connect.invalid/private",
    "https://connect.invalid?target=internal",
    "https://connect.invalid/#fragment",
    " https://connect.invalid",
  ];

  for (const origin of invalidOrigins) {
    const state = inspectRailwayApiClientConfiguration({
      RAILWAY_API_ORIGIN: origin,
      VERCEL_OIDC_ENVIRONMENT: "production",
    });

    assert.equal(state.status, "invalid");
    assert.deepEqual(state.invalidKeys, ["RAILWAY_API_ORIGIN"]);
    assert.doesNotMatch(
      JSON.stringify(state),
      /user:password|target=internal/,
    );
  }
});

test("rejects an unsupported deployment environment without normalizing it", () => {
  assert.deepEqual(
    inspectRailwayApiClientConfiguration({
      RAILWAY_API_ORIGIN:
        "https://connect-api.up.railway.app",
      VERCEL_OIDC_ENVIRONMENT: "staging",
    }),
    {
      status: "invalid",
      missingKeys: [],
      invalidKeys: [
        "VERCEL_OIDC_ENVIRONMENT",
      ],
      configuration: null,
    },
  );
});
