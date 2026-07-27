import type {
  SystemAdminTenantDirectoryPage,
} from "../../shared/domain/systemAdminTenantDirectory.ts";

export type SystemAdminTenantDirectoryActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "permission-denied" }
  | { status: "invalid-input" }
  | { status: "server-error" };

export type SystemAdminTenantDirectoryActionResult =
  | {
      status: "loaded";
      directory:
        SystemAdminTenantDirectoryPage;
    }
  | SystemAdminTenantDirectoryActionFailure;
