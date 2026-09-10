import assert from "node:assert/strict";
import test from "node:test";
import { createMetaDataSyncService, validateMetaDataSyncRequest } from "../server/meta/metaDataSync.ts";
import { createMetaGraphDataSyncProvider } from "../server/meta/metaGraphDataSyncProvider.ts";
import { createMetaGraphTransport, MetaGraphError } from "../server/meta/metaGraphTransport.ts";
import { toSensitiveMetaAccessToken } from "../server/meta/metaPorts.ts";
import { createPostgresMetaDataSyncRepository } from '../server/platform/postgresMetaDataSyncRepository.ts';

const session = { tenantId: 7, externalUserId: "test-sync-user", role: "owner", status: "active", displayName: "Sync test" };
const request = { tenantId: 7, wabaId: "200002", phoneNumberId: "300003", connectionVersion: 4,
  syncType: "smb_app_state_sync", startedAt: "2026-09-09T08:00:00.000Z", status: "prepared", requestId: null };
const token = toSensitiveMetaAccessToken("test-sync-token");
const result = { status: "accepted", requestId: "provider-request-1" };

test('signup-bound preparation rejects malformed scope before opening a transaction', async () => {
  let transactions = 0;
  const repository = createPostgresMetaDataSyncRepository({ async transaction() { transactions++; throw new Error('unexpected transaction'); } });
  for (const changed of [{ tenantId:0 },{ externalUserId:'' },{ externalUserId:'invalid\nactor' },{ role:'agent' }])
    await assert.rejects(repository.prepareFromSignupLaunch({ ...session,...changed },1));
  for (const launchId of [undefined,null,0,-1,'1',1.5,Number.MAX_SAFE_INTEGER+1])
    await assert.rejects(repository.prepareFromSignupLaunch(session,launchId));
  assert.equal(transactions,0);
});

function fixture(overrides = {}) {
  const calls = [];
  let stored = { ...request };
  const repository = {
    async read() { calls.push("read"); return stored; },
    async claim(expected) { calls.push("claim"); assert.equal(expected.status, "prepared"); stored = { ...stored, status: "dispatching" }; return { outcome: "claimed", request: stored }; },
    async finish(expected, received) { calls.push("finish"); assert.equal(expected.status, "dispatching"); stored = { ...stored, ...received }; return stored; },
    ...overrides.repository,
  };
  const provider = {
    async verifyPhone(selected, suppliedToken) { calls.push("verify"); assert.equal(selected.phoneNumberId, request.phoneNumberId); assert.equal(suppliedToken, token); },
    async request(selected) { calls.push("post"); assert.equal(selected.status, "dispatching"); return result; },
    ...overrides.provider,
  };
  const service = createMetaDataSyncService({ repository, provider,
    credentials: { async withAccessToken(tenantId, operation) { calls.push("credential"); assert.equal(tenantId, 7); return operation(token); }, ...overrides.credentials } });
  return { service, calls, read: () => stored };
}

test("sync service commits a claim after preflight and does not re-send a stored success", async () => {
  const f = fixture();
  assert.deepEqual(await f.service.execute(session, "smb_app_state_sync"), result);
  assert.deepEqual(f.calls, ["read", "credential", "verify", "claim", "post", "finish"]);
  f.calls.length = 0;
  assert.deepEqual(await f.service.execute(session, "smb_app_state_sync"), result);
  assert.deepEqual(f.calls, ["read"]);
});

test("a crash after claim or an unknown commit never grants a second provider request", async () => {
  for (const status of ["dispatching", "unknown", "rejected", "expired", "cancelled"]) {
    const f = fixture({ repository: { async read() { return { ...request, status }; } } });
    assert.deepEqual(await f.service.execute(session, request.syncType), { status, requestId: null });
    assert.deepEqual(f.calls, []);
  }
  const f = fixture({ repository: { async claim() { throw new Error("ambiguous commit"); } } });
  await assert.rejects(f.service.execute(session, request.syncType));
  assert.equal(f.calls.includes("post"), false);
});

test("history waits for the same onboarding's contacts request to be accepted", async () => {
  const history = { ...request, syncType: "history" };
  for (const status of ["prepared", "dispatching", "unknown", "rejected"]) {
    const f = fixture({ repository: { async read(_tenant, type) { return type === "history" ? history : { ...request, status }; } } });
    assert.deepEqual(await f.service.execute(session, "history"), { status: "waiting-for-contacts" });
    assert.deepEqual(f.calls, []);
  }
  const f = fixture({ repository: { async read(_tenant, type) { return type === "history" ? history : { ...request, ...result, connectionVersion: 6 }; } } });
  await assert.rejects(f.service.execute(session, "history"), (error) => error.code === "SYNC_SCOPE_CHANGED");
});

test("roles, scope changes and invalid claims fail before POST", async () => {
  const denied = fixture();
  await assert.rejects(denied.service.execute({ ...session, role: "agent" }, request.syncType));
  assert.deepEqual(denied.calls, []);
  await assert.rejects(denied.service.execute(session, "other"));
  for (const repository of [
    { async read() { return { ...request, tenantId: 8 }; } },
    { async claim() { return { outcome: "claimed", request: { ...request, status: "dispatching", phoneNumberId: "999999" } }; } },
    { async claim() { return { outcome: "claimed", request }; } },
  ]) {
    const f = fixture({ repository });
    await assert.rejects(f.service.execute(session, request.syncType));
    assert.equal(f.calls.includes("post"), false);
  }
});

test("preflight failure leaves a request prepared while provider ambiguity is durably unknown", async () => {
  const f = fixture({ provider: { async verifyPhone() { throw new Error("not a verified business app"); } } });
  await assert.rejects(f.service.execute(session, request.syncType));
  assert.equal(f.read().status, "prepared");
  assert.equal(f.calls.includes("claim"), false);
  for (const requestProvider of [async () => { throw new Error("secret-provider-details"); }, async () => ({ status: "accepted", requestId: "" })]) {
    const uncertain = fixture({ provider: { request: requestProvider } });
    assert.deepEqual(await uncertain.service.execute(session, request.syncType), { status: "unknown", requestId: null });
    assert.equal(uncertain.read().status, "unknown");
  }
});

test("a failed completion write leaves dispatching and a retry does not call the provider", async () => {
  const f = fixture({ repository: { async finish() { throw new Error("commit unavailable"); } } });
  await assert.rejects(f.service.execute(session, request.syncType));
  assert.equal(f.read().status, "dispatching");
  const sent = f.calls.filter((call) => call === "post").length;
  await f.service.execute(session, request.syncType);
  assert.equal(f.calls.filter((call) => call === "post").length, sent);
});

test("Graph sync uses the documented endpoint and keeps credentials out of request/result bodies", async () => {
  const calls = [];
  const provider = createMetaGraphDataSyncProvider(createMetaGraphTransport({ apiVersion: "v21.0" }, {
    async fetchImplementation(url, init) {
      calls.push({ url: String(url), ...init });
      return new Response(JSON.stringify(init.method === "GET"
        ? { id: request.phoneNumberId, is_on_biz_app: true, platform_type: "CLOUD_API" }
        : { messaging_product: "whatsapp", request_id: "provider-request-1", ignored: "extra" }));
    },
  }));
  await provider.verifyPhone(request, token);
  assert.deepEqual(await provider.request({ ...request, status: "dispatching" }, token), result);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, "https://graph.facebook.com/v21.0/300003/smb_app_data");
  assert.deepEqual(JSON.parse(calls[1].body), { messaging_product: "whatsapp", sync_type: "smb_app_state_sync" });
  assert.equal(calls[1].headers.authorization, "Bearer test-sync-token");
  assert.doesNotMatch(calls[1].body, /test-sync-token/);
  assert.equal(calls[1].redirect, "error");
});

test("Graph verification rejects a different, unknown or Cloud-API-only number", async () => {
  for (const response of [null, {}, { id: request.phoneNumberId, is_on_biz_app: false, platform_type: "CLOUD_API" },
    { id: "999999", is_on_biz_app: true, platform_type: "CLOUD_API" }, { id: request.phoneNumberId, is_on_biz_app: true, platform_type: "ON_PREMISE" }]) {
    const provider = createMetaGraphDataSyncProvider({ async requestJson() { return response; } });
    await assert.rejects(provider.verifyPhone(request, token));
  }
});

test("Graph acceptance is distinct from synchronization completion and malformed results remain unknown", async () => {
  for (const response of [{ success: true }, { messaging_product: "whatsapp", request_id: "bad\nvalue" }, { messaging_product: "other", request_id: "id" }]) {
    const provider = createMetaGraphDataSyncProvider({ async requestJson() { return response; } });
    assert.deepEqual(await provider.request({ ...request, status: "dispatching" }, token), { status: "unknown", requestId: null });
  }
  for (const [error, status] of [[new MetaGraphError("API_ERROR", "private", { httpStatus: 400 }), "rejected"],
    [new MetaGraphError("API_ERROR", "private", { httpStatus: 503 }), "unknown"], [new MetaGraphError("TIMEOUT", "private"), "unknown"]]) {
    let calls = 0;
    const provider = createMetaGraphDataSyncProvider({ async requestJson() { calls++; throw error; } });
    assert.deepEqual(await provider.request({ ...request, status: "dispatching" }, token), { status, requestId: null });
    assert.equal(calls, 1);
  }
});

test("the sync request boundary copies input and rejects malformed identities and state", () => {
  const input = { ...request };
  const frozen = validateMetaDataSyncRequest(input);
  input.phoneNumberId = "999999";
  assert.equal(frozen.phoneNumberId, request.phoneNumberId);
  assert.ok(Object.isFrozen(frozen));
  for (const invalid of [{ ...request, tenantId: 0 }, { ...request, phoneNumberId: "../other" }, { ...request, startedAt: "not-a-time" },
    { ...request, status: "accepted" }, { ...request, status: "unknown", requestId: "id" }]) assert.throws(() => validateMetaDataSyncRequest(invalid));
});
