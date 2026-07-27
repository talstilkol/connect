import assert from "node:assert/strict";
import test from "node:test";

import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";
import {
  createMessageTemplateSyncRuntime,
} from "../server/templates/messageTemplateSyncRuntime.ts";

const accessToken = toSensitiveMetaAccessToken(
  "template-sync-runtime-access-token",
);
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

test("composes Graph transport, list adapter, and sync service", async () => {
  const requests = [];
  const statusInputs = [];
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
      statusInputs.push(input);
      return {
        outcome: "applied",
        template: persistedTemplate(),
      };
    },
    async listByTenant() {
      return [persistedTemplate()];
    },
  };
  const service = createMessageTemplateSyncRuntime({
    environment: {
      META_GRAPH_API_VERSION: "v21.0",
    },
    templates,
    metaConnections: {
      async findConnectionByTenantId() {
        return {
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
        };
      },
    },
    credentialVault: {
      async storeAccessToken() {
        throw new Error("must-not-run");
      },
      async withAccessToken(tenantId, operation) {
        return operation(accessToken);
      },
    },
    transportOptions: {
      async fetchImplementation(url, init) {
        requests.push({ url, init });
        return Response.json({
          data: [
            {
              id: "400004",
              name: "service_update",
              language: "he",
              status: "APPROVED",
              category: "UTILITY",
            },
          ],
        });
      },
    },
    clock: () =>
      new Date("2026-07-25T10:00:00.000Z"),
  });

  const result = await service.sync(session);

  assert.equal(result.summary.updated, 1);
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url.pathname,
    "/v21.0/200002/message_templates",
  );
  assert.equal(
    requests[0].url.searchParams.get("fields"),
    "id,name,language,status,category",
  );
  assert.equal(
    requests[0].url.searchParams.get("limit"),
    "100",
  );
  assert.equal(
    requests[0].url.searchParams.has("access_token"),
    false,
  );
  assert.equal(requests[0].init.method, "GET");
  assert.equal(
    requests[0].init.headers.authorization,
    `Bearer ${accessToken}`,
  );
  assert.equal(statusInputs[0].status, "approved");
  assert.equal(statusInputs[0].category, "UTILITY");
});
