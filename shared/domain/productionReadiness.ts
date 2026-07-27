export type ProductionReadinessStatus =
  | "ready"
  | "blocked"
  | "decision-required";

export type ProductionReadinessCategory =
  | "identity"
  | "storage"
  | "meta"
  | "messaging"
  | "automation"
  | "ai"
  | "billing"
  | "security"
  | "operations"
  | "governance";

export interface ProductionReadinessCheck {
  id: string;
  category: ProductionReadinessCategory;
  status: ProductionReadinessStatus;
  code: string;
}

export interface ProductionReadinessCounts {
  ready: number;
  blocked: number;
  decisionRequired: number;
}

export interface ProductionReadinessReport {
  readyForProduction: boolean;
  checks: readonly ProductionReadinessCheck[];
  counts: ProductionReadinessCounts;
}
