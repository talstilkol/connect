import type {
  InterfaceLanguage,
} from "../domain/businessProfileDraft.ts";
import type {
  MetaConnectionViewStatus,
} from "../domain/metaConnectionView.ts";
import type {
  TenantRole,
} from "../domain/model.ts";
import {
  workspaceNavigation,
  workspaceSectionPath,
  type SectionId,
  type WorkspaceNavigationGroupId,
} from "../workspace/navigation.ts";
import {
  publicLandingLocales,
  readPublicLandingDirection,
} from "./publicLanding.ts";

type TenantSelectionFailureStatus =
  | "configuration-required"
  | "unauthenticated"
  | "onboarding-required"
  | "selection-required"
  | "conflict"
  | "rate-limited"
  | "temporarily-unavailable"
  | "server-error"
  | "validation-error";

export interface WorkspaceShellMessages {
  skipLink: string;
  primaryNavigationAriaLabel: string;
  languageSelectorAriaLabel: string;
  openMenuAriaLabel: string;
  closeMenuAriaLabel: string;
  setupEnvironment: string;
  helpAriaLabel: string;
  helpUnavailableTitle: string;
  notificationsAriaLabel: string;
  notificationsUnavailableTitle: string;
  unavailableActionDescription: string;
  navigationLabels: Record<SectionId, string>;
  navigationGroups: Record<WorkspaceNavigationGroupId, string>;
  tenant: {
    switchLabel: string;
    disconnectedWorkspace: string;
    saving: string;
    switched: string;
    accountSettingsAriaLabel: string;
    accountSettingsUnavailableTitle: string;
    failures: Record<TenantSelectionFailureStatus, string>;
    roles: Record<TenantRole, string>;
  };
  metaConnectionStatuses: Record<MetaConnectionViewStatus, string>;
}

export const workspaceShellMessages = {
  he: {
    skipLink: "דילוג לתוכן הראשי",
    primaryNavigationAriaLabel: "ניווט ראשי",
    languageSelectorAriaLabel: "בחירת שפת סביבת העבודה",
    openMenuAriaLabel: "פתיחת תפריט",
    closeMenuAriaLabel: "סגירת תפריט",
    setupEnvironment: "סביבת הקמה",
    helpAriaLabel: "עזרה",
    helpUnavailableTitle: "מרכז העזרה עדיין אינו זמין",
    notificationsAriaLabel: "התראות",
    notificationsUnavailableTitle: "מרכז ההתראות עדיין אינו זמין",
    unavailableActionDescription:
      "פעולה זו עדיין אינה זמינה בגרסה הנוכחית.",
    navigationLabels: {
      dashboard: "סקירה כללית",
      onboarding: "אשף הקמה",
      contacts: "אנשי קשר",
      templates: "תבניות הודעה",
      campaigns: "קמפיינים",
      inbox: "תיבת שיחות",
      bot: "תהליכי בוט",
      ai: "סוכן AI",
      reports: "דוחות",
      billing: "מנוי וחיוב",
      team: "צוות והרשאות",
      decisions: "מרכז החלטות",
    },
    navigationGroups: {
      workspace: "מרחב עבודה",
      automation: "אוטומציה ונתונים",
      account: "חשבון",
    },
    tenant: {
      switchLabel: "החלפת סביבת עבודה",
      disconnectedWorkspace: "סביבת עבודה לא מחוברת",
      saving: "שומר את סביבת העבודה…",
      switched: "סביבת העבודה הוחלפה.",
      accountSettingsAriaLabel: "הגדרות חשבון",
      accountSettingsUnavailableTitle:
        "הגדרות החשבון עדיין אינן זמינות",
      failures: {
        "configuration-required": "החלפת סביבת העבודה אינה מוגדרת.",
        unauthenticated: "יש להתחבר מחדש כדי להחליף סביבת עבודה.",
        "onboarding-required": "לא נמצאה סביבת עבודה זמינה.",
        "selection-required": "סביבת העבודה אינה זמינה עוד.",
        conflict: "הבחירה השתנתה. הנתונים נטענים מחדש.",
        "rate-limited": "בוצעו יותר מדי ניסיונות. נא להמתין.",
        "temporarily-unavailable":
          "החלפת סביבת העבודה אינה זמינה כרגע.",
        "server-error": "לא ניתן לשמור את הבחירה כרגע.",
        "validation-error": "הבחירה שנשלחה אינה תקינה.",
      },
      roles: {
        owner: "בעל חשבון",
        manager: "מנהל לקוח",
        agent: "נציג שירות",
        viewer: "משתמש צפייה",
      },
    },
    metaConnectionStatuses: {
      "configuration-required": "הגדרת Meta חסרה",
      "onboarding-required": "נדרש Tenant",
      "tenant-selection-required": "נדרשת בחירת Tenant",
      "permission-denied": "אין הרשאת ניהול",
      disconnected: "WhatsApp לא מחובר",
      pending: "Webhook בהמתנה",
      connected: "WhatsApp מחובר",
      verification_required: "נדרש אימות Meta",
      revoked: "ההרשאה בוטלה",
      error: "שגיאת חיבור",
      restricted: "חשבון Meta מוגבל",
      "server-error": "המצב אינו זמין",
    },
  },
  en: {
    skipLink: "Skip to main content",
    primaryNavigationAriaLabel: "Primary navigation",
    languageSelectorAriaLabel: "Select workspace language",
    openMenuAriaLabel: "Open menu",
    closeMenuAriaLabel: "Close menu",
    setupEnvironment: "Setup environment",
    helpAriaLabel: "Help",
    helpUnavailableTitle: "The help center is not available yet",
    notificationsAriaLabel: "Notifications",
    notificationsUnavailableTitle:
      "The notification center is not available yet",
    unavailableActionDescription:
      "This action is not available in the current version.",
    navigationLabels: {
      dashboard: "Overview",
      onboarding: "Setup wizard",
      contacts: "Contacts",
      templates: "Message templates",
      campaigns: "Campaigns",
      inbox: "Conversation inbox",
      bot: "Bot flows",
      ai: "AI agent",
      reports: "Reports",
      billing: "Plan and billing",
      team: "Team and permissions",
      decisions: "Decision center",
    },
    navigationGroups: {
      workspace: "Workspace",
      automation: "Automation and data",
      account: "Account",
    },
    tenant: {
      switchLabel: "Switch workspace",
      disconnectedWorkspace: "No workspace connected",
      saving: "Saving workspace…",
      switched: "Workspace switched.",
      accountSettingsAriaLabel: "Account settings",
      accountSettingsUnavailableTitle:
        "Account settings are not available yet",
      failures: {
        "configuration-required": "Workspace switching is not configured.",
        unauthenticated: "Sign in again to switch workspace.",
        "onboarding-required": "No workspace is available.",
        "selection-required": "This workspace is no longer available.",
        conflict: "The selection changed. Reloading the data.",
        "rate-limited": "Too many attempts. Please wait.",
        "temporarily-unavailable":
          "Workspace switching is temporarily unavailable.",
        "server-error": "The selection could not be saved.",
        "validation-error": "The submitted selection is invalid.",
      },
      roles: {
        owner: "Account owner",
        manager: "Manager",
        agent: "Service agent",
        viewer: "Viewer",
      },
    },
    metaConnectionStatuses: {
      "configuration-required": "Meta setup required",
      "onboarding-required": "Tenant required",
      "tenant-selection-required": "Tenant selection required",
      "permission-denied": "Management permission required",
      disconnected: "WhatsApp disconnected",
      pending: "Webhook pending",
      connected: "WhatsApp connected",
      verification_required: "Meta verification required",
      revoked: "Authorization revoked",
      error: "Connection error",
      restricted: "Meta account restricted",
      "server-error": "Status unavailable",
    },
  },
  ar: {
    skipLink: "الانتقال إلى المحتوى الرئيسي",
    primaryNavigationAriaLabel: "التنقل الرئيسي",
    languageSelectorAriaLabel: "اختيار لغة مساحة العمل",
    openMenuAriaLabel: "فتح القائمة",
    closeMenuAriaLabel: "إغلاق القائمة",
    setupEnvironment: "بيئة الإعداد",
    helpAriaLabel: "المساعدة",
    helpUnavailableTitle: "مركز المساعدة غير متاح بعد",
    notificationsAriaLabel: "الإشعارات",
    notificationsUnavailableTitle: "مركز الإشعارات غير متاح بعد",
    unavailableActionDescription:
      "هذا الإجراء غير متاح في الإصدار الحالي.",
    navigationLabels: {
      dashboard: "نظرة عامة",
      onboarding: "معالج الإعداد",
      contacts: "جهات الاتصال",
      templates: "قوالب الرسائل",
      campaigns: "الحملات",
      inbox: "صندوق المحادثات",
      bot: "تدفقات البوت",
      ai: "وكيل AI",
      reports: "التقارير",
      billing: "الباقة والفوترة",
      team: "الفريق والصلاحيات",
      decisions: "مركز القرارات",
    },
    navigationGroups: {
      workspace: "مساحة العمل",
      automation: "الأتمتة والبيانات",
      account: "الحساب",
    },
    tenant: {
      switchLabel: "تبديل مساحة العمل",
      disconnectedWorkspace: "لا توجد مساحة عمل متصلة",
      saving: "جارٍ حفظ مساحة العمل…",
      switched: "تم تبديل مساحة العمل.",
      accountSettingsAriaLabel: "إعدادات الحساب",
      accountSettingsUnavailableTitle: "إعدادات الحساب غير متاحة بعد",
      failures: {
        "configuration-required": "تبديل مساحة العمل غير معدّ.",
        unauthenticated: "سجّل الدخول مجدداً لتبديل مساحة العمل.",
        "onboarding-required": "لا توجد مساحة عمل متاحة.",
        "selection-required": "مساحة العمل هذه لم تعد متاحة.",
        conflict: "تغيّر الاختيار. جارٍ إعادة تحميل البيانات.",
        "rate-limited": "محاولات كثيرة جداً. يرجى الانتظار.",
        "temporarily-unavailable": "تبديل مساحة العمل غير متاح مؤقتاً.",
        "server-error": "تعذر حفظ الاختيار.",
        "validation-error": "الاختيار المرسل غير صالح.",
      },
      roles: {
        owner: "مالك الحساب",
        manager: "مدير",
        agent: "موظف خدمة",
        viewer: "مشاهد",
      },
    },
    metaConnectionStatuses: {
      "configuration-required": "إعداد Meta مطلوب",
      "onboarding-required": "المؤسسة مطلوبة",
      "tenant-selection-required": "اختيار المؤسسة مطلوب",
      "permission-denied": "صلاحية الإدارة مطلوبة",
      disconnected: "WhatsApp غير متصل",
      pending: "Webhook قيد الانتظار",
      connected: "WhatsApp متصل",
      verification_required: "تحقق Meta مطلوب",
      revoked: "تم إلغاء التفويض",
      error: "خطأ في الاتصال",
      restricted: "حساب Meta مقيّد",
      "server-error": "الحالة غير متاحة",
    },
  },
} as const satisfies Record<InterfaceLanguage, WorkspaceShellMessages>;

export function readWorkspaceLanguage(
  value: unknown,
): InterfaceLanguage {
  return value === "he" || value === "en" || value === "ar"
    ? value
    : "he";
}

export function readWorkspaceShellMessages(
  language: InterfaceLanguage,
): WorkspaceShellMessages {
  return workspaceShellMessages[language];
}

export function readWorkspaceDirection(
  language: InterfaceLanguage,
) {
  return readPublicLandingDirection(language);
}

export function readWorkspaceNavigation(
  language: InterfaceLanguage,
) {
  const messages = workspaceShellMessages[language];

  return workspaceNavigation.map((item) => ({
    ...item,
    label: messages.navigationLabels[item.id],
    groupLabel: item.group
      ? messages.navigationGroups[item.group]
      : undefined,
  }));
}

export function readWorkspaceLocaleLinks(
  section: SectionId,
) {
  return publicLandingLocales.map((locale) => ({
    ...locale,
    href: workspaceSectionPath(section, locale.language),
  }));
}
