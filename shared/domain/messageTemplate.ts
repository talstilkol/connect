import type {
  TemplateButtonMode,
  TemplateCategory,
  TemplateLanguage,
  UrlButtonMode,
} from "./templateDraft.ts";
import type {
  TemplateStatus,
} from "./model.ts";

export const persistedTemplateStatuses = [
  "draft",
  "submitting",
  "pending_review",
  "approved",
  "rejected",
  "disabled",
  "deleted",
] as const satisfies readonly TemplateStatus[];

export const persistedTemplateCategories = [
  "MARKETING",
  "UTILITY",
] as const satisfies readonly TemplateCategory[];

export const persistedTemplateLanguages = [
  "he",
  "en_US",
  "ar",
] as const satisfies readonly TemplateLanguage[];

export interface MessageTemplateDefinition {
  header: string;
  body: string;
  footer: string;
  variableExamples: Readonly<Record<number, string>>;
  buttonMode: TemplateButtonMode;
  quickReplies: readonly string[];
  urlButton: {
    enabled: boolean;
    mode: UrlButtonMode;
    text: string;
    value: string;
    example: string;
  };
  phoneButton: {
    enabled: boolean;
    text: string;
    value: string;
  };
}

export interface ValidatedMessageTemplateDraft
  extends MessageTemplateDefinition {
  name: string;
  category: (typeof persistedTemplateCategories)[number];
  language: (typeof persistedTemplateLanguages)[number];
}

export interface PersistedMessageTemplate
  extends ValidatedMessageTemplateDraft {
  templateKey: string;
  tenantId: number;
  metaTemplateId: string | null;
  status: TemplateStatus;
  submissionKey: string | null;
  submissionStartedAt: string | null;
  lastSubmissionErrorCode: string | null;
  lastStatusEventKey: string | null;
  lastStatusEventAt: string | null;
  version: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
