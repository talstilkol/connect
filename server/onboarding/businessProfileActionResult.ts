import type {
  BusinessProfileSaveView,
  BusinessProfileView,
} from "../../shared/domain/businessProfileView.ts";
import type {
  BusinessProfileValidationIssue,
} from "../../shared/validation/persistedBusinessProfile.ts";

export type LoadBusinessProfileActionResult =
  | Readonly<{
      status: "loaded";
      profile: Readonly<BusinessProfileView> | null;
    }>
  | Readonly<{
      status:
        | "configuration-required"
        | "unauthenticated"
        | "tenant-selection-required"
        | "permission-denied"
        | "server-error";
    }>;

export type SaveBusinessProfileActionResult =
  | Readonly<{
      status: "saved";
      profile: Readonly<BusinessProfileSaveView["profile"]>;
      createdTenant: boolean;
    }>
  | Readonly<{ status: "configuration-required" }>
  | Readonly<{ status: "unauthenticated" }>
  | Readonly<{
      status: "validation-error";
      issues: readonly BusinessProfileValidationIssue[];
    }>
  | Readonly<{ status: "tenant-selection-required" }>
  | Readonly<{ status: "permission-denied" }>
  | Readonly<{ status: "server-error" }>;
