import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actionSource = await readFile(
  new URL("../server/contacts/contactOrganizationActions.ts", import.meta.url),
  "utf8",
);
const currentHandlerSource = await readFile(
  new URL(
    "../server/contacts/currentRailwayContactOrganizationHandler.ts",
    import.meta.url,
  ),
  "utf8",
);

test("routes every contact organization action through Railway without D1", () => {
  assert.match(
    actionSource,
    /createCurrentRailwayContactOrganizationHandler/,
  );
  assert.doesNotMatch(
    actionSource,
    /requireRuntimeDatabase|requireCurrentTenantMutationSession|createContactOrganizationRepository|D1/,
  );
});

test("keeps contact organization identity and client creation server-side", () => {
  assert.match(currentHandlerSource, /inspectClerkConfiguration/);
  assert.match(
    currentHandlerSource,
    /inspectRailwayApiClientConfiguration/,
  );
  assert.match(
    currentHandlerSource,
    /resolveCurrentRailwayApiServerIdentity/,
  );
  assert.match(currentHandlerSource, /createRailwayApiClient/);
  assert.doesNotMatch(
    currentHandlerSource,
    /runtimeDatabase|tenantId|externalUserId|D1/,
  );
});
