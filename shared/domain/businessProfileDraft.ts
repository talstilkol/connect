export type InterfaceLanguage = "he" | "en" | "ar";

export interface BusinessProfileDraft {
  businessName: string;
  timezone: string;
  interfaceLanguage: InterfaceLanguage;
}
