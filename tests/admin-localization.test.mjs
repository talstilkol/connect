import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  readAdminDirection,
  readAdminLanguage,
  readAdminLocaleLinks,
  adminPath,
} from "../shared/i18n/admin.ts";
import {
  readSystemAdminBusinessProfileMessages,
} from "../features/admin/systemAdminBusinessProfileMessages.ts";
import {
  readSystemAdminDecisionMessages,
} from "../features/admin/systemAdminDecisionMessages.ts";
import {
  readSystemAdminTenantMessages,
} from "../features/admin/systemAdminTenantMessages.ts";
import {
  readSystemAdminWhatsappPolicyMessages,
} from "../features/admin/systemAdminWhatsappPolicyMessages.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

test("accepts only exact Admin languages and builds deterministic links", () => {
  assert.equal(readAdminLanguage("he"), "he");
  assert.equal(readAdminLanguage("en"), "en");
  assert.equal(readAdminLanguage("ar"), "ar");
  assert.equal(readAdminLanguage("EN"), "he");
  assert.equal(readAdminLanguage("en-US"), "he");
  assert.equal(readAdminLanguage(["en"]), "he");
  assert.equal(readAdminLanguage(undefined), "he");

  assert.equal(readAdminDirection("he"), "rtl");
  assert.equal(readAdminDirection("en"), "ltr");
  assert.equal(readAdminDirection("ar"), "rtl");
  assert.equal(adminPath("/admin", "he"), "/admin");
  assert.equal(adminPath("/admin", "en"), "/admin?lang=en");
  assert.deepEqual(
    readAdminLocaleLinks("/admin/decisions").map(
      ({ language, href, direction }) => ({
        language,
        href,
        direction,
      }),
    ),
    [
      {
        language: "he",
        href: "/admin/decisions",
        direction: "rtl",
      },
      {
        language: "en",
        href: "/admin/decisions?lang=en",
        direction: "ltr",
      },
      {
        language: "ar",
        href: "/admin/decisions?lang=ar",
        direction: "rtl",
      },
    ],
  );
});

test("keeps every Admin state, action, role, and policy label localized", () => {
  for (const language of ["he", "en", "ar"]) {
    const profile =
      readSystemAdminBusinessProfileMessages(language);
    const decisions =
      readSystemAdminDecisionMessages(language);
    const tenants =
      readSystemAdminTenantMessages(language);
    const policy =
      readSystemAdminWhatsappPolicyMessages(language);

    assert.equal(Object.keys(profile.languageLabels).length, 3);
    assert.equal(Object.keys(decisions.states).length, 4);
    assert.equal(Object.keys(decisions.actionFailures).length, 6);
    assert.equal(Object.keys(decisions.runtime).length, 3);
    assert.equal(Object.keys(tenants.states).length, 4);
    assert.equal(Object.keys(tenants.directoryLoadFailures).length, 5);
    assert.equal(Object.keys(tenants.subscriptionActionFailures).length, 8);
    assert.equal(Object.keys(tenants.profileActionFailures).length, 7);
    assert.equal(Object.keys(tenants.tenantStatuses).length, 7);
    assert.equal(Object.keys(policy.states).length, 5);
    assert.equal(Object.keys(policy.actionFailures).length, 8);
    assert.equal(Object.keys(policy.deliveryStates).length, 2);
    assert.match(tenants.loadedResults(12), /12/);
    assert.match(tenants.tenantNumber(9), /9/);
    assert.match(policy.description(7), /7/);
    assert.match(decisions.version(3), /3/);
  }
});

test("passes validated language through every Admin route and surface", async () => {
  const [rootPage, decisionsPage, policyPage, selector, hook] =
    await Promise.all([
      readSource("app/admin/page.tsx"),
      readSource("app/admin/decisions/page.tsx"),
      readSource(
        "app/admin/whatsapp-delivery-policy/[tenantId]/page.tsx",
      ),
      readSource("features/admin/AdminLanguageSelector.tsx"),
      readSource("features/admin/useAdminDocumentLocale.ts"),
    ]);

  for (const route of [rootPage, decisionsPage, policyPage]) {
    assert.match(route, /readAdminLanguage\(lang\)/);
    assert.match(route, /language=\{language\}/);
  }

  assert.match(selector, /readAdminLocaleLinks\(pathname\)/);
  assert.match(selector, /aria-current=/);
  assert.match(hook, /document\.documentElement/);
  assert.match(hook, /root\.lang = language/);
  assert.match(hook, /root\.dir = direction/);
});

test("keeps localized Admin components free of embedded Hebrew UI", async () => {
  const sources = await Promise.all(
    [
      "SystemAdminBusinessProfileForm.tsx",
      "SystemAdminDecisionPanel.tsx",
      "SystemAdminTenantPanel.tsx",
      "SystemAdminWhatsappDeliveryPolicyPanel.tsx",
    ].map((fileName) =>
      readSource(`features/admin/${fileName}`),
    ),
  );

  for (const source of sources) {
    assert.doesNotMatch(source, /[\u0590-\u05ff]/);
  }
});
