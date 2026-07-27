import type {
  ContactConsentRepository,
} from "../../db/contactConsentRepository";
import type {
  ContactRepository,
  PersistedContact,
} from "../../db/contactRepository";
import type {
  ContactConsentEventType,
  ContactConsentValidationIssue,
} from "../../shared/validation/contactConsent";
import {
  validateContactConsentTransition,
} from "../../shared/validation/contactConsent.ts";
import type {
  PersistedContactValidationIssue,
} from "../../shared/validation/persistedContact";
import {
  validatePersistedContact,
} from "../../shared/validation/persistedContact.ts";
import {
  CONTACT_PAGE_SIZE,
} from "../../shared/domain/contactRecord.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveContactConsentEventKey,
} from "./contactConsentEventKey.ts";

export class ContactInputError extends Error {
  readonly issues: readonly PersistedContactValidationIssue[];

  constructor(issues: readonly PersistedContactValidationIssue[]) {
    super("Contact validation failed");
    this.name = "ContactInputError";
    this.issues = issues;
  }
}

export class ContactConsentInputError extends Error {
  readonly issues: readonly ContactConsentValidationIssue[];

  constructor(issues: readonly ContactConsentValidationIssue[]) {
    super("Contact consent validation failed");
    this.name = "ContactConsentInputError";
    this.issues = issues;
  }
}

export class ContactCursorInputError extends Error {
  constructor() {
    super("Contact cursor must be a positive integer or null");
    this.name = "ContactCursorInputError";
  }
}

export interface PersistedContactPage {
  contacts: readonly PersistedContact[];
  nextCursor: number | null;
}

export interface ContactService {
  list(
    session: TenantSession,
    beforeContactId?: unknown,
  ): Promise<PersistedContactPage>;
  saveProfile(
    session: TenantSession,
    input: unknown,
  ): Promise<PersistedContact>;
  grantConsent(
    session: TenantSession,
    contactId: number,
    input: unknown,
  ): Promise<PersistedContact>;
  unsubscribe(
    session: TenantSession,
    contactId: number,
    input: unknown,
  ): Promise<PersistedContact>;
}

export interface ContactServiceDependencies {
  contacts: ContactRepository;
  consentEvents: ContactConsentRepository;
}

function assertContactId(contactId: number): void {
  if (!Number.isSafeInteger(contactId) || contactId <= 0) {
    throw new Error("contactId must be a positive integer");
  }
}

function parseContactCursor(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new ContactCursorInputError();
  }

  return Number(value);
}

async function recordConsentTransition(
  dependencies: ContactServiceDependencies,
  session: TenantSession,
  contactId: number,
  eventType: ContactConsentEventType,
  input: unknown,
): Promise<PersistedContact> {
  requireTenantPermission(session, "contacts.write");
  assertContactId(contactId);

  const validation = validateContactConsentTransition(input);

  if (!validation.success) {
    throw new ContactConsentInputError(validation.issues);
  }

  const eventKeyInput = {
    tenantId: session.tenantId,
    contactId,
    eventType,
    ...validation.value,
    actorExternalUserId: session.externalUserId,
  };
  const idempotencyKey =
    await deriveContactConsentEventKey(eventKeyInput);

  return dependencies.consentEvents.recordEvent({
    ...eventKeyInput,
    idempotencyKey,
  });
}

export function createContactService(
  dependencies: ContactServiceDependencies,
): ContactService {
  return {
    async list(session, beforeContactId) {
      requireTenantPermission(session, "contacts.read");
      const cursor = parseContactCursor(beforeContactId);
      const contacts = await dependencies.contacts.listPageByTenant(
        session.tenantId,
        cursor,
        CONTACT_PAGE_SIZE + 1,
      );
      const hasMore = contacts.length > CONTACT_PAGE_SIZE;
      const pageContacts = hasMore
        ? contacts.slice(0, CONTACT_PAGE_SIZE)
        : contacts;

      return {
        contacts: pageContacts,
        nextCursor: hasMore
          ? pageContacts[pageContacts.length - 1]?.id ?? null
          : null,
      };
    },

    async saveProfile(session, input) {
      requireTenantPermission(session, "contacts.write");

      const validation = validatePersistedContact(input);

      if (!validation.success) {
        throw new ContactInputError(validation.issues);
      }

      return dependencies.contacts.saveProfile({
        tenantId: session.tenantId,
        ...validation.value,
      });
    },

    grantConsent(session, contactId, input) {
      return recordConsentTransition(
        dependencies,
        session,
        contactId,
        "granted",
        input,
      );
    },

    unsubscribe(session, contactId, input) {
      return recordConsentTransition(
        dependencies,
        session,
        contactId,
        "unsubscribed",
        input,
      );
    },
  };
}
