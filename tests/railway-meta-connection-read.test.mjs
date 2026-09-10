import assert from "node:assert/strict";
import test from "node:test";
import { createRailwayApiClient } from "../server/platform/railwayApiClient.ts";
import { createRailwayApiHttpHandler } from "../server/platform/railwayApiHttpHandler.ts";
import { createRailwayMetaConnectionReadOperation } from "../server/platform/railwayMetaConnectionReadOperation.ts";
import { createRailwayMetaConnectionReadHandler } from "../server/meta/railwayMetaConnectionReadHandler.ts";
import { TenantSessionError } from "../server/auth/tenantSession.ts";
import { persistedMetaConnectionStatuses } from "../shared/domain/metaConnection.ts";

const oidcToken = "oidc.payload.signature";
const userSessionToken = "user.payload.signature";
const serviceIdentity = { teamSlug: "connect-team", projectName: "connect-web", environment: "production" };
const session = { tenantId: 7, role: "owner", status: "active", externalUserId: "verified-user", displayName: "workspace" };

function fixture(options = {}) {
  const requests = [];
  const readTenants = [];
  const api = createRailwayApiHttpHandler({
    expectedServiceIdentity: serviceIdentity,
    oidcVerifier: { async verify(token) {
      return token === oidcToken ? { provider: "vercel", ...serviceIdentity,
        subject: "owner:connect-team:project:connect-web:environment:production" } : null;
    } },
    endUserSessionVerifier: { async verify(token) {
      return token === userSessionToken
        ? { externalUserId: session.externalUserId, externalOrganizationId: "org_verified" }
        : null;
    } },
    operations: [createRailwayMetaConnectionReadOperation({
      tenantSessions: { async resolve(identity) {
        assert.equal(identity.externalUserId, session.externalUserId);
        if (options.sessionError) throw options.sessionError;
        return { ...session, role: options.role ?? "owner" };
      } },
      dataSync: options.dataSync,
      connections: { async read(resolvedSession) {
        readTenants.push(resolvedSession.tenantId);
        if (options.storageError) throw new Error("private-storage-detail");
        return options.connection === undefined
          ? { tenantId: 7, status: "connected", wabaId: "200002", ciphertext: "must-not-escape" }
          : options.connection;
      } },
    })],
  });
  const handler = createRailwayMetaConnectionReadHandler({
    applicationConfigured: () => options.configured !== false,
    inspectConfiguration: () => ({ status: "configured", configuration: {
      apiOrigin: "https://connect-api.invalid", deploymentEnvironment: "production",
    } }),
    resolveIdentity: async () => options.identity ?? { status: "authenticated", oidcToken, userSessionToken },
    createClient(configuration) {
      return createRailwayApiClient({
        apiOrigin: configuration.apiOrigin,
        deploymentEnvironment: configuration.deploymentEnvironment,
        oidcTokenProvider: { async getToken() { return configuration.oidcToken; } },
        userSessionTokenProvider: { async getToken() { return configuration.userSessionToken; } },
        traceparentProvider: { async getTraceparent() { return null; } },
        telemetry: { record() { return true; }, scheduleFlush() {} },
        async fetchImplementation(url, init) {
          requests.push(JSON.parse(init.body));
          if (options.responseData !== undefined) return Response.json({
            contractVersion: "connect.railway-api.v1", outcome: "ok", data: options.responseData,
          });
          return api.handle(new Request(url, init));
        },
      });
    },
  });
  return { handler, api, requests, readTenants };
}

test("reads every persisted connection state through the authenticated client and HTTP operation", async () => {
  for (const status of [...persistedMetaConnectionStatuses, "disconnected"]) {
    const f = fixture({ connection: status === "disconnected" ? null : { tenantId: 7, status, wabaId: "200002", ciphertext: "must-not-escape" } });
    assert.deepEqual(await f.handler.read(), { status });
    assert.deepEqual(f.readTenants, [7]);
    assert.deepEqual(f.requests, [{ contractVersion: "connect.railway-api.v1",
      operation: "meta.connection.read", requestKind: "query", idempotencyKey: null, payload: {} }]);
  }
});

test("rejects injected response fields and unknown states instead of exposing raw server data", async () => {
  for (const responseData of [
    { connection: { status: "connected", tenantId: 7 } },
    { connection: { status: "connected" }, accessToken: "must-not-escape" },
    { connection: { status: "ready" } }, { connection: { status: "server-error" } },
    { connection: null }, { connection: [] }, {},
  ]) {
    assert.deepEqual(await fixture({ responseData }).handler.read(), { status: "server-error" });
  }
});

test("preserves tenant errors and rejects foreign connections and unavailable storage", async () => {
  for (const [code, status] of [
    ["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"],
    ["PERMISSION_DENIED", "permission-denied"],
  ]) {
    const f = fixture({ sessionError: new TenantSessionError(code, "private-session-detail") });
    assert.deepEqual(await f.handler.read(), { status });
    assert.deepEqual(f.readTenants, []);
  }
  const denied = fixture({ role: "viewer" });
  assert.deepEqual(await denied.handler.read(), { status: "permission-denied" });
  assert.deepEqual(denied.readTenants, []);
  for (const options of [
    { connection: { tenantId: 8, status: "connected" } },
    { connection: { tenantId: 7, status: "unknown" } },
    { connection: { tenantId: 7, status: "disconnected" } },
    { connection: { tenantId: 7 } }, { storageError: true },
  ]) {
    assert.deepEqual(await fixture(options).handler.read(), { status: "server-error" });
  }
});

test("does not read tenant data without configured identity or a valid service and user token", async () => {
  for (const options of [
    { configured: false }, { identity: { status: "unauthenticated" } },
    { identity: { status: "authenticated", oidcToken: "wrong.payload.signature", userSessionToken } },
    { identity: { status: "authenticated", oidcToken, userSessionToken: "wrong.payload.signature" } },
  ]) {
    const f = fixture(options);
    const result = await f.handler.read();
    assert.notEqual(result.status, "connected");
    assert.deepEqual(f.readTenants, []);
    if (options.configured === false || options.identity?.status === "unauthenticated") {
      assert.deepEqual(f.requests, []);
    }
  }
});


test("authenticated connection read carries only validated sync state and fails closed on lifecycle storage failure", async () => {
  const view = { stage: "receiving-history", contacts: "accepted", history: "accepted", providerProgress: 55, receivedChunks: 1, processedChunks: 1, projectedMessages: 4 };
  const calls = [];
  const f = fixture({ dataSync: { async readView(tenantId, connection) {
    calls.push(tenantId); assert.equal(connection.tenantId, tenantId); return view;
  } } });
  assert.deepEqual(await f.handler.read(), { status: "connected", dataSync: view }); assert.deepEqual(calls, [7]);
  for (const dataSync of [
    { async readView() { throw new Error("private database details"); } },
    { async readView() { return { ...view, requestId: "private" }; } },
  ]) assert.deepEqual(await fixture({ dataSync }).handler.read(), { status: "server-error" });
});

test("denied users cannot load lifecycle state and query payload cannot select another tenant", async () => {
  const f = fixture({ role: "viewer", dataSync: { async readView() { assert.fail("Unauthorized sync read"); } } });
  assert.deepEqual(await f.handler.read(), { status: "permission-denied" });
});
