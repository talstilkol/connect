import assert from "node:assert/strict";
import test from "node:test";

import {
  createConfiguredKnowledgeUploadPolicy,
  inspectKnowledgeUploadPolicyConfiguration,
} from "../server/ai/knowledgeUploadPolicy.ts";

test("requires explicit upload size and media-type decisions without defaults", () => {
  assert.deepEqual(
    inspectKnowledgeUploadPolicyConfiguration(
      {},
    ),
    {
      status: "configuration-required",
      issues: [
        "MAX_BYTES_REQUIRED",
        "ALLOWED_MEDIA_TYPES_REQUIRED",
      ],
    },
  );
});

test("rejects malformed, duplicate, or unsafe upload policy configuration", () => {
  assert.deepEqual(
    inspectKnowledgeUploadPolicyConfiguration({
      KNOWLEDGE_UPLOAD_MAX_BYTES: "0",
      KNOWLEDGE_UPLOAD_ALLOWED_MEDIA_TYPES_JSON:
        '["application/pdf","application/pdf"]',
    }),
    {
      status: "configuration-required",
      issues: [
        "MAX_BYTES_INVALID",
        "ALLOWED_MEDIA_TYPES_INVALID",
      ],
    },
  );
});

test("enforces the explicitly configured size and media-type allowlist", async () => {
  const inspection =
    inspectKnowledgeUploadPolicyConfiguration({
      KNOWLEDGE_UPLOAD_MAX_BYTES: "4096",
      KNOWLEDGE_UPLOAD_ALLOWED_MEDIA_TYPES_JSON:
        '["text/plain","application/pdf"]',
    });

  assert.equal(
    inspection.status,
    "configured",
  );

  const policy =
    createConfiguredKnowledgeUploadPolicy(
      inspection.configuration,
    );

  assert.deepEqual(
    await policy.evaluate({
      fileName: "מדיניות.pdf",
      mediaType: "application/pdf",
      sizeBytes: 4096,
    }),
    { outcome: "accepted" },
  );
  assert.deepEqual(
    await policy.evaluate({
      fileName: "מדיניות.pdf",
      mediaType: "application/pdf",
      sizeBytes: 4097,
    }),
    {
      outcome: "rejected",
      errorCode: "FILE_SIZE_NOT_ALLOWED",
    },
  );
  assert.deepEqual(
    await policy.evaluate({
      fileName: "מדיניות.docx",
      mediaType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 1024,
    }),
    {
      outcome: "rejected",
      errorCode:
        "MEDIA_TYPE_NOT_ALLOWED",
    },
  );
});
