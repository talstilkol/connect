import assert from "node:assert/strict";
import test from "node:test";

import {
  personalizeCampaignContact,
  validateCampaignAudienceSource,
  validateCampaignPersonalizationMapping,
} from "../shared/validation/campaignAudience.ts";

function contact(overrides = {}) {
  return {
    contactId: 17,
    phoneNumber: "+972501234567",
    firstName: "שם פרטי",
    lastName: "שם משפחה",
    email: "person@example.invalid",
    company: "חברה",
    mailingStatus: "subscribed",
    consentStatus: "granted",
    version: 2,
    ...overrides,
  };
}

test("accepts only exact all, list, and tag audience sources", () => {
  assert.deepEqual(
    validateCampaignAudienceSource({
      kind: "all",
    }),
    {
      success: true,
      value: {
        kind: "all",
      },
    },
  );
  assert.deepEqual(
    validateCampaignAudienceSource({
      kind: "list",
      listId: 11,
    }),
    {
      success: true,
      value: {
        kind: "list",
        listId: 11,
      },
    },
  );
  assert.deepEqual(
    validateCampaignAudienceSource({
      kind: "tag",
      tagId: 12,
    }),
    {
      success: true,
      value: {
        kind: "tag",
        tagId: 12,
      },
    },
  );

  for (const invalid of [
    {
      kind: "all",
      listId: 11,
    },
    {
      kind: "list",
      listId: 0,
    },
    {
      kind: "tag",
      tagId: "12",
    },
    {
      kind: "segment",
      segmentId: 13,
    },
  ]) {
    assert.deepEqual(
      validateCampaignAudienceSource(invalid),
      { success: false },
    );
  }
});

test("requires one real contact field for every template value", () => {
  assert.deepEqual(
    validateCampaignPersonalizationMapping(
      {
        "url:1": "company",
        "body:1": "firstName",
      },
      ["body:1", "url:1"],
    ),
    {
      success: true,
      value: {
        "body:1": "firstName",
        "url:1": "company",
      },
    },
  );

  for (const invalid of [
    {
      "body:1": "firstName",
    },
    {
      "body:1": "displayName",
      "url:1": "company",
    },
    {
      "body:1": "firstName",
      "body:2": "lastName",
      "url:1": "company",
    },
  ]) {
    assert.deepEqual(
      validateCampaignPersonalizationMapping(
        invalid,
        ["body:1", "url:1"],
      ),
      { success: false },
    );
  }
});

test("builds normalized personalization without inventing missing values", () => {
  assert.deepEqual(
    personalizeCampaignContact(
      contact({
        firstName: "  שם פרטי  ",
      }),
      {
        "body:1": "firstName",
        "url:1": "company",
      },
    ),
    {
      success: true,
      value: {
        "body:1": "שם פרטי",
        "url:1": "חברה",
      },
    },
  );
  assert.deepEqual(
    personalizeCampaignContact(
      contact({
        company: null,
      }),
      {
        "url:1": "company",
      },
    ),
    { success: false },
  );
});
