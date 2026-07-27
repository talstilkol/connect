import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaEmbeddedSignupCompletionHandler,
} from "../server/meta/metaEmbeddedSignupCompletion.ts";
import {
  MetaConnectionOrchestrationError,
} from "../server/meta/metaConnectionOrchestrator.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const configuredState = {
  status: "configured",
  configuration: {
    appId: "123456789",
    configurationId: "987654321",
    apiVersion: "v21.0",
  },
  missingKeys: [],
  invalidKeys: [],
};

const tenantSession = {
  externalUserId: "external-user-id",
  tenantId: 7,
  displayName: "tenant-name",
  status: "active",
  role: "owner",
};

function connection() {
  return {
    tenantId: 7,
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
    status: "connected",
    webhookSubscribedAt: "2026-07-25 10:00:00",
    connectedAt: "2026-07-25 10:00:00",
    version: 2,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 10:00:00",
  };
}

test("stops before session access when Embedded Signup is not configured", async (context) => {
  for (const fixture of [
    {
      state: {
        status: "disabled",
        missingKeys: [
          "META_APP_ID",
          "META_EMBEDDED_SIGNUP_CONFIGURATION_ID",
          "META_GRAPH_API_VERSION",
        ],
        invalidKeys: [],
      },
      expectedStatus: "configuration-required",
    },
    {
      state: {
        status: "incomplete",
        missingKeys: ["META_APP_ID"],
        invalidKeys: [],
      },
      expectedStatus: "configuration-invalid",
    },
  ]) {
    await context.test(fixture.expectedStatus, async () => {
      let contextCalls = 0;
      const handler =
        createMetaEmbeddedSignupCompletionHandler({
          readConfiguration: () => fixture.state,
          async createContext() {
            contextCalls += 1;
            throw new Error("must not be called");
          },
        });

      assert.deepEqual(await handler.complete({}), {
        status: fixture.expectedStatus,
      });
      assert.equal(contextCalls, 0);
    });
  }
});

test("returns only the connected status after successful completion", async () => {
  const receivedInputs = [];
  const handler = createMetaEmbeddedSignupCompletionHandler({
    readConfiguration: () => configuredState,
    async createContext() {
      return {
        session: tenantSession,
        orchestrator: {
          async completeEmbeddedSignup(session, input) {
            receivedInputs.push({ session, input });
            return connection();
          },
          async retryWabaSubscription() {
            throw new Error("not used");
          },
        },
      };
    },
  });
  const input = {
    authorizationCode: "authorization-code",
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
  };

  const result = await handler.complete(input);

  assert.deepEqual(receivedInputs, [
    { session: tenantSession, input },
  ]);
  assert.deepEqual(result, {
    status: "connected",
    connection: { status: "connected" },
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /authorization|portfolio|waba|phone|token|secret/i,
  );
});

test("maps tenant session failures to a bounded public status", async (context) => {
  const cases = [
    ["AUTHENTICATION_REQUIRED", "unauthenticated"],
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
  ];

  for (const [errorCode, expectedStatus] of cases) {
    await context.test(expectedStatus, async () => {
      const handler =
        createMetaEmbeddedSignupCompletionHandler({
          readConfiguration: () => configuredState,
          async createContext() {
            throw new TenantSessionError(
              errorCode,
              "private session failure",
            );
          },
        });

      assert.deepEqual(await handler.complete({}), {
        status: expectedStatus,
      });
    });
  }
});

test("maps orchestration failures without returning provider details", async (context) => {
  const cases = [
    ["INVALID_INPUT", "validation-error"],
    ["CODE_EXCHANGE_FAILED", "authorization-failed"],
    ["ASSET_VERIFICATION_FAILED", "verification-failed"],
    ["ASSET_MISMATCH", "verification-failed"],
    ["WABA_SUBSCRIPTION_FAILED", "subscription-failed"],
    ["CREDENTIAL_STORAGE_FAILED", "server-error"],
  ];

  for (const [errorCode, expectedStatus] of cases) {
    await context.test(expectedStatus, async () => {
      const providerDetail =
        "private-provider-error-containing-secret";
      const handler =
        createMetaEmbeddedSignupCompletionHandler({
          readConfiguration: () => configuredState,
          async createContext() {
            return {
              session: tenantSession,
              orchestrator: {
                async completeEmbeddedSignup() {
                  throw new MetaConnectionOrchestrationError(
                    errorCode,
                    providerDetail,
                  );
                },
                async retryWabaSubscription() {
                  throw new Error("not used");
                },
              },
            };
          },
        });

      const result = await handler.complete({});

      assert.deepEqual(result, { status: expectedStatus });
      assert.doesNotMatch(
        JSON.stringify(result),
        /private-provider-error-containing-secret/,
      );
    });
  }
});

test("maps an unexpected completion failure to server-error", async () => {
  const handler = createMetaEmbeddedSignupCompletionHandler({
    readConfiguration: () => configuredState,
    async createContext() {
      throw new Error("unexpected private failure");
    },
  });

  assert.deepEqual(await handler.complete({}), {
    status: "server-error",
  });
});
