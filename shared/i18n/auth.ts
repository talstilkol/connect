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
      badge: "React SaaS",
      titleFirstLine: "סביבת עבודה אחת.",
      titleSecondLine: "כל התקשורת העסקית.",
      description:
        "כל משתמש מזוהה על ידי Clerk, ולאחר מכן Membership בצד השרת קובע לאיזה Tenant ולאילו הרשאות הוא שייך.",
      securityTitle: "הסיסמה אינה נשמרת ב־Connect",
      securityDescription:
        "אימות, Verification ואיפוס סיסמה מנוהלים דרך Clerk.",
    },
    configuration: {
      disabledTitle: "Clerk מוכן לחיבור אך טרם הופעל",
      disabledDescription:
        "יש להגדיר Publishable Key ו־Secret Key בסביבת ההרצה. לא נוצר משתמש חלופי ולא בוצעה כניסה מדומה.",
      incompleteTitle: "הגדרת Clerk אינה מלאה",
      incompleteDescription:
        "הוגדר רק חלק מחוזה ההתחברות. מטעמי אבטחה הטופס נשאר חסום עד השלמת שני המפתחות.",
    },
    form: {
      login: {
        eyebrow: "כניסה מאובטחת",
        title: "ברוכים השבים",
        description:
          "הגישה ל־Workspace דורשת Session מאומת ו־Membership פעיל.",
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
      badge: "React SaaS",
      titleFirstLine: "One workspace.",
      titleSecondLine: "Every business conversation.",
      description:
        "Clerk verifies each user, then a server-side membership determines which tenant and permissions they can access.",
      securityTitle: "Connect does not store your password",
      securityDescription:
        "Clerk manages authentication, verification, and password recovery.",
    },
    configuration: {
      disabledTitle: "Clerk is ready but not enabled",
      disabledDescription:
        "Configure the Publishable Key and Secret Key in the runtime environment. Connect does not create a fallback user or simulate a sign-in.",
      incompleteTitle: "Clerk configuration is incomplete",
      incompleteDescription:
        "Only part of the authentication contract is configured. For security, the form remains blocked until both keys are available.",
    },
    form: {
      login: {
        eyebrow: "Secure sign-in",
        title: "Welcome back",
        description:
          "Workspace access requires a verified session and an active membership.",
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
      badge: "React SaaS",
      titleFirstLine: "مساحة عمل واحدة.",
      titleSecondLine: "لكل محادثات العمل.",
      description:
        "يتحقق Clerk من هوية كل مستخدم، ثم تحدد العضوية على الخادم المؤسسة والصلاحيات التي يمكنه الوصول إليها.",
      securityTitle: "لا يخزن Connect كلمة المرور",
      securityDescription:
        "يدير Clerk المصادقة والتحقق واستعادة كلمة المرور.",
    },
    configuration: {
      disabledTitle: "Clerk جاهز للربط لكنه غير مفعّل",
      disabledDescription:
        "يجب إعداد Publishable Key وSecret Key في بيئة التشغيل. لا ينشئ Connect مستخدماً بديلاً ولا يحاكي تسجيل الدخول.",
      incompleteTitle: "إعداد Clerk غير مكتمل",
      incompleteDescription:
        "تم إعداد جزء فقط من عقد المصادقة. لأسباب أمنية، يبقى النموذج محظوراً حتى يتوفر المفتاحان.",
    },
    form: {
      login: {
        eyebrow: "تسجيل دخول آمن",
        title: "مرحباً بعودتك",
        description:
          "يتطلب الوصول إلى مساحة العمل جلسة موثقة وعضوية نشطة.",
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
