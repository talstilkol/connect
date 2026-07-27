import assert from "node:assert/strict";
import test from "node:test";

import {
  toCampaignActivationView,
  toCampaignAudienceOptionsView,
  toCampaignTemplateOptionView,
  toCampaignView,
} from "../server/campaigns/campaignView.ts";

const campaignKey =
  `campaign_v1_${"a".repeat(64)}`;
const templateKey =
  `template_v1_${"b".repeat(64)}`;

function template(overrides = {}) {
  return {
    templateKey,
    tenantId: 7,
    metaTemplateId: "400004",
    name: "service_update",
    category: "UTILITY",
    language: "he",
    status: "approved",
    submissionKey:
      `template_submission_v1_${"c".repeat(64)}`,
    submissionStartedAt:
      "2026-07-26T08:00:00.000Z",
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 3,
    submittedAt: "2026-07-26T08:01:00.000Z",
    reviewedAt: "2026-07-26T08:02:00.000Z",
    createdAt: "2026-07-26T07:00:00.000Z",
    updatedAt: "2026-07-26T08:02:00.000Z",
    header: "",
    body: "שלום {{1}}, קוד {{2}}",
    footer: "",
    variableExamples: {
      1: "שם",
      2: "קוד",
    },
    buttonMode: "call_to_action",
    quickReplies: [],
    urlButton: {
      enabled: true,
      mode: "dynamic",
      text: "צפייה",
      value: "https://example.com/{{1}}",
      example: "record",
    },
    phoneButton: {
      enabled: false,
      text: "",
      value: "",
    },
    ...overrides,
  };
}

function campaign() {
  return {
    campaignKey,
    tenantId: 7,
    name: "עדכון שירות",
    status: "draft",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: {
      templateKey,
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
    audienceSnapshotKey: "d".repeat(64),
    recipientCount: 12,
    version: 1,
    activatedAt: null,
    startedAt: null,
    completedAt: null,
    lastErrorCode: null,
    createdAt: "2026-07-26T09:00:00.000Z",
    updatedAt: "2026-07-26T09:00:00.000Z",
  };
}

test("removes tenant, Meta, audience, and template content from the campaign browser DTO", () => {
  const view = toCampaignView(campaign());
  const serialized = JSON.stringify(view);

  assert.equal(view.name, "עדכון שירות");
  assert.equal(view.templateName, "service_update");
  assert.equal(view.recipientCount, 12);
  assert.doesNotMatch(
    serialized,
    /tenantId|metaTemplateId|audienceSnapshotKey|lastErrorCode|variableExamples|phoneButton|urlButton|deliveryKey|phoneNumber/,
  );
});

test("exposes only approved template requirements and safe audience group summaries", () => {
  const option =
    toCampaignTemplateOptionView(template());
  const disabled =
    toCampaignTemplateOptionView(
      template({ status: "disabled" }),
    );
  const audiences =
    toCampaignAudienceOptionsView({
      scopeContactIds: [17],
      tags: [
        {
          id: 3,
          name: "לקוחות",
          contactCount: 4,
        },
      ],
      lists: [
        {
          id: 5,
          name: "עדכונים",
          contactCount: 6,
        },
      ],
      tagAssignments: [
        { contactId: 17, tagId: 3 },
      ],
      listMemberships: [
        { contactId: 17, listId: 5 },
      ],
    });

  assert.deepEqual(option.personalizationKeys, [
    "body:1",
    "body:2",
    "url:1",
  ]);
  assert.equal(
    "metaTemplateId" in option,
    false,
  );
  assert.equal(disabled, null);
  assert.deepEqual(audiences, {
    lists: [
      {
        id: 5,
        name: "עדכונים",
        contactCount: 6,
      },
    ],
    tags: [
      {
        id: 3,
        name: "לקוחות",
        contactCount: 4,
      },
    ],
  });
});

test("maps only the bounded scheduled activation state", () => {
  assert.deepEqual(
    toCampaignActivationView({
      campaignKey,
      tenantId: 7,
      status: "scheduled",
      version: 2,
      activatedAt:
        "2026-07-26T10:00:00.000Z",
      startedAt: null,
    }),
    {
      campaignKey,
      status: "scheduled",
      version: 2,
      activatedAt:
        "2026-07-26T10:00:00.000Z",
      startedAt: null,
    },
  );
});
