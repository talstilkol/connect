import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  ConversationActionFailure,
} from "../../server/conversations/conversationActionResult";
import type {
  AiReplyApprovalActionFailure,
} from "../../server/ai/aiReplyApprovalActionResult";
import type {
  InboxConversationView,
  InboxDirectoryStatus,
  InboxMessageView,
} from "../../shared/domain/conversationView";
import type {
  ConversationStatus,
} from "../../shared/domain/model";

type Localized<T> = {
  [Key in keyof T]: T[Key] extends (
    ...arguments_: infer Arguments
  ) => unknown
    ? (...arguments_: Arguments) => string
    : T[Key] extends string
      ? string
      : Localized<T[Key]>;
};

const hebrewMessages = {
  directoryFailures: {
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
  } satisfies Record<
    Exclude<InboxDirectoryStatus, "ready">,
    string
  >,
  actionFailures: {
    "configuration-required":
      "הפעולה דורשת Clerk ו־D1 מוגדרים.",
    unauthenticated:
      "נדרשת התחברות מחדש לפני ביצוע הפעולה.",
    "onboarding-required":
      "נדרש להשלים יצירת סביבת עבודה.",
    "tenant-selection-required":
      "יש לבחור סביבת עבודה פעילה.",
    "permission-denied":
      "אין הרשאה לבצע את הפעולה.",
    "invalid-input":
      "זהות השיחה, הגרסה או המסננים אינם תקינים.",
    "not-found":
      "השיחה אינה קיימת עוד ב־Tenant הפעיל.",
    "state-conflict":
      "השיחה השתנתה במקביל. יש לטעון אותה מחדש.",
    "assignment-conflict":
      "השיחה כבר משויכת לנציג אחר ולכן לא שונתה.",
    "server-error":
      "הפעולה נכשלה בלי לחשוף פרטי שרת.",
  } satisfies Record<
    ConversationActionFailure["status"],
    string
  >,
  aiApprovalFailures: {
    "configuration-required":
      "אישורי AI דורשים Clerk ו־D1 מוגדרים.",
    unauthenticated:
      "נדרשת התחברות מחדש לפני החלטה.",
    "onboarding-required":
      "נדרש להשלים יצירת סביבת עבודה.",
    "tenant-selection-required":
      "יש לבחור סביבת עבודה פעילה.",
    "permission-denied":
      "אין הרשאה לאשר או לדחות תשובת AI.",
    "invalid-input":
      "זהות האישור או הגרסה אינן תקינות.",
    "not-found":
      "טיוטת ה־AI אינה קיימת עוד.",
    "state-conflict":
      "טיוטת ה־AI כבר השתנתה או הוכרעה.",
    "invalid-state":
      "נכנסה הודעה חדשה או שהשיחה אינה מאפשרת עוד את האישור.",
    "server-error":
      "פעולת אישור ה־AI נכשלה בלי לחשוף פרטי שרת.",
  } satisfies Record<
    AiReplyApprovalActionFailure["status"],
    string
  >,
  labels: {
    conversationStatuses: {
      new: "חדשה",
      bot_active: "בוט פעיל",
      waiting_for_agent: "ממתינה לנציג",
      agent_active: "נציג פעיל",
      waiting_for_contact: "ממתינה ללקוח",
      closed: "סגורה",
    } satisfies Record<ConversationStatus, string>,
    assignments: {
      unassigned: "ללא שיוך",
      "current-user": "משויכת אליי",
      "other-user": "משויכת לנציג אחר",
    } satisfies Record<
      InboxConversationView["assignment"],
      string
    >,
    messageStatuses: {
      received: "התקבלה",
      sent: "נשלחה",
      delivered: "נמסרה",
      read: "נקראה",
      failed: "נכשלה",
    } satisfies Record<InboxMessageView["status"], string>,
    nonTextContent: {
      image: "התקבלה תמונה. תוכן המדיה עדיין אינו נשמר.",
      audio: "התקבלה הודעת שמע. תוכן המדיה עדיין אינו נשמר.",
      video: "התקבל סרטון. תוכן המדיה עדיין אינו נשמר.",
      document: "התקבל מסמך. תוכן הקובץ עדיין אינו נשמר.",
      sticker: "התקבלה מדבקה. תוכן המדיה עדיין אינו נשמר.",
      location: "התקבל מיקום. פרטי המיקום עדיין אינם נשמרים.",
      contacts: "התקבל איש קשר. פרטיו עדיין אינם נשמרים כהודעה.",
      interactive: "התקבלה תגובה אינטראקטיבית ללא Payload שמור.",
      unsupported: "התקבל סוג הודעה שעדיין אינו נתמך.",
    } satisfies Record<
      Exclude<InboxMessageView["contentKind"], "text">,
      string
    >,
  },
  failureState: {
    title: "תיבת השיחות אינה זמינה",
  },
  feedback: {
    refreshBusy:
      "מתבצע רענון כעת. אפשר לנסות שוב מיד בסיומו.",
    markedRead: "השיחה סומנה כנקראה.",
    assigned: "השיחה שויכה אליך.",
    unassigned: "השיוך שלך הוסר מהשיחה.",
    aiApproved:
      "תשובת ה־AI אושרה ונשמרה למסירה עתידית. היא עדיין לא נשלחה.",
    aiRejected: "תשובת ה־AI נדחתה ולא תימסר.",
  },
  emptyInbox: {
    title: "אין שיחות בתיבה",
    description:
      "שיחה תופיע כאן רק לאחר קבלת הודעה מאומתת דרך Webhook של Meta ושמירתה ב־D1.",
    refreshing: "בודק הודעות חדשות…",
    stale: "הרענון האחרון נכשל",
    idle: "בדיקה אוטומטית כל 15 שניות",
  },
  threadList: {
    ariaLabel: "רשימת שיחות",
    title: "שיחות אחרונות",
    searchLabel: "חיפוש",
    searchPlaceholder: "שם או מספר טלפון",
    statusLabel: "מצב",
    allStatuses: "כל המצבים",
    assignmentLabel: "שיוך",
    allAssignments: "כל השיחות",
    unassigned: "ללא שיוך",
    mine: "שלי",
    loading: "טוען…",
    applyFilters: "החל מסננים",
    clear: "ניקוי",
    refreshing: "מרענן מהשרת…",
    stale: "הרענון האחרון נכשל",
    polling: "רענון מאובטח כל 15 שניות",
    emptyTitle: "לא נמצאו שיחות",
    emptyDescription:
      "אפשר לשנות את החיפוש או לנקות את המסננים.",
    noMessages: "ללא הודעות",
    loadingThread: "טוען שיחה…",
    noTextContent: "הודעה ללא תוכן טקסט",
    noPreview: "אין תצוגה מקדימה",
    unreadLabel: (count: number) =>
      `${count} הודעות שלא נקראו`,
  },
  messageView: {
    ariaLabel: "תוכן השיחה",
    secureConversation: "שיחה מאובטחת",
    readOnly: "לתפקיד הנוכחי יש הרשאת צפייה בלבד.",
    aiUnavailable:
      "רשימת אישורי ה־AI אינה זמינה כרגע. השיחות עצמן נשארות זמינות לצפייה.",
    aiPending: "AI · ממתין להחלטה",
    proposedReply: "תשובה מוצעת",
    agentApproval: "אישור נציג",
    grounding: "Grounding",
    approvedSources: "מקורות מאושרים",
    createdAt: "נוצרה",
    savingDecision: "שומר החלטה…",
    approve: "אישור התשובה",
    reject: "דחייה",
    emptyThreadTitle: "אין הודעות בשיחה",
    emptyThreadDescription:
      "ה־Conversation קיימת, אך לא הוחזרו הודעות מה־Repository.",
    noResults: "אין תוצאות",
    selectConversation: "בחרו שיחה",
    changeFilters: "שנו את המסננים כדי להציג שיחות.",
    selectionDescription:
      "ההודעות ופרטי איש הקשר יוצגו כאן לאחר טעינה מאומתת מהשרת.",
  },
  assignmentControls: {
    updating: "מעדכן…",
    unassignSelf: "הסר שיוך שלי",
    assignedToOther: "משויכת לנציג אחר",
    assignSelf: "שייך אליי",
    markRead: "סימון כנקראה",
    unread: (count: number) => `${count} לא נקראו`,
    read: "נקראה",
  },
  composerBoundary:
    "צפייה, שיוך ואישור תשובות AI פעילים. אישור שומר את התשובה למסירה עתידית בלבד; שליחה נשארת חסומה עד חיבור Adapter מאושר.",
  contactPanel: {
    label: "פרטי איש קשר",
    conversationStatus: "מצב שיחה",
    assignment: "שיוך",
    unread: "לא נקראו",
    version: "גרסה",
    empty: "יש לבחור שיחה להצגת הפרטים.",
  },
} as const;

export type ConversationMessages = Localized<
  typeof hebrewMessages
>;

const messages: Record<
  InterfaceLanguage,
  ConversationMessages
> = {
  he: hebrewMessages,
  en: {
    directoryFailures: {
      "configuration-required":
        "Clerk or D1 is not configured. Conversations are not loaded and no fallback display data is created.",
      unauthenticated:
        "Sign in before viewing conversations.",
      "onboarding-required":
        "Complete workspace creation before opening the inbox.",
      "tenant-selection-required":
        "Select an active workspace before opening the inbox.",
      "permission-denied":
        "Your current role cannot read conversations.",
      "server-error":
        "The server cannot load the conversation inbox right now.",
    },
    actionFailures: {
      "configuration-required":
        "This action requires configured Clerk and D1 services.",
      unauthenticated:
        "Sign in again before performing this action.",
      "onboarding-required":
        "Complete workspace creation first.",
      "tenant-selection-required":
        "Select an active workspace first.",
      "permission-denied":
        "You do not have permission to perform this action.",
      "invalid-input":
        "The conversation identity, version, or filters are invalid.",
      "not-found":
        "The conversation no longer exists in the active tenant.",
      "state-conflict":
        "The conversation changed concurrently. Reload it and try again.",
      "assignment-conflict":
        "The conversation is already assigned to another agent and was not changed.",
      "server-error":
        "The action failed without exposing server details.",
    },
    aiApprovalFailures: {
      "configuration-required":
        "AI approvals require configured Clerk and D1 services.",
      unauthenticated:
        "Sign in again before making a decision.",
      "onboarding-required":
        "Complete workspace creation first.",
      "tenant-selection-required":
        "Select an active workspace first.",
      "permission-denied":
        "You cannot approve or reject an AI reply.",
      "invalid-input":
        "The approval identity or version is invalid.",
      "not-found":
        "The AI draft no longer exists.",
      "state-conflict":
        "The AI draft has already changed or been decided.",
      "invalid-state":
        "A new message arrived or the conversation no longer allows this approval.",
      "server-error":
        "The AI approval action failed without exposing server details.",
    },
    labels: {
      conversationStatuses: {
        new: "New",
        bot_active: "Bot active",
        waiting_for_agent: "Waiting for agent",
        agent_active: "Agent active",
        waiting_for_contact: "Waiting for contact",
        closed: "Closed",
      },
      assignments: {
        unassigned: "Unassigned",
        "current-user": "Assigned to me",
        "other-user": "Assigned to another agent",
      },
      messageStatuses: {
        received: "Received",
        sent: "Sent",
        delivered: "Delivered",
        read: "Read",
        failed: "Failed",
      },
      nonTextContent: {
        image: "An image was received. Media content is not stored yet.",
        audio: "An audio message was received. Media content is not stored yet.",
        video: "A video was received. Media content is not stored yet.",
        document: "A document was received. File content is not stored yet.",
        sticker: "A sticker was received. Media content is not stored yet.",
        location: "A location was received. Location details are not stored yet.",
        contacts: "A contact was received. Its details are not stored as a message yet.",
        interactive: "An interactive response was received without a stored payload.",
        unsupported: "An unsupported message type was received.",
      },
    },
    failureState: {
      title: "Inbox unavailable",
    },
    feedback: {
      refreshBusy:
        "A refresh is already in progress. Try again as soon as it completes.",
      markedRead: "The conversation was marked as read.",
      assigned: "The conversation was assigned to you.",
      unassigned: "Your assignment was removed from the conversation.",
      aiApproved:
        "The AI reply was approved and stored for future delivery. It has not been sent.",
      aiRejected:
        "The AI reply was rejected and will not be delivered.",
    },
    emptyInbox: {
      title: "No conversations in the inbox",
      description:
        "A conversation appears here only after a verified Meta webhook message is stored in D1.",
      refreshing: "Checking for new messages…",
      stale: "The last refresh failed",
      idle: "Automatic check every 15 seconds",
    },
    threadList: {
      ariaLabel: "Conversation list",
      title: "Recent conversations",
      searchLabel: "Search",
      searchPlaceholder: "Name or phone number",
      statusLabel: "Status",
      allStatuses: "All statuses",
      assignmentLabel: "Assignment",
      allAssignments: "All conversations",
      unassigned: "Unassigned",
      mine: "Mine",
      loading: "Loading…",
      applyFilters: "Apply filters",
      clear: "Clear",
      refreshing: "Refreshing from server…",
      stale: "The last refresh failed",
      polling: "Secure refresh every 15 seconds",
      emptyTitle: "No conversations found",
      emptyDescription:
        "Change the search or clear the filters.",
      noMessages: "No messages",
      loadingThread: "Loading conversation…",
      noTextContent: "Message without text content",
      noPreview: "No preview available",
      unreadLabel: (count: number) =>
        `${count} unread messages`,
    },
    messageView: {
      ariaLabel: "Conversation content",
      secureConversation: "Secure conversation",
      readOnly: "Your current role has read-only access.",
      aiUnavailable:
        "The AI approval list is currently unavailable. Conversations remain available for viewing.",
      aiPending: "AI · awaiting decision",
      proposedReply: "Proposed reply",
      agentApproval: "Agent approval",
      grounding: "Grounding",
      approvedSources: "Approved sources",
      createdAt: "Created",
      savingDecision: "Saving decision…",
      approve: "Approve reply",
      reject: "Reject",
      emptyThreadTitle: "No messages in this conversation",
      emptyThreadDescription:
        "The conversation exists, but the repository returned no messages.",
      noResults: "No results",
      selectConversation: "Select a conversation",
      changeFilters: "Change the filters to display conversations.",
      selectionDescription:
        "Messages and contact details appear here after a verified server load.",
    },
    assignmentControls: {
      updating: "Updating…",
      unassignSelf: "Remove my assignment",
      assignedToOther: "Assigned to another agent",
      assignSelf: "Assign to me",
      markRead: "Mark as read",
      unread: (count: number) => `${count} unread`,
      read: "Read",
    },
    composerBoundary:
      "Viewing, assignment, and AI reply approvals are active. Approval stores a reply for future delivery only; sending remains blocked until an approved adapter is connected.",
    contactPanel: {
      label: "Contact details",
      conversationStatus: "Conversation status",
      assignment: "Assignment",
      unread: "Unread",
      version: "Version",
      empty: "Select a conversation to view its details.",
    },
  },
  ar: {
    directoryFailures: {
      "configuration-required":
        "لم يتم إعداد Clerk أو D1. لا يتم تحميل المحادثات ولا إنشاء بيانات عرض بديلة.",
      unauthenticated:
        "يجب تسجيل الدخول قبل عرض المحادثات.",
      "onboarding-required":
        "يجب إكمال إنشاء مساحة العمل قبل فتح صندوق المحادثات.",
      "tenant-selection-required":
        "يجب اختيار مساحة عمل نشطة قبل فتح صندوق المحادثات.",
      "permission-denied":
        "الدور الحالي لا يملك صلاحية قراءة المحادثات.",
      "server-error":
        "يتعذر على الخادم تحميل صندوق المحادثات حاليًا.",
    },
    actionFailures: {
      "configuration-required":
        "يتطلب هذا الإجراء إعداد Clerk وD1.",
      unauthenticated:
        "يجب تسجيل الدخول مجددًا قبل تنفيذ الإجراء.",
      "onboarding-required":
        "يجب إكمال إنشاء مساحة العمل أولًا.",
      "tenant-selection-required":
        "يجب اختيار مساحة عمل نشطة أولًا.",
      "permission-denied":
        "لا توجد صلاحية لتنفيذ هذا الإجراء.",
      "invalid-input":
        "معرّف المحادثة أو الإصدار أو عوامل التصفية غير صالح.",
      "not-found":
        "لم تعد المحادثة موجودة في المستأجر النشط.",
      "state-conflict":
        "تغيرت المحادثة بالتزامن. أعد تحميلها وحاول مجددًا.",
      "assignment-conflict":
        "المحادثة معيّنة لموظف آخر بالفعل، لذلك لم تتغير.",
      "server-error":
        "فشل الإجراء دون كشف تفاصيل الخادم.",
    },
    aiApprovalFailures: {
      "configuration-required":
        "تتطلب موافقات AI إعداد Clerk وD1.",
      unauthenticated:
        "يجب تسجيل الدخول مجددًا قبل اتخاذ القرار.",
      "onboarding-required":
        "يجب إكمال إنشاء مساحة العمل أولًا.",
      "tenant-selection-required":
        "يجب اختيار مساحة عمل نشطة أولًا.",
      "permission-denied":
        "لا توجد صلاحية للموافقة على رد AI أو رفضه.",
      "invalid-input":
        "معرّف الموافقة أو الإصدار غير صالح.",
      "not-found":
        "لم تعد مسودة AI موجودة.",
      "state-conflict":
        "تغيرت مسودة AI أو تم اتخاذ قرار بشأنها بالفعل.",
      "invalid-state":
        "وصلت رسالة جديدة أو لم تعد المحادثة تسمح بهذه الموافقة.",
      "server-error":
        "فشل إجراء موافقة AI دون كشف تفاصيل الخادم.",
    },
    labels: {
      conversationStatuses: {
        new: "جديدة",
        bot_active: "البوت نشط",
        waiting_for_agent: "بانتظار الموظف",
        agent_active: "الموظف نشط",
        waiting_for_contact: "بانتظار جهة الاتصال",
        closed: "مغلقة",
      },
      assignments: {
        unassigned: "غير معيّنة",
        "current-user": "معيّنة لي",
        "other-user": "معيّنة لموظف آخر",
      },
      messageStatuses: {
        received: "تم استلامها",
        sent: "تم إرسالها",
        delivered: "تم تسليمها",
        read: "تمت قراءتها",
        failed: "فشلت",
      },
      nonTextContent: {
        image: "تم استلام صورة. لم يتم حفظ محتوى الوسائط بعد.",
        audio: "تم استلام رسالة صوتية. لم يتم حفظ محتوى الوسائط بعد.",
        video: "تم استلام فيديو. لم يتم حفظ محتوى الوسائط بعد.",
        document: "تم استلام مستند. لم يتم حفظ محتوى الملف بعد.",
        sticker: "تم استلام ملصق. لم يتم حفظ محتوى الوسائط بعد.",
        location: "تم استلام موقع. لم يتم حفظ تفاصيل الموقع بعد.",
        contacts: "تم استلام جهة اتصال. لم يتم حفظ تفاصيلها كرسالة بعد.",
        interactive: "تم استلام رد تفاعلي دون حمولة محفوظة.",
        unsupported: "تم استلام نوع رسالة غير مدعوم بعد.",
      },
    },
    failureState: {
      title: "صندوق المحادثات غير متاح",
    },
    feedback: {
      refreshBusy:
        "تجري عملية تحديث حاليًا. حاول مجددًا فور اكتمالها.",
      markedRead: "تم وضع علامة مقروءة على المحادثة.",
      assigned: "تم تعيين المحادثة لك.",
      unassigned: "تمت إزالة تعيينك من المحادثة.",
      aiApproved:
        "تمت الموافقة على رد AI وحفظه للتسليم لاحقًا. لم يتم إرساله بعد.",
      aiRejected: "تم رفض رد AI ولن يتم تسليمه.",
    },
    emptyInbox: {
      title: "لا توجد محادثات في الصندوق",
      description:
        "تظهر المحادثة هنا فقط بعد حفظ رسالة موثقة من Webhook تابع لـMeta في D1.",
      refreshing: "جارٍ البحث عن رسائل جديدة…",
      stale: "فشل التحديث الأخير",
      idle: "فحص تلقائي كل 15 ثانية",
    },
    threadList: {
      ariaLabel: "قائمة المحادثات",
      title: "المحادثات الأخيرة",
      searchLabel: "بحث",
      searchPlaceholder: "الاسم أو رقم الهاتف",
      statusLabel: "الحالة",
      allStatuses: "كل الحالات",
      assignmentLabel: "التعيين",
      allAssignments: "كل المحادثات",
      unassigned: "غير معيّنة",
      mine: "الخاصة بي",
      loading: "جارٍ التحميل…",
      applyFilters: "تطبيق عوامل التصفية",
      clear: "مسح",
      refreshing: "جارٍ التحديث من الخادم…",
      stale: "فشل التحديث الأخير",
      polling: "تحديث آمن كل 15 ثانية",
      emptyTitle: "لم يتم العثور على محادثات",
      emptyDescription:
        "يمكن تغيير البحث أو مسح عوامل التصفية.",
      noMessages: "لا توجد رسائل",
      loadingThread: "جارٍ تحميل المحادثة…",
      noTextContent: "رسالة دون محتوى نصي",
      noPreview: "لا توجد معاينة",
      unreadLabel: (count: number) =>
        `${count} رسائل غير مقروءة`,
    },
    messageView: {
      ariaLabel: "محتوى المحادثة",
      secureConversation: "محادثة آمنة",
      readOnly: "الدور الحالي يملك صلاحية العرض فقط.",
      aiUnavailable:
        "قائمة موافقات AI غير متاحة حاليًا. تبقى المحادثات متاحة للعرض.",
      aiPending: "AI · بانتظار القرار",
      proposedReply: "الرد المقترح",
      agentApproval: "موافقة الموظف",
      grounding: "الاستناد إلى المصادر",
      approvedSources: "المصادر المعتمدة",
      createdAt: "تاريخ الإنشاء",
      savingDecision: "جارٍ حفظ القرار…",
      approve: "الموافقة على الرد",
      reject: "رفض",
      emptyThreadTitle: "لا توجد رسائل في المحادثة",
      emptyThreadDescription:
        "المحادثة موجودة، لكن المستودع لم يُرجع أي رسائل.",
      noResults: "لا توجد نتائج",
      selectConversation: "اختر محادثة",
      changeFilters: "غيّر عوامل التصفية لعرض المحادثات.",
      selectionDescription:
        "ستظهر الرسائل وتفاصيل جهة الاتصال هنا بعد تحميل موثق من الخادم.",
    },
    assignmentControls: {
      updating: "جارٍ التحديث…",
      unassignSelf: "إزالة تعييني",
      assignedToOther: "معيّنة لموظف آخر",
      assignSelf: "تعيين لي",
      markRead: "وضع علامة مقروءة",
      unread: (count: number) => `${count} غير مقروءة`,
      read: "مقروءة",
    },
    composerBoundary:
      "العرض والتعيين والموافقة على ردود AI مفعّلة. تحفظ الموافقة الرد للتسليم لاحقًا فقط؛ يبقى الإرسال محظورًا حتى توصيل Adapter معتمد.",
    contactPanel: {
      label: "تفاصيل جهة الاتصال",
      conversationStatus: "حالة المحادثة",
      assignment: "التعيين",
      unread: "غير مقروءة",
      version: "الإصدار",
      empty: "اختر محادثة لعرض تفاصيلها.",
    },
  },
};

export function readConversationMessages(
  language: InterfaceLanguage,
): ConversationMessages {
  return messages[language];
}
