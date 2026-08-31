import type { ContactRecord } from "../../shared/domain/contactRecord.ts";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization.ts";
import type {
  ContactConsentValidationIssue,
} from "../../shared/validation/contactConsent.ts";
import type {
  PersistedContactValidationIssue,
} from "../../shared/validation/persistedContact.ts";

export type ContactActionFailure =
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
