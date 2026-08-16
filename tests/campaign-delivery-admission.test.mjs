import assert from "node:assert/strict";
import test from "node:test";

import {
  createCampaignDeliveryAdmission,
} from "../server/campaigns/campaignDeliveryAdmission.ts";

const campaignKey =
  `campaign_v1_${"a".repeat(64)}`;
const deliveryKey =
  `campaign_delivery_v1_${"b".repeat(64)}`;
const reservationKey =
  `whatsapp_rate_reservation_v1_${"c".repeat(64)}`;
const portfolioKey =
  `whatsapp_portfolio_v1_${"d".repeat(64)}`;
const senderKey =
  `whatsapp_sender_v1_${"e".repeat(64)}`;
const recipientKey =
  `whatsapp_recipient_v1_${"f".repeat(64)}`;
const reservedAt = "2026-08-16T10:00:00.000Z";
const reservationExpiresAt =
  "2026-08-16T10:05:00.000Z";

function campaign() {
  return {
    campaignKey,
    tenantId: 7,
    name: "עדכון שירות",
    status: "running",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: {
      templateKey:
        `template_v1_${"1".repeat(64)}`,
      metaTemplateId: "400004",
      version: 3,
      name: "service_update",
      category: "UTILITY",
      language: "he",
      header: "",
      body: "שלום {{1}}",
      footer: "",
      variableExamples: { 1: "שם" },
      buttonMode: "none",
      quickReplies: [],
      urlButton: {
        enabled: false,
        mode: "static",
        text: "",
        value: "",
        example: "",
      },
      phoneButton: {
        enabled: false,
        text: "",
        value: "",
      },
    },
    audienceSnapshotKey: "2".repeat(64),
    recipientCount: 1,
    version: 3,
    activatedAt: "2026-08-16T09:59:00.000Z",
    startedAt: "2026-08-16T09:59:30.000Z",
    completedAt: null,
    lastErrorCode: null,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: reservedAt,
  };
}

function request() {
  return {
    campaign: campaign(),
    deliveryKey,
    recipientPhoneNumber: "+972501234567",
    reservedAt,
  };
}

function context(overrides = {}) {
  return {
    reservationKey,
    tenantId: 7,
    portfolioKey,
    senderKey,
    recipientKey,
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 250,
    },
    reservationExpiresAt,
    ...overrides,
  };
}

function reservation() {
  return {
    ...context(),
    reservedAt,
    pairReservedUntil:
      "2026-08-16T10:00:06.000Z",
  };
}

function fixture(reservationResult, options = {}) {
  const calls = [];
  const admission = createCampaignDeliveryAdmission(
    {
      async reserveBusinessInitiatedMessage(command) {
        calls.push({
          operation: "reserve",
          command,
        });

        return reservationResult;
      },
      async settle(command) {
        calls.push({
          operation: "settle",
          command,
        });

        return options.settlementResult ?? {
          outcome: "settled",
          settlement: command,
          idempotent: false,
        };
      },
    },
    {
      isConfigured() {
        if (options.configurationError) {
          throw options.configurationError;
        }

        return options.configured !== false;
      },
      async resolve(admissionRequest) {
        calls.push({
          operation: "resolve",
          request: admissionRequest,
        });

        return options.resolvedContext === undefined
          ? context()
          : options.resolvedContext;
      },
    },
  );

  return { admission, calls };
}

test("reserves an exact verified context before provider submission", async () => {
  const testFixture = fixture({
    outcome: "reserved",
    reservation: reservation(),
    idempotent: false,
  });

  assert.equal(testFixture.admission.isConfigured(), true);
  assert.deepEqual(
    await testFixture.admission.reserve(request()),
    {
      outcome: "reserved",
      reservationKey,
    },
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["resolve", "reserve"],
  );
  assert.deepEqual(
    testFixture.calls[1].command,
    {
      ...context(),
      reservedAt,
    },
  );
});

test("maps pair and in-flight locks to bounded queue delays", async () => {
  const pair = fixture({
    outcome: "pair-limited",
    retryAt: "2026-08-16T10:00:06.001Z",
  });
  const inFlight = fixture({
    outcome: "recipient-in-flight",
    retryAt: "2026-08-16T11:00:00.000Z",
  });

  assert.deepEqual(
    await pair.admission.reserve(request()),
    {
      outcome: "deferred",
      errorCode: "WHATSAPP_PAIR_LIMITED",
      retryAfterSeconds: 7,
    },
  );
  assert.deepEqual(
    await inFlight.admission.reserve(request()),
    {
      outcome: "deferred",
      errorCode: "WHATSAPP_RECIPIENT_IN_FLIGHT",
      retryAfterSeconds: 3_600,
    },
  );
});

test("defers a full rolling portfolio window without inventing a tier", async () => {
  const testFixture = fixture({
    outcome: "portfolio-limited",
    occupiedUniqueRecipients: 250,
    maximumUniqueRecipients: 250,
  });

  assert.deepEqual(
    await testFixture.admission.reserve(request()),
    {
      outcome: "deferred",
      errorCode: "WHATSAPP_PORTFOLIO_LIMITED",
      retryAfterSeconds: 86_400,
    },
  );
});

test("rejects a portfolio block that does not match the verified capacity", async () => {
  const mismatchedTier = fixture({
    outcome: "portfolio-limited",
    occupiedUniqueRecipients: 2_000,
    maximumUniqueRecipients: 2_000,
  });
  const belowCapacity = fixture({
    outcome: "portfolio-limited",
    occupiedUniqueRecipients: 249,
    maximumUniqueRecipients: 250,
  });

  await assert.rejects(
    mismatchedTier.admission.reserve(request()),
    /portfolio limit result is inconsistent/,
  );
  await assert.rejects(
    belowCapacity.admission.reserve(request()),
    /portfolio limit result is inconsistent/,
  );
});

test("fails closed for unavailable or cross-tenant resolution", async () => {
  const unavailable = fixture(
    { outcome: "tenant-not-found" },
    { configured: false },
  );
  const throwingConfiguration = fixture(
    { outcome: "tenant-not-found" },
    {
      configurationError: new Error(
        "private configuration failure",
      ),
    },
  );
  const crossTenant = fixture(
    { outcome: "tenant-not-found" },
    {
      resolvedContext: context({ tenantId: 8 }),
    },
  );

  assert.equal(unavailable.admission.isConfigured(), false);
  assert.equal(
    throwingConfiguration.admission.isConfigured(),
    false,
  );
  await assert.rejects(
    unavailable.admission.reserve(request()),
    /context is unavailable/,
  );
  await assert.rejects(
    crossTenant.admission.reserve(request()),
    /context is invalid/,
  );
  assert.equal(
    unavailable.calls.some(
      (call) => call.operation === "reserve",
    ),
    false,
  );
  assert.equal(
    crossTenant.calls.some(
      (call) => call.operation === "reserve",
    ),
    false,
  );
});

test("rejects unsafe retry timestamps and inconsistent reservations", async () => {
  const expired = fixture({
    outcome: "pair-limited",
    retryAt: reservedAt,
  });
  const excessive = fixture({
    outcome: "recipient-in-flight",
    retryAt: "2026-08-17T10:00:00.001Z",
  });
  const inconsistent = fixture({
    outcome: "reserved",
    reservation: {
      ...reservation(),
      tenantId: 8,
    },
    idempotent: false,
  });

  await assert.rejects(
    expired.admission.reserve(request()),
    /retry delay is unsafe/,
  );
  await assert.rejects(
    excessive.admission.reserve(request()),
    /retry delay is unsafe/,
  );
  await assert.rejects(
    inconsistent.admission.reserve(request()),
    /reservation is inconsistent/,
  );
});

test("settles only an exact repository result", async () => {
  const accepted = fixture({
    outcome: "tenant-not-found",
  });
  const rejected = fixture(
    { outcome: "tenant-not-found" },
    {
      settlementResult: {
        outcome: "settlement-conflict",
        existing: {
          reservationKey,
          outcome: "delivered",
          settledAt: reservedAt,
        },
      },
    },
  );

  await accepted.admission.settle(
    reservationKey,
    "cancelled-before-submit",
    reservedAt,
  );
  assert.deepEqual(accepted.calls[0], {
    operation: "settle",
    command: {
      reservationKey,
      outcome: "cancelled-before-submit",
      settledAt: reservedAt,
    },
  });
  await assert.rejects(
    rejected.admission.settle(
      reservationKey,
      "provider-failed",
      reservedAt,
    ),
    /settlement was rejected/,
  );
});
