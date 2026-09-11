import { bindPaidFixture } from '../fixtures/paid-access-postgres.mjs';
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
before(async (context) => {
  context.diagnostic(`PostgreSQL ${(await pool.query("SHOW server_version")).rows[0].server_version}`);
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
    let claimed=false;const result=await transactions.transaction(options,tx=>work({query(statement,parameters){if(statement===sql.insert)claimed=true;return tx.query(statement,parameters);}}));if(claimed)throw new Error('lost claim acknowledgement');return result;
  } } });
  await assert.rejects(provider(f, wire, lost).generate(f.request), AiResponseDeferredError);
  assert.equal((await rows(f))[0].status, 'claimed'); assert.equal(wire.calls.generate, 0);
  await assert.rejects(provider(f, wire).generate(f.request), AiResponseDeferredError); assert.equal(wire.calls.generate, 0);
});

test('lost settlement acknowledgement replays both stored result and usage without another dispatch', async () => {
  const f = await newCase(), wire = transport(f);
  const lost = createPostgresAiGenerationJournal({ queries, transactions: { async transaction(options, work) {
    let settled=false;const result=await transactions.transaction(options,tx=>work({query(statement,parameters){if(statement===sql.settle)settled=true;return tx.query(statement,parameters);}}));if(settled)throw new Error('lost settlement acknowledgement');return result;
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

// The delivery rehearsal reuses the existing AI, conversation and Meta wire fixtures.
import { createPostgresAiReplyDeliveryRepository } from '../../server/platform/postgresAiReplyDeliveryRepository.ts';
import { postgresAiReplyDeliverySql as deliverySql } from '../../server/platform/postgresAiReplyDeliverySql.ts';
import { createPostgresAiReplyOutboxRepository } from '../../server/platform/postgresAiReplyOutboxRepository.ts';
import { createPostgresRailwayAiReplyApprovalMutationExecutor } from '../../server/platform/postgresRailwayAiReplyApprovalMutationExecutor.ts';
import { createPostgresConversationRepository } from '../../server/platform/postgresConversationRepository.ts';
import { createPostgresManualReplyRepository, postgresManualReplySql, ManualReplyError } from '../../server/platform/postgresManualReplyRepository.ts';
import { createPostgresWhatsappCampaignDeliveryPolicyRepository } from '../../server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts';
import { deriveRailwayApiDeterministicIdempotencyKey, deriveRailwayApiMutationRequestDigest } from '../../server/platform/railwayApiMutationExecutor.ts';
import { deriveAiRuntimeAuditKey } from '../../server/ai/aiRuntimeKey.ts';
import { deriveAiReplyOutboxKey } from '../../server/ai/aiReplyOutboxKey.ts';
import { createTextReplyDeliveryWorker, createMetaTextReplySender } from '../../server/conversations/manualReplyWorker.ts';
import { toSensitiveMetaAccessToken } from '../../server/meta/metaPorts.ts';
import { MetaGraphError } from '../../server/meta/metaGraphTransport.ts';
const deliveries = createPostgresAiReplyDeliveryRepository({ queries, transactions });
const conversations = createPostgresConversationRepository({ queries, transactions });
const approvalOutbox = createPostgresAiReplyOutboxRepository({ queries, transactions });
const approvals = createPostgresRailwayAiReplyApprovalMutationExecutor(transactions);
const policies = createPostgresWhatsappCampaignDeliveryPolicyRepository({ queries, transactions });
const reservationKey = `whatsapp_rate_reservation_v1_${'9'.repeat(64)}`;
const hash = (value) => createHash('sha256').update(value).digest('hex');
const deliveryRows = async (f) => (await pool.query('SELECT * FROM ai_reply_deliveries WHERE tenant_id=$1', [f.request.tenantId])).rows;
const barrierMutation = (tenant, statement, values) => transactions.transaction({ isolationLevel: 'read-committed' }, async (tx) => {
  await tx.query(postgresManualReplySql.barrier, [tenant]); return tx.query(statement, values);
});
async function deliveryCase({ approve = true, assets = true, expired = false } = {}) {
  const f = await newCase(); const tenant = f.request.tenantId;
  const identity = { conversationKey: `conversation_v1_${hash(`conversation:${tenant}`)}`, inboundMessageKey: `message_v1_${hash(`inbound:${tenant}`)}`,
    aiAgentVersionKey: f.request.aiAgentVersionKey };
  const passage = { ...f.request.passages[0], passageKey: `knowledge_passage_v1_${hash(`passage:${tenant}`)}` };
  f.request = { ...f.request, requestKey: await deriveAiProviderRequestKey(tenant, identity), passages: [passage] };
  f.result.output[0].content[0].text = JSON.stringify({ answerable: true, text: 'תשובה המבוססת על המקור המאושר.', groundedPassageKeys: [passage.passageKey] });
  await authorize(f, f.request);
  const generated = await provider(f, transport(f)).generate(f.request); assert.equal(generated.outcome, 'generated');
  const session = { tenantId: tenant, externalUserId: 'driver-integration-owner', displayName: f.runtime.input.agent.name, status: 'active', role: 'owner' };
  await pool.query("INSERT INTO tenant_memberships (tenant_id,external_user_id,role,status) VALUES ($1,$2,'owner','active'), ($1,'template-submission-integration-owner','owner','active')", [tenant, session.externalUserId]);
  const contact = await conversations.resolveInboundContact(tenant, '+972509876541');
  const at = (await pool.query("SELECT date_trunc('milliseconds', statement_timestamp()) AS now")).rows[0].now.toISOString();
  await conversations.recordInboundMessage({ tenantId: tenant, conversationKey: identity.conversationKey, messageKey: identity.inboundMessageKey,
    contactId: contact.contactId, providerMessageId: 'driver-conversation-inbound-1', contentKind: 'text', textContent: f.request.customerMessage, occurredAt: expired ? new Date(Date.parse(at)-25*3600000).toISOString() : at });
  await pool.query(`INSERT INTO knowledge_sources (source_key,tenant_id,content_sha256,file_name,media_type,size_bytes,storage_object_key,status,ready_at)
    VALUES ($1,$2,$3,$4,'text/plain',$5,$6,'ready',$7)`, [passage.sourceKey, tenant, 'd'.repeat(64), 'knowledge.txt', Buffer.byteLength(passage.content), `knowledge/v1/${passage.sourceKey}`, at]);
  await pool.query('INSERT INTO knowledge_passages (passage_key,tenant_id,source_key,passage_ordinal,content_sha256,content) VALUES ($1,$2,$3,1,$4,$5)', [passage.passageKey, tenant, passage.sourceKey, hash(passage.content), passage.content]);
  await pool.query('INSERT INTO ai_agent_version_sources (tenant_id,ai_agent_version_key,source_key) VALUES ($1,$2,$3)', [tenant, identity.aiAgentVersionKey, passage.sourceKey]);
  const auditKey = await deriveAiRuntimeAuditKey(tenant, identity);
  const audit = await persistence.auditSink.record({ ...f.runtime.auditEvents[0], ...identity, tenantId: tenant, auditKey, requestKey: f.request.requestKey,
    aiAgentKey: f.runtime.input.agent.aiAgentKey, expectedConversationVersion: 2, costMinorUnits: generated.usage.costMinorUnits });
  assert.equal(audit.outcome, "recorded");
  const outboxKey = await deriveAiReplyOutboxKey(tenant, f.request.requestKey);
  await approvalOutbox.stage({ ...identity, tenantId: tenant, outboxKey, auditKey, requestKey: f.request.requestKey,
    aiAgentKey: f.runtime.input.agent.aiAgentKey, expectedConversationVersion: 2, recipientPhoneNumber: '+972509876541', responseMode: 'agent-approval',
    replyText: generated.text, groundedSourceKeys: [passage.sourceKey], groundingScoreBasisPoints: 9000 });
  const operation = 'ai.reply-approvals.decide', payload = { outboxKey, expectedVersion: 1, decision: 'approve' };
  const command = { session, operation, payload, idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(operation, payload),
    requestDigest: await deriveRailwayApiMutationRequestDigest(operation, payload) };
  if (approve) assert.equal((await approvals.execute(command)).outcome, 'committed');
  if (assets) {
    await pool.query(`INSERT INTO meta_connections (tenant_id,business_portfolio_id,waba_id,phone_number_id,status,webhook_subscribed_at,connected_at)
      VALUES ($1,$4,$2,$3,'connected',date_trunc('milliseconds', statement_timestamp()),date_trunc('milliseconds', statement_timestamp()))`, [tenant, String(200002+tenant), String(300003+tenant), String(100001+tenant)]);
    await barrierMutation(tenant, "INSERT INTO meta_credential_envelopes (tenant_id,key_version,initialization_vector,ciphertext) VALUES ($1,'v1','AQIDBAUGBwgJCgsM','AQIDBAUGBwgJCgsMDQ4PEA==')", [tenant]);
    const policyAt = (await pool.query("SELECT date_trunc('milliseconds', statement_timestamp()) AS now")).rows[0].now.toISOString();
    await policies.recordPolicyEvent({ tenantId: tenant, connectionVersion: 1, expectedPolicyVersion: 0, deliveryState: 'enabled',
      portfolioLimitKind: 'bounded', portfolioLimitValue: 250, phoneThroughputMessagesPerSecond: 20, maximumOutboundMessagesPerSecond: 2,
      reservationDurationSeconds: 300, metaGraphApiVersion: 'v21.0', evidenceDigest: 'b'.repeat(64),
      evidenceCheckedAt: new Date(Date.parse(at)-60000).toISOString(), evidenceExpiresAt: new Date(Date.parse(at)+86400000).toISOString(),
      actorExternalUserId: 'tal-rate-limit-research', recordedAt: policyAt });
  }
  return { ...f, identity, contact, command, outboxKey, generated, at };
}
function deliveryWorker(repository = deliveries, send = async () => 'wamid.bot-reply-provider-17', beforeSeal = async () => {}) {
  const calls = [];
  const sender = createMetaTextReplySender({ async requestJson(request) { calls.push(request); return { messaging_product: 'whatsapp', messages: [{ id: await send() }] }; } });
  const worker = createTextReplyDeliveryWorker({ replies: repository,
    admission: { isConfigured: () => true, async reserve() { return { outcome: 'reserved', reservationKey }; },
      async settleBeforeSubmit() {}, async settleProviderFailure() {}, async deferProviderRejection() {} },
    vault: { async withAccessToken(_tenant, sendWithToken) { await beforeSeal(); return sendWithToken(toSensitiveMetaAccessToken('bot-reply-access-token')); } }, sender });
  return { worker, calls };
}

test('AI approval produces one durable delivery under concurrent staging and claims; acceptance projects one message and webhook status', async () => {
  const f = await deliveryCase(); await Promise.all([deliveries.recover(), deliveries.recover()]);
  assert.equal((await deliveryRows(f)).length, 1);
  const claims = (await Promise.all([deliveries.claim(), deliveries.claim()])).filter(Boolean); assert.equal(claims.length, 1);
  const claim = claims[0]; assert.match(claim.deliveryKey, /^ai_reply_delivery_v1_/);
  assert.equal(await deliveries.seal({ ...claim, tenantId: claim.tenantId + 100000 }, reservationKey), false);
  assert.deepEqual((await Promise.all([deliveries.seal(claim, reservationKey), deliveries.seal(claim, reservationKey)])).sort(), [false, true]);
  await Promise.all([deliveries.accepted(claim, 'wamid.bot-reply-provider-17'), deliveries.accepted(claim, 'wamid.bot-reply-provider-17')]);
  assert.equal((await deliveryRows(f))[0].state, 'sent');
  assert.equal((await pool.query("SELECT * FROM messages WHERE tenant_id=$1 AND direction='outbound'", [claim.tenantId])).rowCount, 1);
  const status = { tenantId: claim.tenantId, providerMessageId: 'wamid.bot-reply-provider-17', status: 'delivered',
    statusEventKey: hash('delivered'), statusEventAt: new Date().toISOString() };
  assert.equal((await conversations.applyDeliveryStatus(status)).outcome, 'applied');
  const updated = await conversations.applyDeliveryStatus({ ...status, status: 'read', statusEventKey: hash('read'), statusEventAt: new Date(Date.now()+1000).toISOString() });
  assert.equal(updated.message.status, 'read');
  assert.equal(await deliveries.claim(), null);
  const logs = (await pool.query("SELECT action FROM audit_logs WHERE tenant_id=$1 AND target_type='ai_reply_delivery'", [claim.tenantId])).rows;
  assert.deepEqual(logs.map((r) => r.action).sort(), ['preparing','queued','sending','sent'].map((s) => `ai.reply-delivery.${s}`).sort());
});

test('AI sends the exact approved text once through the shared text transport', async () => {
  const f = await deliveryCase(); const { worker, calls } = deliveryWorker(); await worker.run(); await worker.run();
  assert.equal(calls.length, 1); assert.equal(calls[0].method, 'POST'); assert.deepEqual(calls[0].pathSegments, [String(300003+f.request.tenantId),'messages']);
  assert.equal(calls[0].jsonBody.text.body, f.generated.text); assert.equal(calls[0].jsonBody.to, '972509876541');
  assert.equal((await deliveryRows(f))[0].state, 'sent');
});

test('an approval without its API receipt and audit is never staged; approved payload edits are rejected by PostgreSQL', async () => {
  const f = await deliveryCase({ approve: false });
  await approvalOutbox.decide({ tenantId: f.request.tenantId, outboxKey: f.outboxKey, expectedVersion: 1, decision: 'approve',
    decidedByExternalUserId: f.command.session.externalUserId, decidedAt: new Date().toISOString() });
  await deliveries.recover(); assert.equal((await deliveryRows(f)).length, 0);
  await assert.rejects(pool.query('UPDATE ai_reply_outbox SET reply_text=$2 WHERE tenant_id=$1', [f.request.tenantId, f.request.customerMessage]), /immutable/);
});

test('new inbound, human takeover, revoked membership, disabled agent and withdrawn knowledge prevent an unsent AI reply', async () => {
  for (const mutation of [
    async (f) => conversations.recordInboundMessage({ tenantId: f.request.tenantId, conversationKey: f.identity.conversationKey,
      messageKey: `message_v1_${hash(`new-inbound:${f.request.tenantId}`)}`, contactId: f.contact.contactId,
      providerMessageId: 'driver-conversation-inbound-2', contentKind: 'text', textContent: f.request.customerMessage, occurredAt: new Date().toISOString() }),
    "UPDATE conversations SET status='agent_active', assigned_external_user_id='driver-integration-owner' WHERE tenant_id=$1",
    "UPDATE tenant_memberships SET status='suspended', version=version+1 WHERE tenant_id=$1 AND external_user_id='driver-integration-owner'",
    "UPDATE ai_agents SET status='inactive' WHERE tenant_id=$1",
    "UPDATE knowledge_sources SET status='archived' WHERE tenant_id=$1",
  ]) {
    const f = await deliveryCase(); const { worker, calls } = deliveryWorker(deliveries, undefined, () => typeof mutation === "function" ? mutation(f) : pool.query(mutation, [f.request.tenantId]));
    await worker.run(); assert.equal(calls.length, 0); assert.equal((await deliveryRows(f))[0].state, 'failed');
  }
});

test('service window expiry and source revocation before claim become visible failed delivery intents', async () => {
  for (const mutation of [null,
    "UPDATE knowledge_sources SET status='archived' WHERE tenant_id=$1"]) {
    const f = await deliveryCase({ expired: mutation === null }); if (mutation) await pool.query(mutation, [f.request.tenantId]); const { worker, calls } = deliveryWorker();
    await worker.run(); assert.equal(calls.length, 0); assert.equal((await deliveryRows(f))[0].state, 'failed');
    const pending = await createPostgresManualReplyRepository({ queries, transactions }).list(f.request.tenantId, f.identity.conversationKey);
    assert.equal(pending.length, 1); assert.equal(pending[0].state, 'failed');
  }
});

test('timeout, 5xx, lost acceptance acknowledgement and lost seal acknowledgement never redispatch', async () => {
  for (const fault of ['timeout','5xx','acceptance','seal']) {
    const f = await deliveryCase(); let first = true;
    const repository = fault === 'seal' || fault === 'acceptance' ? { ...deliveries, async [fault === 'seal' ? 'seal' : 'accepted'](...args) {
      const result = await deliveries[fault === 'seal' ? 'seal' : 'accepted'](...args);
      if (first) { first = false; throw new Error('lost commit acknowledgement'); } return result;
    } } : deliveries;
    const { worker, calls } = deliveryWorker(repository, async () => {
      if (fault === 'timeout') throw new MetaGraphError('TIMEOUT','Unavailable');
      if (fault === '5xx') throw new MetaGraphError('API_ERROR','Unavailable',{ httpStatus: 503 });
      return 'wamid.bot-reply-provider-17';
    });
    await worker.run(); await worker.run();
    assert.equal(calls.length, fault === 'seal' ? 0 : 1);
    assert.equal((await deliveryRows(f))[0].state, fault === 'acceptance' ? 'sent' : fault === 'seal' ? 'sending' : 'unknown');
    await assert.rejects(pool.query("UPDATE ai_reply_deliveries SET state='queued' WHERE tenant_id=$1", [f.request.tenantId]), /transition|check constraint/);
  }
});

test('acceptance after human takeover retains the assignment and newer inbound projection', async () => {
  const f = await deliveryCase(); await deliveries.recover(); const claim = await deliveries.claim(); assert.ok(claim);
  await deliveries.seal(claim, reservationKey);
  const nextKey = `message_v1_${hash(`next:${claim.tenantId}`)}`;
  const at = new Date(Date.now()+1000).toISOString();
  await conversations.recordInboundMessage({ tenantId: claim.tenantId, conversationKey: f.identity.conversationKey, messageKey: nextKey,
    contactId: f.contact.contactId, providerMessageId: 'driver-conversation-inbound-2', contentKind: 'text', textContent: f.request.customerMessage, occurredAt: at });
  await pool.query("UPDATE conversations SET status='agent_active', assigned_external_user_id='driver-integration-owner' WHERE tenant_id=$1", [claim.tenantId]);
  await deliveries.accepted(claim, 'wamid.bot-reply-provider-17');
  const row = (await pool.query('SELECT * FROM conversations WHERE tenant_id=$1', [claim.tenantId])).rows[0];
  assert.equal(row.last_message_key, nextKey); assert.equal(row.status, 'agent_active'); assert.equal(row.assigned_external_user_id, 'driver-integration-owner');
});

function deliveryFault(statement, replace) {
  return createPostgresAiReplyDeliveryRepository({ queries, transactions: { transaction: (options, run) => transactions.transaction(options,
    (tx) => run({ query(sql, values) { return tx.query(sql === statement ? replace(sql) : sql, values); } })) } });
}
test('expired preparation can be reclaimed while the old claim cannot seal; expired sending becomes unknown without another claim', async () => {
  const f = await deliveryCase(); const expired = deliveryFault(deliverySql.prepare, (sql) => sql.replace("interval '60 seconds'", "interval '-1 seconds'"));
  await expired.recover(); const old = await expired.claim(); assert.ok(old);
  assert.equal(await deliveries.seal(old, reservationKey), false);
  const current = await deliveries.claim(); assert.equal(current.claimVersion, old.claimVersion+1);
  assert.equal(await deliveries.seal(old, reservationKey), false);
  const stale = deliveryFault(deliverySql.seal, (sql) => sql.replace("provider_started_at = date_trunc('milliseconds', statement_timestamp())", "provider_started_at = date_trunc('milliseconds', statement_timestamp()) - interval '3 minutes'"));
  await stale.seal(current, reservationKey); await deliveries.recover();
  assert.equal((await deliveryRows(f))[0].state, 'unknown'); assert.equal(await deliveries.claim(), null);
});

test('explicit provider rejection is terminal and a later worker never resends it', async () => {
  const f = await deliveryCase(); const { worker, calls } = deliveryWorker(deliveries, async () => {
    throw new MetaGraphError('API_ERROR','Rejected',{ httpStatus: 400, graphCode: 131047 });
  });
  await worker.run(); await worker.run(); assert.equal(calls.length, 1);
  const row = (await deliveryRows(f))[0]; assert.equal(row.state, 'failed'); assert.equal(row.error_code, 'SERVICE_WINDOW_CLOSED');
});

test('an unresolved AI POST prevents a concurrent human reply even through a direct API command', async () => {
  const f = await deliveryCase(); await deliveries.recover(); const claim = await deliveries.claim();
  await deliveries.seal(claim, reservationKey); await deliveries.unknown(claim);
  await pool.query("UPDATE conversations SET status='agent_active', assigned_external_user_id='driver-integration-owner' WHERE tenant_id=$1", [claim.tenantId]);
  const expectedVersion = (await pool.query('SELECT version FROM conversations WHERE tenant_id=$1', [claim.tenantId])).rows[0].version;
  const operation = 'conversations.reply.send'; const payload = { conversationKey: f.identity.conversationKey, expectedVersion, text: f.generated.text };
  await assert.rejects(createPostgresManualReplyRepository({ queries, transactions }).enqueue({ session: f.command.session, payload,
    idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(operation, payload), requestDigest: await deriveRailwayApiMutationRequestDigest(operation, payload) }),
    (error) => error instanceof ManualReplyError && error.code === 'CONFLICT');
  assert.equal((await pool.query('SELECT * FROM manual_reply_outbox WHERE tenant_id=$1', [claim.tenantId])).rowCount, 0);
});

import { createPostgresWhatsappRateLimitRepository } from '../../server/platform/postgresWhatsappRateLimitRepository.ts';
import { createBotReplyAdmission } from '../../server/bot/botReplyAdmission.ts';
import { createWhatsappRateLimitKeyDeriver } from '../../server/campaigns/whatsappRateLimitKeyDeriver.ts';
import { createCampaignDeliveryRateLimitPolicySource } from '../../server/campaigns/d1CampaignDeliveryRateLimitPolicySource.ts';
test('AI provider throttling settles the real shared ledger and imposes sender or pair cooldown before any further send', async () => {
  const rateRepository = createPostgresWhatsappRateLimitRepository({ queries, transactions });
  const keyDeriver = createWhatsappRateLimitKeyDeriver({ WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=' });
  const admission = createBotReplyAdmission(rateRepository, keyDeriver, createCampaignDeliveryRateLimitPolicySource(policies));
  for (const graphCode of [130429,131056]) {
    const f = await deliveryCase(); let sends = 0; const admissionErrors = [];
    const worker = createTextReplyDeliveryWorker({ replies: deliveries, admission: { ...admission, async reserve(input) {
      try { return await admission.reserve(input); } catch (error) { admissionErrors.push(error.message); throw error; }
    } },
      vault: { async withAccessToken(_tenant, sendWithToken) { return sendWithToken(toSensitiveMetaAccessToken('bot-reply-access-token')); } },
      sender: { async send() { sends++; throw new MetaGraphError('API_ERROR','Rejected',{ httpStatus: 429, graphCode, retryAfterSeconds: graphCode === 130429 ? 6 : null }); } } });
    await worker.run(); await worker.run(); assert.deepEqual(admissionErrors, []); assert.equal(sends, 1);
    assert.equal((await deliveryRows(f))[0].state, 'failed');
    const scoped = await keyDeriver.deriveServiceReply({ businessPortfolioId: String(100001+f.request.tenantId), phoneNumberId: String(300003+f.request.tenantId),
      recipientPhoneNumber: '+972509876541', deliveryKey: (await deliveryRows(f))[0].delivery_key, deliveryAttemptNumber: 1 });
    assert.equal((await pool.query('SELECT * FROM whatsapp_rate_limit_settlements WHERE reservation_key=$1', [scoped.reservationKey])).rowCount, 1);
    const cooldowns = (await pool.query('SELECT * FROM whatsapp_provider_cooldown_events WHERE reservation_key=$1', [scoped.reservationKey])).rows;
    assert.equal(cooldowns.length, 1); assert.equal(cooldowns[0].scope, graphCode === 130429 ? "sender" : "pair");
  }
});

test('canceled paid entitlement stops both input counting and generation without creating a charge reservation',async()=>{
  const f=await newCase(),wire=transport(f);await bindPaidFixture(pool,f.request.tenantId,'user_knowledge_owner','canceled');
  assert.deepEqual(await provider(f,wire).generate(f.request),{outcome:'unavailable'});assert.deepEqual(wire.calls,{count:0,generate:0});assert.deepEqual(await rows(f),[]);
});
test('revocation during input counting is checked again before the durable generation claim',async()=>{
  const f=await newCase(),paid=await bindPaidFixture(pool,f.request.tenantId,'user_knowledge_owner'),wire=transport(f);
  const guarded={fetch:async(url,options)=>{const response=await wire.fetch(url,options);if(url.endsWith('/input_tokens'))await paid.cancel();return response;}};
  assert.deepEqual(await provider(f,guarded).generate(f.request),{outcome:'unavailable'});assert.deepEqual(wire.calls,{count:1,generate:0});assert.deepEqual(await rows(f),[]);
});
test('accepted generation usage settles after paid access is revoked during the provider call',async()=>{
  const f=await newCase(),paid=await bindPaidFixture(pool,f.request.tenantId,'user_knowledge_owner');
  const wire=transport(f,async()=>{await paid.cancel();return Response.json(f.result);});
  assert.equal((await provider(f,wire).generate(f.request)).outcome,'generated');assert.equal((await usageRows(f)).length,1);assert.equal((await rows(f))[0].status,'settled');
});

test('AI reply cancellation between queue admission and final seal prevents a provider request',async()=>{
  const f=await deliveryCase();const paid=await bindPaidFixture(pool,f.request.tenantId,f.command.session.externalUserId);
  await deliveries.recover();const d=deliveryWorker(deliveries,async()=>{assert.fail('No provider request after cancellation');},async()=>paid.cancel());
  await d.worker.run();assert.equal(d.calls.length,0);assert.equal((await deliveryRows(f))[0].state,'failed');
});
