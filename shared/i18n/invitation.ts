import type {
  InterfaceLanguage,
} from "../domain/businessProfileDraft";
import type {
  TeamInvitationAcceptanceActionResult,
} from "../domain/teamInvitationView";
import {
  publicLandingLocales,
  readPublicLandingDirection,
} from "./publicLanding.ts";

type InvitationAcceptanceStatus =
  TeamInvitationAcceptanceActionResult["status"];
type InvitationPresentationStatus =
  | InvitationAcceptanceStatus
  | "ready";

export interface InvitationResultMessage {
  heading: string;
  description: string;
  complete: boolean;
}

export interface InvitationMessages {
  metadata: {
    title: string;
    description: string;
  };
  skipLink: string;
  homeAriaLabel: string;
  languageSelectorAriaLabel: string;
  brandSubtitle: string;
  heading: {
    kicker: string;
    title: string;
    description: string;
  };
  stepsAriaLabel: string;
  steps: {
    linkTitle: string;
    validLink: string;
    invalidLink: string;
    identityTitle: string;
    identityDescription: string;
    membershipTitle: string;
    membershipDescription: string;
  };
  blocked: {
    configurationTitle: string;
    configurationDescription: string;
    invalidTitle: string;
    invalidDescription: string;
  };
  actions: {
    accept: string;
    accepting: string;
    backHome: string;
  };
  privacyNote: string;
  results: Record<
    InvitationPresentationStatus,
    InvitationResultMessage
  >;
}

export const invitationMessages = {
  he: {
    metadata: {
      title: "הזמנה לצוות | Connect",
      description:
        "מסלול מאובטח לקבלת הזמנה לצוות Connect.",
    },
    skipLink: "דילוג לתוכן הראשי",
    homeAriaLabel: "Connect - עמוד הבית",
    languageSelectorAriaLabel: "בחירת שפת מסך ההזמנה",
    brandSubtitle: "הזמנה לצוות",
    heading: {
      kicker: "מסלול מאובטח",
      title: "הזמנה להצטרף לצוות",
      description:
        "הקבלה תתבצע רק לאחר אימות משתמש ואימייל בשרת. פרטי סביבת העבודה אינם נחשפים לפני האימות.",
    },
    stepsAriaLabel: "שלבי קבלת ההזמנה",
    steps: {
      linkTitle: "בדיקת הקישור",
      validLink: "מבנה הקישור תקין",
      invalidLink: "הקישור אינו תקין",
      identityTitle: "אימות זהות",
      identityDescription: "אימות Clerk ואימייל ראשי",
      membershipTitle: "יצירת חברות",
      membershipDescription: "D1 ו־Audit אטומי",
    },
    blocked: {
      configurationTitle: "קבלת ההזמנה עדיין אינה זמינה",
      configurationDescription:
        "המסלול נשאר חסום עד השלמת תצורת הזהות, סביבת ההפעלה ובדיקת E2E מאומתת.",
      invalidTitle: "לא ניתן להמשיך עם הקישור הזה",
      invalidDescription:
        "מבנה הקישור אינו תקין. לא בוצע ניסיון ליצור חברות.",
    },
    actions: {
      accept: "קבלת ההזמנה",
      accepting: "מאמת את ההזמנה…",
      backHome: "חזרה לעמוד הבית",
    },
    privacyNote:
      "Connect אינו מציג בקישור פרטי Tenant, כתובת אימייל או מזהה משתמש.",
    results: {
      accepted: {
        heading: "ההצטרפות לצוות הושלמה",
        description: "החברות נוצרה ונרשמה ביומן הבקרה.",
        complete: true,
      },
      "already-accepted": {
        heading: "ההזמנה כבר התקבלה",
        description: "אין צורך לבצע את הפעולה פעם נוספת.",
        complete: true,
      },
      "sign-in-required": {
        heading: "נדרשת התחברות",
        description:
          "יש להתחבר לחשבון שאליו נשלחה ההזמנה ולאחר מכן לנסות שוב.",
        complete: false,
      },
      "identity-verification-required": {
        heading: "נדרש אימות זהות",
        description:
          "יש להתחבר עם כתובת האימייל הראשית והמאומתת שאליה נשלחה ההזמנה.",
        complete: false,
      },
      "invitation-unavailable": {
        heading: "לא ניתן לקבל את ההזמנה",
        description:
          "הקישור אינו זמין או שאינו מתאים למשתמש המחובר.",
        complete: false,
      },
      "invalid-input": {
        heading: "לא ניתן לקבל את ההזמנה",
        description:
          "הקישור אינו זמין או שאינו מתאים למשתמש המחובר.",
        complete: false,
      },
      "temporarily-unavailable": {
        heading: "הפעולה אינה זמינה כרגע",
        description: "לא בוצע שינוי. אפשר לנסות שוב מאוחר יותר.",
        complete: false,
      },
      "configuration-required": {
        heading: "הפעולה אינה זמינה כרגע",
        description: "לא בוצע שינוי. אפשר לנסות שוב מאוחר יותר.",
        complete: false,
      },
      "server-error": {
        heading: "הפעולה אינה זמינה כרגע",
        description: "לא בוצע שינוי. אפשר לנסות שוב מאוחר יותר.",
        complete: false,
      },
      ready: {
        heading: "אפשר לאמת ולקבל את ההזמנה",
        description:
          "השרת יאמת את המשתמש ואת האימייל לפני יצירת החברות.",
        complete: false,
      },
    },
  },
  en: {
    metadata: {
      title: "Team invitation | Connect",
      description:
        "A secure route for accepting a Connect team invitation.",
    },
    skipLink: "Skip to main content",
    homeAriaLabel: "Connect - home page",
    languageSelectorAriaLabel: "Select invitation language",
    brandSubtitle: "Team invitation",
    heading: {
      kicker: "Secure route",
      title: "Invitation to join the team",
      description:
        "Acceptance occurs only after the server verifies the user and primary email. Workspace details remain private until verification.",
    },
    stepsAriaLabel: "Invitation acceptance steps",
    steps: {
      linkTitle: "Check the link",
      validLink: "The link structure is valid",
      invalidLink: "The link is invalid",
      identityTitle: "Verify identity",
      identityDescription: "Clerk and primary email verification",
      membershipTitle: "Create membership",
      membershipDescription: "Atomic D1 and audit operation",
    },
    blocked: {
      configurationTitle: "Invitation acceptance is not available yet",
      configurationDescription:
        "The route remains blocked until identity configuration, the runtime environment, and verified E2E checks are complete.",
      invalidTitle: "This link cannot be used",
      invalidDescription:
        "The link structure is invalid. No membership operation was attempted.",
    },
    actions: {
      accept: "Accept invitation",
      accepting: "Verifying invitation…",
      backHome: "Back to home page",
    },
    privacyNote:
      "Connect does not expose tenant details, an email address, or a user identifier in the link.",
    results: {
      accepted: {
        heading: "You joined the team",
        description:
          "The membership was created and recorded in the audit log.",
        complete: true,
      },
      "already-accepted": {
        heading: "The invitation was already accepted",
        description: "You do not need to perform the action again.",
        complete: true,
      },
      "sign-in-required": {
        heading: "Sign-in required",
        description:
          "Sign in to the account that received the invitation, then try again.",
        complete: false,
      },
      "identity-verification-required": {
        heading: "Identity verification required",
        description:
          "Sign in with the verified primary email address that received the invitation.",
        complete: false,
      },
      "invitation-unavailable": {
        heading: "The invitation cannot be accepted",
        description:
          "The link is unavailable or does not match the signed-in user.",
        complete: false,
      },
      "invalid-input": {
        heading: "The invitation cannot be accepted",
        description:
          "The link is unavailable or does not match the signed-in user.",
        complete: false,
      },
      "temporarily-unavailable": {
        heading: "The action is temporarily unavailable",
        description: "No change was made. Try again later.",
        complete: false,
      },
      "configuration-required": {
        heading: "The action is temporarily unavailable",
        description: "No change was made. Try again later.",
        complete: false,
      },
      "server-error": {
        heading: "The action is temporarily unavailable",
        description: "No change was made. Try again later.",
        complete: false,
      },
      ready: {
        heading: "The invitation is ready for verification",
        description:
          "The server will verify the user and email before creating the membership.",
        complete: false,
      },
    },
  },
  ar: {
    metadata: {
      title: "دعوة للانضمام إلى الفريق | Connect",
      description:
        "مسار آمن لقبول دعوة للانضمام إلى فريق Connect.",
    },
    skipLink: "الانتقال إلى المحتوى الرئيسي",
    homeAriaLabel: "Connect - الصفحة الرئيسية",
    languageSelectorAriaLabel: "اختيار لغة شاشة الدعوة",
    brandSubtitle: "دعوة الفريق",
    heading: {
      kicker: "مسار آمن",
      title: "دعوة للانضمام إلى الفريق",
      description:
        "يتم القبول فقط بعد أن يتحقق الخادم من المستخدم والبريد الإلكتروني الرئيسي. تبقى تفاصيل مساحة العمل خاصة حتى اكتمال التحقق.",
    },
    stepsAriaLabel: "خطوات قبول الدعوة",
    steps: {
      linkTitle: "فحص الرابط",
      validLink: "بنية الرابط صالحة",
      invalidLink: "الرابط غير صالح",
      identityTitle: "التحقق من الهوية",
      identityDescription:
        "التحقق عبر Clerk والبريد الإلكتروني الرئيسي",
      membershipTitle: "إنشاء العضوية",
      membershipDescription: "عملية ذرية في D1 وسجل التدقيق",
    },
    blocked: {
      configurationTitle: "قبول الدعوة غير متاح بعد",
      configurationDescription:
        "يبقى المسار محظوراً حتى اكتمال إعداد الهوية وبيئة التشغيل وفحوصات E2E الموثقة.",
      invalidTitle: "لا يمكن استخدام هذا الرابط",
      invalidDescription:
        "بنية الرابط غير صالحة. لم تتم محاولة إنشاء عضوية.",
    },
    actions: {
      accept: "قبول الدعوة",
      accepting: "جارٍ التحقق من الدعوة…",
      backHome: "العودة إلى الصفحة الرئيسية",
    },
    privacyNote:
      "لا يعرض Connect في الرابط تفاصيل المؤسسة أو عنوان البريد الإلكتروني أو معرّف المستخدم.",
    results: {
      accepted: {
        heading: "تم الانضمام إلى الفريق",
        description: "تم إنشاء العضوية وتسجيلها في سجل التدقيق.",
        complete: true,
      },
      "already-accepted": {
        heading: "تم قبول الدعوة مسبقاً",
        description: "لا حاجة إلى تنفيذ العملية مرة أخرى.",
        complete: true,
      },
      "sign-in-required": {
        heading: "تسجيل الدخول مطلوب",
        description:
          "سجّل الدخول إلى الحساب الذي تلقى الدعوة ثم حاول مرة أخرى.",
        complete: false,
      },
      "identity-verification-required": {
        heading: "التحقق من الهوية مطلوب",
        description:
          "سجّل الدخول باستخدام عنوان البريد الإلكتروني الرئيسي الموثق الذي تلقى الدعوة.",
        complete: false,
      },
      "invitation-unavailable": {
        heading: "لا يمكن قبول الدعوة",
        description:
          "الرابط غير متاح أو لا يطابق المستخدم المسجل دخوله.",
        complete: false,
      },
      "invalid-input": {
        heading: "لا يمكن قبول الدعوة",
        description:
          "الرابط غير متاح أو لا يطابق المستخدم المسجل دخوله.",
        complete: false,
      },
      "temporarily-unavailable": {
        heading: "العملية غير متاحة حالياً",
        description: "لم يتم إجراء أي تغيير. حاول مرة أخرى لاحقاً.",
        complete: false,
      },
      "configuration-required": {
        heading: "العملية غير متاحة حالياً",
        description: "لم يتم إجراء أي تغيير. حاول مرة أخرى لاحقاً.",
        complete: false,
      },
      "server-error": {
        heading: "العملية غير متاحة حالياً",
        description: "لم يتم إجراء أي تغيير. حاول مرة أخرى لاحقاً.",
        complete: false,
      },
      ready: {
        heading: "الدعوة جاهزة للتحقق",
        description:
          "سيتحقق الخادم من المستخدم والبريد الإلكتروني قبل إنشاء العضوية.",
        complete: false,
      },
    },
  },
} as const satisfies Record<InterfaceLanguage, InvitationMessages>;

export function readInvitationLanguage(
  value: unknown,
): InterfaceLanguage {
  return value === "en" || value === "ar" || value === "he"
    ? value
    : "he";
}

export function readInvitationMessages(
  language: InterfaceLanguage,
): InvitationMessages {
  return invitationMessages[language];
}

export function readInvitationDirection(
  language: InterfaceLanguage,
) {
  return readPublicLandingDirection(language);
}

export function readInvitationLocaleLinks() {
  return publicLandingLocales.map((locale) => ({
    ...locale,
    href: `?lang=${locale.language}`,
  }));
}

export function readInvitationResultMessage(
  language: InterfaceLanguage,
  result: TeamInvitationAcceptanceActionResult | null,
): InvitationResultMessage {
  const status = result?.status ?? "ready";

  return invitationMessages[language].results[status];
}
