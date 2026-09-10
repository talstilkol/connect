import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";

type ConversationPageMessages = {
  eyebrow: string;
  title: string;
  description: string;
  loading: string;
};

const messages = {
  he: {
    eyebrow: "שירות לקוחות",
    title: "תיבת שיחות",
    description:
      "כל ההודעות הנכנסות, הקצאה לנציג ומעבר מבוט לאדם במקום אחד.",
    loading: "טוען את תיבת השיחות המאובטחת…",
  },
  en: {
    eyebrow: "Customer service",
    title: "Conversation inbox",
    description:
      "Incoming messages, agent assignment, and bot-to-human handoff in one place.",
    loading: "Loading the secure conversation inbox…",
  },
  ar: {
    eyebrow: "خدمة العملاء",
    title: "صندوق المحادثات",
    description:
      "الرسائل الواردة وتعيين الموظف والتحويل من البوت إلى الإنسان في مكان واحد.",
    loading: "جارٍ تحميل صندوق المحادثات الآمن…",
  },
} satisfies Record<
  InterfaceLanguage,
  ConversationPageMessages
>;

export function readConversationPageMessages(
  language: InterfaceLanguage,
): ConversationPageMessages {
  return messages[language];
}
