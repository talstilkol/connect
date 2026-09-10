import assert from "node:assert/strict";
import test from "node:test";
import { reduceMetaEchoMutation } from "../server/platform/postgresMetaMessageEchoRepository.ts";
import { parseRailwayInboxMessageView, parseRailwayInboxConversationView } from "../server/conversations/railwayConversationResult.ts";
import { toInboxMessageView } from "../server/conversations/conversationView.ts";
import { messageBody } from "../features/conversations/conversationPresentation.ts";
import { readConversationMessages } from "../features/conversations/conversationMessages.ts";

const empty = { originalDigest: null, contentState: "original", editAt: null, editText: null };
const edit = (textContent, occurredAt = "2026-09-09T08:00:00.000Z") => ({ textContent, occurredAt, mutation: { kind: "edit" } });
const revoke = { mutation: { kind: "revoke" } };

test("a revocation wins over every edit ordering, including later edits", () => {
  for (const sequence of [[edit("A"), revoke, edit("B")], [revoke, edit("B"), edit("A")], [edit("B"), edit("A"), revoke]]) {
    const result = sequence.reduce(reduceMetaEchoMutation, empty);
    assert.deepEqual(result, { ...empty, contentState: "deleted" });
  }
});

test("conflicting edits in the same second hide both versions until a strictly later edit", () => {
  for (const sequence of [[edit("A"), edit("B")], [edit("B"), edit("A")]]) {
    const result = sequence.reduce(reduceMetaEchoMutation, empty);
    assert.equal(result.contentState, "conflicted");
    assert.equal(result.editText, null);
    assert.equal(reduceMetaEchoMutation(result, edit("A")).contentState, "conflicted");
    assert.equal(reduceMetaEchoMutation(result, edit("C", "2026-09-09T08:00:01.000Z")).editText, "C");
  }
});

test("stale edits and equivalent edits cannot roll back the chosen content", () => {
  const latest = reduceMetaEchoMutation(empty, edit("current", "2026-09-09T08:00:02.000Z"));
  assert.deepEqual(reduceMetaEchoMutation(latest, edit("old")), latest);
  assert.deepEqual(reduceMetaEchoMutation(latest, edit("current", latest.editAt)), latest);
});

const base = { messageKey: `message_v1_${"a".repeat(64)}`, direction: "outbound", contentKind: "text", textContent: "updated",
  status: "read", occurredAt: "2026-09-09T08:00:00.000Z", statusUpdatedAt: "2026-09-09T08:00:00.000Z" };

test("message DTO preserves valid content state and rejects deleted/conflicted text leaks", () => {
  for (const state of ["edited", "deleted", "conflicted"]) {
    const expected = { ...base, contentState: state, ...(state === "edited" ? {} : { contentKind: "unsupported", textContent: null }) };
    assert.deepEqual(parseRailwayInboxMessageView(expected), expected);
    assert.deepEqual(toInboxMessageView(expected), expected);
  }
  for (const invalid of [{ ...base, contentState: "deleted" }, { ...base, contentState: "conflicted" },
    { ...base, contentState: "edited", direction: "inbound" }, { ...base, contentState: "unknown" }, { ...base, contentState: null },
    { ...base, contentState: "original" }, { ...base, contentState: "deleted", hiddenText: "old" }]) {
    assert.equal(parseRailwayInboxMessageView(invalid), null);
  }
  assert.deepEqual(parseRailwayInboxMessageView(base), base);
});

test("conversation preview DTO preserves tombstones and rejects a hidden old body", () => {
  const conversation = { conversationKey: `conversation_v1_${"b".repeat(64)}`, status: "new", unreadCount: 0, assignment: "unassigned", version: 2,
    contact: { displayName: "+16505551234", phoneNumber: "+16505551234" },
    lastMessage: { direction: "outbound", contentKind: "unsupported", contentState: "deleted", textContent: null, occurredAt: base.occurredAt } };
  assert.deepEqual(parseRailwayInboxConversationView(conversation), conversation);
  assert.equal(parseRailwayInboxConversationView({ ...conversation, lastMessage: { ...conversation.lastMessage, textContent: "old" } }), null);
});

test("every supported language renders deletion/conflict labels before any retained body", () => {
  for (const language of ["he", "en", "ar"]) {
    for (const state of ["deleted", "conflicted"]) {
      assert.equal(messageBody({ ...base, contentState: state, textContent: "must-not-display" }, language), readConversationMessages(language).labels.contentStates[state]);
    }
    assert.equal(messageBody({ ...base, contentState: "edited" }, language), base.textContent);
  }
});
