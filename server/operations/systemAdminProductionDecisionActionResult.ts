import type {
  ProductionDecisionRecordView,
} from "../../shared/domain/productionDecisionRecord.ts";

export type SystemAdminProductionDecisionActionResult =
  | {
      status: "saved";
      outcome:
        | "created"
        | "updated"
        | "unchanged";
      record: ProductionDecisionRecordView;
    }
  | {
      status:
        | "configuration-required"
        | "unauthenticated"
        | "permission-denied"
        | "invalid-input"
        | "conflict"
        | "server-error";
    };
