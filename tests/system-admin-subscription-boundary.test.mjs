import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const actionsUrl = new URL(
  "../server/billing/systemAdminSubscriptionActions.ts",
  import.meta.url,
);
const handlerUrl = new URL(
  "../server/billing/railwaySystemAdminSubscriptionActionHandler.ts",
  import.meta.url,
);
const panelUrl = new URL(
  "../features/admin/SystemAdminTenantPanel.tsx",
  import.meta.url,
);

test("routes all subscription writes through the Railway identity and client boundary", async () => {
  const [actions, handler, panel] = await Promise.all([
    readFile(actionsUrl, "utf8"),
    readFile(handlerUrl, "utf8"),
    readFile(panelUrl, "utf8"),
  ]);

  assert.match(actions, /resolveCurrentRailwayApiServerIdentity/);
  assert.match(actions, /createRailwayApiClient/);
  assert.match(actions, /inspectRailwayApiClientConfiguration/);
  assert.match(actions, /createRailwaySystemAdminSubscriptionActionHandler/);
  assert.doesNotMatch(
    actions,
    /requireRuntimeDatabase|createTenantSubscriptionRepository|requireCurrentSystemAdminMutationSession/,
  );
  for (const operationId of [
    "system-admin.subscription.create",
    "system-admin.subscription.extend",
    "system-admin.subscription.status.change",
    "system-admin.subscription.cancel",
  ]) {
    assert.match(handler, new RegExp(operationId.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(
    handler,
    /actorExternalUserId|occurredAt|requireRuntimeDatabase|createTenantSubscriptionRepository/,
  );
  for (const action of [
    "createTenantSubscriptionAdminAction",
    "extendTenantSubscriptionAdminAction",
    "changeTenantSubscriptionStatusAdminAction",
    "cancelTenantSubscriptionAdminAction",
  ]) {
    assert.match(panel, new RegExp(action));
  }
});
