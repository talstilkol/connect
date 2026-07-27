import assert from "node:assert/strict";
import test from "node:test";

import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";
import {
  createMessageTemplateSyncActionHandler,
} from "../server/templates/messageTemplateSyncActionHandler.ts";
import {
  MessageTemplateSyncError,
} from "../server/templates/messageTemplateSyncService.ts";

const session = {
  externalUserId: "external-user-id",
  tenantId: 7,
  displayName: "tenant-name",
  status: "active",
  role: "owner",
};

function persistedTemplate() {
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
  };
}

function fixture(options = {}) {
  const calls = [];
  const handler = createMessageTemplateSyncActionHandler({
    applicationConfigured: () =>
      options.applicationConfigured ?? true,
    readSyncReadiness: () =>
      options.syncReadiness ?? {
        status: "configured",
      },
    async createSyncContext() {
      calls.push("sync-context");

      if (options.contextError) {
        throw options.contextError;
      }

      return {
        session,
        service: {
          async sync() {
            calls.push("sync");

            if (options.syncError) {
              throw options.syncError;
            }

            return {
              templates: [persistedTemplate()],
              summary: {
                received: 1,
                eligible: 1,
                updated: 1,
                unchanged: 0,
                stale: 0,
                unmatched: 0,
                unsupported: 0,
                observedAt:
                  "2026-07-25T10:00:00.000Z",
              },
            };
          },
        },
      };
    },
  });

  return { calls, handler };
}

test("stops before context when application or Meta configuration is unavailable", async () => {
  const applicationMissing = fixture({
    applicationConfigured: false,
  });
  const metaDisabled = fixture({
    syncReadiness: { status: "disabled" },
  });
  const metaIncomplete = fixture({
    syncReadiness: { status: "incomplete" },
  });

  assert.deepEqual(
    await applicationMissing.handler.sync(),
    { status: "configuration-required" },
  );
  assert.deepEqual(
    await metaDisabled.handler.sync(),
    { status: "meta-configuration-required" },
  );
  assert.deepEqual(
    await metaIncomplete.handler.sync(),
    { status: "meta-configuration-invalid" },
  );
  assert.deepEqual(applicationMissing.calls, []);
  assert.deepEqual(metaDisabled.calls, []);
  assert.deepEqual(metaIncomplete.calls, []);
});

test("returns a bounded synchronized browser DTO", async () => {
  const testFixture = fixture();

  const result = await testFixture.handler.sync();

  assert.equal(result.status, "synced");
  assert.equal(result.templates[0].status, "approved");
  assert.equal("tenantId" in result.templates[0], false);
  assert.equal("metaTemplateId" in result.templates[0], false);
  assert.deepEqual(result.summary, {
    received: 1,
    eligible: 1,
    updated: 1,
    unchanged: 0,
    stale: 0,
    unmatched: 0,
    unsupported: 0,
    observedAt: "2026-07-25T10:00:00.000Z",
  });
  assert.deepEqual(testFixture.calls, [
    "sync-context",
    "sync",
  ]);
});

test("maps tenant and synchronization errors without exposing internals", async () => {
  const cases = [
    {
      error: new TenantSessionError(
        "AUTHENTICATION_REQUIRED",
        "internal tenant detail",
      ),
      status: "unauthenticated",
    },
    {
      error: new MessageTemplateSyncError(
        "META_NOT_CONNECTED",
      ),
      status: "meta-not-connected",
    },
    {
      error: new MessageTemplateSyncError(
        "CREDENTIAL_UNAVAILABLE",
      ),
      status: "credential-unavailable",
    },
    {
      error: new MessageTemplateSyncError(
        "IDENTITY_CONFLICT",
      ),
      status: "identity-conflict",
    },
    {
      error: new MessageTemplateSyncError(
        "SYNC_FAILED",
      ),
      status: "sync-failed",
    },
  ];

  for (const item of cases) {
    const testFixture =
      item.error instanceof TenantSessionError
        ? fixture({ contextError: item.error })
        : fixture({ syncError: item.error });
    const result = await testFixture.handler.sync();

    assert.deepEqual(result, {
      status: item.status,
    });
    assert.doesNotMatch(
      JSON.stringify(result),
      /internal tenant detail/,
    );
  }
});
