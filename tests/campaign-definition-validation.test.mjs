import assert from "node:assert/strict";
import test from "node:test";

import {
  validateCampaignDefinition,
} from "../shared/validation/campaignDefinition.ts";
import {
  inspectCampaignRecipientEligibility,
} from "../shared/validation/campaignRecipientEligibility.ts";

function templateSnapshot(overrides = {}) {
  return {
    templateKey: `template_v1_${"a".repeat(64)}`,
    metaTemplateId: "400004",
    version: 3,
    name: "service_update",
    category: "UTILITY",
    language: "he",
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: {
      1: "שם איש קשר",
    },
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
    ...overrides,
  };
}

function definition(overrides = {}) {
  return {
    name: "  עדכון שירות ללקוחות  ",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: templateSnapshot(),
    audienceSnapshotKey: "b".repeat(64),
    recipientCount: 2,
    ...overrides,
  };
}

test("normalizes a complete immediate campaign definition", () => {
  const result = validateCampaignDefinition(definition());

  assert.equal(result.success, true);
  assert.equal(result.value.name, "עדכון שירות ללקוחות");
  assert.equal(result.value.scheduledAt, null);
  assert.equal(
    result.value.template.templateKey,
    `template_v1_${"a".repeat(64)}`,
  );
  assert.equal(result.value.recipientCount, 2);
});

test("accepts only a canonical UTC timestamp for a scheduled campaign", () => {
  const accepted = validateCampaignDefinition(
    definition({
      deliveryMode: "scheduled",
      scheduledAt: "2026-07-25T15:30:00.000Z",
    }),
  );
  const timezoneLess = validateCampaignDefinition(
    definition({
      deliveryMode: "scheduled",
      scheduledAt: "2026-07-25T15:30",
    }),
  );
  const immediateWithTime = validateCampaignDefinition(
    definition({
      scheduledAt: "2026-07-25T15:30:00.000Z",
    }),
  );

  assert.equal(accepted.success, true);
  assert.equal(timezoneLess.success, false);
  assert.ok(timezoneLess.issues.includes("invalid-schedule"));
  assert.equal(immediateWithTime.success, false);
  assert.ok(
    immediateWithTime.issues.includes("invalid-schedule"),
  );
});

test("rejects invalid timezone, template identity, and audience bounds", () => {
  const result = validateCampaignDefinition(
    definition({
      timezone: "Not/A_Timezone",
      template: templateSnapshot({
        metaTemplateId: "../template",
      }),
      audienceSnapshotKey: "not-a-digest",
      recipientCount: 0,
    }),
  );

  assert.equal(result.success, false);
  assert.deepEqual(result.issues, [
    "invalid-timezone",
    "invalid-template",
    "invalid-audience",
  ]);
});

test("allows a campaign recipient only after every consent gate passes", () => {
  const recipient = {
    contactId: 17,
    contactVersion: 4,
    phoneNumber: "+972501234567",
    mailingStatus: "subscribed",
    consentStatus: "granted",
    personalizationKey: "c".repeat(64),
  };

  assert.deepEqual(
    inspectCampaignRecipientEligibility(recipient),
    { eligible: true },
  );
  assert.deepEqual(
    inspectCampaignRecipientEligibility({
      ...recipient,
      mailingStatus: "unsubscribed",
    }),
    {
      eligible: false,
      reason: "mailing-unsubscribed",
    },
  );
  assert.deepEqual(
    inspectCampaignRecipientEligibility({
      ...recipient,
      consentStatus: "withdrawn",
    }),
    {
      eligible: false,
      reason: "consent-not-granted",
    },
  );
});
