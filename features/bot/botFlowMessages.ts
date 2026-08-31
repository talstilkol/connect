import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  BotFlowStatus,
} from "../../shared/domain/botFlow";
import type {
  BotFlowDirectoryStatus,
} from "../../shared/domain/botFlowView";
import type {
  BotFlowActionFailure,
} from "../../server/bot/botFlowActionResult";
import {
  persistedConversationStatuses,
} from "../../shared/domain/conversation.ts";

type Localized<T> = {
  [Key in keyof T]: T[Key] extends (
    ...arguments_: infer Arguments
  ) => unknown
    ? (...arguments_: Arguments) => string
    : T[Key] extends string
      ? string
      : Localized<T[Key]>;
};

type ConversationStatus =
  (typeof persistedConversationStatuses)[number];

const hebrewMessages = {
  page: {
    eyebrow: "אוטומציה",
    title: "בונה תהליכי בוט",
    description:
      "בניית זרימה ויזואלית הנשמרת ב־D1, עם גרסאות טיוטה ופרסום מבוקר למנוע הבוט.",
    loading: "בונה התהליכים נטען…",
  },
  directoryStatuses: {
    "configuration-required":
      "נדרשת הגדרת Clerk ו־D1 כדי לשמור תהליכי בוט.",
    unauthenticated:
      "יש להתחבר לפני צפייה בתהליכי הבוט.",
    "onboarding-required":
      "יש להשלים יצירת סביבת עבודה לפני שמירת תהליך.",
    "tenant-selection-required":
      "יש לבחור סביבת עבודה פעילה לפני שמירת תהליך.",
    "permission-denied":
      "אין לחשבון הנוכחי הרשאה לערוך תהליכי בוט.",
    "server-error":
      "לא ניתן לטעון כרגע את תהליכי הבוט.",
  } satisfies Record<
    Exclude<BotFlowDirectoryStatus, "ready">,
    string
  >,
  actionStatuses: {
    "configuration-required":
      "החיבור ל־Clerk או ל־D1 אינו מוגדר.",
    unauthenticated:
      "החיבור פג. יש להתחבר מחדש.",
    "onboarding-required":
      "יש להשלים יצירת סביבת עבודה.",
    "tenant-selection-required":
      "יש לבחור סביבת עבודה פעילה.",
    "permission-denied": "אין הרשאה לבצע פעולה זו.",
    "validation-error":
      "השרת דחה את מבנה התהליך. בפרסום ל־WhatsApp מותר עד 3 כפתורי תשובה ועד 20 תווים בכותרת כפתור.",
    "invalid-input": "הבקשה אינה תקינה.",
    "not-found":
      "התהליך או הגרסה כבר אינם קיימים.",
    "state-conflict":
      "התהליך השתנה בחלון אחר. טענו אותו מחדש לפני שמירה.",
    "invalid-state":
      "אי אפשר לפרסם את הגרסה במצבה הנוכחי.",
    "server-error":
      "הפעולה נכשלה בשרת. לא בוצע שינוי חלקי.",
  } satisfies Record<BotFlowActionFailure["status"], string>,
  labels: {
    flowStatuses: {
      draft: "טיוטה",
      active: "פעיל",
      inactive: "לא פעיל",
    } satisfies Record<BotFlowStatus, string>,
    conversationStatuses: {
      new: "שיחה חדשה",
      bot_active: "הבוט פעיל",
      waiting_for_agent: "ממתינה לנציג",
      agent_active: "נציג פעיל",
      waiting_for_contact: "ממתינה ללקוח",
      closed: "סגורה",
    } satisfies Record<ConversationStatus, string>,
  },
  feedback: {
    savedReloadFailed:
      "הטיוטה נשמרה, אך טעינת ההיסטוריה המלאה נכשלה. אפשר לטעון את התהליך מחדש מהרשימה.",
    draftUnchanged: "הטיוטה כבר הייתה שמורה ללא שינוי.",
    draftSaved: "הטיוטה נשמרה ב־D1 כגרסה חדשה.",
    publishedReloadFailed:
      "הגרסה פורסמה, אך טעינת ההיסטוריה המלאה נכשלה. אפשר לטעון את התהליך מחדש מהרשימה.",
    publishedUnchanged: "הגרסה כבר הייתה פעילה.",
    published: "הגרסה פורסמה והיא זמינה למנוע הבוט.",
  },
  announcements: {
    replyMoved: (position: number) =>
      `הודעת הטקסט הועברה למיקום ${position}.`,
    replyDragged: (position: number) =>
      `הודעת הטקסט נגררה למיקום ${position}.`,
    replyRemoved: (position: number) =>
      `הודעת הטקסט במיקום ${position} נמחקה.`,
    replyAdded: (position: number) =>
      `נוספה הודעת טקסט במיקום ${position}.`,
    menuAdded: "נוספה שאלת כפתורים עם אפשרות אחת.",
    menuRemoved:
      "שאלת הכפתורים וכל ענפיה הוסרו מהטיוטה.",
    optionMoved: (position: number) =>
      `אפשרות הכפתור הועברה למיקום ${position}.`,
    optionDragged: (position: number) =>
      `אפשרות הכפתור נגררה למיקום ${position}.`,
    optionRemoved: (position: number) =>
      `אפשרות הכפתור במיקום ${position} נמחקה.`,
    optionAdded: (position: number) =>
      `נוספה אפשרות כפתור במיקום ${position}.`,
    twoStepAdded:
      "נוספו שתי שאלות Buttons עוקבות עם ענף ראשון.",
    twoStepRemoved:
      "שתי שאלות ה־Buttons וכל ענפיהן הוסרו מהטיוטה.",
    conditionAdded:
      "נוסף פיצול לפי תנאי עם שני ענפי תשובה.",
    conditionRemoved:
      "התנאי ושני ענפי התשובה הוסרו מהטיוטה.",
    branchHandoff:
      "הענף הוגדר להעברה לנציג ללא הודעת Intro באותו Turn.",
    branchReply: "הענף הוגדר לשליחת תשובת Text.",
    handoffAdded:
      "נוסף מסלול העברה לנציג בעת התאמת מילת מפתח.",
    handoffRemoved:
      "מסלול ההעברה לנציג הוסר מהטיוטה.",
    graphDirty:
      "יש לשמור או לטעון מחדש את השינויים לפני מעבר לעורך Graph מלא.",
    graphUnsupported:
      "מבנה התהליך הנוכחי אינו ניתן להמרה בטוחה לעורך Graph מלא.",
    graphRequiresEmpty:
      "יש להתחיל תהליך חדש וריק לפני מעבר לעורך Graph מלא.",
    graphConverted:
      "התהליך הומר לעורך Graph מלא ללא שינוי בחיבורים.",
    graphCreated: "נוצר Graph חדש עם Text ו־End מחוברים.",
  },
  directory: {
    kicker: "תהליכים שמורים",
    title: "ספריית תהליכים",
    newFlow: "תהליך חדש",
    readOnly: "החשבון הנוכחי נמצא במצב צפייה בלבד.",
    emptyTitle: "עדיין אין תהליכים",
    emptyDescription:
      "צרו תהליך ראשון ושמרו אותו כטיוטה.",
    version: (value: number) => `גרסה ${value}`,
  },
  editor: {
    kicker:
      "הגדרת מסלול Text, ‏Buttons, ‏Condition ו־Handoff",
    editTitle: "עריכת תהליך",
    newTitle: "תהליך חדש",
    description:
      "הודעה נכנסת נבדקת מול מילות המפתח. התאמה יכולה לשלוח הודעות Text, להציג Buttons, להתפצל לפי Condition או להעביר מיד לנציג במסלול Handoff בטוח.",
    unsupported:
      "הגרסה כוללת מבנה Graph מתקדם שעדיין אינו ניתן לעריכה בעורך. הנתונים נשארו שמורים ללא שינוי.",
    name: "שם התהליך",
    immutableName:
      "השם הוא הזהות הדטרמיניסטית ולכן אינו משתנה לאחר השמירה.",
    keywords: "מילות מפתח — אחת בכל שורה",
    keywordsHelp:
      "עד 20 מילים או ביטויים, עד 80 תווים לכל ערך.",
    matchMode: "אופן התאמה",
    exact: "התאמה מלאה",
    contains: "ההודעה מכילה",
    enterGraph: "מעבר לעורך Graph מלא",
    graphHelp:
      "המעבר מאפשר חיבורים חופשיים בין כל סוגי ה־Nodes. זהויות השמירה עדיין נגזרות רק בשרת.",
    graphIncomplete:
      "יש להשלים את כל התכנים והחיבורים, להסיר Cycles ולחבר כל Node למסלול הכניסה לפני השמירה.",
    addMenu: "הוספת שאלת כפתורים",
    addCondition: "הוספת פיצול לפי תנאי",
    addTwoStep: "הוספת שתי שאלות עוקבות",
    addHandoff: "מעבר למסלול Handoff",
    saving: "שומר טיוטה…",
    save: "שמירת טיוטה",
    publishing: "מפרסם…",
    publish: "פרסום גרסה",
    notSaved: "טרם נשמר",
  },
  sequence: {
    legend: "הודעות תשובה לפי סדר השליחה",
    help:
      "אפשר להוסיף כמה הודעות טקסט, לגרור אותן למיקום חדש או לשנות את הסדר באמצעות הכפתורים. כל פעולות הסידור זמינות גם עם מקלדת.",
    dragTitle: (position: number) =>
      `גרירת הודעת טקסט ${position} למיקום חדש`,
    label: (position: number) => `הודעת טקסט ${position}`,
    moveUpLabel: (position: number) =>
      `העבר את הודעת הטקסט ${position} למעלה`,
    moveDownLabel: (position: number) =>
      `העבר את הודעת הטקסט ${position} למטה`,
    deleteLabel: (position: number) =>
      `מחק את הודעת הטקסט ${position}`,
    up: "↑ למעלה",
    down: "↓ למטה",
    delete: "מחיקה",
    add: "הוספת הודעת טקסט",
  },
  menu: {
    legend: "שאלת כפתורים",
    help:
      "כל אפשרות מנתבת לתשובת טקסט ייעודית. אפשר לגרור אפשרויות למיקום חדש או להשתמש בכפתורי למעלה ולמטה. המפתחות נשמרים ונגזרים רק בצד השרת.",
    prompt: "טקסט השאלה",
    dragTitle: (position: number) =>
      `גרירת אפשרות ${position} למיקום חדש`,
    option: (position: number) => `אפשרות ${position}`,
    buttonLabel: "תווית הכפתור",
    reply: "תשובה לאחר בחירה",
    moveUpLabel: (position: number) =>
      `העבר את אפשרות ${position} למעלה`,
    moveDownLabel: (position: number) =>
      `העבר את אפשרות ${position} למטה`,
    deleteLabel: (position: number) =>
      `מחק את אפשרות ${position}`,
    up: "↑ למעלה",
    down: "↓ למטה",
    delete: "מחיקה",
    add: "הוספת אפשרות",
    remove: "הסרת שאלת הכפתורים",
  },
  twoStep: {
    legend: "שתי שאלות Buttons עוקבות",
    help:
      "הבחירה בשאלה הראשונה פותחת שאלה שנייה ייעודית לאותו ענף. רק הבחירה השנייה שולחת תשובת Text ומסיימת את המסלול.",
    firstQuestion: "טקסט השאלה הראשונה",
    branch: (position: number) => `ענף ${position}`,
    moveUpLabel: (position: number) =>
      `העבר את ענף ${position} למעלה`,
    moveDownLabel: (position: number) =>
      `העבר את ענף ${position} למטה`,
    up: "↑ למעלה",
    down: "↓ למטה",
    firstChoiceLabel: "תווית הבחירה בשאלה הראשונה",
    removeBranch: "הסרת הענף והשאלה השנייה",
    addBranch: "הוספת ענף לשאלה הראשונה",
    remove: "הסרת שתי השאלות",
  },
  condition: {
    legend: "פיצול לפי תנאי",
    help:
      "כל תוצאה יכולה לשלוח תשובת Text או להעביר לנציג. כאשר נבחר Handoff לא נשלחת לפניו הודעת Intro באותו Turn.",
    fact: "המידע שנבדק",
    inboundText: "טקסט ההודעה הנכנסת האחרונה",
    conversationStatus: "מצב השיחה",
    operator: "אופן הבדיקה",
    equals: "שווה ל־",
    contains: "מכיל",
    statusEqualsOnly:
      "מצב שיחה תומך בבדיקת שוויון בלבד.",
    value: "הערך להשוואה",
    chooseStatus: "בחירת מצב שיחה",
    matched: "כאשר התנאי מתקיים",
    unmatched: "כאשר התנאי אינו מתקיים",
    branchAction: "פעולת הענף",
    textReply: "תשובת Text",
    handoff: "העברה לנציג",
    branchReply: "תשובת הענף",
    handoffReason: "סיבת ההעברה",
    chooseReason: "בחירת סיבה",
    customerRequest: "בקשת הלקוח",
    flowRule: "כלל בתהליך",
    remove: "הסרת התנאי",
  },
  handoff: {
    legend: "העברה לנציג לפי מילת מפתח",
    help:
      "רק הודעה שתואמת למילות המפתח תעביר את השיחה להמתנה לנציג. אי־התאמה תסתיים ללא שינוי, ובמצב זה לא תישלח הודעת Bot.",
    reason: "סיבת ההעברה לצורכי Audit",
    chooseReason: "בחירת סיבת העברה",
    customerRequest: "הלקוח ביקש נציג",
    flowRule: "כלל עסקי דורש נציג",
    remove: "הסרת מסלול ההעברה",
  },
  graph: {
    nodeLabel: (position: number, type: string) =>
      `Node ${position} — ${type}`,
    messageContent: "תוכן ההודעה",
    nextNode: "ה־Node הבא",
    question: "טקסט השאלה",
    option: (position: number) => `אפשרות ${position}`,
    moveOptionUp: (position: number) =>
      `העבר את אפשרות ${position} למעלה`,
    optionMovedUp: (position: number) =>
      `אפשרות ${position} הועברה למעלה.`,
    moveOptionDown: (position: number) =>
      `העבר את אפשרות ${position} למטה`,
    optionMovedDown: (position: number) =>
      `אפשרות ${position} הועברה למטה.`,
    deleteOption: (position: number) =>
      `מחק את אפשרות ${position}`,
    optionDeleted: (position: number) =>
      `אפשרות ${position} נמחקה.`,
    delete: "מחיקה",
    buttonLabel: "תווית הכפתור",
    choiceTarget: "יעד הבחירה",
    optionAdded: "נוספה אפשרות כפתור.",
    addOption: "הוספת אפשרות",
    fact: "שדה לבדיקה",
    inboundText: "טקסט נכנס אחרון",
    conversationStatus: "מצב השיחה",
    operator: "פעולת ההשוואה",
    equals: "שווה",
    contains: "מכיל",
    value: "ערך להשוואה",
    chooseStatus: "בחירת מצב שיחה",
    matchedTarget: "יעד כאשר התנאי מתקיים",
    unmatchedTarget: "יעד כאשר התנאי אינו מתקיים",
    handoffReason: "סיבת ההעברה לנציג",
    customerRequest: "בקשת הלקוח",
    flowRule: "כלל בתהליך",
    endDescription:
      "Node זה מסיים את הרצת הבוט ללא שינוי במצב השיחה.",
    nodeAdded: (type: string) => `נוסף Node מסוג ${type}.`,
    legend: "עורך Graph מלא",
    help:
      "כל Connection נבחר בשדה יעד. אפשר לסדר את כרטיסי ה־Nodes בגרירה או בכפתורי המקלדת; הסדר החזותי אינו משנה את החיבורים.",
    entry: "Node הכניסה לאחר התאמת מילת המפתח",
    entryChanged: "Node הכניסה השתנה.",
    cardDragged: (position: number) =>
      `כרטיס ה־Node נגרר למיקום ${position}.`,
    entrySuffix: " — כניסה",
    moveNodeUp: (position: number) =>
      `העבר את Node ${position} למעלה`,
    nodeMovedUp: (position: number) =>
      `Node ${position} הועבר למעלה.`,
    moveNodeDown: (position: number) =>
      `העבר את Node ${position} למטה`,
    nodeMovedDown: (position: number) =>
      `Node ${position} הועבר למטה.`,
    chooseEntryBeforeDelete:
      "יש לבחור Node כניסה אחר לפני המחיקה.",
    removeReferencesBeforeDelete:
      "יש להסיר תחילה את החיבורים אל ה־Node.",
    nodeDeleted: (position: number) =>
      `Node ${position} נמחק.`,
    deleteNode: "מחיקת Node",
    chooseEntryHelp:
      "כדי למחוק Node זה יש לבחור קודם Node כניסה אחר.",
    removeReferencesHelp: (count: number) =>
      `כדי למחוק Node זה יש להסיר קודם ${count} חיבורים שמפנים אליו.`,
    addNode: (type: string) => `הוספת ${type}`,
  },
  preview: {
    configured: "תוכן מוגדר",
    notConfigured: "התוכן עדיין לא הוגדר",
    handoffReasonMissing:
      "Handoff לנציג; סיבת ההעברה עדיין לא הוגדרה",
    handoffNoReply:
      "Handoff לנציג ללא שליחת תשובה באותו Turn",
    textThenEnd: (state: string) =>
      `תשובת Text, ${state}, ואז סיום`,
    nodeTitle: (position: number, type: string) =>
      `Node ${position}, ${type}`,
    continuesTo: (position: number) =>
      `ממשיך ל־Node ${position}`,
    optionToNode: (
      option: string,
      position: number,
    ) => `${option} אל Node ${position}`,
    conditionTargets: (matched: number, unmatched: number) =>
      `מתקיים אל Node ${matched}; אינו מתקיים אל Node ${unmatched}`,
    handoffEnds: "מעביר לנציג ומסיים",
    botEnds: "מסיים את הרצת הבוט",
    matched: "מתקיים",
    unmatched: "אינו מתקיים",
    accessibleIntro:
      "סיכום נגיש של מסלול הטיוטה, לפי הסדר והענפים המוצגים בתרשים.",
    startSummary: "נקודת התחלה: הודעה נכנסת.",
    keywordSummary: (count: number, mode: string) =>
      `בדיקת ${count} מילות מפתח בשיטת ${mode}.`,
    matchedBranch: "ענף יש התאמה.",
    exact: "התאמה מלאה",
    contains: "ההודעה מכילה",
    handoffAutomatic:
      "Handoff לנציג ללא תשובה אוטומטית.",
    handoffMissingPeriod:
      "Handoff לנציג; סיבת ההעברה עדיין לא הוגדרה.",
    textMessage: (position: number, state: string) =>
      `הודעת Text ${position}: ${state}.`,
    graphEntry: (position: number) =>
      `Graph מלא. Node הכניסה הוא Node ${position}.`,
    buttonQuestion: (state: string) =>
      `שאלת Buttons: ${state}.`,
    optionThenEnd: (option: string, state: string) =>
      `${option}: ${state}, ואז סיום.`,
    firstButtonQuestion: (state: string) =>
      `שאלת Buttons ראשונה: ${state}.`,
    secondButtonQuestion: (branch: string, state: string) =>
      `${branch}: שאלת Buttons שנייה, ${state}.`,
    conditionOn: (fact: string) => `Condition על ${fact}.`,
    conversationFact: "מצב השיחה",
    inboundFact: "הטקסט הנכנס",
    matchedSummary: (summary: string) =>
      `התנאי מתקיים: ${summary}.`,
    unmatchedSummary: (summary: string) =>
      `התנאי אינו מתקיים: ${summary}.`,
    flowEnd: "סיום התהליך.",
    unmatchedBranch: (outcome: string) =>
      `ענף אין התאמה: ${outcome}.`,
    noChangeEnd: "סיום ללא שינוי בשיחה",
    handoff: "Handoff לנציג",
    unnamed: "תהליך ללא שם",
    start: "נקודת התחלה",
    inboundMessage: "הודעה נכנסת",
    check: "בדיקה",
    keywordCount: (count: number) => `${count} מילות מפתח`,
    noKeywords: "לא הוגדרו מילות מפתח",
    match: "יש התאמה",
    atomicHandoff: "Handoff אטומי",
    transferToAgent: "העברה להמתנה לנציג",
    textMessageLabel: (position: number) =>
      `הודעת טקסט ${position}`,
    sendConfigured: "שליחת ההודעה שהוגדרה",
    noContent: "לא הוגדר תוכן",
    entrySuffix: " — כניסה",
    buttonQuestionLabel: "שאלת כפתורים",
    choiceCount: (count: number) =>
      `${count} אפשרויות בחירה`,
    noQuestion: "לא הוגדר טקסט שאלה",
    option: (position: number) => `אפשרות ${position}`,
    branchReply: "תשובת ענף",
    sendReply: "שליחת התשובה שהוגדרה",
    noReply: "לא הוגדרה תשובה",
    firstButtons: "שאלת Buttons ראשונה",
    secondBranchCount: (count: number) =>
      `${count} ענפים לשאלה שנייה`,
    branch: (position: number) => `ענף ${position}`,
    secondButtons: "שאלת Buttons שנייה",
    replyOptionCount: (count: number) =>
      `${count} אפשרויות תשובה`,
    conditionSplit: "פיצול לפי תנאי",
    statusCheck: "בדיקת מצב השיחה",
    textCheck: "בדיקת טקסט נכנס",
    conditionMatched: "התנאי מתקיים",
    conditionUnmatched: "התנאי אינו מתקיים",
    noHandoffReason: "לא הוגדרה סיבת העברה",
    end: "■ סיום",
    noMatch: "אין התאמה",
    endNoChange: "■ סיום ללא שינוי",
    atomicAction: "פעולה אטומית",
  },
} as const;

type BotFlowMessages = Localized<typeof hebrewMessages>;

const englishMessages: BotFlowMessages = {
  page: {
    eyebrow: "Automation",
    title: "Bot flow builder",
    description:
      "Build a visual flow stored in D1, with draft versions and controlled publishing to the bot engine.",
    loading: "Loading the flow builder…",
  },
  directoryStatuses: {
    "configuration-required":
      "Configure Clerk and D1 to save bot flows.",
    unauthenticated: "Sign in to view bot flows.",
    "onboarding-required":
      "Create a workspace before saving a flow.",
    "tenant-selection-required":
      "Select an active workspace before saving a flow.",
    "permission-denied":
      "This account cannot edit bot flows.",
    "server-error": "Bot flows cannot be loaded right now.",
  },
  actionStatuses: {
    "configuration-required":
      "The Clerk or D1 connection is not configured.",
    unauthenticated: "Your session expired. Sign in again.",
    "onboarding-required": "Create a workspace first.",
    "tenant-selection-required":
      "Select an active workspace.",
    "permission-denied":
      "You do not have permission for this action.",
    "validation-error":
      "The server rejected the flow structure. WhatsApp publication allows up to 3 reply buttons and 20 characters per button title.",
    "invalid-input": "The request is invalid.",
    "not-found": "The flow or version no longer exists.",
    "state-conflict":
      "The flow changed in another window. Reload it before saving.",
    "invalid-state":
      "This version cannot be published in its current state.",
    "server-error":
      "The server action failed. No partial change was made.",
  },
  labels: {
    flowStatuses: {
      draft: "Draft",
      active: "Active",
      inactive: "Inactive",
    },
    conversationStatuses: {
      new: "New conversation",
      bot_active: "Bot active",
      waiting_for_agent: "Waiting for agent",
      agent_active: "Agent active",
      waiting_for_contact: "Waiting for contact",
      closed: "Closed",
    },
  },
  feedback: {
    savedReloadFailed:
      "The draft was saved, but its full history could not be loaded. Reload the flow from the list.",
    draftUnchanged: "The draft was already saved unchanged.",
    draftSaved: "The draft was saved to D1 as a new version.",
    publishedReloadFailed:
      "The version was published, but its full history could not be loaded. Reload the flow from the list.",
    publishedUnchanged: "The version was already active.",
    published:
      "The version was published and is available to the bot engine.",
  },
  announcements: {
    replyMoved: (position) =>
      `Text message moved to position ${position}.`,
    replyDragged: (position) =>
      `Text message dragged to position ${position}.`,
    replyRemoved: (position) =>
      `Text message at position ${position} deleted.`,
    replyAdded: (position) =>
      `Text message added at position ${position}.`,
    menuAdded: "A button question with one option was added.",
    menuRemoved:
      "The button question and all its branches were removed from the draft.",
    optionMoved: (position) =>
      `Button option moved to position ${position}.`,
    optionDragged: (position) =>
      `Button option dragged to position ${position}.`,
    optionRemoved: (position) =>
      `Button option at position ${position} deleted.`,
    optionAdded: (position) =>
      `Button option added at position ${position}.`,
    twoStepAdded:
      "Two consecutive button questions were added with their first branch.",
    twoStepRemoved:
      "Both button questions and all their branches were removed from the draft.",
    conditionAdded:
      "A condition split with two response branches was added.",
    conditionRemoved:
      "The condition and both response branches were removed from the draft.",
    branchHandoff:
      "The branch now hands off to an agent without an intro message in the same turn.",
    branchReply: "The branch now sends a text reply.",
    handoffAdded:
      "An agent handoff path was added for keyword matches.",
    handoffRemoved:
      "The agent handoff path was removed from the draft.",
    graphDirty:
      "Save or reload your changes before switching to the full graph editor.",
    graphUnsupported:
      "The current flow structure cannot be converted safely to the full graph editor.",
    graphRequiresEmpty:
      "Start with a new empty flow before switching to the full graph editor.",
    graphConverted:
      "The flow was converted to the full graph editor without changing connections.",
    graphCreated: "A new graph was created with connected Text and End nodes.",
  },
  directory: {
    kicker: "Saved flows",
    title: "Flow library",
    newFlow: "New flow",
    readOnly: "This account is in read-only mode.",
    emptyTitle: "No flows yet",
    emptyDescription: "Create your first flow and save it as a draft.",
    version: (value) => `Version ${value}`,
  },
  editor: {
    kicker: "Text, Buttons, Condition, and Handoff path",
    editTitle: "Edit flow",
    newTitle: "New flow",
    description:
      "An incoming message is checked against keywords. A match can send Text messages, show Buttons, split on a Condition, or hand off immediately to an agent.",
    unsupported:
      "This version uses an advanced Graph structure that this editor cannot edit yet. Its data remains unchanged.",
    name: "Flow name",
    immutableName:
      "The name is the deterministic identity and cannot change after saving.",
    keywords: "Keywords — one per line",
    keywordsHelp: "Up to 20 words or phrases and 80 characters per value.",
    matchMode: "Match mode",
    exact: "Exact match",
    contains: "Message contains",
    enterGraph: "Open full Graph editor",
    graphHelp:
      "This allows free connections between every Node type. Save identities are still derived only on the server.",
    graphIncomplete:
      "Complete all content and connections, remove cycles, and connect every Node to the entry path before saving.",
    addMenu: "Add button question",
    addCondition: "Add condition split",
    addTwoStep: "Add two consecutive questions",
    addHandoff: "Switch to Handoff path",
    saving: "Saving draft…",
    save: "Save draft",
    publishing: "Publishing…",
    publish: "Publish version",
    notSaved: "Not saved yet",
  },
  sequence: {
    legend: "Reply messages in sending order",
    help:
      "Add multiple text messages, drag them to a new position, or reorder them with the buttons. Every reorder action is also available by keyboard.",
    dragTitle: (position) =>
      `Drag text message ${position} to a new position`,
    label: (position) => `Text message ${position}`,
    moveUpLabel: (position) =>
      `Move text message ${position} up`,
    moveDownLabel: (position) =>
      `Move text message ${position} down`,
    deleteLabel: (position) =>
      `Delete text message ${position}`,
    up: "↑ Up",
    down: "↓ Down",
    delete: "Delete",
    add: "Add text message",
  },
  menu: {
    legend: "Button question",
    help:
      "Each option routes to a dedicated text reply. Drag options or use the up and down buttons. Keys are preserved and derived only on the server.",
    prompt: "Question text",
    dragTitle: (position) =>
      `Drag option ${position} to a new position`,
    option: (position) => `Option ${position}`,
    buttonLabel: "Button label",
    reply: "Reply after selection",
    moveUpLabel: (position) => `Move option ${position} up`,
    moveDownLabel: (position) => `Move option ${position} down`,
    deleteLabel: (position) => `Delete option ${position}`,
    up: "↑ Up",
    down: "↓ Down",
    delete: "Delete",
    add: "Add option",
    remove: "Remove button question",
  },
  twoStep: {
    legend: "Two consecutive button questions",
    help:
      "The first selection opens a second question for that branch. Only the second selection sends a Text reply and ends the path.",
    firstQuestion: "First question text",
    branch: (position) => `Branch ${position}`,
    moveUpLabel: (position) => `Move branch ${position} up`,
    moveDownLabel: (position) => `Move branch ${position} down`,
    up: "↑ Up",
    down: "↓ Down",
    firstChoiceLabel: "Choice label in the first question",
    removeBranch: "Remove branch and second question",
    addBranch: "Add branch to first question",
    remove: "Remove both questions",
  },
  condition: {
    legend: "Condition split",
    help:
      "Each result can send a Text reply or hand off to an agent. A Handoff does not send an intro message in the same turn.",
    fact: "Field to check",
    inboundText: "Latest inbound message text",
    conversationStatus: "Conversation status",
    operator: "Comparison",
    equals: "Equals",
    contains: "Contains",
    statusEqualsOnly: "Conversation status supports equality checks only.",
    value: "Comparison value",
    chooseStatus: "Select conversation status",
    matched: "When the condition matches",
    unmatched: "When the condition does not match",
    branchAction: "Branch action",
    textReply: "Text reply",
    handoff: "Handoff to agent",
    branchReply: "Branch reply",
    handoffReason: "Handoff reason",
    chooseReason: "Select a reason",
    customerRequest: "Customer request",
    flowRule: "Flow rule",
    remove: "Remove condition",
  },
  handoff: {
    legend: "Keyword-based agent handoff",
    help:
      "Only a message matching the keywords moves the conversation to the agent queue. A non-match ends without a change and sends no Bot message.",
    reason: "Handoff reason for Audit",
    chooseReason: "Select a handoff reason",
    customerRequest: "Customer requested an agent",
    flowRule: "Business rule requires an agent",
    remove: "Remove handoff path",
  },
  graph: {
    nodeLabel: (position, type) => `Node ${position} — ${type}`,
    messageContent: "Message content",
    nextNode: "Next Node",
    question: "Question text",
    option: (position) => `Option ${position}`,
    moveOptionUp: (position) => `Move option ${position} up`,
    optionMovedUp: (position) => `Option ${position} moved up.`,
    moveOptionDown: (position) => `Move option ${position} down`,
    optionMovedDown: (position) => `Option ${position} moved down.`,
    deleteOption: (position) => `Delete option ${position}`,
    optionDeleted: (position) => `Option ${position} deleted.`,
    delete: "Delete",
    buttonLabel: "Button label",
    choiceTarget: "Selection target",
    optionAdded: "Button option added.",
    addOption: "Add option",
    fact: "Field to check",
    inboundText: "Latest inbound text",
    conversationStatus: "Conversation status",
    operator: "Comparison",
    equals: "Equals",
    contains: "Contains",
    value: "Comparison value",
    chooseStatus: "Select conversation status",
    matchedTarget: "Target when condition matches",
    unmatchedTarget: "Target when condition does not match",
    handoffReason: "Agent handoff reason",
    customerRequest: "Customer request",
    flowRule: "Flow rule",
    endDescription:
      "This Node ends bot execution without changing the conversation status.",
    nodeAdded: (type) => `Added a ${type} Node.`,
    legend: "Full Graph editor",
    help:
      "Select each Connection in its target field. Reorder Node cards by dragging or with keyboard buttons; visual order does not change connections.",
    entry: "Entry Node after a keyword match",
    entryChanged: "The entry Node changed.",
    cardDragged: (position) =>
      `Node card dragged to position ${position}.`,
    entrySuffix: " — Entry",
    moveNodeUp: (position) => `Move Node ${position} up`,
    nodeMovedUp: (position) => `Node ${position} moved up.`,
    moveNodeDown: (position) => `Move Node ${position} down`,
    nodeMovedDown: (position) => `Node ${position} moved down.`,
    chooseEntryBeforeDelete:
      "Select another entry Node before deleting this one.",
    removeReferencesBeforeDelete:
      "Remove connections to this Node first.",
    nodeDeleted: (position) => `Node ${position} deleted.`,
    deleteNode: "Delete Node",
    chooseEntryHelp:
      "Select another entry Node before deleting this Node.",
    removeReferencesHelp: (count) =>
      `Remove the ${count} connections that point to this Node before deleting it.`,
    addNode: (type) => `Add ${type}`,
  },
  preview: {
    configured: "Content configured",
    notConfigured: "Content is not configured yet",
    handoffReasonMissing:
      "Agent Handoff; a handoff reason is not configured yet",
    handoffNoReply:
      "Agent Handoff without sending a reply in the same turn",
    textThenEnd: (state) => `Text reply, ${state}, then end`,
    nodeTitle: (position, type) => `Node ${position}, ${type}`,
    continuesTo: (position) => `Continues to Node ${position}`,
    optionToNode: (option, position) =>
      `${option} to Node ${position}`,
    conditionTargets: (matched, unmatched) =>
      `Matches to Node ${matched}; does not match to Node ${unmatched}`,
    handoffEnds: "Hands off to an agent and ends",
    botEnds: "Ends bot execution",
    matched: "matches",
    unmatched: "does not match",
    accessibleIntro:
      "Accessible summary of the draft path, in the order and branches shown in the diagram.",
    startSummary: "Starting point: incoming message.",
    keywordSummary: (count, mode) =>
      `Checks ${count} keywords using ${mode}.`,
    matchedBranch: "Match branch.",
    exact: "exact matching",
    contains: "message contains",
    handoffAutomatic: "Handoff to an agent without an automatic reply.",
    handoffMissingPeriod:
      "Agent Handoff; a handoff reason is not configured yet.",
    textMessage: (position, state) =>
      `Text message ${position}: ${state}.`,
    graphEntry: (position) =>
      `Full Graph. The entry Node is Node ${position}.`,
    buttonQuestion: (state) => `Buttons question: ${state}.`,
    optionThenEnd: (option, state) =>
      `${option}: ${state}, then end.`,
    firstButtonQuestion: (state) =>
      `First Buttons question: ${state}.`,
    secondButtonQuestion: (branch, state) =>
      `${branch}: second Buttons question, ${state}.`,
    conditionOn: (fact) => `Condition on ${fact}.`,
    conversationFact: "conversation status",
    inboundFact: "inbound text",
    matchedSummary: (summary) =>
      `Condition matches: ${summary}.`,
    unmatchedSummary: (summary) =>
      `Condition does not match: ${summary}.`,
    flowEnd: "Flow ends.",
    unmatchedBranch: (outcome) =>
      `No-match branch: ${outcome}.`,
    noChangeEnd: "ends without changing the conversation",
    handoff: "Handoff to agent",
    unnamed: "Unnamed flow",
    start: "Starting point",
    inboundMessage: "Incoming message",
    check: "Check",
    keywordCount: (count) => `${count} keywords`,
    noKeywords: "No keywords configured",
    match: "Match",
    atomicHandoff: "Atomic Handoff",
    transferToAgent: "Move to agent queue",
    textMessageLabel: (position) => `Text message ${position}`,
    sendConfigured: "Send the configured message",
    noContent: "No content configured",
    entrySuffix: " — Entry",
    buttonQuestionLabel: "Button question",
    choiceCount: (count) => `${count} choices`,
    noQuestion: "No question text configured",
    option: (position) => `Option ${position}`,
    branchReply: "Branch reply",
    sendReply: "Send the configured reply",
    noReply: "No reply configured",
    firstButtons: "First Buttons question",
    secondBranchCount: (count) =>
      `${count} branches to a second question`,
    branch: (position) => `Branch ${position}`,
    secondButtons: "Second Buttons question",
    replyOptionCount: (count) => `${count} reply choices`,
    conditionSplit: "Condition split",
    statusCheck: "Check conversation status",
    textCheck: "Check inbound text",
    conditionMatched: "Condition matches",
    conditionUnmatched: "Condition does not match",
    noHandoffReason: "No handoff reason configured",
    end: "■ End",
    noMatch: "No match",
    endNoChange: "■ End without change",
    atomicAction: "Atomic action",
  },
};

const arabicMessages: BotFlowMessages = {
  ...englishMessages,
  page: {
    eyebrow: "الأتمتة",
    title: "منشئ مسارات البوت",
    description:
      "إنشاء مسار مرئي محفوظ في D1، مع نسخ مسودة ونشر مضبوط لمحرك البوت.",
    loading: "جارٍ تحميل منشئ المسارات…",
  },
  directoryStatuses: {
    "configuration-required":
      "يجب إعداد Clerk وD1 لحفظ مسارات البوت.",
    unauthenticated: "سجّل الدخول لعرض مسارات البوت.",
    "onboarding-required":
      "أنشئ مساحة عمل قبل حفظ المسار.",
    "tenant-selection-required":
      "اختر مساحة عمل نشطة قبل حفظ المسار.",
    "permission-denied":
      "لا يملك هذا الحساب صلاحية تعديل مسارات البوت.",
    "server-error": "تعذّر تحميل مسارات البوت حاليًا.",
  },
  actionStatuses: {
    "configuration-required": "اتصال Clerk أو D1 غير مُعد.",
    unauthenticated: "انتهت الجلسة. سجّل الدخول مجددًا.",
    "onboarding-required": "أنشئ مساحة عمل أولًا.",
    "tenant-selection-required": "اختر مساحة عمل نشطة.",
    "permission-denied": "لا تملك صلاحية تنفيذ هذا الإجراء.",
    "validation-error":
      "رفض الخادم بنية المسار. يسمح النشر في WhatsApp بثلاثة أزرار رد كحد أقصى و20 حرفًا لعنوان الزر.",
    "invalid-input": "الطلب غير صالح.",
    "not-found": "لم يعد المسار أو الإصدار موجودًا.",
    "state-conflict":
      "تغيّر المسار في نافذة أخرى. أعد تحميله قبل الحفظ.",
    "invalid-state": "لا يمكن نشر هذا الإصدار في حالته الحالية.",
    "server-error":
      "فشل الإجراء في الخادم. لم يُنفّذ أي تغيير جزئي.",
  },
  labels: {
    flowStatuses: {
      draft: "مسودة",
      active: "نشط",
      inactive: "غير نشط",
    },
    conversationStatuses: {
      new: "محادثة جديدة",
      bot_active: "البوت نشط",
      waiting_for_agent: "بانتظار الموظف",
      agent_active: "الموظف نشط",
      waiting_for_contact: "بانتظار جهة الاتصال",
      closed: "مغلقة",
    },
  },
  feedback: {
    savedReloadFailed:
      "حُفظت المسودة، لكن تعذّر تحميل سجلها الكامل. أعد تحميل المسار من القائمة.",
    draftUnchanged: "كانت المسودة محفوظة بالفعل دون تغيير.",
    draftSaved: "حُفظت المسودة في D1 كإصدار جديد.",
    publishedReloadFailed:
      "نُشر الإصدار، لكن تعذّر تحميل سجله الكامل. أعد تحميل المسار من القائمة.",
    publishedUnchanged: "كان الإصدار نشطًا بالفعل.",
    published: "نُشر الإصدار وأصبح متاحًا لمحرك البوت.",
  },
  announcements: {
    ...englishMessages.announcements,
    replyMoved: (position) =>
      `نُقلت الرسالة النصية إلى الموضع ${position}.`,
    replyDragged: (position) =>
      `سُحبت الرسالة النصية إلى الموضع ${position}.`,
    replyRemoved: (position) =>
      `حُذفت الرسالة النصية في الموضع ${position}.`,
    replyAdded: (position) =>
      `أُضيفت رسالة نصية في الموضع ${position}.`,
    menuAdded: "أُضيف سؤال أزرار بخيار واحد.",
    menuRemoved: "أُزيل سؤال الأزرار وجميع فروعه من المسودة.",
    optionMoved: (position) => `نُقل خيار الزر إلى الموضع ${position}.`,
    optionDragged: (position) => `سُحب خيار الزر إلى الموضع ${position}.`,
    optionRemoved: (position) => `حُذف خيار الزر في الموضع ${position}.`,
    optionAdded: (position) => `أُضيف خيار زر في الموضع ${position}.`,
    twoStepAdded: "أُضيف سؤالا أزرار متتاليان مع الفرع الأول.",
    twoStepRemoved: "أُزيل السؤالان وجميع فروعهما من المسودة.",
    conditionAdded: "أُضيف تفرّع شرطي بفرعي رد.",
    conditionRemoved: "أُزيل الشرط وفرعا الرد من المسودة.",
    branchHandoff:
      "أصبح الفرع يحوّل إلى موظف دون رسالة تمهيدية في الدورة نفسها.",
    branchReply: "أصبح الفرع يرسل ردًا نصيًا.",
    handoffAdded: "أُضيف مسار تحويل إلى موظف عند تطابق الكلمات.",
    handoffRemoved: "أُزيل مسار التحويل إلى موظف من المسودة.",
    graphDirty: "احفظ التغييرات أو أعد تحميلها قبل فتح محرر Graph الكامل.",
    graphUnsupported:
      "لا يمكن تحويل بنية المسار الحالية بأمان إلى محرر Graph الكامل.",
    graphRequiresEmpty:
      "ابدأ بمسار جديد وفارغ قبل فتح محرر Graph الكامل.",
    graphConverted: "حُوّل المسار إلى محرر Graph الكامل دون تغيير الاتصالات.",
    graphCreated: "أُنشئ Graph جديد بعقدتي Text وEnd متصلتين.",
  },
  directory: {
    kicker: "المسارات المحفوظة",
    title: "مكتبة المسارات",
    newFlow: "مسار جديد",
    readOnly: "هذا الحساب في وضع القراءة فقط.",
    emptyTitle: "لا توجد مسارات بعد",
    emptyDescription: "أنشئ المسار الأول واحفظه كمسودة.",
    version: (value) => `الإصدار ${value}`,
  },
  editor: {
    ...englishMessages.editor,
    kicker: "مسار Text وButtons وCondition وHandoff",
    editTitle: "تعديل المسار",
    newTitle: "مسار جديد",
    description:
      "تُفحص الرسالة الواردة مقابل الكلمات المفتاحية. يمكن للتطابق إرسال رسائل Text أو عرض Buttons أو التفرع حسب Condition أو التحويل فورًا إلى موظف.",
    unsupported:
      "يستخدم هذا الإصدار بنية Graph متقدمة لا يدعمها المحرر حاليًا. بقيت البيانات دون تغيير.",
    name: "اسم المسار",
    immutableName: "الاسم هو الهوية الحتمية ولا يتغير بعد الحفظ.",
    keywords: "الكلمات المفتاحية — واحدة في كل سطر",
    keywordsHelp: "حتى 20 كلمة أو عبارة و80 حرفًا لكل قيمة.",
    matchMode: "طريقة المطابقة",
    exact: "مطابقة تامة",
    contains: "الرسالة تتضمن",
    enterGraph: "فتح محرر Graph الكامل",
    graphHelp:
      "يتيح ذلك اتصالات حرة بين جميع أنواع Nodes. ما زالت هويات الحفظ تُشتق في الخادم فقط.",
    graphIncomplete:
      "أكمل المحتوى والاتصالات، وأزل الدورات، واربط كل Node بمسار الدخول قبل الحفظ.",
    addMenu: "إضافة سؤال أزرار",
    addCondition: "إضافة تفرّع شرطي",
    addTwoStep: "إضافة سؤالين متتاليين",
    addHandoff: "التبديل إلى مسار Handoff",
    saving: "جارٍ حفظ المسودة…",
    save: "حفظ المسودة",
    publishing: "جارٍ النشر…",
    publish: "نشر الإصدار",
    notSaved: "لم يُحفظ بعد",
  },
  sequence: {
    ...englishMessages.sequence,
    legend: "رسائل الرد حسب ترتيب الإرسال",
    help:
      "أضف رسائل نصية متعددة أو اسحبها أو أعد ترتيبها بالأزرار. جميع إجراءات الترتيب متاحة بلوحة المفاتيح أيضًا.",
    dragTitle: (position) => `سحب الرسالة النصية ${position} إلى موضع جديد`,
    label: (position) => `الرسالة النصية ${position}`,
    moveUpLabel: (position) => `نقل الرسالة النصية ${position} إلى أعلى`,
    moveDownLabel: (position) => `نقل الرسالة النصية ${position} إلى أسفل`,
    deleteLabel: (position) => `حذف الرسالة النصية ${position}`,
    up: "↑ أعلى",
    down: "↓ أسفل",
    delete: "حذف",
    add: "إضافة رسالة نصية",
  },
  menu: {
    ...englishMessages.menu,
    legend: "سؤال أزرار",
    help:
      "يوجّه كل خيار إلى رد نصي مخصص. اسحب الخيارات أو استخدم زري أعلى وأسفل. تُحفظ المفاتيح وتُشتق في الخادم فقط.",
    prompt: "نص السؤال",
    dragTitle: (position) => `سحب الخيار ${position} إلى موضع جديد`,
    option: (position) => `الخيار ${position}`,
    buttonLabel: "تسمية الزر",
    reply: "الرد بعد الاختيار",
    moveUpLabel: (position) => `نقل الخيار ${position} إلى أعلى`,
    moveDownLabel: (position) => `نقل الخيار ${position} إلى أسفل`,
    deleteLabel: (position) => `حذف الخيار ${position}`,
    up: "↑ أعلى",
    down: "↓ أسفل",
    delete: "حذف",
    add: "إضافة خيار",
    remove: "إزالة سؤال الأزرار",
  },
  twoStep: {
    ...englishMessages.twoStep,
    legend: "سؤالا أزرار متتاليان",
    help:
      "يفتح الاختيار الأول سؤالًا ثانيًا خاصًا بالفرع. الاختيار الثاني وحده يرسل رد Text وينهي المسار.",
    firstQuestion: "نص السؤال الأول",
    branch: (position) => `الفرع ${position}`,
    moveUpLabel: (position) => `نقل الفرع ${position} إلى أعلى`,
    moveDownLabel: (position) => `نقل الفرع ${position} إلى أسفل`,
    up: "↑ أعلى",
    down: "↓ أسفل",
    firstChoiceLabel: "تسمية الاختيار في السؤال الأول",
    removeBranch: "إزالة الفرع والسؤال الثاني",
    addBranch: "إضافة فرع إلى السؤال الأول",
    remove: "إزالة السؤالين",
  },
  condition: {
    ...englishMessages.condition,
    legend: "تفرّع شرطي",
    help:
      "يمكن لكل نتيجة إرسال رد Text أو التحويل إلى موظف. لا يرسل Handoff رسالة تمهيدية في الدورة نفسها.",
    fact: "الحقل المراد فحصه",
    inboundText: "نص آخر رسالة واردة",
    conversationStatus: "حالة المحادثة",
    operator: "المقارنة",
    equals: "يساوي",
    contains: "يتضمن",
    statusEqualsOnly: "تدعم حالة المحادثة فحص المساواة فقط.",
    value: "قيمة المقارنة",
    chooseStatus: "اختر حالة المحادثة",
    matched: "عند تحقق الشرط",
    unmatched: "عند عدم تحقق الشرط",
    branchAction: "إجراء الفرع",
    textReply: "رد Text",
    handoff: "تحويل إلى موظف",
    branchReply: "رد الفرع",
    handoffReason: "سبب التحويل",
    chooseReason: "اختر سببًا",
    customerRequest: "طلب العميل",
    flowRule: "قاعدة المسار",
    remove: "إزالة الشرط",
  },
  handoff: {
    legend: "تحويل إلى موظف حسب الكلمات المفتاحية",
    help:
      "الرسالة المطابقة فقط تنقل المحادثة إلى قائمة انتظار الموظف. ينتهي عدم التطابق دون تغيير أو إرسال رسالة Bot.",
    reason: "سبب التحويل لأغراض Audit",
    chooseReason: "اختر سبب التحويل",
    customerRequest: "طلب العميل موظفًا",
    flowRule: "تتطلب قاعدة العمل موظفًا",
    remove: "إزالة مسار التحويل",
  },
  graph: {
    ...englishMessages.graph,
    nodeLabel: (position, type) => `Node ${position} — ${type}`,
    messageContent: "محتوى الرسالة",
    nextNode: "الـNode التالي",
    question: "نص السؤال",
    option: (position) => `الخيار ${position}`,
    moveOptionUp: (position) => `نقل الخيار ${position} إلى أعلى`,
    optionMovedUp: (position) => `نُقل الخيار ${position} إلى أعلى.`,
    moveOptionDown: (position) => `نقل الخيار ${position} إلى أسفل`,
    optionMovedDown: (position) => `نُقل الخيار ${position} إلى أسفل.`,
    deleteOption: (position) => `حذف الخيار ${position}`,
    optionDeleted: (position) => `حُذف الخيار ${position}.`,
    delete: "حذف",
    buttonLabel: "تسمية الزر",
    choiceTarget: "وجهة الاختيار",
    optionAdded: "أُضيف خيار زر.",
    addOption: "إضافة خيار",
    fact: "الحقل المراد فحصه",
    inboundText: "آخر نص وارد",
    conversationStatus: "حالة المحادثة",
    operator: "المقارنة",
    equals: "يساوي",
    contains: "يتضمن",
    value: "قيمة المقارنة",
    chooseStatus: "اختر حالة المحادثة",
    matchedTarget: "الوجهة عند تحقق الشرط",
    unmatchedTarget: "الوجهة عند عدم تحقق الشرط",
    handoffReason: "سبب التحويل إلى موظف",
    customerRequest: "طلب العميل",
    flowRule: "قاعدة المسار",
    endDescription: "تنهي هذه الـNode تشغيل البوت دون تغيير حالة المحادثة.",
    nodeAdded: (type) => `أُضيفت Node من نوع ${type}.`,
    legend: "محرر Graph الكامل",
    help:
      "اختر كل Connection في حقل الوجهة. أعد ترتيب بطاقات Nodes بالسحب أو بأزرار لوحة المفاتيح؛ لا يغيّر الترتيب المرئي الاتصالات.",
    entry: "Node الدخول بعد تطابق كلمة مفتاحية",
    entryChanged: "تغيّرت Node الدخول.",
    cardDragged: (position) => `سُحبت بطاقة Node إلى الموضع ${position}.`,
    entrySuffix: " — دخول",
    moveNodeUp: (position) => `نقل Node ${position} إلى أعلى`,
    nodeMovedUp: (position) => `نُقلت Node ${position} إلى أعلى.`,
    moveNodeDown: (position) => `نقل Node ${position} إلى أسفل`,
    nodeMovedDown: (position) => `نُقلت Node ${position} إلى أسفل.`,
    chooseEntryBeforeDelete: "اختر Node دخول أخرى قبل الحذف.",
    removeReferencesBeforeDelete: "أزل الاتصالات إلى هذه الـNode أولًا.",
    nodeDeleted: (position) => `حُذفت Node ${position}.`,
    deleteNode: "حذف Node",
    chooseEntryHelp: "اختر Node دخول أخرى قبل حذف هذه الـNode.",
    removeReferencesHelp: (count) =>
      `أزل ${count} اتصالات تشير إلى هذه الـNode قبل حذفها.`,
    addNode: (type) => `إضافة ${type}`,
  },
  preview: {
    ...englishMessages.preview,
    configured: "المحتوى مُعد",
    notConfigured: "لم يُعد المحتوى بعد",
    handoffReasonMissing:
      "Handoff إلى موظف؛ لم يُحدد سبب التحويل بعد",
    handoffNoReply:
      "Handoff إلى موظف دون إرسال رد في الدورة نفسها",
    textThenEnd: (state) => `رد Text، ${state}، ثم نهاية`,
    nodeTitle: (position, type) => `Node ${position}، ${type}`,
    continuesTo: (position) => `يتابع إلى Node ${position}`,
    optionToNode: (option, position) => `${option} إلى Node ${position}`,
    conditionTargets: (matched, unmatched) =>
      `عند التحقق إلى Node ${matched}؛ وعند عدم التحقق إلى Node ${unmatched}`,
    handoffEnds: "يحوّل إلى موظف وينتهي",
    botEnds: "ينهي تشغيل البوت",
    matched: "متحقق",
    unmatched: "غير متحقق",
    accessibleIntro:
      "ملخص ميسّر لمسار المسودة حسب الترتيب والفروع المعروضة في المخطط.",
    startSummary: "نقطة البداية: رسالة واردة.",
    keywordSummary: (count, mode) =>
      `فحص ${count} كلمات مفتاحية بطريقة ${mode}.`,
    matchedBranch: "فرع التطابق.",
    exact: "المطابقة التامة",
    contains: "تضمين الرسالة",
    handoffAutomatic: "Handoff إلى موظف دون رد آلي.",
    handoffMissingPeriod:
      "Handoff إلى موظف؛ لم يُحدد سبب التحويل بعد.",
    textMessage: (position, state) =>
      `رسالة Text ${position}: ${state}.`,
    graphEntry: (position) =>
      `Graph كامل. Node الدخول هي Node ${position}.`,
    buttonQuestion: (state) => `سؤال Buttons: ${state}.`,
    optionThenEnd: (option, state) =>
      `${option}: ${state}، ثم نهاية.`,
    firstButtonQuestion: (state) =>
      `سؤال Buttons الأول: ${state}.`,
    secondButtonQuestion: (branch, state) =>
      `${branch}: سؤال Buttons ثانٍ، ${state}.`,
    conditionOn: (fact) => `Condition على ${fact}.`,
    conversationFact: "حالة المحادثة",
    inboundFact: "النص الوارد",
    matchedSummary: (summary) => `الشرط متحقق: ${summary}.`,
    unmatchedSummary: (summary) => `الشرط غير متحقق: ${summary}.`,
    flowEnd: "نهاية المسار.",
    unmatchedBranch: (outcome) => `فرع عدم التطابق: ${outcome}.`,
    noChangeEnd: "نهاية دون تغيير المحادثة",
    handoff: "Handoff إلى موظف",
    unnamed: "مسار بلا اسم",
    start: "نقطة البداية",
    inboundMessage: "رسالة واردة",
    check: "فحص",
    keywordCount: (count) => `${count} كلمات مفتاحية`,
    noKeywords: "لم تُحدد كلمات مفتاحية",
    match: "تطابق",
    atomicHandoff: "Handoff ذري",
    transferToAgent: "نقل إلى قائمة انتظار الموظف",
    textMessageLabel: (position) => `رسالة Text ${position}`,
    sendConfigured: "إرسال الرسالة المُعدة",
    noContent: "لم يُعد محتوى",
    entrySuffix: " — دخول",
    buttonQuestionLabel: "سؤال أزرار",
    choiceCount: (count) => `${count} خيارات`,
    noQuestion: "لم يُحدد نص السؤال",
    option: (position) => `الخيار ${position}`,
    branchReply: "رد الفرع",
    sendReply: "إرسال الرد المُعد",
    noReply: "لم يُعد رد",
    firstButtons: "سؤال Buttons الأول",
    secondBranchCount: (count) => `${count} فروع إلى سؤال ثانٍ`,
    branch: (position) => `الفرع ${position}`,
    secondButtons: "سؤال Buttons الثاني",
    replyOptionCount: (count) => `${count} خيارات رد`,
    conditionSplit: "تفرّع شرطي",
    statusCheck: "فحص حالة المحادثة",
    textCheck: "فحص النص الوارد",
    conditionMatched: "الشرط متحقق",
    conditionUnmatched: "الشرط غير متحقق",
    noHandoffReason: "لم يُحدد سبب التحويل",
    end: "■ نهاية",
    noMatch: "لا يوجد تطابق",
    endNoChange: "■ نهاية دون تغيير",
    atomicAction: "إجراء ذري",
  },
};

const messages = {
  he: hebrewMessages,
  en: englishMessages,
  ar: arabicMessages,
} as const satisfies Record<InterfaceLanguage, BotFlowMessages>;

export const botFlowDirectoryStatuses = [
  "configuration-required",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "server-error",
] as const;

export const botFlowActionStatuses = [
  ...botFlowDirectoryStatuses,
  "validation-error",
  "invalid-input",
  "not-found",
  "state-conflict",
  "invalid-state",
] as const;

export function readBotFlowMessages(
  language: InterfaceLanguage,
): BotFlowMessages {
  return messages[language];
}
