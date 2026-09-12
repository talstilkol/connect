import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMetaDataSyncView, metaDataSyncViewStages, metaDataSyncViewRequestStatuses } from '../shared/domain/metaDataSyncView.ts';
import { parseRailwayMetaConnectionView } from '../server/meta/railwayMetaConnectionResult.ts';
import { readMetaDataSyncMessages } from '../features/workspace/metaDataSyncMessages.ts';

const view = { stage: 'projecting-history', contacts: 'accepted', history: 'accepted', providerProgress: 55, receivedChunks: 2, processedChunks: 1, projectedMessages: 100 };
test('sync view is copied, frozen and does not equate request acceptance or provider progress with complete', () => {
  const parsed = parseMetaDataSyncView(view);
  assert.deepEqual(parsed, view); assert.ok(Object.isFrozen(parsed)); assert.notEqual(parsed, view);
  assert.equal(metaDataSyncViewStages.includes('complete'), false);
  assert.deepEqual(parseRailwayMetaConnectionView({ status: 'connected', dataSync: view }), { status: 'connected', dataSync: view });
  assert.deepEqual(parseRailwayMetaConnectionView({ status: 'connected' }), { status: 'connected' });
});
test('public sync view rejects private fields, impossible counts and invented states', () => {
  for (const change of [{ requestId: 'private' }, { tenantId: 7 }, { stage: 'complete' }, { contacts: 'success' },
    { providerProgress: 101 }, { providerProgress: 1.5 }, { receivedChunks: -1 }, { processedChunks: 3 },
    { projectedMessages: Number.MAX_SAFE_INTEGER + 1 }, { projectedMessages: '100' }]) {
    assert.equal(parseMetaDataSyncView({ ...view, ...change }), null);
    assert.equal(parseRailwayMetaConnectionView({ status: 'connected', dataSync: { ...view, ...change } }), null);
  }
  assert.equal(parseRailwayMetaConnectionView({ status: 'connected', dataSync: null }), null);
});
test('hidden history cannot carry stale progress and local processing never establishes completeness', () => {
  for (const stage of ['awaiting-registration', 'connection-changed', 'sharing-declined', 'conflicted', 'import-review-required']) {
    assert.equal(parseMetaDataSyncView({ ...view, stage }), null);
    assert.ok(parseMetaDataSyncView({ ...view, stage, providerProgress: null, receivedChunks: 0, processedChunks: 0, projectedMessages: 0 }));
  }
  assert.equal(parseMetaDataSyncView({ ...view, stage: 'awaiting-verification', providerProgress: 100 }), null);
  assert.ok(parseMetaDataSyncView({ ...view, stage: 'awaiting-verification', providerProgress: 100, processedChunks: 2 }));
});
test('every lifecycle and request state has Hebrew, English and Arabic text with an explicit verification notice', () => {
  for (const language of ['he', 'en', 'ar']) {
    const messages = readMetaDataSyncMessages(language);
    assert.deepEqual(Object.keys(messages.stages).sort(), [...metaDataSyncViewStages].sort());
    assert.deepEqual(Object.keys(messages.requests).sort(), [...metaDataSyncViewRequestStatuses].sort());
    assert.ok(Object.values(messages.stages).every((text) => text.trim().length > 0));
    assert.ok(messages.verificationNotice.length > 0); assert.ok(messages.recoveryNotice.length > 0); assert.ok(messages.refresh.length > 0);
  }
});
