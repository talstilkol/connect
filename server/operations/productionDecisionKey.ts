import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  requireProductionDecisionActor,
  requireProductionDecisionCheckId,
  requireProductionDecisionRationale,
  requireProductionDecisionSelection,
  requireProductionDecisionVersion,
} from "./productionDecisionValidation.ts";

export interface ProductionDecisionEventIdentity {
  checkId: unknown;
  expectedVersion: unknown;
  selection: unknown;
  rationale: unknown;
  actorExternalUserId: unknown;
}

export async function deriveProductionDecisionEventKey(
  identity:
    ProductionDecisionEventIdentity,
): Promise<string> {
  const checkId =
    requireProductionDecisionCheckId(
      identity.checkId,
    );
  const expectedVersion =
    requireProductionDecisionVersion(
      identity.expectedVersion,
      true,
    );
  const selection =
    requireProductionDecisionSelection(
      identity.selection,
    );
  const rationale =
    requireProductionDecisionRationale(
      identity.rationale,
    );
  const actorExternalUserId =
    requireProductionDecisionActor(
      identity.actorExternalUserId,
    );
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "production_decision_event_v1",
        checkId,
        expectedVersion,
        selection,
        rationale,
        actorExternalUserId,
      }),
    ),
  );

  return `production_decision_event_v1_${digest}`;
}
