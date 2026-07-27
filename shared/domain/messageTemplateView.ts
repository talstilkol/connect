import type {
  MessageTemplateDefinition,
  PersistedMessageTemplate,
} from "./messageTemplate.ts";

export type MessageTemplateDirectoryStatus =
  | "ready"
  | "configuration-required"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "server-error";

export interface MessageTemplateView
  extends MessageTemplateDefinition {
  templateKey: string;
  name: PersistedMessageTemplate["name"];
  category: PersistedMessageTemplate["category"];
  language: PersistedMessageTemplate["language"];
  status: PersistedMessageTemplate["status"];
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
}
