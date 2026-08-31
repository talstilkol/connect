import type {
  Metadata,
} from "next";
import Link from "next/link";

import {
  acceptTeamInvitationFromPageAction,
} from "../../../server/team/teamInvitationAcceptanceActions.ts";
import {
  inspectTeamInvitationAcceptanceActivation,
} from "../../../server/team/teamInvitationAcceptanceActivation.ts";
import {
  requireTeamInvitationKey,
} from "../../../server/team/teamInvitationValidation.ts";
import {
  readInvitationDirection,
  readInvitationLanguage,
  readInvitationLocaleLinks,
  readInvitationMessages,
} from "../../../shared/i18n/invitation.ts";
import {
  InvitationAcceptanceForm,
} from "./InvitationAcceptanceForm.tsx";

interface TeamInvitationPageProps {
  params: Promise<{
    invitationKey: string;
  }>;
  searchParams: Promise<{
    lang?: string | string[];
  }>;
}

async function readPageLanguage(
  searchParams: TeamInvitationPageProps["searchParams"],
) {
  const { lang } = await searchParams;

  return readInvitationLanguage(lang);
}

export async function generateMetadata({
  searchParams,
}: TeamInvitationPageProps): Promise<Metadata> {
  const language = await readPageLanguage(searchParams);
  const messages = readInvitationMessages(language);

  return {
    ...messages.metadata,
    referrer: "no-referrer",
    robots: {
      index: false,
      follow: false,
    },
  };
}

function isValidInvitationKey(
  value: unknown,
): boolean {
  try {
    requireTeamInvitationKey(
      value,
    );
    return true;
  } catch {
    return false;
  }
}

export default async function TeamInvitationPage({
  params,
  searchParams,
}: TeamInvitationPageProps) {
  const {
    invitationKey,
  } = await params;
  const language = await readPageLanguage(searchParams);
  const messages = readInvitationMessages(language);
  const direction = readInvitationDirection(language);
  const homeHref = language === "he" ? "/" : `/${language}`;
  const validKey =
    isValidInvitationKey(
      invitationKey,
    );
  const activationReady =
    inspectTeamInvitationAcceptanceActivation()
      .status === "ready";
  const routeReady =
    validKey &&
    activationReady;
  const acceptanceAction =
    acceptTeamInvitationFromPageAction.bind(
      null,
      invitationKey,
    );

  return (
    <main
      className="invitation-shell"
      lang={language}
      dir={direction}
    >
      <a
        className="skip-link"
        data-e2e-focus-ref="skip-link"
        href="#invitation-content"
      >
        {messages.skipLink}
      </a>

      <section
        aria-labelledby="invitation-title"
        className="invitation-card"
        id="invitation-content"
        tabIndex={-1}
      >
        <Link
          aria-label={messages.homeAriaLabel}
          className="public-brand invitation-brand"
          data-e2e-focus-ref="brand-link"
          href={homeHref}
        >
          <span
            aria-hidden="true"
            className="brand-mark"
          >
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Connect</strong>
            <small>{messages.brandSubtitle}</small>
          </span>
        </Link>

        <div
          className="public-language-switcher invitation-language-switcher"
          role="group"
          aria-label={messages.languageSelectorAriaLabel}
        >
          {readInvitationLocaleLinks().map((locale) => (
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

        <div className="invitation-heading">
          <span className="invitation-kicker">
            {messages.heading.kicker}
          </span>
          <h1 id="invitation-title">
            {messages.heading.title}
          </h1>
          <p>{messages.heading.description}</p>
        </div>

        <ol
          aria-label={messages.stepsAriaLabel}
          className="invitation-steps"
        >
          <li
            className={
              validKey
                ? "complete"
                : "blocked"
            }
          >
            <span aria-hidden="true">
              1
            </span>
            <div>
              <strong>
                {messages.steps.linkTitle}
              </strong>
              <small>
                {validKey
                  ? messages.steps.validLink
                  : messages.steps.invalidLink}
              </small>
            </div>
          </li>
          <li
            className={
              activationReady
                ? "pending"
                : "blocked"
            }
          >
            <span aria-hidden="true">
              2
            </span>
            <div>
              <strong>
                {messages.steps.identityTitle}
              </strong>
              <small>
                {messages.steps.identityDescription}
              </small>
            </div>
          </li>
          <li
            className={
              routeReady
                ? "pending"
                : "blocked"
            }
          >
            <span aria-hidden="true">
              3
            </span>
            <div>
              <strong>
                {messages.steps.membershipTitle}
              </strong>
              <small>
                {messages.steps.membershipDescription}
              </small>
            </div>
          </li>
        </ol>

        {routeReady ? (
          <InvitationAcceptanceForm
            action={acceptanceAction}
            language={language}
          />
        ) : (
          <>
            <div
              className="invitation-notice"
              data-invitation-status="configuration-required"
              id="invitation-action-status"
              role="status"
            >
              <span aria-hidden="true">
                !
              </span>
              <div>
                <strong>
                  {validKey
                    ? messages.blocked.configurationTitle
                    : messages.blocked.invalidTitle}
                </strong>
                <p>
                  {validKey
                    ? messages.blocked.configurationDescription
                    : messages.blocked.invalidDescription}
                </p>
              </div>
            </div>

            <div className="invitation-actions">
              <button
                aria-describedby="invitation-action-status"
                className="primary-button"
                data-e2e-focus-ref="accept-button"
                disabled
                type="button"
              >
                {messages.actions.accept}
              </button>
              <Link
                className="secondary-button"
                data-e2e-focus-ref="home-link"
                href={homeHref}
              >
                {messages.actions.backHome}
              </Link>
            </div>
          </>
        )}

        <p className="invitation-privacy-note">
          {messages.privacyNote}
        </p>
      </section>
    </main>
  );
}
