import assert from 'node:assert/strict';
import test from 'node:test';
import { openAiFixture } from './fixtures/openai-responses.mjs';
import { runtimeFixture } from './fixtures/ai-runtime.mjs';
import { countOpenAiInputTokens, createOpenAiInputTokenBody, reserveOpenAiCost } from '../server/ai/openAiInputTokenCounter.ts';
import { createOpenAiResponsesBody } from '../server/ai/openAiResponsesWire.ts';
import { createDurableOpenAiResponsesProvider } from '../server/ai/durableOpenAiResponsesProvider.ts';
import { AiResponseDeferredError } from '../server/ai/aiGenerationJournal.ts';

test('token count includes the exact generation input and output schema, without generation-only options', async () => {
  const f = await openAiFixture(), body = createOpenAiResponsesBody(f.request, f.configuration);
  const parsed = JSON.parse(body), counting = JSON.parse(createOpenAiInputTokenBody(body));
  assert.deepEqual(Object.keys(counting).sort(), ['input', 'instructions', 'model', 'text', 'tool_choice', 'tools', 'truncation']);
  for (const key of Object.keys(counting)) assert.deepEqual(counting[key], parsed[key]);
  let attempts = 0;
  assert.equal(await countOpenAiInputTokens(body, f.configuration, async (url, options) => {
    attempts++; assert.equal(url, 'https://api.openai.com/v1/responses/input_tokens');
    assert.deepEqual(JSON.parse(options.body), counting); assert.equal(options.redirect, 'error');
    return Response.json({ object: 'response.input_tokens', input_tokens: f.result.usage.input_tokens });
  }), f.result.usage.input_tokens);
  assert.equal(attempts, 1);
});

test('count refuses missing, fractional, oversized and failed responses with no HTTP retries', async () => {
  const f = await openAiFixture(), body = createOpenAiResponsesBody(f.request, f.configuration);
  for (const input_tokens of [null, 0, -1, 1.2, '120', f.configuration.maximumInputTokens + 1]) {
    let attempts = 0;
    assert.equal(await countOpenAiInputTokens(body, f.configuration, async () => {
      attempts++; return Response.json({ object: 'response.input_tokens', input_tokens });
    }), null); assert.equal(attempts, 1);
  }
  assert.equal(await countOpenAiInputTokens(body, f.configuration, async () => Response.json({}, { status: 429 })), null);
  assert.equal(await countOpenAiInputTokens(body, f.configuration, async () => { throw new Error('transport lost'); }), null);
});

test('reservation uses the highest possible input rate and maximum output, with exact integer rounding', async () => {
  const f = await openAiFixture();
  const configuration = { ...f.configuration, maximumOutputTokens: 24, rateCard: { ...f.configuration.rateCard,
    inputMicroUsdPerMillionTokens: 100_000_000, cachedInputMicroUsdPerMillionTokens: 50_000_000,
    cacheWriteMicroUsdPerMillionTokens: 200_000_000, outputMicroUsdPerMillionTokens: 100_000_000 } };
  assert.equal(reserveOpenAiCost(120, configuration), 3);
  assert.throws(() => reserveOpenAiCost(1.1, configuration));
  assert.throws(() => reserveOpenAiCost(configuration.maximumInputTokens + 1, configuration));
  assert.throws(() => reserveOpenAiCost(1_000_000, { ...configuration, maximumInputTokens: 1_000_000,
    rateCard: { ...configuration.rateCard, inputMicroUsdPerMillionTokens: Number.MAX_SAFE_INTEGER * 2 } }));
});

test('a count outage defers without a generation claim or handoff result', async () => {
  const f = await openAiFixture(); let requests = 0;
  const provider = createDurableOpenAiResponsesProvider(f.configuration, {
    async admit() { return true; }, async observe() { return { status: 'missing' }; }, async claim() { assert.fail('No claim'); }, async settle() { assert.fail('No settlement'); },
  }, { now: () => f.now, fetch: async (url) => { assert.ok(url.endsWith('/input_tokens')); requests++; throw new Error('offline'); } });
  await assert.rejects(provider.generate(f.request), AiResponseDeferredError); assert.equal(requests, 1);
});

test('a stored claim, including an expired one, never invokes OpenAI again', async () => {
  const f = await openAiFixture();
  for (const expired of [false, true]) {
    const provider = createDurableOpenAiResponsesProvider(f.configuration, {
      async admit() { return true; }, async observe() { return { status: 'claimed', expired }; }, async claim() { assert.fail('No reclaim'); }, async settle() { assert.fail('No settlement'); },
    }, { now: () => f.now, fetch: async () => { assert.fail('No HTTP'); } });
    await assert.rejects(provider.generate(f.request), AiResponseDeferredError);
  }
});

test('durable in-progress errors propagate through runtime without an audit or usage write', async () => {
  const f = await runtimeFixture({ providerThrows: new AiResponseDeferredError() });
  await assert.rejects(f.service.process(f.input), AiResponseDeferredError);
  assert.equal(f.auditEvents.length, 0); assert.equal(f.calls.some((call) => call.dependency === 'record-usage'), false);
});

test('ordinary provider errors still produce the established safe handoff', async () => {
  const f = await runtimeFixture({ providerThrows: new Error('private provider error') });
  assert.equal((await f.service.process(f.input)).outcome, 'handoff-planned');
  assert.equal(f.auditEvents.length, 1); assert.doesNotMatch(JSON.stringify(f.auditEvents), /private provider error/);
});
