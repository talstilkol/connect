import assert from "node:assert/strict";
import test from "node:test";

import {
  MessageTemplateIdentityConflictError,
} from "../db/messageTemplateRepository.ts";
import {
  MetaWebhookProcessorError,
} from "../server/meta/metaWebhookIngress.ts";
import {
  createMessageTemplateStatusBatchProcessor,
  createMessageTemplateStatusEventProcessor,
  parseMetaTemplateStatusEvent,
} from "../server/templates/messageTemplateStatusProcessor.ts";

const receiptEventKey = "a".repeat(64);

function templateEvent(overrides = {}) {
  return {
    dispatchKey: `${receiptEventKey}:0:0:template_status`,
    kind: "template_status",
    entryIndex: 0,
    changeIndex: 0,
    occurredAt: 1784973600,
    value: {
      event: "APPROVED",
      message_template_id: "123456789",
      message_template_name: "service_update",
      message_template_language: "en-US",
      reason: null,
    },
    ...overrides,
  };
}

test("parses the bounded Meta template status contract", () => {
  const parsed = parseMetaTemplateStatusEvent(
    templateEvent(),
  );

  assert.deepEqual(parsed, {
    providerEvent: "APPROVED",
    status: "approved",
    metaTemplateId: "123456789",
    name: "service_update",
    language: "en_US",
    statusEventAt: new Date(
      1784973600 * 1_000,
    ).toISOString(),
  });
});

test("maps every supported provider event to a send-safe local status", () => {
  const cases = {
    APPROVED: "approved",
    REINSTATED: "approved",
    PENDING: "pending_review",
    IN_APPEAL: "pending_review",
    REJECTED: "rejected",
    DISABLED: "disabled",
    FLAGGED: "disabled",
    PENDING_DELETION: "disabled",
    DELETED: "deleted",
  };

  for (const [providerEvent, expectedStatus] of Object.entries(
    cases,
  )) {
    const parsed = parseMetaTemplateStatusEvent(
      templateEvent({
        value: {
          ...templateEvent().value,
          event: providerEvent,
        },
      }),
    );

    assert.equal(parsed.status, expectedStatus);
  }
});

test("derives one deterministic event key and sends no provider reason to storage", async () => {
  const inputs = [];
  const repository = {
    async applyStatusEvent(input) {
      inputs.push(input);
      return { outcome: "not-found" };
    },
  };
  const processEvent =
    createMessageTemplateStatusEventProcessor(
      repository,
    );

  await processEvent(templateEvent(), 7);
  await processEvent(templateEvent(), 7);

  assert.equal(inputs.length, 2);
  assert.equal(
    inputs[0].statusEventKey,
    inputs[1].statusEventKey,
  );
  assert.match(inputs[0].statusEventKey, /^[0-9a-f]{64}$/);
  assert.deepEqual(Object.keys(inputs[0]).sort(), [
    "language",
    "metaTemplateId",
    "name",
    "status",
    "statusEventAt",
    "statusEventKey",
    "tenantId",
  ]);
});

test("rejects malformed identity, timestamp, language, and unknown lifecycle values", () => {
  const cases = [
    {
      expectedCode: "INVALID_TEMPLATE_STATUS_EVENT",
      event: templateEvent({
        value: {
          ...templateEvent().value,
          message_template_id: 9_007_199_254_740_992,
        },
      }),
    },
    {
      expectedCode: "INVALID_TEMPLATE_STATUS_EVENT",
      event: templateEvent({ occurredAt: 0 }),
    },
    {
      expectedCode: "UNSUPPORTED_TEMPLATE_LANGUAGE",
      event: templateEvent({
        value: {
          ...templateEvent().value,
          message_template_language: "fr",
        },
      }),
    },
    {
      expectedCode: "UNSUPPORTED_TEMPLATE_STATUS_EVENT",
      event: templateEvent({
        value: {
          ...templateEvent().value,
          event: "UNKNOWN",
        },
      }),
    },
  ];

  for (const item of cases) {
    assert.throws(
      () => parseMetaTemplateStatusEvent(item.event),
      (error) =>
        error instanceof MetaWebhookProcessorError &&
        error.safeCode === item.expectedCode,
    );
  }
});

test("preflights a mixed batch before writing any template status", async () => {
  let writes = 0;
  const processBatch =
    createMessageTemplateStatusBatchProcessor({
      async applyStatusEvent() {
        writes += 1;
        return { outcome: "not-found" };
      },
    });

  await assert.rejects(
    processBatch({
      tenantId: 7,
      receiptId: 31,
      eventKey: receiptEventKey,
      connection: {},
      events: [
        templateEvent(),
        {
          ...templateEvent(),
          kind: "account_update",
        },
      ],
    }),
    (error) =>
      error instanceof MetaWebhookProcessorError &&
      error.safeCode === "PROCESSOR_NOT_CONFIGURED",
  );
  assert.equal(writes, 0);
});

test("maps identity and storage failures to bounded processor codes", async () => {
  const errors = [
    {
      error: new MessageTemplateIdentityConflictError(),
      expectedCode: "TEMPLATE_STATUS_IDENTITY_CONFLICT",
    },
    {
      error: new Error("private D1 failure"),
      expectedCode: "TEMPLATE_STATUS_STORAGE_FAILED",
    },
  ];

  for (const item of errors) {
    const processEvent =
      createMessageTemplateStatusEventProcessor({
        async applyStatusEvent() {
          throw item.error;
        },
      });

    await assert.rejects(
      processEvent(templateEvent(), 7),
      (error) =>
        error instanceof MetaWebhookProcessorError &&
        error.safeCode === item.expectedCode,
    );
  }
});
