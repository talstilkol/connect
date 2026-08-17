import type {
  MetaConnectionView,
  MetaConnectionViewStatus,
} from "../../shared/domain/metaConnectionView";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  readWorkspaceShellMessages,
} from "../../shared/i18n/workspace.ts";

export interface MetaConnectionPresentation {
  tone: "warning" | "critical" | "success";
  statusLabel: string;
  heading: string;
  description: string;
  actionLabel: string;
  panelNotice: string;
  setupComplete: boolean;
}

const presentations: Record<
  MetaConnectionViewStatus,
  MetaConnectionPresentation
> = {
  "configuration-required": {
    tone: "warning",
    statusLabel: "הגדרת Meta חסרה",
    heading: "נדרשת הגדרת Meta בצד השרת",
    description:
      "טרם הוגדרו App Secret ו־Webhook Verify Token בסביבת השרת.",
    actionLabel: "בדיקת דרישות",
    panelNotice:
      "לא ניתן לפתוח Embedded Signup עד שיוגדרו פרטי Meta App ומודל הפעילות.",
    setupComplete: false,
  },
  "onboarding-required": {
    tone: "warning",
    statusLabel: "נדרש Tenant",
    heading: "יש להשלים תחילה את הקמת העסק",
    description:
      "המשתמש המאומת עדיין אינו משויך ל־Tenant פעיל.",
    actionLabel: "הצגת מצב",
    panelNotice:
      "חיבור Meta דורש Tenant פעיל שנגזר מה־Session המאומת.",
    setupComplete: false,
  },
  "tenant-selection-required": {
    tone: "warning",
    statusLabel: "נדרשת בחירת Tenant",
    heading: "לא נבחרה סביבת עבודה",
    description:
      "המשתמש משויך למספר Tenants ואין לבחור אחד מהם אוטומטית.",
    actionLabel: "הצגת מצב",
    panelNotice:
      "יש לבחור Tenant במפורש לפני טעינה או שינוי של חיבור Meta.",
    setupComplete: false,
  },
  "permission-denied": {
    tone: "warning",
    statusLabel: "אין הרשאת ניהול",
    heading: "מצב Meta מוגן לפי תפקיד",
    description:
      "לתפקיד הנוכחי אין הרשאת workspace.manage לקריאת פרטי החיבור.",
    actionLabel: "הצגת מצב",
    panelNotice:
      "רק תפקיד בעל הרשאת ניהול סביבת העבודה רשאי לנהל את חיבור Meta.",
    setupComplete: false,
  },
  disconnected: {
    tone: "warning",
    statusLabel: "WhatsApp לא מחובר",
    heading: "חיבור רשמי ל־Meta WhatsApp Business",
    description:
      "לא נמצא Meta Connection עבור ה־Tenant המאומת.",
    actionLabel: "בדיקת דרישות",
    panelNotice:
      "לא קיים עדיין Snapshot מאומת של Business Portfolio, WABA ומספר Meta.",
    setupComplete: false,
  },
  pending: {
    tone: "warning",
    statusLabel: "Webhook בהמתנה",
    heading: "נכסי Meta נשמרו בצד השרת",
    description:
      "ה־Snapshot אומת, אך הרשמת ה־Webhook טרם אושרה ולכן החיבור עדיין אינו פעיל.",
    actionLabel: "הצגת מצב",
    panelNotice:
      "Business Portfolio, WABA ומספר Meta נשמרו; נדרש להשלים הרשמת Webhook.",
    setupComplete: false,
  },
  connected: {
    tone: "success",
    statusLabel: "WhatsApp מחובר",
    heading: "חיבור Meta פעיל",
    description:
      "הנכסים נשמרו בשרת והרשמת ה־Webhook אושרה עבור ה־Tenant.",
    actionLabel: "פרטי החיבור",
    panelNotice:
      "החיבור נשמר בשרת ומסומן כפעיל. Secrets ומזהי Meta אינם מוצגים בדפדפן.",
    setupComplete: true,
  },
  verification_required: {
    tone: "critical",
    statusLabel: "נדרש אימות Meta",
    heading: "החיבור דורש פעולה ב־Meta",
    description:
      "Meta Connection קיים, אך נדרש להשלים אימות לפני שניתן להפעיל שליחה.",
    actionLabel: "הצגת מצב",
    panelNotice:
      "נדרש להשלים אימות Meta. המערכת אינה מסמנת את החיבור כפעיל.",
    setupComplete: false,
  },
  revoked: {
    tone: "critical",
    statusLabel: "ההרשאה בוטלה",
    heading: "Meta ביטלה את החיבור",
    description:
      "החיבור השמור אינו מורשה עוד לפעול ודורש חיבור מחדש.",
    actionLabel: "הצגת מצב",
    panelNotice:
      "ההרשאה בוטלה. אין להשתמש ב־Credential הקודם לשליחה או לסנכרון.",
    setupComplete: false,
  },
  error: {
    tone: "critical",
    statusLabel: "שגיאת חיבור",
    heading: "חיבור Meta אינו פעיל",
    description:
      "נשמר מצב שגיאה בצד השרת והמערכת נשארת חסומה לשליחה.",
    actionLabel: "הצגת מצב",
    panelNotice:
      "השרת דיווח על שגיאת חיבור. אין מעבר שקט למצב מחובר.",
    setupComplete: false,
  },
  restricted: {
    tone: "critical",
    statusLabel: "חשבון Meta מוגבל",
    heading: "החיבור הוגבל על־ידי Meta",
    description:
      "החשבון אינו כשיר כעת לשליחה ודורש טיפול במצב ההגבלה.",
    actionLabel: "הצגת מצב",
    panelNotice:
      "מצב Restricted חוסם Send Readiness גם כאשר מזהי הנכסים שמורים.",
    setupComplete: false,
  },
  "server-error": {
    tone: "critical",
    statusLabel: "המצב אינו זמין",
    heading: "לא ניתן לטעון את חיבור Meta",
    description:
      "קריאת המצב הקבוע נכשלה; לא הוצג חיבור חלופי או מצב מדומה.",
    actionLabel: "הצגת מצב",
    panelNotice:
      "טעינת Meta Connection מהשרת נכשלה. יש לנסות שוב לאחר בדיקת התשתית.",
    setupComplete: false,
  },
};

type LocalizedMetaPresentationText = Pick<
  MetaConnectionPresentation,
  "heading" | "description" | "actionLabel" | "panelNotice"
>;

const localizedPresentationText = {
  en: {
    "configuration-required": {
      heading: "Server-side Meta configuration required",
      description:
        "The App Secret and Webhook Verify Token are not configured in the server environment.",
      actionLabel: "Review requirements",
      panelNotice:
        "Embedded Signup cannot start until the Meta App details and operating model are configured.",
    },
    "onboarding-required": {
      heading: "Complete the business setup first",
      description:
        "The verified user is not associated with an active tenant yet.",
      actionLabel: "View status",
      panelNotice:
        "A Meta connection requires an active tenant derived from the verified session.",
    },
    "tenant-selection-required": {
      heading: "No workspace is selected",
      description:
        "The user belongs to multiple tenants, so Connect will not choose one automatically.",
      actionLabel: "View status",
      panelNotice:
        "Select a tenant explicitly before loading or changing the Meta connection.",
    },
    "permission-denied": {
      heading: "Meta status is protected by role",
      description:
        "The current role lacks workspace.manage permission to read connection details.",
      actionLabel: "View status",
      panelNotice:
        "Only a role with workspace management permission can manage the Meta connection.",
    },
    disconnected: {
      heading: "Official Meta WhatsApp Business connection",
      description:
        "No Meta connection exists for the verified tenant.",
      actionLabel: "Review requirements",
      panelNotice:
        "There is no verified snapshot of the Business Portfolio, WABA, and Meta phone number yet.",
    },
    pending: {
      heading: "Meta assets are stored on the server",
      description:
        "The snapshot was verified, but the webhook subscription is not approved, so the connection is not active.",
      actionLabel: "View status",
      panelNotice:
        "The Business Portfolio, WABA, and Meta number are stored; webhook subscription remains required.",
    },
    connected: {
      heading: "Meta connection active",
      description:
        "The assets are stored on the server and the webhook subscription is approved for the tenant.",
      actionLabel: "Connection details",
      panelNotice:
        "The server marks this connection active. Secrets and Meta identifiers are not exposed in the browser.",
    },
    verification_required: {
      heading: "The connection requires action in Meta",
      description:
        "A Meta connection exists, but verification must finish before sending can be enabled.",
      actionLabel: "View status",
      panelNotice:
        "Meta verification is required. Connect does not mark this connection active.",
    },
    revoked: {
      heading: "Meta revoked the connection",
      description:
        "The stored connection is no longer authorized and must be connected again.",
      actionLabel: "View status",
      panelNotice:
        "Authorization was revoked. The previous credential must not be used for sending or synchronization.",
    },
    error: {
      heading: "Meta connection inactive",
      description:
        "The server stored an error state and sending remains blocked.",
      actionLabel: "View status",
      panelNotice:
        "The server reported a connection error. Connect does not silently treat it as connected.",
    },
    restricted: {
      heading: "Meta restricted the connection",
      description:
        "The account is currently ineligible to send and the restriction requires attention.",
      actionLabel: "View status",
      panelNotice:
        "Restricted status blocks send readiness even when asset identifiers are stored.",
    },
    "server-error": {
      heading: "Meta connection could not be loaded",
      description:
        "Reading the durable state failed; Connect did not show a fallback or simulated connection.",
      actionLabel: "View status",
      panelNotice:
        "The server could not load the Meta connection. Review the infrastructure before trying again.",
    },
  },
  ar: {
    "configuration-required": {
      heading: "إعداد Meta على الخادم مطلوب",
      description:
        "لم يتم إعداد App Secret وWebhook Verify Token في بيئة الخادم.",
      actionLabel: "مراجعة المتطلبات",
      panelNotice:
        "لا يمكن بدء Embedded Signup قبل إعداد بيانات تطبيق Meta ونموذج التشغيل.",
    },
    "onboarding-required": {
      heading: "أكمل إعداد النشاط أولاً",
      description:
        "المستخدم الموثق غير مرتبط بمؤسسة نشطة بعد.",
      actionLabel: "عرض الحالة",
      panelNotice:
        "يتطلب ربط Meta مؤسسة نشطة مستنتجة من الـSession الموثق.",
    },
    "tenant-selection-required": {
      heading: "لم يتم اختيار مساحة عمل",
      description:
        "ينتمي المستخدم إلى عدة مؤسسات، لذلك لن يختار Connect إحداها تلقائياً.",
      actionLabel: "عرض الحالة",
      panelNotice:
        "اختر مؤسسة بشكل صريح قبل تحميل ربط Meta أو تغييره.",
    },
    "permission-denied": {
      heading: "حالة Meta محمية حسب الدور",
      description:
        "لا يملك الدور الحالي صلاحية workspace.manage لقراءة تفاصيل الاتصال.",
      actionLabel: "عرض الحالة",
      panelNotice:
        "يمكن فقط لدور يملك صلاحية إدارة مساحة العمل إدارة ربط Meta.",
    },
    disconnected: {
      heading: "الربط الرسمي مع Meta WhatsApp Business",
      description:
        "لا يوجد ربط Meta للمؤسسة الموثقة.",
      actionLabel: "مراجعة المتطلبات",
      panelNotice:
        "لا توجد بعد لقطة موثقة لـBusiness Portfolio وWABA ورقم Meta.",
    },
    pending: {
      heading: "تم حفظ أصول Meta على الخادم",
      description:
        "تم التحقق من اللقطة، لكن اشتراك Webhook غير معتمد ولذلك الاتصال غير نشط.",
      actionLabel: "عرض الحالة",
      panelNotice:
        "تم حفظ Business Portfolio وWABA ورقم Meta؛ ولا يزال اشتراك Webhook مطلوباً.",
    },
    connected: {
      heading: "ربط Meta نشط",
      description:
        "تم حفظ الأصول على الخادم واعتماد اشتراك Webhook للمؤسسة.",
      actionLabel: "تفاصيل الاتصال",
      panelNotice:
        "يصنف الخادم الاتصال كنشط. لا تُعرض الأسرار أو معرفات Meta في المتصفح.",
    },
    verification_required: {
      heading: "يتطلب الاتصال إجراءً في Meta",
      description:
        "يوجد ربط Meta، لكن يجب إكمال التحقق قبل تفعيل الإرسال.",
      actionLabel: "عرض الحالة",
      panelNotice:
        "تحقق Meta مطلوب. لا يصنف Connect الاتصال كنشط.",
    },
    revoked: {
      heading: "ألغت Meta الاتصال",
      description:
        "لم يعد الاتصال المحفوظ مصرحاً ويجب ربطه من جديد.",
      actionLabel: "عرض الحالة",
      panelNotice:
        "تم إلغاء التفويض. يجب عدم استخدام بيانات الاعتماد السابقة للإرسال أو المزامنة.",
    },
    error: {
      heading: "ربط Meta غير نشط",
      description:
        "حفظ الخادم حالة خطأ ولا يزال الإرسال محظوراً.",
      actionLabel: "عرض الحالة",
      panelNotice:
        "أبلغ الخادم عن خطأ في الاتصال. لا يعامله Connect بصمت كاتصال نشط.",
    },
    restricted: {
      heading: "قيّدت Meta الاتصال",
      description:
        "الحساب غير مؤهل حالياً للإرسال ويتطلب القيد معالجة.",
      actionLabel: "عرض الحالة",
      panelNotice:
        "تحظر حالة Restricted جاهزية الإرسال حتى عند حفظ معرفات الأصول.",
    },
    "server-error": {
      heading: "تعذر تحميل ربط Meta",
      description:
        "فشلت قراءة الحالة الدائمة؛ لم يعرض Connect اتصالاً بديلاً أو وهمياً.",
      actionLabel: "عرض الحالة",
      panelNotice:
        "تعذر على الخادم تحميل ربط Meta. راجع البنية التحتية قبل المحاولة مجدداً.",
    },
  },
} as const satisfies Record<
  Exclude<InterfaceLanguage, "he">,
  Record<MetaConnectionViewStatus, LocalizedMetaPresentationText>
>;

export function presentMetaConnection(
  connection: MetaConnectionView,
  language: InterfaceLanguage = "he",
): MetaConnectionPresentation {
  const basePresentation = presentations[connection.status];

  if (language === "he") {
    return basePresentation;
  }

  return {
    ...basePresentation,
    ...localizedPresentationText[language][connection.status],
    statusLabel:
      readWorkspaceShellMessages(language).metaConnectionStatuses[
        connection.status
      ],
  };
}
