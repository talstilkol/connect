import type {
  TenantRole,
} from "./model.ts";

export type TeamDirectoryStatus =
  | "ready"
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "server-error";

export interface TeamMemberView {
  memberKey: string;
  referenceCode: string;
  displayName: string | null;
  primaryEmail: string | null;
  role: TenantRole;
  version: number;
  currentUser: boolean;
}

export interface TeamDirectoryView {
  identityStatus:
    | "ready"
    | "unavailable";
  members:
    readonly TeamMemberView[];
}
