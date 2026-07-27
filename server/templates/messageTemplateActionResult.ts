import type {
  MessageTemplateView,
} from "../../shared/domain/messageTemplateView.ts";
import type {
  MessageTemplateDraftIssue,
} from "../../shared/validation/messageTemplateDraft.ts";

export type MessageTemplateActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | { status: "server-error" };

export type SaveMessageTemplateDraftActionResult =
  | {
      status: "saved";
      template: MessageTemplateView;
    }
  | {
      status: "validation-error";
      issues: readonly MessageTemplateDraftIssue[];
    }
  | { status: "not-editable" }
  | MessageTemplateActionFailure;

export type SubmitMessageTemplateActionResult =
  | {
      status: "submitted";
      template: MessageTemplateView;
    }
  | { status: "invalid-input" }
  | { status: "not-found" }
  | { status: "not-editable" }
  | { status: "meta-not-connected" }
  | { status: "meta-configuration-required" }
  | { status: "meta-configuration-invalid" }
  | { status: "credential-unavailable" }
  | { status: "state-conflict" }
  | { status: "submission-rejected" }
  | { status: "submission-uncertain" }
  | MessageTemplateActionFailure;

export interface MessageTemplateSyncActionSummary {
  received: number;
  eligible: number;
  updated: number;
  unchanged: number;
  stale: number;
  unmatched: number;
  unsupported: number;
  observedAt: string;
}

export type SyncMessageTemplatesActionResult =
  | {
      status: "synced";
      templates: readonly MessageTemplateView[];
      summary: MessageTemplateSyncActionSummary;
    }
  | { status: "meta-not-connected" }
  | { status: "meta-configuration-required" }
  | { status: "meta-configuration-invalid" }
  | { status: "credential-unavailable" }
  | { status: "identity-conflict" }
  | { status: "sync-failed" }
  | MessageTemplateActionFailure;
