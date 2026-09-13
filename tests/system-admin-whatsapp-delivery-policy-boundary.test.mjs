import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";
import { canonicalUtcDateTime } from "../features/admin/whatsappPolicyEvidenceDateTime.ts";

test("policy evidence accepts browser-normalized minute precision as UTC with zero seconds", () => {
  assert.equal(canonicalUtcDateTime("2026-08-16T10:00"), "2026-08-16T10:00:00.000Z");
  assert.equal(canonicalUtcDateTime("2026-08-16T11:00"), "2026-08-16T11:00:00.000Z");
  assert.equal(canonicalUtcDateTime("2024-02-29T23:59"), "2024-02-29T23:59:00.000Z");
});

test("policy evidence preserves explicit seconds without interpreting a local timezone", () => {
  assert.equal(canonicalUtcDateTime("2026-08-16T10:00:00"), "2026-08-16T10:00:00.000Z");
  assert.equal(canonicalUtcDateTime("2026-08-16T10:00:45"), "2026-08-16T10:00:45.000Z");
});

test("policy evidence rejects impossible dates and unsupported formats without throwing", () => {
  for (const value of [
    null, undefined, {}, "", "2026-02-29T10:00", "2026-04-31T10:00:01",
    "2026-13-01T10:00", "2026-08-16T24:00", "2026-08-16T10:60",
    "2026-08-16T10:00:60", "2026-08-16T10:00:00.123", "2026-08-16T10:00Z",
    "2026-08-16T10:00+03:00", "2026-08-16 10:00", "2026-8-16T10:00",
    " 2026-08-16T10:00", "2026-08-16T10:00 ",
  ]) assert.equal(canonicalUtcDateTime(value), null);
});

const actionsUrl = new URL(
  "../server/campaigns/systemAdminWhatsappDeliveryPolicyActions.ts",
  import.meta.url,
);
const readerUrl = new URL(
  "../server/campaigns/currentSystemAdminWhatsappDeliveryPolicy.ts",
  import.meta.url,
);
const panelUrl = new URL(
  "../features/admin/SystemAdminWhatsappDeliveryPolicyPanel.tsx",
  import.meta.url,
);
const directoryPanelUrl = new URL(
  "../features/admin/SystemAdminTenantPanel.tsx",
  import.meta.url,
);

test("WhatsApp delivery policy mutations stay behind the system-admin server boundary", async () => {
  const source = await readFile(
    actionsUrl,
    "utf8",
  );

  assert.match(source, /^"use server";/);
  assert.match(
    source,
    /createCurrentRailwaySystemAdminWhatsappDeliveryPolicyHandler/,
  );
  assert.doesNotMatch(
    source,
    /requireRuntimeDatabase/,
  );
  assert.doesNotMatch(
    source,
    /createWhatsappCampaignDeliveryPolicyRepository/,
  );
  assert.doesNotMatch(
    source,
    /requireCurrentTenantMutationSession/,
  );
});

test("operator UI reads exact server state and exposes only the bounded system-admin actions", async () => {
  const [
    readerSource,
    panelSource,
    directorySource,
  ] = await Promise.all([
    readFile(readerUrl, "utf8"),
    readFile(panelUrl, "utf8"),
    readFile(directoryPanelUrl, "utf8"),
  ]);

  assert.match(
    readerSource,
    /createCurrentRailwaySystemAdminWhatsappDeliveryPolicyHandler/,
  );
  assert.doesNotMatch(
    readerSource,
    /findConnectionByTenantId/,
  );
  assert.doesNotMatch(
    readerSource,
    /findLatestPolicyEvent/,
  );
  assert.match(
    panelSource,
    /approveSystemAdminWhatsappDeliveryPolicyAction/,
  );
  assert.match(
    panelSource,
    /activateSystemAdminWhatsappDeliveryPolicyKillSwitchAction/,
  );
  assert.match(
    panelSource,
    /phoneThroughputMessagesPerSecond/,
  );
  assert.match(
    panelSource,
    /maximumOutboundMessagesPerSecond/,
  );
  assert.doesNotMatch(
    panelSource,
    /actorExternalUserId\s*:/,
  );
  assert.match(
    directorySource,
    /\/admin\/whatsapp-delivery-policy\/\$\{tenant\.tenantId\}/,
  );
});
