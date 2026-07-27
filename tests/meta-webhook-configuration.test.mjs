import assert from "node:assert/strict";
import test from "node:test";

import {
  requireMetaWebhookConfiguration,
} from "../server/meta/metaWebhookConfiguration.ts";

test("loads Meta webhook secrets only from the server environment", () => {
  assert.deepEqual(
    requireMetaWebhookConfiguration({
      META_APP_SECRET: "app-secret",
      META_WEBHOOK_VERIFY_TOKEN: "verify-token",
    }),
    {
      appSecret: "app-secret",
      verifyToken: "verify-token",
    },
  );
});

test("fails closed when either Meta webhook secret is unavailable", () => {
  assert.throws(
    () =>
      requireMetaWebhookConfiguration({
        META_WEBHOOK_VERIFY_TOKEN: "verify-token",
      }),
    /META_APP_SECRET/,
  );
  assert.throws(
    () =>
      requireMetaWebhookConfiguration({
        META_APP_SECRET: "app-secret",
      }),
    /META_WEBHOOK_VERIFY_TOKEN/,
  );
});
