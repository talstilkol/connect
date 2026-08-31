"use server";

import {
  createCurrentRailwayContactConsentHandler,
} from "./currentRailwayContactConsentHandler.ts";
import {
  createCurrentRailwayContactDirectoryHandler,
} from "./currentRailwayContactDirectoryHandler.ts";
import {
  createCurrentRailwayContactMutationHandler,
} from "./currentRailwayContactMutationHandler.ts";
import type {
  ContactConsentActionResult,
  LoadMoreContactsActionResult,
  SaveContactActionResult,
} from "./contactActionResult.ts";

export type {
  ContactConsentActionResult,
  LoadMoreContactsActionResult,
  SaveContactActionResult,
} from "./contactActionResult.ts";

export async function saveContactAction(
  input: unknown,
): Promise<SaveContactActionResult> {
  try {
    return await createCurrentRailwayContactMutationHandler().save(input);
  } catch {
    return { status: "server-error" };
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
  try {
    const handler = createCurrentRailwayContactConsentHandler();

    return action === "grant"
      ? await handler.grant(contactId, input)
      : await handler.unsubscribe(contactId, input);
  } catch {
    return { status: "server-error" };
  }
}
