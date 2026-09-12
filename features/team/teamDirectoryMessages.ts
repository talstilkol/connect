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
  membersKicker: string;
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
        "טעינת צוות סביבת העבודה דורשת השלמת חיבור השירותים.",
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
    eyebrow: "ניהול צוות",
    title: "צוות והרשאות",
    description:
      "צפייה בחברי סביבת העבודה ובפעולות המותרות לכל תפקיד.",
    invite: "הזמנת משתמש",
    inviteTitle:
      "הזמנות יופעלו לאחר השלמת חיבור שירות ההזמנות ובדיקת הצטרפות",
    inviteUnavailable:
      "הזמנות ושינויים בצוות אינם זמינים עדיין. נדרשת השלמת חיבור שירות ההזמנות ובדיקת הצטרפות לסביבת העבודה.",
    membersKicker: "סביבת העבודה",
    membersTitle: "חברי הצוות הפעילים",
    activeCount: (value) => `${value} פעילים`,
    identityUnavailable:
      "שמות וכתובות אימייל אינם זמינים כרגע. בינתיים מוצג קוד מזהה מוגן לכל חבר צוות.",
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
        "Complete the service connection to load the workspace team.",
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
    eyebrow: "Team management",
    title: "Team and permissions",
    description:
      "View workspace members and the actions allowed for each role.",
    invite: "Invite user",
    inviteTitle:
      "Invitations will open after the invitation service is connected and joining the workspace is verified",
    inviteUnavailable:
      "Invitations and team changes are not available yet. The invitation service must be connected and joining the workspace verified.",
    membersKicker: "Workspace",
    membersTitle: "Active team members",
    activeCount: (value) => `${value} active`,
    identityUnavailable:
      "Names and email addresses are currently unavailable. A protected reference code identifies each team member in the meantime.",
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
        "أكمل اتصال الخدمات لتحميل فريق مساحة العمل.",
      unauthenticated: "سجّل الدخول مجددًا لعرض الفريق.",
      "onboarding-required":
        "أنشئ مساحة عمل قبل إدارة الفريق.",
      "tenant-selection-required":
        "اختر مساحة عمل نشطة قبل إدارة الفريق.",
      "permission-denied":
        "لا يسمح دورك الحالي بعرض الفريق والصلاحيات.",
      "server-error": "تعذّر تحميل فريق مساحة العمل حاليًا.",
    },
    eyebrow: "إدارة الفريق",
    title: "الفريق والصلاحيات",
    description:
      "اعرض أعضاء مساحة العمل والإجراءات المسموحة لكل دور.",
    invite: "دعوة مستخدم",
    inviteTitle:
      "ستتاح الدعوات بعد ربط خدمة الدعوات والتحقق من الانضمام إلى مساحة العمل",
    inviteUnavailable:
      "الدعوات وتغييرات الفريق غير متاحة بعد. يلزم ربط خدمة الدعوات والتحقق من الانضمام إلى مساحة العمل.",
    membersKicker: "مساحة العمل",
    membersTitle: "أعضاء الفريق النشطون",
    activeCount: (value) => `${value} نشطون`,
    identityUnavailable:
      "الأسماء وعناوين البريد الإلكتروني غير متاحة حاليًا. يُعرّف كل عضو برمز مرجعي محمي في الوقت الحالي.",
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
