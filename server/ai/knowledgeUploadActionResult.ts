import type {
  KnowledgeSourceView,
} from "../../shared/domain/aiAgentView.ts";

export type KnowledgeUploadActionFailure =
  | { status: "configuration-required" }
  | { status: "dependency-unavailable" }
  | { status: "unauthenticated" }
  | { status: "onboarding-required" }
  | { status: "tenant-selection-required" }
  | { status: "permission-denied" }
  | { status: "invalid-input" }
  | { status: "state-conflict" }
  | { status: "invalid-state" }
  | { status: "server-error" };

export type UploadKnowledgeSourceActionResult =
  | {
      status: "processing";
      outcome: "processing" | "unchanged";
      source: KnowledgeSourceView;
    }
  | {
      status: "rejected";
      stage: "policy" | "scanner";
      errorCode: string;
      source: KnowledgeSourceView | null;
    }
  | KnowledgeUploadActionFailure;
