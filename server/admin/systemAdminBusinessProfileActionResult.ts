import type {
  SystemAdminBusinessProfileView,
} from "../../shared/domain/systemAdminBusinessProfile.ts";

export type SystemAdminBusinessProfileActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "permission-denied" }
  | { status: "invalid-input" }
  | { status: "not-found" }
  | { status: "conflict" }
  | { status: "server-error" };

export type SystemAdminBusinessProfileActionResult =
  | {
      status: "saved";
      outcome: "updated" | "unchanged";
      profile:
        SystemAdminBusinessProfileView;
    }
  | SystemAdminBusinessProfileActionFailure;
