import type {
  InterfaceLanguage,
} from "../domain/businessProfileDraft.ts";

type BusinessProfileSaveFailureStatus =
  | "validation-error"
  | "unauthenticated"
  | "tenant-selection-required"
  | "permission-denied"
  | "configuration-required"
  | "server-error";

export interface WorkspaceDashboardMessages {
  eyebrow: string;
  greetingWithBusiness: (businessName: string) => string;
  greetingWithoutBusiness: string;
  descriptions: {
    profileAndMetaComplete: string;
    serverProfileComplete: string;
    localProfileComplete: string;
    profileIncomplete: string;
  };
  showOpenDecisions: string;
  metricsAriaLabel: string;
  metrics: readonly [string, string, string, string];
  noMetricSource: string;
  setupKicker: string;
  setupTitle: string;
  progress: (completed: number, total: number) => string;
  progressAriaLabel: (progress: string) => string;
  stepStates: {
    server: string;
    local: string;
    notStarted: string;
  };
  continueActions: {
    businessProfile: string;
    meta: string;
    onboarding: string;
  };
  decisionRequired: string;
  blockingDecisions: (count: number) => string;
  blockingDecisionDescription: string;
  openDecisionCenter: string;
  quickActions: string;
  importContacts: string;
  buildFlow: string;
  configureAiAgent: string;
}

export interface WorkspaceOnboardingMessages {
  heading: {
    eyebrow: string;
    title: string;
    description: string;
  };
  progress: {
    server: string;
    local: string;
    profile: (completed: number, total: number) => string;
  };
  stepOneOfTen: string;
  businessDetails: string;
  statuses: {
    saving: string;
    server: string;
    local: string;
    unsaved: string;
  };
  explanations: {
    server: string;
    local: string;
  };
  fields: {
    businessName: string;
    timezone: string;
    interfaceLanguage: string;
    choose: string;
  };
  saveActions: {
    saving: string;
    server: string;
    local: string;
  };
  completenessKicker: string;
  completenessTitle: string;
  checks: readonly [string, string, string, string];
  notices: {
    tenantCreated: string;
    serverUpdated: string;
    localSaved: string;
    readyToSave: string;
    missingFields: string;
  };
  saveFailures: Record<BusinessProfileSaveFailureStatus, string>;
  roadmapKicker: string;
}

export interface WorkspaceSetupMessages {
  dashboard: WorkspaceDashboardMessages;
  onboarding: WorkspaceOnboardingMessages;
}

export const workspaceSetupMessages = {
  he: {
    dashboard: {
      eyebrow: "מרכז השליטה",
      greetingWithBusiness: (businessName) =>
        `בוקר טוב, ${businessName}. ממשיכים לשלב הבא.`,
      greetingWithoutBusiness: "בוקר טוב, מתחילים לחבר את העסק.",
      descriptions: {
        profileAndMetaComplete:
          "פרטי העסק וחיבור Meta נשמרו בשרת. ניתן להמשיך לשלב הבא באשף.",
        serverProfileComplete:
          "פרטי העסק נשמרו בשרת עבור Tenant מאומת. השלב הבא הוא חיבור רשמי ל־Meta.",
        localProfileComplete:
          "פרטי העסק נשמרו מקומית. השלב הבא הוא חיבור רשמי ל־Meta; עדיין לא נוצר Tenant ולא נשלחה בקשת Backend.",
        profileIncomplete:
          "סביבת העבודה מוכנה. כדי להתקדם לחיבור הרשמי יש להשלים תחילה את פרטי העסק.",
      },
      showOpenDecisions: "הצגת החלטות פתוחות",
      metricsAriaLabel: "מדדי חשבון",
      metrics: [
        "הודעות החודש",
        "אנשי קשר",
        "קמפיינים פעילים",
        "צריכת AI",
      ],
      noMetricSource: "טרם קיים מקור נתונים",
      setupKicker: "אשף הקמה",
      setupTitle: "10 צעדים עד לשליחה הראשונה",
      progress: (completed, total) => `${completed} מתוך ${total}`,
      progressAriaLabel: (progress) => `התקדמות ${progress}`,
      stepStates: {
        server: "נשמר בשרת",
        local: "נשמר מקומית",
        notStarted: "טרם התחיל",
      },
      continueActions: {
        businessProfile: "השלמת פרטי העסק",
        meta: "מעבר לחיבור Meta",
        onboarding: "המשך באשף ההקמה",
      },
      decisionRequired: "דורש החלטה",
      blockingDecisions: (count) =>
        `${count} החלטות חוסמות Production`,
      blockingDecisionDescription:
        "ספק Meta, סליקה, חבילות, AI ומדיניות מידע עדיין לא הוגדרו באפיון.",
      openDecisionCenter: "פתיחת מרכז ההחלטות",
      quickActions: "פעולות מהירות",
      importContacts: "ייבוא אנשי קשר",
      buildFlow: "בניית תהליך",
      configureAiAgent: "הגדרת סוכן AI",
    },
    onboarding: {
      heading: {
        eyebrow: "הקמת סביבת עבודה",
        title: "אשף הקמה",
        description:
          "השלבים בנויים לפי האפיון. רק נתונים שהוזנו בפועל מוצגים כמוכנים.",
      },
      progress: {
        server: "שלב 1 נשמר בשרת",
        local: "שלב 1 מוכן מקומית",
        profile: (completed, total) =>
          `פרטי העסק ${completed}/${total}`,
      },
      stepOneOfTen: "שלב 1 מתוך 10",
      businessDetails: "פרטי העסק",
      statuses: {
        saving: "שומר בשרת",
        server: "נשמר בשרת",
        local: "טיוטה מקומית נשמרה",
        unsaved: "טרם נשמר",
      },
      explanations: {
        server:
          "השמירה מתבצעת דרך Server Action מאומת. ה־Tenant נגזר מה־Session ולא מתקבל מהטופס.",
        local:
          "Clerk אינו פעיל ולכן הנתונים נשמרים רק ב־Workspace הזמני. רענון מלא מוחק אותם ולא נוצר Tenant.",
      },
      fields: {
        businessName: "שם העסק",
        timezone: "אזור זמן",
        interfaceLanguage: "שפת ממשק",
        choose: "יש לבחור",
      },
      saveActions: {
        saving: "שומר...",
        server: "שמירת פרטי העסק בשרת",
        local: "שמירת פרטי העסק מקומית",
      },
      completenessKicker: "שלמות פרופיל העסק",
      completenessTitle: "שלמות פרטי העסק",
      checks: [
        "שם העסק הוזן",
        "אזור הזמן נבחר",
        "שפת הממשק נבחרה",
        "הגרסה הנוכחית נשמרה",
      ],
      notices: {
        tenantCreated:
          "Tenant, Owner Membership ופרטי העסק נוצרו ונשמרו בשרת.",
        serverUpdated:
          "פרטי העסק נשמרו מחדש בשרת עבור ה־Tenant המאומת.",
        localSaved:
          "פרטי העסק נשמרו מקומית. לא נוצר Tenant ולא נשלחה בקשה לשרת.",
        readyToSave:
          "כל השדות מולאו. יש לשמור את הגרסה הנוכחית.",
        missingFields:
          "יש להשלים את השדות החסרים; ניתן לעבור למסך אחר ולחזור לגרסה האחרונה שנשמרה.",
      },
      saveFailures: {
        "validation-error":
          "השרת דחה אחד או יותר מהשדות. יש לבדוק את הערכים ולנסות שוב.",
        unauthenticated: "ה־Session אינו פעיל. יש להתחבר מחדש.",
        "tenant-selection-required":
          "המשתמש שייך למספר Tenants ונדרשת בחירה מפורשת.",
        "permission-denied":
          "לתפקיד הנוכחי אין הרשאה לשנות את פרטי העסק.",
        "configuration-required": "חיבור Clerk אינו מוגדר במלואו.",
        "server-error":
          "השמירה בשרת נכשלה. לא בוצע מעבר שקט לשמירה מקומית.",
      },
      roadmapKicker: "מסלול הקמה",
    },
  },
  en: {
    dashboard: {
      eyebrow: "Control center",
      greetingWithBusiness: (businessName) =>
        `Good morning, ${businessName}. Let’s continue to the next step.`,
      greetingWithoutBusiness:
        "Good morning. Let’s connect your business.",
      descriptions: {
        profileAndMetaComplete:
          "The business profile and Meta connection are stored on the server. Continue to the next setup step.",
        serverProfileComplete:
          "The business profile is stored on the server for a verified tenant. The next step is the official Meta connection.",
        localProfileComplete:
          "The business profile is stored locally. The next step is the official Meta connection; no tenant was created and no backend request was sent.",
        profileIncomplete:
          "The workspace is ready. Complete the business profile before starting the official connection.",
      },
      showOpenDecisions: "View open decisions",
      metricsAriaLabel: "Account metrics",
      metrics: [
        "Messages this month",
        "Contacts",
        "Active campaigns",
        "AI usage",
      ],
      noMetricSource: "No data source is available yet",
      setupKicker: "Setup wizard",
      setupTitle: "10 steps to the first message",
      progress: (completed, total) => `${completed} of ${total}`,
      progressAriaLabel: (progress) => `Progress: ${progress}`,
      stepStates: {
        server: "Saved on server",
        local: "Saved locally",
        notStarted: "Not started",
      },
      continueActions: {
        businessProfile: "Complete business profile",
        meta: "Continue to Meta connection",
        onboarding: "Continue setup wizard",
      },
      decisionRequired: "Decision required",
      blockingDecisions: (count) =>
        `${count} decisions block Production`,
      blockingDecisionDescription:
        "The Meta, billing, packages, AI, and data-policy decisions are not approved yet.",
      openDecisionCenter: "Open decision center",
      quickActions: "Quick actions",
      importContacts: "Import contacts",
      buildFlow: "Build a flow",
      configureAiAgent: "Configure AI agent",
    },
    onboarding: {
      heading: {
        eyebrow: "Workspace setup",
        title: "Setup wizard",
        description:
          "These steps follow the specification. Only information that was actually entered is marked as ready.",
      },
      progress: {
        server: "Step 1 saved on server",
        local: "Step 1 ready locally",
        profile: (completed, total) =>
          `Business profile ${completed}/${total}`,
      },
      stepOneOfTen: "Step 1 of 10",
      businessDetails: "Business profile",
      statuses: {
        saving: "Saving on server",
        server: "Saved on server",
        local: "Local draft saved",
        unsaved: "Not saved",
      },
      explanations: {
        server:
          "A verified Server Action saves this form. The tenant is derived from the session and is never accepted from the form.",
        local:
          "Clerk is disabled, so the temporary workspace stores this data only in memory. A full refresh removes it and no tenant is created.",
      },
      fields: {
        businessName: "Business name",
        timezone: "Time zone",
        interfaceLanguage: "Interface language",
        choose: "Select an option",
      },
      saveActions: {
        saving: "Saving...",
        server: "Save business profile on server",
        local: "Save business profile locally",
      },
      completenessKicker: "Business profile completeness",
      completenessTitle: "Business profile completeness",
      checks: [
        "Business name entered",
        "Time zone selected",
        "Interface language selected",
        "Current version saved",
      ],
      notices: {
        tenantCreated:
          "The tenant, owner membership, and business profile were created and saved on the server.",
        serverUpdated:
          "The business profile was updated on the server for the verified tenant.",
        localSaved:
          "The business profile was saved locally. No tenant was created and no server request was sent.",
        readyToSave:
          "All fields are complete. Save the current version.",
        missingFields:
          "Complete the missing fields. You can leave this screen and return to the last saved version.",
      },
      saveFailures: {
        "validation-error":
          "The server rejected one or more fields. Review the values and try again.",
        unauthenticated: "The session is inactive. Sign in again.",
        "tenant-selection-required":
          "This user belongs to multiple tenants. Select one explicitly.",
        "permission-denied":
          "Your current role cannot change the business profile.",
        "configuration-required":
          "The Clerk connection is not fully configured.",
        "server-error":
          "The server save failed. Connect did not silently fall back to local storage.",
      },
      roadmapKicker: "Setup roadmap",
    },
  },
  ar: {
    dashboard: {
      eyebrow: "مركز التحكم",
      greetingWithBusiness: (businessName) =>
        `صباح الخير، ${businessName}. لننتقل إلى الخطوة التالية.`,
      greetingWithoutBusiness:
        "صباح الخير. لنبدأ بربط نشاطك التجاري.",
      descriptions: {
        profileAndMetaComplete:
          "تم حفظ بيانات النشاط وربط Meta على الخادم. يمكنك متابعة خطوة الإعداد التالية.",
        serverProfileComplete:
          "تم حفظ بيانات النشاط على الخادم لمؤسسة موثقة. الخطوة التالية هي الربط الرسمي مع Meta.",
        localProfileComplete:
          "تم حفظ بيانات النشاط محلياً. الخطوة التالية هي الربط الرسمي مع Meta؛ لم تُنشأ مؤسسة ولم يُرسل طلب إلى الـBackend.",
        profileIncomplete:
          "مساحة العمل جاهزة. أكمل بيانات النشاط قبل بدء الربط الرسمي.",
      },
      showOpenDecisions: "عرض القرارات المفتوحة",
      metricsAriaLabel: "مقاييس الحساب",
      metrics: [
        "رسائل هذا الشهر",
        "جهات الاتصال",
        "الحملات النشطة",
        "استخدام AI",
      ],
      noMetricSource: "لا يوجد مصدر بيانات بعد",
      setupKicker: "معالج الإعداد",
      setupTitle: "10 خطوات حتى أول إرسال",
      progress: (completed, total) => `${completed} من ${total}`,
      progressAriaLabel: (progress) => `التقدم: ${progress}`,
      stepStates: {
        server: "محفوظ على الخادم",
        local: "محفوظ محلياً",
        notStarted: "لم يبدأ",
      },
      continueActions: {
        businessProfile: "استكمال بيانات النشاط",
        meta: "المتابعة إلى ربط Meta",
        onboarding: "متابعة معالج الإعداد",
      },
      decisionRequired: "يتطلب قراراً",
      blockingDecisions: (count) =>
        `${count} قرارات تحظر Production`,
      blockingDecisionDescription:
        "لم تُعتمد بعد قرارات Meta والفوترة والباقات وAI وسياسة البيانات.",
      openDecisionCenter: "فتح مركز القرارات",
      quickActions: "إجراءات سريعة",
      importContacts: "استيراد جهات الاتصال",
      buildFlow: "إنشاء تدفق",
      configureAiAgent: "إعداد وكيل AI",
    },
    onboarding: {
      heading: {
        eyebrow: "إعداد مساحة العمل",
        title: "معالج الإعداد",
        description:
          "تتبع هذه الخطوات المواصفات. تُعرض فقط البيانات التي أُدخلت فعلياً على أنها جاهزة.",
      },
      progress: {
        server: "تم حفظ الخطوة 1 على الخادم",
        local: "الخطوة 1 جاهزة محلياً",
        profile: (completed, total) =>
          `بيانات النشاط ${completed}/${total}`,
      },
      stepOneOfTen: "الخطوة 1 من 10",
      businessDetails: "بيانات النشاط",
      statuses: {
        saving: "جارٍ الحفظ على الخادم",
        server: "محفوظ على الخادم",
        local: "تم حفظ المسودة محلياً",
        unsaved: "غير محفوظ",
      },
      explanations: {
        server:
          "يحفظ Server Action موثّق هذا النموذج. تُستنتج المؤسسة من الـSession ولا تُقبل من النموذج.",
        local:
          "Clerk غير مفعّل، لذلك تحفظ مساحة العمل المؤقتة البيانات في الذاكرة فقط. يؤدي التحديث الكامل إلى حذفها ولا تُنشأ مؤسسة.",
      },
      fields: {
        businessName: "اسم النشاط التجاري",
        timezone: "المنطقة الزمنية",
        interfaceLanguage: "لغة الواجهة",
        choose: "اختر خياراً",
      },
      saveActions: {
        saving: "جارٍ الحفظ...",
        server: "حفظ بيانات النشاط على الخادم",
        local: "حفظ بيانات النشاط محلياً",
      },
      completenessKicker: "اكتمال بيانات النشاط",
      completenessTitle: "اكتمال بيانات النشاط",
      checks: [
        "تم إدخال اسم النشاط",
        "تم اختيار المنطقة الزمنية",
        "تم اختيار لغة الواجهة",
        "تم حفظ الإصدار الحالي",
      ],
      notices: {
        tenantCreated:
          "تم إنشاء المؤسسة وعضوية المالك وبيانات النشاط وحفظها على الخادم.",
        serverUpdated:
          "تم تحديث بيانات النشاط على الخادم للمؤسسة الموثقة.",
        localSaved:
          "تم حفظ بيانات النشاط محلياً. لم تُنشأ مؤسسة ولم يُرسل طلب إلى الخادم.",
        readyToSave:
          "اكتملت جميع الحقول. احفظ الإصدار الحالي.",
        missingFields:
          "أكمل الحقول الناقصة. يمكنك مغادرة الشاشة والعودة إلى آخر إصدار محفوظ.",
      },
      saveFailures: {
        "validation-error":
          "رفض الخادم حقلاً واحداً أو أكثر. راجع القيم وحاول مجدداً.",
        unauthenticated: "الـSession غير نشط. سجّل الدخول مجدداً.",
        "tenant-selection-required":
          "ينتمي المستخدم إلى عدة مؤسسات. اختر واحدة بشكل صريح.",
        "permission-denied":
          "لا يسمح دورك الحالي بتغيير بيانات النشاط.",
        "configuration-required": "اتصال Clerk غير مكتمل الإعداد.",
        "server-error":
          "فشل الحفظ على الخادم. لم ينتقل Connect بصمت إلى الحفظ المحلي.",
      },
      roadmapKicker: "مسار الإعداد",
    },
  },
} as const satisfies Record<InterfaceLanguage, WorkspaceSetupMessages>;

export function readWorkspaceSetupMessages(
  language: InterfaceLanguage,
): WorkspaceSetupMessages {
  return workspaceSetupMessages[language];
}
