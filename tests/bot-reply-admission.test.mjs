import assert from "node:assert/strict";
import test from "node:test";

import {
  createBotReplyAdmission,
} from "../server/bot/botReplyAdmission.ts";

const reservationKey =
  `whatsapp_rate_reservation_v1_${"a".repeat(64)}`;
const portfolioKey =
  `whatsapp_portfolio_v1_${"b".repeat(64)}`;
const senderKey =
  `whatsapp_sender_v1_${"c".repeat(64)}`;
const recipientKey =
  `whatsapp_recipient_v1_${"d".repeat(64)}`;
const policyEventKey =
  `whatsapp_delivery_policy_event_v1_${"e".repeat(64)}`;
const deliveryKey =
  `bot_reply_delivery_v1_${"f".repeat(64)}`;
const reservedAt = "2026-08-21T12:00:00.000Z";
const serviceWindowExpiresAt =
  "2026-08-21T13:00:00.000Z";
const portfolioCapacity = Object.freeze({
  kind: "bounded",
  maximumUniqueRecipients: 250,
});
const phoneThroughput = Object.freeze({
  maximumMessagesPerSecond: 80,
  maximumOutboundMessagesPerSecond: 60,
});

function request() {
  return {
    tenantId: 7,
    businessPortfolioId: "portfolio-7",
    wabaId: "waba-7",
    phoneNumberId: "100000000000007",
    recipientPhoneNumber: "+972501234567",
    deliveryKey,
    deliveryAttemptNumber: 2,
    reservedAt,
    serviceWindowExpiresAt,
  };
}

function fixture(reservationResult) {
  const calls = {
    policies: [],
    keys: [],
    reservations: [],
    settlements: [],
    cooldowns: [],
  };
  const repository = {
    async reserveServiceReply(command) {
      calls.reservations.push(command);
      return reservationResult ?? {
        outcome: "reserved",
        idempotent: false,
        reservation: {
          ...command,
          reservationClass: "service-reply",
          pairReservedUntil:
            "2026-08-21T12:00:06.000Z",
        },
      };
    },
    async settle(command) {
      calls.settlements.push(command);
      return {
        outcome: "settled",
        idempotent: false,
        settlement: command,
      };
    },
    async applyProviderCooldown(command) {
      calls.cooldowns.push(command);
      return {
        outcome: "applied",
        idempotent: false,
        cooldown: command,
      };
    },
  };
  const keys = {
    isConfigured() {
      return true;
    },
    async deriveServiceReply(input) {
      calls.keys.push(input);
      return {
        reservationKey,
        portfolioKey,
        senderKey,
        recipientKey,
      };
    },
  };
  const policies = {
    isConfigured() {
      return true;
    },
    async load(input) {
      calls.policies.push(input);
      return {
        eventKey: policyEventKey,
        portfolioCapacity,
        phoneThroughput,
        reservationDurationSeconds: 60,
      };
    },
  };

  return {
    calls,
    admission: createBotReplyAdmission(
      repository,
      keys,
      policies,
    ),
  };
}

test("reserves one service reply from the current policy and deterministic provider scopes", async () => {
  const current = fixture();
  const result = await current.admission.reserve(request());

  assert.deepEqual(result, {
    outcome: "reserved",
    reservationKey,
  });
  assert.deepEqual(current.calls.policies, [{
    tenantId: 7,
    businessPortfolioId: "portfolio-7",
    wabaId: "waba-7",
    phoneNumberId: "100000000000007",
    checkedAt: reservedAt,
  }]);
  assert.equal(
    current.calls.keys[0].deliveryAttemptNumber,
    2,
  );
  assert.deepEqual(current.calls.reservations[0], {
    reservationKey,
    portfolioKey,
    senderKey,
    recipientKey,
    tenantId: 7,
    policyEventKey,
    portfolioCapacity,
    phoneThroughput,
    reservedAt,
    reservationExpiresAt:
      "2026-08-21T12:01:00.000Z",
  });
});

test("maps pair and phone blockers to exact durable retry timestamps", async () => {
  const pair = fixture({
    outcome: "pair-limited",
    retryAt: "2026-08-21T12:00:06.000Z",
  });
  const phone = fixture({
    outcome: "phone-throughput-limited",
    retryAt: "2026-08-21T12:00:01.000Z",
  });

  assert.deepEqual(await pair.admission.reserve(request()), {
    outcome: "deferred",
    errorCode: "WHATSAPP_PAIR_LIMITED",
    retryAt: "2026-08-21T12:00:06.000Z",
  });
  assert.deepEqual(await phone.admission.reserve(request()), {
    outcome: "deferred",
    errorCode: "WHATSAPP_PHONE_THROUGHPUT_LIMITED",
    retryAt: "2026-08-21T12:00:01.000Z",
  });
});

test("rejects an impossible service-reply marketing cooldown and invalid retry evidence", async () => {
  const marketing = fixture({
    outcome: "provider-cooldown",
    scope: "portfolio-recipient",
    providerErrorCode: 131049,
    retryAt: "2026-08-22T12:00:00.000Z",
  });
  const stale = fixture({
    outcome: "pair-limited",
    retryAt: reservedAt,
  });

  await assert.rejects(
    marketing.admission.reserve(request()),
    /cooldown scope is invalid/,
  );
  await assert.rejects(
    stale.admission.reserve(request()),
    /retry is invalid/,
  );
});

test("records pre-submit and explicit provider failure settlements without inventing delivery", async () => {
  const current = fixture();

  await current.admission.settleBeforeSubmit(
    reservationKey,
    reservedAt,
  );
  await current.admission.settleProviderFailure(
    reservationKey,
    "2026-08-21T12:00:01.000Z",
  );

  assert.deepEqual(current.calls.settlements, [
    {
      reservationKey,
      outcome: "cancelled-before-submit",
      settledAt: reservedAt,
    },
    {
      reservationKey,
      outcome: "provider-failed",
      settledAt: "2026-08-21T12:00:01.000Z",
    },
  ]);
});

test("persists only sender and pair provider cooldowns for a service reply", async () => {
  const current = fixture();

  await current.admission.deferProviderRejection(
    reservationKey,
    "sender",
    130429,
    17,
    reservedAt,
  );
  await current.admission.deferProviderRejection(
    reservationKey,
    "pair",
    131056,
    4,
    "2026-08-21T12:00:20.000Z",
  );

  assert.deepEqual(current.calls.cooldowns, [
    {
      reservationKey,
      scope: "sender",
      providerErrorCode: 130429,
      observedAt: reservedAt,
      blockedUntil: "2026-08-21T12:00:17.000Z",
    },
    {
      reservationKey,
      scope: "pair",
      providerErrorCode: 131056,
      observedAt: "2026-08-21T12:00:20.000Z",
      blockedUntil: "2026-08-21T12:00:24.000Z",
    },
  ]);

  for (const invalid of [
    ["portfolio-recipient", 131049, 86_400],
    ["sender", 131056, 4],
    ["pair", 130429, 17],
    ["sender", 130429, 0],
  ]) {
    await assert.rejects(
      current.admission.deferProviderRejection(
        reservationKey,
        invalid[0],
        invalid[1],
        invalid[2],
        reservedAt,
      ),
      /cooldown request is invalid/,
    );
  }
});
