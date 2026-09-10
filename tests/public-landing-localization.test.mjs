import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  isPublicLandingLanguage,
  publicLandingLocales,
  publicLandingMessages,
  readPublicLandingDirection,
  readPublicLandingMessages,
} from "../shared/i18n/publicLanding.ts";

const componentUrl = new URL(
  "../features/public/PublicLandingPage.tsx",
  import.meta.url,
);
const localizedPageUrl = new URL(
  "../app/[locale]/page.tsx",
  import.meta.url,
);
const rootPageUrl = new URL(
  "../app/page.tsx",
  import.meta.url,
);
const publicStylesUrl = new URL(
  "../features/public/public.css",
  import.meta.url,
);

function collectStrings(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(
      collectStrings,
    );
  }

  return [];
}

test("defines one deterministic locale registry for Hebrew, English, and Arabic", () => {
  assert.deepEqual(
    publicLandingLocales.map(
      ({ language, href, direction }) => ({
        language,
        href,
        direction,
      }),
    ),
    [
      { language: "he", href: "/", direction: "rtl" },
      { language: "en", href: "/en", direction: "ltr" },
      { language: "ar", href: "/ar", direction: "rtl" },
    ],
  );
  assert.equal(isPublicLandingLanguage("he"), true);
  assert.equal(isPublicLandingLanguage("en"), true);
  assert.equal(isPublicLandingLanguage("ar"), true);
  assert.equal(isPublicLandingLanguage("en-US"), false);
  assert.equal(isPublicLandingLanguage("../en"), false);
});

test("keeps every public landing dictionary complete and non-blank", () => {
  const expectedTopLevelKeys = Object.keys(
    publicLandingMessages.he,
  ).sort();

  for (const locale of publicLandingLocales) {
    const messages = readPublicLandingMessages(
      locale.language,
    );

    assert.deepEqual(
      Object.keys(messages).sort(),
      expectedTopLevelKeys,
    );
    assert.equal(
      readPublicLandingDirection(locale.language),
      locale.direction,
    );
    assert.equal(messages.capabilities.items.length, 3);
    assert.equal(messages.architecture.steps.length, 5);
    assert.equal(messages.hero.mapNodes.length, 4);
    assert.equal(messages.trustPrinciples.length, 5);
    assert.equal(
      collectStrings(messages).every(
        (value) =>
          value.trim().length > 0 &&
          value.trim() === value,
      ),
      true,
    );
  }
});

test("renders one shared localized component with semantic language boundaries", async () => {
  const [component, localizedPage, rootPage, styles] =
    await Promise.all([
      readFile(componentUrl, "utf8"),
      readFile(localizedPageUrl, "utf8"),
      readFile(rootPageUrl, "utf8"),
      readFile(publicStylesUrl, "utf8"),
    ]);

  assert.match(
    component,
    /<main\s+className="public-shell"\s+lang=\{language\}\s+dir=\{direction\}/,
  );
  assert.match(
    component,
    /aria-current=\{\s*locale\.language === language/,
  );
  assert.match(component, /hrefLang=\{locale\.language\}/);
  assert.match(
    component,
    /href=\{currentLocale\.href\}/,
  );
  assert.match(
    component,
    /direction === "rtl" \? "←" : "→"/,
  );
  assert.match(
    component,
    /aria-label=\{messages\.trustPrinciplesAriaLabel\}/,
  );
  assert.doesNotMatch(component, /[\u0590-\u05ff]/u);
  assert.match(
    localizedPage,
    /isPublicLandingLanguage\(locale\)/,
  );
  assert.match(localizedPage, /notFound\(\)/);
  assert.match(
    localizedPage,
    /\{ locale: "en" \}, \{ locale: "ar" \}/,
  );
  assert.match(
    rootPage,
    /<PublicLandingPage language="he" \/>/,
  );
  assert.match(
    styles,
    /\.public-header-actions \{[\s\S]*?justify-content: flex-end;/,
  );
  assert.match(
    styles,
    /\.public-language-switcher a\[aria-current="page"\]/,
  );
  assert.doesNotMatch(component, /Math\.random\(/);
  assert.doesNotMatch(
    component,
    /crypto\.randomUUID\(/,
  );
});
