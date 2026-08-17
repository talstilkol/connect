import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  TemplateButtonMode,
  TemplateCategory,
  TemplateLanguage,
  UrlButtonMode,
} from "../../shared/domain/templateDraft";
import type {
  MessageTemplateView,
} from "../../shared/domain/messageTemplateView";
import type {
  SaveMessageTemplateDraftActionResult,
  SubmitMessageTemplateActionResult,
  SyncMessageTemplatesActionResult,
} from "../../server/templates/messageTemplateActionResult";

export const templateViewStatuses = [
  "draft",
  "submitting",
  "pending_review",
  "approved",
  "rejected",
  "disabled",
  "deleted",
] as const satisfies readonly MessageTemplateView["status"][];

export const templateSaveResultStatuses = [
  "saved",
  "validation-error",
  "not-editable",
  "configuration-required",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "server-error",
] as const satisfies readonly SaveMessageTemplateDraftActionResult["status"][];

export const templateSubmitResultStatuses = [
  "submitted",
  "invalid-input",
  "not-found",
  "not-editable",
  "meta-not-connected",
  "meta-configuration-required",
  "meta-configuration-invalid",
  "credential-unavailable",
  "state-conflict",
  "submission-rejected",
  "submission-uncertain",
  "configuration-required",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "server-error",
] as const satisfies readonly SubmitMessageTemplateActionResult["status"][];

export const templateSyncResultStatuses = [
  "synced",
  "meta-not-connected",
  "meta-configuration-required",
  "meta-configuration-invalid",
  "credential-unavailable",
  "identity-conflict",
  "sync-failed",
  "configuration-required",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "server-error",
] as const satisfies readonly SyncMessageTemplatesActionResult["status"][];

type DirectoryFailureStatus =
  | "configuration-required"
  | "onboarding-required"
  | "tenant-selection-required"
  | "permission-denied"
  | "server-error";

type TemplateStatusCopy = Record<
  MessageTemplateView["status"],
  { label: string; detail: string }
>;

type SyncSummary = Extract<
  SyncMessageTemplatesActionResult,
  { status: "synced" }
>["summary"];

export interface TemplateEditorMessages {
  page: {
    eyebrow: string;
    title: string;
    description: string;
  };
  options: {
    categories: Record<TemplateCategory, string>;
    languages: Record<TemplateLanguage, string>;
    buttonModes: Record<TemplateButtonMode, string>;
    urlModes: Record<UrlButtonMode, string>;
  };
  editor: {
    kickers: {
      persistent: string;
      local: string;
      unavailable: string;
    };
    title: string;
    persistence: {
      saving: string;
      savedServer: string;
      savedLocal: string;
      notSavedServer: string;
      unsavedChanges: string;
    };
    fields: {
      name: string;
      category: string;
      language: string;
      header: string;
      body: string;
      footer: string;
    };
    authenticationNotice: string;
    headerVariableError: string;
    variableGuidance: {
      none: string;
      found: (count: number) => string;
      invalidSyntax: string;
      missingSequence: (expected: number) => string;
      examplesTitle: string;
      examplesDescription: string;
      complete: string;
      incomplete: string;
    };
    footerVariableError: string;
    buttons: {
      legend: string;
      explanation: string;
      quickReplyLegend: string;
      quickReplyLimit: string;
      add: string;
      quickReplyText: (index: number) => string;
      removeAriaLabel: (index: number) => string;
      quickReplyEmpty: string;
      quickReplyVariableError: string;
      ctaLegend: string;
      ctaDescription: string;
      openWebsite: string;
      urlType: string;
      urlText: string;
      staticUrl: string;
      dynamicUrl: string;
      urlExample: string;
      staticUrlError: string;
      dynamicUrlError: string;
      resolvedUrl: string;
      callPhone: string;
      phoneText: string;
      phoneNumber: string;
      phoneError: string;
      ctaEmpty: string;
    };
    save: {
      noPermission: string;
      saving: string;
      server: string;
      local: string;
      unavailable: string;
    };
    preview: {
      kicker: string;
      title: string;
      persistentNotice: string;
      localNotice: string;
      unavailableNotice: string;
    };
  };
  directory: {
    kicker: string;
    title: string;
    fromServer: (count: number) => string;
    localMode: string;
    unavailable: string;
    syncing: string;
    sync: string;
    newDraft: string;
    readOnly: string;
    emptyTitle: string;
    emptyDescription: string;
    updated: string;
    load: string;
    submitting: string;
    submit: string;
    statuses: TemplateStatusCopy;
  };
  feedback: {
    directoryFailures: Record<DirectoryFailureStatus, string>;
    saveResults: Record<
      SaveMessageTemplateDraftActionResult["status"],
      string
    >;
    localRehearsalSaved: string;
    submitResults: Record<
      SubmitMessageTemplateActionResult["status"],
      string
    >;
    syncResults: Record<
      Exclude<SyncMessageTemplatesActionResult["status"], "synced">,
      string
    >;
    syncSummary: (summary: SyncSummary) => string;
  };
}

const messages = {
  he: {
    page: {
      eyebrow: "תבניות הודעה של Meta",
      title: "תבניות הודעה",
      description:
        "יצירה, תצוגה מקדימה ומעקב אחר תהליך האישור הרשמי מול Meta.",
    },
    options: {
      categories: {
        MARKETING: "Marketing — שיווק",
        UTILITY: "Utility — עדכון שירותי",
        AUTHENTICATION: "Authentication — אימות",
      },
      languages: {
        he: "עברית — he",
        en_US: "English (US) — en_US",
        ar: "العربية — ar",
      },
      buttonModes: {
        none: "ללא כפתורים",
        quick_reply: "Quick Reply",
        call_to_action: "Call to Action",
      },
      urlModes: {
        static: "URL סטטי",
        dynamic: "URL דינמי",
      },
    },
    editor: {
      kickers: {
        persistent: "טיוטה קבועה",
        local: "תרגול מקומי",
        unavailable: "שמירה אינה זמינה",
      },
      title: "הגדרת התבנית",
      persistence: {
        saving: "שומר בשרת",
        savedServer: "נשמרה בשרת",
        savedLocal: "נשמרה מקומית",
        notSavedServer: "לא נשמרה בשרת",
        unsavedChanges: "שינויים לא נשמרו",
      },
      fields: {
        name: "שם תבנית",
        category: "קטגוריה",
        language: "שפה",
        header: "כותרת טקסט — רשות וללא משתנים בשלב זה",
        body: "גוף ההודעה",
        footer: "Footer — רשות וללא משתנים",
      },
      authenticationNotice:
        "Authentication דורש עורך ייעודי לרכיבי OTP ולכפתורי אימות. העורך הכללי הנוכחי אינו שומר טיוטה בקטגוריה זו.",
      headerVariableError:
        "משתנים בכותרת דורשים מסלול Examples נפרד. בשלב זה יש להסיר אותם מהכותרת או להשתמש בהם בגוף ההודעה.",
      variableGuidance: {
        none: "אפשר להוסיף משתנים סדרתיים: {{1}}, {{2}} וכן הלאה.",
        found: (count) =>
          `${count} משתנים תקינים נמצאו. יש להזין עבורם ערכי בדיקה.`,
        invalidSyntax:
          "משתנה חייב להיות מספרי ובמבנה מדויק, לדוגמה {{1}}.",
        missingSequence: (expected) =>
          `רצף המשתנים אינו תקין. המשתנה הבא צריך להיות {{${expected}}}.`,
        examplesTitle: "ערכי בדיקה למשתנים",
        examplesDescription:
          "הערכים נשמרים כחלק מהטיוטה ונשלחים ל־Meta כדוגמאות בעת הגשה. הם אינם נשלחים לנמענים.",
        complete: "כל ערכי הבדיקה הוזנו.",
        incomplete:
          "הטיוטה לא תהיה מוכנה עד שכל משתנה יקבל ערך בדיקה.",
      },
      footerVariableError:
        "Footer עם משתנים אינו נתמך בעורך המקומי.",
      buttons: {
        legend: "מסלול כפתורים — רשות",
        explanation:
          "כדי לשמור על טיוטה חד־משמעית, העורך המקומי משתמש במסלול כפתורים אחד בכל פעם.",
        quickReplyLegend: "כפתורי Quick Reply",
        quickReplyLimit: "העורך המקומי תומך כרגע בעד שני כפתורים.",
        add: "הוספת כפתור",
        quickReplyText: (index) => `טקסט כפתור ${index}`,
        removeAriaLabel: (index) => `הסרת כפתור ${index}`,
        quickReplyEmpty:
          "יש להוסיף לפחות כפתור אחד או לבחור מסלול ללא כפתורים.",
        quickReplyVariableError:
          "טקסט Quick Reply אינו תומך במשתנים בעורך המקומי.",
        ctaLegend: "כפתורי Call to Action",
        ctaDescription:
          "ניתן להגדיר כתובת HTTPS סטטית, מספר טלפון, או את שניהם.",
        openWebsite: "פתיחת כתובת אתר",
        urlType: "סוג כתובת",
        urlText: "טקסט כפתור URL",
        staticUrl: "כתובת HTTPS סטטית",
        dynamicUrl: "כתובת HTTPS עם משתנה {{1}}",
        urlExample: "Example עבור משתנה ה־URL",
        staticUrlError:
          "נדרשים טקסט וכתובת HTTPS תקינה ללא משתנים.",
        dynamicUrlError:
          "נדרשים טקסט, כתובת HTTPS עם משתנה {{1}} יחיד ו־Example ללא משתנים.",
        resolvedUrl: "URL לאחר הצבת Example",
        callPhone: "התקשרות למספר טלפון",
        phoneText: "טקסט כפתור טלפון",
        phoneNumber: "מספר טלפון",
        phoneError:
          "נדרשים טקסט ומספר הכולל ספרות בלבד, עם + אופציונלי בתחילתו.",
        ctaEmpty: "יש להפעיל לפחות כפתור CTA אחד.",
      },
      save: {
        noPermission: "אין הרשאת שמירה",
        saving: "שומר...",
        server: "שמירת טיוטה בשרת",
        local: "שמירת תרגול מקומי",
        unavailable: "השמירה אינה זמינה",
      },
      preview: {
        kicker: "תצוגה",
        title: "תצוגה מקדימה",
        persistentNotice:
          "שמירת הטיוטה מתבצעת ב־D1. לאחר השמירה ניתן לשלוח אותה לאישור מתוך הרשימה שמעל.",
        localNotice:
          "ללא Clerk ו־D1 הטיוטה נשמרת בזיכרון המסך בלבד ואינה נשלחת ל־Meta.",
        unavailableNotice:
          "השמירה אינה זמינה עד לפתרון מצב החשבון או השרת שמופיע מעל.",
      },
    },
    directory: {
      kicker: "תבניות קבועות",
      title: "תבניות שמורות",
      fromServer: (count) => `${count} מהשרת`,
      localMode: "מצב מקומי",
      unavailable: "לא זמין",
      syncing: "מסנכרן...",
      sync: "סנכרון מול Meta",
      newDraft: "טיוטה חדשה",
      readOnly:
        "התפקיד הנוכחי מורשה לצפות בתבניות אך אינו מורשה לשמור או לשלוח אותן.",
      emptyTitle: "אין תבניות שמורות",
      emptyDescription:
        "הטיוטה הראשונה תופיע כאן לאחר שמירה מוצלחת ב־D1.",
      updated: "עודכן",
      load: "טעינה לעריכה",
      submitting: "שולח...",
      submit: "שליחה לאישור",
      statuses: {
        draft: {
          label: "טיוטה",
          detail: "ניתנת לעריכה ולשליחה לאישור.",
        },
        submitting: {
          label: "תוצאת הגשה בבדיקה",
          detail:
            "לא תתבצע שליחה חוזרת עד שסנכרון Meta יקבע את התוצאה.",
        },
        pending_review: {
          label: "ממתינה לאישור",
          detail: "Meta קיבלה את התבנית והיא ממתינה לבדיקה.",
        },
        approved: {
          label: "אושרה",
          detail: "התבנית זמינה לשימוש לאחר סנכרון הקמפיינים.",
        },
        rejected: {
          label: "נדחתה",
          detail: "התבנית נעולה; סטטוס הדחייה הגיע מ־Meta.",
        },
        disabled: {
          label: "הושבתה",
          detail: "Meta סימנה את התבנית כלא פעילה.",
        },
        deleted: {
          label: "נמחקה",
          detail: "Meta סימנה את התבנית כמחוקה.",
        },
      },
    },
    feedback: {
      directoryFailures: {
        "configuration-required":
          "Clerk ו־D1 אינם מוגדרים. אפשר להכין תרגול מקומי, אך הוא יימחק ברענון ולא יישלח ל־Meta.",
        "onboarding-required":
          "יש להשלים תחילה את פרטי העסק כדי ליצור Tenant פעיל.",
        "tenant-selection-required":
          "המשתמש משויך למספר Tenants ונדרשת בחירה מפורשת.",
        "permission-denied":
          "התפקיד הנוכחי אינו מורשה לקרוא תבניות.",
        "server-error":
          "לא ניתן היה לטעון את התבניות מהשרת. לא הוצג מידע חלופי.",
      },
      saveResults: {
        saved: "הטיוטה נשמרה ב־D1 והיא זמינה לאחר רענון.",
        "validation-error":
          "השרת דחה את הטיוטה מפני שאחד או יותר מהשדות אינם תקינים.",
        "not-editable":
          "תבנית שכבר נשלחה ל־Meta נעולה ואינה ניתנת לדריסה.",
        "configuration-required": "Clerk ו־D1 אינם מוגדרים.",
        unauthenticated: "נדרשת התחברות מחדש לפני שמירת התבנית.",
        "onboarding-required": "יש להשלים תחילה את פרטי העסק.",
        "tenant-selection-required": "נדרשת בחירה מפורשת של Tenant.",
        "permission-denied":
          "התפקיד הנוכחי אינו מורשה לשמור תבניות.",
        "server-error":
          "שמירת הטיוטה בשרת נכשלה. היא לא סומנה כשמורה.",
      },
      localRehearsalSaved:
        "התרגול נשמר בזיכרון המסך בלבד ולא בשרת.",
      submitResults: {
        submitted: "Meta קיבלה את התבנית והיא ממתינה לאישור.",
        "invalid-input": "מזהה התבנית אינו תקין.",
        "not-found": "התבנית לא נמצאה ב־Tenant הנוכחי.",
        "not-editable": "רק טיוטה שטרם נשלחה ניתנת להגשה.",
        "meta-not-connected":
          "נדרש חיבור Meta פעיל לפני שליחת תבנית.",
        "meta-configuration-required":
          "נדרשת הגדרת Graph API ומפתח Credential בצד השרת.",
        "meta-configuration-invalid":
          "הגדרת Meta השרתית חלקית או לא תקינה.",
        "credential-unavailable":
          "לא נמצא Credential מוצפן עבור ה־Tenant.",
        "state-conflict":
          "הטיוטה השתנתה במקביל. יש לטעון מחדש לפני ניסיון נוסף.",
        "submission-rejected":
          "Meta דחתה את בקשת יצירת התבנית. הטיוטה נשארה זמינה לעריכה.",
        "submission-uncertain":
          "תוצאת ההגשה אינה ידועה. המערכת לא תשלח שוב עד לסנכרון מול Meta.",
        "configuration-required": "Clerk ו־D1 אינם מוגדרים.",
        unauthenticated: "נדרשת התחברות מחדש לפני השליחה.",
        "onboarding-required": "יש להשלים תחילה את פרטי העסק.",
        "tenant-selection-required": "נדרשת בחירה מפורשת של Tenant.",
        "permission-denied":
          "התפקיד הנוכחי אינו מורשה לשלוח תבניות.",
        "server-error": "השרת לא הצליח להשלים את הפעולה.",
      },
      syncResults: {
        "meta-not-connected":
          "נדרש חיבור Meta פעיל לפני סנכרון תבניות.",
        "meta-configuration-required":
          "נדרשת הגדרת Graph API ומפתח Credential בצד השרת.",
        "meta-configuration-invalid":
          "הגדרת Meta השרתית חלקית או לא תקינה.",
        "credential-unavailable":
          "לא נמצא Credential מוצפן עבור ה־Tenant.",
        "identity-conflict":
          "מזהה Template של Meta מתנגש בשם, בשפה או בקטגוריה המקומיים. לא בוצע תיקון אוטומטי.",
        "sync-failed":
          "Meta או D1 לא השלימו את הסנכרון. לא הוצג סטטוס חלופי.",
        "configuration-required": "Clerk ו־D1 אינם מוגדרים.",
        unauthenticated: "נדרשת התחברות מחדש לפני הסנכרון.",
        "onboarding-required": "יש להשלים תחילה את פרטי העסק.",
        "tenant-selection-required": "נדרשת בחירה מפורשת של Tenant.",
        "permission-denied":
          "התפקיד הנוכחי אינו מורשה לסנכרן תבניות.",
        "server-error": "השרת לא הצליח להתחיל את הסנכרון.",
      },
      syncSummary: (summary) =>
        `Meta החזירה ${summary.received} תבניות. ${summary.updated} עודכנו, ${summary.unchanged} לא השתנו, ${summary.stale} אירועים ישנים דולגו, ${summary.unmatched} אינן מנוהלות מקומית ו־${summary.unsupported} אינן נתמכות במסלול הנוכחי.`,
    },
  },
  en: {
    page: {
      eyebrow: "Meta message templates",
      title: "Message templates",
      description:
        "Create, preview, and track the official Meta approval process.",
    },
    options: {
      categories: {
        MARKETING: "Marketing",
        UTILITY: "Utility",
        AUTHENTICATION: "Authentication",
      },
      languages: {
        he: "Hebrew — he",
        en_US: "English (US) — en_US",
        ar: "Arabic — ar",
      },
      buttonModes: {
        none: "No buttons",
        quick_reply: "Quick Reply",
        call_to_action: "Call to Action",
      },
      urlModes: {
        static: "Static URL",
        dynamic: "Dynamic URL",
      },
    },
    editor: {
      kickers: {
        persistent: "Persistent draft",
        local: "Local rehearsal",
        unavailable: "Persistence unavailable",
      },
      title: "Template setup",
      persistence: {
        saving: "Saving to server",
        savedServer: "Saved on server",
        savedLocal: "Saved locally",
        notSavedServer: "Not saved on server",
        unsavedChanges: "Unsaved changes",
      },
      fields: {
        name: "Template name",
        category: "Category",
        language: "Language",
        header: "Text header — optional and currently without variables",
        body: "Message body",
        footer: "Footer — optional and without variables",
      },
      authenticationNotice:
        "Authentication requires a dedicated editor for OTP components and authentication buttons. The current general editor does not save drafts in this category.",
      headerVariableError:
        "Header variables require a separate Examples flow. Remove them from the header for now or use them in the message body.",
      variableGuidance: {
        none: "You can add sequential variables: {{1}}, {{2}}, and so on.",
        found: (count) =>
          `${count} valid variables found. Enter test values for them.`,
        invalidSyntax:
          "A variable must be numeric and use the exact format, for example {{1}}.",
        missingSequence: (expected) =>
          `The variable sequence is invalid. The next variable must be {{${expected}}}.`,
        examplesTitle: "Variable test values",
        examplesDescription:
          "These values are stored with the draft and sent to Meta as examples during submission. They are not sent to recipients.",
        complete: "All test values have been entered.",
        incomplete:
          "The draft will not be ready until every variable has a test value.",
      },
      footerVariableError:
        "Footer variables are not supported by the local editor.",
      buttons: {
        legend: "Button path — optional",
        explanation:
          "To keep each draft unambiguous, the local editor uses one button path at a time.",
        quickReplyLegend: "Quick Reply buttons",
        quickReplyLimit: "The local editor currently supports up to two buttons.",
        add: "Add button",
        quickReplyText: (index) => `Button ${index} text`,
        removeAriaLabel: (index) => `Remove button ${index}`,
        quickReplyEmpty:
          "Add at least one button or choose the path without buttons.",
        quickReplyVariableError:
          "Quick Reply text does not support variables in the local editor.",
        ctaLegend: "Call to Action buttons",
        ctaDescription:
          "You can configure a static HTTPS address, a phone number, or both.",
        openWebsite: "Open a website",
        urlType: "Address type",
        urlText: "URL button text",
        staticUrl: "Static HTTPS address",
        dynamicUrl: "HTTPS address with a {{1}} variable",
        urlExample: "Example for the URL variable",
        staticUrlError:
          "Text and a valid HTTPS address without variables are required.",
        dynamicUrlError:
          "Text, an HTTPS address with one {{1}} variable, and an Example without variables are required.",
        resolvedUrl: "URL after applying the Example",
        callPhone: "Call a phone number",
        phoneText: "Phone button text",
        phoneNumber: "Phone number",
        phoneError:
          "Text and a number containing digits only, with an optional leading +, are required.",
        ctaEmpty: "Enable at least one CTA button.",
      },
      save: {
        noPermission: "No save permission",
        saving: "Saving...",
        server: "Save draft to server",
        local: "Save local rehearsal",
        unavailable: "Saving is unavailable",
      },
      preview: {
        kicker: "Preview",
        title: "Message preview",
        persistentNotice:
          "The draft is stored in D1. After saving, you can submit it for approval from the list above.",
        localNotice:
          "Without Clerk and D1, the draft is stored only in this screen's memory and is not sent to Meta.",
        unavailableNotice:
          "Saving remains unavailable until the account or server state shown above is resolved.",
      },
    },
    directory: {
      kicker: "Persistent templates",
      title: "Saved templates",
      fromServer: (count) => `${count} from server`,
      localMode: "Local mode",
      unavailable: "Unavailable",
      syncing: "Syncing...",
      sync: "Sync with Meta",
      newDraft: "New draft",
      readOnly:
        "Your current role may view templates but may not save or submit them.",
      emptyTitle: "No saved templates",
      emptyDescription:
        "The first draft will appear here after it is successfully saved in D1.",
      updated: "Updated",
      load: "Load for editing",
      submitting: "Submitting...",
      submit: "Submit for approval",
      statuses: {
        draft: {
          label: "Draft",
          detail: "Available for editing and submission.",
        },
        submitting: {
          label: "Submission result pending",
          detail:
            "The system will not submit again until a Meta sync resolves the result.",
        },
        pending_review: {
          label: "Pending approval",
          detail: "Meta received the template and is reviewing it.",
        },
        approved: {
          label: "Approved",
          detail: "The template is available after campaign synchronization.",
        },
        rejected: {
          label: "Rejected",
          detail: "The template is locked; Meta reported the rejection.",
        },
        disabled: {
          label: "Disabled",
          detail: "Meta marked the template as inactive.",
        },
        deleted: {
          label: "Deleted",
          detail: "Meta marked the template as deleted.",
        },
      },
    },
    feedback: {
      directoryFailures: {
        "configuration-required":
          "Clerk and D1 are not configured. You can prepare a local rehearsal, but it will be lost on refresh and will not be sent to Meta.",
        "onboarding-required":
          "Complete the business details first to create an active Tenant.",
        "tenant-selection-required":
          "The user belongs to multiple Tenants and must select one explicitly.",
        "permission-denied":
          "Your current role is not permitted to read templates.",
        "server-error":
          "Templates could not be loaded from the server. No fallback data was shown.",
      },
      saveResults: {
        saved: "The draft was saved in D1 and is available after refresh.",
        "validation-error":
          "The server rejected the draft because one or more fields are invalid.",
        "not-editable":
          "A template already submitted to Meta is locked and cannot be overwritten.",
        "configuration-required": "Clerk and D1 are not configured.",
        unauthenticated: "Sign in again before saving the template.",
        "onboarding-required": "Complete the business details first.",
        "tenant-selection-required": "Select a Tenant explicitly.",
        "permission-denied":
          "Your current role is not permitted to save templates.",
        "server-error":
          "Saving the draft on the server failed. It was not marked as saved.",
      },
      localRehearsalSaved:
        "The rehearsal was saved only in this screen's memory, not on the server.",
      submitResults: {
        submitted: "Meta received the template and is reviewing it.",
        "invalid-input": "The template identifier is invalid.",
        "not-found": "The template was not found in the current Tenant.",
        "not-editable": "Only an unsubmitted draft can be submitted.",
        "meta-not-connected":
          "An active Meta connection is required before submitting a template.",
        "meta-configuration-required":
          "Graph API configuration and a server-side Credential key are required.",
        "meta-configuration-invalid":
          "The server-side Meta configuration is incomplete or invalid.",
        "credential-unavailable":
          "No encrypted Credential was found for the Tenant.",
        "state-conflict":
          "The draft changed concurrently. Reload it before trying again.",
        "submission-rejected":
          "Meta rejected the template creation request. The draft remains editable.",
        "submission-uncertain":
          "The submission result is unknown. The system will not retry until it syncs with Meta.",
        "configuration-required": "Clerk and D1 are not configured.",
        unauthenticated: "Sign in again before submitting.",
        "onboarding-required": "Complete the business details first.",
        "tenant-selection-required": "Select a Tenant explicitly.",
        "permission-denied":
          "Your current role is not permitted to submit templates.",
        "server-error": "The server could not complete the operation.",
      },
      syncResults: {
        "meta-not-connected":
          "An active Meta connection is required before syncing templates.",
        "meta-configuration-required":
          "Graph API configuration and a server-side Credential key are required.",
        "meta-configuration-invalid":
          "The server-side Meta configuration is incomplete or invalid.",
        "credential-unavailable":
          "No encrypted Credential was found for the Tenant.",
        "identity-conflict":
          "A Meta Template ID conflicts with its local name, language, or category. No automatic correction was made.",
        "sync-failed":
          "Meta or D1 did not complete the sync. No fallback status was shown.",
        "configuration-required": "Clerk and D1 are not configured.",
        unauthenticated: "Sign in again before syncing.",
        "onboarding-required": "Complete the business details first.",
        "tenant-selection-required": "Select a Tenant explicitly.",
        "permission-denied":
          "Your current role is not permitted to sync templates.",
        "server-error": "The server could not start the sync.",
      },
      syncSummary: (summary) =>
        `Meta returned ${summary.received} templates. ${summary.updated} were updated, ${summary.unchanged} were unchanged, ${summary.stale} stale events were skipped, ${summary.unmatched} are not managed locally, and ${summary.unsupported} are not supported by the current flow.`,
    },
  },
  ar: {
    page: {
      eyebrow: "قوالب رسائل Meta",
      title: "قوالب الرسائل",
      description:
        "إنشاء القوالب ومعاينتها ومتابعة عملية الموافقة الرسمية لدى Meta.",
    },
    options: {
      categories: {
        MARKETING: "Marketing — تسويق",
        UTILITY: "Utility — تحديث خدمي",
        AUTHENTICATION: "Authentication — مصادقة",
      },
      languages: {
        he: "العبرية — he",
        en_US: "الإنجليزية (الولايات المتحدة) — en_US",
        ar: "العربية — ar",
      },
      buttonModes: {
        none: "بدون أزرار",
        quick_reply: "رد سريع",
        call_to_action: "إجراء مباشر",
      },
      urlModes: {
        static: "عنوان URL ثابت",
        dynamic: "عنوان URL ديناميكي",
      },
    },
    editor: {
      kickers: {
        persistent: "مسودة دائمة",
        local: "تجربة محلية",
        unavailable: "الحفظ غير متاح",
      },
      title: "إعداد القالب",
      persistence: {
        saving: "جارٍ الحفظ على الخادم",
        savedServer: "حُفظ على الخادم",
        savedLocal: "حُفظ محليًا",
        notSavedServer: "لم يُحفظ على الخادم",
        unsavedChanges: "تغييرات غير محفوظة",
      },
      fields: {
        name: "اسم القالب",
        category: "الفئة",
        language: "اللغة",
        header: "عنوان نصي — اختياري وبدون متغيرات حاليًا",
        body: "نص الرسالة",
        footer: "تذييل — اختياري وبدون متغيرات",
      },
      authenticationNotice:
        "تتطلب فئة Authentication محررًا مخصصًا لمكونات OTP وأزرار المصادقة. لا يحفظ المحرر العام الحالي مسودات من هذه الفئة.",
      headerVariableError:
        "تتطلب متغيرات العنوان مسار Examples منفصلًا. أزلها من العنوان حاليًا أو استخدمها في نص الرسالة.",
      variableGuidance: {
        none: "يمكن إضافة متغيرات متسلسلة: {{1}} و{{2}} وهكذا.",
        found: (count) =>
          `تم العثور على ${count} متغيرات صالحة. أدخل قيم اختبار لها.`,
        invalidSyntax:
          "يجب أن يكون المتغير رقميًا وبالصيغة الدقيقة، مثل {{1}}.",
        missingSequence: (expected) =>
          `تسلسل المتغيرات غير صالح. يجب أن يكون المتغير التالي {{${expected}}}.`,
        examplesTitle: "قيم اختبار المتغيرات",
        examplesDescription:
          "تُحفظ هذه القيم مع المسودة وتُرسل إلى Meta كأمثلة عند التقديم. ولا تُرسل إلى المستلمين.",
        complete: "تم إدخال جميع قيم الاختبار.",
        incomplete:
          "لن تكون المسودة جاهزة حتى يحصل كل متغير على قيمة اختبار.",
      },
      footerVariableError:
        "لا يدعم المحرر المحلي المتغيرات في التذييل.",
      buttons: {
        legend: "مسار الأزرار — اختياري",
        explanation:
          "للحفاظ على وضوح المسودة، يستخدم المحرر المحلي مسار أزرار واحدًا في كل مرة.",
        quickReplyLegend: "أزرار الرد السريع",
        quickReplyLimit: "يدعم المحرر المحلي حاليًا زرين كحد أقصى.",
        add: "إضافة زر",
        quickReplyText: (index) => `نص الزر ${index}`,
        removeAriaLabel: (index) => `إزالة الزر ${index}`,
        quickReplyEmpty:
          "أضف زرًا واحدًا على الأقل أو اختر المسار بدون أزرار.",
        quickReplyVariableError:
          "لا يدعم نص الرد السريع المتغيرات في المحرر المحلي.",
        ctaLegend: "أزرار الإجراء المباشر",
        ctaDescription:
          "يمكن إعداد عنوان HTTPS ثابت أو رقم هاتف أو كليهما.",
        openWebsite: "فتح موقع ويب",
        urlType: "نوع العنوان",
        urlText: "نص زر URL",
        staticUrl: "عنوان HTTPS ثابت",
        dynamicUrl: "عنوان HTTPS مع المتغير {{1}}",
        urlExample: "مثال لمتغير URL",
        staticUrlError:
          "يلزم إدخال نص وعنوان HTTPS صالح بدون متغيرات.",
        dynamicUrlError:
          "يلزم إدخال نص وعنوان HTTPS بمتغير {{1}} واحد وExample بدون متغيرات.",
        resolvedUrl: "عنوان URL بعد تطبيق Example",
        callPhone: "الاتصال برقم هاتف",
        phoneText: "نص زر الهاتف",
        phoneNumber: "رقم الهاتف",
        phoneError:
          "يلزم إدخال نص ورقم يحتوي على أرقام فقط، مع + اختيارية في بدايته.",
        ctaEmpty: "فعّل زر CTA واحدًا على الأقل.",
      },
      save: {
        noPermission: "لا توجد صلاحية للحفظ",
        saving: "جارٍ الحفظ...",
        server: "حفظ المسودة على الخادم",
        local: "حفظ التجربة محليًا",
        unavailable: "الحفظ غير متاح",
      },
      preview: {
        kicker: "معاينة",
        title: "معاينة الرسالة",
        persistentNotice:
          "تُحفظ المسودة في D1. بعد الحفظ يمكن إرسالها للموافقة من القائمة أعلاه.",
        localNotice:
          "بدون Clerk وD1، تُحفظ المسودة في ذاكرة هذه الشاشة فقط ولا تُرسل إلى Meta.",
        unavailableNotice:
          "يبقى الحفظ غير متاح حتى تُحل حالة الحساب أو الخادم الموضحة أعلاه.",
      },
    },
    directory: {
      kicker: "قوالب دائمة",
      title: "القوالب المحفوظة",
      fromServer: (count) => `${count} من الخادم`,
      localMode: "وضع محلي",
      unavailable: "غير متاح",
      syncing: "جارٍ المزامنة...",
      sync: "مزامنة مع Meta",
      newDraft: "مسودة جديدة",
      readOnly:
        "يسمح دورك الحالي بعرض القوالب، لكنه لا يسمح بحفظها أو إرسالها.",
      emptyTitle: "لا توجد قوالب محفوظة",
      emptyDescription:
        "ستظهر المسودة الأولى هنا بعد حفظها بنجاح في D1.",
      updated: "آخر تحديث",
      load: "تحميل للتحرير",
      submitting: "جارٍ الإرسال...",
      submit: "إرسال للموافقة",
      statuses: {
        draft: {
          label: "مسودة",
          detail: "متاحة للتحرير والإرسال.",
        },
        submitting: {
          label: "نتيجة الإرسال قيد التحقق",
          detail:
            "لن تعيد المنظومة الإرسال حتى تحسم مزامنة Meta النتيجة.",
        },
        pending_review: {
          label: "بانتظار الموافقة",
          detail: "استلمت Meta القالب وهو قيد المراجعة.",
        },
        approved: {
          label: "تمت الموافقة",
          detail: "يتاح القالب للاستخدام بعد مزامنة الحملات.",
        },
        rejected: {
          label: "مرفوض",
          detail: "القالب مقفل؛ أبلغت Meta بحالة الرفض.",
        },
        disabled: {
          label: "معطّل",
          detail: "حددت Meta القالب على أنه غير نشط.",
        },
        deleted: {
          label: "محذوف",
          detail: "حددت Meta القالب على أنه محذوف.",
        },
      },
    },
    feedback: {
      directoryFailures: {
        "configuration-required":
          "لم يتم إعداد Clerk وD1. يمكنك تجهيز تجربة محلية، لكنها ستُحذف عند التحديث ولن تُرسل إلى Meta.",
        "onboarding-required":
          "أكمل بيانات النشاط التجاري أولًا لإنشاء Tenant نشط.",
        "tenant-selection-required":
          "المستخدم مرتبط بعدة Tenants ويجب اختيار أحدها صراحةً.",
        "permission-denied":
          "لا يسمح دورك الحالي بقراءة القوالب.",
        "server-error":
          "تعذر تحميل القوالب من الخادم. لم تُعرض بيانات بديلة.",
      },
      saveResults: {
        saved: "حُفظت المسودة في D1 وأصبحت متاحة بعد التحديث.",
        "validation-error":
          "رفض الخادم المسودة لأن حقلًا واحدًا أو أكثر غير صالح.",
        "not-editable":
          "القالب الذي أُرسل إلى Meta مقفل ولا يمكن استبداله.",
        "configuration-required": "لم يتم إعداد Clerk وD1.",
        unauthenticated: "سجّل الدخول مجددًا قبل حفظ القالب.",
        "onboarding-required": "أكمل بيانات النشاط التجاري أولًا.",
        "tenant-selection-required": "اختر Tenant صراحةً.",
        "permission-denied": "لا يسمح دورك الحالي بحفظ القوالب.",
        "server-error":
          "فشل حفظ المسودة على الخادم. لم تُسجّل على أنها محفوظة.",
      },
      localRehearsalSaved:
        "حُفظت التجربة في ذاكرة هذه الشاشة فقط، وليس على الخادم.",
      submitResults: {
        submitted: "استلمت Meta القالب وهو قيد المراجعة.",
        "invalid-input": "معرّف القالب غير صالح.",
        "not-found": "لم يُعثر على القالب في الـTenant الحالي.",
        "not-editable": "يمكن إرسال مسودة لم تُرسل من قبل فقط.",
        "meta-not-connected":
          "يلزم اتصال Meta نشط قبل إرسال القالب.",
        "meta-configuration-required":
          "يلزم إعداد Graph API ومفتاح Credential على الخادم.",
        "meta-configuration-invalid":
          "إعداد Meta على الخادم ناقص أو غير صالح.",
        "credential-unavailable":
          "لم يُعثر على Credential مشفّر للـTenant.",
        "state-conflict":
          "تغيرت المسودة بالتزامن. أعد تحميلها قبل المحاولة مجددًا.",
        "submission-rejected":
          "رفضت Meta طلب إنشاء القالب. بقيت المسودة متاحة للتحرير.",
        "submission-uncertain":
          "نتيجة الإرسال غير معروفة. لن تعيد المنظومة المحاولة قبل المزامنة مع Meta.",
        "configuration-required": "لم يتم إعداد Clerk وD1.",
        unauthenticated: "سجّل الدخول مجددًا قبل الإرسال.",
        "onboarding-required": "أكمل بيانات النشاط التجاري أولًا.",
        "tenant-selection-required": "اختر Tenant صراحةً.",
        "permission-denied": "لا يسمح دورك الحالي بإرسال القوالب.",
        "server-error": "تعذر على الخادم إكمال العملية.",
      },
      syncResults: {
        "meta-not-connected":
          "يلزم اتصال Meta نشط قبل مزامنة القوالب.",
        "meta-configuration-required":
          "يلزم إعداد Graph API ومفتاح Credential على الخادم.",
        "meta-configuration-invalid":
          "إعداد Meta على الخادم ناقص أو غير صالح.",
        "credential-unavailable":
          "لم يُعثر على Credential مشفّر للـTenant.",
        "identity-conflict":
          "يتعارض معرّف Template لدى Meta مع الاسم أو اللغة أو الفئة المحلية. لم يُجر تصحيح تلقائي.",
        "sync-failed":
          "لم تُكمل Meta أو D1 المزامنة. لم تُعرض حالة بديلة.",
        "configuration-required": "لم يتم إعداد Clerk وD1.",
        unauthenticated: "سجّل الدخول مجددًا قبل المزامنة.",
        "onboarding-required": "أكمل بيانات النشاط التجاري أولًا.",
        "tenant-selection-required": "اختر Tenant صراحةً.",
        "permission-denied": "لا يسمح دورك الحالي بمزامنة القوالب.",
        "server-error": "تعذر على الخادم بدء المزامنة.",
      },
      syncSummary: (summary) =>
        `أعادت Meta عدد ${summary.received} من القوالب. تم تحديث ${summary.updated}، ولم يتغير ${summary.unchanged}، وتم تجاوز ${summary.stale} من الأحداث القديمة، و${summary.unmatched} غير مُدارة محليًا، و${summary.unsupported} غير مدعومة في المسار الحالي.`,
    },
  },
} satisfies Record<InterfaceLanguage, TemplateEditorMessages>;

export function readTemplateEditorMessages(
  language: InterfaceLanguage,
): TemplateEditorMessages {
  return messages[language];
}
