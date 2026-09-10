import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { acquireInboxRequest } from "../features/conversations/inboxRequestGate.ts";
import { emptyManualReplyDraft, submitManualReplyDraft, updateManualReplyDrafts } from "../features/conversations/manualReplyDraft.ts";

// Reuse conversation-presentation and manual-reply-worker fixtures.
const key = `conversation_v1_${"b".repeat(64)}`;
const otherKey = `conversation_v1_${"c".repeat(64)}`;
const text = "קיבלנו את פנייתך.";
const deliveryKey = `manual_reply_delivery_v1_${createHash("sha256").update(text).digest("hex")}`;
const queued = (request) => ({ status: "queued", submission: {
  conversationKey: request.conversationKey, version: request.expectedVersion + 1, deliveryKey,
} });
function fixture() {
  let drafts = updateManualReplyDrafts({}, key, { text });
  const gate = { current: false };
  const update = (key, changes) => { drafts = updateManualReplyDrafts(drafts, key, changes); };
  return { gate, update, draft: (key) => drafts[key] ?? emptyManualReplyDraft,
    submit: (send, options = {}) => submitManualReplyDraft({ conversationKey: key, expectedVersion: 3,
      draft: drafts[key], gate, update, send, ...options }) };
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("an uncertain request survives hiding the composer and returning with a newer conversation version", async () => {
  const f = fixture(); const sent = [];
  await f.submit(async (request) => { sent.push(request); throw new Error("Response lost"); });
  const original = f.draft(key).request;
  assert.equal(f.draft(key).feedback, "uncertain"); assert.equal(f.gate.current, false);
  // No selected thread (filtered out), then another thread: the Inbox still owns both drafts.
  f.update(otherKey, { text: "שלום" });
  assert.equal(f.draft(otherKey).request, null); assert.equal(f.draft(key).request, original);
  await f.submit(async (request) => { sent.push(request); return queued(request); }, { expectedVersion: 4 });
  assert.deepEqual(sent[1], sent[0]); assert.equal(sent[1].expectedVersion, 3);
  assert.equal(f.draft(key).text, ""); assert.equal(f.draft(key).request, null);
  assert.equal(f.draft(otherKey).text, "שלום"); assert.equal(f.draft(key).feedback, "queued");
});

test("a reply holds the shared read/mutation gate through its confirmation read", async () => {
  const f = fixture(); const accepted = deferred(); const read = deferred(); const reading = deferred(); let posts = 0;
  const staleRenderDraft = f.draft(key);
  const running = f.submit(async () => { posts++; return accepted.promise; }, {
    onSubmitted: async (conversationKey) => { assert.equal(conversationKey, key); reading.resolve(); await read.promise; },
  });
  assert.equal(f.gate.current, true); assert.equal(acquireInboxRequest(f.gate), null);
  await f.submit(async () => { posts++; assert.fail("Second POST"); }, { draft: staleRenderDraft });
  accepted.resolve(queued({ conversationKey: key, expectedVersion: 3 })); await reading.promise;
  assert.equal(f.draft(key).feedback, "queued"); assert.equal(f.draft(key).busy, true);
  assert.equal(acquireInboxRequest(f.gate), null);
  read.resolve(); await running;
  assert.equal(posts, 1); assert.equal(f.gate.current, false); assert.equal(f.draft(key).busy, false);
});

test("an active poll or assignment blocks a manual reply without changing the draft", async () => {
  const f = fixture(); const original = f.draft(key); const release = acquireInboxRequest(f.gate);
  await f.submit(async () => assert.fail("No action while another Inbox request is active"));
  assert.equal(f.draft(key), original); release();
  await f.submit(async (request) => queued(request)); assert.equal(f.draft(key).feedback, "queued");
});

test("a late duplicate release cannot unlock a newer request", () => {
  const gate = { current: false }; const first = acquireInboxRequest(gate);
  assert.equal(acquireInboxRequest(gate), null); first();
  const second = acquireInboxRequest(gate); first();
  assert.equal(gate.current, true); assert.equal(acquireInboxRequest(gate), null);
  second(); assert.equal(gate.current, false);
});

test("a failed confirmation read keeps the acknowledged result and releases the gate", async () => {
  const f = fixture(); let posts = 0;
  await f.submit(async (request) => { posts++; return queued(request); }, {
    onSubmitted: async () => { throw new Error("Read unavailable"); },
  });
  assert.equal(f.draft(key).feedback, "queued"); assert.equal(f.draft(key).request, null);
  assert.equal(f.draft(key).busy, false); assert.equal(f.gate.current, false); assert.equal(posts, 1);
});

test("definite initial rejection preserves text, while rejection of an uncertain replay preserves the original intent", async () => {
  for (const [status, feedback] of [["window-closed", "windowClosed"], ["contact-blocked", "blocked"], ["state-conflict", "rejected"]]) {
    const f = fixture(); await f.submit(async () => ({ status }));
    assert.equal(f.draft(key).text, text); assert.equal(f.draft(key).request, null); assert.equal(f.draft(key).feedback, feedback);
    await f.submit(async () => ({ status: "server-error" })); const original = f.draft(key).request;
    await f.submit(async () => ({ status }), { expectedVersion: 5 });
    assert.deepEqual(f.draft(key).request, original); assert.equal(f.draft(key).feedback, "uncertain"); assert.equal(f.gate.current, false);
  }
});

test("malformed acknowledgements retain the intent and cross-conversation requests never send", async () => {
  const f = fixture();
  await f.submit(async (request) => ({ ...queued(request), submission: { ...queued(request).submission, version: 99 } }));
  assert.equal(f.draft(key).feedback, "uncertain"); assert.equal(f.draft(key).request.expectedVersion, 3);
  await f.submit(async () => assert.fail("A request from another conversation must not send"), { conversationKey: otherKey });
  assert.equal(f.gate.current, false);
});
