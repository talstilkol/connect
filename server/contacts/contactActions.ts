"use server";

import {
  ContactNotFoundError,
  createContactConsentRepository,
} from "../../db/contactConsentRepository.ts";
import {
  createContactOrganizationRepository,
} from "../../db/contactOrganizationRepository.ts";
import { createContactRepository } from "../../db/contactRepository.ts";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase.ts";
import type { ContactRecord } from "../../shared/domain/contactRecord";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization";
import type {
  ContactConsentValidationIssue,
} from "../../shared/validation/contactConsent";
import type {
  PersistedContactValidationIssue,
} from "../../shared/validation/persistedContact";
import { inspectClerkConfiguration } from "../auth/clerkConfiguration.ts";
import { requireCurrentTenantSession } from "../auth/currentTenantSession.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import { TenantSessionError } from "../auth/tenantSession.ts";
import {
  ContactConsentInputError,
  ContactCursorInputError,
  ContactInputError,
  createContactService,
} from "./contactService.ts";
import {
  createContactOrganizationService,
} from "./contactOrganizationService.ts";
import { toContactRecord } from "./contactRecordMapper.ts";

type ContactActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | { status: "not-found" }
  | { status: "server-error" };

export type SaveContactActionResult =
  | {
      status: "saved";
      contact: ContactRecord;
    }
  | {
      status: "validation-error";
      issues: readonly PersistedContactValidationIssue[];
    }
  | ContactActionFailure;

export type ContactConsentActionResult =
  | {
      status: "saved";
      contact: ContactRecord;
    }
  | {
      status: "validation-error";
      issues: readonly ContactConsentValidationIssue[];
    }
  | ContactActionFailure;

export type LoadMoreContactsActionResult =
  | {
      status: "loaded";
      contacts: readonly ContactRecord[];
      nextCursor: number | null;
      organization: ContactOrganizationSnapshot;
    }
  | {
      status: "validation-error";
    }
  | ContactActionFailure;

async function createActionContext(
  mutation: boolean,
) {
  const database = await requireRuntimeDatabase();
  const session = mutation
    ? await requireCurrentTenantMutationSession(
        database,
      )
    : await requireCurrentTenantSession(database);
  const contacts = createContactRepository(database);
  const consentEvents = createContactConsentRepository(database);
  const organization = createContactOrganizationService(
    createContactOrganizationRepository(database),
  );

  return {
    session,
    service: createContactService({
      contacts,
      consentEvents,
    }),
    organization,
  };
}

function mapTenantSessionError(
  error: TenantSessionError,
): ContactActionFailure {
  if (error.code === "AUTHENTICATION_REQUIRED") {
    return { status: "unauthenticated" };
  }

  if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
    return { status: "onboarding-required" };
  }

  if (error.code === "TENANT_SELECTION_REQUIRED") {
    return { status: "tenant-selection-required" };
  }

  return { status: "permission-denied" };
}

function mapSharedFailure(error: unknown): ContactActionFailure {
  if (error instanceof TenantSessionError) {
    return mapTenantSessionError(error);
  }

  if (error instanceof ContactNotFoundError) {
    return { status: "not-found" };
  }

  return { status: "server-error" };
}

export async function saveContactAction(
  input: unknown,
): Promise<SaveContactActionResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    const { session, service } =
      await createActionContext(true);
    const contact = await service.saveProfile(session, input);

    return {
      status: "saved",
      contact: toContactRecord(contact),
    };
  } catch (error) {
    if (error instanceof ContactInputError) {
      return {
        status: "validation-error",
        issues: error.issues,
      };
    }

    return mapSharedFailure(error);
  }
}

export async function loadMoreContactsAction(
  beforeContactId: unknown,
): Promise<LoadMoreContactsActionResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    const { session, service, organization } =
      await createActionContext(false);
    const page = await service.list(session, beforeContactId);
    const organizationSnapshot = await organization.read(
      session,
      page.contacts.map((contact) => contact.id),
    );

    return {
      status: "loaded",
      contacts: page.contacts.map(toContactRecord),
      nextCursor: page.nextCursor,
      organization: organizationSnapshot,
    };
  } catch (error) {
    if (error instanceof ContactCursorInputError) {
      return { status: "validation-error" };
    }

    return mapSharedFailure(error);
  }
}

export async function grantContactConsentAction(
  contactId: number,
  input: unknown,
): Promise<ContactConsentActionResult> {
  return changeContactConsent(contactId, input, "grant");
}

export async function unsubscribeContactAction(
  contactId: number,
  input: unknown,
): Promise<ContactConsentActionResult> {
  return changeContactConsent(contactId, input, "unsubscribe");
}

async function changeContactConsent(
  contactId: number,
  input: unknown,
  action: "grant" | "unsubscribe",
): Promise<ContactConsentActionResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    const { session, service } =
      await createActionContext(true);
    const contact =
      action === "grant"
        ? await service.grantConsent(session, contactId, input)
        : await service.unsubscribe(session, contactId, input);

    return {
      status: "saved",
      contact: toContactRecord(contact),
    };
  } catch (error) {
    if (error instanceof ContactConsentInputError) {
      return {
        status: "validation-error",
        issues: error.issues,
      };
    }

    return mapSharedFailure(error);
  }
}
