import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { parseManualReplyRequest, parseManualReplyViews } from "../shared/domain/manualReply.ts";
import { createManualReplyWorker, createMetaManualReplySender, createManualReplyWorkerLoop } from "../server/conversations/manualReplyWorker.ts";
import { ManualReplyError } from "../server/platform/postgresManualReplyRepository.ts";
import { MetaGraphError } from "../server/meta/metaGraphTransport.ts";
import { toSensitiveMetaAccessToken } from "../server/meta/metaPorts.ts";
import { requireRailwayManualReplyConfiguration } from "../server/platform/railwayManualReplyConfiguration.ts";
import { createWhatsappRateLimitKeyDeriver } from "../server/campaigns/whatsappRateLimitKeyDeriver.ts";

// Existing meta-bot-reply and railway-conversation-handler fixtures, reused for the new path.
const text = "קיבלנו את פנייתך.";
const conversationKey = `conversation_v1_${"a".repeat(64)}`;
const deliveryKey = `manual_reply_delivery_v1_${createHash("sha256").update(text).digest("hex")}`;
const reservationKey = `whatsapp_rate_reservation_v1_${"9".repeat(64)}`;
const accessToken = toSensitiveMetaAccessToken("bot-reply-access-token");
const providerMessageId = "wamid.bot-reply-provider-17";
const at = "2026-08-21T10:00:00.000Z";
const claim = Object.freeze({ deliveryKey, tenantId: 7, claimVersion: 1, businessPortfolioId: "100001", wabaId: "200002",
  phoneNumberId: "300003", recipientPhoneNumber: "+972501234567", text, serviceWindowExpiresAt: "2026-08-22T09:00:00.000Z" });
function fixture(overrides = {}) {
  const calls = []; let available = true;
  const replies = {
    async recover() { calls.push("recover"); },
    async claim() { calls.push("claim"); if (!available) return null; available = false; return claim; },
    async seal() { calls.push("seal"); if (overrides.sealError) throw overrides.sealError; return overrides.sealed ?? true; },
    async defer(...args) { calls.push(["defer", ...args]); }, async fail(...args) { calls.push(["fail", ...args]); },
    async unknown() { calls.push("unknown"); }, async reject() { calls.push("reject"); },
    async accepted(...args) { calls.push(["accepted", ...args]); if (overrides.acceptError) throw overrides.acceptError; },
  };
  const admission = { isConfigured: () => true,
    async reserve(input) { calls.push(["reserve", input]); if (overrides.reserveError) throw overrides.reserveError;
      return overrides.decision ?? { outcome: "reserved", reservationKey }; },
    async settleBeforeSubmit() { calls.push("cancel-reservation"); }, async settleProviderFailure() { calls.push("provider-failed"); },
    async deferProviderRejection(...args) { calls.push(["cooldown", ...args]); },
  };
  const worker = createManualReplyWorker({ replies, admission, clock: { now: () => new Date(at) },
    vault: { async withAccessToken(tenantId, send) { calls.push(["vault", tenantId]); if (overrides.vaultError) throw overrides.vaultError; return send(accessToken); } },
    sender: { async send(...args) { calls.push(["send", ...args]); if (overrides.sendError) throw overrides.sendError; return providerMessageId; } } });
  return { calls, worker };
}
const names = (calls) => calls.map((call) => Array.isArray(call) ? call[0] : call);

test("manual reply reserves shared service capacity, decrypts, seals then records one accepted provider message", async () => {
  const { calls, worker } = fixture(); await worker.run(); await worker.run();
  assert.deepEqual(names(calls), ["recover", "claim", "reserve", "vault", "seal", "send", "accepted", "recover", "claim"]);
  assert.deepEqual(calls.find((call) => call[0] === "accepted"), ["accepted", claim, providerMessageId]);
  assert.equal(calls.find((call) => call[0] === "reserve")[1].deliveryAttemptNumber, 1);
});
test("a revoked authorization or lost preparing claim never reaches the provider", async () => {
  for (const option of [{ sealError: new ManualReplyError("AUTHORIZATION_DENIED") }, { sealed: false }, { vaultError: new Error("Unavailable") }]) {
    const { calls, worker } = fixture(option); await worker.run();
    assert.ok(names(calls).includes("cancel-reservation")); assert.ok(!names(calls).includes("send"));
    if (option.sealError) assert.ok(names(calls).includes("fail"));
    if (option.vaultError) assert.ok(names(calls).includes("defer"));
  }
});
test("a shared rate limit defers before credentials or provider claims", async () => {
  const { calls, worker } = fixture({ decision: { outcome: "deferred", errorCode: "WHATSAPP_PAIR_LIMITED", retryAt: "2026-08-21T10:00:06.000Z" } });
  await worker.run(); assert.deepEqual(names(calls), ["recover", "claim", "reserve", "defer"]);
});
test("network loss, timeout, 5xx and acceptance storage failure stay unknown without resending or releasing capacity", async () => {
  for (const option of [{ sendError: new MetaGraphError("NETWORK_ERROR", "Unavailable") },
    { sendError: new MetaGraphError("TIMEOUT", "Unavailable") }, { sendError: new MetaGraphError("API_ERROR", "Unavailable", { httpStatus: 503 }) },
    { acceptError: new Error("Unavailable") }]) {
    const { calls, worker } = fixture(option); await worker.run(); await worker.run();
    assert.equal(names(calls).filter((name) => name === "send").length, 1);
    assert.ok(names(calls).includes("unknown")); assert.ok(!names(calls).includes("cancel-reservation"));
    assert.ok(!names(calls).includes("defer")); assert.ok(!names(calls).includes("provider-failed"));
  }
});
test("an explicit rejection stops the reply and shares only evidenced provider cooldowns", async () => {
  for (const graphCode of [131047, 130429, 131056]) {
    const { calls, worker } = fixture({ sendError: new MetaGraphError("API_ERROR", "Rejected", { httpStatus: 400, graphCode, retryAfterSeconds: 6 }) });
    await worker.run(); assert.ok(names(calls).includes("reject")); assert.ok(!names(calls).includes("unknown"));
    if (graphCode === 130429) assert.ok(names(calls).includes("cooldown"));
  }
});
test("manual text adapter preserves real text and parses exactly one provider acceptance", async () => {
  const requests = [];
  const sender = createMetaManualReplySender({ async requestJson(input) { requests.push(input); return { messaging_product: "whatsapp", messages: [{ id: providerMessageId }] }; } });
  assert.equal(await sender.send(claim, accessToken), providerMessageId);
  assert.deepEqual(requests[0].pathSegments, [claim.phoneNumberId, "messages"]);
  assert.deepEqual(requests[0].jsonBody, { messaging_product: "whatsapp", recipient_type: "individual", type: "text", to: "972501234567", text: { preview_url: false, body: text } });
  await assert.rejects(() => createMetaManualReplySender({ async requestJson() { return {}; } }).send(claim, accessToken), { code: "INVALID_RESPONSE" });
});
test("manual reply input rejects unbounded, malformed, empty and noncanonical intent", () => {
  const request = { conversationKey, expectedVersion: 3, text };
  assert.deepEqual(parseManualReplyRequest(request), request);
  for (const bad of [{ ...request, text: " " }, { ...request, text: text.repeat(4096) }, { ...request, text: "\u0000" },
    { ...request, text: "\ud800" }, { ...request, expectedVersion: 2147483647 }, { ...request, tenantId: 7 }]) assert.equal(parseManualReplyRequest(bad), null);
  const view = { deliveryKey, text, state: "unknown", createdAt: at, updatedAt: at };
  assert.deepEqual(parseManualReplyViews([view]), [view]);
  assert.equal(parseManualReplyViews([view, view]), null); assert.equal(parseManualReplyViews([{ ...view, accessToken }]), null);
});
test("manual reply deployment is disabled by default and rejects partial provider configuration", async () => {
  const key = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8="; // Existing template-sync fixture.
  assert.equal(requireRailwayManualReplyConfiguration(), false);
  assert.throws(() => requireRailwayManualReplyConfiguration({ MANUAL_REPLY_ENABLED: "true" }));
  const environment = { MANUAL_REPLY_ENABLED: "true", META_GRAPH_API_VERSION: "v23.0", META_CREDENTIAL_ENCRYPTION_KEY_V1: key, WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: key };
  assert.equal(requireRailwayManualReplyConfiguration(environment), true);
  const keys = createWhatsappRateLimitKeyDeriver(environment);
  const input = { businessPortfolioId: claim.businessPortfolioId, phoneNumberId: claim.phoneNumberId, recipientPhoneNumber: claim.recipientPhoneNumber, deliveryKey, deliveryAttemptNumber: 1 };
  const first = await keys.deriveServiceReply(input); const next = await keys.deriveServiceReply({ ...input, deliveryAttemptNumber: 2 });
  assert.notEqual(first.reservationKey, next.reservationKey); assert.equal(first.senderKey, next.senderKey);
  const bot = await keys.deriveServiceReply({ ...input, deliveryKey: deliveryKey.replace("manual_reply", "bot_reply") });
  assert.notEqual(first.reservationKey, bot.reservationKey); assert.equal(first.senderKey, bot.senderKey); assert.equal(first.recipientKey, bot.recipientKey);
});
test("closing the loop drains an active claim and prevents another tick", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let release; let count = 0; let stopping;
  const loop = createManualReplyWorkerLoop(async (check) => { count++; stopping = check; await new Promise((resolve) => { release = resolve; }); }, () => assert.fail("Unexpected failure"));
  await loop.start(); t.mock.timers.tick(0); assert.equal(count, 1);
  t.mock.timers.tick(10_000); assert.equal(count, 1);
  let drained = false; const closing = loop.close().then(() => { drained = true; });
  await Promise.resolve(); assert.equal(drained, false); assert.equal(stopping(), true);
  release(); await closing; t.mock.timers.tick(10_000); assert.equal(count, 1);
});
