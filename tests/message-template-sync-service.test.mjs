import assert from "node:assert/strict";
import test from "node:test";

import {
  MessageTemplateIdentityConflictError,
} from "../db/messageTemplateRepository.ts";
import {
  MetaCredentialVaultError,
} from "../server/meta/metaCredentialVault.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";
import {
  createMessageTemplateSyncService,
  MessageTemplateSyncError,
} from "../server/templates/messageTemplateSyncService.ts";

const accessToken = toSensitiveMetaAccessToken(
  "template-sync-access-token",
);

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function persistedTemplate(overrides = {}) {
  return {
    templateKey: `template_v1_${"a".repeat(64)}`,
    tenantId: 7,
    metaTemplateId: "400004",
    name: "service_update",
    category: "UTILITY",
    language: "he",
    status: "approved",
    submissionKey:
      `template_submission_v1_${"b".repeat(64)}`,
    submissionStartedAt: "2026-07-25T09:59:00.000Z",
    lastSubmissionErrorCode: null,
    lastStatusEventKey: "c".repeat(64),
    lastStatusEventAt: "2026-07-25T10:00:00.000Z",
    version: 4,
    submittedAt: "2026-07-25T09:59:30.000Z",
    reviewedAt: "2026-07-25T10:00:00.000Z",
    createdAt: "2026-07-25T09:00:00.000Z",
    updatedAt: "2026-07-25T10:00:00.000Z",
    header: "",
    body: "שלום",
    footer: "",
    variableExamples: {},
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

function snapshot(overrides = {}) {
  return {
    metaTemplateId: "400004",
    name: "service_update",
    language: "he",
    category: "UTILITY",
    providerStatus: "APPROVED",
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = [];
  const outcomes = [
    ...(options.outcomes ?? ["applied"]),
  ];
  const templates = {
    async saveDraft() {
      throw new Error("must-not-run");
    },
    async findByKey() {
      throw new Error("must-not-run");
    },
    async findByMetaId() {
      throw new Error("must-not-run");
    },
    async claimSubmission() {
      throw new Error("must-not-run");
    },
    async completeSubmission() {
      throw new Error("must-not-run");
    },
    async releaseSubmission() {
      throw new Error("must-not-run");
    },
    async applyStatusEvent(input) {
      calls.push({
        operation: "apply-status",
        input,
      });

      if (options.applyError) {
        throw options.applyError;
      }

      const outcome = outcomes.shift() ?? "not-found";

      return outcome === "not-found"
        ? { outcome }
        : {
            outcome,
            template: persistedTemplate({
              metaTemplateId: input.metaTemplateId,
              name: input.name,
              language: input.language,
              category: input.category,
              status: input.status,
            }),
          };
    },
    async listByTenant(tenantId, limit) {
      calls.push({
        operation: "list-local",
        tenantId,
        limit,
      });

      if (options.listError) {
        throw options.listError;
      }

      return [persistedTemplate()];
    },
  };
  const service = createMessageTemplateSyncService({
    templates,
    metaConnections: {
      async findConnectionByTenantId(tenantId) {
        calls.push({
          operation: "find-connection",
          tenantId,
        });

        if (options.connectionError) {
          throw options.connectionError;
        }

        return options.connection === undefined
          ? {
              tenantId: 7,
              businessPortfolioId: "100001",
              wabaId: "200002",
              phoneNumberId: "300003",
              status: "connected",
              webhookSubscribedAt:
                "2026-07-25T09:00:00.000Z",
              connectedAt:
                "2026-07-25T09:00:00.000Z",
              version: 2,
              createdAt:
                "2026-07-25T08:00:00.000Z",
              updatedAt:
                "2026-07-25T09:00:00.000Z",
            }
          : options.connection;
      },
    },
    credentialVault: {
      async storeAccessToken() {
        throw new Error("must-not-run");
      },
      async withAccessToken(tenantId, operation) {
        calls.push({
          operation: "read-credential",
          tenantId,
        });

        if (options.credentialError) {
          throw options.credentialError;
        }

        return operation(accessToken);
      },
    },
    lister: {
      async list(input) {
        calls.push({
          operation: "list-meta",
          input,
        });

        if (options.listMetaError) {
          throw options.listMetaError;
        }

        return options.snapshots ?? [snapshot()];
      },
    },
    clock: () =>
      new Date("2026-07-25T10:00:00.000Z"),
  });

  return { calls, service };
}

test("synchronizes eligible snapshots and reports every outcome", async () => {
  const testFixture = fixture({
    snapshots: [
      snapshot(),
      snapshot({
        metaTemplateId: "400005",
        name: "account_notice",
        providerStatus: "PENDING",
      }),
      snapshot({
        metaTemplateId: "400006",
        name: "service_rejected",
        providerStatus: "REJECTED",
      }),
      snapshot({
        metaTemplateId: "400007",
        name: "service_disabled",
        providerStatus: "DISABLED",
      }),
      snapshot({
        metaTemplateId: "400008",
        name: "authentication_code",
        category: "AUTHENTICATION",
      }),
    ],
    outcomes: [
      "applied",
      "duplicate",
      "stale",
      "not-found",
    ],
  });

  const result = await testFixture.service.sync(session());

  assert.deepEqual(result.summary, {
    received: 5,
    eligible: 4,
    updated: 1,
    unchanged: 1,
    stale: 1,
    unmatched: 1,
    unsupported: 1,
    observedAt: "2026-07-25T10:00:00.000Z",
  });
  assert.equal(result.templates.length, 1);
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    [
      "find-connection",
      "read-credential",
      "list-meta",
      "apply-status",
      "apply-status",
      "apply-status",
      "apply-status",
      "list-local",
    ],
  );
  const appliedInputs = testFixture.calls
    .filter((call) => call.operation === "apply-status")
    .map((call) => call.input);
  assert.deepEqual(
    appliedInputs.map((input) => input.status),
    [
      "approved",
      "pending_review",
      "rejected",
      "disabled",
    ],
  );
  assert.ok(
    appliedInputs.every(
      (input) =>
        input.category === "UTILITY" &&
        /^[0-9a-f]{64}$/.test(input.statusEventKey) &&
        input.statusEventAt ===
          "2026-07-25T10:00:00.000Z",
    ),
  );
  assert.deepEqual(testFixture.calls.at(-1), {
    operation: "list-local",
    tenantId: 7,
    limit: 100,
  });
});

test("derives the same snapshot key for the same provider state", async () => {
  const testFixture = fixture({
    outcomes: ["applied", "duplicate"],
  });

  await testFixture.service.sync(session());
  await testFixture.service.sync(session());

  const keys = testFixture.calls
    .filter((call) => call.operation === "apply-status")
    .map((call) => call.input.statusEventKey);

  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
});

test("checks write permission before reading tenant dependencies", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.sync(session("viewer")),
    (error) => error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("requires an active Meta connection before credential access", async () => {
  const testFixture = fixture({
    connection: null,
  });

  await assert.rejects(
    testFixture.service.sync(session()),
    (error) =>
      error instanceof MessageTemplateSyncError &&
      error.code === "META_NOT_CONNECTED",
  );
  assert.deepEqual(
    testFixture.calls.map((call) => call.operation),
    ["find-connection"],
  );
});

test("maps credential, identity, and provider failures to bounded errors", async () => {
  const cases = [
    {
      options: {
        credentialError: new MetaCredentialVaultError(
          "CREDENTIAL_NOT_FOUND",
          "sensitive credential detail",
        ),
      },
      code: "CREDENTIAL_UNAVAILABLE",
    },
    {
      options: {
        applyError:
          new MessageTemplateIdentityConflictError(),
      },
      code: "IDENTITY_CONFLICT",
    },
    {
      options: {
        listMetaError: new Error(
          "provider response detail",
        ),
      },
      code: "SYNC_FAILED",
    },
  ];

  for (const item of cases) {
    const testFixture = fixture(item.options);

    await assert.rejects(
      testFixture.service.sync(session()),
      (error) => {
        assert.ok(error instanceof MessageTemplateSyncError);
        assert.equal(error.code, item.code);
        assert.doesNotMatch(
          error.message,
          /sensitive|provider/,
        );
        return true;
      },
    );
  }
});
