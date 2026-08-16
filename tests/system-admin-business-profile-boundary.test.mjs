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

test("wires profile edits through the protected system admin mutation boundary", async () => {
  const [actions, panel, form] =
    await Promise.all([
      readFile(actionsUrl, "utf8"),
      readFile(panelUrl, "utf8"),
      readFile(formUrl, "utf8"),
    ]);
  const clientCode = `${panel}\n${form}`;

  assert.match(
    actions,
    /requireCurrentSystemAdminMutationSession/,
  );
  assert.match(
    actions,
    /createSystemAdminBusinessProfileRepository/,
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
