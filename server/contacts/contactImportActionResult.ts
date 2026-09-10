import type { ContactImportJobSummary } from "../../shared/domain/contactImportJob.ts";
import type { ContactRecord } from "../../shared/domain/contactRecord.ts";
import type { ContactImportInputIssue } from "./contactImportService.ts";

export type ContactImportActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | { status: "not-found" }
  | { status: "conflict" }
  | { status: "server-error" };

export type StartContactImportActionResult =
  | { status: "ready"; job: ContactImportJobSummary }
  | { status: "validation-error"; issue: ContactImportInputIssue }
  | ContactImportActionFailure;

export type ProcessContactImportChunkActionResult =
  | {
      status: "processed";
      job: ContactImportJobSummary;
      contacts: readonly ContactRecord[];
    }
  | { status: "validation-error"; issue: ContactImportInputIssue }
  | ContactImportActionFailure;
