import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

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
    /requireCurrentSystemAdminMutationSession/,
  );
  assert.match(
    source,
    /requireRuntimeDatabase/,
  );
  assert.match(
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
    /requireCurrentSystemAdminSession/,
  );
  assert.match(
    readerSource,
    /findConnectionByTenantId/,
  );
  assert.match(
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
  assert.doesNotMatch(
    panelSource,
    /actorExternalUserId\s*:/,
  );
  assert.match(
    directorySource,
    /\/admin\/whatsapp-delivery-policy\/\$\{tenant\.tenantId\}/,
  );
});
