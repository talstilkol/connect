import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import type {
  TenantStatus,
} from "../../shared/domain/model.ts";
import type {
  SystemAdminTenantDirectoryStatus,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import type {
  SystemAdminTenantDirectoryActionResult,
} from "../../server/admin/systemAdminTenantDirectoryActionResult.ts";
import type {
  SystemAdminBusinessProfileActionResult,
} from "../../server/admin/systemAdminBusinessProfileActionResult.ts";
import type {
  SystemAdminSubscriptionActionResult,
} from "../../server/billing/systemAdminSubscriptionActionResult.ts";

type DirectoryState = Exclude<
  SystemAdminTenantDirectoryStatus,
  "ready"
>;

type DirectoryLoadFailure = Exclude<
  SystemAdminTenantDirectoryActionResult["status"],
  "loaded"
>;

type SubscriptionActionFailure = Exclude<
  SystemAdminSubscriptionActionResult["status"],
  "saved"
>;

type ProfileActionFailure = Exclude<
  SystemAdminBusinessProfileActionResult["status"],
  "saved"
>;

type SystemAdminTenantMessages = {
  locale: string;
  states: Record<
    DirectoryState,
    { title: string; description: string }
  >;
  directoryLoadFailures: Record<
    DirectoryLoadFailure,
    string
  >;
  subscriptionActionFailures: Record<
    SubscriptionActionFailure,
    string
  >;
  profileActionFailures: Record<
    ProfileActionFailure,
    string
  >;
  tenantStatuses: Record<TenantStatus, string>;
  backHome: string;
  homeAriaLabel: string;
  serverPermission: string;
  decisionsLink: string;
  workspaceLink: string;
  eyebrow: string;
  title: string;
  description: string;
  loadedTenants: string;
  withSubscription: string;
  activeSubscriptions: string;
  searchLabel: string;
  searchPlaceholder: string;
  tenantStatus: string;
  allStatuses: string;
  subscriptionRecord: string;
  allSubscriptionRecords: string;
  withSubscriptionFilter: string;
  withoutSubscriptionFilter: string;
  loadedResults: (count: number) => string;
  loading: string;
  searchAndFilter: string;
  clearFilters: string;
  noMatch: string;
  noTenants: string;
  filteredEmpty: string;
  unfilteredEmpty: string;
  tenantNumber: (tenantId: number) => string;
  whatsappPolicy: string;
  periodStart: string;
  periodEnd: string;
  version: string;
  lastUpdated: string;
  profileUpdated: string;
  profileUnchanged: string;
  invalidCreation: string;
  subscriptionCreated: string;
  invalidEndDate: string;
  subscriptionExtended: string;
  invalidOperationalStatus: string;
  subscriptionStatusUpdated: string;
  cancelConfirmation: (name: string) => string;
  subscriptionCancelled: string;
  extendPeriod: string;
  newEndDate: string;
  extendSubscription: string;
  operationalStatus: string;
  targetStatus: string;
  updateStatus: string;
  cancel: string;
  cancelDescription: string;
  cancelSubscription: string;
  createManualSubscription: string;
  tenantHasNoSubscription: string;
  initialStatus: string;
  periodStartUtc: string;
  periodEndUtc: string;
  createSubscription: string;
  loadMore: string;
  allLoaded: string;
};

const messages = {
  he: {
    locale: "he-IL",
    states: {
      "configuration-required": {
        title: "סביבת Admin אינה מוגדרת",
        description:
          "נדרשות תצורות Clerk, ‏System Admin ו־D1 מלאות לפני טעינת Tenants.",
      },
      unauthenticated: {
        title: "נדרשת התחברות",
        description:
          "יש להתחבר עם זהות Clerk מורשית לפני כניסה לסביבת Admin.",
      },
      "permission-denied": {
        title: "אין הרשאת System Admin",
        description:
          "הזהות המחוברת אינה נמצאת ב־Allowlist השרת של מנהלי המערכת.",
      },
      "server-error": {
        title: "לא ניתן לטעון את סביבת Admin",
        description:
          "הקריאה נכשלה באופן חסום. לא מוצגים נתונים חלופיים.",
      },
    },
    directoryLoadFailures: {
      "invalid-input": "פרטי החיפוש או הסינון אינם תקינים.",
      "permission-denied": "אין הרשאת System Admin.",
      unauthenticated: "ה־Session הסתיים. יש להתחבר מחדש.",
      "configuration-required": "תצורת System Admin אינה מלאה.",
      "server-error": "טעינת רשימת ה־Tenants נכשלה.",
    },
    subscriptionActionFailures: {
      "configuration-required": "תצורת System Admin אינה מלאה.",
      unauthenticated: "ה־Session הסתיים. יש להתחבר מחדש.",
      "permission-denied": "אין לזהות הנוכחית הרשאת System Admin.",
      "invalid-input": "פרטי הפעולה אינם תקינים.",
      "not-found": "ה־Tenant או המנוי אינם קיימים.",
      conflict: "המנוי השתנה מאז הטעינה. יש לרענן את הרשימה.",
      "invalid-transition": "המעבר המבוקש אינו מותר במצב הנוכחי.",
      "server-error": "הפעולה נכשלה בשרת ולא נשמר שינוי חלקי.",
    },
    profileActionFailures: {
      "configuration-required": "תצורת System Admin אינה מלאה.",
      unauthenticated: "ה־Session הסתיים. יש להתחבר מחדש.",
      "permission-denied": "אין לזהות הנוכחית הרשאת System Admin.",
      "invalid-input": "פרטי העסק אינם תקינים.",
      "not-found": "ה־Tenant או הפרופיל העסקי אינם קיימים.",
      conflict: "פרטי העסק השתנו מאז הטעינה. יש לרענן את הרשימה.",
      "server-error": "עדכון פרטי העסק נכשל ולא נשמר שינוי חלקי.",
    },
    tenantStatuses: {
      trial: "ניסיון",
      active: "פעיל",
      payment_failed: "כשל תשלום",
      suspended: "מושהה",
      cancelled: "מבוטל",
      expired: "פג תוקף",
      blocked: "חסום",
    },
    backHome: "חזרה לעמוד הראשי",
    homeAriaLabel: "Connect — עמוד ראשי",
    serverPermission: "הרשאת שרת פעילה",
    decisionsLink: "החלטות Production",
    workspaceLink: "סביבת לקוח",
    eyebrow: "ניהול מערכת",
    title: "Tenants ומנויים",
    description:
      "פעולות המנוי מתבצעות דרך System Admin Session ונרשמות אטומית ב־Audit Log.",
    loadedTenants: "Tenants שנטענו",
    withSubscription: "עם מנוי",
    activeSubscriptions: "מנויים פעילים",
    searchLabel: "חיפוש בכל ה־Tenants",
    searchPlaceholder: "שם Tenant או מזהה",
    tenantStatus: "מצב Tenant",
    allStatuses: "כל המצבים",
    subscriptionRecord: "רשומת מנוי",
    allSubscriptionRecords: "עם ובלי מנוי",
    withSubscriptionFilter: "עם מנוי",
    withoutSubscriptionFilter: "ללא מנוי",
    loadedResults: (count) => `${count} תוצאות נטענו`,
    loading: "טוען…",
    searchAndFilter: "חיפוש וסינון",
    clearFilters: "ניקוי סינון",
    noMatch: "לא נמצאה התאמה",
    noTenants: "אין Tenants להצגה",
    filteredEmpty: "ניתן לשנות או לנקות את הסינון כדי לחפש בכל הרשומות.",
    unfilteredEmpty: "D1 החזיר רשימה ריקה. לא נוספו נתוני תצוגה חלופיים.",
    tenantNumber: (tenantId) => `Tenant #${tenantId}`,
    whatsappPolicy: "מדיניות WhatsApp",
    periodStart: "תחילת תקופה",
    periodEnd: "סיום תקופה",
    version: "גרסה",
    lastUpdated: "עדכון אחרון",
    profileUpdated: "פרטי העסק עודכנו ונרשמו ב־Audit.",
    profileUnchanged: "פרטי העסק כבר היו מעודכנים; לא נוצר אירוע כפול.",
    invalidCreation: "יש לבחור תקופה ומצב התחלה תקינים.",
    subscriptionCreated: "המנוי נוצר ונרשם ב־Audit.",
    invalidEndDate: "יש לבחור תאריך סיום תקין.",
    subscriptionExtended: "תקופת המנוי הוארכה.",
    invalidOperationalStatus: "יש לבחור מצב תפעולי תקין.",
    subscriptionStatusUpdated: "מצב המנוי עודכן.",
    cancelConfirmation: (name) =>
      `לבטל את המנוי של ${name}? לא ניתן לבטל פעולה זו דרך המסך.`,
    subscriptionCancelled: "המנוי בוטל.",
    extendPeriod: "הארכת תקופה",
    newEndDate: "תאריך סיום חדש (UTC)",
    extendSubscription: "הארכת מנוי",
    operationalStatus: "מצב תפעולי",
    targetStatus: "מצב יעד",
    updateStatus: "עדכון מצב",
    cancel: "ביטול",
    cancelDescription: "ביטול הוא מצב סופי במסלול הידני.",
    cancelSubscription: "ביטול מנוי",
    createManualSubscription: "יצירת מנוי ידני",
    tenantHasNoSubscription: "אין ל־Tenant רשומת מנוי.",
    initialStatus: "מצב התחלה",
    periodStartUtc: "תחילת תקופה (UTC)",
    periodEndUtc: "סיום תקופה (UTC)",
    createSubscription: "יצירת מנוי",
    loadMore: "טעינת 50 Tenants נוספים",
    allLoaded: "כל ה־Tenants הזמינים נטענו.",
  },
  en: {
    locale: "en-US",
    states: {
      "configuration-required": {
        title: "Admin environment is not configured",
        description:
          "Complete Clerk, System Admin, and D1 configuration before loading Tenants.",
      },
      unauthenticated: {
        title: "Sign-in required",
        description:
          "Sign in with an authorized Clerk identity before entering the Admin environment.",
      },
      "permission-denied": {
        title: "System Admin permission required",
        description:
          "The signed-in identity is not in the server allowlist for system administrators.",
      },
      "server-error": {
        title: "Admin environment could not be loaded",
        description:
          "The read failed closed. No fallback data is displayed.",
      },
    },
    directoryLoadFailures: {
      "invalid-input": "The search or filter input is invalid.",
      "permission-denied": "System Admin permission is required.",
      unauthenticated: "The session ended. Sign in again.",
      "configuration-required": "System Admin configuration is incomplete.",
      "server-error": "The Tenant directory could not be loaded.",
    },
    subscriptionActionFailures: {
      "configuration-required": "System Admin configuration is incomplete.",
      unauthenticated: "The session ended. Sign in again.",
      "permission-denied": "This identity does not have System Admin permission.",
      "invalid-input": "The action details are invalid.",
      "not-found": "The Tenant or subscription does not exist.",
      conflict: "The subscription changed after loading. Refresh the directory.",
      "invalid-transition": "The requested transition is not allowed from the current state.",
      "server-error": "The action failed and no partial change was saved.",
    },
    profileActionFailures: {
      "configuration-required": "System Admin configuration is incomplete.",
      unauthenticated: "The session ended. Sign in again.",
      "permission-denied": "This identity does not have System Admin permission.",
      "invalid-input": "The business details are invalid.",
      "not-found": "The Tenant or Business Profile does not exist.",
      conflict: "The business details changed after loading. Refresh the directory.",
      "server-error": "Updating the business details failed with no partial change.",
    },
    tenantStatuses: {
      trial: "Trial",
      active: "Active",
      payment_failed: "Payment failed",
      suspended: "Suspended",
      cancelled: "Cancelled",
      expired: "Expired",
      blocked: "Blocked",
    },
    backHome: "Back to home",
    homeAriaLabel: "Connect — home",
    serverPermission: "Server authorization active",
    decisionsLink: "Production decisions",
    workspaceLink: "Customer workspace",
    eyebrow: "System administration",
    title: "Tenants and subscriptions",
    description:
      "Subscription actions use a System Admin Session and are recorded atomically in the Audit Log.",
    loadedTenants: "Loaded Tenants",
    withSubscription: "With subscription",
    activeSubscriptions: "Active subscriptions",
    searchLabel: "Search all Tenants",
    searchPlaceholder: "Tenant name or ID",
    tenantStatus: "Tenant status",
    allStatuses: "All statuses",
    subscriptionRecord: "Subscription record",
    allSubscriptionRecords: "With or without subscription",
    withSubscriptionFilter: "With subscription",
    withoutSubscriptionFilter: "Without subscription",
    loadedResults: (count) => `${count} results loaded`,
    loading: "Loading…",
    searchAndFilter: "Search and filter",
    clearFilters: "Clear filters",
    noMatch: "No match found",
    noTenants: "No Tenants to display",
    filteredEmpty: "Change or clear the filters to search all records.",
    unfilteredEmpty: "D1 returned an empty directory. No fallback display data was added.",
    tenantNumber: (tenantId) => `Tenant #${tenantId}`,
    whatsappPolicy: "WhatsApp policy",
    periodStart: "Period start",
    periodEnd: "Period end",
    version: "Version",
    lastUpdated: "Last updated",
    profileUpdated: "The business details were updated and recorded in Audit.",
    profileUnchanged: "The business details were already current; no duplicate event was created.",
    invalidCreation: "Select a valid period and initial status.",
    subscriptionCreated: "The subscription was created and recorded in Audit.",
    invalidEndDate: "Select a valid end date.",
    subscriptionExtended: "The subscription period was extended.",
    invalidOperationalStatus: "Select a valid operational status.",
    subscriptionStatusUpdated: "The subscription status was updated.",
    cancelConfirmation: (name) =>
      `Cancel the subscription for ${name}? This action cannot be undone from this screen.`,
    subscriptionCancelled: "The subscription was cancelled.",
    extendPeriod: "Extend period",
    newEndDate: "New end date (UTC)",
    extendSubscription: "Extend subscription",
    operationalStatus: "Operational status",
    targetStatus: "Target status",
    updateStatus: "Update status",
    cancel: "Cancellation",
    cancelDescription: "Cancellation is terminal in this manual flow.",
    cancelSubscription: "Cancel subscription",
    createManualSubscription: "Create manual subscription",
    tenantHasNoSubscription: "This Tenant has no subscription record.",
    initialStatus: "Initial status",
    periodStartUtc: "Period start (UTC)",
    periodEndUtc: "Period end (UTC)",
    createSubscription: "Create subscription",
    loadMore: "Load 50 more Tenants",
    allLoaded: "All available Tenants are loaded.",
  },
  ar: {
    locale: "ar",
    states: {
      "configuration-required": {
        title: "بيئة Admin غير معدّة",
        description:
          "أكمل إعداد Clerk وSystem Admin وD1 قبل تحميل Tenants.",
      },
      unauthenticated: {
        title: "تسجيل الدخول مطلوب",
        description:
          "سجّل الدخول بهوية Clerk مخوّلة قبل دخول بيئة Admin.",
      },
      "permission-denied": {
        title: "صلاحية System Admin مطلوبة",
        description:
          "الهوية المسجّلة ليست في قائمة السماح لمسؤولي النظام في الخادم.",
      },
      "server-error": {
        title: "تعذّر تحميل بيئة Admin",
        description:
          "فشلت القراءة بصورة مغلقة، ولا تُعرض بيانات بديلة.",
      },
    },
    directoryLoadFailures: {
      "invalid-input": "بيانات البحث أو التصفية غير صالحة.",
      "permission-denied": "صلاحية System Admin مطلوبة.",
      unauthenticated: "انتهت الجلسة. سجّل الدخول مجددًا.",
      "configuration-required": "إعداد System Admin غير مكتمل.",
      "server-error": "تعذّر تحميل دليل Tenants.",
    },
    subscriptionActionFailures: {
      "configuration-required": "إعداد System Admin غير مكتمل.",
      unauthenticated: "انتهت الجلسة. سجّل الدخول مجددًا.",
      "permission-denied": "لا تملك هذه الهوية صلاحية System Admin.",
      "invalid-input": "بيانات الإجراء غير صالحة.",
      "not-found": "الـTenant أو الاشتراك غير موجود.",
      conflict: "تغيّر الاشتراك بعد التحميل. حدّث الدليل.",
      "invalid-transition": "الانتقال المطلوب غير مسموح من الحالة الحالية.",
      "server-error": "فشل الإجراء ولم يُحفظ تغيير جزئي.",
    },
    profileActionFailures: {
      "configuration-required": "إعداد System Admin غير مكتمل.",
      unauthenticated: "انتهت الجلسة. سجّل الدخول مجددًا.",
      "permission-denied": "لا تملك هذه الهوية صلاحية System Admin.",
      "invalid-input": "بيانات النشاط التجاري غير صالحة.",
      "not-found": "الـTenant أو Business Profile غير موجود.",
      conflict: "تغيّرت بيانات النشاط بعد التحميل. حدّث الدليل.",
      "server-error": "فشل تحديث بيانات النشاط ولم يُحفظ تغيير جزئي.",
    },
    tenantStatuses: {
      trial: "تجريبي",
      active: "نشط",
      payment_failed: "فشل الدفع",
      suspended: "معلّق",
      cancelled: "ملغى",
      expired: "منتهي",
      blocked: "محظور",
    },
    backHome: "العودة إلى الصفحة الرئيسية",
    homeAriaLabel: "Connect — الصفحة الرئيسية",
    serverPermission: "صلاحية الخادم نشطة",
    decisionsLink: "قرارات Production",
    workspaceLink: "مساحة عمل العميل",
    eyebrow: "إدارة النظام",
    title: "Tenants والاشتراكات",
    description:
      "تستخدم إجراءات الاشتراك System Admin Session وتُسجّل ذريًا في Audit Log.",
    loadedTenants: "Tenants المحمّلة",
    withSubscription: "مع اشتراك",
    activeSubscriptions: "الاشتراكات النشطة",
    searchLabel: "البحث في جميع Tenants",
    searchPlaceholder: "اسم Tenant أو المعرّف",
    tenantStatus: "حالة Tenant",
    allStatuses: "جميع الحالات",
    subscriptionRecord: "سجل الاشتراك",
    allSubscriptionRecords: "مع اشتراك أو بدونه",
    withSubscriptionFilter: "مع اشتراك",
    withoutSubscriptionFilter: "دون اشتراك",
    loadedResults: (count) => `تم تحميل ${count} نتائج`,
    loading: "جارٍ التحميل…",
    searchAndFilter: "بحث وتصفية",
    clearFilters: "مسح عوامل التصفية",
    noMatch: "لا توجد نتيجة مطابقة",
    noTenants: "لا توجد Tenants للعرض",
    filteredEmpty: "غيّر عوامل التصفية أو امسحها للبحث في جميع السجلات.",
    unfilteredEmpty: "أعاد D1 دليلًا فارغًا. لم تُضف بيانات عرض بديلة.",
    tenantNumber: (tenantId) => `Tenant #${tenantId}`,
    whatsappPolicy: "سياسة WhatsApp",
    periodStart: "بداية الفترة",
    periodEnd: "نهاية الفترة",
    version: "الإصدار",
    lastUpdated: "آخر تحديث",
    profileUpdated: "حُدّثت بيانات النشاط وسُجلت في Audit.",
    profileUnchanged: "بيانات النشاط محدثة بالفعل؛ لم يُنشأ حدث مكرر.",
    invalidCreation: "اختر فترة وحالة بداية صالحتين.",
    subscriptionCreated: "أُنشئ الاشتراك وسُجل في Audit.",
    invalidEndDate: "اختر تاريخ نهاية صالحًا.",
    subscriptionExtended: "مُددت فترة الاشتراك.",
    invalidOperationalStatus: "اختر حالة تشغيل صالحة.",
    subscriptionStatusUpdated: "حُدثت حالة الاشتراك.",
    cancelConfirmation: (name) =>
      `هل تريد إلغاء اشتراك ${name}؟ لا يمكن التراجع عن الإجراء من هذه الشاشة.`,
    subscriptionCancelled: "أُلغي الاشتراك.",
    extendPeriod: "تمديد الفترة",
    newEndDate: "تاريخ النهاية الجديد (UTC)",
    extendSubscription: "تمديد الاشتراك",
    operationalStatus: "حالة التشغيل",
    targetStatus: "الحالة المطلوبة",
    updateStatus: "تحديث الحالة",
    cancel: "الإلغاء",
    cancelDescription: "الإلغاء حالة نهائية في هذا المسار اليدوي.",
    cancelSubscription: "إلغاء الاشتراك",
    createManualSubscription: "إنشاء اشتراك يدوي",
    tenantHasNoSubscription: "لا يملك هذا Tenant سجل اشتراك.",
    initialStatus: "حالة البداية",
    periodStartUtc: "بداية الفترة (UTC)",
    periodEndUtc: "نهاية الفترة (UTC)",
    createSubscription: "إنشاء الاشتراك",
    loadMore: "تحميل 50 Tenant إضافية",
    allLoaded: "تم تحميل جميع Tenants المتاحة.",
  },
} as const satisfies Record<
  InterfaceLanguage,
  SystemAdminTenantMessages
>;

export function readSystemAdminTenantMessages(
  language: InterfaceLanguage,
): SystemAdminTenantMessages {
  return messages[language];
}
