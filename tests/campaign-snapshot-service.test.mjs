import assert from "node:assert/strict";
import test from "node:test";

import {
  createCampaignSnapshotService,
  CampaignSnapshotError,
} from "../server/campaigns/campaignSnapshotService.ts";

const templateKey =
  `template_v1_${"a".repeat(64)}`;

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function approvedTemplate(overrides = {}) {
  return {
    templateKey,
    tenantId: 7,
    metaTemplateId: "400004",
    name: "service_update",
    category: "UTILITY",
    language: "he",
    status: "approved",
    submissionKey:
      `template_submission_v1_${"b".repeat(64)}`,
    submissionStartedAt:
      "2026-07-25T09:59:00.000Z",
    lastSubmissionErrorCode: null,
    lastStatusEventKey: "c".repeat(64),
    lastStatusEventAt:
      "2026-07-25T10:00:00.000Z",
    version: 3,
    submittedAt: "2026-07-25T09:59:30.000Z",
    reviewedAt: "2026-07-25T10:00:00.000Z",
    createdAt: "2026-07-25T09:00:00.000Z",
    updatedAt: "2026-07-25T10:00:00.000Z",
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

function audienceContact(
  contactId,
  phoneNumber,
  firstName,
  overrides = {},
) {
  return {
    contactId,
    phoneNumber,
    firstName,
    lastName: null,
    email: null,
    company: null,
    mailingStatus: "subscribed",
    consentStatus: "granted",
    version: 2,
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    name: "עדכון שירות",
    deliveryMode: "immediate",
    scheduledAt: null,
    templateKey,
    audienceSource: {
      kind: "all",
    },
    personalizationMapping: {
      "body:1": "firstName",
    },
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = [];
  const service = createCampaignSnapshotService({
    audiences: {
      async listEligibleBySource(
        tenantId,
        source,
        limit,
      ) {
        calls.push({
          operation: "list-audience",
          tenantId,
          source,
          limit,
        });

        if (options.audienceError) {
          throw options.audienceError;
        }

        return options.audience === undefined
          ? [
              audienceContact(
                18,
                "+972509876543",
                "איש קשר שני",
              ),
              audienceContact(
                17,
                "+972501234567",
                "איש קשר ראשון",
              ),
            ]
          : options.audience;
      },
    },
    campaigns: {
      async saveSnapshot(input) {
        calls.push({
          operation: "save-campaign",
          input,
        });

        if (options.saveError) {
          throw options.saveError;
        }

        return {
          ...input,
          status: "draft",
          version: 1,
          activatedAt: null,
          startedAt: null,
          completedAt: null,
          lastErrorCode: null,
          createdAt: "2026-07-26T08:00:00.000Z",
          updatedAt: "2026-07-26T08:00:00.000Z",
        };
      },
      async findByKey() {
        throw new Error("must-not-run");
      },
      async listByTenant() {
        throw new Error("must-not-run");
      },
    },
    templates: {
      async findByKey(tenantId, requestedTemplateKey) {
        calls.push({
          operation: "find-template",
          tenantId,
          templateKey: requestedTemplateKey,
        });

        if (options.templateError) {
          throw options.templateError;
        }

        return options.template === undefined
          ? approvedTemplate()
          : options.template;
      },
    },
    businessProfiles: {
      async findByTenantId(tenantId) {
        calls.push({
          operation: "find-profile",
          tenantId,
        });

        if (options.profileError) {
          throw options.profileError;
        }

        return options.profile === undefined
          ? {
              tenantId: 7,
              businessName: "tenant-name",
              timezone: "Asia/Jerusalem",
              interfaceLanguage: "he",
              version: 2,
              createdAt:
                "2026-07-25T08:00:00.000Z",
              updatedAt:
                "2026-07-25T09:00:00.000Z",
            }
          : options.profile;
      },
    },
  });

  return { calls, service };
}

test("freezes an approved template and sorted eligible recipients", async () => {
  const testFixture = fixture();

  const result = await testFixture.service.save(
    session(),
    request(),
  );

  assert.equal(result.status, "draft");
  assert.equal(result.template.metaTemplateId, "400004");
  assert.equal(result.timezone, "Asia/Jerusalem");
  assert.match(
    result.campaignKey,
    /^campaign_v1_[0-9a-f]{64}$/,
  );
  assert.match(
    result.audienceSnapshotKey,
    /^[0-9a-f]{64}$/,
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    [
      "find-profile",
      "find-template",
      "list-audience",
      "save-campaign",
    ],
  );
  const audienceRead = testFixture.calls[2];
  const savedInput = testFixture.calls[3].input;

  assert.deepEqual(audienceRead, {
    operation: "list-audience",
    tenantId: 7,
    source: {
      kind: "all",
    },
    limit: 100_001,
  });

  assert.deepEqual(
    savedInput.recipients.map(
      (currentRecipient) =>
        currentRecipient.contactId,
    ),
    [17, 18],
  );
  assert.ok(
    savedInput.recipients.every(
      (currentRecipient) =>
        /^[0-9a-f]{64}$/.test(
          currentRecipient.personalizationKey,
        ) &&
        /^campaign_delivery_v1_[0-9a-f]{64}$/.test(
          currentRecipient.deliveryKey,
        ),
    ),
  );
});

test("derives the same campaign and delivery identities on retry", async () => {
  const testFixture = fixture();

  await testFixture.service.save(session(), request());
  await testFixture.service.save(session(), request());

  const writes = testFixture.calls.filter(
    (call) => call.operation === "save-campaign",
  );

  assert.equal(
    writes[0].input.campaignKey,
    writes[1].input.campaignKey,
  );
  assert.deepEqual(
    writes[0].input.recipients.map(
      (currentRecipient) =>
        currentRecipient.deliveryKey,
    ),
    writes[1].input.recipients.map(
      (currentRecipient) =>
        currentRecipient.deliveryKey,
    ),
  );
});

test("checks permission and basic input before repository reads", async () => {
  const viewer = fixture();
  const invalid = fixture();

  await assert.rejects(
    viewer.service.save(session("viewer"), request()),
    (error) => error.code === "PERMISSION_DENIED",
  );
  await assert.rejects(
    invalid.service.save(session(), {
      ...request(),
      templateKey: "../template",
    }),
    (error) =>
      error instanceof CampaignSnapshotError &&
      error.code === "INVALID_INPUT",
  );
  assert.deepEqual(viewer.calls, []);
  assert.deepEqual(invalid.calls, []);
});

test("lists campaigns through the tenant read permission", async () => {
  const calls = [];
  const service = createCampaignSnapshotService({
    audiences: {
      async listEligibleBySource() {
        throw new Error("must-not-run");
      },
    },
    campaigns: {
      async saveSnapshot() {
        throw new Error("must-not-run");
      },
      async findByKey() {
        throw new Error("must-not-run");
      },
      async listByTenant(tenantId, limit) {
        calls.push({ tenantId, limit });
        return [];
      },
    },
    templates: {
      async findByKey() {
        throw new Error("must-not-run");
      },
    },
    businessProfiles: {
      async findByTenantId() {
        throw new Error("must-not-run");
      },
    },
  });

  assert.deepEqual(
    await service.list(session("viewer")),
    [],
  );
  assert.deepEqual(calls, [
    {
      tenantId: 7,
      limit: 100,
    },
  ]);
  await assert.rejects(
    service.list(session("agent")),
    (error) => error.code === "PERMISSION_DENIED",
  );
});

test("requires a business profile and an approved template", async () => {
  const noProfile = fixture({ profile: null });
  const noTemplate = fixture({ template: null });
  const pendingTemplate = fixture({
    template: approvedTemplate({
      status: "pending_review",
    }),
  });

  await assert.rejects(
    noProfile.service.save(session(), request()),
    (error) => error.code === "PROFILE_REQUIRED",
  );
  await assert.rejects(
    noTemplate.service.save(session(), request()),
    (error) => error.code === "TEMPLATE_NOT_FOUND",
  );
  await assert.rejects(
    pendingTemplate.service.save(
      session(),
      request(),
    ),
    (error) =>
      error.code === "TEMPLATE_NOT_APPROVED",
  );
  assert.equal(
    noProfile.calls.some(
      (call) => call.operation === "save-campaign",
    ),
    false,
  );
  assert.equal(
    pendingTemplate.calls.some(
      (call) => call.operation === "save-campaign",
    ),
    false,
  );
});

test("rejects missing mapping, duplicate contacts, and stale consent", async () => {
  const cases = [
    {
      testFixture: fixture(),
      currentRequest: request({
        personalizationMapping: {},
      }),
    },
    {
      testFixture: fixture({
        audience: [
          audienceContact(
            17,
            "+972501234567",
            "שם",
          ),
          audienceContact(
            17,
            "+972501234567",
            "שם",
          ),
        ],
      }),
      currentRequest: request(),
    },
    {
      testFixture: fixture({
        audience: [
          audienceContact(
            17,
            "+972501234567",
            "שם",
            {
              mailingStatus: "unsubscribed",
              consentStatus: "withdrawn",
            },
          ),
        ],
      }),
      currentRequest: request(),
    },
  ];

  for (const {
    testFixture,
    currentRequest,
  } of cases) {
    await assert.rejects(
      testFixture.service.save(
        session(),
        currentRequest,
      ),
      (error) =>
        error instanceof CampaignSnapshotError &&
        error.code === "INVALID_AUDIENCE",
    );
    assert.equal(
      testFixture.calls.some(
        (call) =>
          call.operation === "save-campaign",
      ),
      false,
    );
  }
});

test("requires a separate dynamic URL personalization value", async () => {
  const dynamicTemplate = approvedTemplate({
    buttonMode: "call_to_action",
    urlButton: {
      enabled: true,
      mode: "dynamic",
      text: "פתיחת פנייה",
      value: "https://example.invalid/cases/{{1}}",
      example: "CASE-17",
    },
  });
  const missingUrl = fixture({
    template: dynamicTemplate,
  });
  const complete = fixture({
    template: dynamicTemplate,
    audience: [
      audienceContact(
        17,
        "+972501234567",
        "שם",
        {
          company: "CASE-17",
        },
      ),
    ],
  });

  await assert.rejects(
    missingUrl.service.save(session(), request()),
    (error) => error.code === "INVALID_AUDIENCE",
  );
  const result = await complete.service.save(
    session(),
    request({
      personalizationMapping: {
        "body:1": "firstName",
        "url:1": "company",
      },
    }),
  );

  assert.equal(result.recipientCount, 1);
});

test("maps dependency and snapshot write failures to a bounded code", async () => {
  const profileFailure = fixture({
    profileError: new Error("internal profile detail"),
  });
  const writeFailure = fixture({
    saveError: new Error("internal D1 detail"),
  });
  const audienceFailure = fixture({
    audienceError: new Error(
      "internal audience detail",
    ),
  });

  for (const testFixture of [
    profileFailure,
    audienceFailure,
    writeFailure,
  ]) {
    await assert.rejects(
      testFixture.service.save(session(), request()),
      (error) => {
        assert.ok(error instanceof CampaignSnapshotError);
        assert.equal(error.code, "PERSISTENCE_FAILED");
        assert.doesNotMatch(
          error.message,
          /internal/,
        );
        return true;
      },
    );
  }
});
