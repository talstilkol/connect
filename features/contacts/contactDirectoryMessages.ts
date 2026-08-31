import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";

export const contactActionFailureStatuses = [
  "validation-error",
  "configuration-required",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "not-found",
  "server-error",
] as const;

export type ContactActionFailureStatus =
  (typeof contactActionFailureStatuses)[number];

export interface ContactDirectoryMessages {
  page: {
    eyebrow: string;
    title: string;
    description: string;
  };
  directory: {
    kicker: string;
    title: string;
    loaded: (count: number) => string;
    serverInactive: string;
    configurationNotice: string;
    errors: Record<
      | "onboarding-required"
      | "tenant-selection-required"
      | "server-error",
      string
    >;
    explanation: string;
    fields: {
      phoneNumber: string;
      firstName: string;
      lastName: string;
      email: string;
      company: string;
    };
    saving: string;
    save: string;
    recordsTitle: string;
    recordsSummary: (count: number, hasMore: boolean) => string;
    emptyTitle: string;
    emptyDescription: string;
    subscribed: string;
    blocked: string;
    documentConsent: string;
    documentUnsubscribe: string;
    loadingMore: string;
    loadMore: string;
    allLoaded: string;
    consent: {
      unknown: string;
      withdrawn: string;
      withdrawnWithSource: (source: string) => string;
      granted: string;
      grantedWithSource: (source: string) => string;
    };
    feedback: {
      saved: string;
      failures: Record<ContactActionFailureStatus, string>;
      loadFailures: Record<ContactActionFailureStatus, string>;
    };
  };
  consentEditor: {
    kicker: string;
    grantTitle: string;
    unsubscribeTitle: string;
    closeAriaLabel: string;
    source: string;
    occurredAt: string;
    evidenceReference: string;
    saving: string;
    saveGrant: string;
    saveUnsubscribe: string;
  };
  importSection: {
    kicker: string;
    title: string;
    description: string;
  };
  organization: {
    kicker: string;
    title: string;
    globalUnsubscribe: string;
    explanation: string;
    disabledNotice: string;
    tagName: string;
    createTag: string;
    listName: string;
    createList: string;
    contactPicker: string;
    chooseContact: string;
    tags: string;
    noTags: string;
    lists: string;
    noLists: string;
    contactCount: (count: number) => string;
    assigned: string;
    assign: string;
    saved: string;
    failures: Record<ContactActionFailureStatus, string>;
  };
}

const messages = {
  he: {
    page: {
      eyebrow: "קהל ונתונים",
      title: "אנשי קשר",
      description:
        "ניהול אנשי קשר, תגיות, רשימות ותיעוד הסכמה לקבלת הודעות.",
    },
    directory: {
      kicker: "אנשי קשר קבועים",
      title: "ניהול אנשי קשר קבוע",
      loaded: (count) => `${count} נטענו מהשרת`,
      serverInactive: "השרת אינו פעיל",
      configurationNotice:
        "Clerk אינו מוגדר. ניתן לבדוק את מסלול ה־CSV/XLSX המקומי, אך אי אפשר ליצור אנשי קשר קבועים.",
      errors: {
        "onboarding-required":
          "יש להשלים תחילה את פרטי העסק כדי ליצור Tenant פעיל.",
        "tenant-selection-required":
          "המשתמש שייך למספר Tenants ונדרשת בחירה מפורשת.",
        "server-error": "לא ניתן היה לטעון את אנשי הקשר מהשרת.",
      },
      explanation:
        "מספר הטלפון חייב להגיע בפורמט בינלאומי מפורש. איש קשר חדש נשמר כחסום לדיוור עד לתיעוד הסכמה נפרד.",
      fields: {
        phoneNumber: "מספר טלפון בינלאומי",
        firstName: "שם פרטי — רשות",
        lastName: "שם משפחה — רשות",
        email: "אימייל — רשות",
        company: "חברה — רשות",
      },
      saving: "שומר...",
      save: "שמירת איש קשר",
      recordsTitle: "אנשי קשר שנשמרו",
      recordsSummary: (count, hasMore) =>
        `נטענו ${count} רשומות${hasMore ? " · קיימות רשומות נוספות" : ""}`,
      emptyTitle: "אין אנשי קשר קבועים",
      emptyDescription:
        "הרשומה הראשונה תופיע לאחר שמירה מוצלחת בשרת.",
      subscribed: "מורשה לדיוור",
      blocked: "חסום לדיוור",
      documentConsent: "תיעוד הסכמה",
      documentUnsubscribe: "סימון הסרה",
      loadingMore: "טוען אנשי קשר נוספים...",
      loadMore: "טעינת 50 רשומות נוספות",
      allLoaded: "כל אנשי הקשר הזמינים נטענו.",
      consent: {
        unknown: "לא תועדה הסכמה",
        withdrawn: "הסרה תועדה",
        withdrawnWithSource: (source) =>
          `הסרה תועדה דרך ${source}`,
        granted: "הסכמה תועדה",
        grantedWithSource: (source) =>
          `הסכמה תועדה דרך ${source}`,
      },
      feedback: {
        saved: "הפעולה נשמרה בשרת עבור ה־Tenant המאומת.",
        failures: {
          "validation-error": "אחד או יותר מהשדות אינו תקין.",
          "configuration-required": "חיבור Clerk אינו מוגדר.",
          unauthenticated: "ה־Session אינו פעיל. יש להתחבר מחדש.",
          "onboarding-required":
            "יש להשלים תחילה את יצירת סביבת העבודה.",
          "tenant-selection-required": "נדרשת בחירת Tenant מפורשת.",
          "permission-denied":
            "לתפקיד הנוכחי אין הרשאה לבצע את הפעולה.",
          "not-found": "איש הקשר לא נמצא ב־Tenant הנוכחי.",
          "server-error": "הפעולה נכשלה בשרת ולא נשמרה מקומית.",
        },
        loadFailures: {
          "validation-error": "סמן ההמשך של הרשימה אינו תקין.",
          "configuration-required": "חיבור Clerk אינו מוגדר.",
          unauthenticated: "ה־Session אינו פעיל. יש להתחבר מחדש.",
          "onboarding-required":
            "יש להשלים תחילה את יצירת סביבת העבודה.",
          "tenant-selection-required": "נדרשת בחירת Tenant מפורשת.",
          "permission-denied":
            "לתפקיד הנוכחי אין הרשאה לקרוא אנשי קשר.",
          "not-found":
            "טעינת הרשומות הנוספות נכשלה. הרשומות שכבר נטענו נשארו במסך.",
          "server-error":
            "טעינת הרשומות הנוספות נכשלה. הרשומות שכבר נטענו נשארו במסך.",
        },
      },
    },
    consentEditor: {
      kicker: "אירוע הסכמה",
      grantTitle: "תיעוד הסכמה",
      unsubscribeTitle: "תיעוד הסרה מדיוור",
      closeAriaLabel: "סגירת טופס הסכמה",
      source: "מקור התיעוד",
      occurredAt: "מועד האירוע",
      evidenceReference: "הפניה לראיה — רשות",
      saving: "שומר...",
      saveGrant: "שמירת ההסכמה",
      saveUnsubscribe: "שמירת ההסרה",
    },
    importSection: {
      kicker: "בדיקת ייבוא",
      title: "בדיקת קובץ לפני ייבוא",
      description:
        "בדיקת הקובץ נעשית מקומית; לאחר אישור מפורש הפרופילים נשמרים בשרת בלי לייבא הרשאת דיוור.",
    },
    organization: {
      kicker: "תגיות ורשימות",
      title: "ארגון אנשי קשר",
      globalUnsubscribe: "הסרה גלובלית",
      explanation:
        "תגיות ורשימות מארגנות קהלים בלבד. הן אינן יכולות לעקוף הסרה: איש קשר חסום נשאר חסום בכל הרשימות.",
      disabledNotice:
        "נדרשים Clerk ו־Tenant פעיל כדי לשמור תגיות ורשימות.",
      tagName: "שם תגית",
      createTag: "יצירת תגית",
      listName: "שם רשימה",
      createList: "יצירת רשימה",
      contactPicker: "איש קשר לניהול שיוכים",
      chooseContact: "בחירת איש קשר",
      tags: "תגיות",
      noTags: "לא נוצרו תגיות.",
      lists: "רשימות",
      noLists: "לא נוצרו רשימות.",
      contactCount: (count) => `${count} אנשי קשר`,
      assigned: "משויך",
      assign: "שיוך",
      saved: "השינוי נשמר עבור ה־Tenant המאומת.",
      failures: {
        "validation-error": "שם הקבוצה או השיוך אינם תקינים.",
        "configuration-required": "חיבור Clerk אינו מוגדר.",
        unauthenticated: "ה־Session אינו פעיל. יש להתחבר מחדש.",
        "onboarding-required":
          "יש להשלים תחילה את יצירת סביבת העבודה.",
        "tenant-selection-required": "נדרשת בחירת Tenant מפורשת.",
        "permission-denied":
          "לתפקיד הנוכחי אין הרשאה לשנות קבוצות.",
        "not-found": "איש הקשר או הקבוצה אינם שייכים ל־Tenant.",
        "server-error": "השינוי נכשל בשרת.",
      },
    },
  },
  en: {
    page: {
      eyebrow: "Audience and data",
      title: "Contacts",
      description:
        "Manage contacts, tags, lists, and messaging-consent evidence.",
    },
    directory: {
      kicker: "Persistent contacts",
      title: "Persistent contact management",
      loaded: (count) => `${count} loaded from the server`,
      serverInactive: "Server unavailable",
      configurationNotice:
        "Clerk is not configured. You can test the local CSV/XLSX flow, but persistent contacts cannot be created.",
      errors: {
        "onboarding-required":
          "Complete the business profile first to create an active tenant.",
        "tenant-selection-required":
          "The user belongs to multiple tenants and must choose one explicitly.",
        "server-error": "Contacts could not be loaded from the server.",
      },
      explanation:
        "The phone number must use an explicit international format. A new contact remains blocked from messaging until consent is documented separately.",
      fields: {
        phoneNumber: "International phone number",
        firstName: "First name — optional",
        lastName: "Last name — optional",
        email: "Email — optional",
        company: "Company — optional",
      },
      saving: "Saving...",
      save: "Save contact",
      recordsTitle: "Saved contacts",
      recordsSummary: (count, hasMore) =>
        `${count} records loaded${hasMore ? " · more records are available" : ""}`,
      emptyTitle: "No persistent contacts",
      emptyDescription:
        "The first record will appear after it is saved successfully on the server.",
      subscribed: "Messaging allowed",
      blocked: "Messaging blocked",
      documentConsent: "Document consent",
      documentUnsubscribe: "Mark unsubscribe",
      loadingMore: "Loading more contacts...",
      loadMore: "Load 50 more records",
      allLoaded: "All available contacts are loaded.",
      consent: {
        unknown: "Consent is not documented",
        withdrawn: "Unsubscribe documented",
        withdrawnWithSource: (source) =>
          `Unsubscribe documented through ${source}`,
        granted: "Consent documented",
        grantedWithSource: (source) =>
          `Consent documented through ${source}`,
      },
      feedback: {
        saved: "The action was saved for the authenticated tenant.",
        failures: {
          "validation-error": "One or more fields are invalid.",
          "configuration-required": "Clerk is not configured.",
          unauthenticated: "The session is inactive. Sign in again.",
          "onboarding-required": "Complete workspace creation first.",
          "tenant-selection-required": "Choose a tenant explicitly.",
          "permission-denied":
            "Your current role cannot perform this action.",
          "not-found": "The contact was not found in the current tenant.",
          "server-error":
            "The server action failed and was not saved locally.",
        },
        loadFailures: {
          "validation-error": "The list continuation cursor is invalid.",
          "configuration-required": "Clerk is not configured.",
          unauthenticated: "The session is inactive. Sign in again.",
          "onboarding-required": "Complete workspace creation first.",
          "tenant-selection-required": "Choose a tenant explicitly.",
          "permission-denied":
            "Your current role cannot read contacts.",
          "not-found":
            "Additional records could not be loaded. Previously loaded records remain visible.",
          "server-error":
            "Additional records could not be loaded. Previously loaded records remain visible.",
        },
      },
    },
    consentEditor: {
      kicker: "Consent event",
      grantTitle: "Document consent",
      unsubscribeTitle: "Document messaging unsubscribe",
      closeAriaLabel: "Close consent form",
      source: "Evidence source",
      occurredAt: "Event time",
      evidenceReference: "Evidence reference — optional",
      saving: "Saving...",
      saveGrant: "Save consent",
      saveUnsubscribe: "Save unsubscribe",
    },
    importSection: {
      kicker: "Import rehearsal",
      title: "Review a file before importing",
      description:
        "The file is checked locally. After explicit confirmation, profiles are stored on the server without importing messaging consent.",
    },
    organization: {
      kicker: "Tags and lists",
      title: "Organize contacts",
      globalUnsubscribe: "Global unsubscribe",
      explanation:
        "Tags and lists organize audiences only. They cannot bypass an unsubscribe: a blocked contact remains blocked in every list.",
      disabledNotice:
        "Clerk and an active tenant are required to save tags and lists.",
      tagName: "Tag name",
      createTag: "Create tag",
      listName: "List name",
      createList: "Create list",
      contactPicker: "Contact to manage assignments",
      chooseContact: "Choose a contact",
      tags: "Tags",
      noTags: "No tags have been created.",
      lists: "Lists",
      noLists: "No lists have been created.",
      contactCount: (count) => `${count} contacts`,
      assigned: "Assigned",
      assign: "Assign",
      saved: "The change was saved for the authenticated tenant.",
      failures: {
        "validation-error": "The group name or assignment is invalid.",
        "configuration-required": "Clerk is not configured.",
        unauthenticated: "The session is inactive. Sign in again.",
        "onboarding-required": "Complete workspace creation first.",
        "tenant-selection-required": "Choose a tenant explicitly.",
        "permission-denied":
          "Your current role cannot change contact groups.",
        "not-found":
          "The contact or group does not belong to this tenant.",
        "server-error": "The server change failed.",
      },
    },
  },
  ar: {
    page: {
      eyebrow: "الجمهور والبيانات",
      title: "جهات الاتصال",
      description:
        "إدارة جهات الاتصال والوسوم والقوائم وأدلة الموافقة على الرسائل.",
    },
    directory: {
      kicker: "جهات اتصال دائمة",
      title: "إدارة جهات الاتصال الدائمة",
      loaded: (count) => `تم تحميل ${count} من الخادم`,
      serverInactive: "الخادم غير متاح",
      configurationNotice:
        "لم يتم إعداد Clerk. يمكن اختبار مسار CSV/XLSX المحلي، لكن لا يمكن إنشاء جهات اتصال دائمة.",
      errors: {
        "onboarding-required":
          "أكمل بيانات النشاط أولًا لإنشاء Tenant نشط.",
        "tenant-selection-required":
          "ينتمي المستخدم إلى عدة Tenants ويجب اختيار أحدها صراحةً.",
        "server-error": "تعذّر تحميل جهات الاتصال من الخادم.",
      },
      explanation:
        "يجب أن يستخدم رقم الهاتف تنسيقًا دوليًا صريحًا. تبقى جهة الاتصال الجديدة محظورة من المراسلة حتى توثيق الموافقة بصورة منفصلة.",
      fields: {
        phoneNumber: "رقم هاتف دولي",
        firstName: "الاسم الأول — اختياري",
        lastName: "اسم العائلة — اختياري",
        email: "البريد الإلكتروني — اختياري",
        company: "الشركة — اختيارية",
      },
      saving: "جارٍ الحفظ...",
      save: "حفظ جهة الاتصال",
      recordsTitle: "جهات الاتصال المحفوظة",
      recordsSummary: (count, hasMore) =>
        `تم تحميل ${count} سجل${hasMore ? " · تتوفر سجلات إضافية" : ""}`,
      emptyTitle: "لا توجد جهات اتصال دائمة",
      emptyDescription:
        "سيظهر السجل الأول بعد حفظه بنجاح على الخادم.",
      subscribed: "المراسلة مسموحة",
      blocked: "المراسلة محظورة",
      documentConsent: "توثيق الموافقة",
      documentUnsubscribe: "تسجيل إلغاء الاشتراك",
      loadingMore: "جارٍ تحميل المزيد من جهات الاتصال...",
      loadMore: "تحميل 50 سجلًا إضافيًا",
      allLoaded: "تم تحميل جميع جهات الاتصال المتاحة.",
      consent: {
        unknown: "لم يتم توثيق الموافقة",
        withdrawn: "تم توثيق إلغاء الاشتراك",
        withdrawnWithSource: (source) =>
          `تم توثيق إلغاء الاشتراك عبر ${source}`,
        granted: "تم توثيق الموافقة",
        grantedWithSource: (source) =>
          `تم توثيق الموافقة عبر ${source}`,
      },
      feedback: {
        saved: "تم حفظ الإجراء للـTenant الموثّق.",
        failures: {
          "validation-error": "حقل واحد أو أكثر غير صالح.",
          "configuration-required": "لم يتم إعداد Clerk.",
          unauthenticated: "الجلسة غير نشطة. سجّل الدخول مجددًا.",
          "onboarding-required": "أكمل إنشاء مساحة العمل أولًا.",
          "tenant-selection-required": "اختر Tenant صراحةً.",
          "permission-denied": "لا يسمح دورك الحالي بتنفيذ هذا الإجراء.",
          "not-found": "لم يتم العثور على جهة الاتصال في الـTenant الحالي.",
          "server-error": "فشل إجراء الخادم ولم يُحفظ محليًا.",
        },
        loadFailures: {
          "validation-error": "مؤشر متابعة القائمة غير صالح.",
          "configuration-required": "لم يتم إعداد Clerk.",
          unauthenticated: "الجلسة غير نشطة. سجّل الدخول مجددًا.",
          "onboarding-required": "أكمل إنشاء مساحة العمل أولًا.",
          "tenant-selection-required": "اختر Tenant صراحةً.",
          "permission-denied": "لا يسمح دورك الحالي بقراءة جهات الاتصال.",
          "not-found":
            "تعذّر تحميل السجلات الإضافية. تبقى السجلات المحمّلة ظاهرة.",
          "server-error":
            "تعذّر تحميل السجلات الإضافية. تبقى السجلات المحمّلة ظاهرة.",
        },
      },
    },
    consentEditor: {
      kicker: "حدث موافقة",
      grantTitle: "توثيق الموافقة",
      unsubscribeTitle: "توثيق إلغاء الاشتراك في المراسلة",
      closeAriaLabel: "إغلاق نموذج الموافقة",
      source: "مصدر الدليل",
      occurredAt: "وقت الحدث",
      evidenceReference: "مرجع الدليل — اختياري",
      saving: "جارٍ الحفظ...",
      saveGrant: "حفظ الموافقة",
      saveUnsubscribe: "حفظ إلغاء الاشتراك",
    },
    importSection: {
      kicker: "اختبار الاستيراد",
      title: "فحص ملف قبل الاستيراد",
      description:
        "يُفحص الملف محليًا. بعد التأكيد الصريح، تُحفظ الملفات التعريفية على الخادم من دون استيراد موافقة المراسلة.",
    },
    organization: {
      kicker: "الوسوم والقوائم",
      title: "تنظيم جهات الاتصال",
      globalUnsubscribe: "إلغاء اشتراك شامل",
      explanation:
        "تنظّم الوسوم والقوائم الجماهير فقط. لا يمكنها تجاوز إلغاء الاشتراك: تبقى جهة الاتصال المحظورة محظورة في جميع القوائم.",
      disabledNotice:
        "يلزم Clerk وTenant نشط لحفظ الوسوم والقوائم.",
      tagName: "اسم الوسم",
      createTag: "إنشاء وسم",
      listName: "اسم القائمة",
      createList: "إنشاء قائمة",
      contactPicker: "جهة الاتصال المراد إدارة تعييناتها",
      chooseContact: "اختيار جهة اتصال",
      tags: "الوسوم",
      noTags: "لم يتم إنشاء وسوم.",
      lists: "القوائم",
      noLists: "لم يتم إنشاء قوائم.",
      contactCount: (count) => `${count} جهة اتصال`,
      assigned: "مُعيّن",
      assign: "تعيين",
      saved: "تم حفظ التغيير للـTenant الموثّق.",
      failures: {
        "validation-error": "اسم المجموعة أو التعيين غير صالح.",
        "configuration-required": "لم يتم إعداد Clerk.",
        unauthenticated: "الجلسة غير نشطة. سجّل الدخول مجددًا.",
        "onboarding-required": "أكمل إنشاء مساحة العمل أولًا.",
        "tenant-selection-required": "اختر Tenant صراحةً.",
        "permission-denied": "لا يسمح دورك الحالي بتغيير المجموعات.",
        "not-found": "جهة الاتصال أو المجموعة لا تنتمي إلى هذا الـTenant.",
        "server-error": "فشل التغيير على الخادم.",
      },
    },
  },
} satisfies Record<InterfaceLanguage, ContactDirectoryMessages>;

export function readContactDirectoryMessages(
  language: InterfaceLanguage,
): ContactDirectoryMessages {
  return messages[language];
}
