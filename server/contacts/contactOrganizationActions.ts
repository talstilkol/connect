"use server";

import {
  createCurrentRailwayContactOrganizationHandler,
} from "./currentRailwayContactOrganizationHandler.ts";
import type {
  ContactOrganizationActionResult,
} from "./contactOrganizationActionResult.ts";

export type {
  ContactOrganizationActionResult,
} from "./contactOrganizationActionResult.ts";

export async function createContactTagAction(
  name: unknown,
): Promise<ContactOrganizationActionResult> {
  return createCurrentRailwayContactOrganizationHandler().saveTag(name);
}

export async function createContactListAction(
  name: unknown,
): Promise<ContactOrganizationActionResult> {
  return createCurrentRailwayContactOrganizationHandler().saveList(name);
}

export async function setContactTagAssignmentAction(
  input: unknown,
): Promise<ContactOrganizationActionResult> {
  return createCurrentRailwayContactOrganizationHandler()
    .setTagAssignment(input);
}

export async function setContactListMembershipAction(
  input: unknown,
): Promise<ContactOrganizationActionResult> {
  return createCurrentRailwayContactOrganizationHandler()
    .setListMembership(input);
}
