import assert from "node:assert/strict";
import test from "node:test";

import {
  MetaWebhookEnvelopeError,
  parseMetaWebhookEnvelope,
} from "../server/meta/metaWebhookEnvelope.ts";

test("routes a regular WhatsApp webhook by its entry WABA ID", () => {
  const payload = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-id",
        changes: [{ field: "messages", value: {} }],
      },
    ],
  });

  const envelope = parseMetaWebhookEnvelope(
    new TextEncoder().encode(payload),
  );

  assert.equal(envelope.objectType, "whatsapp_business_account");
  assert.equal(envelope.wabaId, "waba-id");
  assert.equal(envelope.payload.object, "whatsapp_business_account");
});

test("routes a PARTNER_ADDED event by nested WABA instead of portfolio entry ID", () => {
  const envelope = parseMetaWebhookEnvelope(
    JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "business-portfolio-id",
          changes: [
            {
              field: "account_update",
              value: {
                event: "PARTNER_ADDED",
                waba_info: {
                  waba_id: "customer-waba-id",
                  owner_business_id: "business-portfolio-id",
                },
              },
            },
          ],
        },
      ],
    }),
  );

  assert.equal(envelope.wabaId, "customer-waba-id");
});

test("rejects webhooks that mix multiple WABAs in one request", () => {
  assert.throws(
    () =>
      parseMetaWebhookEnvelope(
        JSON.stringify({
          object: "whatsapp_business_account",
          entry: [{ id: "waba-one" }, { id: "waba-two" }],
        }),
      ),
    (error) =>
      error instanceof MetaWebhookEnvelopeError &&
      error.code === "AMBIGUOUS_WABA",
  );
});

test("rejects invalid JSON, unsupported objects, and empty entries", () => {
  assert.throws(
    () => parseMetaWebhookEnvelope("{"),
    (error) =>
      error instanceof MetaWebhookEnvelopeError &&
      error.code === "INVALID_JSON",
  );
  assert.throws(
    () =>
      parseMetaWebhookEnvelope(
        JSON.stringify({ object: "page", entry: [{ id: "page-id" }] }),
      ),
    (error) =>
      error instanceof MetaWebhookEnvelopeError &&
      error.code === "UNSUPPORTED_OBJECT",
  );
  assert.throws(
    () =>
      parseMetaWebhookEnvelope(
        JSON.stringify({
          object: "whatsapp_business_account",
          entry: [],
        }),
      ),
    (error) =>
      error instanceof MetaWebhookEnvelopeError &&
      error.code === "INVALID_ENVELOPE",
  );
});
