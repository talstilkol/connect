import type {
  MetaConnectionView,
  MetaConnectionViewStatus,
} from "../../shared/domain/metaConnectionView";

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

export function presentMetaConnection(
  connection: MetaConnectionView,
): MetaConnectionPresentation {
  return presentations[connection.status];
}
