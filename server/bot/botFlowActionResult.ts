import type {
  BotFlowDefinitionIssue,
} from "../../shared/validation/botFlowDefinition.ts";
import type {
  BotFlowDetailsView,
  BotFlowSummaryView,
  BotFlowVersionView,
} from "../../shared/domain/botFlowView.ts";

export type BotFlowActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | {
      status: "validation-error";
      issues: readonly BotFlowDefinitionIssue[];
    }
  | { status: "invalid-input" }
  | { status: "not-found" }
  | { status: "state-conflict" }
  | { status: "invalid-state" }
  | { status: "server-error" };

export type LoadBotFlowDetailsActionResult =
  | {
      status: "loaded";
      botFlow: BotFlowDetailsView;
    }
  | BotFlowActionFailure;

export type SaveBotFlowDraftActionResult =
  | {
      status: "saved";
      outcome:
        | "created"
        | "updated"
        | "unchanged";
      flow: BotFlowSummaryView;
      draftVersion: BotFlowVersionView;
    }
  | BotFlowActionFailure;

export type PublishBotFlowDraftActionResult =
  | {
      status: "published";
      outcome: "updated" | "unchanged";
      flow: BotFlowSummaryView;
      publishedVersion: BotFlowVersionView;
    }
  | BotFlowActionFailure;
