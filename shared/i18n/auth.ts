import type {
  InterfaceLanguage,
} from "../domain/businessProfileDraft";
import {
  publicLandingLocales,
  readPublicLandingDirection,
} from "./publicLanding.ts";

export type AuthMode = "login" | "register";

export interface AuthMessages {
  metadata: Record<AuthMode, { title: string }>;
  languageSelectorAriaLabel: string;
  brand: {
    badge: string;
    titleFirstLine: string;
    titleSecondLine: string;
    description: string;
    securityTitle: string;
    securityDescription: string;
  };
  configuration: {
    disabledTitle: string;
    disabledDescription: string;
    incompleteTitle: string;
    incompleteDescription: string;
  };
  form: Record<
    AuthMode,
    {
      eyebrow: string;
      title: string;
      description: string;
      switchPrompt: string;
      switchAction: string;
    }
  >;
}

export const authMessages = {
  he: {
    metadata: {
      login: { title: "התחברות | Connect" },
      register: { title: "פתיחת חשבון | Connect" },
    },
    languageSelectorAriaLabel: "בחירת שפת מסך האימות",
    brand: {
      badge: "Connect לעסקים",
      titleFirstLine: "סביבת עבודה אחת.",
      titleSecondLine: "כל התקשורת העסקית.",
      description:
        "נהלו את השיחות עם הלקוחות ואת עבודת הצוות במקום אחד.",
      securityTitle: "הסיסמה אינה נשמרת ב־Connect",
      securityDescription:
        "שירות האימות מטפל בכניסה לחשבון ובשחזור הסיסמה.",
    },
    configuration: {
      disabledTitle: "ההתחברות עדיין אינה זמינה",
      disabledDescription:
        "הגדרת השירות טרם הושלמה. פנו למנהל המערכת לקבלת גישה.",
      incompleteTitle: "לא ניתן להתחבר כרגע",
      incompleteDescription:
        "נדרשת בדיקה של הגדרות השירות. פנו למנהל המערכת ונסו שוב לאחר השלמתה.",
    },
    form: {
      login: {
        eyebrow: "כניסה מאובטחת",
        title: "ברוכים השבים",
        description:
          "התחברו לחשבון כדי להמשיך לסביבת העבודה שלכם.",
        switchPrompt: "עדיין אין לך חשבון?",
        switchAction: "פתיחת חשבון",
      },
      register: {
        eyebrow: "הצטרפות מאובטחת",
        title: "פתיחת חשבון",
        description:
          "לאחר אימות הזהות יתחיל תהליך יצירת סביבת העבודה.",
        switchPrompt: "כבר יש לך חשבון?",
        switchAction: "התחברות",
      },
    },
  },
  en: {
    metadata: {
      login: { title: "Sign in | Connect" },
      register: { title: "Create account | Connect" },
    },
    languageSelectorAriaLabel:
      "Select authentication language",
    brand: {
      badge: "Connect for business",
      titleFirstLine: "One workspace.",
      titleSecondLine: "Every business conversation.",
      description:
        "Manage customer conversations and work with your team in one place.",
      securityTitle: "Connect does not store your password",
      securityDescription:
        "The authentication service handles sign-in and password recovery.",
    },
    configuration: {
      disabledTitle: "Sign-in is not available yet",
      disabledDescription:
        "Service setup is not complete. Contact your administrator for access.",
      incompleteTitle: "Unable to sign in right now",
      incompleteDescription:
        "The service settings need attention. Contact your administrator and try again once they are resolved.",
    },
    form: {
      login: {
        eyebrow: "Secure sign-in",
        title: "Welcome back",
        description:
          "Sign in to continue to your workspace.",
        switchPrompt: "Do not have an account yet?",
        switchAction: "Create account",
      },
      register: {
        eyebrow: "Secure registration",
        title: "Create account",
        description:
          "Workspace creation begins after your identity is verified.",
        switchPrompt: "Already have an account?",
        switchAction: "Sign in",
      },
    },
  },
  ar: {
    metadata: {
      login: { title: "تسجيل الدخول | Connect" },
      register: { title: "إنشاء حساب | Connect" },
    },
    languageSelectorAriaLabel: "اختيار لغة المصادقة",
    brand: {
      badge: "Connect للأعمال",
      titleFirstLine: "مساحة عمل واحدة.",
      titleSecondLine: "لكل محادثات العمل.",
      description:
        "أديروا محادثات العملاء وتعاونوا مع فريقكم في مكان واحد.",
      securityTitle: "لا يخزن Connect كلمة المرور",
      securityDescription:
        "تتولى خدمة المصادقة تسجيل الدخول واستعادة كلمة المرور.",
    },
    configuration: {
      disabledTitle: "تسجيل الدخول غير متاح بعد",
      disabledDescription:
        "لم يكتمل إعداد الخدمة. تواصلوا مع مسؤول النظام للحصول على صلاحية الدخول.",
      incompleteTitle: "يتعذر تسجيل الدخول حالياً",
      incompleteDescription:
        "تحتاج إعدادات الخدمة إلى مراجعة. تواصلوا مع مسؤول النظام وحاولوا مجدداً بعد اكتمالها.",
    },
    form: {
      login: {
        eyebrow: "تسجيل دخول آمن",
        title: "مرحباً بعودتك",
        description:
          "سجلوا الدخول للمتابعة إلى مساحة العمل الخاصة بكم.",
        switchPrompt: "ليس لديك حساب بعد؟",
        switchAction: "إنشاء حساب",
      },
      register: {
        eyebrow: "تسجيل آمن",
        title: "إنشاء حساب",
        description:
          "يبدأ إنشاء مساحة العمل بعد التحقق من هويتك.",
        switchPrompt: "لديك حساب بالفعل؟",
        switchAction: "تسجيل الدخول",
      },
    },
  },
} as const satisfies Record<InterfaceLanguage, AuthMessages>;

export function readAuthMessages(
  language: InterfaceLanguage,
): AuthMessages {
  return authMessages[language];
}

export function readAuthHref(
  language: InterfaceLanguage,
  mode: AuthMode,
) {
  const prefix = language === "he" ? "" : `/${language}`;
  const route = mode === "login" ? "login" : "register";

  return `${prefix}/${route}`;
}

export function readAuthLanguageFromPathname(
  pathname: string | null,
): InterfaceLanguage {
  if (!pathname) {
    return "he";
  }

  const firstSegment = /^\/([^/]+)(?:\/|$)/u.exec(pathname)?.[1];

  return firstSegment === "en" || firstSegment === "ar"
    ? firstSegment
    : "he";
}

export function readAuthDirection(
  language: InterfaceLanguage,
) {
  return readPublicLandingDirection(language);
}

export function readAuthLocaleLinks(mode: AuthMode) {
  return publicLandingLocales.map((locale) => ({
    ...locale,
    href: readAuthHref(locale.language, mode),
  }));
}
