import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";

type SystemAdminBusinessProfileMessages = {
  missingTitle: string;
  missingDescription: string;
  title: string;
  version: (
    version: number,
    updatedAt: string,
  ) => string;
  audit: string;
  businessName: string;
  timezone: string;
  interfaceLanguage: string;
  languageLabels: Record<
    InterfaceLanguage,
    string
  >;
  save: string;
};

const messages = {
  he: {
    missingTitle: "פרופיל עסקי חסר",
    missingDescription:
      "אין רשומת Business Profile לעריכה. יצירת פרופיל בשם הלקוח אינה חלק מפעולת Admin זו.",
    title: "פרטי העסק",
    version: (version, updatedAt) =>
      `גרסה ${version} · עודכן ${updatedAt}`,
    audit: "Audit אטומי",
    businessName: "שם העסק",
    timezone: "אזור זמן IANA",
    interfaceLanguage: "שפת ממשק",
    languageLabels: {
      he: "עברית",
      en: "אנגלית",
      ar: "ערבית",
    },
    save: "שמירת פרטי העסק",
  },
  en: {
    missingTitle: "Business profile missing",
    missingDescription:
      "There is no Business Profile record to edit. Creating a profile on the customer's behalf is outside this Admin action.",
    title: "Business details",
    version: (version, updatedAt) =>
      `Version ${version} · updated ${updatedAt}`,
    audit: "Atomic audit",
    businessName: "Business name",
    timezone: "IANA time zone",
    interfaceLanguage: "Interface language",
    languageLabels: {
      he: "Hebrew",
      en: "English",
      ar: "Arabic",
    },
    save: "Save business details",
  },
  ar: {
    missingTitle: "الملف التجاري مفقود",
    missingDescription:
      "لا يوجد سجل Business Profile لتعديله. إنشاء ملف نيابة عن العميل ليس جزءًا من إجراء Admin هذا.",
    title: "بيانات النشاط التجاري",
    version: (version, updatedAt) =>
      `الإصدار ${version} · آخر تحديث ${updatedAt}`,
    audit: "Audit ذري",
    businessName: "اسم النشاط التجاري",
    timezone: "المنطقة الزمنية IANA",
    interfaceLanguage: "لغة الواجهة",
    languageLabels: {
      he: "العبرية",
      en: "الإنجليزية",
      ar: "العربية",
    },
    save: "حفظ بيانات النشاط التجاري",
  },
} as const satisfies Record<
  InterfaceLanguage,
  SystemAdminBusinessProfileMessages
>;

export function readSystemAdminBusinessProfileMessages(
  language: InterfaceLanguage,
): SystemAdminBusinessProfileMessages {
  return messages[language];
}
