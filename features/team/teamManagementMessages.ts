import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft";
import type { TeamMembershipActionFailureStatus } from "../../shared/domain/teamMembershipMutationView.ts";

const messages = {
  he: {
    inviteEmail: "כתובת האימייל להזמנה", inviteSubmit: "שליחת בקשת הזמנה", inviteNotice: "בחר את התפקיד שיוענק לאחר קבלת ההזמנה ואימות הזהות.", inviteQueued: "בקשת ההזמנה נוספה לתור. עדיין לא התקבל אישור מסירה.", invitePending: "כבר קיימת הזמנה ממתינה לכתובת הזו.",
    title: "שינוי הרשאות וגישה", select: "בחירת חבר צוות", choose: "בחר חבר צוות", role: "תפקיד", save: "שמירת תפקיד", suspend: "השעיית גישה", restore: "חידוש גישה", transfer: "העברת בעלות", formerRole: "התפקיד שלי לאחר העברת הבעלות", confirm: "אישור הפעולה", cancel: "ביטול", busy: "שומר…", saved: "השינוי נשמר.", refresh: "רענון הצוות", active: "פעיל", suspended: "מושעה", empty: "אין חברי צוות נוספים לניהול.", ownerOnly: "רק בעל החשבון יכול לשנות הרשאות וגישה.",
    suspendWarning: "השעיה תחסום את גישת חבר הצוות לסביבת העבודה. ניתן לחדש את הגישה בהמשך.", transferWarning: "הבעלות תועבר לחבר הצוות שנבחר. לאחר האישור לא תוכל עוד לנהל הרשאות כבעל החשבון.", confirmTransfer: "אני מאשר את העברת הבעלות לחבר הצוות שנבחר",
    conflict: "הצוות השתנה מאז הטעינה. יש לרענן לפני שינוי נוסף.", denied: "ההרשאה שלך השתנתה או שהגישה נחסמה. יש לרענן את הצוות.", configuration: "חיבור השירותים לניהול הצוות עדיין חסר.", unavailable: "לא התקבל אישור שמירה. יש לרענן ולבדוק את המצב לפני ניסיון נוסף.", invalid: "לא ניתן לבצע את השינוי שנבחר. יש לרענן את הצוות.", limited: "בוצעו פעולות רבות בזמן קצר. יש להמתין ולרענן את הצוות.",
  },
  en: {
    inviteEmail: "Invitation email address", inviteSubmit: "Submit invitation request", inviteNotice: "Choose the role to grant after the invitation is accepted and identity is verified.", inviteQueued: "The invitation request was queued. Delivery has not been confirmed yet.", invitePending: "An invitation is already pending for this address.",
    title: "Manage roles and access", select: "Team member", choose: "Choose a team member", role: "Role", save: "Save role", suspend: "Suspend access", restore: "Restore access", transfer: "Transfer ownership", formerRole: "My role after transferring ownership", confirm: "Confirm action", cancel: "Cancel", busy: "Saving…", saved: "The change was saved.", refresh: "Refresh team", active: "Active", suspended: "Suspended", empty: "There are no other team members to manage.", ownerOnly: "Only the account owner can change roles and access.",
    suspendWarning: "Suspending this team member blocks access to the workspace. Access can be restored later.", transferWarning: "Ownership will move to the selected team member. After confirmation, you will no longer manage permissions as the owner.", confirmTransfer: "I confirm transferring ownership to the selected team member",
    conflict: "The team changed since it was loaded. Refresh before making another change.", denied: "Your permissions changed or access was denied. Refresh the team.", configuration: "The service connection for team management is incomplete.", unavailable: "Saving was not confirmed. Refresh and check the current state before trying again.", invalid: "The selected change cannot be applied. Refresh the team.", limited: "Too many actions were attempted. Wait and refresh the team.",
  },
  ar: {
    inviteEmail: "عنوان البريد الإلكتروني للدعوة", inviteSubmit: "إرسال طلب الدعوة", inviteNotice: "اختر الدور الذي سيُمنح بعد قبول الدعوة والتحقق من الهوية.", inviteQueued: "أُضيف طلب الدعوة إلى قائمة الانتظار. لم يتم تأكيد التسليم بعد.", invitePending: "توجد دعوة معلّقة بالفعل لهذا العنوان.",
    title: "إدارة الأدوار والوصول", select: "عضو الفريق", choose: "اختر عضوًا", role: "الدور", save: "حفظ الدور", suspend: "تعليق الوصول", restore: "استعادة الوصول", transfer: "نقل الملكية", formerRole: "دوري بعد نقل الملكية", confirm: "تأكيد الإجراء", cancel: "إلغاء", busy: "جارٍ الحفظ…", saved: "تم حفظ التغيير.", refresh: "تحديث الفريق", active: "نشط", suspended: "معلّق", empty: "لا يوجد أعضاء آخرون لإدارتهم.", ownerOnly: "يمكن لمالك الحساب فقط تغيير الأدوار والوصول.",
    suspendWarning: "سيمنع التعليق عضو الفريق من الوصول إلى مساحة العمل. يمكن استعادة الوصول لاحقًا.", transferWarning: "ستُنقل الملكية إلى العضو المحدد. بعد التأكيد لن تتمكن من إدارة الصلاحيات بصفتك المالك.", confirmTransfer: "أؤكد نقل الملكية إلى عضو الفريق المحدد",
    conflict: "تغيّر الفريق منذ تحميله. حدّث الصفحة قبل إجراء تغيير آخر.", denied: "تغيّرت صلاحياتك أو تم رفض الوصول. حدّث الفريق.", configuration: "اتصال خدمة إدارة الفريق غير مكتمل.", unavailable: "لم يتم تأكيد الحفظ. حدّث الصفحة وتحقق من الحالة قبل المحاولة مجددًا.", invalid: "تعذّر تطبيق التغيير المحدد. حدّث الفريق.", limited: "تمت محاولة تنفيذ إجراءات كثيرة. انتظر ثم حدّث الفريق.",
  },
} as const;

export const readTeamManagementMessages = (language: InterfaceLanguage) => messages[language];
export function teamManagementFailureMessage(language: InterfaceLanguage, status: TeamMembershipActionFailureStatus): string {
  const m = messages[language];
  switch (status) {
    case "conflict": case "stale-session": return m.conflict;
    case "permission-denied": case "unauthenticated": case "onboarding-required": case "tenant-selection-required": return m.denied;
    case "configuration-required": return m.configuration;
    case "rate-limited": return m.limited;
    case "invalid-input": case "not-found": case "invalid-transition": return m.invalid;
    default: return m.unavailable;
  }
}
