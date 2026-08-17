import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  SystemAdminWhatsappDeliveryPolicyViewStatus,
  WhatsappCampaignDeliveryPolicyState,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import type {
  SystemAdminWhatsappDeliveryPolicyActionResult,
} from "../../server/campaigns/systemAdminWhatsappDeliveryPolicyActionResult.ts";

type UnavailableStatus = Exclude<
  SystemAdminWhatsappDeliveryPolicyViewStatus,
  "ready"
>;

type ActionFailure = Exclude<
  SystemAdminWhatsappDeliveryPolicyActionResult["status"],
  "saved"
>;

type SystemAdminWhatsappPolicyMessages = {
  locale: string;
  states: Record<
    UnavailableStatus,
    { title: string; description: string }
  >;
  actionFailures: Record<ActionFailure, string>;
  invalidEvidence: string;
  unchanged: string;
  approved: string;
  killSwitchConfirmation: string;
  killSwitchActivated: string;
  backToAdmin: string;
  adminAriaLabel: string;
  failClosed: string;
  eyebrow: string;
  title: string;
  description: (tenantId: number) => string;
  secretWarning: string;
  secretDescription: string;
  connectionVersion: (version: number) => string;
  currentConnection: string;
  connectionIdentifiers: (
    portfolio: string,
    waba: string,
    phone: string,
  ) => string;
  policyVersion: (version: number) => string;
  deliveryStates: Record<
    WhatsappCampaignDeliveryPolicyState,
    string
  >;
  evidenceExpires: (value: string) => string;
  noPolicy: string;
  messagingLimit: string;
  chooseQuotaType: string;
  boundedQuota: string;
  unlimitedQuota: string;
  boundedQuotaValue: string;
  chooseTier: string;
  reservationDuration: string;
  graphApiVersion: string;
  evidenceDigest: string;
  evidenceCheckedAt: string;
  evidenceExpiresAt: string;
  concurrencyHelp: string;
  saving: string;
  approvePolicy: string;
  killSwitch: string;
  killSwitchDescription: string;
  blockCampaigns: string;
};

const messages = {
  he: {
    locale: "he-IL",
    states: {
      "configuration-required": {
        title: "סביבת Admin אינה מוגדרת",
        description:
          "נדרשות תצורות Clerk, System Admin ו־D1 לפני ניהול מדיניות שליחה.",
      },
      unauthenticated: {
        title: "נדרשת התחברות",
        description: "יש להתחבר עם זהות Clerk מורשית.",
      },
      "permission-denied": {
        title: "אין הרשאת System Admin",
        description:
          "רק זהות שנמצאת ב־Allowlist של השרת רשאית לשנות את המדיניות.",
      },
      "not-found": {
        title: "לא נמצא חיבור Meta",
        description:
          "ל־Tenant שנבחר אין חיבור Meta שממנו ניתן לגזור זהויות וגרסה.",
      },
      "server-error": {
        title: "לא ניתן לטעון את המדיניות",
        description:
          "הקריאה נכשלה באופן חסום ולא מוצגים ערכים חלופיים.",
      },
    },
    actionFailures: {
      "configuration-required": "תצורת System Admin אינה מלאה.",
      unauthenticated: "ה־Session הסתיים. יש להתחבר מחדש.",
      "permission-denied": "אין לזהות הנוכחית הרשאת System Admin.",
      "invalid-input": "ה־Evidence או ערכי המדיניות אינם תקינים או אינם בתוקף.",
      "not-found": "חיבור Meta או מדיניות קודמת לא נמצאו.",
      "connection-not-ready": "חיבור Meta אינו במצב connected.",
      conflict: "גרסת החיבור או המדיניות השתנתה. יש לרענן לפני פעולה נוספת.",
      "server-error": "הפעולה נכשלה בשרת ולא נשמר שינוי חלקי.",
    },
    invalidEvidence: "יש להשלים ערכי Evidence תקינים ומתוארכים ב־UTC.",
    unchanged: "המצב כבר היה שמור; לא נוצר אירוע כפול.",
    approved: "ה־Evidence אושר ונרשם כאירוע Immutable עם Audit.",
    killSwitchConfirmation:
      "להפעיל Kill Switch ולחסום מיד שליחת קמפיינים עבור Tenant זה?",
    killSwitchActivated: "Kill Switch הופעל ונרשם ב־Audit.",
    backToAdmin: "חזרה לניהול המערכת",
    adminAriaLabel: "Connect — ניהול מערכת",
    failClosed: "Fail-closed",
    eyebrow: "WhatsApp Safety",
    title: "מדיניות שליחת קמפיינים",
    description: (tenantId) =>
      `אישור Evidence מתכלה והפעלת Kill Switch עבור Tenant #${tenantId}.`,
    secretWarning: "אין להזין Token, Secret או מספרי טלפון של נמענים.",
    secretDescription:
      "מסך זה אינו מחבר את Meta sender. שליחה נשארת חסומה עד לחיבור נפרד ולבדיקות WABA מורשות.",
    connectionVersion: (version) => `Connection version ${version}`,
    currentConnection: "חיבור Meta נוכחי",
    connectionIdentifiers: (portfolio, waba, phone) =>
      `Portfolio: ${portfolio} · WABA: ${waba} · Phone: ${phone}`,
    policyVersion: (version) => `Policy v${version}`,
    deliveryStates: {
      enabled: "פעילה",
      disabled: "חסומה",
    },
    evidenceExpires: (value) => `Evidence בתוקף עד: ${value} UTC`,
    noPolicy: "טרם נשמרה מדיניות. ללא מדיניות פעילה המערכת נכשלת סגור.",
    messagingLimit: "Messaging limit",
    chooseQuotaType: "בחירת סוג מכסה",
    boundedQuota: "מכסה מוגבלת",
    unlimitedQuota: "Unlimited",
    boundedQuotaValue: "ערך מכסה מוגבלת",
    chooseTier: "בחירת Tier",
    reservationDuration: "משך Reservation בשניות",
    graphApiVersion: "גרסת Meta Graph API",
    evidenceDigest: "Evidence SHA-256 digest",
    evidenceCheckedAt: "מועד בדיקת Evidence ‏(UTC)",
    evidenceExpiresAt: "מועד תפוגת Evidence ‏(UTC)",
    concurrencyHelp: "השמירה דורשת גרסת Connection ו־Policy מדויקות.",
    saving: "שומר…",
    approvePolicy: "אישור Evidence והפעלת Policy",
    killSwitch: "Kill Switch",
    killSwitchDescription: "יוצר אירוע disabled חדש ואינו משנה את ה־Evidence שאושר.",
    blockCampaigns: "חסימת שליחת קמפיינים",
  },
  en: {
    locale: "en-US",
    states: {
      "configuration-required": {
        title: "Admin environment is not configured",
        description:
          "Configure Clerk, System Admin, and D1 before managing delivery policy.",
      },
      unauthenticated: {
        title: "Sign-in required",
        description: "Sign in with an authorized Clerk identity.",
      },
      "permission-denied": {
        title: "System Admin permission required",
        description:
          "Only an identity in the server allowlist may change this policy.",
      },
      "not-found": {
        title: "Meta connection not found",
        description:
          "The selected Tenant has no Meta connection from which identities and version can be derived.",
      },
      "server-error": {
        title: "Policy could not be loaded",
        description:
          "The read failed closed and no fallback values are displayed.",
      },
    },
    actionFailures: {
      "configuration-required": "System Admin configuration is incomplete.",
      unauthenticated: "The session ended. Sign in again.",
      "permission-denied": "This identity does not have System Admin permission.",
      "invalid-input": "The Evidence or policy values are invalid or expired.",
      "not-found": "The Meta connection or previous policy was not found.",
      "connection-not-ready": "The Meta connection is not connected.",
      conflict: "The connection or policy version changed. Refresh before continuing.",
      "server-error": "The action failed and no partial change was saved.",
    },
    invalidEvidence: "Complete valid UTC-dated Evidence values.",
    unchanged: "The state was already saved; no duplicate event was created.",
    approved: "The Evidence was approved with an immutable Audit event.",
    killSwitchConfirmation:
      "Activate the Kill Switch and immediately block campaign delivery for this Tenant?",
    killSwitchActivated: "The Kill Switch was activated and recorded in Audit.",
    backToAdmin: "Back to system administration",
    adminAriaLabel: "Connect — system administration",
    failClosed: "Fail-closed",
    eyebrow: "WhatsApp Safety",
    title: "Campaign delivery policy",
    description: (tenantId) =>
      `Approve expiring Evidence and operate the Kill Switch for Tenant #${tenantId}.`,
    secretWarning: "Do not enter Tokens, Secrets, or recipient phone numbers.",
    secretDescription:
      "This screen does not connect the Meta sender. Delivery remains blocked until separate connection and authorized WABA tests are complete.",
    connectionVersion: (version) => `Connection version ${version}`,
    currentConnection: "Current Meta connection",
    connectionIdentifiers: (portfolio, waba, phone) =>
      `Portfolio: ${portfolio} · WABA: ${waba} · Phone: ${phone}`,
    policyVersion: (version) => `Policy v${version}`,
    deliveryStates: {
      enabled: "Enabled",
      disabled: "Disabled",
    },
    evidenceExpires: (value) => `Evidence expires: ${value} UTC`,
    noPolicy: "No policy has been saved. The system fails closed without an active policy.",
    messagingLimit: "Messaging limit",
    chooseQuotaType: "Select quota type",
    boundedQuota: "Bounded quota",
    unlimitedQuota: "Unlimited",
    boundedQuotaValue: "Bounded quota value",
    chooseTier: "Select Tier",
    reservationDuration: "Reservation duration in seconds",
    graphApiVersion: "Meta Graph API version",
    evidenceDigest: "Evidence SHA-256 digest",
    evidenceCheckedAt: "Evidence checked at (UTC)",
    evidenceExpiresAt: "Evidence expires at (UTC)",
    concurrencyHelp: "Saving requires exact Connection and Policy versions.",
    saving: "Saving…",
    approvePolicy: "Approve Evidence and enable Policy",
    killSwitch: "Kill Switch",
    killSwitchDescription: "Creates a new disabled event without changing approved Evidence.",
    blockCampaigns: "Block campaign delivery",
  },
  ar: {
    locale: "ar",
    states: {
      "configuration-required": {
        title: "بيئة Admin غير معدّة",
        description:
          "أكمل إعداد Clerk وSystem Admin وD1 قبل إدارة سياسة الإرسال.",
      },
      unauthenticated: {
        title: "تسجيل الدخول مطلوب",
        description: "سجّل الدخول بهوية Clerk مخوّلة.",
      },
      "permission-denied": {
        title: "صلاحية System Admin مطلوبة",
        description:
          "لا يمكن تغيير السياسة إلا لهوية موجودة في قائمة السماح في الخادم.",
      },
      "not-found": {
        title: "اتصال Meta غير موجود",
        description:
          "لا يملك Tenant المحدد اتصال Meta لاشتقاق الهويات والإصدار منه.",
      },
      "server-error": {
        title: "تعذّر تحميل السياسة",
        description:
          "فشلت القراءة بصورة مغلقة ولا تُعرض قيم بديلة.",
      },
    },
    actionFailures: {
      "configuration-required": "إعداد System Admin غير مكتمل.",
      unauthenticated: "انتهت الجلسة. سجّل الدخول مجددًا.",
      "permission-denied": "لا تملك هذه الهوية صلاحية System Admin.",
      "invalid-input": "قيم Evidence أو السياسة غير صالحة أو منتهية.",
      "not-found": "اتصال Meta أو السياسة السابقة غير موجودين.",
      "connection-not-ready": "اتصال Meta ليس في حالة connected.",
      conflict: "تغيّر إصدار الاتصال أو السياسة. حدّث الصفحة قبل المتابعة.",
      "server-error": "فشل الإجراء ولم يُحفظ تغيير جزئي.",
    },
    invalidEvidence: "أكمل قيم Evidence صالحة ومؤرخة بتوقيت UTC.",
    unchanged: "الحالة محفوظة بالفعل؛ لم يُنشأ حدث مكرر.",
    approved: "اعتُمد Evidence مع حدث Audit غير قابل للتغيير.",
    killSwitchConfirmation:
      "هل تريد تفعيل Kill Switch وحظر إرسال الحملات فورًا لهذا Tenant؟",
    killSwitchActivated: "فُعّل Kill Switch وسُجل في Audit.",
    backToAdmin: "العودة إلى إدارة النظام",
    adminAriaLabel: "Connect — إدارة النظام",
    failClosed: "Fail-closed",
    eyebrow: "WhatsApp Safety",
    title: "سياسة إرسال الحملات",
    description: (tenantId) =>
      `اعتماد Evidence محدود الصلاحية وتشغيل Kill Switch لـTenant #${tenantId}.`,
    secretWarning: "لا تدخل Tokens أو Secrets أو أرقام هواتف المستلمين.",
    secretDescription:
      "هذه الشاشة لا تربط Meta sender. يبقى الإرسال محظورًا حتى إتمام اتصال منفصل واختبارات WABA مخوّلة.",
    connectionVersion: (version) => `Connection version ${version}`,
    currentConnection: "اتصال Meta الحالي",
    connectionIdentifiers: (portfolio, waba, phone) =>
      `Portfolio: ${portfolio} · WABA: ${waba} · Phone: ${phone}`,
    policyVersion: (version) => `Policy v${version}`,
    deliveryStates: {
      enabled: "مفعّلة",
      disabled: "محظورة",
    },
    evidenceExpires: (value) => `تنتهي صلاحية Evidence: ${value} UTC`,
    noPolicy: "لم تُحفظ سياسة بعد. يفشل النظام بصورة مغلقة دون سياسة نشطة.",
    messagingLimit: "Messaging limit",
    chooseQuotaType: "اختيار نوع الحصة",
    boundedQuota: "حصة محدودة",
    unlimitedQuota: "Unlimited",
    boundedQuotaValue: "قيمة الحصة المحدودة",
    chooseTier: "اختيار Tier",
    reservationDuration: "مدة Reservation بالثواني",
    graphApiVersion: "إصدار Meta Graph API",
    evidenceDigest: "بصمة Evidence ‏SHA-256",
    evidenceCheckedAt: "وقت فحص Evidence ‏(UTC)",
    evidenceExpiresAt: "وقت انتهاء Evidence ‏(UTC)",
    concurrencyHelp: "يتطلب الحفظ إصداري Connection وPolicy دقيقين.",
    saving: "جارٍ الحفظ…",
    approvePolicy: "اعتماد Evidence وتفعيل Policy",
    killSwitch: "Kill Switch",
    killSwitchDescription: "ينشئ حدث disabled جديدًا دون تغيير Evidence المعتمد.",
    blockCampaigns: "حظر إرسال الحملات",
  },
} as const satisfies Record<
  InterfaceLanguage,
  SystemAdminWhatsappPolicyMessages
>;

export function readSystemAdminWhatsappPolicyMessages(
  language: InterfaceLanguage,
): SystemAdminWhatsappPolicyMessages {
  return messages[language];
}
