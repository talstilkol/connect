"use client";

import {
  useState,
  useTransition,
  type FormEvent,
} from "react";
import type { ContactRecord } from "../../shared/domain/contactRecord";
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
  initialContacts,
  initialNextCursor,
  initialOrganization,
  initialStatus,
}: {
  authEnabled: boolean;
  initialContacts: readonly ContactRecord[];
  initialNextCursor: number | null;
  initialOrganization: ContactOrganizationSnapshot;
  initialStatus: ContactDirectoryStatus;
}) {
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
      ? "יש להשלים תחילה את פרטי העסק כדי ליצור Tenant פעיל."
      : initialStatus === "tenant-selection-required"
        ? "המשתמש שייך למספר Tenants ונדרשת בחירה מפורשת."
        : initialStatus === "server-error"
          ? "לא ניתן היה לטעון את אנשי הקשר מהשרת."
          : null;

  return (
    <div className="contact-directory">
      <section className="card contact-management-card">
        <div className="card-header">
          <div>
            <span className="card-kicker">Persistent contacts</span>
            <h2>ניהול אנשי קשר קבוע</h2>
          </div>
          <span
            className={`status-pill ${
              initialStatus === "ready" ? "success" : "warning"
            }`}
          >
            {initialStatus === "ready"
              ? `${contacts.length} נטענו מהשרת`
              : "השרת אינו פעיל"}
          </span>
        </div>

        {!authEnabled || initialStatus === "configuration-required" ? (
          <div className="inline-notice warning" role="status">
            <span aria-hidden="true">i</span>
            <p>
              Clerk אינו מוגדר. ניתן לבדוק את מסלול ה־CSV/XLSX המקומי, אך אי
              אפשר ליצור אנשי קשר קבועים.
            </p>
          </div>
        ) : directoryError ? (
          <div className="inline-notice danger" role="alert">
            <span aria-hidden="true">!</span>
            <p>{directoryError}</p>
          </div>
        ) : (
          <>
            <p className="form-explanation">
              מספר הטלפון חייב להגיע בפורמט בינלאומי מפורש. איש קשר חדש
              נשמר כחסום לדיוור עד לתיעוד הסכמה נפרד.
            </p>
            <form
              className="contact-profile-form"
              onSubmit={submitContact}
            >
              <label>
                <span>מספר טלפון בינלאומי</span>
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  inputMode="tel"
                  placeholder="+"
                  required
                />
              </label>
              <label>
                <span>שם פרטי — רשות</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                />
              </label>
              <label>
                <span>שם משפחה — רשות</span>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                />
              </label>
              <label>
                <span>אימייל — רשות</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </label>
              <label>
                <span>חברה — רשות</span>
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
                {isPending ? "שומר..." : "שמירת איש קשר"}
              </button>
            </form>

            <ContactActionFeedback result={saveResult} />

            <div className="contact-records">
              <div className="contact-records-heading">
                <strong>אנשי קשר שנשמרו</strong>
                <span>
                  נטענו {contacts.length} רשומות
                  {nextCursor !== null ? " · קיימות רשומות נוספות" : ""}
                </span>
              </div>

              {contacts.length === 0 ? (
                <div className="mini-empty">
                  <span>◌</span>
                  <strong>אין אנשי קשר קבועים</strong>
                  <small>
                    הרשומה הראשונה תופיע לאחר שמירה מוצלחת בשרת.
                  </small>
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
                            ? "מורשה לדיוור"
                            : "חסום לדיוור"}
                        </span>
                        <small>
                          {consentDescription(contact)}
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
                            תיעוד הסכמה
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
                            סימון הסרה
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
                    ? "טוען אנשי קשר נוספים..."
                    : "טעינת 50 רשומות נוספות"}
                </button>
              ) : contacts.length > 0 ? (
                <p className="contact-list-end" role="status">
                  כל אנשי הקשר הזמינים נטענו.
                </p>
              ) : null}

              {loadMoreResult &&
              loadMoreResult.status !== "loaded" ? (
                <div className="inline-notice danger" role="alert">
                  <span aria-hidden="true">!</span>
                  <p>{contactLoadFailureMessage(loadMoreResult)}</p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>

      <ContactOrganization
        enabled={authEnabled && initialStatus === "ready"}
        contacts={contacts}
        organization={organization}
        onSnapshot={mergeOrganization}
      />

      {consentEditor ? (
        <section className="card consent-editor-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">Consent event</span>
              <h2>
                {consentEditor.action === "grant"
                  ? "תיעוד הסכמה"
                  : "תיעוד הסרה מדיוור"}
              </h2>
            </div>
            <button
              type="button"
              className="close-button"
              aria-label="סגירת טופס הסכמה"
              onClick={() => setConsentEditor(null)}
            >
              ×
            </button>
          </div>
          <form className="consent-event-form" onSubmit={submitConsent}>
            <label>
              <span>מקור התיעוד</span>
              <input
                value={consentSource}
                onChange={(event) => setConsentSource(event.target.value)}
                required
              />
            </label>
            <label>
              <span>מועד האירוע</span>
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
              <span>הפניה לראיה — רשות</span>
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
                ? "שומר..."
                : consentEditor.action === "grant"
                  ? "שמירת ההסכמה"
                  : "שמירת ההסרה"}
            </button>
          </form>
          <ContactActionFeedback result={consentResult} />
        </section>
      ) : null}

      <section className="contact-import-section">
        <div className="section-divider-heading">
          <div>
            <span className="card-kicker">Import rehearsal</span>
            <h2>בדיקת קובץ לפני ייבוא</h2>
          </div>
          <p>
            בדיקת הקובץ נעשית מקומית; לאחר אישור מפורש הפרופילים נשמרים
            בשרת בלי לייבא הרשאת דיוור.
          </p>
        </div>
        <ContactImport
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

function consentDescription(contact: ContactRecord): string {
  if (contact.consentStatus === "unknown") {
    return "לא תועדה הסכמה";
  }

  if (contact.consentStatus === "withdrawn") {
    return contact.consentSource
      ? `הסרה תועדה דרך ${contact.consentSource}`
      : "הסרה תועדה";
  }

  return contact.consentSource
    ? `הסכמה תועדה דרך ${contact.consentSource}`
    : "הסכמה תועדה";
}

function ContactActionFeedback({
  result,
}: {
  result: SaveContactActionResult | ContactConsentActionResult | null;
}) {
  if (!result) {
    return null;
  }

  if (result.status === "saved") {
    return (
      <div className="inline-notice success" role="status">
        <span aria-hidden="true">✓</span>
        <p>הפעולה נשמרה בשרת עבור ה־Tenant המאומת.</p>
      </div>
    );
  }

  const message =
    result.status === "validation-error"
      ? "אחד או יותר מהשדות אינו תקין."
      : result.status === "configuration-required"
        ? "חיבור Clerk אינו מוגדר."
        : result.status === "unauthenticated"
          ? "ה-Session אינו פעיל. יש להתחבר מחדש."
          : result.status === "onboarding-required"
            ? "יש להשלים תחילה את יצירת סביבת העבודה."
            : result.status === "tenant-selection-required"
              ? "נדרשת בחירת Tenant מפורשת."
              : result.status === "permission-denied"
                ? "לתפקיד הנוכחי אין הרשאה לבצע את הפעולה."
                : result.status === "not-found"
                  ? "איש הקשר לא נמצא ב-Tenant הנוכחי."
                  : "הפעולה נכשלה בשרת ולא נשמרה מקומית.";

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
): string {
  if (result.status === "validation-error") {
    return "סמן ההמשך של הרשימה אינו תקין.";
  }

  if (result.status === "configuration-required") {
    return "חיבור Clerk אינו מוגדר.";
  }

  if (result.status === "unauthenticated") {
    return "ה־Session אינו פעיל. יש להתחבר מחדש.";
  }

  if (result.status === "onboarding-required") {
    return "יש להשלים תחילה את יצירת סביבת העבודה.";
  }

  if (result.status === "tenant-selection-required") {
    return "נדרשת בחירת Tenant מפורשת.";
  }

  if (result.status === "permission-denied") {
    return "לתפקיד הנוכחי אין הרשאה לקרוא אנשי קשר.";
  }

  return "טעינת הרשומות הנוספות נכשלה. הרשומות שכבר נטענו נשארו במסך.";
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
