import type {
  AiAgentActivationContext,
  ValidatedAiAgentDefinition,
} from "../../shared/domain/aiAgent.ts";

export type AiOperationalReadiness =
  Omit<
    AiAgentActivationContext,
    "knowledgeSources"
  >;

export interface AiOperationalReadinessProvider {
  readForTenant(
    tenantId: number,
    definition: ValidatedAiAgentDefinition,
  ): Promise<AiOperationalReadiness>;
}

export const unavailableAiOperationalReadinessProvider:
AiOperationalReadinessProvider = {
  async readForTenant() {
    return {
      providerReady: false,
      billingPolicyApproved: false,
      handoffPolicyApproved: false,
      auditSinkReady: false,
    };
  },
};
