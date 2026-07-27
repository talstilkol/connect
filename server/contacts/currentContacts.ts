import { createContactConsentRepository } from "../../db/contactConsentRepository";
import { createContactOrganizationRepository } from "../../db/contactOrganizationRepository";
import { createContactRepository } from "../../db/contactRepository";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase";
import type { ContactRecord } from "../../shared/domain/contactRecord";
import {
  emptyContactOrganizationSnapshot,
  type ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization";
import { inspectClerkConfiguration } from "../auth/clerkConfiguration";
import { requireCurrentTenantSession } from "../auth/currentTenantSession";
import { TenantSessionError } from "../auth/tenantSession";
import { createContactService } from "./contactService";
import { createContactOrganizationService } from "./contactOrganizationService";
import { toContactRecord } from "./contactRecordMapper";

export type CurrentContactsResult =
  | {
      status: "ready";
      contacts: readonly ContactRecord[];
      nextCursor: number | null;
      organization: ContactOrganizationSnapshot;
    }
  | {
      status:
        | "configuration-required"
        | "onboarding-required"
        | "tenant-selection-required"
        | "server-error";
      contacts: readonly [];
      nextCursor: null;
      organization: typeof emptyContactOrganizationSnapshot;
    };

export async function readCurrentContacts(): Promise<CurrentContactsResult> {
  if (inspectClerkConfiguration().status !== "configured") {
    return {
      status: "configuration-required",
      contacts: [],
      nextCursor: null,
      organization: emptyContactOrganizationSnapshot,
    };
  }

  try {
    const database = await requireRuntimeDatabase();
    const session = await requireCurrentTenantSession(database);
    const contacts = createContactRepository(database);
    const service = createContactService({
      contacts,
      consentEvents: createContactConsentRepository(database),
    });
    const page = await service.list(session);
    const organizationService = createContactOrganizationService(
      createContactOrganizationRepository(database),
    );
    const organization = await organizationService.read(
      session,
      page.contacts.map((contact) => contact.id),
    );

    return {
      status: "ready",
      contacts: page.contacts.map(toContactRecord),
      nextCursor: page.nextCursor,
      organization,
    };
  } catch (error) {
    if (error instanceof TenantSessionError) {
      if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
        return {
          status: "onboarding-required",
          contacts: [],
          nextCursor: null,
          organization: emptyContactOrganizationSnapshot,
        };
      }

      if (error.code === "TENANT_SELECTION_REQUIRED") {
        return {
          status: "tenant-selection-required",
          contacts: [],
          nextCursor: null,
          organization: emptyContactOrganizationSnapshot,
        };
      }
    }

    return {
      status: "server-error",
      contacts: [],
      nextCursor: null,
      organization: emptyContactOrganizationSnapshot,
    };
  }
}
