import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetaEmbeddedSignupAttemptCoordinator,
  launchMetaEmbeddedSignup,
  parseMetaEmbeddedSignupMessage,
  subscribeToMetaEmbeddedSignupMessages,
} from "../features/workspace/metaEmbeddedSignupClient.ts";
import {
  createMetaGraphCoexistenceAssetResolver,
} from "../server/meta/metaGraphAssetVerifier.ts";
import {
  createMetaConnectionOrchestrator,
  normalizeMetaBusinessAppSignupInput,
} from "../server/meta/metaConnectionOrchestrator.ts";
import {
  createMetaEmbeddedSignupCompletionHandler,
} from "../server/meta/metaEmbeddedSignupCompletion.ts";
import {
  readMetaConnectionPanelMessages,
} from "../features/workspace/metaConnectionPanelMessages.ts";
import { toSensitiveMetaAccessToken } from "../server/meta/metaPorts.ts";
import { createMetaCoexistenceSignupService } from '../server/meta/metaCoexistenceSignupService.ts';
import { deriveMetaSignupConfigurationKey } from '../server/meta/metaSignupService.ts';

const accessToken = toSensitiveMetaAccessToken("asset-verifier-fixture-access-token");
const wabaId = "234567891";
const phoneNumberId = "345678912";
const businessPortfolioId = "123456789";
const finishEvent = "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";
function message(data = { waba_id: wabaId }, event = finishEvent) {
  return {
    origin: "https://business.facebook.com",
    data: JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event, data, version: 3 }),
  };
}

test("launches the documented Business app options without changing the default flow", () => {
  const calls = [];
  const sdk = { login: (_callback, options) => calls.push(options) };
  launchMetaEmbeddedSignup(sdk, "909", () => {}, "business-app");
  launchMetaEmbeddedSignup(sdk, "909", () => {});
  assert.deepEqual(calls[0], {
    config_id: "909", response_type: "code", override_default_response_type: true,
    extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
  });
  assert.deepEqual(calls[1].extras, { setup: {} });
  assert.throws(() => launchMetaEmbeddedSignup(sdk, "909", () => {}, "personal-whatsapp"),
    { code: "INVALID_CONFIGURATION" });
  assert.equal(calls.length, 2);
});

test("accepts WABA-only completion only in a Business app attempt and invents no IDs", () => {
  assert.deepEqual(parseMetaEmbeddedSignupMessage(message(), "business-app"), {
    status: "finished", assets: { flow: "business-app", wabaId },
  });
  assert.deepEqual(parseMetaEmbeddedSignupMessage(message()), {
    status: "unsupported-finish", event: finishEvent,
  });
  assert.equal(parseMetaEmbeddedSignupMessage(message({
    business_id: businessPortfolioId, waba_id: wabaId, phone_number_id: phoneNumberId,
  }, "FINISH"), "business-app").status, "unsupported-finish");
  for (const data of [{}, { waba_id: "../waba" }, { waba_id: wabaId, waba_ids: [wabaId] }]) {
    assert.equal(parseMetaEmbeddedSignupMessage(message(data), "business-app").status, "invalid");
  }
  assert.equal(parseMetaEmbeddedSignupMessage({
    ...message(), origin: "https://facebook.com.attacker.invalid",
  }, "business-app").status, "ignored");
});

test("propagates a WABA-only result through the listener and coordinator in either order", () => {
  for (const loginFirst of [true, false]) {
    const results = [];
    const coordinator = createMetaEmbeddedSignupAttemptCoordinator((result) => results.push(result));
    let listener;
    let removed = false;
    const unsubscribe = subscribeToMetaEmbeddedSignupMessages({
      addEventListener: (_type, callback) => { listener = callback; },
      removeEventListener: (_type, callback) => { removed = callback === listener; },
    }, (result) => coordinator.acceptMessageResult(result), "business-app");
    const authorize = () => coordinator.acceptLoginResult({
      status: "authorized", authorizationCode: "authorization-code",
    });
    if (loginFirst) authorize();
    listener(message());
    if (!loginFirst) authorize();
    listener(message());
    coordinator.expire();
    assert.deepEqual(results, [{ status: "ready", input: {
      flow: "business-app", wabaId, authorizationCode: "authorization-code",
    } }]);
    unsubscribe();
    assert.equal(removed, true);
  }
});

function resolverFixture({ pages = [{ data: [{ id: phoneNumberId }] }], phone, owner } = {}) {
  const calls = [];
  let pageIndex = 0;
  const resolver = createMetaGraphCoexistenceAssetResolver({
    async requestJson(request) {
      calls.push(request);
      assert.equal(request.method, "GET");
      if (request.pathSegments[1] === "phone_numbers") return pages[pageIndex++];
      if (request.pathSegments[0] === wabaId) {
        return owner ?? { id: wabaId, owner_business_info: { id: businessPortfolioId } };
      }
      return phone ?? { id: phoneNumberId, is_on_biz_app: true, platform_type: "CLOUD_API" };
    },
  });
  return { resolver, calls };
}

test("resolves the owner and unique phone from authenticated Graph responses", async () => {
  const { resolver, calls } = resolverFixture();
  assert.deepEqual(await resolver.resolveAssets({ accessToken, wabaId }), {
    businessPortfolioId, wabaId, phoneNumberId,
  });
  assert.deepEqual(calls.map(({ pathSegments, query }) => ({ pathSegments, query })), [
    { pathSegments: [wabaId], query: { fields: "id,owner_business_info{id}" } },
    { pathSegments: [wabaId, "phone_numbers"], query: { fields: "id" } },
    { pathSegments: [phoneNumberId], query: { fields: "id,is_on_biz_app,platform_type" } },
  ]);
});

test("checks later pages and rejects an ambiguous number instead of choosing the first", async () => {
  const { resolver, calls } = resolverFixture({ pages: [
    { data: [{ id: phoneNumberId }], paging: {
      next: "https://attacker.invalid/?access_token=never-follow",
      cursors: { after: "next-page" },
    } },
    { data: [{ id: "456789123" }] },
  ] });
  await assert.rejects(resolver.resolveAssets({ accessToken, wabaId }), {
    code: "AMBIGUOUS_COEXISTENCE_PHONE",
  });
  assert.equal(calls[2].query.after, "next-page");
  assert.doesNotMatch(JSON.stringify(calls), /attacker|never-follow/);
  assert.equal(calls.length, 3);
});

test("accepts a unique number found on a later page", async () => {
  const { resolver } = resolverFixture({ pages: [
    { data: [], paging: { next: "https://graph.facebook.com/next", cursors: { after: "next-page" } } },
    { data: [{ id: phoneNumberId }] },
  ] });
  assert.equal((await resolver.resolveAssets({ accessToken, wabaId })).phoneNumberId, phoneNumberId);
});

test("rejects missing, inactive or incorrectly identified provider assets", async () => {
  const cases = [
    [{ pages: [{ data: [] }] }, "PHONE_NUMBER_NOT_FOUND"],
    [{ owner: { id: "999", owner_business_info: { id: businessPortfolioId } } }, "INVALID_WABA_RESPONSE"],
    [{ owner: { id: wabaId } }, "INVALID_WABA_RESPONSE"],
    [{ phone: { id: phoneNumberId, is_on_biz_app: false, platform_type: "CLOUD_API" } }, "COEXISTENCE_NOT_ACTIVE"],
    [{ phone: { id: phoneNumberId, is_on_biz_app: "true", platform_type: "CLOUD_API" } }, "COEXISTENCE_NOT_ACTIVE"],
    [{ phone: { id: "999", is_on_biz_app: true, platform_type: "CLOUD_API" } }, "COEXISTENCE_NOT_ACTIVE"],
    [{ phone: { id: phoneNumberId, is_on_biz_app: true, platform_type: "ON_PREMISE" } }, "COEXISTENCE_NOT_ACTIVE"],
    [{ phone: { id: phoneNumberId } }, "COEXISTENCE_NOT_ACTIVE"],
  ];
  for (const [options, code] of cases) {
    const { resolver } = resolverFixture(options);
    await assert.rejects(resolver.resolveAssets({ accessToken, wabaId }), { code });
  }
});

test("bounds pagination, rejects loops and never sends malformed IDs to Meta", async () => {
  for (const repeat of [true, false]) {
    const pages = Array.from({ length: 20 }, (_, index) => ({
      data: [], paging: { next: "https://graph.facebook.com/next", cursors: { after: repeat ? "same" : `page-${index}` } },
    }));
    const { resolver, calls } = resolverFixture({ pages });
    await assert.rejects(resolver.resolveAssets({ accessToken, wabaId }), { code: "PAGINATION_ERROR" });
    assert.equal(calls.length, repeat ? 3 : 21);
  }
  const { resolver, calls } = resolverFixture();
  await assert.rejects(resolver.resolveAssets({ accessToken, wabaId: "../waba" }), { code: "INVALID_ASSET_ID" });
  assert.equal(calls.length, 0);
});

const session = { externalUserId: "external-user-id", tenantId: 7, displayName: "tenant-name", status: "active", role: "owner" };
test("blocks Business app completion before credentials, provider calls or persistence until sync is wired", async () => {
  // Empty dependencies make any accidental side effect fail the expected error.
  const orchestrator = createMetaConnectionOrchestrator({});
  for (const input of [
    { flow: "business-app", wabaId, authorizationCode: "authorization-code" },
    { flow: "business-app", wabaId, businessPortfolioId, phoneNumberId, authorizationCode: "authorization-code" },
  ]) {
    await assert.rejects(orchestrator.completeEmbeddedSignup(session, input), {
      code: "COEXISTENCE_SYNCHRONIZATION_REQUIRED",
    });
    const handler = createMetaEmbeddedSignupCompletionHandler({
      readConfiguration: () => ({ status: "configured" }),
      createContext: async () => ({ session, orchestrator }),
    });
    assert.deepEqual(await handler.complete(input), { status: "synchronization-required" });
  }
  await assert.rejects(orchestrator.completeEmbeddedSignup(session, {
    flow: "personal-whatsapp", wabaId, businessPortfolioId, phoneNumberId, authorizationCode: "authorization-code",
  }), { code: "INVALID_INPUT" });
});

test("explains the Business app requirement and pending synchronization in all workspace languages", () => {
  for (const language of ["he", "en", "ar"]) {
    const messages = readMetaConnectionPanelMessages(language);
    assert.match(messages.businessApp.description, /WhatsApp Business/);
    assert.equal(messages.businessApp.steps.length, 3);
    assert.match(messages.businessApp.steps[2], /QR/);
    assert.ok(messages.businessApp.unavailable.trim());
    assert.ok(messages.attemptDetails["synchronization-required"].trim());
  }
});

test('Business App input is WABA-only and rejects supplied owner/phone identities and other flows', () => {
  const input = { flow:'business-app',wabaId,authorizationCode:'code',launchId:1 };
  assert.deepEqual(normalizeMetaBusinessAppSignupInput(input),{ flow:'business-app',wabaId,authorizationCode:'code' });
  for (const changed of [{ businessPortfolioId },{ phoneNumberId },{ flow:'cloud-api' },{ wabaId:'../waba' },{ authorizationCode:'' }])
    assert.throws(() => normalizeMetaBusinessAppSignupInput({ ...input,...changed }),{ code:'INVALID_INPUT' });
});

test('Business App orchestration requires a resolver and a trusted baseline before exchanging code', async () => {
  let exchanged = 0;
  const orchestrator = createMetaConnectionOrchestrator({ authorizationCodeExchanger:{ async exchangeAuthorizationCode() { exchanged++; } },
    coexistenceAssetResolver:{ async resolveAssets() { throw new Error('must not resolve'); } } });
  for (const context of [undefined,null,{}, { expectedConnectionVersion:0 },{ expectedConnectionVersion:'1' }])
    await assert.rejects(orchestrator.completeBusinessAppSignup(session,{ flow:'business-app',wabaId,authorizationCode:'code' },context),{ code:'COEXISTENCE_SYNCHRONIZATION_REQUIRED' });
  assert.equal(exchanged,0);
});

test('Coexistence configuration hashes are deterministic and distinct from Cloud API launches', async () => {
  const configuration = { status:'configured',appId:'100001',configurationId:'500005',apiVersion:'v23.0' };
  const first = await deriveMetaSignupConfigurationKey(configuration,true);
  assert.equal(first,await deriveMetaSignupConfigurationKey({ ...configuration },true));
  assert.notEqual(first,await deriveMetaSignupConfigurationKey(configuration));
  assert.notEqual(first,await deriveMetaSignupConfigurationKey({ ...configuration,configurationId:'600006' },true));
});

test('unconfigured Coexistence and malformed resume do not touch registration or provider dependencies', async () => {
  for (const status of ['configuration-required','configuration-invalid']) {
    const service = createMetaCoexistenceSignupService({ configuration:{ status },orchestrator:null,synchronization:null });
    assert.deepEqual(await service.begin(session),{ status });
    assert.deepEqual(await service.complete(session,{}),{ registration:{ status },synchronization:null });
    assert.deepEqual(await service.resume(session,1),{ status });
    await assert.rejects(service.resume({ ...session,role:'viewer' },1));
  }
  const service = createMetaCoexistenceSignupService({ configuration:{ status:'configured' } });
  for (const id of [undefined,null,'1',0,-1,1.2]) assert.deepEqual(await service.resume(session,id),{ status:'recovery-required' });
});

test('launch hashes preserve existing identities when the UI capability is added or object keys are reordered', async () => {
  const configuration={status:'configured',appId:'100001',configurationId:'500005',apiVersion:'v23.0'};
  const {createHash}=await import('node:crypto');
  for(const business of [false,true]) {
    const previous=createHash('sha256').update(JSON.stringify(business?{configuration,flow:'business-app'}:configuration)).digest('hex');
    const updated={businessAppEnabled:true,apiVersion:'v23.0',configurationId:'500005',appId:'100001',status:'configured'};
    assert.equal(await deriveMetaSignupConfigurationKey(updated,business),previous);
  }
});
