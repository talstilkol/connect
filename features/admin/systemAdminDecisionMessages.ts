import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  SystemAdminProductionDecisionStatus,
} from "../../shared/domain/productionDecisionRecord.ts";
import type {
  SystemAdminProductionDecisionActionResult,
} from "../../server/operations/systemAdminProductionDecisionActionResult.ts";

type UnavailableStatus = Exclude<
  SystemAdminProductionDecisionStatus,
  "ready"
>;

type ActionFailure = Exclude<
  SystemAdminProductionDecisionActionResult["status"],
  "saved"
>;

type SystemAdminDecisionMessages = {
  locale: string;
  states: Record<
    UnavailableStatus,
    { title: string; description: string }
  >;
  actionFailures: Record<ActionFailure, string>;
  invalidForm: string;
  unchanged: string;
  saved: string;
  backToAdmin: string;
  homeAriaLabel: string;
  verifiedSave: string;
  tenantsLink: string;
  eyebrow: string;
  title: string;
  description: string;
  registryCount: string;
  savedCount: string;
  runtimeReadyCount: string;
  secretWarning: string;
  secretDescription: string;
  decisionsAriaLabel: string;
  runtime: {
    ready: string;
    blocked: string;
    "decision-required": string;
  };
  owner: (value: string) => string;
  code: (value: string) => string;
  version: (value: number) => string;
  updatedAt: (value: string) => string;
  notSaved: string;
  selection: string;
  rationale: string;
  saving: string;
  saveNewVersion: string;
  saveDecision: string;
  concurrencyHelp: string;
};

const messages = {
  he: {
    locale: "he-IL",
    states: {
      "configuration-required": {
        title: "סביבת Admin אינה מוגדרת",
        description:
          "נדרשות תצורות Clerk, ‏System Admin ו־D1 מלאות לפני ניהול החלטות.",
      },
      unauthenticated: {
        title: "נדרשת התחברות",
        description:
          "יש להתחבר עם זהות Clerk מורשית לפני ניהול החלטות Production.",
      },
      "permission-denied": {
        title: "אין הרשאת System Admin",
        description:
          "רק זהות שנמצאת ב־Allowlist השרת רשאית לשמור החלטות.",
      },
      "server-error": {
        title: "לא ניתן לטעון את ההחלטות",
        description:
          "הקריאה מ־D1 נכשלה באופן חסום. לא מוצגים נתונים חלופיים.",
      },
    },
    actionFailures: {
      "configuration-required": "תצורת System Admin אינה מלאה.",
      unauthenticated: "ה־Session הסתיים. יש להתחבר מחדש.",
      "permission-denied": "אין לזהות הנוכחית הרשאת System Admin.",
      "invalid-input": "הבחירה או הנימוק אינם תקינים.",
      conflict: "ההחלטה השתנתה מאז הטעינה. יש לרענן לפני שמירה נוספת.",
      "server-error": "השמירה נכשלה ולא נוצר שינוי חלקי.",
    },
    invalidForm: "יש להזין בחירה ונימוק לפני השמירה.",
    unchanged: "ההחלטה כבר שמורה באותה גרסה.",
    saved: "ההחלטה נשמרה ונוסף אירוע Audit אטומי.",
    backToAdmin: "חזרה לניהול המערכת",
    homeAriaLabel: "Connect — עמוד ראשי",
    verifiedSave: "שמירה מאומתת בשרת",
    tenantsLink: "Tenants ומנויים",
    eyebrow: "Production Governance",
    title: "ניהול החלטות",
    description:
      "ההחלטה העסקית נשמרת בנפרד ממצב ה־Runtime. שמירה אינה מסמנת אינטגרציה כ־Ready עד ששער Production מאמת אותה בפועל.",
    registryCount: "החלטות ב־Registry",
    savedCount: "רשומות שמורות",
    runtimeReadyCount: "Runtime Ready",
    secretWarning: "אין להזין Secrets, Tokens או מפתחות.",
    secretDescription:
      "יש לשמור רק את הבחירה המאושרת והנימוק. Credentials נשמרים במנגנוני התצורה הייעודיים בלבד.",
    decisionsAriaLabel: "החלטות Production",
    runtime: {
      ready: "Runtime מוכן",
      blocked: "Runtime חסום",
      "decision-required": "Runtime דורש החלטה",
    },
    owner: (value) => `בעלות: ${value}`,
    code: (value) => `קוד: ${value}`,
    version: (value) => `גרסה ${value}`,
    updatedAt: (value) => `עודכן ${value} UTC`,
    notSaved: "טרם נשמרה החלטה",
    selection: "הבחירה המאושרת",
    rationale: "נימוק והשלכות",
    saving: "שומר…",
    saveNewVersion: "שמירת גרסה חדשה",
    saveDecision: "שמירת החלטה",
    concurrencyHelp:
      "השמירה משתמשת בגרסה צפויה ומונעת דריסת שינוי מקביל.",
  },
  en: {
    locale: "en-US",
    states: {
      "configuration-required": {
        title: "Admin environment is not configured",
        description:
          "Complete Clerk, System Admin, and D1 configuration before managing decisions.",
      },
      unauthenticated: {
        title: "Sign-in required",
        description:
          "Sign in with an authorized Clerk identity before managing Production decisions.",
      },
      "permission-denied": {
        title: "System Admin permission required",
        description:
          "Only an identity in the server allowlist may save decisions.",
      },
      "server-error": {
        title: "Decisions could not be loaded",
        description:
          "The D1 read failed closed. No fallback records are displayed.",
      },
    },
    actionFailures: {
      "configuration-required": "System Admin configuration is incomplete.",
      unauthenticated: "The session ended. Sign in again.",
      "permission-denied": "This identity does not have System Admin permission.",
      "invalid-input": "The selection or rationale is invalid.",
      conflict: "The decision changed after loading. Refresh before saving again.",
      "server-error": "The save failed and no partial change was created.",
    },
    invalidForm: "Enter a selection and rationale before saving.",
    unchanged: "The same decision version is already saved.",
    saved: "The decision was saved with an atomic Audit event.",
    backToAdmin: "Back to system administration",
    homeAriaLabel: "Connect — home",
    verifiedSave: "Server-verified save",
    tenantsLink: "Tenants and subscriptions",
    eyebrow: "Production Governance",
    title: "Decision management",
    description:
      "The business decision is stored separately from Runtime state. Saving does not mark an integration Ready until the Production gate verifies it.",
    registryCount: "Registry decisions",
    savedCount: "Saved records",
    runtimeReadyCount: "Runtime Ready",
    secretWarning: "Do not enter Secrets, Tokens, or keys.",
    secretDescription:
      "Store only the approved selection and rationale. Credentials belong only in their dedicated configuration mechanisms.",
    decisionsAriaLabel: "Production decisions",
    runtime: {
      ready: "Runtime ready",
      blocked: "Runtime blocked",
      "decision-required": "Runtime decision required",
    },
    owner: (value) => `Owners: ${value}`,
    code: (value) => `Code: ${value}`,
    version: (value) => `Version ${value}`,
    updatedAt: (value) => `Updated ${value} UTC`,
    notSaved: "No decision has been saved",
    selection: "Approved selection",
    rationale: "Rationale and implications",
    saving: "Saving…",
    saveNewVersion: "Save new version",
    saveDecision: "Save decision",
    concurrencyHelp:
      "The save uses an expected version and prevents overwriting a concurrent change.",
  },
  ar: {
    locale: "ar",
    states: {
      "configuration-required": {
        title: "بيئة Admin غير معدّة",
        description:
          "أكمل إعداد Clerk وSystem Admin وD1 قبل إدارة القرارات.",
      },
      unauthenticated: {
        title: "تسجيل الدخول مطلوب",
        description:
          "سجّل الدخول بهوية Clerk مخوّلة قبل إدارة قرارات Production.",
      },
      "permission-denied": {
        title: "صلاحية System Admin مطلوبة",
        description:
          "لا يمكن حفظ القرارات إلا لهوية موجودة في قائمة السماح في الخادم.",
      },
      "server-error": {
        title: "تعذّر تحميل القرارات",
        description:
          "فشلت قراءة D1 بصورة مغلقة، ولا تُعرض سجلات بديلة.",
      },
    },
    actionFailures: {
      "configuration-required": "إعداد System Admin غير مكتمل.",
      unauthenticated: "انتهت الجلسة. سجّل الدخول مجددًا.",
      "permission-denied": "لا تملك هذه الهوية صلاحية System Admin.",
      "invalid-input": "الاختيار أو المبرر غير صالح.",
      conflict: "تغيّر القرار بعد التحميل. حدّث الصفحة قبل الحفظ مجددًا.",
      "server-error": "فشل الحفظ ولم يُنشأ أي تغيير جزئي.",
    },
    invalidForm: "أدخل الاختيار والمبرر قبل الحفظ.",
    unchanged: "القرار نفسه محفوظ بهذه النسخة بالفعل.",
    saved: "حُفظ القرار مع حدث Audit ذري.",
    backToAdmin: "العودة إلى إدارة النظام",
    homeAriaLabel: "Connect — الصفحة الرئيسية",
    verifiedSave: "حفظ متحقق منه في الخادم",
    tenantsLink: "Tenants والاشتراكات",
    eyebrow: "Production Governance",
    title: "إدارة القرارات",
    description:
      "يُحفظ قرار العمل منفصلًا عن حالة Runtime. لا يجعل الحفظ التكامل Ready حتى تتحقق منه بوابة Production.",
    registryCount: "قرارات Registry",
    savedCount: "السجلات المحفوظة",
    runtimeReadyCount: "Runtime Ready",
    secretWarning: "لا تدخل Secrets أو Tokens أو مفاتيح.",
    secretDescription:
      "احفظ الاختيار المعتمد والمبرر فقط. تُحفظ Credentials في آليات الإعداد المخصصة لها.",
    decisionsAriaLabel: "قرارات Production",
    runtime: {
      ready: "Runtime جاهز",
      blocked: "Runtime محظور",
      "decision-required": "Runtime يتطلب قرارًا",
    },
    owner: (value) => `المالكون: ${value}`,
    code: (value) => `الرمز: ${value}`,
    version: (value) => `الإصدار ${value}`,
    updatedAt: (value) => `آخر تحديث ${value} UTC`,
    notSaved: "لم يُحفظ قرار بعد",
    selection: "الاختيار المعتمد",
    rationale: "المبرر والآثار",
    saving: "جارٍ الحفظ…",
    saveNewVersion: "حفظ إصدار جديد",
    saveDecision: "حفظ القرار",
    concurrencyHelp:
      "يستخدم الحفظ إصدارًا متوقعًا ويمنع استبدال تغيير متزامن.",
  },
} as const satisfies Record<
  InterfaceLanguage,
  SystemAdminDecisionMessages
>;

export function readSystemAdminDecisionMessages(
  language: InterfaceLanguage,
): SystemAdminDecisionMessages {
  return messages[language];
}
