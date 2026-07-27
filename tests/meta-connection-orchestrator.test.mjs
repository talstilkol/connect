import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaConnectionOrchestrator,
  MetaConnectionOrchestrationError,
} from "../server/meta/metaConnectionOrchestrator.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";

const accessToken = toSensitiveMetaAccessToken(
  "orchestrator-fixture-access-token",
);

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function connection(status = "pending") {
  return {
    tenantId: 7,
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
    status,
    webhookSubscribedAt:
      status === "connected" ? "2026-07-25 10:00:00" : null,
    connectedAt:
      status === "connected" ? "2026-07-25 10:00:00" : null,
    version: status === "connected" ? 2 : 1,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 10:00:00",
  };
}

const signupInput = {
  authorizationCode: "authorization-code",
  businessPortfolioId: "business-portfolio-id",
  wabaId: "waba-id",
  phoneNumberId: "phone-number-id",
};

function createFixture(options = {}) {
  const calls = [];
  const pendingConnection = connection("pending");
  const connectedConnection = connection("connected");
  const dependencies = {
    authorizationCodeExchanger: {
      async exchangeAuthorizationCode(authorizationCode) {
        calls.push({ operation: "exchange", authorizationCode });
        return accessToken;
      },
    },
    assetVerifier: {
      async verifyAssets(input) {
        calls.push({ operation: "verify", input });
        return {
          businessPortfolioId: input.businessPortfolioId,
          wabaId: input.wabaId,
          phoneNumberId: input.phoneNumberId,
        };
      },
    },
    credentialVault: {
      async storeAccessToken(tenantId, token) {
        calls.push({
          operation: "store-token",
          tenantId,
          token,
        });
      },
      async withAccessToken(tenantId, operation) {
        calls.push({ operation: "read-token", tenantId });
        return operation(accessToken);
      },
    },
    wabaSubscriber: {
      async subscribeWaba(wabaId, token) {
        calls.push({ operation: "subscribe", wabaId, token });
      },
    },
    connectionService: {
      async read() {
        calls.push({ operation: "read-connection" });
        return pendingConnection;
      },
      async captureVerifiedAssets(currentSession, snapshot) {
        calls.push({
          operation: "capture-assets",
          session: currentSession,
          snapshot,
        });
        return pendingConnection;
      },
      async confirmWebhookSubscription(currentSession) {
        calls.push({
          operation: "confirm-connection",
          session: currentSession,
        });
        return connectedConnection;
      },
      async recordConnectionProblem() {
        throw new Error("not used");
      },
    },
  };

  Object.assign(dependencies, options);

  return {
    calls,
    orchestrator: createMetaConnectionOrchestrator(
      dependencies,
    ),
  };
}

test("completes Meta signup in a fail-closed order", async () => {
  const testFixture = createFixture();

  const result =
    await testFixture.orchestrator.completeEmbeddedSignup(
      session(),
      signupInput,
    );

  assert.equal(result.status, "connected");
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    [
      "exchange",
      "verify",
      "capture-assets",
      "store-token",
      "subscribe",
      "confirm-connection",
    ],
  );
  assert.deepEqual(testFixture.calls[1].input, {
    accessToken,
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
  });
  assert.deepEqual(testFixture.calls[2].snapshot, {
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
  });
});

test("checks workspace permission before exchanging the authorization code", async () => {
  const testFixture = createFixture();

  await assert.rejects(
    testFixture.orchestrator.completeEmbeddedSignup(
      session("viewer"),
      signupInput,
    ),
    (error) => error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("rejects malformed signup input before any dependency is called", async () => {
  const testFixture = createFixture();

  await assert.rejects(
    testFixture.orchestrator.completeEmbeddedSignup(session(), {
      ...signupInput,
      authorizationCode: " ",
    }),
    (error) =>
      error instanceof MetaConnectionOrchestrationError &&
      error.code === "INVALID_INPUT",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("does not persist assets that differ from the verified Meta result", async () => {
  const calls = [];
  const testFixture = createFixture({
    assetVerifier: {
      async verifyAssets(input) {
        calls.push({ operation: "verify", input });
        return {
          businessPortfolioId: input.businessPortfolioId,
          wabaId: input.wabaId,
          phoneNumberId: "different-phone-number-id",
        };
      },
    },
  });

  await assert.rejects(
    testFixture.orchestrator.completeEmbeddedSignup(
      session(),
      signupInput,
    ),
    (error) =>
      error instanceof MetaConnectionOrchestrationError &&
      error.code === "ASSET_MISMATCH",
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["exchange"],
  );
  assert.equal(calls.length, 1);
});

test("keeps the connection pending when WABA subscription fails", async () => {
  const exposedSecret = "provider-error-containing-secret";
  const testFixture = createFixture({
    wabaSubscriber: {
      async subscribeWaba() {
        throw new Error(exposedSecret);
      },
    },
  });

  await assert.rejects(
    testFixture.orchestrator.completeEmbeddedSignup(
      session(),
      signupInput,
    ),
    (error) => {
      assert.equal(
        error instanceof MetaConnectionOrchestrationError,
        true,
      );
      assert.equal(error.code, "WABA_SUBSCRIPTION_FAILED");
      assert.doesNotMatch(error.message, new RegExp(exposedSecret));
      assert.doesNotMatch(
        JSON.stringify(error),
        /provider-error-containing-secret|orchestrator-fixture-access-token/,
      );
      return true;
    },
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["exchange", "verify", "capture-assets", "store-token"],
  );
});

test("retries WABA subscription with the stored credential", async () => {
  const testFixture = createFixture();

  const result =
    await testFixture.orchestrator.retryWabaSubscription(
      session(),
    );

  assert.equal(result.status, "connected");
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    [
      "read-connection",
      "read-token",
      "subscribe",
      "confirm-connection",
    ],
  );
  assert.equal(testFixture.calls[2].wabaId, "waba-id");
});

test("does not resubscribe an already connected WABA", async () => {
  const calls = [];
  const connectedConnection = connection("connected");
  const testFixture = createFixture({
    connectionService: {
      async read() {
        calls.push({ operation: "read-connection" });
        return connectedConnection;
      },
      async captureVerifiedAssets() {
        throw new Error("not used");
      },
      async confirmWebhookSubscription() {
        throw new Error("not used");
      },
      async recordConnectionProblem() {
        throw new Error("not used");
      },
    },
  });

  const result =
    await testFixture.orchestrator.retryWabaSubscription(
      session(),
    );

  assert.equal(result, connectedConnection);
  assert.deepEqual(calls, [{ operation: "read-connection" }]);
  assert.deepEqual(testFixture.calls, []);
});
