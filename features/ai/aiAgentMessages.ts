import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  AiAgentActivationIssue,
  AiAgentStatus,
  AiAgentVersionStatus,
  KnowledgeSourceStatus,
} from "../../shared/domain/aiAgent";
import type {
  AiAgentDirectoryStatus,
} from "../../shared/domain/aiAgentView";
import type {
  AiAgentActionFailure,
} from "../../server/ai/aiAgentActionResult";

type Localized<T> = {
  [Key in keyof T]: T[Key] extends (
    ...arguments_: infer Arguments
  ) => unknown
    ? (...arguments_: Arguments) => string
    : T[Key] extends string
      ? string
      : Localized<T[Key]>;
};

const hebrewMessages = {
  directoryStatuses: {
    "configuration-required":
      "נדרשת הגדרת Clerk ו־D1 כדי לטעון ולשמור סוכני AI.",
    unauthenticated:
      "יש להתחבר לפני צפייה בסוכני AI.",
    "onboarding-required":
      "יש להשלים יצירת סביבת עבודה לפני שמירת סוכן.",
    "tenant-selection-required":
      "יש לבחור סביבת עבודה פעילה לפני שמירת סוכן.",
    "permission-denied":
      "אין לחשבון הנוכחי הרשאה לצפות בסוכני AI.",
    "server-error":
      "לא ניתן לטעון כרגע את סוכני ה־AI.",
  } satisfies Record<
    Exclude<AiAgentDirectoryStatus, "ready">,
    string
  >,
  actionStatuses: {
    "configuration-required":
      "החיבור ל־Clerk או ל־D1 אינו מוגדר.",
    unauthenticated:
      "החיבור פג. יש להתחבר מחדש.",
    "onboarding-required":
      "יש להשלים יצירת סביבת עבודה.",
    "tenant-selection-required":
      "יש לבחור סביבת עבודה פעילה.",
    "permission-denied":
      "אין הרשאה לבצע פעולה זו.",
    "validation-error":
      "השרת דחה את הגדרת הסוכן. בדקו את שדות הטיוטה.",
    "invalid-input": "הבקשה אינה תקינה.",
    "not-found":
      "הסוכן, הגרסה או מקור הידע כבר אינם קיימים.",
    "state-conflict":
      "הסוכן השתנה בחלון אחר. טענו אותו מחדש לפני שמירה.",
    "invalid-state":
      "אי אפשר לפרסם את הגרסה במצבה הנוכחי.",
    "server-error":
      "הפעולה נכשלה בשרת. לא בוצע שינוי חלקי.",
  } satisfies Record<
    Exclude<
      AiAgentActionFailure["status"],
      "activation-blocked"
    >,
    string
  >,
  activationIssues: {
    "provider-required": "לא הוגדר Provider פעיל",
    "billing-policy-required":
      "מדיניות החיוב טרם אושרה",
    "handoff-policy-required":
      "מדיניות המעבר לנציג טרם אושרה",
    "audit-sink-required": "יעד Audit טרם הוגדר",
    "response-mode-required":
      "לא נבחר אופן אישור תשובות",
    "grounding-threshold-required":
      "לא הוגדר סף Grounding",
    "cost-limit-required":
      "לא הוגדרה מגבלת עלות ומטבע",
    "knowledge-source-required":
      "לא נבחר מקור ידע",
    "knowledge-source-not-ready":
      "מקור ידע שנבחר עדיין אינו מוכן",
  } satisfies Record<AiAgentActivationIssue, string>,
  labels: {
    agentStatuses: {
      draft: "טיוטה",
      active: "פעיל",
      inactive: "לא פעיל",
    } satisfies Record<AiAgentStatus, string>,
    versionStatuses: {
      draft: "טיוטה",
      published: "פורסמה",
      archived: "בארכיון",
    } satisfies Record<AiAgentVersionStatus, string>,
    sourceStatuses: {
      "pending-upload": "ממתין להעלאה",
      "pending-validation": "ממתין לאימות",
      "pending-scan": "ממתין לסריקה",
      scanning: "בסריקה",
      ready: "מוכן",
      rejected: "נדחה",
      archived: "בארכיון",
    } satisfies Record<KnowledgeSourceStatus, string>,
  },
  feedback: {
    savedReloadFailed:
      "הטיוטה נשמרה, אך מצב ההפעלה לא נטען מחדש. יש לבחור את הסוכן מהרשימה לפני פרסום.",
    draftUnchanged: "הטיוטה כבר הייתה שמורה ללא שינוי.",
    draftSaved: "הטיוטה נשמרה ב־D1 כגרסה חדשה.",
    publishedReloadFailed:
      "הגרסה פורסמה, אך ההיסטוריה המלאה לא נטענה מחדש.",
    publishedUnchanged: "הגרסה כבר הייתה פעילה.",
    published: "הגרסה פורסמה והסוכן פעיל.",
  },
  directory: {
    kicker: "סוכנים שמורים",
    title: "ספריית סוכני AI",
    newAgent: "סוכן חדש",
    readOnly: "החשבון הנוכחי נמצא במצב צפייה בלבד.",
    emptyTitle: "עדיין אין סוכנים",
    emptyDescription:
      "אפשר להגדיר ולשמור טיוטה ללא הפעלת Provider.",
    version: (value: number) => `גרסה ${value}`,
  },
  editor: {
    kicker: "Agent Definition",
    editTitle: "עריכת סוכן",
    newTitle: "סוכן חדש",
    boundary:
      "הטיוטה מגדירה גבולות בלבד. מפתח ספק, Tenant ומספר גרסה אינם מתקבלים מהדפדפן.",
    name: "שם הסוכן",
    immutableName:
      "השם הוא הזהות הדטרמיניסטית ולכן אינו משתנה אחרי השמירה.",
    systemPrompt: "System Prompt",
    systemPromptHelp:
      "הוראות התפקיד והגבולות של הסוכן. אין להזין Secret או API Key.",
    handoffMessage: "הודעת מעבר לנציג",
    responseMode: "אופן אישור תשובה",
    responseModes: {
      undecided: "טרם הוחלט",
      automatic: "אוטומטי",
      agentApproval: "אישור נציג",
    },
    groundingThreshold: "סף Grounding — Basis Points",
    groundingHelp:
      "10,000 הם 100%. אפשר להשאיר ריק בטיוטה.",
    costLimit: "מגבלת עלות ביחידות מטבע קטנות",
    currency: "מטבע — ISO 4217",
    costHelp:
      "המגבלה והמטבע נשמרים יחד או נשארים ריקים.",
    saving: "שומר טיוטה…",
    save: "שמירת טיוטה",
    publishing: "מפרסם…",
    publish: "פרסום והפעלה",
  },
  readiness: {
    ready: "מוכן להפעלה",
    blocked: "הפעלה חסומה",
    title: "בדיקת מוכנות שרתית",
    description:
      "הרשאת כתיבה אינה מספיקה. כל התנאים הבאים נבדקים שוב בשרת לפני פרסום.",
    empty:
      "שמרו טיוטה כדי לקבל בדיקת מוכנות מלאה.",
    success: "כל תנאי ההפעלה אושרו בצד השרת.",
    history: "היסטוריית גרסאות",
    version: (value: number) => `גרסה ${value}`,
  },
  knowledge: {
    kicker: "מאגר ידע",
    title: "מקורות השייכים לסביבה",
    upload: "העלאת מקור",
    uploadBoundary:
      "העלאת מקור חסומה עד להגדרת R2, סוגי קובץ, מגבלת גודל וסריקה.",
    description:
      "הבחירה נשמרת בתוך גרסת הסוכן. רק מקור במצב Ready יוכל לעבור את שער ההפעלה.",
    emptyTitle: "אין מקורות ידע שמורים",
    emptyDescription:
      "העלאה תופעל רק לאחר הגדרת R2, סוגי קובץ, מגבלת גודל וסריקה.",
  },
} as const;

export type AiAgentMessages = Localized<
  typeof hebrewMessages
>;

const messages: Record<InterfaceLanguage, AiAgentMessages> = {
  he: hebrewMessages,
  en: {
    directoryStatuses: {
      "configuration-required":
        "Configure Clerk and D1 before loading or saving AI agents.",
      unauthenticated:
        "Sign in before viewing AI agents.",
      "onboarding-required":
        "Complete workspace creation before saving an agent.",
      "tenant-selection-required":
        "Select an active workspace before saving an agent.",
      "permission-denied":
        "The current account cannot view AI agents.",
      "server-error":
        "AI agents cannot be loaded right now.",
    },
    actionStatuses: {
      "configuration-required":
        "The Clerk or D1 connection is not configured.",
      unauthenticated:
        "Your session expired. Sign in again.",
      "onboarding-required":
        "Complete workspace creation first.",
      "tenant-selection-required":
        "Select an active workspace first.",
      "permission-denied":
        "You do not have permission to perform this action.",
      "validation-error":
        "The server rejected the agent definition. Review the draft fields.",
      "invalid-input": "The request is invalid.",
      "not-found":
        "The agent, version, or knowledge source no longer exists.",
      "state-conflict":
        "The agent changed in another window. Reload it before saving.",
      "invalid-state":
        "This version cannot be published in its current state.",
      "server-error":
        "The server action failed. No partial change was applied.",
    },
    activationIssues: {
      "provider-required": "No active provider is configured",
      "billing-policy-required":
        "The billing policy is not approved",
      "handoff-policy-required":
        "The human handoff policy is not approved",
      "audit-sink-required": "No audit destination is configured",
      "response-mode-required": "No reply approval mode is selected",
      "grounding-threshold-required":
        "No grounding threshold is configured",
      "cost-limit-required":
        "No cost limit and currency are configured",
      "knowledge-source-required": "No knowledge source is selected",
      "knowledge-source-not-ready":
        "A selected knowledge source is not ready",
    },
    labels: {
      agentStatuses: {
        draft: "Draft",
        active: "Active",
        inactive: "Inactive",
      },
      versionStatuses: {
        draft: "Draft",
        published: "Published",
        archived: "Archived",
      },
      sourceStatuses: {
        "pending-upload": "Pending upload",
        "pending-validation": "Pending validation",
        "pending-scan": "Pending scan",
        scanning: "Scanning",
        ready: "Ready",
        rejected: "Rejected",
        archived: "Archived",
      },
    },
    feedback: {
      savedReloadFailed:
        "The draft was saved, but activation state could not be reloaded. Select the agent from the list before publishing.",
      draftUnchanged: "The draft was already saved without changes.",
      draftSaved: "The draft was saved to D1 as a new version.",
      publishedReloadFailed:
        "The version was published, but the complete history could not be reloaded.",
      publishedUnchanged: "The version was already active.",
      published: "The version was published and the agent is active.",
    },
    directory: {
      kicker: "Saved agents",
      title: "AI agent library",
      newAgent: "New agent",
      readOnly: "The current account has read-only access.",
      emptyTitle: "No agents yet",
      emptyDescription:
        "You can define and save a draft without activating a provider.",
      version: (value: number) => `Version ${value}`,
    },
    editor: {
      kicker: "Agent Definition",
      editTitle: "Edit agent",
      newTitle: "New agent",
      boundary:
        "The draft defines boundaries only. Provider keys, tenant identity, and version numbers are never accepted from the browser.",
      name: "Agent name",
      immutableName:
        "The name is the deterministic identity and cannot change after saving.",
      systemPrompt: "System Prompt",
      systemPromptHelp:
        "Define the agent role and boundaries. Never enter a secret or API key.",
      handoffMessage: "Human handoff message",
      responseMode: "Reply approval mode",
      responseModes: {
        undecided: "Not decided",
        automatic: "Automatic",
        agentApproval: "Agent approval",
      },
      groundingThreshold: "Grounding threshold — basis points",
      groundingHelp:
        "10,000 equals 100%. This may remain empty in a draft.",
      costLimit: "Cost limit in minor currency units",
      currency: "Currency — ISO 4217",
      costHelp:
        "The limit and currency are saved together or both remain empty.",
      saving: "Saving draft…",
      save: "Save draft",
      publishing: "Publishing…",
      publish: "Publish and activate",
    },
    readiness: {
      ready: "Ready to activate",
      blocked: "Activation blocked",
      title: "Server readiness check",
      description:
        "Write permission is not enough. The server checks every condition again before publishing.",
      empty:
        "Save a draft to receive a complete readiness check.",
      success: "Every activation condition was approved by the server.",
      history: "Version history",
      version: (value: number) => `Version ${value}`,
    },
    knowledge: {
      kicker: "Knowledge base",
      title: "Workspace knowledge sources",
      upload: "Upload source",
      uploadBoundary:
        "Source upload is blocked until R2, file types, size limits, and scanning are configured.",
      description:
        "The selection is stored in the agent version. Only a Ready source can pass the activation gate.",
      emptyTitle: "No saved knowledge sources",
      emptyDescription:
        "Upload will be enabled only after R2, file types, size limits, and scanning are configured.",
    },
  },
  ar: {
    directoryStatuses: {
      "configuration-required":
        "يجب إعداد Clerk وD1 قبل تحميل وكلاء AI أو حفظهم.",
      unauthenticated:
        "يجب تسجيل الدخول قبل عرض وكلاء AI.",
      "onboarding-required":
        "يجب إكمال إنشاء مساحة العمل قبل حفظ وكيل.",
      "tenant-selection-required":
        "يجب اختيار مساحة عمل نشطة قبل حفظ وكيل.",
      "permission-denied":
        "الحساب الحالي لا يملك صلاحية عرض وكلاء AI.",
      "server-error":
        "يتعذر تحميل وكلاء AI حاليًا.",
    },
    actionStatuses: {
      "configuration-required":
        "لم يتم إعداد اتصال Clerk أو D1.",
      unauthenticated:
        "انتهت الجلسة. يجب تسجيل الدخول مجددًا.",
      "onboarding-required":
        "يجب إكمال إنشاء مساحة العمل أولًا.",
      "tenant-selection-required":
        "يجب اختيار مساحة عمل نشطة أولًا.",
      "permission-denied":
        "لا توجد صلاحية لتنفيذ هذا الإجراء.",
      "validation-error":
        "رفض الخادم تعريف الوكيل. راجع حقول المسودة.",
      "invalid-input": "الطلب غير صالح.",
      "not-found":
        "لم يعد الوكيل أو الإصدار أو مصدر المعرفة موجودًا.",
      "state-conflict":
        "تغير الوكيل في نافذة أخرى. أعد تحميله قبل الحفظ.",
      "invalid-state":
        "لا يمكن نشر هذا الإصدار في حالته الحالية.",
      "server-error":
        "فشل الإجراء على الخادم. لم يتم تطبيق تغيير جزئي.",
    },
    activationIssues: {
      "provider-required": "لم يتم إعداد Provider نشط",
      "billing-policy-required": "لم تتم الموافقة على سياسة الفوترة",
      "handoff-policy-required":
        "لم تتم الموافقة على سياسة التحويل إلى موظف",
      "audit-sink-required": "لم يتم إعداد وجهة Audit",
      "response-mode-required": "لم يتم اختيار أسلوب اعتماد الرد",
      "grounding-threshold-required": "لم يتم إعداد حد الاستناد",
      "cost-limit-required": "لم يتم إعداد حد التكلفة والعملة",
      "knowledge-source-required": "لم يتم اختيار مصدر معرفة",
      "knowledge-source-not-ready": "مصدر المعرفة المحدد غير جاهز بعد",
    },
    labels: {
      agentStatuses: {
        draft: "مسودة",
        active: "نشط",
        inactive: "غير نشط",
      },
      versionStatuses: {
        draft: "مسودة",
        published: "منشور",
        archived: "مؤرشف",
      },
      sourceStatuses: {
        "pending-upload": "بانتظار الرفع",
        "pending-validation": "بانتظار التحقق",
        "pending-scan": "بانتظار الفحص",
        scanning: "قيد الفحص",
        ready: "جاهز",
        rejected: "مرفوض",
        archived: "مؤرشف",
      },
    },
    feedback: {
      savedReloadFailed:
        "تم حفظ المسودة، لكن تعذر إعادة تحميل حالة التفعيل. اختر الوكيل من القائمة قبل النشر.",
      draftUnchanged: "كانت المسودة محفوظة بالفعل دون تغييرات.",
      draftSaved: "تم حفظ المسودة في D1 كإصدار جديد.",
      publishedReloadFailed:
        "تم نشر الإصدار، لكن تعذر إعادة تحميل السجل الكامل.",
      publishedUnchanged: "كان الإصدار نشطًا بالفعل.",
      published: "تم نشر الإصدار والوكيل نشط.",
    },
    directory: {
      kicker: "الوكلاء المحفوظون",
      title: "مكتبة وكلاء AI",
      newAgent: "وكيل جديد",
      readOnly: "الحساب الحالي يملك صلاحية العرض فقط.",
      emptyTitle: "لا يوجد وكلاء بعد",
      emptyDescription:
        "يمكن تعريف مسودة وحفظها دون تفعيل Provider.",
      version: (value: number) => `الإصدار ${value}`,
    },
    editor: {
      kicker: "تعريف الوكيل",
      editTitle: "تحرير الوكيل",
      newTitle: "وكيل جديد",
      boundary:
        "تحدد المسودة الحدود فقط. لا يقبل المتصفح مفاتيح Provider أو هوية Tenant أو أرقام الإصدارات.",
      name: "اسم الوكيل",
      immutableName:
        "الاسم هو الهوية الحتمية ولا يمكن تغييره بعد الحفظ.",
      systemPrompt: "تعليمات النظام",
      systemPromptHelp:
        "حدد دور الوكيل وحدوده. لا تُدخل Secret أو API Key.",
      handoffMessage: "رسالة التحويل إلى موظف",
      responseMode: "أسلوب اعتماد الرد",
      responseModes: {
        undecided: "لم يُقرر بعد",
        automatic: "تلقائي",
        agentApproval: "موافقة الموظف",
      },
      groundingThreshold: "حد الاستناد — Basis Points",
      groundingHelp:
        "10,000 تساوي 100%. يمكن ترك الحقل فارغًا في المسودة.",
      costLimit: "حد التكلفة بوحدات العملة الصغرى",
      currency: "العملة — ISO 4217",
      costHelp:
        "يتم حفظ الحد والعملة معًا أو يظل كلاهما فارغًا.",
      saving: "جارٍ حفظ المسودة…",
      save: "حفظ المسودة",
      publishing: "جارٍ النشر…",
      publish: "النشر والتفعيل",
    },
    readiness: {
      ready: "جاهز للتفعيل",
      blocked: "التفعيل محظور",
      title: "فحص الجاهزية على الخادم",
      description:
        "صلاحية الكتابة غير كافية. يتحقق الخادم من جميع الشروط مجددًا قبل النشر.",
      empty:
        "احفظ مسودة للحصول على فحص جاهزية كامل.",
      success: "وافق الخادم على جميع شروط التفعيل.",
      history: "سجل الإصدارات",
      version: (value: number) => `الإصدار ${value}`,
    },
    knowledge: {
      kicker: "قاعدة المعرفة",
      title: "مصادر المعرفة في مساحة العمل",
      upload: "رفع مصدر",
      uploadBoundary:
        "رفع المصدر محظور حتى إعداد R2 وأنواع الملفات وحد الحجم والفحص.",
      description:
        "يُحفظ الاختيار داخل إصدار الوكيل. وحده المصدر الجاهز يمكنه اجتياز بوابة التفعيل.",
      emptyTitle: "لا توجد مصادر معرفة محفوظة",
      emptyDescription:
        "سيتم تفعيل الرفع فقط بعد إعداد R2 وأنواع الملفات وحد الحجم والفحص.",
    },
  },
};

export function readAiAgentMessages(
  language: InterfaceLanguage,
): AiAgentMessages {
  return messages[language];
}
