import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";

interface CampaignPageMessages {
  eyebrow: string;
  title: string;
  description: string;
  loading: string;
}

const messages = {
  he: {
    eyebrow: "שליחה ותזמון",
    title: "קמפיינים",
    description:
      "הכנת טיוטה, בחירת מועד ובדיקת התנאים הנדרשים לפני שליחה.",
    loading: "מסך הקמפיינים נטען…",
  },
  en: {
    eyebrow: "Delivery and scheduling",
    title: "Campaigns",
    description:
      "Prepare a draft, select a delivery time, and verify every requirement before sending.",
    loading: "Loading campaigns…",
  },
  ar: {
    eyebrow: "الإرسال والجدولة",
    title: "الحملات",
    description:
      "إعداد مسودة واختيار موعد والتحقق من جميع المتطلبات قبل الإرسال.",
    loading: "جارٍ تحميل الحملات…",
  },
} satisfies Record<InterfaceLanguage, CampaignPageMessages>;

export function readCampaignPageMessages(
  language: InterfaceLanguage,
): CampaignPageMessages {
  return messages[language];
}
