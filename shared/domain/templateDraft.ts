export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type TemplateLanguage = "he" | "en_US" | "ar";

export type TemplateButtonMode =
  | "none"
  | "quick_reply"
  | "call_to_action";

export type UrlButtonMode = "static" | "dynamic";

export interface TemplateDraft {
  name: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  header: string;
  body: string;
  footer: string;
  variableExamples: Record<number, string>;
  buttonMode: TemplateButtonMode;
  quickReplies: string[];
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
