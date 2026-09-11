import assert from "node:assert/strict";
import test from "node:test";
import { inspectOpenAiResponsesConfiguration } from "../server/ai/openAiResponsesConfiguration.ts";
import { createOpenAiResponsesBody, parseOpenAiResponsesResult, readOpenAiResponsesUsage } from "../server/ai/openAiResponsesWire.ts";
import { createOpenAiResponsesProvider } from "../server/ai/openAiResponsesProvider.ts";
import { openAiFixture as fixture } from "./fixtures/openai-responses.mjs";


test("OpenAI is disabled without an explicit enable flag", () => {
  assert.deepEqual(inspectOpenAiResponsesConfiguration({}), { status: "disabled" });
  assert.deepEqual(inspectOpenAiResponsesConfiguration({ AI_RESPONSES_ENABLED: "false" }), { status: "disabled" });
  assert.deepEqual(inspectOpenAiResponsesConfiguration({ AI_RESPONSES_ENABLED: "yes" }), { status: "invalid" });
});

test("OpenAI configuration rejects absent, ambiguous, stale or mismatched policy", async () => {
  const f = await fixture();
  for (const name of Object.keys(f.environment).filter((name) => name !== "AI_RESPONSES_ENABLED")) {
    assert.equal(inspectOpenAiResponsesConfiguration({ ...f.environment, [name]: undefined }, f.now).status, "invalid", name);
  }
  for (const patch of [
    { OPENAI_ALLOWED_MODELS_JSON: "[]" }, { OPENAI_MODEL: "unapproved" },
    { OPENAI_API_KEY: "\n" + f.environment.OPENAI_API_KEY }, { OPENAI_TIMEOUT_MS: "1000.0" },
    { OPENAI_RATE_CARD_JSON: JSON.stringify({ ...f.configuration.rateCard, currency: "ILS" }) },
    { OPENAI_RATE_CARD_JSON: JSON.stringify({ ...f.configuration.rateCard, validUntil: f.now.toISOString() }) },
    { OPENAI_RATE_CARD_JSON: JSON.stringify({ ...f.configuration.rateCard, cachedInputMicroUsdPerMillionTokens: -1 }) },
  ]) assert.equal(inspectOpenAiResponsesConfiguration({ ...f.environment, ...patch }, f.now).status, "invalid");
});

test("request is stateless, tool-free, bounded and limits citations to supplied passages", async () => {
  const f = await fixture();
  const body = JSON.parse(createOpenAiResponsesBody(f.request, f.configuration));
  assert.equal(body.store, false);
  assert.equal(body.background, false);
  assert.equal(body.stream, false);
  assert.equal(body.service_tier, "default");
  assert.deepEqual(body.tools, []);
  assert.equal(body.tool_choice, "none");
  assert.equal(body.truncation, "disabled");
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(body.text.format.schema.properties.groundedPassageKeys.items.enum, [f.request.passages[0].passageKey]);
  const data = JSON.parse(body.input[0].content);
  assert.equal(data.tenantId, undefined);
  assert.equal(data.passages[0].sourceKey, undefined);
  assert.equal(body.previous_response_id, undefined);
  assert.equal(body.conversation, undefined);
  assert.equal(body.input[0].role, "user");
  assert.throws(() => createOpenAiResponsesBody({ ...f.request, passages: [f.request.passages[0], f.request.passages[0]] }, f.configuration));
  assert.throws(() => createOpenAiResponsesBody({ ...f.request, customerMessage: "x".repeat(4097) }, f.configuration));
});

test("accepted JSON draft preserves exact grounded keys and usage", async () => {
  const f = await fixture();
  const result = parseOpenAiResponsesResult(f.result, f.request, f.configuration);
  assert.equal(result.outcome, "generated");
  assert.equal(result.usage.currency, "USD");
  assert.deepEqual(result.groundedPassageKeys, [f.request.passages[0].passageKey]);
  assert.equal(result.usage.costMinorUnits, 1);
});

test("cached input accounting uses integer arithmetic and rounds only once", async () => {
  const f = await fixture();
  const config = { ...f.configuration, rateCard: { ...f.configuration.rateCard,
    inputMicroUsdPerMillionTokens: 100_000_000, cachedInputMicroUsdPerMillionTokens: 50_000_000,
    outputMicroUsdPerMillionTokens: 200_000_000 } };
  f.result.usage.input_tokens_details.cached_tokens = 24;
  // ((120 - 24) * 100M + 24 * 50M + 24 * 200M) / 10B = 1.56 cents -> 2.
  assert.equal(readOpenAiResponsesUsage(f.result, config).costMinorUnits, 2);
  f.result.usage.input_tokens_details.cached_tokens = 121;
  assert.equal(readOpenAiResponsesUsage(f.result, config), null);
});

test("cache-write billing requires its own price and consistent usage", async () => {
  const f = await fixture();
  f.result.usage.input_tokens_details.cache_write_tokens = 24;
  assert.equal(readOpenAiResponsesUsage(f.result, f.configuration), null);
  const configured = { ...f.configuration, rateCard: { ...f.configuration.rateCard,
    cacheWriteMicroUsdPerMillionTokens: 1_000_000_000 } };
  assert.equal(readOpenAiResponsesUsage(f.result, configured).costMinorUnits, 3);
  delete f.result.usage.input_tokens_details.cache_write_tokens;
  assert.equal(readOpenAiResponsesUsage(f.result, configured), null);
});

test("refusal, invented citations, extra keys, tool calls and incomplete output retain incurred usage", async () => {
  const f = await fixture();
  const mutations = [
    (r) => { r.status = "incomplete"; },
    (r) => { r.output[0].content = [{ type: "refusal", refusal: "" }]; },
    (r) => { r.output.push({ type: "function_call" }); },
    (r) => { r.output[0].content[0].text = JSON.stringify({ answerable: true, text: "תשובה", groundedPassageKeys: [f.request.aiAgentVersionKey] }); },
    (r) => { r.output[0].content[0].text = JSON.stringify({ answerable: false, text: "", groundedPassageKeys: [] }); },
    (r) => { const d = JSON.parse(r.output[0].content[0].text); d.other = true; r.output[0].content[0].text = JSON.stringify(d); },
    (r) => { r.output[0].content[0].text = "{"; },
  ];
  for (const mutate of mutations) {
    const result = structuredClone(f.result); mutate(result);
    const rejected = parseOpenAiResponsesResult(result, f.request, f.configuration);
    assert.equal(rejected.outcome, "policy-violation");
    assert.equal(rejected.usage.inputTokens, 120);
  }
});

test("unknown model, price tier or usage never becomes a priced draft", async () => {
  const f = await fixture();
  for (const patch of [{ model: "unapproved" }, { service_tier: "priority" }, { usage: null }]) {
    assert.deepEqual(parseOpenAiResponsesResult({ ...f.result, ...patch }, f.request, f.configuration), { outcome: "unavailable" });
  }
});

test("provider sends one POST to the fixed endpoint, with server credential and no redirects", async () => {
  const f = await fixture(); let calls = 0;
  const provider = createOpenAiResponsesProvider(f.configuration, { now: () => f.now, fetch: async (url, options) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.method, "POST");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.authorization, `Bearer ${f.configuration.apiKey}`);
    assert.equal(options.body.includes(f.configuration.apiKey), false);
    return Response.json(f.result);
  } });
  assert.equal((await provider.generate(f.request)).outcome, "generated");
  assert.equal(calls, 1);
});

test("provider does not retry HTTP errors or expose their bodies", async () => {
  const f = await fixture();
  for (const status of [401, 429, 500]) {
    let calls = 0;
    const provider = createOpenAiResponsesProvider(f.configuration, { now: () => f.now, fetch: async () => {
      calls++; return new Response(f.configuration.apiKey, { status });
    } });
    assert.deepEqual(await provider.generate(f.request), { outcome: "unavailable" });
    assert.equal(calls, 1);
  }
});

test("provider timeout aborts one attempt even when transport ignores cancellation", async () => {
  const f = await fixture(); let signal;
  const provider = createOpenAiResponsesProvider(f.configuration, { now: () => f.now, fetch: async (_url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  } });
  assert.deepEqual(await provider.generate(f.request), { outcome: "unavailable" });
  assert.equal(signal.aborted, true);
});

test("provider rejects oversized, invalid UTF8 or non-JSON wire output", async () => {
  const f = await fixture();
  for (const response of [
    new Response("{}", { headers: { "content-type": "text/html" } }),
    new Response("{}", { headers: { "content-type": "application/json", "content-length": "262145" } }),
    new Response(new Uint8Array([255]), { headers: { "content-type": "application/json" } }),
    new Response(" ".repeat(262145), { headers: { "content-type": "application/json" } }),
  ]) {
    const provider = createOpenAiResponsesProvider(f.configuration, { now: () => f.now, fetch: async () => response });
    assert.deepEqual(await provider.generate(f.request), { outcome: "unavailable" });
  }
});

test("expired configuration prevents any provider access", async () => {
  const f = await fixture(); let now = f.now;
  const provider = createOpenAiResponsesProvider(f.configuration, { now: () => now,
    fetch: async () => assert.fail("expired rate card must not dispatch") });
  now = new Date(f.configuration.rateCard.validUntil);
  assert.deepEqual(await provider.generate(f.request), { outcome: "unavailable" });
});
