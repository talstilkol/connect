import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectMessageTemplateSubmissionReadiness,
} from "../server/templates/messageTemplateSubmissionReadiness.ts";

const encryptionKey = Buffer.from(
  Array.from({ length: 32 }, (_, index) => index + 1),
).toString("base64");

test("distinguishes disabled, incomplete, and configured template submission", () => {
  assert.deepEqual(
    inspectMessageTemplateSubmissionReadiness({}),
    { status: "disabled" },
  );
  assert.deepEqual(
    inspectMessageTemplateSubmissionReadiness({
      META_GRAPH_API_VERSION: "v21.0",
    }),
    { status: "incomplete" },
  );
  assert.deepEqual(
    inspectMessageTemplateSubmissionReadiness({
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    }),
    { status: "incomplete" },
  );
  assert.deepEqual(
    inspectMessageTemplateSubmissionReadiness({
      META_GRAPH_API_VERSION: "latest",
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    }),
    { status: "incomplete" },
  );
  assert.deepEqual(
    inspectMessageTemplateSubmissionReadiness({
      META_GRAPH_API_VERSION: "v21.0",
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    }),
    { status: "configured" },
  );
});

test("does not expose invalid configuration values", () => {
  const invalidKey = "private-invalid-key";
  const readiness =
    inspectMessageTemplateSubmissionReadiness({
      META_GRAPH_API_VERSION: "v21.0",
      META_CREDENTIAL_ENCRYPTION_KEY_V1: invalidKey,
    });

  assert.deepEqual(readiness, { status: "incomplete" });
  assert.doesNotMatch(
    JSON.stringify(readiness),
    new RegExp(invalidKey),
  );
});
