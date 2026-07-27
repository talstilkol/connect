import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaWebhookSignature,
  sha256Hex,
  verifyMetaWebhookChallenge,
  verifyMetaWebhookSignature,
} from "../server/meta/metaWebhookSecurity.ts";

const rawPayload =
  '{"object":"whatsapp_business_account","entry":[{"id":"waba-fixture","changes":[]}]}';
const appSecret = "meta-test-secret";
const expectedDigest =
  "756297bc87fa6c515823723ec427101952f8bd1900cef253169687dab5be7f89";
const expectedSignature =
  "sha256=d12410901f0cbd3e4fba5b63092c94b62cc830d47124131914f2719855ec609e";

test("accepts an exact Meta verification challenge", () => {
  assert.deepEqual(
    verifyMetaWebhookChallenge(
      {
        mode: "subscribe",
        verifyToken: "configured-verify-token",
        challenge: "challenge-value",
      },
      "configured-verify-token",
    ),
    {
      accepted: true,
      challenge: "challenge-value",
    },
  );
});

test("rejects challenge requests with wrong mode, token, or missing challenge", () => {
  assert.deepEqual(
    verifyMetaWebhookChallenge(
      {
        mode: "read",
        verifyToken: "configured-verify-token",
        challenge: "challenge-value",
      },
      "configured-verify-token",
    ),
    { accepted: false, reason: "invalid_mode" },
  );
  assert.deepEqual(
    verifyMetaWebhookChallenge(
      {
        mode: "subscribe",
        verifyToken: "wrong-token",
        challenge: "challenge-value",
      },
      "configured-verify-token",
    ),
    { accepted: false, reason: "invalid_token" },
  );
  assert.deepEqual(
    verifyMetaWebhookChallenge(
      {
        mode: "subscribe",
        verifyToken: "configured-verify-token",
        challenge: null,
      },
      "configured-verify-token",
    ),
    { accepted: false, reason: "missing_challenge" },
  );
});

test("computes deterministic SHA-256 and Meta HMAC signatures from raw bytes", async () => {
  assert.equal(await sha256Hex(rawPayload), expectedDigest);
  assert.equal(
    await createMetaWebhookSignature(rawPayload, appSecret),
    expectedSignature,
  );
  assert.equal(
    await verifyMetaWebhookSignature(
      new TextEncoder().encode(rawPayload),
      expectedSignature,
      appSecret,
    ),
    true,
  );
});

test("rejects missing, malformed, and payload-mismatched signatures", async () => {
  assert.equal(
    await verifyMetaWebhookSignature(rawPayload, null, appSecret),
    false,
  );
  assert.equal(
    await verifyMetaWebhookSignature(
      rawPayload,
      "sha256=not-a-digest",
      appSecret,
    ),
    false,
  );
  assert.equal(
    await verifyMetaWebhookSignature(
      `${rawPayload} `,
      expectedSignature,
      appSecret,
    ),
    false,
  );
});

test("fails closed when Meta secrets are missing", async () => {
  assert.throws(
    () =>
      verifyMetaWebhookChallenge(
        {
          mode: "subscribe",
          verifyToken: "token",
          challenge: "challenge",
        },
        "",
      ),
    /META_WEBHOOK_VERIFY_TOKEN must be configured/,
  );
  await assert.rejects(
    verifyMetaWebhookSignature(rawPayload, expectedSignature, ""),
    /META_APP_SECRET must be configured/,
  );
});
