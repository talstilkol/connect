import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  readWorkspaceDirection,
  readWorkspaceLanguage,
  readWorkspaceLocaleLinks,
  readWorkspaceNavigation,
  readWorkspaceShellMessages,
} from "../shared/i18n/workspace.ts";
import {
  workspaceSectionPath,
} from "../shared/workspace/navigation.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

test("accepts only exact supported workspace languages", () => {
  assert.equal(readWorkspaceLanguage("he"), "he");
  assert.equal(readWorkspaceLanguage("en"), "en");
  assert.equal(readWorkspaceLanguage("ar"), "ar");
  assert.equal(readWorkspaceLanguage("EN"), "he");
  assert.equal(readWorkspaceLanguage("en-US"), "he");
  assert.equal(readWorkspaceLanguage(["en"]), "he");
  assert.equal(readWorkspaceLanguage(null), "he");
});

test("localizes every navigation entry from one ordered registry", () => {
  const expectedIds = [
    "dashboard",
    "onboarding",
    "contacts",
    "templates",
    "campaigns",
    "inbox",
    "bot",
    "ai",
    "reports",
    "billing",
    "team",
    "decisions",
  ];

  for (const language of ["he", "en", "ar"]) {
    const navigation = readWorkspaceNavigation(language);

    assert.deepEqual(
      navigation.map((item) => item.id),
      expectedIds,
    );
    assert.ok(navigation.every((item) => item.label.length > 0));
    assert.ok(
      navigation
        .filter((item) => item.group)
        .every((item) => item.groupLabel?.length),
    );
  }

  assert.equal(readWorkspaceDirection("he"), "rtl");
  assert.equal(readWorkspaceDirection("en"), "ltr");
  assert.equal(readWorkspaceDirection("ar"), "rtl");
});

test("preserves Hebrew routes and carries non-default workspace language", () => {
  assert.equal(workspaceSectionPath("dashboard"), "/workspace");
  assert.equal(workspaceSectionPath("contacts", "he"), "/workspace/contacts");
  assert.equal(workspaceSectionPath("contacts", "en"), "/workspace/contacts?lang=en");
  assert.equal(workspaceSectionPath("contacts", "ar"), "/workspace/contacts?lang=ar");

  assert.deepEqual(
    readWorkspaceLocaleLinks("reports").map(
      ({ language, href, direction }) => ({ language, href, direction }),
    ),
    [
      { language: "he", href: "/workspace/reports", direction: "rtl" },
      { language: "en", href: "/workspace/reports?lang=en", direction: "ltr" },
      { language: "ar", href: "/workspace/reports?lang=ar", direction: "rtl" },
    ],
  );
});

test("provides complete shell, tenant, role, and Meta status messages", () => {
  for (const language of ["he", "en", "ar"]) {
    const messages = readWorkspaceShellMessages(language);

    assert.ok(messages.skipLink.length > 0);
    assert.deepEqual(Object.keys(messages.tenant.roles), [
      "owner",
      "manager",
      "agent",
      "viewer",
    ]);
    assert.equal(Object.keys(messages.tenant.failures).length, 9);
    assert.equal(Object.keys(messages.metaConnectionStatuses).length, 12);
  }
});

test("wires validated query language through both workspace routes and shell", async () => {
  const [rootPage, sectionPage, workspaceApp, switcher] =
    await Promise.all([
      readSource("app/workspace/page.tsx"),
      readSource("app/workspace/[section]/page.tsx"),
      readSource("features/workspace/WorkspaceApp.tsx"),
      readSource("features/workspace/TenantWorkspaceSwitcher.tsx"),
    ]);

  for (const route of [rootPage, sectionPage]) {
    assert.match(route, /readWorkspaceLanguage\(lang\)/);
    assert.match(route, /language=\{language\}/);
  }

  assert.match(
    workspaceApp,
    /<main className="app-shell" lang=\{language\} dir=\{direction\}>/,
  );
  assert.match(workspaceApp, /document\.documentElement/);
  assert.match(workspaceApp, /root\.lang = language/);
  assert.match(workspaceApp, /root\.dir = direction/);
  assert.match(workspaceApp, /readWorkspaceNavigation\(language\)/);
  assert.match(workspaceApp, /readWorkspaceLocaleLinks\(activeSection\)/);
  assert.match(workspaceApp, /workspaceSectionPath\(section, language\)/);
  assert.match(
    workspaceApp,
    /aria-current=\{[\s\S]{0,100}activeSection === item\.id[\s\S]{0,100}"page"/,
  );
  assert.match(workspaceApp, /aria-current=/);
  assert.match(switcher, /readWorkspaceShellMessages\(language\)\.tenant/);
});
