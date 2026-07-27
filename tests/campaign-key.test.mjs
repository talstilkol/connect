import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveCampaignAudienceKey,
  deriveCampaignDeliveryKey,
  deriveCampaignKey,
  deriveCampaignPersonalizationKey,
} from "../server/campaigns/campaignKey.ts";

function recipient(
  contactId,
  personalizationCharacter,
  overrides = {},
) {
  return {
    contactId,
    contactVersion: 2,
    phoneNumber:
      contactId === 17
        ? "+972501234567"
        : "+972509876543",
    mailingStatus: "subscribed",
    consentStatus: "granted",
    personalizationKey:
      personalizationCharacter.repeat(64),
    ...overrides,
  };
}

function definition(
  audienceSnapshotKey,
  overrides = {},
) {
  return {
    name: "עדכון שירות ללקוחות",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: {
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
    },
    audienceSnapshotKey,
    recipientCount: 2,
    ...overrides,
  };
}

test("derives one audience key independent of recipient input order", async () => {
  const firstRecipient = recipient(17, "b");
  const secondRecipient = recipient(18, "c");
  const first = await deriveCampaignAudienceKey(
    7,
    [firstRecipient, secondRecipient],
  );
  const reordered = await deriveCampaignAudienceKey(
    7,
    [secondRecipient, firstRecipient],
  );

  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(first, reordered);
});

test("rejects duplicate and ineligible audience recipients", async () => {
  const currentRecipient = recipient(17, "b");

  await assert.rejects(
    deriveCampaignAudienceKey(7, [
      currentRecipient,
      currentRecipient,
    ]),
    /duplicate contact/,
  );
  await assert.rejects(
    deriveCampaignAudienceKey(7, [
      recipient(17, "b", {
        consentStatus: "unknown",
      }),
    ]),
    /consent-not-granted/,
  );
});

test("derives a deterministic campaign key from the frozen definition", async () => {
  const audienceKey =
    await deriveCampaignAudienceKey(7, [
      recipient(17, "b"),
      recipient(18, "c"),
    ]);
  const first = await deriveCampaignKey(
    7,
    definition(audienceKey),
  );
  const repeated = await deriveCampaignKey(
    7,
    definition(audienceKey),
  );
  const anotherTenant = await deriveCampaignKey(
    8,
    definition(audienceKey),
  );

  assert.match(first, /^campaign_v1_[0-9a-f]{64}$/);
  assert.equal(first, repeated);
  assert.notEqual(first, anotherTenant);
});

test("uses one delivery key across retries and separates recipient versions", async () => {
  const campaignKey =
    `campaign_v1_${"d".repeat(64)}`;
  const deliveryIdentity = {
    contactId: 17,
    contactVersion: 2,
    personalizationKey: "b".repeat(64),
  };
  const first = await deriveCampaignDeliveryKey(
    7,
    campaignKey,
    deliveryIdentity,
  );
  const repeated = await deriveCampaignDeliveryKey(
    7,
    campaignKey,
    deliveryIdentity,
  );
  const newerContact = await deriveCampaignDeliveryKey(
    7,
    campaignKey,
    {
      ...deliveryIdentity,
      contactVersion: 3,
    },
  );

  assert.match(
    first,
    /^campaign_delivery_v1_[0-9a-f]{64}$/,
  );
  assert.equal(first, repeated);
  assert.notEqual(first, newerContact);
});

test("normalizes personalization before deriving its deterministic key", async () => {
  const first =
    await deriveCampaignPersonalizationKey(
      7,
      `template_v1_${"a".repeat(64)}`,
      {
        "url:1": "  CASE-17  ",
        "body:1": "  שם איש קשר  ",
      },
    );
  const reordered =
    await deriveCampaignPersonalizationKey(
      7,
      `template_v1_${"a".repeat(64)}`,
      {
        "body:1": "שם איש קשר",
        "url:1": "CASE-17",
      },
    );

  assert.deepEqual(first.personalization, {
    "body:1": "שם איש קשר",
    "url:1": "CASE-17",
  });
  assert.match(
    first.personalizationKey,
    /^[0-9a-f]{64}$/,
  );
  assert.equal(
    first.personalizationKey,
    reordered.personalizationKey,
  );
});

test("rejects unsupported personalization fields and empty values", async () => {
  await assert.rejects(
    deriveCampaignPersonalizationKey(
      7,
      `template_v1_${"a".repeat(64)}`,
      {
        firstName: "שם",
      },
    ),
    /personalization is invalid/,
  );
  await assert.rejects(
    deriveCampaignPersonalizationKey(
      7,
      `template_v1_${"a".repeat(64)}`,
      {
        "body:1": " ",
      },
    ),
    /personalization is invalid/,
  );
});
