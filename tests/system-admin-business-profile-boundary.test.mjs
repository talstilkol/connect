import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const actionsUrl = new URL(
  "../server/admin/systemAdminBusinessProfileActions.ts",
  import.meta.url,
);
const panelUrl = new URL(
  "../features/admin/SystemAdminTenantPanel.tsx",
  import.meta.url,
);
const formUrl = new URL(
  "../features/admin/SystemAdminBusinessProfileForm.tsx",
  import.meta.url,
);
const railwayIdentityUrl = new URL(
  "../server/platform/currentRailwayApiServerIdentity.ts",
  import.meta.url,
);

test("wires profile edits through the protected system admin mutation boundary", async () => {
  const [actions, panel, form, railwayIdentity] =
    await Promise.all([
      readFile(actionsUrl, "utf8"),
      readFile(panelUrl, "utf8"),
      readFile(formUrl, "utf8"),
      readFile(railwayIdentityUrl, "utf8"),
    ]);
  const clientCode = `${panel}\n${form}`;

  assert.match(
    actions,
    /resolveCurrentRailwayApiServerIdentity/,
  );
  assert.match(
    actions,
    /createRailwayApiClient/,
  );
  assert.match(
    actions,
    /inspectRailwayApiClientConfiguration/,
  );
  assert.doesNotMatch(
    actions,
    /requireRuntimeDatabase|createSystemAdminBusinessProfileRepository|requireCurrentSystemAdminMutationSession/,
  );
  assert.match(
    railwayIdentity,
    /from "@vercel\/oidc"/,
  );
  assert.match(
    railwayIdentity,
    /state\.getToken\(\)/,
  );
  assert.doesNotMatch(
    railwayIdentity,
    /VERCEL_OIDC_TOKEN|localStorage|sessionStorage/,
  );
  assert.match(
    panel,
    /updateBusinessProfileAdminAction/,
  );
  assert.match(
    form,
    /expectedVersion: profile\.version/,
  );
  assert.match(
    form,
    /<fieldset disabled=\{disabled\}>/,
  );
  assert.doesNotMatch(
    clientCode,
    /actorExternalUserId|occurredAt|previousProfileDigest|newProfileDigest/,
  );
});
