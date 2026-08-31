import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization.ts";
import type {
  ContactOrganizationInputIssue,
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
  | Readonly<{
      status: "saved";
      organization: Readonly<ContactOrganizationSnapshot>;
    }>
  | Readonly<{
      status: "validation-error";
      issue: ContactOrganizationInputIssue;
    }>
  | ContactOrganizationActionFailure;
