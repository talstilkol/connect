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
  role: TenantRole;
  currentUser: boolean;
}

export interface TeamDirectoryView {
  members:
    readonly TeamMemberView[];
}
