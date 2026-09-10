import assert from "node:assert/strict";
import test from "node:test";

import { createRailwayBusinessProfileHandler } from
  "../server/onboarding/railwayBusinessProfileHandler.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from
  "../server/platform/railwayApiMutationExecutor.ts";

const profile = Object.freeze({
  businessName: "Connect",
  timezone: "Asia/Jerusalem",
  interfaceLanguage: "he",
  version: 1,
});
const draft = Object.freeze({
  businessName: profile.businessName,
  timezone: profile.timezone,
  interfaceLanguage: profile.interfaceLanguage,
});

function fixture(options = {}) {
  const calls = { identities: 0, requests: [] };
  const handler = createRailwayBusinessProfileHandler({
    applicationConfigured: options.applicationConfiguredHook ??
      (() => options.applicationConfigured ?? true),
    inspectConfiguration: options.inspectConfigurationHook ?? (() =>
      Object.hasOwn(options, "configuration")
        ? options.configuration
        : {
            status: "configured",
            missingKeys: [],
            invalidKeys: [],
            configuration: {
              apiOrigin: "https://railway.example.com",
              deploymentEnvironment: "production",
            },
          }),
    async resolveIdentity() {
      calls.identities += 1;
      return Object.hasOwn(options, "identity")
        ? options.identity
        : {
            status: "authenticated",
            oidcToken: "oidc.token.value",
            userSessionToken: "session.token.value",
          };
    },
    createClient() {
      return {
        async call(request) {
          calls.requests.push(request);
          if (options.response) return options.response(request);
          return request.requestKind === "query"
            ? {
                contractVersion: "connect.railway-api.v1",
                outcome: "ok",
                data: { profile },
              }
            : {
                contractVersion: "connect.railway-api.v1",
                outcome: "ok",
                data: {
                  replayed: false,
                  createdTenant: true,
                  profile,
                },
              };
        },
      };
    },
  });
  return { calls, handler };
}

test("loads a bounded Railway business profile or an empty onboarding state", async () => {
  assert.deepEqual(await fixture().handler.load(), {
    status: "loaded",
    profile,
  });
  const empty = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: { profile: null },
      };
    },
  });
  assert.deepEqual(await empty.handler.load(), {
    status: "loaded",
    profile: null,
  });
});

test("normalizes and saves through one deterministic Railway mutation", async () => {
  const testFixture = fixture();
  const input = {
    businessName: "  Connect  ",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  };
  assert.deepEqual(await testFixture.handler.save(input), {
    status: "saved",
    createdTenant: true,
    profile,
  });
  assert.equal(testFixture.calls.requests.length, 1);
  assert.deepEqual(testFixture.calls.requests[0].payload, {
    businessName: "Connect",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  });
  assert.equal(
    testFixture.calls.requests[0].idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      "onboarding.business-profile.save",
      testFixture.calls.requests[0].payload,
    ),
  );
});

test("rejects malformed and extended input before Railway", async () => {
  const testFixture = fixture();
  for (const input of [
    { ...profile, version: undefined },
    {
      businessName: "Connect",
      timezone: "Unsupported/Timezone",
      interfaceLanguage: "he",
    },
    {
      businessName: "Connect",
      timezone: "Asia/Jerusalem",
      interfaceLanguage: "he",
      tenantId: 7,
    },
  ]) {
    const result = await testFixture.handler.save(input);
    assert.equal(result.status, "validation-error");
  }
  assert.equal(testFixture.calls.requests.length, 0);
});

test("maps bounded API failures and fails closed on malformed success", async () => {
  for (const [code, status] of [
    ["USER_AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
    ["RATE_LIMITED", "server-error"],
  ]) {
    const testFixture = fixture({
      response() {
        return {
          contractVersion: "connect.railway-api.v1",
          outcome: "error",
          code,
        };
      },
    });
    assert.deepEqual(
      await testFixture.handler.save(draft),
      { status },
    );
  }

  const malformed = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: { replayed: false, createdTenant: true, profile: {
          ...profile,
          tenantId: 7,
        } },
      };
    },
  });
  assert.deepEqual(
    await malformed.handler.save(draft),
    { status: "server-error" },
  );
});

test("does not present a membership failure as a new onboarding account", async () => {
  const blocked = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "error",
        code: "TENANT_MEMBERSHIP_REQUIRED",
      };
    },
  });

  assert.deepEqual(await blocked.handler.load(), {
    status: "permission-denied",
  });
});

test("does not resolve identity when application configuration is disabled", async () => {
  const disabled = fixture({ applicationConfigured: false });
  assert.deepEqual(await disabled.handler.load(), {
    status: "configuration-required",
  });
  assert.equal(disabled.calls.identities, 0);
});

test("fails closed when configuration dependencies throw", async () => {
  const applicationFailure = fixture({
    applicationConfiguredHook() {
      throw new Error("sensitive-application-configuration-detail");
    },
  });
  assert.deepEqual(await applicationFailure.handler.load(), {
    status: "server-error",
  });

  const inspectionFailure = fixture({
    applicationConfigured: true,
    inspectConfigurationHook() {
      throw new Error("sensitive-origin-configuration-detail");
    },
  });
  assert.deepEqual(await inspectionFailure.handler.load(), {
    status: "server-error",
  });
});

test("fails closed when configuration or identity state is malformed", async () => {
  const malformedConfiguration = fixture({
    configuration: null,
  });
  assert.deepEqual(await malformedConfiguration.handler.load(), {
    status: "server-error",
  });

  const malformedIdentity = fixture({
    identity: null,
  });
  assert.deepEqual(await malformedIdentity.handler.load(), {
    status: "server-error",
  });
});
