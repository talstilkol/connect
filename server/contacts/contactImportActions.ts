"use server";

import {
  createContactImportRepository,
} from "../../db/contactImportRepository.ts";
import { createContactRepository } from "../../db/contactRepository.ts";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase.ts";
import type {
  ContactImportJobSummary,
} from "../../shared/domain/contactImportJob";
import type { ContactRecord } from "../../shared/domain/contactRecord";
import { inspectClerkConfiguration } from "../auth/clerkConfiguration.ts";
import {
  requireCurrentTenantMutationSession,
} from "../auth/currentTenantMutationSession.ts";
import { TenantSessionError } from "../auth/tenantSession.ts";
import {
  ContactImportInputError,
  ContactImportJobConflictError,
  ContactImportJobNotFoundError,
  createContactImportService,
  type ContactImportInputIssue,
} from "./contactImportService.ts";
import { toContactRecord } from "./contactRecordMapper.ts";

type ContactImportActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | { status: "not-found" }
  | { status: "conflict" }
  | { status: "server-error" };

export type StartContactImportActionResult =
  | {
      status: "ready";
      job: ContactImportJobSummary;
    }
  | {
      status: "validation-error";
      issue: ContactImportInputIssue;
    }
  | ContactImportActionFailure;

export type ProcessContactImportChunkActionResult =
  | {
      status: "processed";
      job: ContactImportJobSummary;
      contacts: readonly ContactRecord[];
    }
  | {
      status: "validation-error";
      issue: ContactImportInputIssue;
    }
  | ContactImportActionFailure;

async function createActionContext() {
  const database = await requireRuntimeDatabase();
  const session =
    await requireCurrentTenantMutationSession(
      database,
    );
  const contacts = createContactRepository(database);
  const imports = createContactImportRepository(database);

  return {
    session,
    service: createContactImportService({
      contacts,
      imports,
    }),
  };
}

function mapFailure(error: unknown): ContactImportActionFailure {
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

  if (error instanceof ContactImportJobNotFoundError) {
    return { status: "not-found" };
  }

  if (error instanceof ContactImportJobConflictError) {
    return { status: "conflict" };
  }

  return { status: "server-error" };
}

export async function startContactImportAction(
  input: unknown,
): Promise<StartContactImportActionResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    const { session, service } = await createActionContext();
    const job = await service.start(session, input);

    return {
      status: "ready",
      job,
    };
  } catch (error) {
    if (error instanceof ContactImportInputError) {
      return {
        status: "validation-error",
        issue: error.issue,
      };
    }

    return mapFailure(error);
  }
}

export async function processContactImportChunkAction(
  input: unknown,
): Promise<ProcessContactImportChunkActionResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return { status: "configuration-required" };
  }

  try {
    const { session, service } = await createActionContext();
    const result = await service.processChunk(session, input);

    return {
      status: "processed",
      job: result.job,
      contacts: result.contacts.map(toContactRecord),
    };
  } catch (error) {
    if (error instanceof ContactImportInputError) {
      return {
        status: "validation-error",
        issue: error.issue,
      };
    }

    return mapFailure(error);
  }
}
