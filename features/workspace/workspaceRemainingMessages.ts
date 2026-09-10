import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  PRODUCTION_DECISION_REGISTRY,
} from "../../shared/domain/productionDecisionRegistry.ts";

type DecisionId =
  (typeof PRODUCTION_DECISION_REGISTRY)[number]["checkId"];

type DecisionContent = {
  title: string;
  detail: string;
  owner: string;
};

type WorkspaceRemainingMessages = {
  billing: {
    page: {
      eyebrow: string;
      title: string;
      description: string;
    };
    unspecified: string;
    title: string;
    description: string;
    steps: readonly [string, string, string, string];
    arrow: string;
  };
  decisions: {
    eyebrow: string;
    title: string;
    description: string;
    progress: (resolved: number, total: number) => string;
    openTitle: string;
    openDescription: string;
    complete: string;
    required: string;
    owner: (value: string) => string;
    content: Record<DecisionId, DecisionContent>;
  };
};

const englishDecisionContent: Record<
  DecisionId,
  DecisionContent
> = {
  "identity.team-invitation-policy": {
    title: "Invitation expiry and re-invitation policy",
    detail:
      "Choose how long an invitation remains valid and whether a final invitation can be sent again.",
    owner: "Product + Security",
  },
  "ai.provider": {
    title: "AI provider and billing model",
    detail:
      "Choose a provider, models, usage boundaries, and key model before enabling the AI agent.",
    owner: "Product + Development",
  },
  "billing.provider": {
    title: "Payment and invoice provider",
    detail:
      "Choose the provider that determines signup, Webhooks, refunds, and invoices.",
    owner: "Finance + Development",
  },
  "security.rate-limit-policy": {
    title: "Rate Limit policy",
    detail:
      "Tal verifies current Meta limits; David owns implementation; Security and Product approve Connect quotas, windows, Backoff, Alerts, and the Kill switch.",
    owner: "Tal (R&D) + David + Security + Product",
  },
  "security.file-scanner": {
    title: "File scanning provider and policy",
    detail:
      "Choose a scanning mechanism and define the outcome for suspicious, stuck, or unsupported files.",
    owner: "Security + Development",
  },
  "security.knowledge-upload-policy": {
    title: "Knowledge source upload policy",
    detail:
      "Choose allowed file types, the size limit, and rejection rules before upload.",
    owner: "Product + Security",
  },
  "operations.knowledge-scan-recovery": {
    title: "Stuck knowledge scan recovery",
    detail:
      "Define when a scan is stuck, how many retries are allowed, and when to escalate.",
    owner: "Operations + Development",
  },
  "operations.backup-policy": {
    title: "Backup and restore policy",
    detail:
      "Approve backup frequency, retention window, and isolated restore rehearsal frequency.",
    owner: "Operations + Security",
  },
  "operations.slo-measurement": {
    title: "SLO measurement source",
    detail:
      "Choose the source of truth for availability, error, and response-time events.",
    owner: "Operations + Development",
  },
  "operations.slo-alert-policy": {
    title: "SLO alert policy",
    detail:
      "Choose the measurement window, minimum threshold, alert owner, and escalation path.",
    owner: "Operations",
  },
  "governance.data-retention-policy": {
    title: "Data retention and deletion policy",
    detail:
      "Approve retention periods and a deletion trigger for every data class.",
    owner: "Legal + Security",
  },
};

const arabicDecisionContent: Record<
  DecisionId,
  DecisionContent
> = {
  "identity.team-invitation-policy": {
    title: "سياسة انتهاء الدعوات وإعادة الدعوة",
    detail:
      "حدد مدة صلاحية الدعوة وما إذا كان يمكن إعادة إرسال دعوة بعد وصولها إلى حالة نهائية.",
    owner: "المنتج + الأمان",
  },
  "ai.provider": {
    title: "مزوّد AI ونموذج الفوترة",
    detail:
      "اختر المزوّد والنماذج وحدود الاستخدام ونموذج المفاتيح قبل تفعيل وكيل AI.",
    owner: "المنتج + التطوير",
  },
  "billing.provider": {
    title: "مزوّد الدفع والفواتير",
    detail:
      "اختر المزوّد الذي يحدد التسجيل وWebhooks والاسترداد والفواتير.",
    owner: "المالية + التطوير",
  },
  "security.rate-limit-policy": {
    title: "سياسة Rate Limit",
    detail:
      "يتحقق تال من حدود Meta الحالية؛ دافيد مسؤول عن التنفيذ؛ ويعتمد الأمان والمنتج حصص Connect والنوافذ وBackoff والتنبيهات وKill switch.",
    owner: "تال (البحث والتطوير) + دافيد + الأمان + المنتج",
  },
  "security.file-scanner": {
    title: "سياسة ومزوّد فحص الملفات",
    detail:
      "اختر آلية الفحص وحدد نتيجة الملف المشبوه أو العالق أو غير المدعوم.",
    owner: "الأمان + التطوير",
  },
  "security.knowledge-upload-policy": {
    title: "سياسة رفع مصادر المعرفة",
    detail:
      "حدد أنواع الملفات المسموحة وحد الحجم وقواعد الرفض قبل الرفع.",
    owner: "المنتج + الأمان",
  },
  "operations.knowledge-scan-recovery": {
    title: "استرداد عمليات فحص المعرفة العالقة",
    detail:
      "حدد متى يُعد الفحص عالقًا وعدد المحاولات وموعد التصعيد.",
    owner: "العمليات + التطوير",
  },
  "operations.backup-policy": {
    title: "سياسة النسخ الاحتياطي والاستعادة",
    detail:
      "اعتمد تكرار النسخ ونافذة الاحتفاظ وتكرار تمرين الاستعادة المعزول.",
    owner: "العمليات + الأمان",
  },
  "operations.slo-measurement": {
    title: "مصدر قياس SLO",
    detail:
      "اختر مصدر الحقيقة لأحداث التوفر والأخطاء وزمن الاستجابة.",
    owner: "العمليات + التطوير",
  },
  "operations.slo-alert-policy": {
    title: "سياسة تنبيهات SLO",
    detail:
      "حدد نافذة القياس والحد الأدنى ومالك التنبيه ومسار التصعيد.",
    owner: "العمليات",
  },
  "governance.data-retention-policy": {
    title: "سياسة الاحتفاظ بالبيانات وحذفها",
    detail:
      "اعتمد فترات الاحتفاظ ومشغّل الحذف لكل فئة بيانات.",
    owner: "القانوني + الأمان",
  },
};

const messages = {
  he: {
    billing: {
      page: {
        eyebrow: "חשבון",
        title: "מנוי וחיוב",
        description:
          "חבילה, מגבלות שימוש, אמצעי תשלום, חשבוניות והיסטוריית חיובים.",
      },
      unspecified: "לא הוגדר באפיון",
      title: "אין עדיין חבילה או מחיר להצגה",
      description:
        "ספק הסליקה, המחירים, המע״מ, תקופת הניסיון ומדיניות ניסיונות החיוב טרם הוכרעו. לכן לא מוצגים כאן נתוני חיוב מומצאים.",
      steps: [
        "בחירת חבילה",
        "אישור תשלום",
        "יצירת Tenant",
        "אשף הקמה",
      ],
      arrow: "←",
    },
    decisions: {
      eyebrow: "שער Production",
      title: "מרכז החלטות",
      description:
        "מקור הנתונים זהה לשער המוכנות. המסך לקריאה בלבד ואינו שומר תשובות מקומיות.",
      progress: (resolved, total) =>
        `${resolved} מתוך ${total} הושלמו`,
      openTitle: "החלטות עדיין פתוחות",
      openDescription:
        "סטטוס משתנה רק לאחר החלטה ותצורת שרת אמיתית.",
      complete: "הושלם",
      required: "דורש החלטה",
      owner: (value) => `בעלי החלטה: ${value}`,
      content: Object.fromEntries(
        PRODUCTION_DECISION_REGISTRY.map((decision) => [
          decision.checkId,
          {
            title: decision.title,
            detail: decision.detail,
            owner: decision.owner,
          },
        ]),
      ) as Record<DecisionId, DecisionContent>,
    },
  },
  en: {
    billing: {
      page: {
        eyebrow: "Account",
        title: "Plan and billing",
        description:
          "Plan, usage limits, payment method, invoices, and billing history.",
      },
      unspecified: "Not defined in the specification",
      title: "No plan or price is available yet",
      description:
        "The payment provider, prices, VAT, trial period, and retry policy are undecided. No invented billing data is shown here.",
      steps: [
        "Select plan",
        "Confirm payment",
        "Create Tenant",
        "Setup wizard",
      ],
      arrow: "→",
    },
    decisions: {
      eyebrow: "Production gate",
      title: "Decision center",
      description:
        "This view uses the readiness gate as its source. It is read-only and stores no local answers.",
      progress: (resolved, total) =>
        `${resolved} of ${total} complete`,
      openTitle: "Decisions still open",
      openDescription:
        "Status changes only after a real decision and server configuration.",
      complete: "Complete",
      required: "Decision required",
      owner: (value) => `Decision owners: ${value}`,
      content: englishDecisionContent,
    },
  },
  ar: {
    billing: {
      page: {
        eyebrow: "الحساب",
        title: "الباقة والفوترة",
        description:
          "الباقة وحدود الاستخدام وطريقة الدفع والفواتير وسجل الفوترة.",
      },
      unspecified: "غير محدد في المواصفات",
      title: "لا توجد باقة أو أسعار للعرض بعد",
      description:
        "لم يُحسم مزوّد الدفع والأسعار وضريبة القيمة المضافة وفترة التجربة وسياسة إعادة المحاولة. لذلك لا نعرض بيانات فوترة مختلقة.",
      steps: [
        "اختيار الباقة",
        "تأكيد الدفع",
        "إنشاء Tenant",
        "معالج الإعداد",
      ],
      arrow: "←",
    },
    decisions: {
      eyebrow: "بوابة Production",
      title: "مركز القرارات",
      description:
        "يستخدم هذا العرض بوابة الجاهزية كمصدر. وهو للقراءة فقط ولا يحفظ إجابات محلية.",
      progress: (resolved, total) =>
        `اكتمل ${resolved} من ${total}`,
      openTitle: "قرارات ما زالت مفتوحة",
      openDescription:
        "لا تتغير الحالة إلا بعد قرار حقيقي وإعداد الخادم.",
      complete: "مكتمل",
      required: "يتطلب قرارًا",
      owner: (value) => `مالكو القرار: ${value}`,
      content: arabicDecisionContent,
    },
  },
} as const satisfies Record<
  InterfaceLanguage,
  WorkspaceRemainingMessages
>;

export function readWorkspaceRemainingMessages(
  language: InterfaceLanguage,
): WorkspaceRemainingMessages {
  return messages[language];
}
