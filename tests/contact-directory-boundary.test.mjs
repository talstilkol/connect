import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const currentSource = await readFile(
  new URL("../server/contacts/currentContacts.ts", import.meta.url),
  "utf8",
);
const actionSource = await readFile(
  new URL("../server/contacts/contactActions.ts", import.meta.url),
  "utf8",
);
const currentHandlerSource = await readFile(
  new URL(
    "../server/contacts/currentRailwayContactDirectoryHandler.ts",
    import.meta.url,
  ),
  "utf8",
);
const currentConsentHandlerSource = await readFile(
  new URL(
    "../server/contacts/currentRailwayContactConsentHandler.ts",
    import.meta.url,
  ),
  "utf8",
);

test("routes initial and paginated contact reads through Railway", () => {
  assert.match(currentSource, /createCurrentRailwayContactDirectoryHandler/);
  assert.doesNotMatch(
    currentSource,
    /runtimeDatabase|createContactRepository|currentTenantSession|contactOrganizationRepository/,
  );

  const loadMoreSource = actionSource.match(
    /export async function loadMoreContactsAction[\s\S]*?(?=export async function grantContactConsentAction)/,
  )?.[0];

  assert.ok(loadMoreSource);
  assert.match(loadMoreSource, /createCurrentRailwayContactDirectoryHandler/);
  assert.doesNotMatch(
    loadMoreSource,
    /runtimeDatabase|createActionContext|currentTenantSession|createContactRepository/,
  );
});

test("routes contact profile and consent mutations through Railway without D1 fallback", () => {
  const saveSource = actionSource.match(
    /export async function saveContactAction[\s\S]*?(?=export async function loadMoreContactsAction)/,
  )?.[0];
  const consentSource = actionSource.match(
    /async function changeContactConsent[\s\S]*$/,
  )?.[0];

  assert.ok(saveSource);
  assert.match(saveSource, /createCurrentRailwayContactMutationHandler/);
  assert.doesNotMatch(
    saveSource,
    /runtimeDatabase|createConsentActionContext|currentTenantMutationSession|createContactRepository/,
  );
  assert.ok(consentSource);
  assert.match(consentSource, /createCurrentRailwayContactConsentHandler/);
  assert.doesNotMatch(
    actionSource,
    /runtimeDatabase|requireCurrentTenantMutationSession|createContactRepository|createContactConsentRepository|createConsentActionContext/,
  );
});

test("keeps the current adapter on reviewed Railway identity and client boundaries", () => {
  assert.match(currentHandlerSource, /inspectClerkConfiguration/);
  assert.match(currentHandlerSource, /inspectRailwayApiClientConfiguration/);
  assert.match(currentHandlerSource, /resolveCurrentRailwayApiServerIdentity/);
  assert.match(currentHandlerSource, /createRailwayApiClient/);
  assert.doesNotMatch(
    currentHandlerSource,
    /runtimeDatabase|D1|tenantId|externalUserId/,
  );
  assert.match(currentConsentHandlerSource, /inspectClerkConfiguration/);
  assert.match(
    currentConsentHandlerSource,
    /inspectRailwayApiClientConfiguration/,
  );
  assert.match(
    currentConsentHandlerSource,
    /resolveCurrentRailwayApiServerIdentity/,
  );
  assert.doesNotMatch(
    currentConsentHandlerSource,
    /runtimeDatabase|D1|tenantId|externalUserId/,
  );
});
