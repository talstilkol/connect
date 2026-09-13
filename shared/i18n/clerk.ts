import {
  arSA,
  enUS,
  heIL,
} from "@clerk/localizations";

// Clerk's Hebrew and Arabic catalogs leave the MFA setup keys undefined.
// Keep these overrides at the supported localization boundary.
export const clerkLocalization = {
  he: {
    ...heIL,
    taskSetupMfa: {
      badge: "הגדרת אימות דו־שלבי",
      signOut: {
        actionLink: "התנתקות",
        actionText: "מחובר בתור {{identifier}}",
      },
      start: {
        title: "הגדרת אימות דו־שלבי",
        subtitle: "בחרו שיטת אימות שתוסיף שכבת הגנה לחשבון שלכם",
        methodSelection: {
          totp: "אפליקציית אימות",
          phoneCode: "קוד בהודעת SMS",
        },
      },
      totpCode: {
        title: "הוספת אפליקציית אימות",
        addAuthenticatorApp: {
          infoText__ableToScan:
            "הוסיפו חשבון באפליקציית האימות וסרקו את קוד ה־QR כדי לקשר אותה לחשבון שלכם.",
          infoText__unableToScan:
            "הוסיפו חשבון באפליקציית האימות והזינו את המפתח שמופיע בהמשך.",
          inputLabel__unableToScan1:
            "בחרו קוד חד־פעמי מבוסס זמן (TOTP), ואז השלימו את קישור החשבון.",
          buttonUnableToScan__nonPrimary: "לא ניתן לסרוק את קוד ה־QR?",
          buttonAbleToScan__nonPrimary: "סריקת קוד QR במקום הזנה ידנית",
          formButtonPrimary: "המשך",
          formButtonReset: "ביטול",
        },
        verifyTotp: {
          title: "הוספת אפליקציית אימות",
          subtitle: "הזינו את הקוד שמופיע באפליקציית האימות שלכם",
          formTitle: "קוד אימות",
          formButtonPrimary: "המשך",
          formButtonReset: "ביטול",
        },
        success: {
          title: "האימות באמצעות האפליקציה הופעל",
          message1:
            "אימות דו־שלבי פעיל כעת. בכניסה לחשבון תתבקשו להזין גם קוד מאפליקציית האימות.",
          message2:
            "שמרו את קודי הגיבוי במקום בטוח. אם תאבדו גישה לאפליקציית האימות, תוכלו להתחבר באמצעות קוד גיבוי.",
          finishButton: "המשך",
        },
      },
      smsCode: {
        title: "הוספת אימות באמצעות SMS",
        subtitle: "בחרו מספר טלפון לקבלת קוד באימות דו־שלבי",
        addPhoneNumber: "הוספת מספר טלפון",
        cancel: "ביטול",
        addPhone: {
          infoText:
            "קוד אימות יישלח למספר הזה בהודעת SMS. ייתכן חיוב בהתאם לתעריפי ספק התקשורת שלכם.",
          formButtonPrimary: "המשך",
        },
        verifyPhone: {
          title: "אימות מספר הטלפון",
          subtitle: "הזינו את קוד האימות שנשלח אל",
          formTitle: "קוד אימות",
          resendButton: "לא קיבלתם קוד? שליחה מחדש",
          formButtonPrimary: "המשך",
        },
        success: {
          title: "האימות באמצעות SMS הופעל",
          message1:
            "אימות דו־שלבי פעיל כעת. בכניסה לחשבון תתבקשו להזין גם קוד שיישלח למספר הטלפון הזה.",
          message2:
            "שמרו את קודי הגיבוי במקום בטוח. אם תאבדו גישה לטלפון, תוכלו להתחבר באמצעות קוד גיבוי.",
          finishButton: "המשך",
        },
      },
    },
    unstable__errors: {
      ...heIL.unstable__errors,
      form_code_incorrect: "קוד האימות שגוי. בדקו את הקוד ונסו שוב.",
      form_param_nil: "יש למלא את השדה הזה.",
    },
  },
  en: enUS,
  ar: {
    ...arSA,
    // Missing in the upstream Arabic catalog; otherwise Clerk falls back to English.
    formFieldInputPlaceholder__emailAddress: "أدخل عنوان بريدك الإلكتروني",
    formFieldInputPlaceholder__password: "أدخل كلمة المرور",
    taskSetupMfa: {
      badge: "إعداد التحقق بخطوتين",
      signOut: {
        actionLink: "تسجيل الخروج",
        actionText: "تم تسجيل الدخول باسم {{identifier}}",
      },
      start: {
        title: "إعداد التحقق بخطوتين",
        subtitle: "اختر طريقة تحقق لإضافة طبقة حماية إلى حسابك",
        methodSelection: {
          totp: "تطبيق المصادقة",
          phoneCode: "رمز عبر رسالة SMS",
        },
      },
      totpCode: {
        title: "إضافة تطبيق مصادقة",
        addAuthenticatorApp: {
          infoText__ableToScan:
            "أضف حسابًا في تطبيق المصادقة وامسح رمز QR لربطه بحسابك.",
          infoText__unableToScan:
            "أضف حسابًا في تطبيق المصادقة وأدخل المفتاح الموضح أدناه.",
          inputLabel__unableToScan1:
            "اختر رمزًا مؤقتًا يعتمد على الوقت (TOTP)، ثم أكمل ربط الحساب.",
          buttonUnableToScan__nonPrimary: "يتعذر مسح رمز QR؟",
          buttonAbleToScan__nonPrimary: "مسح رمز QR بدلًا من الإدخال اليدوي",
          formButtonPrimary: "متابعة",
          formButtonReset: "إلغاء",
        },
        verifyTotp: {
          title: "إضافة تطبيق مصادقة",
          subtitle: "أدخل الرمز الذي يظهر في تطبيق المصادقة",
          formTitle: "رمز التحقق",
          formButtonPrimary: "متابعة",
          formButtonReset: "إلغاء",
        },
        success: {
          title: "تم تفعيل التحقق عبر تطبيق المصادقة",
          message1:
            "التحقق بخطوتين مفعّل الآن. عند تسجيل الدخول، سيُطلب منك أيضًا إدخال رمز من تطبيق المصادقة.",
          message2:
            "احفظ الرموز الاحتياطية في مكان آمن. إذا فقدت الوصول إلى تطبيق المصادقة، يمكنك تسجيل الدخول باستخدام رمز احتياطي.",
          finishButton: "متابعة",
        },
      },
      smsCode: {
        title: "إضافة التحقق عبر SMS",
        subtitle: "اختر رقم هاتف لاستلام رمز التحقق بخطوتين",
        addPhoneNumber: "إضافة رقم هاتف",
        cancel: "إلغاء",
        addPhone: {
          infoText:
            "ستُرسل رسالة SMS تحتوي على رمز تحقق إلى هذا الرقم. قد تُطبق رسوم وفقًا لتعرفة شركة الاتصالات لديك.",
          formButtonPrimary: "متابعة",
        },
        verifyPhone: {
          title: "التحقق من رقم الهاتف",
          subtitle: "أدخل رمز التحقق المُرسل إلى",
          formTitle: "رمز التحقق",
          resendButton: "لم يصلك الرمز؟ إعادة الإرسال",
          formButtonPrimary: "متابعة",
        },
        success: {
          title: "تم تفعيل التحقق عبر SMS",
          message1:
            "التحقق بخطوتين مفعّل الآن. عند تسجيل الدخول، سيُطلب منك أيضًا إدخال رمز يُرسل إلى رقم الهاتف هذا.",
          message2:
            "احفظ الرموز الاحتياطية في مكان آمن. إذا فقدت الوصول إلى الهاتف، يمكنك تسجيل الدخول باستخدام رمز احتياطي.",
          finishButton: "متابعة",
        },
      },
    },
    unstable__errors: {
      ...arSA.unstable__errors,
      form_code_incorrect: "رمز التحقق غير صحيح. تحقق من الرمز وحاول مجددًا.",
      form_param_nil: "هذا الحقل مطلوب.",
    },
  },
} satisfies Record<"he" | "en" | "ar", typeof enUS>;
