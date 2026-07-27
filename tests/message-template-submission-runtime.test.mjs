import assert from "node:assert/strict";
import test from "node:test";

import {
  createMessageTemplateSubmissionRuntime,
} from "../server/templates/messageTemplateSubmissionRuntime.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";

const templateKey = `template_v1_${"a".repeat(64)}`;
const accessToken = toSensitiveMetaAccessToken(
  "template-runtime-access-token",
);
const session = {
  externalUserId: "external-user-id",
  tenantId: 7,
  displayName: "tenant-name",
  status: "active",
  role: "owner",
};

function draft(overrides = {}) {
  return {
    templateKey,
    tenantId: 7,
    metaTemplateId: null,
    name: "service_update",
    category: "UTILITY",
    language: "he",
    status: "draft",
    submissionKey: null,
    submissionStartedAt: null,
    lastSubmissionErrorCode: null,
    lastStatusEventKey: null,
    lastStatusEventAt: null,
    version: 1,
    submittedAt: null,
    reviewedAt: null,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 09:00:00",
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

test("composes the concrete Meta adapter into the submission service", async () => {
  const requests = [];
  let claimedTemplate;
  const templates = {
    async saveDraft() {
      throw new Error("must-not-run");
    },
    async listByTenant() {
      throw new Error("must-not-run");
    },
    async findByKey() {
      return draft();
    },
    async claimSubmission(
      tenantId,
      requestedTemplateKey,
      expectedVersion,
      submissionKey,
    ) {
      claimedTemplate = draft({
        status: "submitting",
        submissionKey,
        submissionStartedAt: "2026-07-25 10:00:00",
        version: expectedVersion + 1,
      });
      return claimedTemplate;
    },
    async completeSubmission(
      tenantId,
      requestedTemplateKey,
      submissionKey,
      metaTemplateId,
    ) {
      return {
        ...claimedTemplate,
        metaTemplateId,
        status: "pending_review",
        submittedAt: "2026-07-25 10:01:00",
        version: claimedTemplate.version + 1,
      };
    },
    async releaseSubmission() {
      throw new Error("must-not-run");
    },
  };
  const service = createMessageTemplateSubmissionRuntime({
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
          webhookSubscribedAt: "2026-07-25 08:00:00",
          connectedAt: "2026-07-25 08:00:00",
          version: 2,
          createdAt: "2026-07-25 08:00:00",
          updatedAt: "2026-07-25 08:00:00",
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
          id: "400004",
          status: "PENDING",
          category: "UTILITY",
        });
      },
    },
  });

  const result = await service.submit(session, templateKey);

  assert.equal(result.status, "pending_review");
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url.pathname,
    "/v21.0/200002/message_templates",
  );
  assert.equal(requests[0].init.method, "POST");
  assert.equal(
    requests[0].init.headers.authorization,
    `Bearer ${accessToken}`,
  );
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    name: "service_update",
    language: "he",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "שלום",
      },
    ],
  });
});
