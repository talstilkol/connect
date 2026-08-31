import type {
  TenantSelectionDirectory,
  TenantSelectionInputIssue,
} from "./tenantSelectionService.ts";

export type TenantSelectionActionFailure =
  | Readonly<{ status: "configuration-required" }>
  | Readonly<{ status: "unauthenticated" }>
  | Readonly<{ status: "onboarding-required" }>
  | Readonly<{ status: "selection-required" }>
  | Readonly<{ status: "conflict" }>
  | Readonly<{ status: "rate-limited" }>
  | Readonly<{ status: "temporarily-unavailable" }>
  | Readonly<{ status: "server-error" }>;

export type LoadTenantSelectionActionResult =
  | Readonly<{
      status: "ready";
      directory: Readonly<TenantSelectionDirectory>;
    }>
  | TenantSelectionActionFailure;

export type SelectTenantActionResult =
  | Readonly<{
      status: "selected";
      version: number;
      unchanged: boolean;
    }>
  | Readonly<{
      status: "validation-error";
      issue: TenantSelectionInputIssue;
    }>
  | TenantSelectionActionFailure;
