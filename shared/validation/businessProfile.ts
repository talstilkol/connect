export interface BusinessProfileCompletenessInput {
  businessName: string;
  timezone: string;
  interfaceLanguage: string;
  isDraftSaved: boolean;
}

export interface BusinessProfileCompleteness {
  businessNameComplete: boolean;
  timezoneComplete: boolean;
  interfaceLanguageComplete: boolean;
  draftSaved: boolean;
  completedCount: number;
  totalCount: 4;
  isComplete: boolean;
}

export function inspectBusinessProfileCompleteness(
  input: BusinessProfileCompletenessInput,
): BusinessProfileCompleteness {
  const businessNameComplete = input.businessName.trim().length > 0;
  const timezoneComplete = input.timezone.trim().length > 0;
  const interfaceLanguageComplete =
    input.interfaceLanguage.trim().length > 0;
  const states = [
    businessNameComplete,
    timezoneComplete,
    interfaceLanguageComplete,
    input.isDraftSaved,
  ];
  const completedCount = states.filter(Boolean).length;

  return {
    businessNameComplete,
    timezoneComplete,
    interfaceLanguageComplete,
    draftSaved: input.isDraftSaved,
    completedCount,
    totalCount: 4,
    isComplete: completedCount === 4,
  };
}
