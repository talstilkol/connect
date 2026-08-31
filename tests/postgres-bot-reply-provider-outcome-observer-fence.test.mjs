import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBotReplyStagingProviderDeferralObservationProducer,
  postgresBotReplyStagingProviderDeferralObservationProducerSql,
} from "../server/platform/postgresBotReplyStagingProviderDeferralObservationProducer.ts";
import {
  createPostgresBotReplyStagingSendObservationProducer,
  postgresBotReplyStagingSendObservationProducerSql,
} from "../server/platform/postgresBotReplyStagingSendObservationProducer.ts";
import {
  postgresBotReplyStagingWebhookObservationProducerSql,
} from "../server/platform/postgresBotReplyStagingWebhookObservationProducer.ts";

function normalizeSql(value) {
  return value.replace(/\s+/g, " ").trim();
}

test("observers read only outcomes joined to the exact preceding request", () => {
  const acceptance = normalizeSql(
    postgresBotReplyStagingSendObservationProducerSql.readAcceptance,
  );
  const rejection = normalizeSql(
    postgresBotReplyStagingSendObservationProducerSql
      .readServiceWindowRejection,
  );
  const deferral = normalizeSql(
    postgresBotReplyStagingProviderDeferralObservationProducerSql
      .readCurrentDeferral,
  );
  const webhook = normalizeSql(
    postgresBotReplyStagingWebhookObservationProducerSql.readStatus,
  );

  for (const [source, subject, outcomeTimestamp] of [
    [acceptance, "delivery", "link.accepted_at"],
    [deferral, "event", "event.attempted_at"],
  ]) {
    assert.match(
      source,
      /INNER JOIN bot_reply_provider_request_claims AS request/,
    );
    assert.match(
      source,
      new RegExp(`request\\.delivery_key = ${subject}\\.delivery_key`),
    );
    assert.match(
      source,
      new RegExp(`request\\.tenant_id = ${subject}\\.tenant_id`),
    );
    assert.match(
      source,
      new RegExp(`request\\.claim_version = ${subject}\\.claim_version`),
    );
    assert.match(
      source,
      new RegExp(
        `request\\.requested_at <= ${outcomeTimestamp.replaceAll(".", "\\.")}`,
      ),
    );
  }
  assert.match(
    acceptance,
    /request\.reservation_key = link\.reservation_key/,
  );
  assert.match(
    rejection,
    /FROM bot_reply_request_fenced_window_rejections AS event/,
  );
  assert.match(
    deferral,
    /request\.reservation_key = event\.reservation_key/,
  );
  assert.match(
    webhook,
    /INNER JOIN bot_reply_provider_request_claims AS request/,
  );
  assert.match(webhook, /request\.delivery_key = link\.delivery_key/);
  assert.match(webhook, /request\.tenant_id = link\.tenant_id/);
  assert.match(webhook, /request\.claim_version = delivery\.claim_version/);
  assert.match(webhook, /request\.reservation_key = link\.reservation_key/);
  assert.match(webhook, /request\.requested_at <= link\.accepted_at/);
});

test("observers fail closed when a missing or mismatched request filters the outcome", async () => {
  const writes = [];
  const dependencies = {
    queries: {
      async query() {
        return { rows: [], rowCount: 0 };
      },
    },
    writer: {
      isConfigured() {
        return true;
      },
      async record(value) {
        writes.push(value);
        throw new Error("unexpected observer write");
      },
    },
    clock: {
      now() {
        return new Date("2026-08-25T08:00:00.000Z");
      },
    },
  };
  const send = createPostgresBotReplyStagingSendObservationProducer(
    dependencies,
  );
  const deferral =
    createPostgresBotReplyStagingProviderDeferralObservationProducer(
      dependencies,
    );

  await assert.rejects(
    send.recordAcceptedSend({}, {}, {}),
    /send observation is unavailable/,
  );
  await assert.rejects(
    send.recordServiceWindowRejection({}, {}, {}),
    /service-window observation is unavailable/,
  );
  await assert.rejects(
    deferral.recordDeferral({}, {}, {}),
    /deferral observation is unavailable/,
  );
  assert.deepEqual(writes, []);
});
