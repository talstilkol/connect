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
  deliveryAttemptNumber: 1,
  queueAttemptNumber: 1,
  queueMessageId: "queue-message-17",
};
const serviceReplyInput = {
  businessPortfolioId: input.businessPortfolioId,
  phoneNumberId: input.phoneNumberId,
  recipientPhoneNumber: input.recipientPhoneNumber,
  deliveryKey:
    `bot_reply_delivery_v1_${"b".repeat(64)}`,
  deliveryAttemptNumber: 1,
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

  const nextClaim = await deriver.derive({
    ...input,
    deliveryAttemptNumber: 2,
    queueAttemptNumber: 2,
  });

  assert.equal(first.portfolioKey, nextClaim.portfolioKey);
  assert.equal(first.senderKey, nextClaim.senderKey);
  assert.equal(first.recipientKey, nextClaim.recipientKey);
  assert.notEqual(
    first.reservationKey,
    nextClaim.reservationKey,
  );
  const duplicateQueueMessage = await deriver.derive({
    ...input,
    queueMessageId: "queue-message-18",
  });

  assert.notEqual(
    first.reservationKey,
    duplicateQueueMessage.reservationKey,
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

test("shares provider scopes with service replies but separates reservation identity", async () => {
  const deriver = createWhatsappRateLimitKeyDeriver({
    WHATSAPP_RATE_LIMIT_HMAC_KEY_V1: firstKey,
  });
  const business = await deriver.derive(input);
  const service = await deriver.deriveServiceReply(
    serviceReplyInput,
  );
  const repeated = await deriver.deriveServiceReply(
    serviceReplyInput,
  );

  assert.equal(service.portfolioKey, business.portfolioKey);
  assert.equal(service.senderKey, business.senderKey);
  assert.equal(service.recipientKey, business.recipientKey);
  assert.notEqual(
    service.reservationKey,
    business.reservationKey,
  );
  assert.deepEqual(service, repeated);
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
  await assert.rejects(
    deriver.derive({
      ...input,
      deliveryAttemptNumber: 0,
    }),
    /key input is invalid/,
  );
  await assert.rejects(
    deriver.derive({
      ...input,
      queueAttemptNumber: 0,
    }),
    /key input is invalid/,
  );
  await assert.rejects(
    deriver.derive({
      ...input,
      queueMessageId: "\n",
    }),
    /queueMessageId is invalid/,
  );
  await assert.rejects(
    deriver.deriveServiceReply({
      ...serviceReplyInput,
      deliveryKey: input.deliveryKey,
    }),
    /service-reply rate-limit key input is invalid/,
  );
});
