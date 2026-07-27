import assert from "node:assert/strict";
import test from "node:test";

import {
  presentMetaConnection,
} from "../features/workspace/metaConnectionPresentation.ts";

test("presents connected Meta state as complete", () => {
  const presentation = presentMetaConnection({ status: "connected" });

  assert.equal(presentation.setupComplete, true);
  assert.equal(presentation.tone, "success");
  assert.equal(presentation.statusLabel, "WhatsApp מחובר");
  assert.match(presentation.panelNotice, /Secrets.*אינם מוצגים/);
});

test("keeps pending and restricted Meta states outside send readiness", () => {
  const pending = presentMetaConnection({ status: "pending" });
  const restricted = presentMetaConnection({ status: "restricted" });

  assert.equal(pending.setupComplete, false);
  assert.equal(pending.tone, "warning");
  assert.match(pending.statusLabel, /Webhook/);
  assert.equal(restricted.setupComplete, false);
  assert.equal(restricted.tone, "critical");
  assert.match(restricted.statusLabel, /מוגבל/);
});

test("reports server failure without inventing a disconnected state", () => {
  const presentation = presentMetaConnection({
    status: "server-error",
  });

  assert.equal(presentation.setupComplete, false);
  assert.equal(presentation.tone, "critical");
  assert.match(presentation.description, /לא הוצג חיבור חלופי/);
});
