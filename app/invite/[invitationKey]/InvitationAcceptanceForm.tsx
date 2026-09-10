"use client";

import Link from "next/link";
import {
  useActionState,
} from "react";

import type {
  InterfaceLanguage,
} from "../../../shared/domain/businessProfileDraft.ts";
import type {
  TeamInvitationAcceptanceActionResult,
} from "../../../shared/domain/teamInvitationView.ts";
import {
  readInvitationMessages,
  readInvitationResultMessage,
} from "../../../shared/i18n/invitation.ts";

interface InvitationAcceptanceFormProps {
  language: InterfaceLanguage;
  action(
    previousResult:
      TeamInvitationAcceptanceActionResult | null,
    formData: FormData,
  ): Promise<TeamInvitationAcceptanceActionResult>;
}

export function InvitationAcceptanceForm({
  action,
  language,
}: InvitationAcceptanceFormProps) {
  const [result, formAction, pending] =
    useActionState(action, null);
  const messages = readInvitationMessages(language);
  const message = readInvitationResultMessage(language, result);

  return (
    <>
      <div
        aria-live="polite"
        className="invitation-notice"
        data-invitation-status={
          result?.status ?? "ready"
        }
        id="invitation-action-status"
        role="status"
      >
        <span aria-hidden="true">
          {message.complete ? "✓" : "!"}
        </span>
        <div>
          <strong>{message.heading}</strong>
          <p>{message.description}</p>
        </div>
      </div>

      <div className="invitation-actions">
        <form action={formAction}>
          <button
            aria-describedby="invitation-action-status"
            className="primary-button"
            data-e2e-focus-ref="accept-button"
            disabled={
              pending || message.complete
            }
            type="submit"
          >
            {pending
              ? messages.actions.accepting
              : messages.actions.accept}
          </button>
        </form>
        <Link
          className="secondary-button"
          data-e2e-focus-ref="home-link"
          href={
            language === "he" ? "/" : `/${language}`
          }
        >
          {messages.actions.backHome}
        </Link>
      </div>
    </>
  );
}
