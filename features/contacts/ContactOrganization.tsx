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
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  createContactListAction,
  createContactTagAction,
  setContactListMembershipAction,
  setContactTagAssignmentAction,
  type ContactOrganizationActionResult,
} from "../../server/contacts/contactOrganizationActions";
import {
  readContactDirectoryMessages,
  type ContactDirectoryMessages,
} from "./contactDirectoryMessages";

export function ContactOrganization({
  enabled,
  language,
  contacts,
  organization,
  onSnapshot,
}: {
  enabled: boolean;
  language: InterfaceLanguage;
  contacts: readonly ContactRecord[];
  organization: ContactOrganizationSnapshot;
  onSnapshot: (snapshot: ContactOrganizationSnapshot) => void;
}) {
  const messages = readContactDirectoryMessages(language).organization;
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
          <span className="card-kicker">{messages.kicker}</span>
          <h2>{messages.title}</h2>
        </div>
        <span className="status-pill success">
          {messages.globalUnsubscribe}
        </span>
      </div>

      <p className="form-explanation">
        {messages.explanation}
      </p>

      {!enabled ? (
        <div className="inline-notice warning" role="status">
          <span aria-hidden="true">i</span>
          <p>{messages.disabledNotice}</p>
        </div>
      ) : (
        <>
          <div className="contact-group-create-grid">
            <form onSubmit={createTag}>
              <label>
                <span>{messages.tagName}</span>
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
                {messages.createTag}
              </button>
            </form>

            <form onSubmit={createList}>
              <label>
                <span>{messages.listName}</span>
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
                {messages.createList}
              </button>
            </form>
          </div>

          <label className="contact-group-contact-picker">
            <span>{messages.contactPicker}</span>
            <select
              value={selectedContactId}
              onChange={(event) =>
                setSelectedContactId(event.target.value)
              }
            >
              <option value="">{messages.chooseContact}</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={String(contact.id)}>
                  {contactOptionLabel(contact)}
                </option>
              ))}
            </select>
          </label>

          <div className="contact-group-columns">
            <ContactGroupColumn
              title={messages.tags}
              emptyMessage={messages.noTags}
              contactCount={messages.contactCount}
              assignedLabel={messages.assigned}
              assignLabel={messages.assign}
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
              title={messages.lists}
              emptyMessage={messages.noLists}
              contactCount={messages.contactCount}
              assignedLabel={messages.assigned}
              assignLabel={messages.assign}
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

          <ContactOrganizationFeedback
            messages={messages}
            result={result}
          />
        </>
      )}
    </section>
  );
}

function ContactGroupColumn({
  title,
  emptyMessage,
  contactCount,
  assignedLabel,
  assignLabel,
  groups,
  disabled,
  isAssigned,
  onToggle,
}: {
  title: string;
  emptyMessage: string;
  contactCount: (count: number) => string;
  assignedLabel: string;
  assignLabel: string;
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
                <small>{contactCount(group.contactCount)}</small>
                <b>{assigned ? assignedLabel : assignLabel}</b>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContactOrganizationFeedback({
  messages,
  result,
}: {
  messages: ContactDirectoryMessages["organization"];
  result: ContactOrganizationActionResult | null;
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

function contactOptionLabel(contact: ContactRecord): string {
  const name = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");

  return name ? `${name} · ${contact.phoneNumber}` : contact.phoneNumber;
}
