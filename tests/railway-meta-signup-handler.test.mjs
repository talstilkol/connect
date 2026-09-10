import assert from "node:assert/strict";
import test from "node:test";
import { createRailwayApiClient } from "../server/platform/railwayApiClient.ts";
import { createRailwayApiHttpHandler } from "../server/platform/railwayApiHttpHandler.ts";
import { createRailwayMetaSignupOperations } from "../server/platform/railwayMetaSignupOperations.ts";
import { createRailwayMetaSignupHandler } from "../server/meta/railwayMetaSignupHandler.ts";
import { createMetaSignupService } from "../server/meta/metaSignupService.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from "../server/platform/railwayApiMutationExecutor.ts";
import { TenantSessionError } from "../server/auth/tenantSession.ts";

const oidcToken = "oidc.payload.signature";
const userSessionToken = "user.payload.signature";
const serviceIdentity = { teamSlug: "connect-team", projectName: "connect-web", environment: "production" };
const session = { tenantId: 7, role: "owner", status: "active", externalUserId: "verified-user", displayName: "workspace" };
const configuration = { status: "configured", appId: "100001", configurationId: "500005", apiVersion: "v23.0" };
const input = { launchId: 1, authorizationCode: "protected-authorization-code", businessPortfolioId: "100001", wabaId: "200002", phoneNumberId: "300003" };
const operation = "meta.embedded-signup.complete";
const connected = { status: "connected", connection: { status: "connected" } };

function fixture(options = {}) {
  const requests = [], providerCalls = [], claims = [], limits = [];
  const state = { tenantId: 7, status: "connected", version: 2 };
  const service = createMetaSignupService({
    configuration,
    launches: { async begin() { return { status: "ready", launchId: 1, expiresAt: "2026-09-09T10:00:00.000Z" }; } },
    connections: { async read() { return state; } },
    attempts: { async claim(command) { claims.push(command); return { outcome: "claimed", baselineConnectionVersion: null }; }, async complete() {} },
    orchestrator: { async completeEmbeddedSignup(selectedSession, signup) {
      providerCalls.push({ selectedSession, signup }); return state;
    } },
  });
  const api = createRailwayApiHttpHandler({
    expectedServiceIdentity: serviceIdentity,
    oidcVerifier: { async verify(token) {
      return token === oidcToken ? { provider: "vercel", ...serviceIdentity,
        subject: "owner:connect-team:project:connect-web:environment:production" } : null;
    } },
    endUserSessionVerifier: { async verify(token) {
      return token === userSessionToken ? { externalUserId: session.externalUserId, externalOrganizationId: "org_verified" } : null;
    } },
    operations: createRailwayMetaSignupOperations({
      tenantSessions: { async resolve(identity) {
        assert.equal(identity.externalUserId, session.externalUserId);
        if (options.sessionError) throw options.sessionError;
        return { ...session, role: options.role ?? "owner" };
      } },
      mutationRateLimit: { async consume(key) { limits.push(key); return { outcome: options.rateLimit ?? "allowed" }; } },
      service,
    }),
  });
  const handler = createRailwayMetaSignupHandler({
    applicationConfigured: () => options.configured !== false,
    inspectConfiguration: () => ({ status: "configured", configuration: {
      apiOrigin: "https://connect-api.invalid", deploymentEnvironment: "production",
    } }),
    resolveIdentity: async () => options.identity ?? { status: "authenticated", oidcToken, userSessionToken },
    createClient(config) {
      return createRailwayApiClient({
        apiOrigin: config.apiOrigin, deploymentEnvironment: config.deploymentEnvironment,
        oidcTokenProvider: { async getToken() { return config.oidcToken; } },
        userSessionTokenProvider: { async getToken() { return config.userSessionToken; } },
        traceparentProvider: { async getTraceparent() { return null; } },
        telemetry: { record() { return true; }, scheduleFlush() {} },
        async fetchImplementation(url, init) {
          requests.push({ url: String(url), method: init.method, headers: new Headers(init.headers), body: JSON.parse(init.body) });
          if (options.transportFailure) throw new Error("private-transport-failure");
          if (options.responseData !== undefined) return Response.json({
            contractVersion: "connect.railway-api.v1", outcome: "ok", data: options.responseData,
          });
          return api.handle(new Request(url, init));
        },
      });
    },
  });
  async function raw(payload, overrides = {}) {
    return api.handle(new Request("https://connect-api.invalid/v1/connect", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${userSessionToken}`, "x-vercel-oidc-token": oidcToken },
      body: JSON.stringify({ contractVersion: "connect.railway-api.v1", operation, requestKind: "mutation",
        idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(operation, payload), payload, ...overrides }),
    }));
  }
  return { handler, raw, requests, providerCalls, claims, limits };
}

test("runs configuration and normalized signup through client, HTTP authentication, tenant permission and service", async () => {
  const f = fixture();
  assert.deepEqual(await f.handler.readConfiguration(), configuration);
  assert.deepEqual(await f.handler.complete({ ...input, authorizationCode: ` ${input.authorizationCode} `, flow: "cloud-api" }), connected);
  assert.equal(f.requests.length, 2);
  assert.deepEqual(f.requests[1].body.payload, input);
  assert.equal(f.requests[1].body.idempotencyKey, await deriveRailwayApiDeterministicIdempotencyKey(operation, input));
  assert.equal(f.requests[1].method, "POST");
  assert.equal(f.requests[1].headers.get("authorization"), `Bearer ${userSessionToken}`);
  assert.equal(f.requests[1].headers.get("x-vercel-oidc-token"), oidcToken);
  assert.equal(f.requests[1].url, "https://connect-api.invalid/v1/connect");
  const assets = { ...input }; delete assets.launchId;
  assert.deepEqual(f.providerCalls, [{ selectedSession: session, signup: assets }]);
  assert.deepEqual(f.limits, [`7:verified-user:${operation}`]);
  assert.doesNotMatch(JSON.stringify(f.claims), /protected-authorization-code|wabaId|phoneNumberId/);
});

test("denies callers without authenticated service, authenticated user or workspace permission", async () => {
  for (const options of [
    { configured: false }, { identity: { status: "unauthenticated" } },
    { identity: { status: "authenticated", oidcToken: "wrong.payload.signature", userSessionToken } },
    { identity: { status: "authenticated", oidcToken, userSessionToken: "wrong.payload.signature" } },
    { role: "viewer" },
  ]) {
    const f = fixture(options);
    assert.notEqual((await f.handler.complete(input)).status, "connected");
    assert.notEqual((await f.handler.readConfiguration()).status, "configured");
    assert.deepEqual(f.providerCalls, []);
    assert.deepEqual(f.claims, []);
  }
});

test("maps tenant errors without disclosing private details", async () => {
  for (const [code, status] of [["TENANT_MEMBERSHIP_REQUIRED", "onboarding-required"],
    ["TENANT_SELECTION_REQUIRED", "tenant-selection-required"], ["PERMISSION_DENIED", "permission-denied"]]) {
    const f = fixture({ sessionError: new TenantSessionError(code, "private-session-detail") });
    assert.deepEqual(await f.handler.complete(input), { status });
    assert.deepEqual(f.claims, []);
  }
});

test("enforces tenant mutation limits before any signup claim", async () => {
  for (const rateLimit of ["limited", "unavailable"]) {
    const f = fixture({ rateLimit });
    assert.deepEqual(await f.handler.complete(input), { status: "server-error" });
    assert.deepEqual(f.claims, []);
    assert.deepEqual(f.providerCalls, []);
    assert.deepEqual(await f.handler.readConfiguration(), configuration);
  }
});

test("blocks invalid payloads on both the bridge and direct API before claiming", async () => {
  for (const [payload, status] of [
    [{ ...input, flow: "unknown" }, "validation-error"],
    [{ ...input, authorizationCode: "" }, "validation-error"],
    [{ ...input, unauthorizedExtra: true }, "validation-error"],
  ]) {
    const f = fixture();
    assert.deepEqual(await f.handler.complete(payload), { status });
    assert.deepEqual(f.requests, []);
    const response = await f.raw(payload);
    assert.deepEqual((await response.json()).data, { status });
    assert.deepEqual(f.claims, []);
  }
  const f = fixture();
  for (const payload of [{ ...input, tenantId: 8 }, { ...input, accessToken: "private-token" }]) {
    const response = await f.raw(payload);
    assert.equal((await response.json()).code, "INVALID_REQUEST");
  }
  const wrongKey = await f.raw(input, { idempotencyKey: `connect_idempotency_v1_${"0".repeat(64)}` });
  assert.equal((await wrongKey.json()).code, "INVALID_REQUEST");
  assert.deepEqual(f.claims, []);
});

test("rejects extra configuration and completion fields and invalid provider data", async () => {
  for (const responseData of [
    { ...configuration, appSecret: "private-secret" }, { ...configuration, appId: "invalid" },
    { status: "configured" }, { status: "configuration-required", extra: true },
  ]) assert.deepEqual(await fixture({ responseData }).handler.readConfiguration(), { status: "configuration-invalid" });
  for (const responseData of [
    { ...connected, token: "private-token" }, { status: "connected", connection: { status: "connected", version: 2 } },
    { status: "connected" }, { status: "server-error", reason: "private-failure" },
    { status: "unsupported" },
  ]) assert.deepEqual(await fixture({ responseData }).handler.complete(input), { status: "server-error" });
});

test("never automatically resends a signup after an uncertain transport failure", async () => {
  const f = fixture({ transportFailure: true });
  assert.deepEqual(await f.handler.complete(input), { status: "server-error" });
  assert.equal(f.requests.length, 1);
});


test("begin is an authenticated rate-limited empty mutation that never exchanges a code", async () => {
  const f = fixture();
  assert.deepEqual(await f.handler.begin(), { status: 'ready', launchId: 1, expiresAt: '2026-09-09T10:00:00.000Z' });
  assert.equal(f.requests[0].body.operation, 'meta.embedded-signup.begin');
  assert.deepEqual(f.requests[0].body.payload, {}); assert.deepEqual(f.providerCalls, []); assert.deepEqual(f.claims, []);
  assert.deepEqual(f.limits, ['7:verified-user:meta.embedded-signup.begin']);
  for (const options of [{ role: 'viewer' }, { rateLimit: 'limited' }, { configured: false }, { identity: { status: 'unauthenticated' } },
    { responseData: { status: 'ready', launchId: 1, expiresAt: 'invalid' } }, { responseData: { status: 'ready', launchId: 1, expiresAt: '2026-09-09T10:00:00.000Z', tenantId: 7 } }]) {
    const denied = fixture(options); assert.notEqual((await denied.handler.begin()).status, 'ready'); assert.deepEqual(denied.claims, []);
  }
});

test("missing or forged launch IDs cannot pass the bridge or direct completion API", async () => {
  for (const launchId of [undefined, null, -1, 0, 1.5, '1']) {
    const f = fixture(); const candidate = { ...input, launchId }; if (launchId === undefined) delete candidate.launchId;
    assert.deepEqual(await f.handler.complete(candidate), { status: 'validation-error' });
    assert.equal((await (await f.raw(candidate)).json()).data.status, 'validation-error');
    assert.deepEqual(f.claims, []); assert.deepEqual(f.providerCalls, []);
  }
});

test('Business App requests reach the authenticated API but remain blocked without the server capability', async () => {
  const f = fixture(); const payload={flow:'business-app',wabaId:input.wabaId,authorizationCode:input.authorizationCode,launchId:1};
  assert.deepEqual(await f.handler.begin('business-app'),{status:'configuration-required'});
  assert.deepEqual(await f.handler.complete(payload),{status:'synchronization-required'});
  assert.deepEqual(f.providerCalls,[]); assert.deepEqual(f.claims,[]);
  assert.deepEqual(f.requests[0].body.payload,{flow:'business-app'});
  assert.deepEqual(f.requests[1].body.payload,payload);
});

test('capability and completion parsing reject invented readiness and synchronization claims', async () => {
  assert.deepEqual(await fixture({responseData:{...configuration,businessAppEnabled:true}}).handler.readConfiguration(),{...configuration,businessAppEnabled:true});
  for (const flag of [false,'true',null,{}]) assert.deepEqual(await fixture({responseData:{...configuration,businessAppEnabled:flag}}).handler.readConfiguration(),{status:'configuration-invalid'});
  const business={flow:'business-app',wabaId:input.wabaId,authorizationCode:input.authorizationCode,launchId:1};
  assert.deepEqual(await fixture({responseData:{...connected,synchronization:'background'}}).handler.complete(business),{...connected,synchronization:'background'});
  for (const responseData of [connected,{...connected,synchronization:'complete'},{...connected,synchronization:{status:'accepted'}}]) {
    assert.deepEqual(await fixture({responseData}).handler.complete(business),{status:'server-error'});
  }
  assert.deepEqual(await fixture({responseData:{...connected,synchronization:'background'}}).handler.complete(input),{status:'server-error'});
});

test('Business App payload cannot select provider assets or pass an unrecognized begin flow', async () => {
  const f=fixture();
  assert.deepEqual(await f.handler.complete({...input,flow:'business-app'}),{status:'validation-error'});
  assert.deepEqual(await f.handler.begin('invalid'),{status:'configuration-invalid'});
  assert.deepEqual(f.requests,[]); assert.deepEqual(f.claims,[]);
});
