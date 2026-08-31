import Link from "next/link";

import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  readAuthHref,
} from "../../shared/i18n/auth";
import {
  publicLandingLocales,
  readPublicLandingDirection,
  readPublicLandingMessages,
} from "../../shared/i18n/publicLanding";

const capabilityNumbers = ["01", "02", "03"] as const;
const productMapNodes = [
  { icon: "M", className: "node-meta" },
  { icon: "↗", className: "node-campaign" },
  { icon: "◌", className: "node-inbox" },
  { icon: "✦", className: "node-ai" },
] as const;

export function PublicLandingPage({
  language,
}: {
  language: InterfaceLanguage;
}) {
  const messages = readPublicLandingMessages(language);
  const direction = readPublicLandingDirection(language);
  const flowArrow = direction === "rtl" ? "←" : "→";
  const currentLocale =
    publicLandingLocales.find(
      (locale) => locale.language === language,
    ) ?? publicLandingLocales[0];
  const signInHref = readAuthHref(language, "login");
  const registerHref = readAuthHref(language, "register");

  return (
    <main
      className="public-shell"
      lang={language}
      dir={direction}
    >
      <a className="skip-link" href="#public-content">
        {messages.skipLink}
      </a>
      <header className="public-header">
        <Link
          href={currentLocale.href}
          className="public-brand"
          aria-label={messages.homeAriaLabel}
        >
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
        <nav aria-label={messages.publicNavigationAriaLabel}>
          <a href="#capabilities">
            {messages.navigation.capabilities}
          </a>
          <a href="#architecture">
            {messages.navigation.architecture}
          </a>
          <a href="#pricing">
            {messages.navigation.pricing}
          </a>
        </nav>
        <div className="public-header-actions">
          <div
            className="public-language-switcher"
            role="group"
            aria-label={messages.languageSelectorAriaLabel}
          >
            {publicLandingLocales.map((locale) => (
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
          <Link href={signInHref} className="secondary-button">
            {messages.authentication.signIn}
          </Link>
          <Link href={registerHref} className="primary-button">
            {messages.authentication.register}
          </Link>
        </div>
      </header>

      <section
        className="public-hero"
        id="public-content"
        tabIndex={-1}
      >
        <div className="hero-copy">
          <span className="hero-badge">
            <i />
            {messages.hero.badge}
          </span>
          <h1>
            {messages.hero.title}
            <br />
            <em>{messages.hero.emphasis}</em>
          </h1>
          <p>{messages.hero.description}</p>
          <div className="hero-actions">
            <Link href="/workspace" className="primary-button">
              {messages.hero.workspaceAction}
              <span aria-hidden="true">{flowArrow}</span>
            </Link>
            <a href="#architecture" className="secondary-button">
              {messages.hero.architectureAction}
            </a>
          </div>
          <small className="hero-disclaimer">
            {messages.hero.disclaimer}
          </small>
        </div>

        <div
          className="hero-product-map"
          aria-label={messages.hero.productMapAriaLabel}
        >
          <div className="map-orbit orbit-one" />
          <div className="map-orbit orbit-two" />
          <div className="map-center">
            <span>Connect</span>
            <strong>{messages.hero.communicationHub}</strong>
          </div>
          {productMapNodes.map((node, index) => (
            <div
              className={`map-node ${node.className}`}
              key={node.className}
            >
              <span>{node.icon}</span>
              <strong>
                {messages.hero.mapNodes[index].title}
              </strong>
              <small>
                {messages.hero.mapNodes[index].description}
              </small>
            </div>
          ))}
        </div>
      </section>

      <section
        className="trust-strip"
        aria-label={messages.trustPrinciplesAriaLabel}
      >
        {messages.trustPrinciples.map((principle, index) => (
          <span key={principle}>
            {principle}
            {index < messages.trustPrinciples.length - 1 ? (
              <i aria-hidden="true" />
            ) : null}
          </span>
        ))}
      </section>

      <section className="public-section" id="capabilities">
        <div className="section-heading">
          <span>{messages.capabilities.eyebrow}</span>
          <h2>{messages.capabilities.title}</h2>
          <p>{messages.capabilities.description}</p>
        </div>
        <div className="capability-grid">
          {messages.capabilities.items.map((capability, index) => (
            <article key={capabilityNumbers[index]}>
              <span>{capabilityNumbers[index]}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="public-section architecture-section"
        id="architecture"
      >
        <div className="architecture-copy">
          <span>{messages.architecture.eyebrow}</span>
          <h2>{messages.architecture.title}</h2>
          <p>{messages.architecture.description}</p>
        </div>
        <div className="flow-track">
          {messages.architecture.steps.map((step, index) => (
            <div className="flow-step" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
              {index < messages.architecture.steps.length - 1 ? (
                <i aria-hidden="true">{flowArrow}</i>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section
        className="public-section pricing-section"
        id="pricing"
      >
        <div>
          <span className="status-pill critical">
            {messages.pricing.status}
          </span>
          <h2>{messages.pricing.title}</h2>
          <p>{messages.pricing.description}</p>
        </div>
        <Link
          href="/workspace/decisions"
          className="primary-button"
        >
          {messages.pricing.action}
        </Link>
      </section>

      <footer className="public-footer">
        <Link
          href={currentLocale.href}
          className="public-brand"
        >
          <strong>Connect</strong>
        </Link>
        <p>{messages.footerDescription}</p>
        <div>
          <Link href={signInHref}>
            {messages.authentication.signIn}
          </Link>
          <Link href={registerHref}>
            {messages.authentication.register}
          </Link>
        </div>
      </footer>
    </main>
  );
}
