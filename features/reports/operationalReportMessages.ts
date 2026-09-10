import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  OperationalReportStatus,
} from "../../shared/domain/operationalReportView";
import type {
  OperationalReportActionFailure,
} from "../../server/reports/operationalReportActionResult";

type OperationalReportMessages = {
  page: {
    eyebrow: string;
    title: string;
    description: string;
    loading: string;
  };
  locale: string;
  statuses: Record<
    Exclude<OperationalReportStatus, "ready">,
    string
  >;
  actionFailures: Record<
    OperationalReportActionFailure["status"],
    string
  >;
  unavailableTitle: string;
  toolbar: {
    title: string;
    utcHelp: string;
    from: string;
    to: string;
    loading: string;
    show: string;
  };
  generatedAt: (value: string) => string;
  empty: {
    title: string;
    description: string;
  };
  campaigns: {
    title: string;
    description: string;
    total: string;
    recipients: string;
    outbound: string;
    delivered: string;
    read: string;
    failed: string;
  };
  conversations: {
    title: string;
    description: string;
    active: string;
    unread: string;
    waitingForAgent: string;
    agentActive: string;
    botActive: string;
    closed: string;
  };
  automation: {
    title: string;
    description: string;
    botReplies: string;
    botAccepted: string;
    aiDecisions: string;
    aiPlanned: string;
    handoffs: string;
    usageTitle: string;
    noUsage: string;
    minorUnits: (value: string) => string;
    requestsAndTokens: (
      requests: string,
      tokens: string,
    ) => string;
  };
};

const hebrewStatuses = {
  "configuration-required":
    "נדרשת הגדרת Clerk ו־D1 כדי לטעון דוחות.",
  unauthenticated: "יש להתחבר לפני צפייה בדוחות.",
  "onboarding-required":
    "יש להשלים יצירת סביבת עבודה לפני טעינת דוחות.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה לפני טעינת דוחות.",
  "permission-denied":
    "אין לחשבון הנוכחי הרשאה לצפות בדוחות.",
  "server-error": "לא ניתן לטעון כרגע את הדוחות.",
} as const;

const englishStatuses = {
  "configuration-required":
    "Configure Clerk and D1 to load reports.",
  unauthenticated: "Sign in to view reports.",
  "onboarding-required":
    "Create a workspace before loading reports.",
  "tenant-selection-required":
    "Select an active workspace before loading reports.",
  "permission-denied":
    "This account cannot view reports.",
  "server-error": "Reports cannot be loaded right now.",
} as const;

const arabicStatuses = {
  "configuration-required":
    "يجب إعداد Clerk وD1 لتحميل التقارير.",
  unauthenticated: "سجّل الدخول لعرض التقارير.",
  "onboarding-required":
    "أنشئ مساحة عمل قبل تحميل التقارير.",
  "tenant-selection-required":
    "اختر مساحة عمل نشطة قبل تحميل التقارير.",
  "permission-denied":
    "لا يملك هذا الحساب صلاحية عرض التقارير.",
  "server-error": "تعذّر تحميل التقارير حاليًا.",
} as const;

const messages = {
  he: {
    page: {
      eyebrow: "ביצועים",
      title: "דוחות",
      description:
        "מדדי שליחה, מסירה, קריאה, תגובה, עלות וביצועי בוט ו־AI.",
      loading: "הדוחות נטענים…",
    },
    locale: "he-IL",
    statuses: hebrewStatuses,
    actionFailures: {
      ...hebrewStatuses,
      "invalid-input":
        "טווח התאריכים אינו תקין. ניתן לבחור עד 366 ימים.",
    },
    unavailableTitle: "הדוח אינו זמין",
    toolbar: {
      title: "טווח הדוח",
      utcHelp: "כל התאריכים מחושבים לפי UTC.",
      from: "מתאריך",
      to: "עד תאריך",
      loading: "טוען דוח…",
      show: "הצגת דוח",
    },
    generatedAt: (value) => `הופק ב־${value} UTC`,
    empty: {
      title: "לא נמצאו אירועים בטווח שנבחר",
      description:
        "זהו דוח אמיתי עם ערכי אפס; לא נוספו נתוני תצוגה חלופיים.",
    },
    campaigns: {
      title: "קמפיינים והודעות",
      description: "פעילות שנוצרה או התרחשה בטווח שנבחר.",
      total: "קמפיינים",
      recipients: "נמענים מתוכננים",
      outbound: "הודעות יוצאות",
      delivered: "נמסרו",
      read: "נקראו",
      failed: "נכשלו",
    },
    conversations: {
      title: "שיחות",
      description: "שיחות שההודעה האחרונה שלהן נמצאת בטווח.",
      active: "שיחות פעילות בטווח",
      unread: "הודעות שלא נקראו",
      waitingForAgent: "ממתינות לנציג",
      agentActive: "בטיפול נציג",
      botActive: "בוט פעיל",
      closed: "סגורות",
    },
    automation: {
      title: "Bot ו־AI",
      description: "תוצאות Runtime ועלויות לפי המטבע שבו נרשמו.",
      botReplies: "תגובות Bot",
      botAccepted: "Bot התקבל למסירה",
      aiDecisions: "החלטות AI",
      aiPlanned: "תשובות AI מתוכננות",
      handoffs: "העברות לנציג",
      usageTitle: "שימוש ועלות לפי מטבע",
      noUsage: "לא נרשם שימוש AI בטווח.",
      minorUnits: (value) => `${value} יחידות משנה`,
      requestsAndTokens: (requests, tokens) =>
        `${requests} בקשות · ${tokens} Tokens`,
    },
  },
  en: {
    page: {
      eyebrow: "Performance",
      title: "Reports",
      description:
        "Sending, delivery, read, response, cost, bot, and AI metrics.",
      loading: "Loading reports…",
    },
    locale: "en-US",
    statuses: englishStatuses,
    actionFailures: {
      ...englishStatuses,
      "invalid-input":
        "The date range is invalid. Select up to 366 days.",
    },
    unavailableTitle: "Report unavailable",
    toolbar: {
      title: "Report range",
      utcHelp: "All dates are calculated in UTC.",
      from: "From",
      to: "To",
      loading: "Loading report…",
      show: "Show report",
    },
    generatedAt: (value) => `Generated at ${value} UTC`,
    empty: {
      title: "No events found in this range",
      description:
        "This is a real report with zero values; no fallback display data was added.",
    },
    campaigns: {
      title: "Campaigns and messages",
      description: "Activity created or recorded in the selected range.",
      total: "Campaigns",
      recipients: "Planned recipients",
      outbound: "Outbound messages",
      delivered: "Delivered",
      read: "Read",
      failed: "Failed",
    },
    conversations: {
      title: "Conversations",
      description:
        "Conversations whose latest message is in the selected range.",
      active: "Active conversations in range",
      unread: "Unread messages",
      waitingForAgent: "Waiting for agent",
      agentActive: "Handled by agent",
      botActive: "Bot active",
      closed: "Closed",
    },
    automation: {
      title: "Bot and AI",
      description: "Runtime outcomes and costs by recorded currency.",
      botReplies: "Bot replies",
      botAccepted: "Bot accepted for delivery",
      aiDecisions: "AI decisions",
      aiPlanned: "Planned AI replies",
      handoffs: "Agent handoffs",
      usageTitle: "Usage and cost by currency",
      noUsage: "No AI usage was recorded in this range.",
      minorUnits: (value) => `${value} minor units`,
      requestsAndTokens: (requests, tokens) =>
        `${requests} requests · ${tokens} tokens`,
    },
  },
  ar: {
    page: {
      eyebrow: "الأداء",
      title: "التقارير",
      description:
        "مقاييس الإرسال والتسليم والقراءة والاستجابة والتكلفة وأداء البوت وAI.",
      loading: "جارٍ تحميل التقارير…",
    },
    locale: "ar",
    statuses: arabicStatuses,
    actionFailures: {
      ...arabicStatuses,
      "invalid-input":
        "نطاق التاريخ غير صالح. يمكن اختيار حتى 366 يومًا.",
    },
    unavailableTitle: "التقرير غير متاح",
    toolbar: {
      title: "نطاق التقرير",
      utcHelp: "تُحسب جميع التواريخ حسب UTC.",
      from: "من تاريخ",
      to: "إلى تاريخ",
      loading: "جارٍ تحميل التقرير…",
      show: "عرض التقرير",
    },
    generatedAt: (value) => `أُنشئ في ${value} UTC`,
    empty: {
      title: "لم تُوجد أحداث في النطاق المحدد",
      description:
        "هذا تقرير حقيقي بقيم صفرية؛ لم تُضف بيانات عرض بديلة.",
    },
    campaigns: {
      title: "الحملات والرسائل",
      description: "نشاط أُنشئ أو سُجل في النطاق المحدد.",
      total: "الحملات",
      recipients: "المستلمون المخططون",
      outbound: "الرسائل الصادرة",
      delivered: "تم التسليم",
      read: "تمت القراءة",
      failed: "فشلت",
    },
    conversations: {
      title: "المحادثات",
      description: "محادثات تقع آخر رسالة فيها ضمن النطاق.",
      active: "المحادثات النشطة في النطاق",
      unread: "الرسائل غير المقروءة",
      waitingForAgent: "بانتظار الموظف",
      agentActive: "قيد معالجة الموظف",
      botActive: "البوت نشط",
      closed: "مغلقة",
    },
    automation: {
      title: "البوت وAI",
      description: "نتائج Runtime والتكاليف حسب العملة المسجلة.",
      botReplies: "ردود البوت",
      botAccepted: "قُبل البوت للتسليم",
      aiDecisions: "قرارات AI",
      aiPlanned: "ردود AI المخططة",
      handoffs: "التحويلات إلى موظف",
      usageTitle: "الاستخدام والتكلفة حسب العملة",
      noUsage: "لم يُسجل استخدام AI في النطاق.",
      minorUnits: (value) => `${value} وحدات فرعية`,
      requestsAndTokens: (requests, tokens) =>
        `${requests} طلبات · ${tokens} Tokens`,
    },
  },
} as const satisfies Record<
  InterfaceLanguage,
  OperationalReportMessages
>;

export function readOperationalReportMessages(
  language: InterfaceLanguage,
): OperationalReportMessages {
  return messages[language];
}
