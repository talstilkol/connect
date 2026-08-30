import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyStagingRecipientFingerprintDeriver,
} from "../server/operations/botReplyStagingRecipientFingerprint.ts";

const validKey = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";

test("derives a stable purpose-separated recipient fingerprint", async () => {
  const deriver = createBotReplyStagingRecipientFingerprintDeriver({
    BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1: validKey,
  });
  assert.equal(deriver.isConfigured(), true);
  const first = await deriver.derive("+972501111111");
  const replay = await deriver.derive("+972501111111");
  const other = await deriver.derive("+972502222222");
  assert.match(first, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first, replay);
  assert.notEqual(first, other);
  assert.doesNotMatch(first, /972501111111/);
});

test("fails closed for a missing key or malformed recipient", async () => {
  const unavailable = createBotReplyStagingRecipientFingerprintDeriver({});
  assert.equal(unavailable.isConfigured(), false);
  await assert.rejects(
    () => unavailable.derive("+972501111111"),
    /fingerprint is unavailable/,
  );

  const configured = createBotReplyStagingRecipientFingerprintDeriver({
    BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1: validKey,
  });
  await assert.rejects(
    () => configured.derive("0501111111"),
    /phone number is invalid/,
  );
});

test("rejects an invalid key before cryptographic use", () => {
  for (const key of ["", "short", `${validKey}x`]) {
    const deriver = createBotReplyStagingRecipientFingerprintDeriver({
      BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1: key,
    });
    assert.equal(deriver.isConfigured(), false);
  }
});
