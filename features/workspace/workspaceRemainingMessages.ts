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
      "The selected invitation lifetime is 72 hours, with re-invitation only after a final state. Activation requires the approved policy record and verified invitation handling in the active environment.",
    owner: "Product + Security",
  },
  "ai.provider": {
    title: "AI provider and billing model",
    detail:
      "OpenAI Responses API is selected, with human approval before sending replies. Activation requires verified model access, keys, budget, privacy settings, and quality evaluation.",
    owner: "Product + Development",
  },
  "billing.provider": {
    title: "Payment and invoice provider",
    detail:
      "Paddle is selected for billing after the pilot. Account eligibility, catalog, Webhooks, refunds, and reconciliation must be verified before activation.",
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
      "AWS GuardDuty Malware Protection for S3 is selected. Files remain quarantined until a verified clean result; storage, permissions, and scan delivery must be connected and tested.",
    owner: "Security + Development",
  },
  "security.knowledge-upload-policy": {
    title: "Knowledge source upload policy",
    detail:
      "The first version supports TXT and Markdown only, up to 128 KiB. PDF and Office are outside this release. Storage and scanning must be connected and verified before activation.",
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
      "Better Stack with OpenTelemetry is selected. The source, data redaction, retention, and delivery of live telemetry must be verified before activation.",
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
      "مدة الدعوة المختارة 72 ساعة، ولا تُعاد الدعوة إلا بعد حالة نهائية. يتطلب التفعيل حفظ السياسة المعتمدة والتحقق من معالجة الدعوات في البيئة النشطة.",
    owner: "المنتج + الأمان",
  },
  "ai.provider": {
    title: "مزوّد AI ونموذج الفوترة",
    detail:
      "تم اختيار OpenAI Responses API مع موافقة بشرية قبل إرسال الردود. يتطلب التفعيل التحقق من إتاحة النماذج والمفاتيح والميزانية والخصوصية وتقييم الجودة.",
    owner: "المنتج + التطوير",
  },
  "billing.provider": {
    title: "مزوّد الدفع والفواتير",
    detail:
      "تم اختيار Paddle للفوترة بعد التجربة الأولية. يجب التحقق من أهلية الحساب والكتالوج وWebhooks والاسترداد والتسوية قبل التفعيل.",
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
      "تم اختيار AWS GuardDuty Malware Protection for S3. تبقى الملفات في الحجر حتى نتيجة نظيفة موثّقة؛ ويجب ربط التخزين والصلاحيات وتسليم نتائج الفحص واختبارها.",
    owner: "الأمان + التطوير",
  },
  "security.knowledge-upload-policy": {
    title: "سياسة رفع مصادر المعرفة",
    detail:
      "يدعم الإصدار الأول TXT وMarkdown فقط حتى 128 KiB. ملفات PDF وOffice خارج نطاق الإصدار. يلزم ربط التخزين والفحص والتحقق منهما قبل التفعيل.",
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
      "تم اختيار Better Stack مع OpenTelemetry. يجب التحقق من المصدر وحجب البيانات والاحتفاظ وتسليم بيانات المراقبة الحية قبل التفعيل.",
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
        "כאן מוצגות הכרעות התכנון ודרישות ההפעלה שלהן. המצב נקרא מהגדרות הסביבה הפעילה; החלטה מתועדת לבדה אינה משלימה את החיבור והאימות.",
      progress: (resolved, total) =>
        `${resolved} מתוך ${total} מוכנים להפעלה`,
      openTitle: "דרישות הפעלה שטרם הושלמו",
      openDescription:
        "השלמה דורשת רשומת החלטה מאושרת ותצורה מאומתת בסביבה הפעילה.",
      complete: "מוכן להפעלה",
      required: "ממתין להגדרה ולאימות",
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
        "This view shows planning choices and their activation requirements. Status comes from the active environment; a documented choice alone does not complete connection and verification.",
      progress: (resolved, total) =>
        `${resolved} of ${total} ready for activation`,
      openTitle: "Incomplete activation requirements",
      openDescription:
        "Completion requires an approved decision record and verified settings in the active environment.",
      complete: "Ready for activation",
      required: "Awaiting setup and verification",
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
        "يعرض هذا القسم خيارات التخطيط ومتطلبات تفعيلها. تأتي الحالة من البيئة النشطة؛ وتوثيق القرار وحده لا يكمل الربط والتحقق.",
      progress: (resolved, total) =>
        `${resolved} من ${total} جاهزة للتفعيل`,
      openTitle: "متطلبات تفعيل لم تكتمل",
      openDescription:
        "يتطلب الاكتمال سجل قرار معتمد وإعدادات موثّقة في البيئة النشطة.",
      complete: "جاهز للتفعيل",
      required: "بانتظار الإعداد والتحقق",
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
