import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft.ts";
import type { MetaDataSyncViewRequestStatus, MetaDataSyncViewStage } from "../../shared/domain/metaDataSyncView.ts";
interface Messages {
  title: string;
  contacts: string;
  history: string;
  providerProgress: string;
  chunks: string;
  projectedMessages: string;
  refresh: string;
  verificationNotice: string;
  recoveryNotice: string;
  stages: Record<MetaDataSyncViewStage, string>;
  requests: Record<MetaDataSyncViewRequestStatus, string>;
}
const messages: Record<InterfaceLanguage, Messages> = {
  he: {
    title: "סנכרון WhatsApp", contacts: "בקשת אנשי קשר", history: "בקשת היסטוריה", providerProgress: "התקדמות שדווחה מ־WhatsApp",
    chunks: "חלקים שעובדו מתוך החלקים שהתקבלו", projectedMessages: "הודעות היסטוריות שעובדו", refresh: "רענון מצב",
    verificationNotice: "ההתקדמות מתייחסת לנתונים שהתקבלו עד כה. השלמת כל הנתונים והמדיה עדיין דורשת אימות.",
    recoveryNotice: "נדרש טיפול לפני ניסיון סנכרון נוסף. אין שליחה חוזרת אוטומטית. לפי Meta, חזרה על הסנכרון דורשת ניתוק ב־WhatsApp Business והרשמה מחדש; מסלול החידוש ב־Connect עדיין אינו זמין.",
    stages: { "awaiting-worker": "ההרשמה נשמרה; ממתין לתחילת הסנכרון ברקע", "awaiting-registration": "ממתין להשלמת הרשמה", "ready-to-request": "בקשות הסנכרון מוכנות", "requesting-contacts": "ממתין לתוצאת בקשת אנשי הקשר",
      "requesting-history": "ממתין להיסטוריה", "receiving-history": "מקבל היסטוריה", "projecting-history": "מעבד הודעות להצגה בתיבת השיחות",
      "awaiting-verification": "הנתונים שהתקבלו עובדו; השלמות טרם אומתה", "sharing-declined": "שיתוף ההיסטוריה נדחה", "recovery-required": "הסנכרון דורש טיפול",
      "connection-changed": "החיבור השתנה או בוטל", conflicted: "נמצאו נתונים סותרים; ההיסטוריה מוסתרת" },
    requests: { "not-prepared": "טרם הוכנה", prepared: "מוכנה", dispatching: "השליחה התחילה; התוצאה טרם נשמרה", accepted: "הבקשה התקבלה", unknown: "תוצאה לא ידועה", rejected: "נדחתה", expired: "פג חלון ההפעלה", cancelled: "בוטלה" },
  },
  en: {
    title: "WhatsApp synchronization", contacts: "Contacts request", history: "History request", providerProgress: "Progress reported by WhatsApp",
    chunks: "Processed chunks out of received chunks", projectedMessages: "Historical messages processed", refresh: "Refresh status",
    verificationNotice: "Progress covers data received so far. Completeness of all data and media still requires verification.",
    recoveryNotice: "Review is required before another sync attempt. Requests are not retried automatically. Meta requires disconnecting in WhatsApp Business and onboarding again to repeat synchronization; renewal in Connect is not available yet.",
    stages: { "awaiting-worker": "Onboarding saved; waiting for background synchronization", "awaiting-registration": "Waiting for onboarding", "ready-to-request": "Sync requests prepared", "requesting-contacts": "Waiting for the contacts request result",
      "requesting-history": "Waiting for history", "receiving-history": "Receiving history", "projecting-history": "Processing messages for the inbox",
      "awaiting-verification": "Received data processed; completeness unverified", "sharing-declined": "History sharing declined", "recovery-required": "Synchronization needs attention",
      "connection-changed": "Connection changed or revoked", conflicted: "Conflicting data found; history hidden" },
    requests: { "not-prepared": "Not prepared", prepared: "Prepared", dispatching: "Dispatch started; result not persisted", accepted: "Request accepted", unknown: "Result unknown", rejected: "Rejected", expired: "Initiation window expired", cancelled: "Cancelled" },
  },
  ar: {
    title: "مزامنة WhatsApp", contacts: "طلب جهات الاتصال", history: "طلب السجل", providerProgress: "التقدم الذي أبلغ عنه WhatsApp",
    chunks: "الأجزاء المعالجة من الأجزاء المستلمة", projectedMessages: "رسائل السجل التي تمت معالجتها", refresh: "تحديث الحالة",
    verificationNotice: "يشمل التقدم البيانات المستلمة حتى الآن. لا يزال اكتمال البيانات والوسائط بحاجة إلى التحقق.",
    recoveryNotice: "يلزم فحص الحالة قبل محاولة مزامنة أخرى. لا تتم إعادة الطلب تلقائيًا. تشترط Meta قطع الاتصال في WhatsApp Business وإعادة التسجيل لتكرار المزامنة؛ التجديد في Connect غير متاح بعد.",
    stages: { "awaiting-worker": "تم حفظ التسجيل؛ في انتظار بدء المزامنة في الخلفية", "awaiting-registration": "بانتظار إكمال التسجيل", "ready-to-request": "طلبات المزامنة جاهزة", "requesting-contacts": "بانتظار نتيجة طلب جهات الاتصال",
      "requesting-history": "بانتظار السجل", "receiving-history": "جارٍ استلام السجل", "projecting-history": "جارٍ معالجة الرسائل لعرضها في صندوق المحادثات",
      "awaiting-verification": "تمت معالجة البيانات المستلمة؛ لم يتم التحقق من اكتمالها", "sharing-declined": "تم رفض مشاركة السجل", "recovery-required": "المزامنة تحتاج إلى متابعة",
      "connection-changed": "تغير الاتصال أو تم إلغاؤه", conflicted: "تم العثور على بيانات متعارضة؛ السجل مخفي" },
    requests: { "not-prepared": "لم يتم الإعداد", prepared: "جاهز", dispatching: "بدأ الإرسال؛ لم تُحفظ النتيجة بعد", accepted: "تم قبول الطلب", unknown: "النتيجة غير معروفة", rejected: "مرفوض", expired: "انتهت مهلة البدء", cancelled: "ملغى" },
  },
};
export function readMetaDataSyncMessages(language: InterfaceLanguage): Readonly<Messages> { return messages[language]; }
