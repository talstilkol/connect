import assert from "node:assert/strict";
import test from "node:test";

import {
  createKnowledgeUploadActionHandler,
} from "../server/ai/knowledgeUploadActionHandler.ts";
import {
  KnowledgeUploadServiceError,
} from "../server/ai/knowledgeUploadService.ts";

function source() {
  return {
    sourceKey:
      `knowledge_source_v1_${"a".repeat(64)}`,
    tenantId: 7,
    contentSha256: "b".repeat(64),
    fileName: "מדיניות-שירות.pdf",
    mediaType: "application/pdf",
    sizeBytes: 24,
    storageObjectKey:
      `knowledge/v1/knowledge_source_v1_${"a".repeat(64)}`,
    status: "scanning",
    lastErrorCode: null,
    readyAt: null,
    version: 3,
    createdAt: "2026-07-26T10:00:00.000Z",
    updatedAt: "2026-07-26T10:01:00.000Z",
  };
}

function uploadFormData() {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob(
      ["מדיניות השירות המאושרת"],
      { type: "application/pdf" },
    ),
    "מדיניות-שירות.pdf",
  );

  return formData;
}

test("accepts only an exact single-file FormData contract and omits the R2 object key", async () => {
  const handler =
    createKnowledgeUploadActionHandler({
      async createContext() {
        return {
          session: {
            externalUserId:
              "user_knowledge_owner",
            tenantId: 7,
            displayName: "צוות שירות",
            status: "active",
            role: "owner",
          },
          service: {
            async upload() {
              return {
                outcome: "processing",
                source: source(),
              };
            },
          },
        };
      },
    });
  const result = await handler.upload(
    uploadFormData(),
  );

  assert.equal(result.status, "processing");
  assert.equal(result.source.status, "scanning");
  assert.equal(
    Object.hasOwn(
      result.source,
      "storageObjectKey",
    ),
    false,
  );

  const invalid = uploadFormData();
  invalid.append("sourceKey", "forged");

  assert.deepEqual(
    await handler.upload(invalid),
    { status: "invalid-input" },
  );
});

test("maps fail-closed dependency failures without exposing exception details", async () => {
  const handler =
    createKnowledgeUploadActionHandler({
      async createContext() {
        return {
          session: {
            externalUserId:
              "user_knowledge_owner",
            tenantId: 7,
            displayName: "צוות שירות",
            status: "active",
            role: "owner",
          },
          service: {
            async upload() {
              throw new KnowledgeUploadServiceError(
                "DEPENDENCY_UNAVAILABLE",
              );
            },
          },
        };
      },
    });

  assert.deepEqual(
    await handler.upload(uploadFormData()),
    { status: "dependency-unavailable" },
  );
});
