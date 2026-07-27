import type { BusinessProfileDraft } from "../domain/businessProfileDraft";
import type { MetaConnectionView } from "../domain/metaConnectionView";

export type DashboardNextAction =
  | "business-profile"
  | "meta"
  | "onboarding";

export interface DashboardSetupState {
  businessProfileComplete: boolean;
  metaConnectionComplete: boolean;
  completedSteps: number;
  totalSteps: 10;
  progressPercent: number;
  nextAction: DashboardNextAction;
}

export function inspectDashboardSetup(
  businessProfileDraft: BusinessProfileDraft | null,
  metaConnection: MetaConnectionView | null = null,
): DashboardSetupState {
  const businessProfileComplete = Boolean(
    businessProfileDraft?.businessName.trim() &&
      businessProfileDraft.timezone.trim() &&
      businessProfileDraft.interfaceLanguage.trim(),
  );
  const metaConnectionComplete =
    metaConnection?.status === "connected";
  const completedSteps =
    (businessProfileComplete ? 1 : 0) +
    (metaConnectionComplete ? 3 : 0);
  const nextAction: DashboardNextAction = !businessProfileComplete
    ? "business-profile"
    : !metaConnectionComplete
      ? "meta"
      : "onboarding";

  return {
    businessProfileComplete,
    metaConnectionComplete,
    completedSteps,
    totalSteps: 10,
    progressPercent: completedSteps * 10,
    nextAction,
  };
}
