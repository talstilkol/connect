import type {
  AiAgentActivationIssue,
} from "../../shared/domain/aiAgent.ts";
import type {
  AiAgentDetailsView,
  AiAgentSummaryView,
  AiAgentVersionView,
} from "../../shared/domain/aiAgentView.ts";
import type {
  AiAgentDefinitionIssue,
} from "../../shared/validation/aiAgentDefinition.ts";

export type AiAgentActionFailure =
  | { status: "configuration-required" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | {
      status: "validation-error";
      issues: readonly AiAgentDefinitionIssue[];
    }
  | {
      status: "activation-blocked";
      issues: readonly AiAgentActivationIssue[];
    }
  | { status: "invalid-input" }
  | { status: "not-found" }
  | { status: "state-conflict" }
  | { status: "invalid-state" }
  | { status: "server-error" };

export type LoadAiAgentDetailsActionResult =
  | {
      status: "loaded";
      aiAgent: AiAgentDetailsView;
    }
  | AiAgentActionFailure;

export type SaveAiAgentDraftActionResult =
  | {
      status: "saved";
      outcome:
        | "created"
        | "updated"
        | "unchanged";
      agent: AiAgentSummaryView;
      draftVersion: AiAgentVersionView;
    }
  | AiAgentActionFailure;

export type PublishAiAgentDraftActionResult =
  | {
      status: "published";
      outcome: "updated" | "unchanged";
      agent: AiAgentSummaryView;
      publishedVersion:
        AiAgentVersionView;
    }
  | AiAgentActionFailure;
