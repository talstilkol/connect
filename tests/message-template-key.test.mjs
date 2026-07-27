import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveMessageTemplateKey,
} from "../server/templates/messageTemplateKey.ts";

test("derives one deterministic key from tenant, name, and language", async () => {
  const first = await deriveMessageTemplateKey(
    7,
    "service_update",
    "he",
  );
  const second = await deriveMessageTemplateKey(
    7,
    "service_update",
    "he",
  );

  assert.match(first, /^template_v1_[0-9a-f]{64}$/);
  assert.equal(first, second);
});

test("separates the same provider identity across tenants and languages", async () => {
  const tenantOne = await deriveMessageTemplateKey(
    7,
    "service_update",
    "he",
  );
  const tenantTwo = await deriveMessageTemplateKey(
    8,
    "service_update",
    "he",
  );
  const anotherLanguage = await deriveMessageTemplateKey(
    7,
    "service_update",
    "en_US",
  );

  assert.notEqual(tenantOne, tenantTwo);
  assert.notEqual(tenantOne, anotherLanguage);
});
