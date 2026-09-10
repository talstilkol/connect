import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";

export const metaEmbeddedSignupSdkErrorStatuses = [
  "INVALID_CONFIGURATION",
  "UNSUPPORTED_ENVIRONMENT",
  "CONFIGURATION_CONFLICT",
  "LOAD_FAILED",
  "LOAD_TIMEOUT",
  "INVALID_SDK",
  "INITIALIZATION_FAILED",
] as const;

export type MetaEmbeddedSignupSdkErrorStatus =
  (typeof metaEmbeddedSignupSdkErrorStatuses)[number];

export const metaEmbeddedSignupSdkStatuses = [
  "idle",
  "loading",
  "ready",
  ...metaEmbeddedSignupSdkErrorStatuses,
] as const;

export type MetaEmbeddedSignupSdkStatus =
  (typeof metaEmbeddedSignupSdkStatuses)[number];

export function isMetaEmbeddedSignupSdkErrorStatus(
  value: unknown,
): value is MetaEmbeddedSignupSdkErrorStatus {
  return (
    typeof value === "string" &&
    metaEmbeddedSignupSdkErrorStatuses.some(
      (status) => status === value,
    )
  );
}

export const metaSignupAttemptStatuses = [
  "preparing",
  "ready-to-launch",
  "attempt-in-progress",
  "idle",
  "launching",
  "awaiting-results",
  "submitting",
  "client-cancelled",
  "client-error",
  "unsupported-flow",
  "connected",
  "synchronization-pending",
  "configuration-required",
  "configuration-invalid",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "validation-error",
  "authorization-failed",
  "verification-failed",
  "subscription-failed",
  "synchronization-required",
  "server-error",
] as const;

export type MetaSignupAttemptStatus =
  (typeof metaSignupAttemptStatuses)[number];

export interface MetaConnectionPanelMessages {
  businessApp: {
    flowLabel: string;
    cloudChoice: string;
    businessChoice: string;
    pilotNotice: string;
    refresh: string;
    title: string;
    description: string;
    steps: readonly string[];
    unavailable: string;
  };
  aria: {
    closeBackdrop: string;
    closeButton: string;
  };
  header: {
    kicker: string;
    title: string;
  };
  sdkDetails: Record<
    MetaEmbeddedSignupSdkStatus | "setup-complete",
    string
  >;
  steps: {
    provider: {
      title: string;
      configured: (apiVersion: string) => string;
      invalid: string;
      snapshot: string;
      required: string;
    };
    sdk: {
      title: string;
    };
    contract: {
      title: string;
      verified: string;
      ready: string;
      waiting: string;
    };
    assets: {
      title: string;
      stored: string;
      embeddedSignup: string;
    };
    webhook: {
      title: string;
      verified: string;
    };
  };
  attemptDetails: Record<MetaSignupAttemptStatus, string | null>;
  actions: {
    preparing: string;
    openMeta: string;
    close: string;
    active: string;
    launching: string;
    awaitingResults: string;
    submitting: string;
    connected: string;
    sdkLoading: string;
    connect: string;
    retry: string;
    sdkWaiting: string;
    sdkFailed: string;
    invalidConfiguration: string;
    unavailable: string;
  };
}

export const metaConnectionPanelMessages = {
  he: {
    businessApp: {
      flowLabel: "סוג חיבור WhatsApp",
      cloudChoice: "מספר לשימוש דרך Cloud API",
      businessChoice: "חשבון WhatsApp Business קיים",
      pilotNotice: "המסלול פתוח לניסוי מבוקר. מצב ההרשמה ומצב סנכרון ההיסטוריה מוצגים בנפרד.",
      refresh: "רענון מצב",
      title: "חיבור WhatsApp Business בסריקה",
      description: "חיבור רשמי שמאפשר להמשיך להשתמש באותו מספר בטלפון וב־Connect. נדרש חשבון WhatsApp Business.",
      steps: [
        "בחלון Meta בוחרים לחבר חשבון WhatsApp Business קיים.",
        "פותחים בטלפון את הודעת החיבור הרשמית ומאשרים את החיבור.",
        "מזינים קוד אימות או בוחרים סריקת QR, לפי האפשרויות ש־Meta מציגה.",
      ],
      unavailable: "המסלול עדיין לא הופעל בסביבת העבודה. נדרש אימות החיבור והסנכרון לפני פתיחתו לציבור.",
    },
    aria: {
      closeBackdrop: "סגירת חלון חיבור",
      closeButton: "סגירה",
    },
    header: {
      kicker: "חיבור רשמי",
      title: "חיבור Meta ו־WhatsApp",
    },
    sdkDetails: {
      "setup-complete": "החיבור כבר פעיל ואין צורך בטעינה מחדש",
      ready: "Meta JavaScript SDK נטען ואותחל",
      loading: "Meta JavaScript SDK נטען כעת",
      idle: "הטעינה ממתינה לתצורת Embedded Signup תקינה",
      INVALID_CONFIGURATION: "תצורת Meta SDK אינה תקינה",
      UNSUPPORTED_ENVIRONMENT: "הדפדפן אינו תומך בטעינת Meta SDK",
      CONFIGURATION_CONFLICT: "Meta SDK כבר נטען עם תצורה אחרת",
      LOAD_FAILED: "טעינת Meta SDK נכשלה באופן בטוח",
      LOAD_TIMEOUT: "טעינת Meta SDK חרגה מזמן ההמתנה המותר",
      INVALID_SDK: "Meta SDK שנטען אינו חושף את הממשק הנדרש",
      INITIALIZATION_FAILED: "אתחול Meta SDK נכשל באופן בטוח",
    },
    steps: {
      provider: {
        title: "הגדרת ספק ומזהי Meta",
        configured: (apiVersion) =>
          `Meta App ו־Graph API ${apiVersion} הוגדרו בצד השרת`,
        invalid: "הגדרת Embedded Signup חלקית או לא תקינה",
        snapshot: "נשמר Snapshot מאומת בצד השרת",
        required: "החלטה ופרטי Meta App עדיין נדרשים",
      },
      sdk: {
        title: "טעינת Meta JavaScript SDK",
      },
      contract: {
        title: "חוזה Embedded Signup v4",
        verified: "תוצאת החיבור כבר אומתה ונשמרה בצד השרת",
        ready: "FB.login ואירועי Meta מוכנים להעברה מיידית לשרת",
        waiting: "קליטת האירועים תופעל רק לאחר טעינת SDK תקינה",
      },
      assets: {
        title: "Business Portfolio, WABA ומספר",
        stored: "המזהים נשמרו ואינם מוצגים בדפדפן",
        embeddedSignup: "השלב יבוצע דרך Embedded Signup",
      },
      webhook: {
        title: "Webhook ואימות החיבור",
        verified: "הרשמת ה־Webhook אושרה",
      },
    },
    attemptDetails: {
      idle: null,
      "synchronization-pending": "ההרשמה נשמרה. הסנכרון ממשיך ברקע, גם אם סוגרים את החלון. יש לבדוק את מצב הייבוא בנפרד.",
      preparing: "מכין ניסיון חיבור מאובטח",
      "ready-to-launch": "ההכנה הושלמה. לחצו על פתיחת Meta כדי להמשיך.",
      "attempt-in-progress": "ניסיון חיבור קודם עדיין בטיפול. רעננו את מצב החיבור לפני ניסיון נוסף.",
      launching: "פותח את חלון Meta",
      "awaiting-results": "ממתין להשלמת החיבור ב־Meta",
      submitting: "מאמת ושומר את החיבור בצד השרת",
      "client-cancelled": "תהליך החיבור בוטל לפני השלמה",
      "client-error": "החיבור לא הושלם באופן בטוח",
      "unsupported-flow": "Meta החזירה זרימה שאינה נתמכת ב־MVP",
      connected: "החיבור אומת ונשמר",
      "configuration-required": "תצורת השרת לחיבור Meta אינה מלאה",
      "configuration-invalid": "תצורת השרת לחיבור Meta אינה מלאה",
      unauthenticated: "אין הרשאה להשלים את החיבור בסביבת העבודה",
      "onboarding-required": "אין הרשאה להשלים את החיבור בסביבת העבודה",
      "tenant-selection-required":
        "אין הרשאה להשלים את החיבור בסביבת העבודה",
      "permission-denied": "אין הרשאה להשלים את החיבור בסביבת העבודה",
      "validation-error": "החיבור לא הושלם באופן בטוח",
      "authorization-failed": "הקוד של Meta נדחה או פג תוקף",
      "verification-failed": "נכסי Meta לא עברו אימות בעלות",
      "subscription-failed": "הרשמת ה־WABA נכשלה וניתן לנסות שוב",
      "synchronization-required": "חיבור WhatsApp Business בסריקה ממתין להשלמת סנכרון השיחות וההודעות מהטלפון.",
      "server-error": "החיבור לא הושלם באופן בטוח",
    },
    actions: {
      close: "סגירה",
      active: "החיבור פעיל",
      preparing: "מכין חיבור",
      openMeta: "פתיחת Meta",
      launching: "פותח את Meta",
      awaitingResults: "ממתין ל־Meta",
      submitting: "מאמת את החיבור",
      connected: "החיבור הושלם",
      sdkLoading: "טוען Meta SDK",
      connect: "הכנת חיבור Meta ו־WhatsApp",
      retry: "ניסיון חוזר לחיבור Meta",
      sdkWaiting: "טעינת Meta SDK ממתינה",
      sdkFailed: "טעינת Meta SDK נכשלה",
      invalidConfiguration: "הגדרת Meta אינה תקינה",
      unavailable: "פתיחת Meta טרם זמינה",
    },
  },
  en: {
    businessApp: {
      flowLabel: "WhatsApp connection type",
      cloudChoice: "Number for Cloud API",
      businessChoice: "Existing WhatsApp Business account",
      pilotNotice: "This flow is available for a controlled pilot. Registration and history synchronization have separate statuses.",
      refresh: "Refresh status",
      title: "Connect WhatsApp Business by scanning",
      description: "An official connection that lets you keep using the same number on your phone and in Connect. A WhatsApp Business account is required.",
      steps: [
        "In Meta, choose to connect an existing WhatsApp Business account.",
        "Open the official connection message on your phone and confirm the connection.",
        "Enter the verification code or choose to scan a QR code, depending on the options Meta displays.",
      ],
      unavailable: "This flow is not enabled for this workspace yet. Connection and synchronization must be verified before public rollout.",
    },
    aria: {
      closeBackdrop: "Close connection dialog",
      closeButton: "Close",
    },
    header: {
      kicker: "Official connection",
      title: "Connect Meta and WhatsApp",
    },
    sdkDetails: {
      "setup-complete": "The connection is active; reloading is unnecessary",
      ready: "The Meta JavaScript SDK is loaded and initialized",
      loading: "The Meta JavaScript SDK is loading",
      idle: "Loading is waiting for a valid Embedded Signup configuration",
      INVALID_CONFIGURATION: "The Meta SDK configuration is invalid",
      UNSUPPORTED_ENVIRONMENT: "This browser cannot load the Meta SDK",
      CONFIGURATION_CONFLICT: "The Meta SDK is already loaded with another configuration",
      LOAD_FAILED: "The Meta SDK failed to load safely",
      LOAD_TIMEOUT: "The Meta SDK exceeded its allowed loading time",
      INVALID_SDK: "The loaded Meta SDK does not expose the required interface",
      INITIALIZATION_FAILED: "The Meta SDK failed to initialize safely",
    },
    steps: {
      provider: {
        title: "Configure the provider and Meta identifiers",
        configured: (apiVersion) =>
          `The Meta App and Graph API ${apiVersion} are configured on the server`,
        invalid: "The Embedded Signup configuration is incomplete or invalid",
        snapshot: "A verified snapshot is stored on the server",
        required: "The operating decision and Meta App details are still required",
      },
      sdk: {
        title: "Load the Meta JavaScript SDK",
      },
      contract: {
        title: "Embedded Signup v4 contract",
        verified: "The connection result was verified and stored on the server",
        ready: "FB.login and Meta events are ready for immediate server submission",
        waiting: "Event capture starts only after the SDK loads successfully",
      },
      assets: {
        title: "Business Portfolio, WABA, and phone number",
        stored: "The identifiers are stored and are not shown in the browser",
        embeddedSignup: "This step runs through Embedded Signup",
      },
      webhook: {
        title: "Webhook and connection verification",
        verified: "The Webhook subscription is verified",
      },
    },
    attemptDetails: {
      idle: null,
      "synchronization-pending": "Onboarding is saved. Synchronization continues in the background when this window is closed. Check import status separately.",
      preparing: "Preparing a secure connection attempt",
      "ready-to-launch": "Preparation is complete. Select Open Meta to continue.",
      "attempt-in-progress": "A previous connection attempt is still being processed. Refresh the connection status before trying again.",
      launching: "Opening the Meta dialog",
      "awaiting-results": "Waiting for the Meta connection to complete",
      submitting: "Verifying and storing the connection on the server",
      "client-cancelled": "The connection process was cancelled before completion",
      "client-error": "The connection did not complete safely",
      "unsupported-flow": "Meta returned a flow that the MVP does not support",
      connected: "The connection was verified and stored",
      "configuration-required": "The server configuration for Meta is incomplete",
      "configuration-invalid": "The server configuration for Meta is incomplete",
      unauthenticated: "You are not authorized to complete this workspace connection",
      "onboarding-required":
        "You are not authorized to complete this workspace connection",
      "tenant-selection-required":
        "You are not authorized to complete this workspace connection",
      "permission-denied":
        "You are not authorized to complete this workspace connection",
      "validation-error": "The connection did not complete safely",
      "authorization-failed": "The Meta code was rejected or expired",
      "verification-failed": "Ownership of the Meta assets could not be verified",
      "subscription-failed": "The WABA subscription failed; you can try again",
      "synchronization-required": "WhatsApp Business scanning is waiting for chat synchronization and messages sent from your phone to be ready.",
      "server-error": "The connection did not complete safely",
    },
    actions: {
      close: "Close",
      active: "Connection active",
      preparing: "Preparing connection",
      openMeta: "Open Meta",
      launching: "Opening Meta",
      awaitingResults: "Waiting for Meta",
      submitting: "Verifying connection",
      connected: "Connection complete",
      sdkLoading: "Loading Meta SDK",
      connect: "Prepare Meta and WhatsApp connection",
      retry: "Retry Meta connection",
      sdkWaiting: "Meta SDK loading is waiting",
      sdkFailed: "Meta SDK loading failed",
      invalidConfiguration: "Meta configuration is invalid",
      unavailable: "Meta is not available yet",
    },
  },
  ar: {
    businessApp: {
      flowLabel: "نوع اتصال WhatsApp",
      cloudChoice: "رقم للاستخدام عبر Cloud API",
      businessChoice: "حساب WhatsApp Business حالي",
      pilotNotice: "هذا المسار متاح لتجربة محدودة. تُعرض حالة التسجيل ومزامنة السجل بشكل منفصل.",
      refresh: "تحديث الحالة",
      title: "ربط WhatsApp Business بالمسح",
      description: "ربط رسمي يتيح مواصلة استخدام الرقم نفسه على الهاتف وفي Connect. يلزم حساب WhatsApp Business.",
      steps: [
        "اختر ربط حساب WhatsApp Business موجود في نافذة Meta.",
        "افتح رسالة الربط الرسمية على هاتفك وأكّد الربط.",
        "أدخل رمز التحقق أو اختر مسح رمز QR بحسب الخيارات التي تعرضها Meta.",
      ],
      unavailable: "هذا المسار غير مفعّل لمساحة العمل بعد. يجب التحقق من الربط والمزامنة قبل الإتاحة العامة.",
    },
    aria: {
      closeBackdrop: "إغلاق نافذة الربط",
      closeButton: "إغلاق",
    },
    header: {
      kicker: "ربط رسمي",
      title: "ربط Meta وWhatsApp",
    },
    sdkDetails: {
      "setup-complete": "الربط نشط بالفعل ولا حاجة إلى إعادة التحميل",
      ready: "تم تحميل Meta JavaScript SDK وتهيئته",
      loading: "جارٍ تحميل Meta JavaScript SDK",
      idle: "ينتظر التحميل إعداد Embedded Signup صالحًا",
      INVALID_CONFIGURATION: "إعداد Meta SDK غير صالح",
      UNSUPPORTED_ENVIRONMENT: "هذا المتصفح لا يدعم تحميل Meta SDK",
      CONFIGURATION_CONFLICT: "تم تحميل Meta SDK مسبقًا بإعداد مختلف",
      LOAD_FAILED: "فشل تحميل Meta SDK بصورة آمنة",
      LOAD_TIMEOUT: "تجاوز تحميل Meta SDK مدة الانتظار المسموح بها",
      INVALID_SDK: "لا توفّر Meta SDK المحمّلة الواجهة المطلوبة",
      INITIALIZATION_FAILED: "فشلت تهيئة Meta SDK بصورة آمنة",
    },
    steps: {
      provider: {
        title: "إعداد المزوّد ومعرّفات Meta",
        configured: (apiVersion) =>
          `تم إعداد تطبيق Meta وGraph API ${apiVersion} على الخادم`,
        invalid: "إعداد Embedded Signup ناقص أو غير صالح",
        snapshot: "تم حفظ لقطة موثّقة على الخادم",
        required: "ما زال القرار التشغيلي وبيانات تطبيق Meta مطلوبين",
      },
      sdk: {
        title: "تحميل Meta JavaScript SDK",
      },
      contract: {
        title: "عقد Embedded Signup v4",
        verified: "تم التحقق من نتيجة الربط وحفظها على الخادم",
        ready: "أصبحت FB.login وأحداث Meta جاهزة للإرسال الفوري إلى الخادم",
        waiting: "لن يبدأ التقاط الأحداث إلا بعد تحميل SDK بنجاح",
      },
      assets: {
        title: "Business Portfolio وWABA ورقم الهاتف",
        stored: "تم حفظ المعرّفات ولن تُعرض في المتصفح",
        embeddedSignup: "تُنفّذ هذه الخطوة عبر Embedded Signup",
      },
      webhook: {
        title: "Webhook والتحقق من الربط",
        verified: "تم التحقق من اشتراك Webhook",
      },
    },
    attemptDetails: {
      idle: null,
      "synchronization-pending": "تم حفظ التسجيل. تستمر المزامنة في الخلفية حتى عند إغلاق النافذة. تحقق من حالة الاستيراد بشكل منفصل.",
      preparing: "جارٍ إعداد محاولة ربط آمنة",
      "ready-to-launch": "اكتمل الإعداد. اختر فتح Meta للمتابعة.",
      "attempt-in-progress": "ما زالت محاولة ربط سابقة قيد المعالجة. حدّث حالة الربط قبل المحاولة مجددًا.",
      launching: "جارٍ فتح نافذة Meta",
      "awaiting-results": "في انتظار اكتمال الربط في Meta",
      submitting: "جارٍ التحقق من الربط وحفظه على الخادم",
      "client-cancelled": "أُلغيت عملية الربط قبل اكتمالها",
      "client-error": "لم يكتمل الربط بصورة آمنة",
      "unsupported-flow": "أعادت Meta مسارًا لا يدعمه الإصدار الأولي",
      connected: "تم التحقق من الربط وحفظه",
      "configuration-required": "إعداد الخادم لربط Meta غير مكتمل",
      "configuration-invalid": "إعداد الخادم لربط Meta غير مكتمل",
      unauthenticated: "لا تملك صلاحية إكمال الربط في مساحة العمل",
      "onboarding-required": "لا تملك صلاحية إكمال الربط في مساحة العمل",
      "tenant-selection-required":
        "لا تملك صلاحية إكمال الربط في مساحة العمل",
      "permission-denied": "لا تملك صلاحية إكمال الربط في مساحة العمل",
      "validation-error": "لم يكتمل الربط بصورة آمنة",
      "authorization-failed": "رُفض رمز Meta أو انتهت صلاحيته",
      "verification-failed": "تعذّر التحقق من ملكية أصول Meta",
      "subscription-failed": "فشل اشتراك WABA ويمكن المحاولة مرة أخرى",
      "synchronization-required": "ينتظر الربط بالمسح اكتمال مزامنة المحادثات والرسائل المرسلة من الهاتف.",
      "server-error": "لم يكتمل الربط بصورة آمنة",
    },
    actions: {
      close: "إغلاق",
      active: "الربط نشط",
      preparing: "جارٍ إعداد الربط",
      openMeta: "فتح Meta",
      launching: "جارٍ فتح Meta",
      awaitingResults: "في انتظار Meta",
      submitting: "جارٍ التحقق من الربط",
      connected: "اكتمل الربط",
      sdkLoading: "جارٍ تحميل Meta SDK",
      connect: "إعداد ربط Meta وWhatsApp",
      retry: "إعادة محاولة ربط Meta",
      sdkWaiting: "تحميل Meta SDK قيد الانتظار",
      sdkFailed: "فشل تحميل Meta SDK",
      invalidConfiguration: "إعداد Meta غير صالح",
      unavailable: "Meta غير متاحة بعد",
    },
  },
} satisfies Record<InterfaceLanguage, MetaConnectionPanelMessages>;

export function readMetaConnectionPanelMessages(
  language: InterfaceLanguage,
): MetaConnectionPanelMessages {
  return metaConnectionPanelMessages[language];
}
