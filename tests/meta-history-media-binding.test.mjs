import assert from 'node:assert/strict';
import test from 'node:test';
import { isMetaHistoryMediaCompatible } from '../server/meta/metaHistoryMediaBinding.ts';
import { normalizeMetaHistorySync, parseMetaHistorySync } from '../server/meta/metaHistorySync.ts';
import { scope, customerPhone, message, chunk, value, mediaValue } from './fixtures/meta-history.mjs';

const parse = (v) => parseMetaHistorySync({ kind: 'history', value: v }, scope.phoneNumberId)[0];
const placeholder = parse(value([chunk({ threads: [{ id: customerPhone, messages: [message({ id: 'wamid.history-media', type: 'media_placeholder', text: undefined })] }] })])).messages[0];
const media = parse(mediaValue());

test('separate media enriches a placeholder without replacing original direction, timestamp or delivery state', () => {
  const original = structuredClone(placeholder);
  assert.notEqual(media.reportedAt, placeholder.occurredAt);
  assert.equal(isMetaHistoryMediaCompatible(placeholder, media), true);
  assert.deepEqual(placeholder, original);
  assert.equal(isMetaHistoryMediaCompatible({ ...placeholder, providerMessageId: 'wamid.other' }, media), false);
});

test('all supported media types can resolve the same kind of historical placeholder', () => {
  for (const kind of ['image', 'audio', 'video', 'document', 'sticker']) {
    const normalized = normalizeMetaHistorySync(scope, { ...media, contentKind: kind }).item;
    assert.equal(isMetaHistoryMediaCompatible(placeholder, normalized), true);
  }
});

test('media cannot replace text or a different known content type', () => {
  for (const contentKind of ['text', 'audio', 'contacts', 'location', 'interactive']) {
    assert.equal(isMetaHistoryMediaCompatible({ ...placeholder, contentKind, content: { body: 'original' } }, media), false);
  }
});

test('typed media permits enrichment but rejects incompatible overlapping original fields', () => {
  const typed = { ...placeholder, contentKind: 'image', content: { caption: 'preserved caption' } };
  assert.equal(isMetaHistoryMediaCompatible(typed, media), true);
  assert.equal(isMetaHistoryMediaCompatible(typed, { ...media, content: { ...media.content, caption: 'preserved caption' } }), true);
  for (const key of ['id', 'mime_type', 'sha256', 'caption']) {
    assert.equal(isMetaHistoryMediaCompatible({ ...typed, content: { [key]: 'original value' } },
      { ...media, content: { ...media.content, [key]: 'changed value' } }), false);
  }
});

test('canonical nested metadata compares by content after normalization, without choosing an arrival-order winner', () => {
  const normalized = normalizeMetaHistorySync(scope, { ...media, content: { ...media.content, metadata: { z: 2, a: 1 } } }).item;
  const typed = normalizeMetaHistorySync(scope, { kind: 'chunk', phase: 0, chunkOrder: 1, progress: 55,
    messages: [{ ...placeholder, contentKind: 'image', content: { metadata: { a: 1, z: 2 } } }] }).item.messages[0];
  assert.equal(isMetaHistoryMediaCompatible(typed, normalized), true);
  assert.equal(isMetaHistoryMediaCompatible({ ...typed, content: { metadata: { a: 2, z: 2 } } }, normalized), false);
});
