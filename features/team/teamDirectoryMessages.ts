import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  Permission,
  TenantRole,
} from "../../shared/domain/model.ts";
import type {
  TeamDirectoryStatus,
} from "../../shared/domain/teamDirectoryView.ts";

type TeamDirectoryMessages = {
  statuses: Record<
    Exclude<TeamDirectoryStatus, "ready">,
    string
  >;
  eyebrow: string;
  title: string;
  description: string;
  invite: string;
  inviteTitle: string;
  inviteUnavailable: string;
  membersTitle: string;
  activeCount: (value: number) => string;
  identityUnavailable: string;
  meInitials: string;
  teamInitials: string;
  currentUser: string;
  protectedMember: string;
  reference: (value: string) => string;
  permissionsAriaLabel: string;
  roles: Record<TenantRole, string>;
  permissions: Record<Permission, string>;
  permissionCount: (value: number) => string;
};

const messages = {
  he: {
    statuses: {
      "configuration-required":
        "נדרשת הגדרת Clerk ו־D1 כדי לטעון את צוות סביבת העבודה.",
      unauthenticated: "יש להתחבר מחדש כדי לצפות בצוות.",
      "onboarding-required":
        "יש ליצור סביבת עבודה לפני ניהול צוות.",
      "tenant-selection-required":
        "יש לבחור סביבת עבודה פעילה לפני ניהול צוות.",
      "permission-denied":
        "לתפקיד הנוכחי אין הרשאה לצפות בצוות ובהרשאות.",
      "server-error":
        "לא ניתן לטעון כרגע את צוות סביבת העבודה.",
    },
    eyebrow: "RBAC",
    title: "צוות והרשאות",
    description:
      "Clerk מזהה את המשתמש, Membership בצד השרת קובע את ה־Tenant, ומטריצת RBAC קובעת את הפעולות המותרות.",
    invite: "הזמנת משתמש",
    inviteTitle:
      "הזמנות יופעלו לאחר חיבור ספק, Acceptance מאומת ובדיקת E2E חיה",
    inviteUnavailable:
      "הזמנה ושינוי משתמשים נשארים חסומים עד חיבור ספק הזמנות, Acceptance ופרטי זהות מאומתים ובדיקת E2E מול Clerk ו־D1 חיים.",
    membersTitle: "חברי הצוות הפעילים",
    activeCount: (value) => `${value} פעילים`,
    identityUnavailable:
      "שמות ואימיילים אינם מוצגים עד חיבור Clerk User Directory. חברים אחרים מזוהים באמצעות Reference Code מוגן הנגזר בשרת.",
    meInitials: "אני",
    teamInitials: "צ",
    currentUser: "המשתמש הנוכחי",
    protectedMember: "חבר צוות מוגן",
    reference: (value) => `Reference: ${value}`,
    permissionsAriaLabel: "מטריצת הרשאות",
    roles: {
      owner: "בעל חשבון",
      manager: "מנהל לקוח",
      agent: "נציג שירות",
      viewer: "משתמש צפייה",
    },
    permissions: {
      "workspace.manage": "ניהול סביבת העבודה",
      "team.manage": "ניהול צוות",
      "contacts.read": "צפייה באנשי קשר",
      "contacts.write": "עריכת אנשי קשר",
      "templates.read": "צפייה בתבניות",
      "templates.write": "עריכת תבניות",
      "campaigns.read": "צפייה בקמפיינים",
      "campaigns.write": "עריכת קמפיינים",
      "conversations.read": "צפייה בשיחות",
      "conversations.reply": "מענה לשיחות",
      "bot.read": "צפייה בתהליכי בוט",
      "bot.write": "עריכת תהליכי בוט",
      "ai.read": "צפייה בסוכני AI",
      "ai.write": "עריכת סוכני AI",
      "reports.read": "צפייה בדוחות",
      "billing.read": "צפייה בחיוב",
    },
    permissionCount: (value) => `${value} הרשאות מוגדרות`,
  },
  en: {
    statuses: {
      "configuration-required":
        "Configure Clerk and D1 to load the workspace team.",
      unauthenticated: "Sign in again to view the team.",
      "onboarding-required":
        "Create a workspace before managing a team.",
      "tenant-selection-required":
        "Select an active workspace before managing a team.",
      "permission-denied":
        "Your current role cannot view the team and permissions.",
      "server-error":
        "The workspace team cannot be loaded right now.",
    },
    eyebrow: "RBAC",
    title: "Team and permissions",
    description:
      "Clerk identifies the user, server-side Membership selects the Tenant, and the RBAC matrix determines allowed actions.",
    invite: "Invite user",
    inviteTitle:
      "Invitations will open after a provider, verified acceptance, and live E2E test are connected",
    inviteUnavailable:
      "Invitations and user changes remain blocked until an invitation provider, verified acceptance and identity details, and a live Clerk and D1 E2E test are available.",
    membersTitle: "Active team members",
    activeCount: (value) => `${value} active`,
    identityUnavailable:
      "Names and emails remain hidden until Clerk User Directory is connected. Other members use a protected server-derived Reference Code.",
    meInitials: "Me",
    teamInitials: "T",
    currentUser: "Current user",
    protectedMember: "Protected team member",
    reference: (value) => `Reference: ${value}`,
    permissionsAriaLabel: "Permission matrix",
    roles: {
      owner: "Account owner",
      manager: "Workspace manager",
      agent: "Service agent",
      viewer: "Read-only user",
    },
    permissions: {
      "workspace.manage": "Manage workspace",
      "team.manage": "Manage team",
      "contacts.read": "View contacts",
      "contacts.write": "Edit contacts",
      "templates.read": "View templates",
      "templates.write": "Edit templates",
      "campaigns.read": "View campaigns",
      "campaigns.write": "Edit campaigns",
      "conversations.read": "View conversations",
      "conversations.reply": "Reply to conversations",
      "bot.read": "View bot flows",
      "bot.write": "Edit bot flows",
      "ai.read": "View AI agents",
      "ai.write": "Edit AI agents",
      "reports.read": "View reports",
      "billing.read": "View billing",
    },
    permissionCount: (value) => `${value} defined permissions`,
  },
  ar: {
    statuses: {
      "configuration-required":
        "يجب إعداد Clerk وD1 لتحميل فريق مساحة العمل.",
      unauthenticated: "سجّل الدخول مجددًا لعرض الفريق.",
      "onboarding-required":
        "أنشئ مساحة عمل قبل إدارة الفريق.",
      "tenant-selection-required":
        "اختر مساحة عمل نشطة قبل إدارة الفريق.",
      "permission-denied":
        "لا يسمح دورك الحالي بعرض الفريق والصلاحيات.",
      "server-error": "تعذّر تحميل فريق مساحة العمل حاليًا.",
    },
    eyebrow: "RBAC",
    title: "الفريق والصلاحيات",
    description:
      "يحدد Clerk المستخدم، وتحدد Membership في الخادم الـTenant، وتحدد مصفوفة RBAC الإجراءات المسموحة.",
    invite: "دعوة مستخدم",
    inviteTitle:
      "ستتاح الدعوات بعد ربط مزوّد وقبول موثّق واختبار E2E حي",
    inviteUnavailable:
      "تبقى الدعوات وتغييرات المستخدمين محظورة حتى ربط مزوّد دعوات وقبول وبيانات هوية موثّقة واختبار E2E حي مع Clerk وD1.",
    membersTitle: "أعضاء الفريق النشطون",
    activeCount: (value) => `${value} نشطون`,
    identityUnavailable:
      "لا تظهر الأسماء والبريد حتى ربط Clerk User Directory. يُعرّف الأعضاء الآخرون بواسطة Reference Code محمي مشتق في الخادم.",
    meInitials: "أنا",
    teamInitials: "ف",
    currentUser: "المستخدم الحالي",
    protectedMember: "عضو فريق محمي",
    reference: (value) => `Reference: ${value}`,
    permissionsAriaLabel: "مصفوفة الصلاحيات",
    roles: {
      owner: "مالك الحساب",
      manager: "مدير مساحة العمل",
      agent: "موظف خدمة",
      viewer: "مستخدم للقراءة فقط",
    },
    permissions: {
      "workspace.manage": "إدارة مساحة العمل",
      "team.manage": "إدارة الفريق",
      "contacts.read": "عرض جهات الاتصال",
      "contacts.write": "تعديل جهات الاتصال",
      "templates.read": "عرض القوالب",
      "templates.write": "تعديل القوالب",
      "campaigns.read": "عرض الحملات",
      "campaigns.write": "تعديل الحملات",
      "conversations.read": "عرض المحادثات",
      "conversations.reply": "الرد على المحادثات",
      "bot.read": "عرض تدفقات البوت",
      "bot.write": "تعديل تدفقات البوت",
      "ai.read": "عرض وكلاء AI",
      "ai.write": "تعديل وكلاء AI",
      "reports.read": "عرض التقارير",
      "billing.read": "عرض الفوترة",
    },
    permissionCount: (value) => `${value} صلاحيات محددة`,
  },
} as const satisfies Record<
  InterfaceLanguage,
  TeamDirectoryMessages
>;

export function readTeamDirectoryMessages(
  language: InterfaceLanguage,
): TeamDirectoryMessages {
  return messages[language];
}
