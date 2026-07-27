import type {
  ProductionReadinessReport,
  ProductionReadinessStatus,
} from "./productionReadiness.ts";

export interface ProductionDecisionDefinition {
  checkId: string;
  title: string;
  detail: string;
  owner: string;
}

export interface ProductionDecisionView
  extends ProductionDecisionDefinition {
  status: ProductionReadinessStatus;
  code: string;
}

export const PRODUCTION_DECISION_REGISTRY = Object.freeze([
  {
    checkId: "ai.provider",
    title: "ספק AI ומודל חיוב",
    detail:
      "יש לבחור ספק, מודלים, גבולות שימוש ומודל מפתחות לפני הפעלת סוכן AI.",
    owner: "מוצר + פיתוח",
  },
  {
    checkId: "billing.provider",
    title: "ספק סליקה והפקת חשבוניות",
    detail:
      "יש לבחור ספק שיקבע את תהליך ההרשמה, Webhooks, החזרים וחשבוניות.",
    owner: "כספים + פיתוח",
  },
  {
    checkId: "security.rate-limit-policy",
    title: "מדיניות Rate Limit",
    detail:
      "יש לאשר מכסות, חלונות זמן ופעולות חסומות לכל סוג משתמש ו־Webhook.",
    owner: "אבטחה + פיתוח",
  },
  {
    checkId: "security.file-scanner",
    title: "מדיניות וספק סריקת קבצים",
    detail:
      "יש לבחור מנגנון סריקה ולהגדיר מה קורה לקובץ חשוד, תקוע או לא נתמך.",
    owner: "אבטחה + פיתוח",
  },
  {
    checkId: "security.knowledge-upload-policy",
    title: "מדיניות העלאת מקורות ידע",
    detail:
      "יש לקבוע סוגי קבצים מורשים, מגבלת גודל וכללי דחייה לפני העלאה.",
    owner: "מוצר + אבטחה",
  },
  {
    checkId: "operations.knowledge-scan-recovery",
    title: "שחזור סריקות ידע תקועות",
    detail:
      "יש להגדיר מתי סריקה נחשבת תקועה, כמה פעמים מנסים שוב ומתי מסלימים.",
    owner: "תפעול + פיתוח",
  },
  {
    checkId: "operations.backup-policy",
    title: "מדיניות גיבוי ושחזור",
    detail:
      "יש לאשר תדירות גיבוי, חלון שמירה ותדירות תרגול שחזור מבודד.",
    owner: "תפעול + אבטחה",
  },
  {
    checkId: "operations.slo-measurement",
    title: "מקור מדידת SLO",
    detail:
      "יש לבחור מקור אמת לאירועי זמינות, שגיאות וזמני תגובה.",
    owner: "תפעול + פיתוח",
  },
  {
    checkId: "operations.slo-alert-policy",
    title: "מדיניות התראות SLO",
    detail:
      "יש לקבוע חלון מדידה, סף מינימום, בעל התראה ונתיב הסלמה.",
    owner: "תפעול",
  },
  {
    checkId: "governance.data-retention-policy",
    title: "מדיניות שמירת ומחיקת מידע",
    detail:
      "יש לאשר תקופות שמירה וטריגר מחיקה לכל מחלקת מידע.",
    owner: "משפטי + אבטחה",
  },
] satisfies readonly ProductionDecisionDefinition[]);

export function listProductionDecisions(
  report: ProductionReadinessReport,
): readonly ProductionDecisionView[] {
  const checksById = new Map(
    report.checks.map((check) => [check.id, check]),
  );

  return Object.freeze(
    PRODUCTION_DECISION_REGISTRY.map((definition) => {
      const check = checksById.get(definition.checkId);

      if (!check) {
        throw new Error(
          `Production readiness check is missing: ${definition.checkId}`,
        );
      }

      return Object.freeze({
        ...definition,
        status: check.status,
        code: check.code,
      });
    }),
  );
}
