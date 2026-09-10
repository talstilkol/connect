import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";

type AiAgentPageMessages = {
  eyebrow: string;
  title: string;
  description: string;
  loading: string;
};

const messages = {
  he: {
    eyebrow: "מענה חכם",
    title: "סוכן AI",
    description:
      "הגדרת תפקיד, כללי מענה, מקורות ידע ומעבר בטוח לנציג אנושי — עם טיוטות ופרסום מבוקר.",
    loading: "טוען את סביבת סוכן ה־AI המאובטחת…",
  },
  en: {
    eyebrow: "Intelligent replies",
    title: "AI agent",
    description:
      "Define the role, reply policy, knowledge sources, and safe human handoff with controlled drafts and publishing.",
    loading: "Loading the secure AI agent workspace…",
  },
  ar: {
    eyebrow: "ردود ذكية",
    title: "وكيل AI",
    description:
      "تحديد الدور وسياسة الرد ومصادر المعرفة والتحويل الآمن إلى موظف، مع مسودات ونشر خاضع للرقابة.",
    loading: "جارٍ تحميل مساحة عمل وكيل AI الآمنة…",
  },
} satisfies Record<InterfaceLanguage, AiAgentPageMessages>;

export function readAiAgentPageMessages(
  language: InterfaceLanguage,
): AiAgentPageMessages {
  return messages[language];
}
