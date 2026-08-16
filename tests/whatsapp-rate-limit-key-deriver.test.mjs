import assert from "node:assert/strict";
import test from "node:test";

import {
  createWhatsappRateLimitKeyDeriver,
} from "../server/campaigns/whatsappRateLimitKeyDeriver.ts";

const firstKey = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const secondKey = "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI=";
const input = {
  businessPortfolioId: "400001",
  phoneNumberId: "400002",
  recipientPhoneNumber: "+972501234567",
  deliveryKey:
    `campaign_delivery_v1_${"a".repeat(64)}`,
};

test("derives stable purpose-separated opaque WhatsApp keys", async () => {
  const deriver = createWhatsappRateLimitKeyDeriver({
    WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: firstKey,
  });
  const first = await deriver.derive(input);
  const repeated = await deriver.derive(input);

  assert.equal(deriver.isConfigured(), true);
  assert.deepEqual(first, repeated);
  assert.match(
    first.reservationKey,
    /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    first.portfolioKey,
    /^whatsapp_portfolio_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    first.senderKey,
    /^whatsapp_sender_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    first.recipientKey,
    /^whatsapp_recipient_v1_[0-9a-f]{64}$/,
  );
  assert.equal(
    new Set(Object.values(first)).size,
    4,
  );
});

test("shares provider scope without exposing tenant or provider identifiers", async () => {
  const deriver = createWhatsappRateLimitKeyDeriver({
    WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: firstKey,
  });
  const first = await deriver.derive(input);
  const anotherDelivery = await deriver.derive({
    ...input,
    deliveryKey:
      `campaign_delivery_v1_${"b".repeat(64)}`,
  });

  assert.equal(
    first.portfolioKey,
    anotherDelivery.portfolioKey,
  );
  assert.equal(first.senderKey, anotherDelivery.senderKey);
  assert.equal(
    first.recipientKey,
    anotherDelivery.recipientKey,
  );
  assert.notEqual(
    first.reservationKey,
    anotherDelivery.reservationKey,
  );
  assert.equal(
    Object.values(first).some(
      (value) =>
        value.includes(input.businessPortfolioId) ||
        value.includes(input.phoneNumberId) ||
        value.includes(input.recipientPhoneNumber),
    ),
    false,
  );
});

test("separates key rotations and rejects missing or malformed configuration", async () => {
  const first = createWhatsappRateLimitKeyDeriver({
    WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: firstKey,
  });
  const rotated = createWhatsappRateLimitKeyDeriver({
    WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: secondKey,
  });
  const missing = createWhatsappRateLimitKeyDeriver({});
  const malformed = createWhatsappRateLimitKeyDeriver({
    WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: "not-base64",
  });

  assert.notDeepEqual(
    await first.derive(input),
    await rotated.derive(input),
  );
  assert.equal(missing.isConfigured(), false);
  assert.equal(malformed.isConfigured(), false);
  await assert.rejects(
    missing.derive(input),
    /HMAC configuration is invalid/,
  );
});

test("rejects invalid provider, recipient, and delivery identities before signing", async () => {
  const deriver = createWhatsappRateLimitKeyDeriver({
    WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: firstKey,
  });

  await assert.rejects(
    deriver.derive({
      ...input,
      businessPortfolioId: " ",
    }),
    /businessPortfolioId is invalid/,
  );
  await assert.rejects(
    deriver.derive({
      ...input,
      recipientPhoneNumber: "0501234567",
    }),
    /key input is invalid/,
  );
  await assert.rejects(
    deriver.derive({
      ...input,
      deliveryKey: "../delivery",
    }),
    /key input is invalid/,
  );
});
