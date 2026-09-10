import type {
  ContactOrganizationRepository,
} from "../../db/contactOrganizationRepository";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";

export type ContactOrganizationInputIssue =
  | "invalid-name"
  | "invalid-contact-ids"
  | "invalid-assignment";

export class ContactOrganizationInputError extends Error {
  readonly issue: ContactOrganizationInputIssue;

  constructor(issue: ContactOrganizationInputIssue) {
    super(`Contact organization input failed: ${issue}`);
    this.name = "ContactOrganizationInputError";
    this.issue = issue;
  }
}

export interface ContactOrganizationService {
  read(
    session: TenantSession,
    contactIds: unknown,
  ): Promise<ContactOrganizationSnapshot>;
  createTag(
    session: TenantSession,
    name: unknown,
  ): Promise<ContactOrganizationSnapshot>;
  createList(
    session: TenantSession,
    name: unknown,
  ): Promise<ContactOrganizationSnapshot>;
  setTagAssignment(
    session: TenantSession,
    input: unknown,
  ): Promise<ContactOrganizationSnapshot>;
  setListMembership(
    session: TenantSession,
    input: unknown,
  ): Promise<ContactOrganizationSnapshot>;
}

export interface ContactOrganizationAssignmentInput {
  contactId: number;
  groupId: number;
  assigned: boolean;
}

export interface ContactOrganizationNameInput {
  name: string;
  normalizedName: string;
}

const maximumGroupNameLength = 128;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function parseContactIds(input: unknown): number[] {
  if (!Array.isArray(input) || input.length > 50) {
    throw new ContactOrganizationInputError("invalid-contact-ids");
  }

  const contactIds: number[] = [];

  for (const value of input) {
    if (!Number.isSafeInteger(value) || Number(value) <= 0) {
      throw new ContactOrganizationInputError("invalid-contact-ids");
    }

    contactIds.push(Number(value));
  }

  return [...new Set(contactIds)];
}

export function parseContactOrganizationName(
  input: unknown,
): Readonly<ContactOrganizationNameInput> {
  if (typeof input !== "string") {
    throw new ContactOrganizationInputError("invalid-name");
  }

  const name = input.trim();

  if (
    name.length === 0 ||
    name.length > maximumGroupNameLength ||
    controlCharacterPattern.test(name)
  ) {
    throw new ContactOrganizationInputError("invalid-name");
  }

  return Object.freeze({
    name,
    normalizedName: name.toLowerCase(),
  });
}

export function parseContactOrganizationAssignment(
  input: unknown,
): Readonly<ContactOrganizationAssignmentInput> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join(",") !==
      "assigned,contactId,groupId" ||
    !("contactId" in input) ||
    !("groupId" in input) ||
    !("assigned" in input) ||
    !Number.isSafeInteger(input.contactId) ||
    Number(input.contactId) <= 0 ||
    !Number.isSafeInteger(input.groupId) ||
    Number(input.groupId) <= 0 ||
    typeof input.assigned !== "boolean"
  ) {
    throw new ContactOrganizationInputError("invalid-assignment");
  }

  return Object.freeze({
    contactId: Number(input.contactId),
    groupId: Number(input.groupId),
    assigned: input.assigned,
  });
}

export function createContactOrganizationService(
  repository: ContactOrganizationRepository,
): ContactOrganizationService {
  return {
    read(session, contactIds) {
      requireTenantPermission(session, "contacts.read");
      return repository.readSnapshot(
        session.tenantId,
        parseContactIds(contactIds),
      );
    },

    async createTag(session, nameInput) {
      requireTenantPermission(session, "contacts.write");
      const name = parseContactOrganizationName(nameInput);
      await repository.saveTag(
        session.tenantId,
        name.name,
        name.normalizedName,
      );
      return repository.readSnapshot(session.tenantId, []);
    },

    async createList(session, nameInput) {
      requireTenantPermission(session, "contacts.write");
      const name = parseContactOrganizationName(nameInput);
      await repository.saveList(
        session.tenantId,
        name.name,
        name.normalizedName,
      );
      return repository.readSnapshot(session.tenantId, []);
    },

    async setTagAssignment(session, input) {
      requireTenantPermission(session, "contacts.write");
      const assignment = parseContactOrganizationAssignment(input);
      await repository.setTagAssignment(
        session.tenantId,
        assignment.contactId,
        assignment.groupId,
        assignment.assigned,
      );
      return repository.readSnapshot(session.tenantId, [
        assignment.contactId,
      ]);
    },

    async setListMembership(session, input) {
      requireTenantPermission(session, "contacts.write");
      const assignment = parseContactOrganizationAssignment(input);
      await repository.setListMembership(
        session.tenantId,
        assignment.contactId,
        assignment.groupId,
        assignment.assigned,
      );
      return repository.readSnapshot(session.tenantId, [
        assignment.contactId,
      ]);
    },
  };
}
