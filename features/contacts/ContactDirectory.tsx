"use client";

import {
  useState,
  useTransition,
  type FormEvent,
} from "react";
import type { ContactRecord } from "../../shared/domain/contactRecord";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization";
import {
  grantContactConsentAction,
  loadMoreContactsAction,
  saveContactAction,
  unsubscribeContactAction,
  type ContactConsentActionResult,
  type LoadMoreContactsActionResult,
  type SaveContactActionResult,
} from "../../server/contacts/contactActions";
import { ContactImport } from "./ContactImport";
import { ContactOrganization } from "./ContactOrganization";
import {
  readContactDirectoryMessages,
  type ContactDirectoryMessages,
} from "./contactDirectoryMessages";

export type ContactDirectoryStatus =
  | "ready"
  | "configuration-required"
  | "onboarding-required"
  | "tenant-selection-required"
  | "server-error";

type ConsentEditorState = {
  contactId: number;
  action: "grant" | "unsubscribe";
} | null;

export function ContactDirectory({
  authEnabled,
  language,
  initialContacts,
  initialNextCursor,
  initialOrganization,
  initialStatus,
}: {
  authEnabled: boolean;
  language: InterfaceLanguage;
  initialContacts: readonly ContactRecord[];
  initialNextCursor: number | null;
  initialOrganization: ContactOrganizationSnapshot;
  initialStatus: ContactDirectoryStatus;
}) {
  const messages = readContactDirectoryMessages(language);
  const [contacts, setContacts] = useState<readonly ContactRecord[]>(
    initialContacts,
  );
  const [nextCursor, setNextCursor] =
    useState<number | null>(initialNextCursor);
  const [organization, setOrganization] =
    useState<ContactOrganizationSnapshot>(initialOrganization);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [saveResult, setSaveResult] =
    useState<SaveContactActionResult | null>(null);
  const [consentResult, setConsentResult] =
    useState<ContactConsentActionResult | null>(null);
  const [consentEditor, setConsentEditor] =
    useState<ConsentEditorState>(null);
  const [consentSource, setConsentSource] = useState("");
  const [consentOccurredAt, setConsentOccurredAt] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [loadMoreResult, setLoadMoreResult] =
    useState<LoadMoreContactsActionResult | null>(null);

  const replaceContact = (contact: ContactRecord) => {
    setContacts((current) => {
      const existingIndex = current.findIndex(
        (item) => item.id === contact.id,
      );

      if (existingIndex === -1) {
        return [contact, ...current];
      }

      return current.map((item) =>
        item.id === contact.id ? contact : item,
      );
    });
  };

  const mergeImportedContacts = (
    importedContacts: readonly ContactRecord[],
  ) => {
    for (const contact of importedContacts) {
      replaceContact(contact);
    }
  };

  const mergeOrganization = (
    snapshot: ContactOrganizationSnapshot,
  ) => {
    setOrganization((current) =>
      mergeContactOrganization(current, snapshot),
    );
  };

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveResult(null);

    startTransition(async () => {
      const result = await saveContactAction({
        phoneNumber,
        firstName,
        lastName,
        email,
        company,
      });
      setSaveResult(result);

      if (result.status === "saved") {
        replaceContact(result.contact);
        setPhoneNumber("");
        setFirstName("");
        setLastName("");
        setEmail("");
        setCompany("");
      }
    });
  };

  const loadMoreContacts = () => {
    if (nextCursor === null || isLoadingMore) {
      return;
    }

    setLoadMoreResult(null);

    startLoadingMore(async () => {
      const result = await loadMoreContactsAction(nextCursor);
      setLoadMoreResult(result);

      if (result.status !== "loaded") {
        return;
      }

      setContacts((current) => {
        const knownContactIds = new Set(
          current.map((contact) => contact.id),
        );
        const newContacts = result.contacts.filter(
          (contact) => !knownContactIds.has(contact.id),
        );

        return [...current, ...newContacts];
      });
      setNextCursor(result.nextCursor);
      mergeOrganization(result.organization);
    });
  };

  const openConsentEditor = (
    contactId: number,
    action: "grant" | "unsubscribe",
  ) => {
    setConsentEditor({ contactId, action });
    setConsentSource("");
    setConsentOccurredAt("");
    setEvidenceReference("");
    setConsentResult(null);
  };

  const submitConsent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!consentEditor || !consentOccurredAt) {
      return;
    }

    const transition = {
      source: consentSource,
      occurredAt: new Date(consentOccurredAt).toISOString(),
      evidenceReference,
    };
    setConsentResult(null);

    startTransition(async () => {
      const result =
        consentEditor.action === "grant"
          ? await grantContactConsentAction(
              consentEditor.contactId,
              transition,
            )
          : await unsubscribeContactAction(
              consentEditor.contactId,
              transition,
            );
      setConsentResult(result);

      if (result.status === "saved") {
        replaceContact(result.contact);
        setConsentEditor(null);
      }
    });
  };

  const directoryError =
    initialStatus === "onboarding-required"
      ? messages.directory.errors["onboarding-required"]
      : initialStatus === "tenant-selection-required"
        ? messages.directory.errors["tenant-selection-required"]
        : initialStatus === "server-error"
          ? messages.directory.errors["server-error"]
          : null;

  return (
    <div className="contact-directory">
      <section className="card contact-management-card">
        <div className="card-header">
          <div>
            <span className="card-kicker">
              {messages.directory.kicker}
            </span>
            <h2>{messages.directory.title}</h2>
          </div>
          <span
            className={`status-pill ${
              initialStatus === "ready" ? "success" : "warning"
            }`}
          >
            {initialStatus === "ready"
              ? messages.directory.loaded(contacts.length)
              : messages.directory.serverInactive}
          </span>
        </div>

        {!authEnabled || initialStatus === "configuration-required" ? (
          <div className="inline-notice warning" role="status">
            <span aria-hidden="true">i</span>
            <p>{messages.directory.configurationNotice}</p>
          </div>
        ) : directoryError ? (
          <div className="inline-notice danger" role="alert">
            <span aria-hidden="true">!</span>
            <p>{directoryError}</p>
          </div>
        ) : (
          <>
            <p className="form-explanation">
              {messages.directory.explanation}
            </p>
            <form
              className="contact-profile-form"
              onSubmit={submitContact}
            >
              <label>
                <span>{messages.directory.fields.phoneNumber}</span>
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  inputMode="tel"
                  placeholder="+"
                  required
                />
              </label>
              <label>
                <span>{messages.directory.fields.firstName}</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                />
              </label>
              <label>
                <span>{messages.directory.fields.lastName}</span>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                />
              </label>
              <label>
                <span>{messages.directory.fields.email}</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </label>
              <label>
                <span>{messages.directory.fields.company}</span>
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  autoComplete="organization"
                />
              </label>
              <button
                type="submit"
                className="primary-button"
                disabled={isPending || !phoneNumber.trim()}
              >
                {isPending
                  ? messages.directory.saving
                  : messages.directory.save}
              </button>
            </form>

            <ContactActionFeedback
              messages={messages.directory.feedback}
              result={saveResult}
            />

            <div className="contact-records">
              <div className="contact-records-heading">
                <strong>{messages.directory.recordsTitle}</strong>
                <span>
                  {messages.directory.recordsSummary(
                    contacts.length,
                    nextCursor !== null,
                  )}
                </span>
              </div>

              {contacts.length === 0 ? (
                <div className="mini-empty">
                  <span>◌</span>
                  <strong>{messages.directory.emptyTitle}</strong>
                  <small>{messages.directory.emptyDescription}</small>
                </div>
              ) : (
                <div className="contact-record-list">
                  {contacts.map((contact) => (
                    <article
                      className="contact-record-row"
                      key={contact.id}
                    >
                      <div className="contact-record-identity">
                        <strong>{contactDisplayName(contact)}</strong>
                        <span dir="ltr">{contact.phoneNumber}</span>
                        {contact.email ? <small>{contact.email}</small> : null}
                      </div>
                      <div className="contact-record-status">
                        <span
                          className={`status-pill ${
                            contact.mailingStatus === "subscribed"
                              ? "success"
                              : "warning"
                          }`}
                        >
                          {contact.mailingStatus === "subscribed"
                            ? messages.directory.subscribed
                            : messages.directory.blocked}
                        </span>
                        <small>
                          {consentDescription(
                            contact,
                            messages.directory.consent,
                          )}
                        </small>
                      </div>
                      <div className="contact-record-actions">
                        {contact.consentStatus !== "granted" ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              openConsentEditor(contact.id, "grant")
                            }
                          >
                            {messages.directory.documentConsent}
                          </button>
                        ) : null}
                        {contact.mailingStatus === "subscribed" ? (
                          <button
                            type="button"
                            className="text-button danger-text-button"
                            onClick={() =>
                              openConsentEditor(
                                contact.id,
                                "unsubscribe",
                              )
                            }
                          >
                            {messages.directory.documentUnsubscribe}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {nextCursor !== null ? (
                <button
                  type="button"
                  className="secondary-button contact-load-more-button"
                  disabled={isLoadingMore}
                  onClick={loadMoreContacts}
                >
                  {isLoadingMore
                    ? messages.directory.loadingMore
                    : messages.directory.loadMore}
                </button>
              ) : contacts.length > 0 ? (
                <p className="contact-list-end" role="status">
                  {messages.directory.allLoaded}
                </p>
              ) : null}

              {loadMoreResult &&
              loadMoreResult.status !== "loaded" ? (
                <div className="inline-notice danger" role="alert">
                  <span aria-hidden="true">!</span>
                  <p>
                    {contactLoadFailureMessage(
                      loadMoreResult,
                      messages.directory.feedback.loadFailures,
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>

      <ContactOrganization
        enabled={authEnabled && initialStatus === "ready"}
        language={language}
        contacts={contacts}
        organization={organization}
        onSnapshot={mergeOrganization}
      />

      {consentEditor ? (
        <section className="card consent-editor-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">
                {messages.consentEditor.kicker}
              </span>
              <h2>
                {consentEditor.action === "grant"
                  ? messages.consentEditor.grantTitle
                  : messages.consentEditor.unsubscribeTitle}
              </h2>
            </div>
            <button
              type="button"
              className="close-button"
              aria-label={messages.consentEditor.closeAriaLabel}
              onClick={() => setConsentEditor(null)}
            >
              ×
            </button>
          </div>
          <form className="consent-event-form" onSubmit={submitConsent}>
            <label>
              <span>{messages.consentEditor.source}</span>
              <input
                value={consentSource}
                onChange={(event) => setConsentSource(event.target.value)}
                required
              />
            </label>
            <label>
              <span>{messages.consentEditor.occurredAt}</span>
              <input
                type="datetime-local"
                value={consentOccurredAt}
                onChange={(event) =>
                  setConsentOccurredAt(event.target.value)
                }
                required
              />
            </label>
            <label>
              <span>{messages.consentEditor.evidenceReference}</span>
              <input
                value={evidenceReference}
                onChange={(event) =>
                  setEvidenceReference(event.target.value)
                }
              />
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={
                isPending ||
                !consentSource.trim() ||
                !consentOccurredAt
              }
            >
              {isPending
                ? messages.consentEditor.saving
                : consentEditor.action === "grant"
                  ? messages.consentEditor.saveGrant
                  : messages.consentEditor.saveUnsubscribe}
            </button>
          </form>
          <ContactActionFeedback
            messages={messages.directory.feedback}
            result={consentResult}
          />
        </section>
      ) : null}

      <section className="contact-import-section">
        <div className="section-divider-heading">
          <div>
            <span className="card-kicker">
              {messages.importSection.kicker}
            </span>
            <h2>{messages.importSection.title}</h2>
          </div>
          <p>
            {messages.importSection.description}
          </p>
        </div>
        <ContactImport
          language={language}
          serverImportEnabled={
            authEnabled && initialStatus === "ready"
          }
          onImportedContacts={mergeImportedContacts}
        />
      </section>
    </div>
  );
}

function contactDisplayName(contact: ContactRecord): string {
  const displayName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

  return displayName || contact.phoneNumber;
}

function consentDescription(
  contact: ContactRecord,
  messages: ContactDirectoryMessages["directory"]["consent"],
): string {
  if (contact.consentStatus === "unknown") {
    return messages.unknown;
  }

  if (contact.consentStatus === "withdrawn") {
    return contact.consentSource
      ? messages.withdrawnWithSource(contact.consentSource)
      : messages.withdrawn;
  }

  return contact.consentSource
    ? messages.grantedWithSource(contact.consentSource)
    : messages.granted;
}

function ContactActionFeedback({
  messages,
  result,
}: {
  messages: ContactDirectoryMessages["directory"]["feedback"];
  result: SaveContactActionResult | ContactConsentActionResult | null;
}) {
  if (!result) {
    return null;
  }

  if (result.status === "saved") {
    return (
      <div className="inline-notice success" role="status">
        <span aria-hidden="true">✓</span>
        <p>{messages.saved}</p>
      </div>
    );
  }

  const message = messages.failures[result.status];

  return (
    <div className="inline-notice danger" role="alert">
      <span aria-hidden="true">!</span>
      <p>{message}</p>
    </div>
  );
}

function contactLoadFailureMessage(
  result: Exclude<
    LoadMoreContactsActionResult,
    { status: "loaded" }
  >,
  messages: ContactDirectoryMessages["directory"]["feedback"]["loadFailures"],
): string {
  return messages[result.status];
}

function mergeContactOrganization(
  current: ContactOrganizationSnapshot,
  incoming: ContactOrganizationSnapshot,
): ContactOrganizationSnapshot {
  const refreshedContactIds = new Set(incoming.scopeContactIds);

  return {
    scopeContactIds: [
      ...new Set([
        ...current.scopeContactIds,
        ...incoming.scopeContactIds,
      ]),
    ],
    tags: incoming.tags,
    lists: incoming.lists,
    tagAssignments: [
      ...current.tagAssignments.filter(
        (assignment) =>
          !refreshedContactIds.has(assignment.contactId),
      ),
      ...incoming.tagAssignments,
    ],
    listMemberships: [
      ...current.listMemberships.filter(
        (membership) =>
          !refreshedContactIds.has(membership.contactId),
      ),
      ...incoming.listMemberships,
    ],
  };
}
