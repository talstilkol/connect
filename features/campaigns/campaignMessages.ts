import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  CampaignPersonalizationField,
} from "../../shared/domain/campaignAudience";
import type {
  CampaignDirectoryStatus,
  CampaignView,
} from "../../shared/domain/campaignView";
import type {
  ActivateCampaignActionResult,
  SaveCampaignSnapshotActionResult,
} from "../../server/campaigns/campaignActionResult";

export const campaignViewStatuses = [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
  "failed",
] as const satisfies readonly CampaignView["status"][];

export const campaignSaveResultStatuses = [
  "saved",
  "invalid-input",
  "profile-required",
  "template-unavailable",
  "audience-invalid",
  "configuration-required",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "server-error",
] as const satisfies readonly SaveCampaignSnapshotActionResult["status"][];

export const campaignActivationResultStatuses = [
  "activated",
  "invalid-input",
  "state-conflict",
  "delivery-configuration-required",
  "configuration-required",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "server-error",
] as const satisfies readonly ActivateCampaignActionResult["status"][];

interface CampaignMessages {
  manager: {
    personalizationFields: Record<CampaignPersonalizationField, string>;
    campaignStatuses: Record<CampaignView["status"], string>;
    directoryFailures: Record<
      Exclude<CampaignDirectoryStatus, "ready">,
      string
    >;
    saveResults: Record<SaveCampaignSnapshotActionResult["status"], string>;
    activationResults: Record<ActivateCampaignActionResult["status"], string>;
    unavailableTitle: string;
    dynamicUrlVariable: string;
    bodyVariable: (variableNumber: string) => string;
    deliveryUnavailable: string;
    form: {
      kicker: string;
      title: string;
      writable: string;
      readOnly: string;
      noTemplate: string;
      name: string;
      approvedTemplate: string;
      audienceLegend: string;
      allContacts: string;
      allContactsDetail: string;
      list: string;
      tag: string;
      persistentAudienceDetail: string;
      chooseList: string;
      chooseTag: string;
      groupOption: (name: string, count: number) => string;
      mappingLegend: string;
      mappingDescription: string;
      chooseContactField: string;
      noMappingRequired: string;
      timingLegend: string;
      immediate: string;
      immediateDetail: string;
      scheduled: string;
      scheduledDetail: string;
      utcDateTime: string;
      timezoneBoundary: string;
      saving: string;
      save: string;
    };
    directory: {
      kicker: string;
      title: string;
      emptyTitle: string;
      emptyDescription: string;
      recipients: (count: number) => string;
      immediate: string;
      version: (version: number) => string;
      activate: string;
      activationBlocked: string;
      alreadyActivated: string;
    };
  };
  rehearsal: {
    form: {
      kicker: string;
      title: string;
      saved: string;
      unsaved: string;
      name: string;
      template: string;
      noApprovedTemplates: string;
      templateLinked: string;
      templateMissing: string;
      audience: string;
      localRows: (count: number) => string;
      noEligibleAudience: string;
      rawPhoneSummary: (withPhone: number, total: number) => string;
      audienceRequired: string;
      templateKicker: string;
      templateWarning: string;
    };
    personalization: {
      kicker: string;
      title: string;
      notApproved: string;
      sourceQualityWarning: (withoutPhone: number, duplicates: number) => string;
      previewContact: string;
      fallbackRow: (rowNumber: number) => string;
      mappingLegend: string;
      mappingDescription: string;
      chooseSourceColumn: string;
      unnamedColumn: string;
      column: (number: number) => string;
      noBodyVariables: string;
      dynamicUrlLegend: string;
      dynamicUrlDescription: string;
      selectedRowUrl: string;
      urlColumnMissing: string;
      urlValueReady: string;
      urlValueMissing: string;
      selectedRowPreview: string;
      unmappedVariables: (count: number) => string;
      emptyValues: (count: number) => string;
      previewComplete: string;
    };
    audit: {
      kicker: string;
      title: string;
      completeStatus: string;
      pendingStatus: string;
      rowsAudited: string;
      completeRows: string;
      incompleteRows: string;
      missingBodyValues: string;
      missingUrlValue: string;
      allComplete: string;
      incomplete: (count: number) => string;
      samplesTitle: string;
      samplesSummary: (shown: number, total: number) => string;
      chooseRowAria: (rowNumber: number) => string;
      row: (rowNumber: number) => string;
      choosePreview: string;
      mappingRequired: string;
      duplicatesBoundary: string;
      bodyVariables: (variables: string) => string;
      dynamicUrl: string;
    };
    boundary: {
      templateRequired: string;
      contactsRequired: string;
    };
    timing: {
      legend: string;
      immediate: string;
      immediateDetail: string;
      scheduled: string;
      scheduledDetail: string;
      dateTime: string;
      timezoneBoundary: string;
      save: string;
      checkReadiness: string;
    };
    planning: {
      kicker: string;
      title: string;
      detailsTitle: string;
      detailsComplete: string;
      detailsIncomplete: string;
      templateTitle: string;
      templateComplete: (name: string) => string;
      templateIncomplete: string;
      contactsTitle: string;
      contactsComplete: (count: number) => string;
      contactsIncomplete: string;
      mappingTitle: string;
      snapshotTitle: string;
      snapshotComplete: string;
      snapshotIncomplete: string;
      complete: string;
      incomplete: string;
      variable: {
        templateRequired: string;
        notRequired: string;
        contactsRequired: string;
        missingBody: (count: number) => string;
        dynamicUrl: string;
        missing: (parts: string) => string;
        allWithUrl: (count: number) => string;
        urlOnly: string;
        allBody: (count: number) => string;
        and: string;
      };
    };
    readiness: {
      kicker: string;
      title: string;
      phoneTitle: string;
      phoneDescription: string;
      templateTitle: string;
      templateDraftPending: (name: string) => string;
      templateMissing: string;
      audienceTitle: string;
      audienceSnapshot: (
        withPhone: number,
        withoutPhone: number,
        duplicates: number,
      ) => string;
      audienceMissing: string;
      testTitle: string;
      testDescription: string;
      blockedNotice: string;
      costLabel: string;
      costUnavailable: string;
      costDescription: string;
      sendBlocked: string;
    };
  };
}

const messages = {
  he: {
    manager: {
      personalizationFields: {
        firstName: "שם פרטי",
        lastName: "שם משפחה",
        email: "דוא״ל",
        company: "חברה",
        phoneNumber: "מספר טלפון",
      },
      campaignStatuses: {
        draft: "טיוטה",
        scheduled: "מתוזמן",
        running: "בתהליך",
        paused: "מושהה",
        completed: "הושלם",
        cancelled: "בוטל",
        failed: "נכשל",
      },
      directoryFailures: {
        "configuration-required":
          "Clerk או D1 אינם מוגדרים. מוצג תרגול מקומי בלבד, ללא קמפיין עסקי.",
        "onboarding-required":
          "נדרש להשלים יצירת סביבת עבודה לפני ניהול קמפיינים.",
        "tenant-selection-required":
          "יש לבחור סביבת עבודה פעילה לפני ניהול קמפיינים.",
        "permission-denied":
          "לתפקיד הנוכחי אין הרשאה לקריאת קמפיינים.",
        "server-error": "לא ניתן לטעון כרגע את הקמפיינים מהשרת.",
      },
      saveResults: {
        saved:
          "הקמפיין נשמר כטיוטה קבועה עם Snapshot של התבנית והקהל.",
        "invalid-input":
          "פרטי הקמפיין אינם תקינים. יש לבדוק שם, מועד ומיפויים.",
        "profile-required":
          "נדרש לשמור פרופיל עסק ואזור זמן לפני יצירת קמפיין.",
        "template-unavailable":
          "התבנית אינה זמינה עוד או שאיבדה את אישור Meta.",
        "audience-invalid":
          "הקהל ריק, אינו כשיר או שחסרים ערכי התאמה אמיתיים.",
        "configuration-required":
          "שמירה קבועה דורשת Clerk ו־D1 מוגדרים.",
        unauthenticated: "נדרשת התחברות לפני שמירת קמפיין.",
        "onboarding-required": "נדרש להשלים יצירת סביבת עבודה.",
        "tenant-selection-required": "יש לבחור סביבת עבודה פעילה.",
        "permission-denied": "אין הרשאה לשמור קמפיין.",
        "server-error": "שמירת הקמפיין נכשלה בלי לחשוף פרטי שרת.",
      },
      activationResults: {
        activated: "הקמפיין הופעל ויעבור ל־Scheduler במועד המתאים.",
        "invalid-input": "זהות הקמפיין או הגרסה אינן תקינות.",
        "state-conflict":
          "הקמפיין השתנה או שכבר הופעל. יש לרענן את הרשימה.",
        "delivery-configuration-required":
          "ההפעלה חסומה עד חיבור Adapter שליחה אמיתי.",
        "configuration-required":
          "ההפעלה דורשת Clerk ו־D1 מוגדרים.",
        unauthenticated: "נדרשת התחברות לפני הפעלת קמפיין.",
        "onboarding-required": "נדרש להשלים יצירת סביבת עבודה.",
        "tenant-selection-required": "יש לבחור סביבת עבודה פעילה.",
        "permission-denied": "אין הרשאה להפעיל קמפיין.",
        "server-error": "הפעלת הקמפיין נכשלה בלי לחשוף פרטי שרת.",
      },
      unavailableTitle: "הקמפיינים אינם זמינים",
      dynamicUrlVariable: "משתנה Dynamic URL",
      bodyVariable: (variableNumber) => `משתנה גוף {{${variableNumber}}}`,
      deliveryUnavailable:
        "ניתן לשמור קמפיין אמיתי כטיוטה. ההפעלה חסומה עד חיבור Adapter שליחה אמיתי וקביעת מדיניות הקצב וה־Retry.",
      form: {
        kicker: "קמפיין בשרת",
        title: "יצירת טיוטת קמפיין",
        writable: "שמירה ב־D1",
        readOnly: "קריאה בלבד",
        noTemplate:
          "אין תבנית מאושרת המחוברת לזהות Meta, ולכן לא ניתן ליצור קמפיין.",
        name: "שם הקמפיין",
        approvedTemplate: "תבנית מאושרת",
        audienceLegend: "מקור הקהל",
        allContacts: "כל אנשי הקשר הכשירים",
        allContactsDetail: "Consent ו־Unsubscribe נבדקים בשרת.",
        list: "רשימה",
        tag: "תגית",
        persistentAudienceDetail: "מקור Tenant קבוע מתוך D1.",
        chooseList: "בחירת רשימה",
        chooseTag: "בחירת תגית",
        groupOption: (name, count) =>
          `${name} · ${count} אנשי קשר לפני בדיקת כשירות`,
        mappingLegend: "התאמת משתנים לשדות Contact",
        mappingDescription:
          "כל ערך מגיע משדה אמיתי ב־D1. אין ברירת מחדל ואין המצאת מידע.",
        chooseContactField: "בחירת שדה Contact",
        noMappingRequired: "התבנית אינה דורשת ערכי התאמה.",
        timingLegend: "מועד",
        immediate: "מיידי",
        immediateDetail: "ירוץ לאחר Activation וה־Cron הבא.",
        scheduled: "מתוזמן",
        scheduledDetail: "בשלב זה המועד מוזן במפורש ב־UTC.",
        utcDateTime: "תאריך ושעת UTC",
        timezoneBoundary: "המערכת אינה מנחשת אזור זמן מתוך הדפדפן.",
        saving: "שומר…",
        save: "שמירת קמפיין ב־D1",
      },
      directory: {
        kicker: "D1 הוא מקור האמת",
        title: "קמפיינים שמורים",
        emptyTitle: "אין קמפיינים שמורים",
        emptyDescription:
          "טיוטה תופיע כאן רק לאחר שמירה מוצלחת בשרת.",
        recipients: (count) => `${count} נמענים`,
        immediate: "מיידי",
        version: (version) => `גרסה ${version}`,
        activate: "הפעלת קמפיין",
        activationBlocked: "הפעלה חסומה",
        alreadyActivated: "כבר הופעל",
      },
    },
    rehearsal: {
      form: {
        kicker: "טיוטת קמפיין",
        title: "פרטי הקמפיין",
        saved: "טיוטה מקומית נשמרה",
        unsaved: "טיוטה לא נשמרה",
        name: "שם הקמפיין",
        template: "תבנית לקמפיין",
        noApprovedTemplates: "אין תבניות מאושרות",
        templateLinked:
          "טיוטה מקומית מחוברת לצורכי תכנון בלבד; היא אינה מאושרת.",
        templateMissing:
          "אין טיוטת Template מקומית ונדרש גם סנכרון מ־WABA.",
        audience: "קהל יעד",
        localRows: (count) => `${count} שורות בקובץ המקומי`,
        noEligibleAudience: "אין קהל כשיר לשליחה",
        rawPhoneSummary: (withPhone, total) =>
          `${withPhone} מתוך ${total} שורות כוללות ערך טלפון Raw. Consent ו־Unsubscribe לא אומתו.`,
        audienceRequired:
          "נדרש קהל שעבר בדיקת Consent ו־Unsubscribe.",
        templateKicker: "תרגול תבנית",
        templateWarning:
          "זהו תרגול מקומי. הטיוטה אינה תבנית מאושרת ולא ניתן להשתמש בה לשליחה.",
      },
      personalization: {
        kicker: "תצוגת איש קשר",
        title: "מיפוי משתנים לאיש קשר",
        notApproved: "ללא אישור שליחה",
        sourceQualityWarning: (withoutPhone, duplicates) =>
          `בקובץ יש ${withoutPhone} שורות ללא טלפון ו־${duplicates} כפילויות מדויקות. הנתונים מוצגים בלבד ולא נוקו.`,
        previewContact: "איש קשר לתצוגה מקדימה",
        fallbackRow: (rowNumber) => `שורה ${rowNumber}`,
        mappingLegend: "התאמת משתני Template לעמודות קובץ המקור",
        mappingDescription:
          "יש לבחור עמודה עבור כל משתנה. המערכת אינה מנחשת התאמות.",
        chooseSourceColumn: "בחירת עמודת מקור",
        unnamedColumn: "עמודה ללא שם",
        column: (number) => `עמודה ${number}`,
        noBodyVariables:
          "גוף התבנית אינו כולל משתנים ולכן אינו דורש מיפוי עמודות.",
        dynamicUrlLegend: "מיפוי Dynamic URL נפרד",
        dynamicUrlDescription:
          "משתנה ה־URL אינו משתנה גוף. יש לבחור עבורו עמודת מקור עצמאית.",
        selectedRowUrl: "URL עבור השורה שנבחרה",
        urlColumnMissing: "טרם נבחרה עמודה למשתנה ה־URL.",
        urlValueReady: "משתנה ה־URL קיבל ערך מהשורה שנבחרה.",
        urlValueMissing:
          "העמודה מופתה, אך בשורה שנבחרה אין ערך עבור ה־URL.",
        selectedRowPreview: "Preview עבור השורה שנבחרה",
        unmappedVariables: (count) =>
          `נותרו ${count} משתנים ללא עמודת מקור. הם נשארים מסומנים בתוך ה־Preview.`,
        emptyValues: (count) =>
          `בשורה שנבחרה חסרים ערכים עבור ${count} משתנים. לא הוזנו ערכי ברירת מחדל.`,
        previewComplete:
          "כל משתני ה־Preview קיבלו ערך מהשורה שנבחרה. זה עדיין אינו אישור לשליחה.",
      },
      audit: {
        kicker: "בדיקת התאמה לכל הקהל",
        title: "שלמות ערכי ההתאמה בכל הקובץ",
        completeStatus: "נבדק מקומית",
        pendingStatus: "ממתין למיפוי",
        rowsAudited: "שורות שנבדקו",
        completeRows: "ערכים מלאים",
        incompleteRows: "שורות לא שלמות",
        missingBodyValues: "חסרי ערכי גוף",
        missingUrlValue: "חסרי ערך URL",
        allComplete:
          "לכל השורות יש ערכים עבור ההתאמות שהוגדרו. לא נבדקו טלפון, Consent או כשירות לשליחה.",
        incomplete: (count) =>
          `${count} שורות חסרות ערכי התאמה. הן לא הוסרו ולא שונו.`,
        samplesTitle: "שורות ראשונות לבדיקה",
        samplesSummary: (shown, total) =>
          `מוצגות ${shown} מתוך ${total} שורות לא שלמות.`,
        chooseRowAria: (rowNumber) =>
          `בחירת שורה ${rowNumber} לתצוגה מקדימה`,
        row: (rowNumber) => `שורה ${rowNumber}`,
        choosePreview: "בחירה ל־Preview",
        mappingRequired:
          "יש להשלים את כל מיפויי הגוף וה־Dynamic URL לפני בדיקת השורות. טרם בוצע Audit.",
        duplicatesBoundary:
          "כפילויות נשארות שורות נפרדות. זהו Audit של ערכי התאמה בלבד.",
        bodyVariables: (variables) => `משתני גוף: ${variables}`,
        dynamicUrl: "Dynamic URL",
      },
      boundary: {
        templateRequired: "יש לשמור תחילה טיוטת Template מקומית.",
        contactsRequired:
          "אין קובץ אנשי קשר שנבדק ונשמר ב־Workspace המקומי.",
      },
      timing: {
        legend: "מועד שליחה",
        immediate: "שליחה מיידית",
        immediateDetail:
          "תופעל בעתיד רק לאחר מעבר כל בדיקות המוכנות.",
        scheduled: "שליחה מתוזמנת",
        scheduledDetail:
          "הזמן יומר בצד השרת לפי אזור הזמן של ה־Tenant.",
        dateTime: "תאריך ושעה כפי שהוזנו",
        timezoneBoundary:
          "בדיקת עבר/עתיד והמרת אזור זמן יבוצעו רק לאחר שמירת Timezone מאומת ל־Tenant.",
        save: "שמירת טיוטה מקומית",
        checkReadiness: "בדיקת מוכנות",
      },
      planning: {
        kicker: "שלמות תכנון",
        title: "שלמות הטיוטה המקומית",
        detailsTitle: "פרטי קמפיין ומועד",
        detailsComplete: "שם הקמפיין ומצב התזמון הוגדרו.",
        detailsIncomplete: "נדרשים שם קמפיין ומועד כאשר נבחר תזמון.",
        templateTitle: "טיוטת Template מקומית",
        templateComplete: (name) => `הטיוטה "${name}" מחוברת לתכנון.`,
        templateIncomplete: "נדרשת טיוטת Template שמורה.",
        contactsTitle: "Contact Snapshot",
        contactsComplete: (count) =>
          `${count} שורות נשמרו לתכנון מקומי.`,
        contactsIncomplete: "נדרש קובץ CSV או XLSX שמיפויו נבדק ונשמר.",
        mappingTitle: "מיפוי משתני Template",
        snapshotTitle: "שמירת Snapshot מקומי",
        snapshotComplete: "הגרסה הנוכחית נשמרה ב־Workspace.",
        snapshotIncomplete: "יש לשמור את הטיוטה לאחר סיום השינויים.",
        complete:
          "התכנון המקומי הושלם. אין בכך אישור או הרשאה לשליחת הודעות.",
        incomplete:
          "אפשר לשמור טיוטה חלקית ולהשלים את הפריטים החסרים בהמשך.",
        variable: {
          templateRequired: "נדרשת טיוטת Template לפני בדיקת המשתנים.",
          notRequired: "התבנית אינה כוללת משתני גוף או Dynamic URL.",
          contactsRequired: "נדרש Contact Snapshot לצורך מיפוי עמודות.",
          missingBody: (count) => `${count} משתני גוף`,
          dynamicUrl: "Dynamic URL",
          missing: (parts) => `נותרו ללא מיפוי: ${parts}.`,
          allWithUrl: (count) =>
            `${count} משתני גוף ו־Dynamic URL מופו לעמודות מקור.`,
          urlOnly: "ה־Dynamic URL מופה לעמודת מקור נפרדת.",
          allBody: (count) =>
            `כל ${count} משתני הגוף מופו לעמודות מקור.`,
          and: " ו־",
        },
      },
      readiness: {
        kicker: "שער מוכנות",
        title: "תנאים לפני שליחה",
        phoneTitle: "מספר WhatsApp מחובר",
        phoneDescription: "אין כרגע WABA ומספר מאומתים.",
        templateTitle: "תבנית מאושרת",
        templateDraftPending: (name) =>
          `הטיוטה המקומית "${name}" טרם אושרה על ידי Meta.`,
        templateMissing:
          "אין טיוטה מקומית ואין תבנית שאושרה על ידי Meta.",
        audienceTitle: "קהל עם הסכמה תקפה",
        audienceSnapshot: (withPhone, withoutPhone, duplicates) =>
          `${withPhone} שורות כוללות ערך טלפון Raw; ${withoutPhone} חסרות ערך ו־${duplicates} כפולות במדויק. Consent ו־Unsubscribe לא אומתו.`,
        audienceMissing: "מדיניות Consent ו־Unsubscribe עדיין לא הוגדרה.",
        testTitle: "שליחת ניסיון מוצלחת",
        testDescription: "תתאפשר רק לאחר חיבור Meta והקמת Queue.",
        blockedNotice:
          "הקמפיין אינו מוכן לשליחה. הטיוטה לא נשלחה ולא נוסף Job לתור.",
        costLabel: "הערכת עלות",
        costUnavailable: "לא זמינה",
        costDescription: "נדרש ספק Meta, תמחור עדכני וקהל כשיר.",
        sendBlocked: "השליחה חסומה",
      },
    },
  },
  en: {
    manager: {
      personalizationFields: {
        firstName: "First name",
        lastName: "Last name",
        email: "Email",
        company: "Company",
        phoneNumber: "Phone number",
      },
      campaignStatuses: {
        draft: "Draft",
        scheduled: "Scheduled",
        running: "Running",
        paused: "Paused",
        completed: "Completed",
        cancelled: "Cancelled",
        failed: "Failed",
      },
      directoryFailures: {
        "configuration-required":
          "Clerk or D1 is not configured. Only a local rehearsal is shown; no business campaign is created.",
        "onboarding-required":
          "Complete workspace creation before managing campaigns.",
        "tenant-selection-required":
          "Select an active workspace before managing campaigns.",
        "permission-denied":
          "Your current role is not permitted to read campaigns.",
        "server-error": "Campaigns cannot be loaded from the server now.",
      },
      saveResults: {
        saved:
          "The campaign was saved as a persistent draft with template and audience snapshots.",
        "invalid-input":
          "The campaign details are invalid. Check the name, timing, and mappings.",
        "profile-required":
          "Save a business profile and timezone before creating a campaign.",
        "template-unavailable":
          "The template is no longer available or lost Meta approval.",
        "audience-invalid":
          "The audience is empty, ineligible, or missing real personalization values.",
        "configuration-required":
          "Persistent saving requires configured Clerk and D1.",
        unauthenticated: "Sign in before saving a campaign.",
        "onboarding-required": "Complete workspace creation first.",
        "tenant-selection-required": "Select an active workspace.",
        "permission-denied": "You may not save campaigns.",
        "server-error":
          "Campaign saving failed without exposing server details.",
      },
      activationResults: {
        activated:
          "The campaign was activated and will reach the Scheduler at the appropriate time.",
        "invalid-input": "The campaign identity or version is invalid.",
        "state-conflict":
          "The campaign changed or was already activated. Refresh the list.",
        "delivery-configuration-required":
          "Activation is blocked until a real delivery Adapter is connected.",
        "configuration-required":
          "Activation requires configured Clerk and D1.",
        unauthenticated: "Sign in before activating a campaign.",
        "onboarding-required": "Complete workspace creation first.",
        "tenant-selection-required": "Select an active workspace.",
        "permission-denied": "You may not activate campaigns.",
        "server-error":
          "Campaign activation failed without exposing server details.",
      },
      unavailableTitle: "Campaigns are unavailable",
      dynamicUrlVariable: "Dynamic URL variable",
      bodyVariable: (variableNumber) => `Body variable {{${variableNumber}}}`,
      deliveryUnavailable:
        "You can save a real campaign as a draft. Activation remains blocked until a real delivery Adapter and rate-and-retry policy are connected.",
      form: {
        kicker: "Server campaign",
        title: "Create a campaign draft",
        writable: "Save to D1",
        readOnly: "Read only",
        noTemplate:
          "No approved template is linked to a Meta identity, so a campaign cannot be created.",
        name: "Campaign name",
        approvedTemplate: "Approved template",
        audienceLegend: "Audience source",
        allContacts: "All eligible contacts",
        allContactsDetail: "Consent and unsubscribe are checked on the server.",
        list: "List",
        tag: "Tag",
        persistentAudienceDetail: "Persistent Tenant source from D1.",
        chooseList: "Choose a list",
        chooseTag: "Choose a tag",
        groupOption: (name, count) =>
          `${name} · ${count} contacts before eligibility checks`,
        mappingLegend: "Map variables to Contact fields",
        mappingDescription:
          "Every value comes from a real D1 field. There are no defaults and no invented data.",
        chooseContactField: "Choose a Contact field",
        noMappingRequired: "The template requires no personalization values.",
        timingLegend: "Timing",
        immediate: "Immediate",
        immediateDetail: "Runs after Activation and the next Cron cycle.",
        scheduled: "Scheduled",
        scheduledDetail: "The time is currently entered explicitly in UTC.",
        utcDateTime: "UTC date and time",
        timezoneBoundary: "The system does not infer a timezone from the browser.",
        saving: "Saving…",
        save: "Save campaign to D1",
      },
      directory: {
        kicker: "D1 source of truth",
        title: "Saved campaigns",
        emptyTitle: "No saved campaigns",
        emptyDescription:
          "A draft appears here only after it is successfully saved on the server.",
        recipients: (count) => `${count} recipients`,
        immediate: "Immediate",
        version: (version) => `Version ${version}`,
        activate: "Activate campaign",
        activationBlocked: "Activation blocked",
        alreadyActivated: "Already activated",
      },
    },
    rehearsal: {
      form: {
        kicker: "Campaign draft",
        title: "Campaign details",
        saved: "Local draft saved",
        unsaved: "Draft not saved",
        name: "Campaign name",
        template: "Campaign template",
        noApprovedTemplates: "No approved templates",
        templateLinked:
          "A local draft is linked for planning only; it is not approved.",
        templateMissing:
          "No local Template draft exists, and a WABA sync is also required.",
        audience: "Target audience",
        localRows: (count) => `${count} rows in the local file`,
        noEligibleAudience: "No audience eligible for delivery",
        rawPhoneSummary: (withPhone, total) =>
          `${withPhone} of ${total} rows contain a Raw phone value. Consent and unsubscribe were not verified.`,
        audienceRequired:
          "An audience that passed consent and unsubscribe checks is required.",
        templateKicker: "Template rehearsal",
        templateWarning:
          "This is a local rehearsal. The draft is not an approved template and cannot be used for delivery.",
      },
      personalization: {
        kicker: "Contact preview",
        title: "Map variables to a contact",
        notApproved: "Not approved for delivery",
        sourceQualityWarning: (withoutPhone, duplicates) =>
          `The file has ${withoutPhone} rows without a phone and ${duplicates} exact duplicates. The data is shown only and was not cleaned.`,
        previewContact: "Contact to preview",
        fallbackRow: (rowNumber) => `Row ${rowNumber}`,
        mappingLegend: "Map Template variables to source-file columns",
        mappingDescription:
          "Choose a column for every variable. The system does not guess mappings.",
        chooseSourceColumn: "Choose a source column",
        unnamedColumn: "Unnamed column",
        column: (number) => `Column ${number}`,
        noBodyVariables:
          "The template body has no variables and needs no column mapping.",
        dynamicUrlLegend: "Separate Dynamic URL mapping",
        dynamicUrlDescription:
          "The URL variable is not a body variable. Choose a separate source column for it.",
        selectedRowUrl: "URL for the selected row",
        urlColumnMissing: "No column has been selected for the URL variable.",
        urlValueReady: "The URL variable received a value from the selected row.",
        urlValueMissing:
          "The column is mapped, but the selected row has no URL value.",
        selectedRowPreview: "Preview for the selected row",
        unmappedVariables: (count) =>
          `${count} variables still have no source column. They remain marked in the Preview.`,
        emptyValues: (count) =>
          `The selected row is missing values for ${count} variables. No defaults were inserted.`,
        previewComplete:
          "Every Preview variable received a value from the selected row. This is still not delivery approval.",
      },
      audit: {
        kicker: "Audience personalization audit",
        title: "Personalization completeness across the file",
        completeStatus: "Checked locally",
        pendingStatus: "Waiting for mappings",
        rowsAudited: "Rows audited",
        completeRows: "Complete values",
        incompleteRows: "Incomplete rows",
        missingBodyValues: "Missing body values",
        missingUrlValue: "Missing URL value",
        allComplete:
          "Every row has values for the configured mappings. Phone, consent, and delivery eligibility were not checked.",
        incomplete: (count) =>
          `${count} rows are missing personalization values. They were not removed or changed.`,
        samplesTitle: "First rows to review",
        samplesSummary: (shown, total) =>
          `Showing ${shown} of ${total} incomplete rows.`,
        chooseRowAria: (rowNumber) => `Select row ${rowNumber} for preview`,
        row: (rowNumber) => `Row ${rowNumber}`,
        choosePreview: "Select for Preview",
        mappingRequired:
          "Complete every body and Dynamic URL mapping before auditing rows. No Audit has run yet.",
        duplicatesBoundary:
          "Duplicates remain separate rows. This Audit covers personalization values only.",
        bodyVariables: (variables) => `Body variables: ${variables}`,
        dynamicUrl: "Dynamic URL",
      },
      boundary: {
        templateRequired: "Save a local Template draft first.",
        contactsRequired:
          "No reviewed contact file is saved in the local Workspace.",
      },
      timing: {
        legend: "Delivery time",
        immediate: "Immediate delivery",
        immediateDetail:
          "It will be enabled only after every readiness check passes.",
        scheduled: "Scheduled delivery",
        scheduledDetail:
          "The server will convert the time using the Tenant timezone.",
        dateTime: "Date and time as entered",
        timezoneBoundary:
          "Past/future validation and timezone conversion will run only after a verified Tenant timezone is saved.",
        save: "Save local draft",
        checkReadiness: "Check readiness",
      },
      planning: {
        kicker: "Planning completeness",
        title: "Local draft completeness",
        detailsTitle: "Campaign details and timing",
        detailsComplete: "The campaign name and scheduling mode are set.",
        detailsIncomplete:
          "A campaign name and time are required when scheduling is selected.",
        templateTitle: "Local Template draft",
        templateComplete: (name) => `The "${name}" draft is linked for planning.`,
        templateIncomplete: "A saved Template draft is required.",
        contactsTitle: "Contact Snapshot",
        contactsComplete: (count) => `${count} rows were saved for local planning.`,
        contactsIncomplete: "A reviewed and saved CSV or XLSX file is required.",
        mappingTitle: "Template variable mapping",
        snapshotTitle: "Save local Snapshot",
        snapshotComplete: "The current version is saved in the Workspace.",
        snapshotIncomplete: "Save the draft after finishing your changes.",
        complete:
          "Local planning is complete. This is not approval or permission to send messages.",
        incomplete:
          "You can save a partial draft and complete missing items later.",
        variable: {
          templateRequired:
            "A Template draft is required before checking variables.",
          notRequired: "The template has no body variables or Dynamic URL.",
          contactsRequired: "A Contact Snapshot is required to map columns.",
          missingBody: (count) => `${count} body variables`,
          dynamicUrl: "Dynamic URL",
          missing: (parts) => `Still unmapped: ${parts}.`,
          allWithUrl: (count) =>
            `${count} body variables and the Dynamic URL are mapped to source columns.`,
          urlOnly: "The Dynamic URL is mapped to a separate source column.",
          allBody: (count) =>
            `All ${count} body variables are mapped to source columns.`,
          and: " and ",
        },
      },
      readiness: {
        kicker: "Readiness gate",
        title: "Requirements before delivery",
        phoneTitle: "Connected WhatsApp number",
        phoneDescription: "No verified WABA and number are currently connected.",
        templateTitle: "Approved template",
        templateDraftPending: (name) =>
          `The local "${name}" draft has not been approved by Meta.`,
        templateMissing:
          "There is no local draft and no template approved by Meta.",
        audienceTitle: "Audience with valid consent",
        audienceSnapshot: (withPhone, withoutPhone, duplicates) =>
          `${withPhone} rows contain a Raw phone value; ${withoutPhone} are missing one and ${duplicates} are exact duplicates. Consent and unsubscribe were not verified.`,
        audienceMissing: "Consent and unsubscribe policy is not configured yet.",
        testTitle: "Successful test delivery",
        testDescription:
          "Available only after Meta is connected and the Queue is configured.",
        blockedNotice:
          "The campaign is not ready for delivery. The draft was not sent and no Job was added to the queue.",
        costLabel: "Cost estimate",
        costUnavailable: "Unavailable",
        costDescription:
          "A Meta provider, current pricing, and an eligible audience are required.",
        sendBlocked: "Delivery blocked",
      },
    },
  },
  ar: {
    manager: {
      personalizationFields: {
        firstName: "الاسم الأول",
        lastName: "اسم العائلة",
        email: "البريد الإلكتروني",
        company: "الشركة",
        phoneNumber: "رقم الهاتف",
      },
      campaignStatuses: {
        draft: "مسودة",
        scheduled: "مجدولة",
        running: "قيد التنفيذ",
        paused: "متوقفة مؤقتًا",
        completed: "مكتملة",
        cancelled: "ملغاة",
        failed: "فشلت",
      },
      directoryFailures: {
        "configuration-required":
          "لم يتم إعداد Clerk أو D1. تظهر تجربة محلية فقط ولا تُنشأ حملة تجارية.",
        "onboarding-required":
          "أكمل إنشاء مساحة العمل قبل إدارة الحملات.",
        "tenant-selection-required":
          "اختر مساحة عمل نشطة قبل إدارة الحملات.",
        "permission-denied": "لا يسمح دورك الحالي بقراءة الحملات.",
        "server-error": "يتعذر تحميل الحملات من الخادم حاليًا.",
      },
      saveResults: {
        saved:
          "حُفظت الحملة كمسودة دائمة مع Snapshot للقالب والجمهور.",
        "invalid-input":
          "تفاصيل الحملة غير صالحة. تحقق من الاسم والموعد والتعيينات.",
        "profile-required":
          "احفظ ملف النشاط التجاري والمنطقة الزمنية قبل إنشاء حملة.",
        "template-unavailable":
          "لم يعد القالب متاحًا أو فقد موافقة Meta.",
        "audience-invalid":
          "الجمهور فارغ أو غير مؤهل أو تنقصه قيم تخصيص حقيقية.",
        "configuration-required":
          "يتطلب الحفظ الدائم إعداد Clerk وD1.",
        unauthenticated: "سجّل الدخول قبل حفظ الحملة.",
        "onboarding-required": "أكمل إنشاء مساحة العمل أولًا.",
        "tenant-selection-required": "اختر مساحة عمل نشطة.",
        "permission-denied": "لا توجد صلاحية لحفظ الحملات.",
        "server-error": "فشل حفظ الحملة دون كشف تفاصيل الخادم.",
      },
      activationResults: {
        activated:
          "فُعّلت الحملة وستنتقل إلى Scheduler في الموعد المناسب.",
        "invalid-input": "هوية الحملة أو إصدارها غير صالح.",
        "state-conflict":
          "تغيرت الحملة أو تم تفعيلها بالفعل. حدّث القائمة.",
        "delivery-configuration-required":
          "التفعيل محظور حتى توصيل Adapter إرسال حقيقي.",
        "configuration-required": "يتطلب التفعيل إعداد Clerk وD1.",
        unauthenticated: "سجّل الدخول قبل تفعيل الحملة.",
        "onboarding-required": "أكمل إنشاء مساحة العمل أولًا.",
        "tenant-selection-required": "اختر مساحة عمل نشطة.",
        "permission-denied": "لا توجد صلاحية لتفعيل الحملات.",
        "server-error": "فشل تفعيل الحملة دون كشف تفاصيل الخادم.",
      },
      unavailableTitle: "الحملات غير متاحة",
      dynamicUrlVariable: "متغير Dynamic URL",
      bodyVariable: (variableNumber) => `متغير النص {{${variableNumber}}}`,
      deliveryUnavailable:
        "يمكن حفظ حملة حقيقية كمسودة. يبقى التفعيل محظورًا حتى توصيل Adapter إرسال حقيقي وسياسة المعدل وإعادة المحاولة.",
      form: {
        kicker: "حملة على الخادم",
        title: "إنشاء مسودة حملة",
        writable: "حفظ في D1",
        readOnly: "قراءة فقط",
        noTemplate:
          "لا يوجد قالب معتمد مرتبط بهوية Meta، لذلك لا يمكن إنشاء حملة.",
        name: "اسم الحملة",
        approvedTemplate: "قالب معتمد",
        audienceLegend: "مصدر الجمهور",
        allContacts: "جميع جهات الاتصال المؤهلة",
        allContactsDetail:
          "يتم فحص الموافقة وإلغاء الاشتراك على الخادم.",
        list: "قائمة",
        tag: "وسم",
        persistentAudienceDetail: "مصدر Tenant دائم من D1.",
        chooseList: "اختيار قائمة",
        chooseTag: "اختيار وسم",
        groupOption: (name, count) =>
          `${name} · ${count} جهة اتصال قبل فحص الأهلية`,
        mappingLegend: "تعيين المتغيرات إلى حقول Contact",
        mappingDescription:
          "تأتي كل قيمة من حقل حقيقي في D1. لا توجد قيم افتراضية ولا بيانات مخترعة.",
        chooseContactField: "اختيار حقل Contact",
        noMappingRequired: "لا يتطلب القالب قيم تخصيص.",
        timingLegend: "الموعد",
        immediate: "فوري",
        immediateDetail: "يعمل بعد Activation ودورة Cron التالية.",
        scheduled: "مجدول",
        scheduledDetail: "يُدخل الموعد حاليًا بصيغة UTC صراحةً.",
        utcDateTime: "تاريخ ووقت UTC",
        timezoneBoundary:
          "لا تستنتج المنظومة المنطقة الزمنية من المتصفح.",
        saving: "جارٍ الحفظ…",
        save: "حفظ الحملة في D1",
      },
      directory: {
        kicker: "D1 هو مصدر الحقيقة",
        title: "الحملات المحفوظة",
        emptyTitle: "لا توجد حملات محفوظة",
        emptyDescription:
          "تظهر المسودة هنا فقط بعد حفظها بنجاح على الخادم.",
        recipients: (count) => `${count} مستلمًا`,
        immediate: "فوري",
        version: (version) => `الإصدار ${version}`,
        activate: "تفعيل الحملة",
        activationBlocked: "التفعيل محظور",
        alreadyActivated: "تم التفعيل",
      },
    },
    rehearsal: {
      form: {
        kicker: "مسودة حملة",
        title: "تفاصيل الحملة",
        saved: "حُفظت المسودة محليًا",
        unsaved: "المسودة غير محفوظة",
        name: "اسم الحملة",
        template: "قالب الحملة",
        noApprovedTemplates: "لا توجد قوالب معتمدة",
        templateLinked:
          "ترتبط مسودة محلية لأغراض التخطيط فقط؛ وهي غير معتمدة.",
        templateMissing:
          "لا توجد مسودة Template محلية، كما تلزم مزامنة WABA.",
        audience: "الجمهور المستهدف",
        localRows: (count) => `${count} صفوف في الملف المحلي`,
        noEligibleAudience: "لا يوجد جمهور مؤهل للإرسال",
        rawPhoneSummary: (withPhone, total) =>
          `${withPhone} من ${total} صفوف تحتوي قيمة هاتف Raw. لم يتم التحقق من الموافقة وإلغاء الاشتراك.`,
        audienceRequired:
          "يلزم جمهور اجتاز فحوص الموافقة وإلغاء الاشتراك.",
        templateKicker: "تجربة القالب",
        templateWarning:
          "هذه تجربة محلية. المسودة ليست قالبًا معتمدًا ولا يمكن استخدامها للإرسال.",
      },
      personalization: {
        kicker: "معاينة جهة الاتصال",
        title: "تعيين المتغيرات إلى جهة اتصال",
        notApproved: "غير معتمد للإرسال",
        sourceQualityWarning: (withoutPhone, duplicates) =>
          `يحتوي الملف على ${withoutPhone} صفوف بدون هاتف و${duplicates} تكرارات مطابقة. تُعرض البيانات فقط ولم تُنظّف.`,
        previewContact: "جهة الاتصال للمعاينة",
        fallbackRow: (rowNumber) => `الصف ${rowNumber}`,
        mappingLegend: "تعيين متغيرات Template إلى أعمدة ملف المصدر",
        mappingDescription:
          "اختر عمودًا لكل متغير. لا تخمّن المنظومة التعيينات.",
        chooseSourceColumn: "اختيار عمود مصدر",
        unnamedColumn: "عمود بلا اسم",
        column: (number) => `العمود ${number}`,
        noBodyVariables:
          "لا يحتوي نص القالب على متغيرات ولا يحتاج تعيين أعمدة.",
        dynamicUrlLegend: "تعيين Dynamic URL منفصل",
        dynamicUrlDescription:
          "متغير URL ليس متغير نص. اختر له عمود مصدر منفصلًا.",
        selectedRowUrl: "عنوان URL للصف المحدد",
        urlColumnMissing: "لم يتم اختيار عمود لمتغير URL.",
        urlValueReady: "حصل متغير URL على قيمة من الصف المحدد.",
        urlValueMissing:
          "تم تعيين العمود، لكن الصف المحدد لا يحتوي قيمة URL.",
        selectedRowPreview: "معاينة الصف المحدد",
        unmappedVariables: (count) =>
          `لا يزال ${count} من المتغيرات بدون عمود مصدر. تبقى مميزة في المعاينة.`,
        emptyValues: (count) =>
          `يفتقد الصف المحدد قيمًا لـ${count} من المتغيرات. لم تُدرج قيم افتراضية.`,
        previewComplete:
          "حصلت جميع متغيرات المعاينة على قيمة من الصف المحدد. ولا يمثل ذلك موافقة على الإرسال.",
      },
      audit: {
        kicker: "فحص تخصيص الجمهور",
        title: "اكتمال قيم التخصيص في الملف",
        completeStatus: "تم الفحص محليًا",
        pendingStatus: "بانتظار التعيينات",
        rowsAudited: "الصفوف المفحوصة",
        completeRows: "قيم مكتملة",
        incompleteRows: "صفوف غير مكتملة",
        missingBodyValues: "قيم نص مفقودة",
        missingUrlValue: "قيمة URL مفقودة",
        allComplete:
          "لجميع الصفوف قيم للتعيينات المحددة. لم يتم فحص الهاتف أو الموافقة أو أهلية الإرسال.",
        incomplete: (count) =>
          `${count} من الصفوف تفتقد قيم تخصيص. لم تُحذف أو تُغيّر.`,
        samplesTitle: "أول صفوف للمراجعة",
        samplesSummary: (shown, total) =>
          `يتم عرض ${shown} من أصل ${total} صفوف غير مكتملة.`,
        chooseRowAria: (rowNumber) => `اختيار الصف ${rowNumber} للمعاينة`,
        row: (rowNumber) => `الصف ${rowNumber}`,
        choosePreview: "اختيار للمعاينة",
        mappingRequired:
          "أكمل جميع تعيينات النص وDynamic URL قبل فحص الصفوف. لم يُنفذ Audit بعد.",
        duplicatesBoundary:
          "تبقى التكرارات صفوفًا منفصلة. يغطي هذا Audit قيم التخصيص فقط.",
        bodyVariables: (variables) => `متغيرات النص: ${variables}`,
        dynamicUrl: "Dynamic URL",
      },
      boundary: {
        templateRequired: "احفظ مسودة Template محلية أولًا.",
        contactsRequired:
          "لا يوجد ملف جهات اتصال مفحوص ومحفوظ في Workspace المحلي.",
      },
      timing: {
        legend: "موعد الإرسال",
        immediate: "إرسال فوري",
        immediateDetail:
          "لن يُفعّل إلا بعد اجتياز جميع فحوص الجاهزية.",
        scheduled: "إرسال مجدول",
        scheduledDetail:
          "سيحوّل الخادم الوقت حسب المنطقة الزمنية للـTenant.",
        dateTime: "التاريخ والوقت كما أُدخلا",
        timezoneBoundary:
          "لن يُفحص الماضي والمستقبل ولن تُحوّل المنطقة الزمنية إلا بعد حفظ منطقة زمنية موثقة للـTenant.",
        save: "حفظ المسودة محليًا",
        checkReadiness: "فحص الجاهزية",
      },
      planning: {
        kicker: "اكتمال التخطيط",
        title: "اكتمال المسودة المحلية",
        detailsTitle: "تفاصيل الحملة والموعد",
        detailsComplete: "تم تحديد اسم الحملة ووضع الجدولة.",
        detailsIncomplete:
          "يلزم اسم الحملة والموعد عند اختيار الجدولة.",
        templateTitle: "مسودة Template محلية",
        templateComplete: (name) => `المسودة "${name}" مرتبطة بالتخطيط.`,
        templateIncomplete: "تلزم مسودة Template محفوظة.",
        contactsTitle: "Contact Snapshot",
        contactsComplete: (count) =>
          `تم حفظ ${count} صفوف للتخطيط المحلي.`,
        contactsIncomplete: "يلزم ملف CSV أو XLSX مفحوص ومحفوظ.",
        mappingTitle: "تعيين متغيرات Template",
        snapshotTitle: "حفظ Snapshot محلي",
        snapshotComplete: "تم حفظ الإصدار الحالي في Workspace.",
        snapshotIncomplete: "احفظ المسودة بعد إتمام التغييرات.",
        complete:
          "اكتمل التخطيط المحلي. لا يمثل ذلك موافقة أو إذنًا لإرسال الرسائل.",
        incomplete:
          "يمكن حفظ مسودة جزئية وإكمال العناصر الناقصة لاحقًا.",
        variable: {
          templateRequired: "تلزم مسودة Template قبل فحص المتغيرات.",
          notRequired: "لا يحتوي القالب متغيرات نص أو Dynamic URL.",
          contactsRequired: "يلزم Contact Snapshot لتعيين الأعمدة.",
          missingBody: (count) => `${count} متغيرات نص`,
          dynamicUrl: "Dynamic URL",
          missing: (parts) => `تبقى بدون تعيين: ${parts}.`,
          allWithUrl: (count) =>
            `تم تعيين ${count} متغيرات نص وDynamic URL إلى أعمدة المصدر.`,
          urlOnly: "تم تعيين Dynamic URL إلى عمود مصدر منفصل.",
          allBody: (count) =>
            `تم تعيين جميع متغيرات النص وعددها ${count} إلى أعمدة المصدر.`,
          and: " و",
        },
      },
      readiness: {
        kicker: "بوابة الجاهزية",
        title: "المتطلبات قبل الإرسال",
        phoneTitle: "رقم WhatsApp متصل",
        phoneDescription: "لا يوجد حاليًا WABA ورقم موثّقان.",
        templateTitle: "قالب معتمد",
        templateDraftPending: (name) =>
          `لم تعتمد Meta المسودة المحلية "${name}" بعد.`,
        templateMissing:
          "لا توجد مسودة محلية ولا قالب معتمد من Meta.",
        audienceTitle: "جمهور بموافقة صالحة",
        audienceSnapshot: (withPhone, withoutPhone, duplicates) =>
          `${withPhone} صفوف تحتوي قيمة هاتف Raw؛ ${withoutPhone} تفتقدها و${duplicates} مكررة تمامًا. لم يتم التحقق من الموافقة وإلغاء الاشتراك.`,
        audienceMissing:
          "لم يتم إعداد سياسة الموافقة وإلغاء الاشتراك بعد.",
        testTitle: "إرسال تجريبي ناجح",
        testDescription:
          "يتاح فقط بعد توصيل Meta وإعداد Queue.",
        blockedNotice:
          "الحملة غير جاهزة للإرسال. لم تُرسل المسودة ولم تُضف Job إلى الطابور.",
        costLabel: "تقدير التكلفة",
        costUnavailable: "غير متاح",
        costDescription:
          "يلزم مزود Meta وتسعير محدث وجمهور مؤهل.",
        sendBlocked: "الإرسال محظور",
      },
    },
  },
} satisfies Record<InterfaceLanguage, CampaignMessages>;

export function readCampaignMessages(
  language: InterfaceLanguage,
): CampaignMessages {
  return messages[language];
}
