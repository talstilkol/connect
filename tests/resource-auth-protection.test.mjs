import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

const protectedResources = new Map([
  ["app/workspace/layout.tsx", "loadTenantSelectionAction"],
  ["app/workspace/page.tsx", "readCurrentMetaConnection()"],
  ["app/workspace/[section]/page.tsx", "await params"],
  ["app/admin/page.tsx", "readCurrentSystemAdminTenantDirectory()"],
  ["app/admin/decisions/page.tsx", "await Promise.all"],
  ["app/admin/whatsapp-delivery-policy/[tenantId]/page.tsx", "await params"],
]);

test("protects every privileged page and layout before it reads request or tenant data", async () => {
  for (const [file, firstPrivilegedRead] of protectedResources) {
    const source = await readFile(
      new URL(file, projectRoot),
      "utf8",
    );
    const configurationCheck = source.indexOf(
      "hasClerkServerConfiguration()",
    );
    const protection = source.indexOf(
      "await auth.protect()",
    );
    const privilegedRead = source.indexOf(
      firstPrivilegedRead,
      protection,
    );

    assert.notEqual(
      configurationCheck,
      -1,
      `${file} must preserve the explicit Clerk-disabled local rehearsal mode`,
    );
    assert.notEqual(
      protection,
      -1,
      `${file} must call auth.protect directly`,
    );
    assert.notEqual(
      privilegedRead,
      -1,
      `${file} is missing its expected first privileged read`,
    );
    assert.equal(
      protection < privilegedRead,
      true,
      `${file} must protect before reading request or tenant data`,
    );
  }
});

test("keeps resource authorization out of the Clerk proxy", async () => {
  const source = await readFile(
    new URL("proxy.ts", projectRoot),
    "utf8",
  );

  assert.match(
    source,
    /configuredClerkMiddleware = clerkMiddleware\(\)/,
  );
  assert.doesNotMatch(
    source,
    /createRouteMatcher|auth\.protect/,
  );
});

test("enables Clerk's resource protection lint rule for every privileged app folder", async () => {
  const source = await readFile(
    new URL("eslint.config.mjs", projectRoot),
    "utf8",
  );

  assert.match(
    source,
    /@clerk\/next\/require-auth-protection/,
  );

  for (const folder of [
    "app/workspace/**",
    "app/admin/**",
  ]) {
    assert.equal(
      source.includes(JSON.stringify(folder)),
      true,
      `missing protected Clerk resource folder: ${folder}`,
    );
  }
});
