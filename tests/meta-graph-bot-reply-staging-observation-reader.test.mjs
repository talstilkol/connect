import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import {
  createMetaCredentialVault,
} from "../server/meta/metaCredentialVault.ts";
import {
  createMetaGraphBotReplyStagingObservationReader,
  MetaGraphBotReplyStagingObservationError,
} from "../server/meta/metaGraphBotReplyStagingObservationReader.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";

const appId = "101010101";
const appSecret = "fixture-meta-app-secret";
const graphApiVersion = "v24.0";
const accessTokenValue = "fixture-system-user-access-token";
const encryptionKey =
  "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const runKey = `bot_reply_staging_run_v1_${"a".repeat(64)}`;
const operationKey = `bot_reply_staging_step_v1_${"b".repeat(64)}`;

const deterministicCrypto = Object.freeze({
  subtle: webcrypto.subtle,
  getRandomValues(array) {
    array.fill(7);
    return array;
  },
});

function context(overrides = {}) {
  return {
    run: {
      runKey,
      targetTenantId: 7,
      expectedConnectionVersion: 3,
      expectedPolicyVersion: 4,
      releaseId: `connect_release_v1_${"c".repeat(64)}`,
      commitSha: "d".repeat(40),
      artifactDigest: `sha256:${"e".repeat(64)}`,
      graphApiVersion,
      requestedAt: "2026-08-24T10:00:00.000Z",
      recipientFingerprint: `sha256:${"f".repeat(64)}`,
      rateLimitMethodFingerprint: `sha256:${"1".repeat(64)}`,
      actorExternalUserId: "system-admin-primary",
      ...overrides.run,
    },
    claim: {
      runKey,
      auditKey: `bot_reply_staging_audit_v1_${"2".repeat(64)}`,
      claimVersion: 2,
      leaseExpiresAt: "2026-08-24T10:10:00.000Z",
      ...overrides.claim,
    },
    operationKey,
    deliveryKey: `bot_reply_delivery_v1_${"3".repeat(64)}`,
    ...overrides.step,
  };
}

function connection(overrides = {}) {
  return {
    tenantId: 7,
    businessPortfolioId: "202020202",
    wabaId: "303030303",
    phoneNumberId: "404040404",
    status: "connected",
    webhookSubscribedAt: "2026-08-24T09:00:00.000Z",
    connectedAt: "2026-08-24T09:00:00.000Z",
    version: 3,
    createdAt: "2026-08-24T09:00:00.000Z",
    updatedAt: "2026-08-24T09:00:00.000Z",
    ...overrides,
  };
}

function credentialRepository() {
  let envelope = null;
  return {
    async store(input) {
      envelope = {
        ...structuredClone(input),
        createdAt: "2026-08-24T09:00:00.000Z",
        updatedAt: "2026-08-24T09:00:00.000Z",
      };
    },
    async findByTenantId(tenantId) {
      return envelope?.tenantId === tenantId
        ? structuredClone(envelope)
        : null;
    },
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function fixture({
  connectionRecord = connection(),
  graphResponse,
  now = "2026-08-24T10:05:00.000Z",
} = {}) {
  const credentials = credentialRepository();
  const environment = {
    META_APP_ID: appId,
    META_APP_SECRET: appSecret,
    META_GRAPH_API_VERSION: graphApiVersion,
    META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
  };
  const vault = createMetaCredentialVault(
    credentials,
    environment,
    { crypto: deterministicCrypto },
  );
  await vault.storeAccessToken(
    7,
    toSensitiveMetaAccessToken(accessTokenValue),
  );
  const calls = [];
  const fetchImplementation = async (input, init) => {
    const url = new URL(input);
    calls.push({
      authorization: init.headers.authorization,
      fields: url.searchParams.get("fields"),
      inputToken: url.searchParams.get("input_token"),
      method: init.method,
      pathname: url.pathname,
    });
    if (graphResponse) {
      return graphResponse(url, init);
    }
    if (url.pathname.endsWith("/debug_token")) {
      return jsonResponse({ data: { app_id: appId, is_valid: true } });
    }
    if (url.pathname.endsWith(`/${connectionRecord.wabaId}`)) {
      return jsonResponse({
        id: connectionRecord.wabaId,
        owner_business_info: {
          id: connectionRecord.businessPortfolioId,
        },
      });
    }
    if (url.pathname.endsWith(`/${connectionRecord.wabaId}/phone_numbers`)) {
      return jsonResponse({ data: [{ id: connectionRecord.phoneNumberId }] });
    }
    if (url.pathname.endsWith(`/${connectionRecord.phoneNumberId}`)) {
      return jsonResponse({
        id: connectionRecord.phoneNumberId,
        throughput: { level: "STANDARD" },
        is_on_biz_app: false,
        platform_type: "CLOUD_API",
      });
    }
    return jsonResponse({ error: { code: 100 } }, 400);
  };
  const reader = createMetaGraphBotReplyStagingObservationReader({
    environment,
    connections: {
      async findConnectionByTenantId() {
        return connectionRecord === null
          ? null
          : structuredClone(connectionRecord);
      },
    },
    credentials,
    clock: { now: () => new Date(now) },
    transportOptions: { fetchImplementation },
    credentialVaultOptions: { crypto: deterministicCrypto },
  });
  return { calls, reader };
}

test("binds live Graph app, portfolio, WABA, and phone assets to the staging run", async () => {
  const { calls, reader } = await fixture();
  const fact = await reader.readAssets(context());

  assert.equal(reader.isConfigured(), true);
  assert.deepEqual(fact, {
    schemaVersion: 1,
    runKey,
    operationKey,
    targetTenantId: 7,
    connectionVersion: 3,
    policyVersion: 4,
    releaseId: `connect_release_v1_${"c".repeat(64)}`,
    commitSha: "d".repeat(40),
    artifactDigest: `sha256:${"e".repeat(64)}`,
    graphApiVersion,
    observedAt: "2026-08-24T10:05:00.000Z",
    source: "meta-graph-api",
    appId,
    businessPortfolioId: "202020202",
    wabaId: "303030303",
    phoneNumberId: "404040404",
    recordDigest: fact.recordDigest,
  });
  assert.match(fact.recordDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(fact), true);
  assert.deepEqual(calls.map((call) => call.pathname), [
    "/v24.0/debug_token",
    "/v24.0/303030303",
    "/v24.0/303030303/phone_numbers",
  ]);
  assert.equal(calls[0].inputToken, accessTokenValue);
  assert.equal(calls[0].authorization, `Bearer ${appId}|${appSecret}`);
  assert.equal(calls[1].authorization, `Bearer ${accessTokenValue}`);
  assert.doesNotMatch(
    JSON.stringify(fact),
    new RegExp(`${accessTokenValue}|${appSecret}`),
  );
});

test("maps only documented live phone throughput states", async (contextTest) => {
  const cases = [
    { level: "STANDARD", isOnBizApp: false, expected: 80 },
    { level: "HIGH", isOnBizApp: false, expected: 1_000 },
    { level: "STANDARD", isOnBizApp: true, expected: 20 },
  ];
  for (const throughputCase of cases) {
    await contextTest.test(
      `${throughputCase.level}/${throughputCase.isOnBizApp}`,
      async () => {
        const { calls, reader } = await fixture({
          graphResponse() {
            return jsonResponse({
              id: "404040404",
              throughput: { level: throughputCase.level },
              is_on_biz_app: throughputCase.isOnBizApp,
              platform_type: "CLOUD_API",
            });
          },
        });
        const fact = await reader.readThroughput(context());
        assert.equal(fact.messagesPerSecond, throughputCase.expected);
        assert.match(fact.recordDigest, /^sha256:[a-f0-9]{64}$/);
        assert.deepEqual(calls, [{
          authorization: `Bearer ${accessTokenValue}`,
          fields: "id,throughput,is_on_biz_app,platform_type",
          inputToken: null,
          method: "GET",
          pathname: "/v24.0/404040404",
        }]);
      },
    );
  }
});

test("rejects unknown, contradictory, and non-Cloud throughput responses", async (contextTest) => {
  const invalidResponses = [
    { id: "404040404", throughput: { level: "NOT_APPLICABLE" }, is_on_biz_app: false, platform_type: "CLOUD_API" },
    { id: "404040404", throughput: { level: "HIGH" }, is_on_biz_app: true, platform_type: "CLOUD_API" },
    { id: "404040404", throughput: { level: "STANDARD" }, platform_type: "CLOUD_API" },
    { id: "404040404", throughput: { level: "STANDARD" }, is_on_biz_app: false, platform_type: "ON_PREMISE" },
    { id: "505050505", throughput: { level: "STANDARD" }, is_on_biz_app: false, platform_type: "CLOUD_API" },
  ];
  for (const [index, response] of invalidResponses.entries()) {
    await contextTest.test(`invalid-${index + 1}`, async () => {
      const { reader } = await fixture({
        graphResponse() {
          return jsonResponse(response);
        },
      });
      await assert.rejects(
        reader.readThroughput(context()),
        (error) =>
          error instanceof MetaGraphBotReplyStagingObservationError &&
          error.code === "BOT_REPLY_STAGING_GRAPH_THROUGHPUT_INVALID",
      );
    });
  }
});

test("rejects a token for another app and redacts provider secrets from errors", async () => {
  const { reader } = await fixture({
    graphResponse(url) {
      if (url.pathname.endsWith("/debug_token")) {
        return jsonResponse({
          data: { app_id: "909090909", is_valid: true },
        });
      }
      throw new Error(`${accessTokenValue}:${appSecret}`);
    },
  });
  let observedError;
  try {
    await reader.readAssets(context());
  } catch (error) {
    observedError = error;
  }
  assert.equal(
    observedError instanceof MetaGraphBotReplyStagingObservationError,
    true,
  );
  assert.equal(observedError.code, "BOT_REPLY_STAGING_GRAPH_APP_INVALID");
  assert.doesNotMatch(
    `${observedError.name}:${observedError.message}:${observedError.stack}`,
    new RegExp(`${accessTokenValue}|${appSecret}`),
  );
});

test("sanitizes a Graph asset mismatch without returning provider identifiers", async () => {
  const { reader } = await fixture({
    graphResponse(url) {
      if (url.pathname.endsWith("/debug_token")) {
        return jsonResponse({ data: { app_id: appId, is_valid: true } });
      }
      return jsonResponse({
        id: "303030303",
        owner_business_info: { id: "909090909" },
      });
    },
  });
  let observedError;
  try {
    await reader.readAssets(context());
  } catch (error) {
    observedError = error;
  }
  assert.equal(
    observedError instanceof MetaGraphBotReplyStagingObservationError,
    true,
  );
  assert.equal(
    observedError.code,
    "BOT_REPLY_STAGING_GRAPH_ASSET_INVALID",
  );
  assert.doesNotMatch(
    `${observedError.name}:${observedError.message}:${observedError.stack}`,
    /303030303|909090909|202020202|404040404/,
  );
});

test("fails closed before Graph access for stale connection or mismatched Graph version", async (contextTest) => {
  await contextTest.test("stale connection", async () => {
    const { calls, reader } = await fixture({
      connectionRecord: connection({ version: 2 }),
    });
    await assert.rejects(
      reader.readAssets(context()),
      (error) =>
        error instanceof MetaGraphBotReplyStagingObservationError &&
        error.code === "BOT_REPLY_STAGING_GRAPH_CONNECTION_UNAVAILABLE",
    );
    assert.deepEqual(calls, []);
  });

  await contextTest.test("mismatched Graph version", async () => {
    const { calls, reader } = await fixture();
    await assert.rejects(
      reader.readAssets(context({ run: { graphApiVersion: "v25.0" } })),
      (error) =>
        error instanceof MetaGraphBotReplyStagingObservationError &&
        error.code === "BOT_REPLY_STAGING_GRAPH_CONTEXT_INVALID",
    );
    assert.deepEqual(calls, []);
  });
});

test("rejects observations outside the leased staging window", async () => {
  const { calls, reader } = await fixture({
    now: "2026-08-24T10:11:00.000Z",
  });
  await assert.rejects(
    reader.readThroughput(context()),
    (error) =>
      error instanceof MetaGraphBotReplyStagingObservationError &&
      error.code === "BOT_REPLY_STAGING_GRAPH_CONTEXT_INVALID",
  );
  assert.equal(calls.length, 1);
});
