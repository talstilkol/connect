import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  authMessages,
  readAuthDirection,
  readAuthHref,
  readAuthLanguageFromPathname,
  readAuthLocaleLinks,
  readAuthMessages,
} from "../shared/i18n/auth.ts";
import {
  publicLandingLocales,
} from "../shared/i18n/publicLanding.ts";

const authFormUrl = new URL(
  "../features/auth/AuthForm.tsx",
  import.meta.url,
);
const clerkProviderUrl = new URL(
  "../features/auth/LocalizedClerkProvider.tsx",
  import.meta.url,
);
const clerkServerBoundaryUrl = new URL(
  "../features/auth/ClerkAppProvider.tsx",
  import.meta.url,
);
const localizedLoginUrl = new URL(
  "../app/[locale]/login/page.tsx",
  import.meta.url,
);
const localizedRegisterUrl = new URL(
  "../app/[locale]/register/page.tsx",
  import.meta.url,
);
const rootLoginUrl = new URL(
  "../app/login/page.tsx",
  import.meta.url,
);
const rootRegisterUrl = new URL(
  "../app/register/page.tsx",
  import.meta.url,
);
const publicLandingUrl = new URL(
  "../features/public/PublicLandingPage.tsx",
  import.meta.url,
);
const globalStylesUrl = new URL(
  "../app/globals.css",
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
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

test("defines deterministic localized authentication routes", () => {
  assert.deepEqual(
    publicLandingLocales.map(({ language }) => ({
      language,
      login: readAuthHref(language, "login"),
      register: readAuthHref(language, "register"),
      direction: readAuthDirection(language),
    })),
    [
      {
        language: "he",
        login: "/login",
        register: "/register",
        direction: "rtl",
      },
      {
        language: "en",
        login: "/en/login",
        register: "/en/register",
        direction: "ltr",
      },
      {
        language: "ar",
        login: "/ar/login",
        register: "/ar/register",
        direction: "rtl",
      },
    ],
  );

  assert.deepEqual(
    readAuthLocaleLinks("login").map(
      ({ language, href }) => ({ language, href }),
    ),
    [
      { language: "he", href: "/login" },
      { language: "en", href: "/en/login" },
      { language: "ar", href: "/ar/login" },
    ],
  );
});

test("resolves a Clerk language only from an exact leading locale segment", () => {
  assert.equal(readAuthLanguageFromPathname("/login"), "he");
  assert.equal(readAuthLanguageFromPathname("/register"), "he");
  assert.equal(readAuthLanguageFromPathname("/en/login"), "en");
  assert.equal(readAuthLanguageFromPathname("/ar/register"), "ar");
  assert.equal(readAuthLanguageFromPathname("/english/login"), "he");
  assert.equal(readAuthLanguageFromPathname("/en-US/login"), "he");
  assert.equal(readAuthLanguageFromPathname("//en/login"), "he");
  assert.equal(readAuthLanguageFromPathname(null), "he");
});

test("keeps every authentication dictionary complete and non-blank", () => {
  const expectedKeys = Object.keys(authMessages.he).sort();

  for (const locale of publicLandingLocales) {
    const messages = readAuthMessages(locale.language);

    assert.deepEqual(Object.keys(messages).sort(), expectedKeys);
    assert.deepEqual(
      Object.keys(messages.metadata).sort(),
      ["login", "register"],
    );
    assert.deepEqual(
      Object.keys(messages.form).sort(),
      ["login", "register"],
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

test("keeps localized Auth UI, Clerk configuration, and route boundaries aligned", async () => {
  const [
    authForm,
    clerkProvider,
    clerkServerBoundary,
    localizedLogin,
    localizedRegister,
    rootLogin,
    rootRegister,
    publicLanding,
    globalStyles,
  ] = await Promise.all([
    readFile(authFormUrl, "utf8"),
    readFile(clerkProviderUrl, "utf8"),
    readFile(clerkServerBoundaryUrl, "utf8"),
    readFile(localizedLoginUrl, "utf8"),
    readFile(localizedRegisterUrl, "utf8"),
    readFile(rootLoginUrl, "utf8"),
    readFile(rootRegisterUrl, "utf8"),
    readFile(publicLandingUrl, "utf8"),
    readFile(globalStylesUrl, "utf8"),
  ]);

  assert.match(
    authForm,
    /<main\s+className="auth-shell"\s+lang=\{language\}\s+dir=\{direction\}/,
  );
  assert.match(authForm, /readAuthLocaleLinks\(mode\)/);
  assert.match(authForm, /aria-current=\{/);
  assert.match(authForm, /hrefLang=\{locale\.language\}/);
  assert.match(authForm, /signInUrl=\{signInUrl\}/);
  assert.match(authForm, /signUpUrl=\{signUpUrl\}/);
  assert.doesNotMatch(authForm, /[\u0590-\u05ff]/u);

  assert.match(clerkProvider, /^"use client";/);
  assert.match(clerkProvider, /ar: arSA/);
  assert.match(clerkProvider, /en: enUS/);
  assert.match(clerkProvider, /he: heIL/);
  assert.match(clerkProvider, /usePathname\(\)/);
  assert.match(
    clerkProvider,
    /localization=\{clerkLocalization\[language\]\}/,
  );
  assert.doesNotMatch(clerkProvider, /CLERK_SECRET_KEY/);
  assert.doesNotMatch(
    clerkProvider,
    /inspectClerkConfiguration/,
  );
  assert.match(
    clerkServerBoundary,
    /inspectClerkConfiguration\(\)/,
  );
  assert.match(
    clerkServerBoundary,
    /<LocalizedClerkProvider/,
  );

  for (const localizedPage of [
    localizedLogin,
    localizedRegister,
  ]) {
    assert.match(localizedPage, /isPublicLandingLanguage\(locale\)/);
    assert.match(localizedPage, /locale === "he"/);
    assert.match(localizedPage, /notFound\(\)/);
  }
  assert.match(
    localizedLogin,
    /<AuthForm language=\{language\} mode="login" \/>/,
  );
  assert.match(
    localizedRegister,
    /<AuthForm language=\{language\} mode="register" \/>/,
  );
  assert.match(
    rootLogin,
    /<AuthForm language="he" mode="login" \/>/,
  );
  assert.match(
    rootRegister,
    /<AuthForm language="he" mode="register" \/>/,
  );

  assert.match(publicLanding, /readAuthHref\(language, "login"\)/);
  assert.match(
    publicLanding,
    /readAuthHref\(language, "register"\)/,
  );
  assert.match(globalStyles, /margin-inline-start: 5px;/);

  for (const source of [authForm, clerkProvider, publicLanding]) {
    assert.doesNotMatch(source, /Math\.random\(/);
    assert.doesNotMatch(source, /crypto\.randomUUID\(/);
  }
});
