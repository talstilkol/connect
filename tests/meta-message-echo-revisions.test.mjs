import assert from "node:assert/strict";
import test from "node:test";
import { reduceMetaEchoMutation } from "../server/platform/postgresMetaMessageEchoRepository.ts";
import { parseRailwayInboxMessageView, parseRailwayInboxConversationView } from "../server/conversations/railwayConversationResult.ts";
import { toInboxMessageView } from "../server/conversations/conversationView.ts";
import { messageBody } from "../features/conversations/conversationPresentation.ts";
import { readConversationMessages } from "../features/conversations/conversationMessages.ts";

const empty = { originalDigest: null, originalCaptionDigest: null, contentState: "original", editAt: null, editText: null, editKind: null };
const edit = (textContent, occurredAt = "2026-09-09T08:00:00.000Z") => ({ contentKind: "text", textContent, occurredAt, mutation: { kind: "edit" } });
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

test("media revisions preserve type, clear captions and cannot change an attachment type", () => {
  const caption = { ...edit("A"), contentKind: "image" };
  const first = reduceMetaEchoMutation(empty, caption);
  assert.equal(first.editKind, "image");
  const cleared = reduceMetaEchoMutation(first, { ...caption, textContent: null, occurredAt: "2026-09-09T08:00:01.000Z" });
  assert.equal(cleared.contentState, "edited"); assert.equal(cleared.editText, null);
  assert.deepEqual(reduceMetaEchoMutation(cleared, caption), cleared);
  const conflict = reduceMetaEchoMutation(first, { ...caption, textContent: "B" });
  assert.equal(conflict.contentState, "conflicted"); assert.equal(conflict.editKind, "image");
  assert.equal(reduceMetaEchoMutation(conflict, { ...caption, textContent: null, occurredAt: cleared.editAt }).contentState, "edited");
  assert.throws(() => reduceMetaEchoMutation(first, { ...caption, contentKind: "text" }));
  assert.throws(() => reduceMetaEchoMutation(conflict, { ...caption, contentKind: "video", occurredAt: cleared.editAt }));
  assert.deepEqual(reduceMetaEchoMutation(cleared, revoke), { ...empty, contentState: "deleted" });
});

const base = { messageKey: `message_v1_${"a".repeat(64)}`, direction: "outbound", contentKind: "text", textContent: "updated",
  status: "read", occurredAt: "2026-09-09T08:00:00.000Z", statusUpdatedAt: "2026-09-09T08:00:00.000Z" };

test("edited captions cross the DTO boundary as media and render in every language", () => {
  for (const kind of ["image", "video", "document"]) for (const textContent of [base.textContent, null]) {
    const value = { ...base, contentKind: kind, contentState: "edited", textContent };
    assert.deepEqual(parseRailwayInboxMessageView(value), value);
    assert.deepEqual(toInboxMessageView(value), value);
    for (const language of ["he", "en", "ar"]) {
      const label = readConversationMessages(language).labels.nonTextContent[kind];
      assert.equal(messageBody(value, language), textContent ? `${label}: ${textContent}` : label);
    }
  }
  for (const change of [{ contentKind: "audio" }, { direction: "inbound" }, { textContent: "" },
    { textContent: "\u0000" }, { textContent: "A".repeat(16_385) }, { contentState: "deleted" }]) {
    assert.equal(parseRailwayInboxMessageView({ ...base, contentKind: "image", contentState: "edited", ...change }), null);
  }
});

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
