import {
  PRODUCTION_DECISION_REGISTRY,
} from "./productionDecisionRegistry.ts";

export type ProductionDecisionCheckId =
  (typeof PRODUCTION_DECISION_REGISTRY)[number]["checkId"];

export interface ProductionDecisionRecord {
  checkId: ProductionDecisionCheckId;
  selection: string;
  rationale: string;
  version: number;
  lastEventKey: string;
  decidedByExternalUserId: string;
  decidedAt: string;
  updatedAt: string;
}

export interface ProductionDecisionRecordView {
  checkId: ProductionDecisionCheckId;
  selection: string;
  rationale: string;
  version: number;
  decidedAt: string;
  updatedAt: string;
}

export type ProductionDecisionMutationResult =
  | {
      outcome:
        | "created"
        | "updated"
        | "unchanged";
      record: ProductionDecisionRecord;
    }
  | {
      outcome: "conflict";
      record: ProductionDecisionRecord | null;
    };

export type SystemAdminProductionDecisionStatus =
  | "ready"
  | "configuration-required"
  | "unauthenticated"
  | "permission-denied"
  | "server-error";

export interface CurrentSystemAdminProductionDecisions {
  status: SystemAdminProductionDecisionStatus;
  records:
    readonly ProductionDecisionRecordView[];
}

export function toProductionDecisionRecordView(
  record: ProductionDecisionRecord,
): ProductionDecisionRecordView {
  return {
    checkId: record.checkId,
    selection: record.selection,
    rationale: record.rationale,
    version: record.version,
    decidedAt: record.decidedAt,
    updatedAt: record.updatedAt,
  };
}
