import type { ContactRecord } from "../../shared/domain/contactRecord";
import {
  emptyContactOrganizationSnapshot,
  type ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization";
import {
  createCurrentRailwayContactDirectoryHandler,
} from "./currentRailwayContactDirectoryHandler.ts";

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
  try {
    return await createCurrentRailwayContactDirectoryHandler().read();
  } catch {
    return {
      status: "server-error",
      contacts: [],
      nextCursor: null,
      organization: emptyContactOrganizationSnapshot,
    };
  }
}
