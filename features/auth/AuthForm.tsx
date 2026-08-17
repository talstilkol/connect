import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { inspectClerkConfiguration } from "../../server/auth/clerkConfiguration";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  readAuthDirection,
  readAuthHref,
  readAuthLocaleLinks,
  readAuthMessages,
  type AuthMode,
} from "../../shared/i18n/auth";
import {
  publicLandingLocales,
} from "../../shared/i18n/publicLanding";

function ConfigurationNotice({
  language,
  status,
}: {
  language: InterfaceLanguage;
  status: "disabled" | "incomplete";
}) {
  const messages = readAuthMessages(language).configuration;

  return (
    <div className="auth-configuration-notice" role="status">
      <span aria-hidden="true">i</span>
      <div>
        <strong>
          {status === "disabled"
            ? messages.disabledTitle
            : messages.incompleteTitle}
        </strong>
        <p>
          {status === "disabled"
            ? messages.disabledDescription
            : messages.incompleteDescription}
        </p>
      </div>
    </div>
  );
}

export default function AuthForm({
  language,
  mode,
}: {
  language: InterfaceLanguage;
  mode: AuthMode;
}) {
  const isRegister = mode === "register";
  const configuration = inspectClerkConfiguration();
  const messages = readAuthMessages(language);
  const formMessages = messages.form[mode];
  const direction = readAuthDirection(language);
  const homeHref =
    publicLandingLocales.find(
      (locale) => locale.language === language,
    )?.href ?? "/";
  const signInUrl = readAuthHref(language, "login");
  const signUpUrl = readAuthHref(language, "register");

  return (
    <main
      className="auth-shell"
      lang={language}
      dir={direction}
    >
      <section className="auth-brand-panel">
        <Link href={homeHref} className="public-brand auth-brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Connect</strong>
            <small>WhatsApp Business Platform</small>
          </span>
        </Link>
        <div className="auth-panel-copy">
          <span className="hero-badge">
            <i />
            {messages.brand.badge}
          </span>
          <h1>
            {messages.brand.titleFirstLine}
            <br />
            {messages.brand.titleSecondLine}
          </h1>
          <p>{messages.brand.description}</p>
        </div>
        <div className="auth-security-note">
          <span>✓</span>
          <div>
            <strong>{messages.brand.securityTitle}</strong>
            <small>{messages.brand.securityDescription}</small>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div
            className="public-language-switcher auth-language-switcher"
            role="group"
            aria-label={messages.languageSelectorAriaLabel}
          >
            {readAuthLocaleLinks(mode).map((locale) => (
              <Link
                key={locale.language}
                href={locale.href}
                hrefLang={locale.language}
                lang={locale.language}
                dir={locale.direction}
                aria-current={
                  locale.language === language
                    ? "page"
                    : undefined
                }
              >
                {locale.nativeName}
              </Link>
            ))}
          </div>
          <div className="auth-heading">
            <span>{formMessages.eyebrow}</span>
            <h2>{formMessages.title}</h2>
            <p>{formMessages.description}</p>
          </div>

          <div className="auth-provider-slot">
            {configuration.status === "configured" ? (
              isRegister ? (
                <SignUp
                  routing="hash"
                  signInUrl={signInUrl}
                  fallbackRedirectUrl="/workspace/onboarding"
                />
              ) : (
                <SignIn
                  routing="hash"
                  signUpUrl={signUpUrl}
                  fallbackRedirectUrl="/workspace"
                />
              )
            ) : (
              <ConfigurationNotice
                language={language}
                status={configuration.status}
              />
            )}
          </div>

          <p className="auth-switch">
            {formMessages.switchPrompt}
            <Link href={isRegister ? signInUrl : signUpUrl}>
              {formMessages.switchAction}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
