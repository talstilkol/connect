import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaMessageTemplateAdapter,
  MetaMessageTemplateContractError,
} from "../server/templates/metaMessageTemplateAdapter.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";

const accessToken = toSensitiveMetaAccessToken(
  "meta-access-token",
);

function draft(overrides = {}) {
  return {
    name: "service_update",
    category: "UTILITY",
    language: "he",
    header: "עדכון שירות",
    body: "שלום {{1}}, הפנייה {{2}} עודכנה",
    footer: "צוות השירות",
    variableExamples: {
      1: "שם איש קשר",
      2: "REF-2026-001",
    },
    buttonMode: "quick_reply",
    quickReplies: ["אישור", "הסרה"],
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

function fixture(response = {
  id: "123456789",
  status: "PENDING",
  category: "UTILITY",
}) {
  const requests = [];
  const adapter = createMetaMessageTemplateAdapter({
    async requestJson(request) {
      requests.push(request);
      return response;
    },
  });

  return {
    adapter,
    requests,
  };
}

test("maps text components, ordered examples, and quick replies", async () => {
  const testFixture = fixture();

  const result = await testFixture.adapter.submit({
    wabaId: "987654321",
    accessToken,
    template: draft(),
  });

  assert.deepEqual(result, {
    metaTemplateId: "123456789",
    status: "pending_review",
    category: "UTILITY",
  });
  assert.deepEqual(testFixture.requests, [
    {
      method: "POST",
      pathSegments: ["987654321", "message_templates"],
      accessToken,
      jsonBody: {
        name: "service_update",
        language: "he",
        category: "UTILITY",
        components: [
          {
            type: "HEADER",
            format: "TEXT",
            text: "עדכון שירות",
          },
          {
            type: "BODY",
            text: "שלום {{1}}, הפנייה {{2}} עודכנה",
            example: {
              body_text: [
                ["שם איש קשר", "REF-2026-001"],
              ],
            },
          },
          {
            type: "FOOTER",
            text: "צוות השירות",
          },
          {
            type: "BUTTONS",
            buttons: [
              {
                type: "QUICK_REPLY",
                text: "אישור",
              },
              {
                type: "QUICK_REPLY",
                text: "הסרה",
              },
            ],
          },
        ],
      },
    },
  ]);
});

test("maps dynamic URL and phone call-to-action buttons", async () => {
  const testFixture = fixture();

  await testFixture.adapter.submit({
    wabaId: "987654321",
    accessToken,
    template: draft({
      header: "",
      footer: "",
      buttonMode: "call_to_action",
      quickReplies: [],
      urlButton: {
        enabled: true,
        mode: "dynamic",
        text: "פתיחת פנייה",
        value: "https://example.invalid/cases/{{1}}",
        example: "REF-2026-001",
      },
      phoneButton: {
        enabled: true,
        text: "חיוג",
        value: "+972501234567",
      },
    }),
  });

  assert.deepEqual(
    testFixture.requests[0].jsonBody.components.at(-1),
    {
      type: "BUTTONS",
      buttons: [
        {
          type: "PHONE_NUMBER",
          text: "חיוג",
          phone_number: "+972501234567",
        },
        {
          type: "URL",
          text: "פתיחת פנייה",
          url: "https://example.invalid/cases/{{1}}",
          example: ["REF-2026-001"],
        },
      ],
    },
  );
});

test("rejects invalid WABA and template input before transport", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.adapter.submit({
      wabaId: "../message_templates",
      accessToken,
      template: draft(),
    }),
    (error) =>
      error instanceof MetaMessageTemplateContractError &&
      error.code === "INVALID_TEMPLATE_REQUEST",
  );
  await assert.rejects(
    testFixture.adapter.submit({
      wabaId: "987654321",
      accessToken,
      template: draft({
        name: "Invalid Name",
      }),
    }),
    (error) =>
      error instanceof MetaMessageTemplateContractError &&
      error.code === "INVALID_TEMPLATE_REQUEST",
  );
  assert.equal(testFixture.requests.length, 0);
});

test("rejects incomplete or contradictory Meta responses", async () => {
  for (const response of [
    {
      status: "PENDING",
      category: "UTILITY",
    },
    {
      id: "123456789",
      status: "APPROVED",
      category: "UTILITY",
    },
    {
      id: "123456789",
      status: "PENDING",
      category: "MARKETING",
    },
  ]) {
    const testFixture = fixture(response);

    await assert.rejects(
      testFixture.adapter.submit({
        wabaId: "987654321",
        accessToken,
        template: draft(),
      }),
      (error) =>
        error instanceof MetaMessageTemplateContractError &&
        error.code === "INVALID_TEMPLATE_RESPONSE",
    );
  }
});
