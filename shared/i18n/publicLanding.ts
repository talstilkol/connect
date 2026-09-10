import type {
  InterfaceLanguage,
} from "../domain/businessProfileDraft";

export type TextDirection = "rtl" | "ltr";

export interface PublicLandingMessages {
  metadata: {
    title: string;
    description: string;
  };
  skipLink: string;
  homeAriaLabel: string;
  publicNavigationAriaLabel: string;
  languageSelectorAriaLabel: string;
  trustPrinciplesAriaLabel: string;
  navigation: {
    capabilities: string;
    architecture: string;
    pricing: string;
  };
  authentication: {
    signIn: string;
    register: string;
  };
  hero: {
    badge: string;
    title: string;
    emphasis: string;
    description: string;
    workspaceAction: string;
    architectureAction: string;
    disclaimer: string;
    productMapAriaLabel: string;
    communicationHub: string;
    mapNodes: readonly [
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
    ];
  };
  trustPrinciples: readonly [
    string,
    string,
    string,
    string,
    string,
  ];
  capabilities: {
    eyebrow: string;
    title: string;
    description: string;
    items: readonly [
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
    ];
  };
  architecture: {
    eyebrow: string;
    title: string;
    description: string;
    steps: readonly [
      string,
      string,
      string,
      string,
      string,
    ];
  };
  pricing: {
    status: string;
    title: string;
    description: string;
    action: string;
  };
  footerDescription: string;
}

export const publicLandingLocales = [
  {
    language: "he",
    nativeName: "עברית",
    href: "/",
    direction: "rtl",
  },
  {
    language: "en",
    nativeName: "English",
    href: "/en",
    direction: "ltr",
  },
  {
    language: "ar",
    nativeName: "العربية",
    href: "/ar",
    direction: "rtl",
  },
] as const satisfies readonly {
  language: InterfaceLanguage;
  nativeName: string;
  href: string;
  direction: TextDirection;
}[];

export const publicLandingMessages = {
  he: {
    metadata: {
      title: "Connect | WhatsApp Business Platform",
      description:
        "מערכת SaaS לניהול WhatsApp Business רשמי, קמפיינים, שיחות, בוטים וסוכני AI.",
    },
    skipLink: "דילוג לתוכן הראשי",
    homeAriaLabel: "Connect - עמוד הבית",
    publicNavigationAriaLabel: "ניווט ציבורי",
    languageSelectorAriaLabel: "בחירת שפת הממשק",
    trustPrinciplesAriaLabel: "עקרונות המערכת",
    navigation: {
      capabilities: "יכולות",
      architecture: "איך זה עובד",
      pricing: "חבילות",
    },
    authentication: {
      signIn: "התחברות",
      register: "פתיחת חשבון",
    },
    hero: {
      badge: "מבוסס Meta Cloud API הרשמי",
      title: "מנהלים WhatsApp עסקי",
      emphasis: "בצורה מסודרת.",
      description:
        "פלטפורמת React לניהול אנשי קשר, תבניות, קמפיינים, שיחות, תהליכי בוט וסוכן AI — עם הפרדה מלאה בין לקוחות.",
      workspaceAction: "כניסה לסביבת ההקמה",
      architectureAction: "הצגת מבנה המערכת",
      disclaimer:
        "סביבת ההקמה אינה מחוברת עדיין ל־Meta, סליקה או ספק AI.",
      productMapAriaLabel: "מפת יכולות המוצר",
      communicationHub: "מרכז התקשורת",
      mapNodes: [
        { title: "Meta", description: "חיבור רשמי" },
        { title: "Campaigns", description: "שליחה ותזמון" },
        { title: "Inbox", description: "בוט ונציג" },
        { title: "AI", description: "ידע עסקי" },
      ],
    },
    trustPrinciples: [
      "Multi-Tenant",
      "Queue-based Sending",
      "Webhook Idempotency",
      "Consent First",
      "Audit Log",
    ],
    capabilities: {
      eyebrow: "יכולות הליבה",
      title: "מסלול אחד מהחיבור ועד לדוח.",
      description:
        "כל רכיב מקבל גבול אחריות ברור, כדי שהמערכת תוכל לגדול בלי לחזור למבנה המונוליטי של Connect הישן.",
      items: [
        {
          title: "קמפיינים רשמיים",
          description:
            "תבניות מאושרות, קהל עם הסכמה, תזמון ומעקב אחר מסירה.",
        },
        {
          title: "שירות במקום אחד",
          description:
            "תיבת שיחות מרכזית, הקצאה לנציג ומעבר בטוח מהבוט לאדם.",
        },
        {
          title: "אוטומציה מבוקרת",
          description:
            "Flow Builder, מאגר ידע ו־AI עם גבולות עלות וביטחון.",
        },
      ],
    },
    architecture: {
      eyebrow: "זרימת מערכת",
      title: "React מנהל את הממשק. ה־Backend שומר על הגבולות.",
      description:
        "סודות, Webhooks, הרשאות ופעולות שליחה אינם רצים בדפדפן. React מתקשר עם Backend מאובטח, וה־Backend מפעיל Adapters לספקים.",
      steps: [
        "חיבור Meta",
        "אישור תבנית",
        "קהל עם הסכמה",
        "שליחה דרך Queue",
        "דוח מסירה",
      ],
    },
    pricing: {
      status: "החלטה עסקית פתוחה",
      title: "החבילות והמחירים טרם הוגדרו.",
      description:
        "לא מוצגים מחירים או מגבלות מומצאים. לאחר החלטת מוצר יוגדרו מספר משתמשים, מספרי WhatsApp, אנשי קשר, הודעות וצריכת AI לכל חבילה.",
      action: "מעבר למרכז ההחלטות",
    },
    footerDescription:
      "מערכת WhatsApp Business SaaS מבוססת React.",
  },
  en: {
    metadata: {
      title: "Connect | WhatsApp Business Platform",
      description:
        "A SaaS platform for official WhatsApp Business operations, campaigns, conversations, bots, and AI agents.",
    },
    skipLink: "Skip to main content",
    homeAriaLabel: "Connect - home page",
    publicNavigationAriaLabel: "Public navigation",
    languageSelectorAriaLabel: "Select interface language",
    trustPrinciplesAriaLabel: "System principles",
    navigation: {
      capabilities: "Capabilities",
      architecture: "How it works",
      pricing: "Plans",
    },
    authentication: {
      signIn: "Sign in",
      register: "Create account",
    },
    hero: {
      badge: "Built on the official Meta Cloud API",
      title: "Manage business WhatsApp",
      emphasis: "with control.",
      description:
        "A React platform for managing contacts, templates, campaigns, conversations, bot flows, and an AI agent — with complete tenant isolation.",
      workspaceAction: "Open the setup workspace",
      architectureAction: "View the system architecture",
      disclaimer:
        "The setup environment is not yet connected to Meta, billing, or an AI provider.",
      productMapAriaLabel: "Product capability map",
      communicationHub: "Communication hub",
      mapNodes: [
        { title: "Meta", description: "Official connection" },
        { title: "Campaigns", description: "Send and schedule" },
        { title: "Inbox", description: "Bot and agent" },
        { title: "AI", description: "Business knowledge" },
      ],
    },
    trustPrinciples: [
      "Multi-Tenant",
      "Queue-based Sending",
      "Webhook Idempotency",
      "Consent First",
      "Audit Log",
    ],
    capabilities: {
      eyebrow: "Core capabilities",
      title: "One path from connection to delivery report.",
      description:
        "Each component has a clear responsibility boundary, so the system can grow without returning to the monolithic structure of the old Connect.",
      items: [
        {
          title: "Official campaigns",
          description:
            "Approved templates, consented audiences, scheduling, and delivery tracking.",
        },
        {
          title: "Service in one place",
          description:
            "A shared inbox, agent assignment, and a safe transition from bot to human.",
        },
        {
          title: "Controlled automation",
          description:
            "A Flow Builder, knowledge base, and AI with cost and safety boundaries.",
        },
      ],
    },
    architecture: {
      eyebrow: "System flow",
      title: "React manages the interface. The backend enforces the boundaries.",
      description:
        "Secrets, webhooks, permissions, and sending operations never run in the browser. React communicates with a secure backend, and the backend invokes provider adapters.",
      steps: [
        "Connect Meta",
        "Approve template",
        "Consented audience",
        "Send through Queue",
        "Delivery report",
      ],
    },
    pricing: {
      status: "Open business decision",
      title: "Plans and pricing have not been defined yet.",
      description:
        "No invented prices or limits are shown. After a product decision, each plan will define users, WhatsApp numbers, contacts, messages, and AI usage.",
      action: "Open the Decision Center",
    },
    footerDescription:
      "A React-based WhatsApp Business SaaS platform.",
  },
  ar: {
    metadata: {
      title: "Connect | منصة WhatsApp Business",
      description:
        "منصة SaaS لإدارة WhatsApp Business الرسمي والحملات والمحادثات والبوتات ووكلاء الذكاء الاصطناعي.",
    },
    skipLink: "تخطي إلى المحتوى الرئيسي",
    homeAriaLabel: "Connect - الصفحة الرئيسية",
    publicNavigationAriaLabel: "التنقل العام",
    languageSelectorAriaLabel: "اختيار لغة الواجهة",
    trustPrinciplesAriaLabel: "مبادئ النظام",
    navigation: {
      capabilities: "القدرات",
      architecture: "كيف تعمل",
      pricing: "الباقات",
    },
    authentication: {
      signIn: "تسجيل الدخول",
      register: "إنشاء حساب",
    },
    hero: {
      badge: "مبني على Meta Cloud API الرسمي",
      title: "إدارة WhatsApp للأعمال",
      emphasis: "بشكل منظّم.",
      description:
        "منصة React لإدارة جهات الاتصال والقوالب والحملات والمحادثات وتدفقات البوت ووكيل AI — مع عزل كامل بين العملاء.",
      workspaceAction: "الدخول إلى مساحة الإعداد",
      architectureAction: "عرض بنية النظام",
      disclaimer:
        "بيئة الإعداد غير متصلة حتى الآن بـ Meta أو الفوترة أو مزود AI.",
      productMapAriaLabel: "خريطة قدرات المنتج",
      communicationHub: "مركز التواصل",
      mapNodes: [
        { title: "Meta", description: "اتصال رسمي" },
        { title: "Campaigns", description: "إرسال وجدولة" },
        { title: "Inbox", description: "بوت وموظف" },
        { title: "AI", description: "معرفة الأعمال" },
      ],
    },
    trustPrinciples: [
      "Multi-Tenant",
      "Queue-based Sending",
      "Webhook Idempotency",
      "Consent First",
      "Audit Log",
    ],
    capabilities: {
      eyebrow: "القدرات الأساسية",
      title: "مسار واحد من الاتصال حتى تقرير التسليم.",
      description:
        "لكل مكوّن حدود مسؤولية واضحة، كي يتوسع النظام من دون العودة إلى البنية المتجانسة القديمة لـ Connect.",
      items: [
        {
          title: "حملات رسمية",
          description:
            "قوالب معتمدة، وجمهور موافق، وجدولة، ومتابعة للتسليم.",
        },
        {
          title: "الخدمة في مكان واحد",
          description:
            "صندوق محادثات موحد، وإسناد لموظف، وانتقال آمن من البوت إلى الإنسان.",
        },
        {
          title: "أتمتة مضبوطة",
          description:
            "Flow Builder وقاعدة معرفة وAI مع حدود للتكلفة والأمان.",
        },
      ],
    },
    architecture: {
      eyebrow: "تدفق النظام",
      title: "React يدير الواجهة. والـ Backend يحمي الحدود.",
      description:
        "الأسرار وWebhooks والصلاحيات وعمليات الإرسال لا تعمل في المتصفح. يتواصل React مع Backend آمن، ويشغّل الـ Backend موصلات مزودي الخدمة.",
      steps: [
        "ربط Meta",
        "اعتماد القالب",
        "جمهور موافق",
        "الإرسال عبر Queue",
        "تقرير التسليم",
      ],
    },
    pricing: {
      status: "قرار تجاري مفتوح",
      title: "لم يتم تحديد الباقات والأسعار بعد.",
      description:
        "لا تُعرض أسعار أو حدود مختلقة. بعد قرار المنتج ستُحدد لكل باقة أعداد المستخدمين وأرقام WhatsApp وجهات الاتصال والرسائل واستهلاك AI.",
      action: "الانتقال إلى مركز القرارات",
    },
    footerDescription:
      "منصة SaaS لإدارة WhatsApp Business مبنية على React.",
  },
} as const satisfies Record<
  InterfaceLanguage,
  PublicLandingMessages
>;

export function isPublicLandingLanguage(
  value: string,
): value is InterfaceLanguage {
  return publicLandingLocales.some(
    (locale) => locale.language === value,
  );
}

export function readPublicLandingMessages(
  language: InterfaceLanguage,
): PublicLandingMessages {
  return publicLandingMessages[language];
}

export function readPublicLandingDirection(
  language: InterfaceLanguage,
): TextDirection {
  return publicLandingLocales.find(
    (locale) => locale.language === language,
  )?.direction ?? "rtl";
}
