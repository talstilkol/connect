import type {
  TenantSubscriptionAdminView,
} from "../../shared/domain/tenantSubscriptionAdminView.ts";

export type SystemAdminSubscriptionActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "permission-denied" }
  | { status: "invalid-input" }
  | { status: "not-found" }
  | { status: "conflict" }
  | { status: "invalid-transition" }
  | { status: "server-error" };

export type SystemAdminSubscriptionActionResult =
  | {
      status: "saved";
      outcome:
        | "created"
        | "updated"
        | "unchanged";
      subscription:
        TenantSubscriptionAdminView;
    }
  | SystemAdminSubscriptionActionFailure;
