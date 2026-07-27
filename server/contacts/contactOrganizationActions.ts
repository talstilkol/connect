"use server";

import {
  ContactOrganizationTargetNotFoundError,
  createContactOrganizationRepository,
} from "../../db/contactOrganizationRepository.ts";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase.ts";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization";
import { inspectClerkConfiguration } from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import { TenantSessionError } from "../auth/tenantSession.ts";
import {
  ContactOrganizationInputError,
  createContactOrganizationService,
  type ContactOrganizationInputIssue,
} from "./contactOrganizationService.ts";

type ContactOrganizationActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | { status: "not-found" }
  | { status: "server-error" };

export type ContactOrganizationActionResult =
  | {
      status: "saved";
      organization: ContactOrganizationSnapshot;
    }
  | {
      status: "validation-error";
      issue: ContactOrganizationInputIssue;
    }
  | ContactOrganizationActionFailure;

async function createActionContext() {
  const database = await requireRuntimeDatabase();
  const session =
    await requireCurrentTenantMutationSession(
      database,
    );
  const service = createContactOrganizationService(
    createContactOrganizationRepository(database),
  );

  return {
    session,
    service,
  };
}

function mapFailure(
  error: unknown,
): ContactOrganizationActionFailure {
  if (error instanceof TenantSessionError) {
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

  if (error instanceof ContactOrganizationTargetNotFoundError) {
    return { status: "not-found" };
  }

  return { status: "server-error" };
}

async function runOrganizationAction(
  operation: (
    context: Awaited<ReturnType<typeof createActionContext>>,
  ) => Promise<ContactOrganizationSnapshot>,
): Promise<ContactOrganizationActionResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    const context = await createActionContext();
    const organization = await operation(context);

    return {
      status: "saved",
      organization,
    };
  } catch (error) {
    if (error instanceof ContactOrganizationInputError) {
      return {
        status: "validation-error",
        issue: error.issue,
      };
    }

    return mapFailure(error);
  }
}

export async function createContactTagAction(
  name: unknown,
): Promise<ContactOrganizationActionResult> {
  return runOrganizationAction(({ session, service }) =>
    service.createTag(session, name),
  );
}

export async function createContactListAction(
  name: unknown,
): Promise<ContactOrganizationActionResult> {
  return runOrganizationAction(({ session, service }) =>
    service.createList(session, name),
  );
}

export async function setContactTagAssignmentAction(
  input: unknown,
): Promise<ContactOrganizationActionResult> {
  return runOrganizationAction(({ session, service }) =>
    service.setTagAssignment(session, input),
  );
}

export async function setContactListMembershipAction(
  input: unknown,
): Promise<ContactOrganizationActionResult> {
  return runOrganizationAction(({ session, service }) =>
    service.setListMembership(session, input),
  );
}
