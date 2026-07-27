import type {
  CampaignDeliveryMode,
  CampaignVariableColumnMapping,
} from "../domain/campaignDraft";

export interface CampaignPlanningInput {
  name: string;
  deliveryMode: CampaignDeliveryMode;
  scheduledAt: string;
  hasTemplateDraft: boolean;
  hasContactSnapshot: boolean;
  templateVariableNumbers: readonly number[];
  variableColumnMapping: Readonly<CampaignVariableColumnMapping>;
  requiresDynamicUrlMapping: boolean;
  dynamicUrlColumnIndex: number | null;
  isDraftSaved: boolean;
}

export interface CampaignPlanningSummary {
  detailsComplete: boolean;
  templateDraftAvailable: boolean;
  contactSnapshotAvailable: boolean;
  variableMappingComplete: boolean;
  draftSaved: boolean;
  completedCount: number;
  totalCount: 5;
  isComplete: boolean;
}

export function inspectCampaignPlanning(
  input: CampaignPlanningInput,
): CampaignPlanningSummary {
  const hasTiming =
    input.deliveryMode === "immediate" ||
    input.scheduledAt.trim().length > 0;
  const detailsComplete = input.name.trim().length > 0 && hasTiming;
  const variableMappingComplete =
    input.hasTemplateDraft &&
    (!input.requiresDynamicUrlMapping ||
      (input.hasContactSnapshot && input.dynamicUrlColumnIndex !== null)) &&
    (input.templateVariableNumbers.length === 0 ||
      (input.hasContactSnapshot &&
        input.templateVariableNumbers.every((variableNumber) => {
          const columnIndex = input.variableColumnMapping[variableNumber];
          return columnIndex !== undefined && columnIndex !== null;
        })));
  const states = [
    detailsComplete,
    input.hasTemplateDraft,
    input.hasContactSnapshot,
    variableMappingComplete,
    input.isDraftSaved,
  ];
  const completedCount = states.filter(Boolean).length;

  return {
    detailsComplete,
    templateDraftAvailable: input.hasTemplateDraft,
    contactSnapshotAvailable: input.hasContactSnapshot,
    variableMappingComplete,
    draftSaved: input.isDraftSaved,
    completedCount,
    totalCount: 5,
    isComplete: completedCount === 5,
  };
}
