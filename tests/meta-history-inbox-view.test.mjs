import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRailwayInboxMessageView, parseRailwayInboxConversationView } from '../server/conversations/railwayConversationResult.ts';
import { toInboxMessageView } from '../server/conversations/conversationView.ts';
import { messageBody } from '../features/conversations/conversationPresentation.ts';
import { readConversationMessages } from '../features/conversations/conversationMessages.ts';
import { historyDeliveryStates } from '../shared/domain/inboxHistory.ts';

const history = { messageKey: `message_v1_${'a'.repeat(64)}`, direction: 'outbound', contentKind: 'text', textContent: 'history text',
  occurredAt: '2025-02-11T00:00:00.000Z', status: null, statusUpdatedAt: null, source: 'history', historyDeliveryState: 'READ' };

test('history DTO preserves all provider delivery states without fabricating a status timestamp', () => {
  for (const state of historyDeliveryStates) {
    const candidate = { ...history, historyDeliveryState: state };
    assert.deepEqual(parseRailwayInboxMessageView(candidate), candidate);
    const view = toInboxMessageView({ ...candidate, tenantId: 7, providerMessageId: 'wamid.private', conversationKey: 'private',
      createdAt: '2026-09-09T09:00:00.000Z', updatedAt: '2026-09-09T09:00:00.000Z', lastStatusEventKey: null, lastStatusEventAt: null });
    assert.deepEqual(view, candidate); assert.doesNotMatch(JSON.stringify(view), /private|tenantId|2026-09-09/);
  }
});

test('history marker, null status and provider snapshot are one strict boundary', () => {
  for (const changed of [{ source: 'live' }, { source: undefined }, { historyDeliveryState: 'received' }, { historyDeliveryState: undefined },
    { status: 'read' }, { statusUpdatedAt: history.occurredAt }, { extra: true }]) {
    assert.equal(parseRailwayInboxMessageView({ ...history, ...changed }), null);
  }
});

test('live DTO stays compatible and cannot silently become a history media placeholder', () => {
  const live = { ...history, status: 'sent', statusUpdatedAt: history.occurredAt };
  delete live.source; delete live.historyDeliveryState;
  assert.deepEqual(parseRailwayInboxMessageView(live), live);
  assert.equal(parseRailwayInboxMessageView({ ...live, status: null }), null);
  assert.equal(parseRailwayInboxMessageView({ ...live, contentKind: 'media_placeholder', textContent: null }), null);
});

test('history media placeholders round-trip in thread and last-message preview', () => {
  const placeholder = { ...history, contentKind: 'media_placeholder', textContent: null, historyDeliveryState: 'PLAYED' };
  assert.deepEqual(parseRailwayInboxMessageView(placeholder), placeholder);
  const conversation = { conversationKey: `conversation_v1_${'b'.repeat(64)}`, status: 'new', unreadCount: 0, assignment: 'unassigned', version: 1,
    contact: { displayName: '+16505551234', phoneNumber: '+16505551234' },
    lastMessage: { direction: 'outbound', contentKind: 'media_placeholder', textContent: null, occurredAt: history.occurredAt } };
  assert.deepEqual(parseRailwayInboxConversationView(conversation), conversation);
});

test('historical edit/delete/conflict keeps original ordering and does not leak deleted text', () => {
  for (const contentState of ['edited', 'deleted', 'conflicted']) {
    const candidate = { ...history, contentState, contentKind: contentState === 'edited' ? 'text' : 'unsupported',
      textContent: contentState === 'edited' ? 'updated text' : null };
    assert.deepEqual(parseRailwayInboxMessageView(candidate), candidate);
    if (contentState !== 'edited') assert.equal(parseRailwayInboxMessageView({ ...candidate, textContent: 'must be hidden' }), null);
    assert.equal(candidate.occurredAt, history.occurredAt);
  }
});

test('history origin, all delivery states, media placeholders and tombstones are localized', () => {
  for (const language of ['he', 'en', 'ar']) {
    const labels = readConversationMessages(language).labels;
    assert.ok(labels.historySource.length > 0);
    assert.deepEqual(Object.keys(labels.historyDeliveryStates).sort(), [...historyDeliveryStates].sort());
    assert.ok(Object.values(labels.historyDeliveryStates).every((label) => label.trim().length > 0));
    assert.equal(messageBody({ contentKind: 'media_placeholder', textContent: null }, language), labels.nonTextContent.media_placeholder);
    for (const state of ['deleted', 'conflicted']) assert.equal(messageBody({ contentKind: 'unsupported', textContent: 'private deleted text', contentState: state }, language), labels.contentStates[state]);
  }
});
