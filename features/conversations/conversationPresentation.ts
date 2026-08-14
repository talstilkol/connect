import type {
  InboxConversationThreadView,
  InboxConversationView,
  InboxDirectoryStatus,
  InboxFilters,
  InboxMessageView,
} from "../../shared/domain/conversationView.ts";
import type {
  ConversationStatus,
} from "../../shared/domain/model.ts";

export const inboxDirectoryFailureMessages: Record<
  Exclude<InboxDirectoryStatus, "ready">,
  string
> = {
  "configuration-required":
    "Clerk או D1 אינם מוגדרים. לא נטענות שיחות ולא נוצרים נתוני תצוגה חלופיים.",
  unauthenticated:
    "נדרשת התחברות לפני צפייה בשיחות.",
  "onboarding-required":
    "נדרש להשלים יצירת סביבת עבודה לפני פתיחת תיבת השיחות.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה לפני פתיחת תיבת השיחות.",
  "permission-denied":
    "לתפקיד הנוכחי אין הרשאה לקריאת שיחות.",
  "server-error":
    "לא ניתן לטעון כרגע את תיבת השיחות מהשרת.",
};

export const conversationStatusLabels: Record<
  ConversationStatus,
  string
> = {
  new: "חדשה",
  bot_active: "בוט פעיל",
  waiting_for_agent: "ממתינה לנציג",
  agent_active: "נציג פעיל",
  waiting_for_contact: "ממתינה ללקוח",
  closed: "סגורה",
};

export const conversationAssignmentLabels: Record<
  InboxConversationView["assignment"],
  string
> = {
  unassigned: "ללא שיוך",
  "current-user": "משויכת אליי",
  "other-user": "משויכת לנציג אחר",
};

export function hasActiveInboxFilters(
  filters: InboxFilters,
): boolean {
  return (
    filters.searchTerm !== "" ||
    filters.status !== "all" ||
    filters.assignment !== "all"
  );
}

export const messageStatusLabels: Record<
  InboxMessageView["status"],
  string
> = {
  received: "התקבלה",
  sent: "נשלחה",
  delivered: "נמסרה",
  read: "נקראה",
  failed: "נכשלה",
};

const nonTextContentLabels: Record<
  Exclude<InboxMessageView["contentKind"], "text">,
  string
> = {
  image: "התקבלה תמונה. תוכן המדיה עדיין אינו נשמר.",
  audio: "התקבלה הודעת שמע. תוכן המדיה עדיין אינו נשמר.",
  video: "התקבל סרטון. תוכן המדיה עדיין אינו נשמר.",
  document: "התקבל מסמך. תוכן הקובץ עדיין אינו נשמר.",
  sticker: "התקבלה מדבקה. תוכן המדיה עדיין אינו נשמר.",
  location: "התקבל מיקום. פרטי המיקום עדיין אינם נשמרים.",
  contacts: "התקבל איש קשר. פרטיו עדיין אינם נשמרים כהודעה.",
  interactive: "התקבלה תגובה אינטראקטיבית ללא Payload שמור.",
  unsupported: "התקבל סוג הודעה שעדיין אינו נתמך.",
};

export function messageBody(
  message: InboxMessageView,
): string {
  if (message.contentKind === "text") {
    return message.textContent ?? "";
  }

  return nonTextContentLabels[message.contentKind];
}

export function formatInboxTimestamp(
  value: string,
): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function replaceInboxConversation(
  conversations: readonly InboxConversationView[],
  replacement: InboxConversationView,
): readonly InboxConversationView[] {
  return conversations.map((conversation) =>
    conversation.conversationKey ===
    replacement.conversationKey
      ? replacement
      : conversation,
  );
}

export function canMarkConversationRead(
  thread: InboxConversationThreadView | null,
  canReply: boolean,
  isPending: boolean,
): thread is InboxConversationThreadView {
  return (
    thread !== null &&
    canReply &&
    !isPending &&
    thread.conversation.unreadCount > 0
  );
}
