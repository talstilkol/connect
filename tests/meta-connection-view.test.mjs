import assert from "node:assert/strict";
import test from "node:test";

import {
  toMetaConnectionView,
} from "../shared/domain/metaConnectionView.ts";

test("maps an absent server record to a disconnected browser state", () => {
  assert.deepEqual(toMetaConnectionView(null), {
    status: "disconnected",
  });
});

test("returns only Meta status and removes tenant and external asset IDs", () => {
  const view = toMetaConnectionView({
    tenantId: 7,
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
    status: "connected",
    webhookSubscribedAt: "2026-07-25 10:00:00",
    connectedAt: "2026-07-25 10:00:00",
    version: 2,
    createdAt: "2026-07-25 09:00:00",
    updatedAt: "2026-07-25 10:00:00",
  });

  assert.deepEqual(view, { status: "connected" });
  assert.deepEqual(Object.keys(view), ["status"]);
  assert.doesNotMatch(
    JSON.stringify(view),
    /tenant|portfolio|waba|phone|secret|token/i,
  );
});
