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
    checkId:
      "identity.team-invitation-policy",
    title:
      "מדיניות תפוגה והזמנה מחדש",
    detail:
      "טל בחר תפוגה של 72 שעות והזמנה מחדש רק לאחר מצב סופי. ההחלטה נשארת חסומה עד אישור מוצר ואבטחה ושמירת הרשומה המאושרת בסביבה החיה.",
    owner: "מוצר + אבטחה",
  },
  {
    checkId: "ai.provider",
    title: "ספק AI ומודל חיוב",
    detail:
      "נבחר OpenAI Responses API מאחורי Provider port: ‏GPT-5.6 Luna כברירת מחדל חסכונית, ו-GPT-5.6 Terra רק לאחר Eval מושחר שמוכיח צורך; Sol אינו ברירת מחדל. כל בקשה משתמשת ב-store:false, אין שליחה אוטונומית ללא אישור אדם, והספק נשאר חסום עד Model allowlist, תקציב, Timeout, מפתחות, אישור פרטיות וראיות איכות חיות.",
    owner: "מוצר + פיתוח",
  },
  {
    checkId: "billing.provider",
    title: "ספק סליקה והפקת חשבוניות",
    detail:
      "ל-Pilot נבחרה חשבונית מאושרת ותשלום בהעברה בנקאית, או Pilot חינמי אם כספים/מס אינם מאשרים זאת. לאחר Pilot הכיוון המועדף הוא Paddle כ-Merchant of Record בכפוף לאישור חשבון, KYC, מס והתאמת מוצר; Paddle ו-Stripe נשארים Adapters נפרדים, Stripe רדום, ואין Dual-live. Billing נשאר חסום עד אישורי כספים/משפטי, תמחור, Webhooks, החזרים, התאמות וראיות חיות.",
    owner: "כספים + פיתוח",
  },
  {
    checkId: "security.rate-limit-policy",
    title: "מדיניות Rate Limit",
    detail:
      "טל בחר Limiter רב-שכבתי הנגזר ממצב Meta חי. טל מאמת עובדות; דוד אחראי למימוש; אבטחה ומוצר מאשרים מכסות Connect, חלונות, Backoff, Alerts ו-Kill switch.",
    owner: "טל (מחקר ופיתוח) + דוד + אבטחה + מוצר",
  },
  {
    checkId: "security.file-scanner",
    title: "מדיניות וספק סריקת קבצים",
    detail:
      "נבחר AWS GuardDuty Malware Protection for S3 באותו אזור של אחסון הידע. קובץ נשאר ב-Quarantine עד Verdict נקי הקשור ל-bucket, key ו-versionId; איום, כשל, Timeout, תוצאה חסרה או לא נתמכת נחסמים. אם AWS, תקציב, Legal או D14 אינם מוכנים, העלאות ידע נשארות כבויות. ההחלטה אינה Ready עד תצורת S3/EventBridge/הרשאות, אימות סוג קובץ וראיות Staging חיות.",
    owner: "אבטחה + פיתוח",
  },
  {
    checkId: "security.knowledge-upload-policy",
    title: "מדיניות העלאת מקורות ידע",
    detail:
      "טל בחר עד 10 MiB ורק PDF, TXT ו-DOCX. נדרשים אישור אבטחה, אימות MIME וחתימה, Scanner פעיל ותצורה חיה לפני העלאה.",
    owner: "מוצר + אבטחה",
  },
  {
    checkId: "operations.knowledge-scan-recovery",
    title: "שחזור סריקות ידע תקועות",
    detail:
      "טל בחר סריקה כתקועה לאחר 15 דקות, עד שלושה ניסיונות ולאחריהם Manual review. נדרשים אישור תפעול ותצורה חיה.",
    owner: "תפעול + פיתוח",
  },
  {
    checkId: "operations.backup-policy",
    title: "מדיניות גיבוי ושחזור",
    detail:
      "טל בחר גיבוי יומי, שמירה ל-90 יום, PITR ותרגול שחזור מבודד חודשי. נדרשים ספק Storage, חלון PITR מוכח ו-Restore evidence חי.",
    owner: "תפעול + אבטחה",
  },
  {
    checkId: "operations.slo-measurement",
    title: "מקור מדידת SLO",
    detail:
      "טל בחר Better Stack כ-Sink עם OpenTelemetry מ-Vercel ומ-Railway. נדרשים Retention, PII redaction, תקציב וראיות Staging לפני אישור.",
    owner: "תפעול + פיתוח",
  },
  {
    checkId: "operations.slo-alert-policy",
    title: "מדיניות התראות SLO",
    detail:
      "טל בחר Pilot בשעות פעילות עם נתיב הסלמה. יש למנות Primary ו-Backup, לקבוע שעות, ערוצים, זמני תגובה ותרגיל התראה.",
    owner: "תפעול",
  },
  {
    checkId: "governance.data-retention-policy",
    title: "מדיניות שמירת ומחיקת מידע",
    detail:
      "טל בחר Policy v2 בכפוף ל-Legal review. Legal ואבטחה חייבים לאשר כל Data class, Trigger, Legal Hold ותקופה לפני חיבור Adapter מחיקה.",
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
