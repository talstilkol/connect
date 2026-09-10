import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  invitationMessages,
  readInvitationDirection,
  readInvitationLanguage,
  readInvitationLocaleLinks,
  readInvitationMessages,
  readInvitationResultMessage,
} from "../shared/i18n/invitation.ts";
import {
  publicLandingLocales,
} from "../shared/i18n/publicLanding.ts";

const invitationPageUrl = new URL(
  "../app/invite/[invitationKey]/page.tsx",
  import.meta.url,
);
const invitationFormUrl = new URL(
  "../app/invite/[invitationKey]/InvitationAcceptanceForm.tsx",
  import.meta.url,
);
const globalStylesUrl = new URL(
  "../app/globals.css",
  import.meta.url,
);

const acceptanceStatuses = [
  "accepted",
  "already-accepted",
  "sign-in-required",
  "identity-verification-required",
  "invitation-unavailable",
  "invalid-input",
  "temporarily-unavailable",
  "configuration-required",
  "server-error",
];

function collectStrings(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

test("accepts only an exact scalar invitation language", () => {
  assert.equal(readInvitationLanguage("he"), "he");
  assert.equal(readInvitationLanguage("en"), "en");
  assert.equal(readInvitationLanguage("ar"), "ar");
  assert.equal(readInvitationLanguage("en-US"), "he");
  assert.equal(readInvitationLanguage("EN"), "he");
  assert.equal(readInvitationLanguage(["en"]), "he");
  assert.equal(readInvitationLanguage(null), "he");
});

test("uses relative locale links without copying an invitation key into the DOM", () => {
  assert.deepEqual(
    readInvitationLocaleLinks().map(
      ({ language, href, direction }) => ({
        language,
        href,
        direction,
      }),
    ),
    [
      { language: "he", href: "?lang=he", direction: "rtl" },
      { language: "en", href: "?lang=en", direction: "ltr" },
      { language: "ar", href: "?lang=ar", direction: "rtl" },
    ],
  );

  for (const locale of readInvitationLocaleLinks()) {
    assert.doesNotMatch(locale.href, /invite|team_invitation|\//);
  }
});

test("keeps every invitation dictionary and acceptance result complete", () => {
  const expectedTopLevelKeys = Object.keys(
    invitationMessages.he,
  ).sort();
  const expectedResultKeys = [
    ...acceptanceStatuses,
    "ready",
  ].sort();

  for (const locale of publicLandingLocales) {
    const messages = readInvitationMessages(locale.language);

    assert.deepEqual(
      Object.keys(messages).sort(),
      expectedTopLevelKeys,
    );
    assert.deepEqual(
      Object.keys(messages.results).sort(),
      expectedResultKeys,
    );
    assert.equal(
      readInvitationDirection(locale.language),
      locale.direction,
    );
    assert.equal(
      collectStrings(messages).every(
        (value) =>
          value.length > 0 &&
          value.trim() === value,
      ),
      true,
    );
  }
});

test("marks only completed acceptance outcomes as complete", () => {
  for (const language of ["he", "en", "ar"]) {
    assert.equal(
      readInvitationResultMessage(language, null).complete,
      false,
    );

    for (const status of acceptanceStatuses) {
      assert.equal(
        readInvitationResultMessage(language, { status }).complete,
        status === "accepted" || status === "already-accepted",
      );
    }
  }
});

test("localizes the invitation presentation without changing its secure action boundary", async () => {
  const [page, form, styles] = await Promise.all([
    readFile(invitationPageUrl, "utf8"),
    readFile(invitationFormUrl, "utf8"),
    readFile(globalStylesUrl, "utf8"),
  ]);

  assert.match(page, /searchParams: Promise<\{/);
  assert.match(page, /readInvitationLanguage\(lang\)/);
  assert.match(
    page,
    /<main\s+className="invitation-shell"\s+lang=\{language\}\s+dir=\{direction\}/,
  );
  assert.match(page, /readInvitationLocaleLinks\(\)\.map/);
  assert.match(page, /hrefLang=\{locale\.language\}/);
  assert.match(page, /aria-current=\{/);
  assert.match(page, /referrer: "no-referrer"/);
  assert.match(page, /index: false/);
  assert.match(page, /follow: false/);
  assert.match(
    page,
    /acceptTeamInvitationFromPageAction\.bind\(\s*null,\s*invitationKey/,
  );
  assert.match(
    page,
    /<InvitationAcceptanceForm\s+action=\{acceptanceAction\}\s+language=\{language\}/,
  );
  assert.doesNotMatch(page, /\$\{invitationKey\}/);
  assert.doesNotMatch(page, /[\u0590-\u05ff]/u);

  assert.match(form, /"use client";/);
  assert.match(form, /language: InterfaceLanguage/);
  assert.match(form, /readInvitationResultMessage\(language, result\)/);
  assert.match(form, /useActionState\(action, null\)/);
  assert.doesNotMatch(form, /[\u0590-\u05ff]/u);

  assert.match(
    styles,
    /\.invitation-language-switcher \{[\s\S]*?margin-top: 28px;/,
  );

  for (const source of [page, form]) {
    assert.doesNotMatch(source, /Math\.random\(/);
    assert.doesNotMatch(source, /crypto\.randomUUID\(/);
  }
});
