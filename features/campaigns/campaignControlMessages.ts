import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft";
import type { CampaignControlAction } from "../../shared/domain/campaignControl";
import type { ControlCampaignActionResult } from "../../server/campaigns/campaignActionResult";

type ControlMessages = {
  actions: Record<CampaignControlAction, string>;
  notice: string;
  refresh: string;
  results: Record<ControlCampaignActionResult["status"], string>;
};
export const campaignControlMessages: Record<InterfaceLanguage, ControlMessages> = {
  he: {
    actions: { pause: "השהיה", resume: "חידוש", cancel: "ביטול הקמפיין" },
    notice: "השהיה וביטול עוצרים הודעות שטרם החלו להישלח. שליחות שכבר התחילו עשויות להשלים. ביטול הוא סופי. העובד בודק הודעות שהושהו במחזור של כ־30 שניות. עומס תור או המתנת ספק עשויים לעכב את החידוש.",
    refresh: "רענון מצב",
    results: {
      controlled: "מצב הקמפיין עודכן.",
      "state-conflict": "הקמפיין השתנה. רעננו את המצב לפני פעולה נוספת.",
      "delivery-configuration-required": "חידוש דורש השלמת הגדרת השליחה.",
      "invalid-input": "פרטי הפעולה אינם תקינים.",
      "configuration-required": "החיבור לשרת אינו מוגדר.",
      unauthenticated: "יש להתחבר מחדש.",
      "onboarding-required": "יש להשלים את פתיחת סביבת העבודה.",
      "tenant-selection-required": "יש לבחור סביבת עבודה.",
      "permission-denied": "אין הרשאה לשינוי הקמפיין.",
      "server-error": "לא התקבל אישור מהשרת. אפשר לחזור על אותה פעולה; בקשה חוזרת לא תבצע אותה פעמיים.",
    },
  },
  en: {
    actions: { pause: "Pause", resume: "Resume", cancel: "Cancel campaign" },
    notice: "Pause and cancel stop messages whose send has not started. In-flight sends may finish. Cancellation is final. The worker checks paused messages about every 30 seconds. Queue load or provider cooldowns may delay resumption.",
    refresh: "Refresh status",
    results: {
      controlled: "Campaign status updated.",
      "state-conflict": "The campaign changed. Refresh its status before another action.",
      "delivery-configuration-required": "Complete delivery configuration before resuming.",
      "invalid-input": "The action details are invalid.",
      "configuration-required": "The server connection is not configured.",
      unauthenticated: "Sign in again.",
      "onboarding-required": "Complete workspace setup.",
      "tenant-selection-required": "Select a workspace.",
      "permission-denied": "You cannot change this campaign.",
      "server-error": "The server did not confirm the result. You can repeat the same action; a retry will not apply it twice.",
    },
  },
  ar: {
    actions: { pause: "إيقاف مؤقت", resume: "استئناف", cancel: "إلغاء الحملة" },
    notice: "يوقف الإيقاف المؤقت والإلغاء الرسائل التي لم يبدأ إرسالها. قد تكتمل عمليات الإرسال الجارية. الإلغاء نهائي. يفحص العامل الرسائل الموقوفة مؤقتًا كل نحو 30 ثانية. قد يؤدي ضغط قائمة الانتظار أو مهلة المزوّد إلى تأخير الاستئناف.",
    refresh: "تحديث الحالة",
    results: {
      controlled: "تم تحديث حالة الحملة.",
      "state-conflict": "تغيّرت الحملة. حدّث الحالة قبل إجراء آخر.",
      "delivery-configuration-required": "أكمل إعداد الإرسال قبل الاستئناف.",
      "invalid-input": "تفاصيل الإجراء غير صالحة.",
      "configuration-required": "اتصال الخادم غير مُعدّ.",
      unauthenticated: "سجّل الدخول مجددًا.",
      "onboarding-required": "أكمل إعداد مساحة العمل.",
      "tenant-selection-required": "اختر مساحة عمل.",
      "permission-denied": "ليست لديك صلاحية لتغيير الحملة.",
      "server-error": "لم يؤكد الخادم النتيجة. يمكنك تكرار الإجراء نفسه؛ لن يُنفّذ مرتين.",
    },
  },
};
