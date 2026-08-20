"use server";

import {
  ContactNotFoundError,
  createContactConsentRepository,
} from "../../db/contactConsentRepository.ts";
import { createContactRepository } from "../../db/contactRepository.ts";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase.ts";
import { inspectClerkConfiguration } from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import { TenantSessionError } from "../auth/tenantSession.ts";
import {
  ContactConsentInputError,
  ContactInputError,
  createContactService,
} from "./contactService.ts";
import {
  createCurrentRailwayContactDirectoryHandler,
} from "./currentRailwayContactDirectoryHandler.ts";
import { toContactRecord } from "./contactRecordMapper.ts";
import type {
  ContactActionFailure,
  ContactConsentActionResult,
  LoadMoreContactsActionResult,
  SaveContactActionResult,
} from "./contactActionResult.ts";

export type {
  ContactConsentActionResult,
  LoadMoreContactsActionResult,
  SaveContactActionResult,
} from "./contactActionResult.ts";

async function createActionContext() {
  const database = await requireRuntimeDatabase();
  const session = await requireCurrentTenantMutationSession(database);
  const contacts = createContactRepository(database);
  const consentEvents = createContactConsentRepository(database);

  return {
    session,
    service: createContactService({
      contacts,
      consentEvents,
    }),
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
      await createActionContext();
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
  try {
    return await createCurrentRailwayContactDirectoryHandler().load(
      beforeContactId,
    );
  } catch {
    return { status: "server-error" };
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
      await createActionContext();
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
