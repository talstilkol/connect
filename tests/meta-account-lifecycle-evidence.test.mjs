import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMetaAccountLifecycleObservation, normalizeMetaAccountLifecycleObservation } from '../server/meta/metaAccountLifecycleRecord.ts';
import { createMetaWebhookBusinessBatchProcessor } from '../server/meta/metaWebhookBusinessProcessor.ts';
import { createPostgresMetaAccountLifecycleRepository } from '../server/platform/postgresMetaAccountLifecycleRepository.ts';
const event = { kind: 'account_update', occurredAt: 1788944400, value: { event: 'PARTNER_REMOVED', waba_info: { waba_id: '200002', owner_business_id: '100001' },
  phone_number: '15550783881', disconnection_info: { reason: 'PRIMARY_INACTIVITY', initiated_by: 'SYSTEM' } } };
const connection = { tenantId: 7, wabaId: '200002', phoneNumberId: '300003', businessPortfolioId: '100001', version: 2, status: 'connected' };
const batch = { tenantId: 7, receiptId: 9, eventKey: 'a'.repeat(64), connection, events: [event] };

test('normalizes documented lifecycle observations without inventing missing phone or disconnection facts', () => {
  const parsed = parseMetaAccountLifecycleObservation(event, connection.wabaId);
  assert.deepEqual(parsed, { event: 'PARTNER_REMOVED', occurredAt: new Date(event.occurredAt * 1000).toISOString(), ownerBusinessId: '100001',
    reportedPhoneNumber: '+15550783881', reason: 'PRIMARY_INACTIVITY', initiatedBy: 'SYSTEM' });
  assert.ok(Object.isFrozen(parsed));
  assert.deepEqual(parseMetaAccountLifecycleObservation({ ...event, value: { event: 'ACCOUNT_OFFBOARDED' } }, connection.wabaId),
    { event: 'ACCOUNT_OFFBOARDED', occurredAt: parsed.occurredAt, ownerBusinessId: null, reportedPhoneNumber: null, reason: null, initiatedBy: null });
});
test('strictly validates event time and scopes while preserving bounded future reason values', () => {
  for (const changed of [{ occurredAt: null }, { occurredAt: 0 }, { occurredAt: 1.5 }, { occurredAt: 253402300800 },
    { value: { event: 'UNKNOWN' } }, { value: { event: 'PARTNER_REMOVED', waba_info: { waba_id: 'other' } } },
    { value: { event: 'PARTNER_REMOVED', phone_number: 'phone-id' } }, { value: { event: 'PARTNER_REMOVED', disconnection_info: { reason: 'bad\nvalue' } } }]) {
    assert.throws(() => parseMetaAccountLifecycleObservation({ ...event, ...changed }, connection.wabaId));
  }
  assert.equal(parseMetaAccountLifecycleObservation({ ...event, value: { event: 'PARTNER_REMOVED', disconnection_info: { reason: 'FUTURE_PROVIDER_REASON' } } }, connection.wabaId).reason, 'FUTURE_PROVIDER_REASON');
});
test('timestamp normalization rejects noncanonical milliseconds and impossible dates', () => {
  const parsed = parseMetaAccountLifecycleObservation(event, connection.wabaId);
  for (const occurredAt of ['2026-02-30T00:00:00.000Z', '2026-09-09T09:00:00.001Z', 'not-a-time']) assert.throws(() => normalizeMetaAccountLifecycleObservation({ ...parsed, occurredAt }));
});
test('durable lifecycle handling receives the claimed receipt and suppresses bundled business work', async () => {
  const calls = [];
  const processor = createMetaWebhookBusinessBatchProcessor({ conversations: { async resolveInboundContact() { assert.fail('No messages'); } }, templates: {},
    accounts: { async revokeConnection() { assert.fail('No separate non-atomic revocation'); } },
    accountLifecycle: { async recordBatch(command) { calls.push(command); } } });
  await processor({ ...batch, events: [{ kind: 'inbound_messages', messages: [{}] }, event] });
  assert.equal(calls.length, 1); assert.equal(calls[0].receiptId, 9); assert.equal(calls[0].eventKey, batch.eventKey);
  assert.equal(calls[0].connectionVersion, 2); assert.deepEqual(calls[0].events, [parseMetaAccountLifecycleObservation(event, connection.wabaId)]);
});
test('every lifecycle event is preflighted before any durable write', async () => {
  const processor = createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {}, accountLifecycle: { async recordBatch() { assert.fail('Preflight must fail first'); } } });
  await assert.rejects(processor({ ...batch, events: [event, { ...event, value: { event: 'PARTNER_REMOVED', phone_number: 'bad' } }] }));
  await assert.rejects(processor({ ...batch, events: [{ ...event, value: { event: 'PARTNER_REMOVED', waba_info: { waba_id: connection.wabaId, owner_business_id: '999999' } } }] }));
});
test('unconfigured account handling and unavailable evidence storage cannot acknowledge success', async () => {
  await assert.rejects(createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {} })(batch));
  const processor = createMetaWebhookBusinessBatchProcessor({ conversations: {}, templates: {}, accountLifecycle: { async recordBatch() { throw new Error('storage unavailable'); } } });
  await assert.rejects(processor(batch), /storage unavailable/);
});
test('repository input rejects forged identity, foreign owner and excessive batches before a transaction', async () => {
  const repository = createPostgresMetaAccountLifecycleRepository({ async transaction() { assert.fail('Invalid input must not query'); } });
  const command = { ...connection, receiptId: 9, eventKey: batch.eventKey, connectionVersion: 2, events: [parseMetaAccountLifecycleObservation(event, connection.wabaId)] };
  for (const changed of [{ tenantId: 0 }, { receiptId: -1 }, { eventKey: 'not-a-hash' }, { phoneNumberId: '../wrong' },
    { events: [] }, { events: Array.from({ length: 101 }, () => command.events[0]) }, { events: [{ ...command.events[0], ownerBusinessId: '999999' }] }]) {
    await assert.rejects(repository.recordBatch({ ...command, ...changed }));
  }
});
