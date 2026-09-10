import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";

export interface WorkspaceSetupStep {
  title: string;
  description: string;
}

const setupStepsByLanguage = Object.freeze({
  he: Object.freeze([
    { title: "פרטי העסק", description: "שם, אזור זמן ושפת הממשק" },
    { title: "חיבור Meta", description: "Business Portfolio ו־WhatsApp Business" },
    { title: "בחירת חשבון WhatsApp", description: "בחירת WABA מאושר" },
    { title: "חיבור מספר טלפון", description: "אימות ושמירת מצב החיבור" },
    { title: "שם תצוגה", description: "השם שיוצג ללקוחות ב־WhatsApp" },
    { title: "תבנית ראשונה", description: "יצירה ושליחה לאישור Meta" },
    { title: "אנשי קשר", description: "ייבוא CSV או Excel ובדיקת הסכמה" },
    { title: "בוט או AI", description: "בחירת מסלול המענה הראשוני" },
    { title: "שליחת ניסיון", description: "בדיקת תהליך מקצה לקצה" },
    { title: "הפעלת סביבת העבודה", description: "מעבר ממצב הקמה למצב פעיל" },
  ]),
  en: Object.freeze([
    { title: "Business profile", description: "Name, time zone, and interface language" },
    { title: "Connect Meta", description: "Business Portfolio and WhatsApp Business" },
    { title: "Select WhatsApp account", description: "Select an approved WABA" },
    { title: "Connect phone number", description: "Verify and save the connection state" },
    { title: "Display name", description: "The name customers see in WhatsApp" },
    { title: "First template", description: "Create and submit for Meta approval" },
    { title: "Contacts", description: "Import CSV or Excel and verify consent" },
    { title: "Bot or AI", description: "Choose the initial response path" },
    { title: "Test message", description: "Verify the complete end-to-end flow" },
    { title: "Activate workspace", description: "Move from setup to active state" },
  ]),
  ar: Object.freeze([
    { title: "بيانات النشاط", description: "الاسم والمنطقة الزمنية ولغة الواجهة" },
    { title: "ربط Meta", description: "Business Portfolio وWhatsApp Business" },
    { title: "اختيار حساب WhatsApp", description: "اختيار WABA معتمد" },
    { title: "ربط رقم الهاتف", description: "التحقق من حالة الاتصال وحفظها" },
    { title: "اسم العرض", description: "الاسم الذي يراه العملاء في WhatsApp" },
    { title: "القالب الأول", description: "إنشاؤه وإرساله لاعتماد Meta" },
    { title: "جهات الاتصال", description: "استيراد CSV أو Excel والتحقق من الموافقة" },
    { title: "البوت أو AI", description: "اختيار مسار الرد الأولي" },
    { title: "رسالة اختبار", description: "فحص المسار الكامل من البداية إلى النهاية" },
    { title: "تفعيل مساحة العمل", description: "الانتقال من الإعداد إلى الحالة النشطة" },
  ]),
} satisfies Record<
  InterfaceLanguage,
  readonly WorkspaceSetupStep[]
>);

export const workspaceSetupSteps = setupStepsByLanguage.he;

export function readWorkspaceSetupSteps(
  language: InterfaceLanguage,
): readonly WorkspaceSetupStep[] {
  return setupStepsByLanguage[language];
}
