import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { openAiFixture } from '../fixtures/openai-responses.mjs';
import { createNodePostgresQueryExecutor, createNodePostgresTransactionManager } from '../../server/platform/nodePostgresAdapter.ts';
import { createPostgresAiRuntimePersistence } from '../../server/platform/postgresAiRuntimeRepository.ts';
import { createPostgresAiGenerationJournal } from '../../server/platform/postgresAiGenerationJournal.ts';
import { postgresAiGenerationSql as sql } from '../../server/platform/postgresAiGenerationSql.ts';
import { createDurableOpenAiResponsesProvider } from '../../server/ai/durableOpenAiResponsesProvider.ts';
import { AiResponseDeferredError } from '../../server/ai/aiGenerationJournal.ts';
import { deriveAiProviderRequestKey } from '../../server/ai/aiRuntimeKey.ts';
import { createOpenAiResponsesBody, parseOpenAiResponsesResult } from '../../server/ai/openAiResponsesWire.ts';
import { reserveOpenAiCost } from '../../server/ai/openAiInputTokenCounter.ts';

const connectionString = process.env.CONNECT_AI_GENERATION_TEST_URL;
if (connectionString !== 'postgresql://connect_ai_test@127.0.0.1:55446/connect_ai_generation_integration') throw new Error('Dedicated empty loopback AI generation database required');
const pool = new pg.Pool({ connectionString, max: 8, connectionTimeoutMillis: 2000, statement_timeout: 10000, lock_timeout: 5000 });
const queries = createNodePostgresQueryExecutor(pool), transactions = createNodePostgresTransactionManager(pool);
const persistence = createPostgresAiRuntimePersistence({ queries, transactions });
const journal = createPostgresAiGenerationJournal({ queries, transactions });
let tenantId = 7;
before(async () => {
  const identity = (await pool.query('SELECT current_database() AS database, current_user AS role')).rows[0];
  assert.deepEqual(identity, { database: 'connect_ai_generation_integration', role: 'connect_ai_test' });
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname='public'")).rowCount, 0, 'Refusing a nonempty database');
  const directory = new URL('../../postgres/migrations/', import.meta.url);
  for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()) await pool.query(await readFile(new URL(file, directory), 'utf8'));
});
after(async () => { await pool.end(); });

async function newCase(definition = {}) {
  const f = await openAiFixture({ tenantId: ++tenantId, definition });
  const { agent, version } = f.runtime.input;
  await pool.query('INSERT INTO tenants (id, display_name, status) VALUES ($1, $2, $3)', [agent.tenantId, agent.name, 'active']);
  await pool.query(`INSERT INTO ai_agents (ai_agent_key,tenant_id,name,status,latest_version_key,latest_version_number,active_version_key,version)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [agent.aiAgentKey, agent.tenantId, agent.name, agent.status, agent.latestVersionKey, agent.latestVersionNumber, agent.activeVersionKey, agent.version]);
  await pool.query(`INSERT INTO ai_agent_versions (ai_agent_version_key,ai_agent_key,tenant_id,version_number,status,definition_json,published_at)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,date_trunc('milliseconds', CURRENT_TIMESTAMP))`, [version.aiAgentVersionKey, agent.aiAgentKey, agent.tenantId, version.versionNumber, version.status, JSON.stringify(version.definition)]);
  await authorize(f, f.request);
  return f;
}
async function authorize(f, request) {
  const { agent, version } = f.runtime.input;
  return persistence.costGate.authorize({ tenantId: request.tenantId, requestKey: request.requestKey, aiAgentKey: agent.aiAgentKey,
    monthlyLimitMinorUnits: version.definition.monthlyCostLimitMinorUnits, currency: version.definition.billingCurrency });
}
async function anotherRequest(f) {
  const inboundMessageKey = `message_v1_${createHash('sha256').update(f.request.customerMessage).digest('hex')}`;
  const request = { ...f.request, requestKey: await deriveAiProviderRequestKey(f.request.tenantId,
    { conversationKey: f.runtime.input.conversationKey, inboundMessageKey, aiAgentVersionKey: f.request.aiAgentVersionKey }) };
  await authorize(f, request); return request;
}
function claimInput(f, request = f.request) {
  const digest = (input) => createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return { request, binding: { tenantId: request.tenantId, requestKey: request.requestKey, aiAgentVersionKey: request.aiAgentVersionKey,
    inputDigest: digest({ namespace: "ai_generation_input_v1", request }),
    policyDigest: digest({ body: createOpenAiResponsesBody(request, f.configuration), rateCard: f.configuration.rateCard, maximumInputTokens: f.configuration.maximumInputTokens }) },
    countedInputTokens: f.result.usage.input_tokens, reservedMinorUnits: reserveOpenAiCost(f.result.usage.input_tokens, f.configuration), timeoutMs: f.configuration.timeoutMs };
}
const rows = async (f) => (await pool.query('SELECT * FROM ai_generation_journal WHERE tenant_id=$1 ORDER BY request_key', [f.request.tenantId])).rows;
const usageRows = async (f) => (await pool.query('SELECT * FROM ai_runtime_usage WHERE tenant_id=$1', [f.request.tenantId])).rows;
function transport(f, generation = async () => Response.json(f.result)) {
  const calls = { count: 0, generate: 0 };
  const fetch = async (url, options) => {
    if (url.endsWith('/input_tokens')) { calls.count++; return Response.json({ object: 'response.input_tokens', input_tokens: f.result.usage.input_tokens }); }
    assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(options.headers['X-Client-Request-Id'], f.request.requestKey); calls.generate++; return generation(options);
  };
  return { calls, fetch };
}
const provider = (f, wire, repository = journal) => createDurableOpenAiResponsesProvider(f.configuration, repository, { fetch: wire.fetch, now: () => f.now });

test('dispatch and usage settle atomically, replay after restart, and runtime usage write is idempotent', async () => {
  const f = await newCase(), wire = transport(f);
  const result = await provider(f, wire).generate(f.request);
  assert.equal(result.outcome, 'generated'); assert.equal((await rows(f))[0].status, 'settled');
  assert.equal((await usageRows(f)).length, 1);
  const restarted = createPostgresAiGenerationJournal({ queries, transactions });
  assert.deepEqual(await provider(f, wire, restarted).generate(f.request), result);
  assert.deepEqual(await persistence.costGate.recordUsage({ tenantId: f.request.tenantId, requestKey: f.request.requestKey,
    aiAgentKey: f.runtime.input.agent.aiAgentKey, usage: result.usage }), { outcome: 'recorded', withinLimit: true });
  assert.deepEqual(wire.calls, { count: 1, generate: 1 }); assert.equal((await usageRows(f)).length, 1);
  assert.doesNotMatch(JSON.stringify(await rows(f)), /businessGuidance|customerMessage|Bearer|OPENAI_API_KEY/);
});

test('concurrent duplicate requests dispatch once; the competing worker defers without a handoff', async () => {
  const f = await newCase(); let release, entered;
  const gate = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { entered = resolve; });
  const wire = transport(f, async () => { entered(); await gate; return Response.json(f.result); });
  const first = provider(f, wire).generate(f.request); await started;
  await assert.rejects(provider(f, wire).generate(f.request), AiResponseDeferredError);
  release(); assert.equal((await first).outcome, 'generated');
  assert.deepEqual(wire.calls, { count: 1, generate: 1 }); assert.equal((await usageRows(f)).length, 1);
});

test('parallel claims for different messages cannot exceed the same monthly budget', async () => {
  const f = await newCase({ monthlyCostLimitMinorUnits: 1 }); const next = await anotherRequest(f);
  const outcomes = await Promise.all([journal.claim(claimInput(f)), journal.claim(claimInput(f, next))]);
  assert.deepEqual(outcomes.map((outcome) => outcome.status).sort(), ['acquired', 'denied']);
  assert.equal((await rows(f)).length, 1);
});

test('settled usage still consumes the budget after the reservation is replaced', async () => {
  const f = await newCase({ monthlyCostLimitMinorUnits: 1 }); const next = await anotherRequest(f);
  await provider(f, transport(f)).generate(f.request);
  assert.deepEqual(await journal.claim(claimInput(f, next)), { status: 'denied' });
  assert.equal((await usageRows(f)).length, 1);
});

test('lost commit acknowledgement for the claim never permits a provider request', async () => {
  const f = await newCase(), wire = transport(f);
  const lost = createPostgresAiGenerationJournal({ queries, transactions: { async transaction(options, work) {
    await transactions.transaction(options, work); throw new Error('lost claim acknowledgement');
  } } });
  await assert.rejects(provider(f, wire, lost).generate(f.request), AiResponseDeferredError);
  assert.equal((await rows(f))[0].status, 'claimed'); assert.equal(wire.calls.generate, 0);
  await assert.rejects(provider(f, wire).generate(f.request), AiResponseDeferredError); assert.equal(wire.calls.generate, 0);
});

test('lost settlement acknowledgement replays both stored result and usage without another dispatch', async () => {
  const f = await newCase(), wire = transport(f); let transactionsRun = 0;
  const lost = createPostgresAiGenerationJournal({ queries, transactions: { async transaction(options, work) {
    const result = await transactions.transaction(options, work); if (++transactionsRun === 2) throw new Error('lost settlement acknowledgement'); return result;
  } } });
  await assert.rejects(provider(f, wire, lost).generate(f.request), AiResponseDeferredError);
  assert.equal((await provider(f, wire).generate(f.request)).outcome, 'generated');
  assert.equal(wire.calls.generate, 1); assert.equal((await usageRows(f)).length, 1);
});

test('settlement write failure rolls back usage and leaves the original claim fenced from redispatch', async () => {
  const f = await newCase(), wire = transport(f);
  const broken = createPostgresAiGenerationJournal({ queries, transactions: { transaction: (options, work) => transactions.transaction(options,
    (tx) => work({ query(statement, parameters) { if (statement === sql.settle) throw new Error('settlement storage unavailable'); return tx.query(statement, parameters); } })) } });
  await assert.rejects(provider(f, wire, broken).generate(f.request), AiResponseDeferredError);
  assert.equal((await usageRows(f)).length, 0); assert.equal((await rows(f))[0].status, 'claimed');
  await assert.rejects(provider(f, wire).generate(f.request), AiResponseDeferredError); assert.equal(wire.calls.generate, 1);
});

test('uncertain network charge holds the reservation and blocks further generation for the agent', async () => {
  const f = await newCase(), next = await anotherRequest(f);
  const wire = transport(f, async () => { throw new Error('response lost after send'); });
  assert.deepEqual(await provider(f, wire).generate(f.request), { outcome: 'unavailable' });
  assert.equal((await rows(f))[0].status, 'uncertain'); assert.equal((await usageRows(f)).length, 0);
  assert.deepEqual(await journal.claim(claimInput(f, next)), { status: 'denied' });
  await provider(f, wire).generate(f.request); assert.equal(wire.calls.generate, 1);
});

test('unpriceable returned model is uncertain; known refused output still records usage', async () => {
  const f = await newCase();
  await provider(f, transport(f, async () => Response.json({ ...f.result, model: 'unapproved' }))).generate(f.request);
  assert.equal((await rows(f))[0].status, 'uncertain'); assert.equal((await usageRows(f)).length, 0);
  const refused = await newCase();
  const result = await provider(refused, transport(refused, async () => Response.json({ ...refused.result, output: [] }))).generate(refused.request);
  assert.equal(result.outcome, 'policy-violation'); assert.equal((await rows(refused))[0].status, 'settled'); assert.equal((await usageRows(refused)).length, 1);
});

test('cost above the reservation or input above the count is recorded and blocks additional work', async () => {
  for (const increase of ['costMinorUnits', 'inputTokens']) {
    const f = await newCase(), claim = claimInput(f); await journal.claim(claim);
    const result = structuredClone(parseOpenAiResponsesResult(f.result, f.request, f.configuration));
    result.usage[increase] = (increase === 'costMinorUnits' ? claim.reservedMinorUnits : claim.countedInputTokens) + 1;
    assert.equal((await journal.settle(claim.binding, result)).outcome, 'unavailable');
    assert.equal((await rows(f))[0].status, 'uncertain'); assert.equal((await usageRows(f)).length, 1);
    assert.deepEqual(await journal.claim(claimInput(f, await anotherRequest(f))), { status: 'denied' });
  }
});

test('claim rollback makes no dispatch; a later successful claim can proceed once', async () => {
  const f = await newCase(), wire = transport(f);
  const broken = createPostgresAiGenerationJournal({ queries, transactions: { transaction: (options, work) => transactions.transaction(options,
    async (tx) => { await work(tx); throw new Error('rollback before commit'); }) } });
  await assert.rejects(provider(f, wire, broken).generate(f.request), AiResponseDeferredError);
  assert.equal((await rows(f)).length, 0); assert.equal(wire.calls.generate, 0);
  assert.equal((await provider(f, wire).generate(f.request)).outcome, 'generated'); assert.equal(wire.calls.generate, 1);
});

test('claim validates server-owned approval mode, active version, budget authorization and source ownership', async () => {
  const automatic = await newCase({ responseMode: 'automatic' });
  assert.deepEqual(await journal.claim(claimInput(automatic)), { status: 'denied' });
  const disabled = await newCase();
  await pool.query("UPDATE ai_agents SET status='inactive' WHERE tenant_id=$1", [disabled.request.tenantId]);
  assert.deepEqual(await journal.claim(claimInput(disabled)), { status: 'denied' });
  const mismatch = await newCase();
  await pool.query('UPDATE ai_runtime_cost_authorizations SET monthly_limit_minor_units=monthly_limit_minor_units+1 WHERE tenant_id=$1', [mismatch.request.tenantId]);
  assert.deepEqual(await journal.claim(claimInput(mismatch)), { status: 'denied' });
  const foreign = await newCase(), other = await newCase();
  assert.deepEqual(await journal.claim(claimInput(foreign, { ...foreign.request, passages: other.request.passages })), { status: 'denied' });
});

test('old-month authorizations cannot dispatch, and an in-flight result still settles after agent deactivation', async () => {
  const old = await newCase();
  await pool.query("UPDATE ai_runtime_cost_authorizations SET period_start=(period_start - INTERVAL '1 month')::date WHERE tenant_id=$1", [old.request.tenantId]);
  assert.deepEqual(await journal.claim(claimInput(old)), { status: 'denied' });
  const f = await newCase(), claim = claimInput(f); await journal.claim(claim);
  await pool.query("UPDATE ai_agents SET status='inactive' WHERE tenant_id=$1", [f.request.tenantId]);
  assert.equal((await journal.settle(claim.binding, parseOpenAiResponsesResult(f.result, f.request, f.configuration))).outcome, 'generated');
  assert.equal((await usageRows(f)).length, 1);
});

test('expired claims block new messages and are never reclaimed or treated as free', async () => {
  const f = await newCase(), claim = claimInput(f); const next = await anotherRequest(f);
  await journal.claim(claim); await pool.query('SELECT pg_sleep(1.1)');
  assert.deepEqual(await journal.observe(claim.binding), { status: 'claimed', expired: true });
  assert.deepEqual(await journal.claim(claimInput(f, next)), { status: 'denied' });
  const wire = transport(f); await assert.rejects(provider(f, wire).generate(f.request), AiResponseDeferredError);
  assert.deepEqual(wire.calls, { count: 0, generate: 0 });
});

test('replay identity is tenant-bound and immutable; terminal records cannot be overwritten', async () => {
  const f = await newCase(), claim = claimInput(f); await journal.claim(claim);
  await assert.rejects(journal.observe({ ...claim.binding, inputDigest: createHash('sha256').update('inputDigest').digest('hex') }));
  await assert.rejects(journal.settle({ ...claim.binding, policyDigest: createHash('sha256').update('policyDigest').digest('hex') }, { outcome: 'unavailable' }));
  const other = await newCase();
  assert.deepEqual(await journal.observe({ ...claim.binding, tenantId: other.request.tenantId }), { status: 'missing' });
  await assert.rejects(journal.settle({ ...claim.binding, tenantId: other.request.tenantId }, { outcome: 'unavailable' }));
  await assert.rejects(pool.query('UPDATE ai_generation_journal SET reserved_minor_units=reserved_minor_units+1 WHERE tenant_id=$1', [f.request.tenantId]), /immutable/);
  await journal.settle(claim.binding, { outcome: 'unavailable' });
  await assert.rejects(pool.query("UPDATE ai_generation_journal SET status='claimed', result_json=NULL, settled_at=NULL WHERE tenant_id=$1", [f.request.tenantId]), /immutable/);
});


test('a completed request replays after price or output-cap changes while settlement remains bound to its original policy', async () => {
  const f = await newCase(), wire = transport(f);
  const original = await provider(f, wire).generate(f.request);
  const updated = { ...f.configuration, model: 'gpt-4o-2024-08-06', maximumOutputTokens: 2048,
    rateCard: { ...f.configuration.rateCard, inputMicroUsdPerMillionTokens: f.configuration.rateCard.inputMicroUsdPerMillionTokens + 1,
      validUntil: '2026-07-28T09:05:00.000Z' } };
  const restarted = createDurableOpenAiResponsesProvider(updated, journal, { now: () => f.now, fetch: wire.fetch });
  assert.deepEqual(await restarted.generate(f.request), original);
  assert.deepEqual(wire.calls, { count: 1, generate: 1 });
  await assert.rejects(restarted.generate({ ...f.request, customerMessage: f.request.customerMessage + '?' }), AiResponseDeferredError);
  assert.equal(wire.calls.generate, 1);
});
