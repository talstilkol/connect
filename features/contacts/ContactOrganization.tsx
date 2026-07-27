"use client";

import {
  useState,
  useTransition,
  type FormEvent,
} from "react";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization";
import type { ContactRecord } from "../../shared/domain/contactRecord";
import {
  createContactListAction,
  createContactTagAction,
  setContactListMembershipAction,
  setContactTagAssignmentAction,
  type ContactOrganizationActionResult,
} from "../../server/contacts/contactOrganizationActions";

export function ContactOrganization({
  enabled,
  contacts,
  organization,
  onSnapshot,
}: {
  enabled: boolean;
  contacts: readonly ContactRecord[];
  organization: ContactOrganizationSnapshot;
  onSnapshot: (snapshot: ContactOrganizationSnapshot) => void;
}) {
  const [tagName, setTagName] = useState("");
  const [listName, setListName] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [result, setResult] =
    useState<ContactOrganizationActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const numericContactId = selectedContactId
    ? Number(selectedContactId)
    : null;

  const runAction = (
    action: () => Promise<ContactOrganizationActionResult>,
    onSaved?: () => void,
  ) => {
    setResult(null);

    startTransition(async () => {
      const actionResult = await action();
      setResult(actionResult);

      if (actionResult.status === "saved") {
        onSnapshot(actionResult.organization);
        onSaved?.();
      }
    });
  };

  const createTag = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tagName.trim()) {
      return;
    }

    runAction(
      () => createContactTagAction(tagName),
      () => setTagName(""),
    );
  };

  const createList = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!listName.trim()) {
      return;
    }

    runAction(
      () => createContactListAction(listName),
      () => setListName(""),
    );
  };

  const toggleTag = (tagId: number, assigned: boolean) => {
    if (numericContactId === null) {
      return;
    }

    runAction(() =>
      setContactTagAssignmentAction({
        contactId: numericContactId,
        groupId: tagId,
        assigned,
      }),
    );
  };

  const toggleList = (listId: number, assigned: boolean) => {
    if (numericContactId === null) {
      return;
    }

    runAction(() =>
      setContactListMembershipAction({
        contactId: numericContactId,
        groupId: listId,
        assigned,
      }),
    );
  };

  return (
    <section className="card contact-organization-card">
      <div className="card-header">
        <div>
          <span className="card-kicker">Tags and lists</span>
          <h2>ארגון אנשי קשר</h2>
        </div>
        <span className="status-pill success">הסרה גלובלית</span>
      </div>

      <p className="form-explanation">
        תגיות ורשימות מארגנות קהלים בלבד. הן אינן יכולות לעקוף הסרה:
        איש קשר חסום נשאר חסום בכל הרשימות.
      </p>

      {!enabled ? (
        <div className="inline-notice warning" role="status">
          <span aria-hidden="true">i</span>
          <p>נדרשים Clerk ו־Tenant פעיל כדי לשמור תגיות ורשימות.</p>
        </div>
      ) : (
        <>
          <div className="contact-group-create-grid">
            <form onSubmit={createTag}>
              <label>
                <span>שם תגית</span>
                <input
                  value={tagName}
                  onChange={(event) => setTagName(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="secondary-button"
                disabled={isPending || !tagName.trim()}
              >
                יצירת תגית
              </button>
            </form>

            <form onSubmit={createList}>
              <label>
                <span>שם רשימה</span>
                <input
                  value={listName}
                  onChange={(event) => setListName(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="secondary-button"
                disabled={isPending || !listName.trim()}
              >
                יצירת רשימה
              </button>
            </form>
          </div>

          <label className="contact-group-contact-picker">
            <span>איש קשר לניהול שיוכים</span>
            <select
              value={selectedContactId}
              onChange={(event) =>
                setSelectedContactId(event.target.value)
              }
            >
              <option value="">בחירת איש קשר</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={String(contact.id)}>
                  {contactOptionLabel(contact)}
                </option>
              ))}
            </select>
          </label>

          <div className="contact-group-columns">
            <ContactGroupColumn
              title="תגיות"
              emptyMessage="לא נוצרו תגיות."
              groups={organization.tags}
              disabled={numericContactId === null || isPending}
              isAssigned={(groupId) =>
                numericContactId !== null &&
                organization.tagAssignments.some(
                  (assignment) =>
                    assignment.contactId === numericContactId &&
                    assignment.tagId === groupId,
                )
              }
              onToggle={toggleTag}
            />
            <ContactGroupColumn
              title="רשימות"
              emptyMessage="לא נוצרו רשימות."
              groups={organization.lists}
              disabled={numericContactId === null || isPending}
              isAssigned={(groupId) =>
                numericContactId !== null &&
                organization.listMemberships.some(
                  (membership) =>
                    membership.contactId === numericContactId &&
                    membership.listId === groupId,
                )
              }
              onToggle={toggleList}
            />
          </div>

          <ContactOrganizationFeedback result={result} />
        </>
      )}
    </section>
  );
}

function ContactGroupColumn({
  title,
  emptyMessage,
  groups,
  disabled,
  isAssigned,
  onToggle,
}: {
  title: string;
  emptyMessage: string;
  groups: ContactOrganizationSnapshot["tags"];
  disabled: boolean;
  isAssigned: (groupId: number) => boolean;
  onToggle: (groupId: number, assigned: boolean) => void;
}) {
  return (
    <div className="contact-group-column">
      <strong>{title}</strong>
      {groups.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <div className="contact-group-list">
          {groups.map((group) => {
            const assigned = isAssigned(group.id);

            return (
              <button
                type="button"
                className={assigned ? "assigned" : ""}
                disabled={disabled}
                onClick={() => onToggle(group.id, !assigned)}
                key={group.id}
              >
                <span>{group.name}</span>
                <small>{group.contactCount} אנשי קשר</small>
                <b>{assigned ? "משויך" : "שיוך"}</b>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContactOrganizationFeedback({
  result,
}: {
  result: ContactOrganizationActionResult | null;
}) {
  if (!result) {
    return null;
  }

  if (result.status === "saved") {
    return (
      <div className="inline-notice success" role="status">
        <span aria-hidden="true">✓</span>
        <p>השינוי נשמר עבור ה־Tenant המאומת.</p>
      </div>
    );
  }

  const message =
    result.status === "validation-error"
      ? "שם הקבוצה או השיוך אינם תקינים."
      : result.status === "configuration-required"
        ? "חיבור Clerk אינו מוגדר."
        : result.status === "unauthenticated"
          ? "ה־Session אינו פעיל. יש להתחבר מחדש."
          : result.status === "onboarding-required"
            ? "יש להשלים תחילה את יצירת סביבת העבודה."
            : result.status === "tenant-selection-required"
              ? "נדרשת בחירת Tenant מפורשת."
              : result.status === "permission-denied"
                ? "לתפקיד הנוכחי אין הרשאה לשנות קבוצות."
                : result.status === "not-found"
                  ? "איש הקשר או הקבוצה אינם שייכים ל־Tenant."
                  : "השינוי נכשל בשרת.";

  return (
    <div className="inline-notice danger" role="alert">
      <span aria-hidden="true">!</span>
      <p>{message}</p>
    </div>
  );
}

function contactOptionLabel(contact: ContactRecord): string {
  const name = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

  return name ? `${name} · ${contact.phoneNumber}` : contact.phoneNumber;
}
