import type {
  ContactImportSourceErrorCode,
} from "../../shared/contactImport/parseContactImportSource";
import type {
  ContactField,
} from "../../shared/domain/contactImportDraft";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";

export const contactImportActionFailureStatuses = [
  "configuration-required",
  "unauthenticated",
  "onboarding-required",
  "tenant-selection-required",
  "permission-denied",
  "not-found",
  "conflict",
  "validation-error",
  "server-error",
] as const;

export type ContactImportActionFailureStatus =
  (typeof contactImportActionFailureStatuses)[number];

export const contactImportSourceErrorCodes = [
  "unsupported-format",
  "invalid-file-name",
  "empty-file",
  "file-too-large",
  "file-changed",
  "invalid-text-encoding",
  "invalid-csv",
  "invalid-xlsx",
  "unsafe-archive",
  "archive-entry-limit",
  "archive-size-limit",
  "unsupported-xlsx-content",
  "formula-not-allowed",
  "external-link-not-allowed",
  "macro-not-allowed",
  "single-sheet-required",
  "hidden-sheet-not-allowed",
  "row-limit",
  "column-limit",
  "dimension-limit",
  "cell-length-limit",
] as const satisfies readonly ContactImportSourceErrorCode[];

export interface ContactImportMessages {
  fields: Record<ContactField, string>;
  sourceFailures: Record<ContactImportSourceErrorCode, string>;
  actionFailures: Record<ContactImportActionFailureStatus, string>;
  runtime: {
    unreadableFile: string;
    alreadyCompleted: string;
    completed: string;
    incomplete: string;
    connectionFailed: string;
  };
  source: {
    kicker: string;
    chooseTitle: string;
    description: string;
    limits: string;
    chooseAnother: string;
    chooseFile: string;
  };
  schema: {
    kicker: string;
    title: string;
    consistent: string;
    reviewRequired: string;
    headerColumns: string;
    emptyHeaders: string;
    duplicateHeaders: string;
    mismatchedRows: string;
    emptyHeadersDetail: string;
    duplicateHeaderDetail: string;
    columns: string;
    firstMismatchedRows: string;
    rowIssue: (
      sourceRowNumber: number,
      actual: number,
      expected: number,
    ) => string;
    consistentDetail: string;
    inconsistentDetail: (shortRows: number, longRows: number) => string;
  };
  mapping: {
    kicker: string;
    rowsFound: (count: number) => string;
    ready: string;
    notSaved: string;
    required: string;
    optional: string;
    doNotMap: string;
    unnamedColumn: string;
    column: (number: number) => string;
    collision: string;
    check: string;
    normalizationNotice: string;
    rawConsentNotice: string;
  };
  commit: {
    kicker: string;
    title: string;
    notStarted: string;
    description: string;
    summaryAriaLabel: string;
    created: string;
    updated: string;
    unchanged: string;
    rejectedOrDuplicate: string;
    disabledNotice: string;
    processing: (processed: number, total: number) => string;
    continueImport: string;
    startImport: string;
  };
  preview: {
    kicker: string;
    title: string;
    mappingChecked: string;
    mapAtLeastOne: string;
    qualityAriaLabel: string;
    fileRows: string;
    rawPhone: string;
    missingPhone: string;
    exactDuplicates: string;
    issues: string;
    clean: string;
  };
  boundary: {
    title: string;
    description: string;
  };
}

const messages = {
  he: {
    fields: {
      phoneNumber: "מספר טלפון",
      firstName: "שם פרטי",
      lastName: "שם משפחה",
      email: "אימייל",
      company: "חברה",
      consentStatusRaw: "מצב הסכמה — Raw",
      consentSourceRaw: "מקור הסכמה — Raw",
      consentRecordedAtRaw: "מועד הסכמה — Raw",
    },
    sourceFailures: {
      "unsupported-format":
        "נתמכים רק קובצי CSV או XLSX. קובצי XLS ישנים אינם נתמכים.",
      "invalid-file-name":
        "שם הקובץ ריק, ארוך מדי או מכיל תווים שאינם מותרים.",
      "empty-file": "הקובץ ריק.",
      "file-too-large": "הקובץ גדול מ־5 MiB. יש לפצל אותו לפני הייבוא.",
      "file-changed": "הקובץ השתנה בזמן הקריאה. יש לבחור אותו מחדש.",
      "invalid-text-encoding": "קובץ ה־CSV חייב להיות מקודד ב־UTF-8 תקין.",
      "invalid-csv": "מבנה קובץ ה־CSV אינו תקין.",
      "invalid-xlsx": "לא ניתן לקרוא את קובץ ה־XLSX בבטחה.",
      "unsafe-archive": "ארכיון ה־XLSX מכיל נתיב פנימי שאינו בטוח.",
      "archive-entry-limit": "קובץ ה־XLSX מכיל יותר מדי רכיבים פנימיים.",
      "archive-size-limit": "תוכן ה־XLSX לאחר פתיחה גדול מהמגבלה הבטוחה.",
      "unsupported-xlsx-content": "קובץ ה־XLSX מכיל תוכן שאינו נתמך.",
      "formula-not-allowed": "נוסחאות אינן מותרות בקובץ ה־XLSX.",
      "external-link-not-allowed": "קישורים חיצוניים אינם מותרים בקובץ.",
      "macro-not-allowed": "Macros אינם מותרים בקובץ ה־XLSX.",
      "single-sheet-required": "קובץ ה־XLSX חייב לכלול גיליון אחד בלבד.",
      "hidden-sheet-not-allowed": "גיליון מוסתר אינו מותר בקובץ ה־XLSX.",
      "row-limit": "מספר שורות הנתונים חורג מהמגבלה המותרת.",
      "column-limit": "מספר העמודות חורג מהמגבלה המותרת.",
      "dimension-limit": "ממדי הגיליון חורגים מהמגבלה הבטוחה.",
      "cell-length-limit": "אחד התאים ארוך מהמגבלה המותרת.",
    },
    actionFailures: {
      "configuration-required": "חיבור Clerk אינו מוגדר.",
      unauthenticated: "ה־Session אינו פעיל. יש להתחבר מחדש.",
      "onboarding-required": "יש להשלים תחילה את יצירת סביבת העבודה.",
      "tenant-selection-required": "נדרשת בחירת Tenant מפורשת.",
      "permission-denied": "לתפקיד הנוכחי אין הרשאה לייבא אנשי קשר.",
      "not-found": "משימת הייבוא אינה שייכת ל־Tenant הנוכחי.",
      conflict: "פרטי משימת הייבוא אינם תואמים לקובץ שנשמר קודם.",
      "validation-error": "מבנה בקשת הייבוא אינו תקין.",
      "server-error":
        "הייבוא נכשל בשרת. ניתן להפעיל שוב כדי להמשיך מאותה נקודה.",
    },
    runtime: {
      unreadableFile: "לא ניתן לקרוא את הקובץ.",
      alreadyCompleted:
        "הייבוא הזה כבר הושלם בעבר; לא נוצרו רשומות כפולות.",
      completed: "הייבוא הושלם ונשמר במסד הנתונים.",
      incomplete:
        "העיבוד נעצר לפני שכל השורות הושלמו. ניתן להפעיל שוב כדי להמשיך.",
      connectionFailed:
        "החיבור לשרת נכשל. ניתן להפעיל שוב כדי להמשיך מאותה נקודה.",
    },
    source: {
      kicker: "שלב 1 — קובץ מקור",
      chooseTitle: "בחירת קובץ אנשי קשר",
      description:
        "הקובץ נקרא תחילה מקומית בדפדפן והנתונים אינם מועלים בשלב זה. רק לאחר בדיקת המיפוי ואישור מפורש, שורות הפרופיל נשלחות לשרת במנות קטנות.",
      limits:
        "עד 5 MiB, ‏50,000 שורות ו־100 עמודות. XLSX חייב לכלול גיליון גלוי יחיד וערכים בלבד — ללא נוסחאות, Macros או קישורים חיצוניים.",
      chooseAnother: "בחירת קובץ אחר",
      chooseFile: "בחירת CSV או XLSX",
    },
    schema: {
      kicker: "בדיקת מבנה מקור",
      title: "בדיקת מבנה הקובץ",
      consistent: "מבנה עקבי",
      reviewRequired: "נדרשת בדיקה",
      headerColumns: "עמודות בכותרת",
      emptyHeaders: "כותרות ריקות",
      duplicateHeaders: "כותרות כפולות",
      mismatchedRows: "שורות ברוחב שונה",
      emptyHeadersDetail: "כותרות ריקות:",
      duplicateHeaderDetail: "כותרת כפולה:",
      columns: "עמודות",
      firstMismatchedRows: "שורות ראשונות ברוחב שונה:",
      rowIssue: (row, actual, expected) =>
        `שורה ${row}: נמצאו ${actual} עמודות במקום ${expected}`,
      consistentDetail:
        "הכותרות ייחודיות וכל שורות הנתונים תואמות למספר העמודות.",
      inconsistentDetail: (shortRows, longRows) =>
        `נמצאו ${shortRows} שורות קצרות ו־${longRows} שורות ארוכות. הקובץ לא תוקן אוטומטית.`,
    },
    mapping: {
      kicker: "שלב 2 — התאמת עמודות",
      rowsFound: (count) => `נמצאו ${count} שורות נתונים`,
      ready: "המיפוי מוכן לייבוא",
      notSaved: "טרם נשמר",
      required: "חובה",
      optional: "רשות",
      doNotMap: "לא למפות",
      unnamedColumn: "עמודה ללא שם",
      column: (number) => `עמודה ${number}`,
      collision: "אותה עמודת מקור מופתה ליותר משדה אחד.",
      check: "בדיקת המיפוי והכנה לייבוא",
      normalizationNotice:
        "אין נרמול מספרים בשלב זה. הבדיקה משווה רק ערכי טלפון זהים לחלוטין לאחר הסרת רווחים בתחילת ובסוף הערך.",
      rawConsentNotice:
        "עמודות ההסכמה מוצגות כ־Raw בלבד. המערכת עדיין אינה מתרגמת ערכים למורשה או חסום, והייבוא הקבוע מתעלם מהן. כל איש קשר חדש נשמר חסום לדיוור עד לאירוע הסכמה נפרד.",
    },
    commit: {
      kicker: "שלב 3 — ייבוא קבוע",
      title: "שמירת פרופילי אנשי הקשר",
      notStarted: "טרם הופעל",
      description:
        "השרת מאמת שוב כל שורה, מזהה כפילויות בתוך הקובץ ושומר התקדמות. שדות Consent גולמיים אינם משנים הרשאת דיוור.",
      summaryAriaLabel: "סיכום תוצאות הייבוא",
      created: "נוצרו",
      updated: "עודכנו",
      unchanged: "ללא שינוי",
      rejectedOrDuplicate: "נדחו / כפולים",
      disabledNotice:
        "נדרשים Clerk ו־Tenant פעיל כדי לבצע ייבוא קבוע. בדיקת הקובץ המקומית נשארת זמינה.",
      processing: (processed, total) => `מעבד ${processed}/${total}...`,
      continueImport: "המשך ייבוא",
      startImport: "התחלת ייבוא קבוע",
    },
    preview: {
      kicker: "שלב 4 — תצוגה מקדימה",
      title: "עד 5 שורות ראשונות מהקובץ",
      mappingChecked: "המיפוי נבדק מקומית",
      mapAtLeastOne: "יש למפות לפחות עמודה אחת כדי להציג נתונים.",
      qualityAriaLabel: "סיכום איכות הקובץ",
      fileRows: "שורות בקובץ",
      rawPhone: "עם ערך טלפון Raw",
      missingPhone: "ללא ערך טלפון",
      exactDuplicates: "כפילויות מדויקות",
      issues:
        "נמצאו בעיות איכות גולמיות. לא הוסרו שורות ולא נקבעה מדיניות טיפול.",
      clean:
        "לכל השורות יש ערך טלפון ולא נמצאו כפילויות מדויקות. לא בוצעו אימות E.164 או בדיקת Consent.",
    },
    boundary: {
      title: "גבול המימוש הנוכחי",
      description:
        "CSV ו־XLSX נבדקים מקומית תחת מגבלות גודל ותוכן. ייבוא קבוע זמין רק לאחר אימות משתמש ו־Tenant פעיל.",
    },
  },
  en: {
    fields: {
      phoneNumber: "Phone number",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      company: "Company",
      consentStatusRaw: "Consent status — raw",
      consentSourceRaw: "Consent source — raw",
      consentRecordedAtRaw: "Consent time — raw",
    },
    sourceFailures: {
      "unsupported-format":
        "Only CSV and XLSX files are supported. Legacy XLS files are not supported.",
      "invalid-file-name":
        "The file name is empty, too long, or contains forbidden characters.",
      "empty-file": "The file is empty.",
      "file-too-large": "The file exceeds 5 MiB. Split it before importing.",
      "file-changed": "The file changed while being read. Choose it again.",
      "invalid-text-encoding": "The CSV file must use valid UTF-8 encoding.",
      "invalid-csv": "The CSV structure is invalid.",
      "invalid-xlsx": "The XLSX file could not be read safely.",
      "unsafe-archive": "The XLSX archive contains an unsafe internal path.",
      "archive-entry-limit": "The XLSX file contains too many internal entries.",
      "archive-size-limit": "The expanded XLSX content exceeds the safe limit.",
      "unsupported-xlsx-content": "The XLSX file contains unsupported content.",
      "formula-not-allowed": "Formulas are not allowed in the XLSX file.",
      "external-link-not-allowed": "External links are not allowed in the file.",
      "macro-not-allowed": "Macros are not allowed in the XLSX file.",
      "single-sheet-required": "The XLSX file must contain exactly one sheet.",
      "hidden-sheet-not-allowed": "Hidden sheets are not allowed in the XLSX file.",
      "row-limit": "The number of data rows exceeds the allowed limit.",
      "column-limit": "The number of columns exceeds the allowed limit.",
      "dimension-limit": "The sheet dimensions exceed the safe limit.",
      "cell-length-limit": "A cell exceeds the allowed length.",
    },
    actionFailures: {
      "configuration-required": "Clerk is not configured.",
      unauthenticated: "The session is inactive. Sign in again.",
      "onboarding-required": "Complete workspace creation first.",
      "tenant-selection-required": "Choose a tenant explicitly.",
      "permission-denied": "Your current role cannot import contacts.",
      "not-found": "The import job does not belong to the current tenant.",
      conflict: "The import job details do not match the previously saved file.",
      "validation-error": "The import request structure is invalid.",
      "server-error":
        "The server import failed. Run it again to continue from the same point.",
    },
    runtime: {
      unreadableFile: "The file could not be read.",
      alreadyCompleted:
        "This import was completed previously; no duplicate records were created.",
      completed: "The import completed and was stored in the database.",
      incomplete:
        "Processing stopped before all rows completed. Run it again to continue.",
      connectionFailed:
        "The server connection failed. Run the import again to continue from the same point.",
    },
    source: {
      kicker: "Step 1 — source file",
      chooseTitle: "Choose a contact file",
      description:
        "The browser reads the file locally first, and no data is uploaded at this stage. Only after the mapping is reviewed and explicitly confirmed are profile rows sent to the server in small chunks.",
      limits:
        "Up to 5 MiB, 50,000 rows, and 100 columns. XLSX must contain one visible sheet with values only—no formulas, macros, or external links.",
      chooseAnother: "Choose another file",
      chooseFile: "Choose CSV or XLSX",
    },
    schema: {
      kicker: "Source schema audit",
      title: "Review file structure",
      consistent: "Consistent structure",
      reviewRequired: "Review required",
      headerColumns: "Header columns",
      emptyHeaders: "Empty headers",
      duplicateHeaders: "Duplicate headers",
      mismatchedRows: "Rows with different widths",
      emptyHeadersDetail: "Empty headers:",
      duplicateHeaderDetail: "Duplicate header:",
      columns: "columns",
      firstMismatchedRows: "First rows with different widths:",
      rowIssue: (row, actual, expected) =>
        `Row ${row}: found ${actual} columns instead of ${expected}`,
      consistentDetail:
        "Headers are unique and every data row matches the column count.",
      inconsistentDetail: (shortRows, longRows) =>
        `Found ${shortRows} short rows and ${longRows} long rows. The file was not corrected automatically.`,
    },
    mapping: {
      kicker: "Step 2 — map columns",
      rowsFound: (count) => `${count} data rows found`,
      ready: "Mapping ready for import",
      notSaved: "Not saved yet",
      required: "Required",
      optional: "Optional",
      doNotMap: "Do not map",
      unnamedColumn: "Unnamed column",
      column: (number) => `Column ${number}`,
      collision: "The same source column is mapped to more than one field.",
      check: "Review mapping and prepare import",
      normalizationNotice:
        "Numbers are not normalized at this stage. The check compares only identical phone values after trimming leading and trailing spaces.",
      rawConsentNotice:
        "Consent columns are displayed as raw values only. The system does not translate them into allowed or blocked states, and the persistent import ignores them. Every new contact remains blocked until a separate consent event is recorded.",
    },
    commit: {
      kicker: "Step 3 — persistent import",
      title: "Store contact profiles",
      notStarted: "Not started",
      description:
        "The server revalidates each row, detects duplicates inside the file, and stores progress. Raw consent fields do not change messaging permission.",
      summaryAriaLabel: "Import result summary",
      created: "Created",
      updated: "Updated",
      unchanged: "Unchanged",
      rejectedOrDuplicate: "Rejected / duplicate",
      disabledNotice:
        "Clerk and an active tenant are required for persistent import. Local file review remains available.",
      processing: (processed, total) => `Processing ${processed}/${total}...`,
      continueImport: "Continue import",
      startImport: "Start persistent import",
    },
    preview: {
      kicker: "Step 4 — preview",
      title: "Up to the first 5 rows",
      mappingChecked: "Mapping checked locally",
      mapAtLeastOne: "Map at least one column to display data.",
      qualityAriaLabel: "File quality summary",
      fileRows: "Rows in file",
      rawPhone: "With raw phone value",
      missingPhone: "Without phone value",
      exactDuplicates: "Exact duplicates",
      issues:
        "Raw quality issues were found. No rows were removed and no handling policy was inferred.",
      clean:
        "Every row has a phone value and no exact duplicates were found. E.164 and consent were not validated.",
    },
    boundary: {
      title: "Current implementation boundary",
      description:
        "CSV and XLSX are checked locally under size and content limits. Persistent import is available only after user verification and an active tenant.",
    },
  },
  ar: {
    fields: {
      phoneNumber: "رقم الهاتف",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      email: "البريد الإلكتروني",
      company: "الشركة",
      consentStatusRaw: "حالة الموافقة — خام",
      consentSourceRaw: "مصدر الموافقة — خام",
      consentRecordedAtRaw: "وقت الموافقة — خام",
    },
    sourceFailures: {
      "unsupported-format":
        "تُدعم ملفات CSV وXLSX فقط. ملفات XLS القديمة غير مدعومة.",
      "invalid-file-name":
        "اسم الملف فارغ أو طويل جدًا أو يحتوي على محارف غير مسموحة.",
      "empty-file": "الملف فارغ.",
      "file-too-large": "يتجاوز الملف 5 MiB. قسّمه قبل الاستيراد.",
      "file-changed": "تغيّر الملف أثناء قراءته. اختره مرة أخرى.",
      "invalid-text-encoding": "يجب أن يستخدم ملف CSV ترميز UTF-8 صالحًا.",
      "invalid-csv": "بنية ملف CSV غير صالحة.",
      "invalid-xlsx": "تعذّرت قراءة ملف XLSX بأمان.",
      "unsafe-archive": "يحتوي أرشيف XLSX على مسار داخلي غير آمن.",
      "archive-entry-limit": "يحتوي ملف XLSX على عدد كبير من العناصر الداخلية.",
      "archive-size-limit": "يتجاوز محتوى XLSX بعد فتحه الحد الآمن.",
      "unsupported-xlsx-content": "يحتوي ملف XLSX على محتوى غير مدعوم.",
      "formula-not-allowed": "الصيغ غير مسموحة في ملف XLSX.",
      "external-link-not-allowed": "الروابط الخارجية غير مسموحة في الملف.",
      "macro-not-allowed": "وحدات Macros غير مسموحة في ملف XLSX.",
      "single-sheet-required": "يجب أن يحتوي ملف XLSX على ورقة واحدة فقط.",
      "hidden-sheet-not-allowed": "الأوراق المخفية غير مسموحة في ملف XLSX.",
      "row-limit": "يتجاوز عدد صفوف البيانات الحد المسموح.",
      "column-limit": "يتجاوز عدد الأعمدة الحد المسموح.",
      "dimension-limit": "تتجاوز أبعاد الورقة الحد الآمن.",
      "cell-length-limit": "تتجاوز إحدى الخلايا الطول المسموح.",
    },
    actionFailures: {
      "configuration-required": "لم يتم إعداد Clerk.",
      unauthenticated: "الجلسة غير نشطة. سجّل الدخول مجددًا.",
      "onboarding-required": "أكمل إنشاء مساحة العمل أولًا.",
      "tenant-selection-required": "اختر Tenant صراحةً.",
      "permission-denied": "لا يسمح دورك الحالي باستيراد جهات الاتصال.",
      "not-found": "مهمة الاستيراد لا تنتمي إلى الـTenant الحالي.",
      conflict: "تفاصيل مهمة الاستيراد لا تطابق الملف المحفوظ سابقًا.",
      "validation-error": "بنية طلب الاستيراد غير صالحة.",
      "server-error":
        "فشل الاستيراد على الخادم. شغّله مجددًا للمتابعة من النقطة نفسها.",
    },
    runtime: {
      unreadableFile: "تعذّرت قراءة الملف.",
      alreadyCompleted:
        "اكتمل هذا الاستيراد سابقًا ولم تُنشأ سجلات مكررة.",
      completed: "اكتمل الاستيراد وحُفظ في قاعدة البيانات.",
      incomplete:
        "توقفت المعالجة قبل اكتمال جميع الصفوف. شغّلها مجددًا للمتابعة.",
      connectionFailed:
        "فشل الاتصال بالخادم. شغّل الاستيراد مجددًا للمتابعة من النقطة نفسها.",
    },
    source: {
      kicker: "الخطوة 1 — ملف المصدر",
      chooseTitle: "اختيار ملف جهات اتصال",
      description:
        "يقرأ المتصفح الملف محليًا أولًا ولا تُرفع البيانات في هذه المرحلة. لا تُرسل صفوف الملفات التعريفية إلى الخادم في دفعات صغيرة إلا بعد فحص التعيين وتأكيده صراحةً.",
      limits:
        "حتى 5 MiB و50,000 صف و100 عمود. يجب أن يحتوي XLSX على ورقة ظاهرة واحدة وقيم فقط، من دون صيغ أو Macros أو روابط خارجية.",
      chooseAnother: "اختيار ملف آخر",
      chooseFile: "اختيار CSV أو XLSX",
    },
    schema: {
      kicker: "فحص بنية المصدر",
      title: "فحص بنية الملف",
      consistent: "بنية متسقة",
      reviewRequired: "يلزم الفحص",
      headerColumns: "أعمدة العنوان",
      emptyHeaders: "عناوين فارغة",
      duplicateHeaders: "عناوين مكررة",
      mismatchedRows: "صفوف بعرض مختلف",
      emptyHeadersDetail: "العناوين الفارغة:",
      duplicateHeaderDetail: "العنوان المكرر:",
      columns: "الأعمدة",
      firstMismatchedRows: "أول صفوف بعرض مختلف:",
      rowIssue: (row, actual, expected) =>
        `الصف ${row}: عُثر على ${actual} عمود بدلًا من ${expected}`,
      consistentDetail:
        "العناوين فريدة وجميع صفوف البيانات تطابق عدد الأعمدة.",
      inconsistentDetail: (shortRows, longRows) =>
        `عُثر على ${shortRows} صف قصير و${longRows} صف طويل. لم يُصحح الملف تلقائيًا.`,
    },
    mapping: {
      kicker: "الخطوة 2 — تعيين الأعمدة",
      rowsFound: (count) => `عُثر على ${count} صف بيانات`,
      ready: "التعيين جاهز للاستيراد",
      notSaved: "لم يُحفظ بعد",
      required: "مطلوب",
      optional: "اختياري",
      doNotMap: "عدم التعيين",
      unnamedColumn: "عمود بلا اسم",
      column: (number) => `العمود ${number}`,
      collision: "تم تعيين عمود المصدر نفسه لأكثر من حقل.",
      check: "فحص التعيين والتحضير للاستيراد",
      normalizationNotice:
        "لا تُطبّع الأرقام في هذه المرحلة. يقارن الفحص قيم الهاتف المتطابقة فقط بعد إزالة المسافات من بداية القيمة ونهايتها.",
      rawConsentNotice:
        "تُعرض أعمدة الموافقة كقيم خام فقط. لا يحوّلها النظام إلى مسموح أو محظور، ويتجاهلها الاستيراد الدائم. تبقى كل جهة اتصال جديدة محظورة حتى تسجيل حدث موافقة منفصل.",
    },
    commit: {
      kicker: "الخطوة 3 — الاستيراد الدائم",
      title: "حفظ ملفات جهات الاتصال التعريفية",
      notStarted: "لم يبدأ",
      description:
        "يعيد الخادم التحقق من كل صف ويكتشف التكرارات داخل الملف ويحفظ التقدم. لا تغيّر حقول الموافقة الخام صلاحية المراسلة.",
      summaryAriaLabel: "ملخص نتائج الاستيراد",
      created: "أُنشئت",
      updated: "حُدّثت",
      unchanged: "بلا تغيير",
      rejectedOrDuplicate: "مرفوضة / مكررة",
      disabledNotice:
        "يلزم Clerk وTenant نشط للاستيراد الدائم. يبقى فحص الملف المحلي متاحًا.",
      processing: (processed, total) => `جارٍ معالجة ${processed}/${total}...`,
      continueImport: "متابعة الاستيراد",
      startImport: "بدء الاستيراد الدائم",
    },
    preview: {
      kicker: "الخطوة 4 — المعاينة",
      title: "حتى أول 5 صفوف من الملف",
      mappingChecked: "تم فحص التعيين محليًا",
      mapAtLeastOne: "عيّن عمودًا واحدًا على الأقل لعرض البيانات.",
      qualityAriaLabel: "ملخص جودة الملف",
      fileRows: "صفوف الملف",
      rawPhone: "مع قيمة هاتف خام",
      missingPhone: "من دون قيمة هاتف",
      exactDuplicates: "تكرارات متطابقة",
      issues:
        "عُثر على مشاكل جودة خام. لم تُحذف صفوف ولم تُفترض سياسة معالجة.",
      clean:
        "يحتوي كل صف على قيمة هاتف ولم يُعثر على تكرارات متطابقة. لم يتم التحقق من E.164 أو الموافقة.",
    },
    boundary: {
      title: "حد التنفيذ الحالي",
      description:
        "تُفحص ملفات CSV وXLSX محليًا ضمن حدود الحجم والمحتوى. لا يتاح الاستيراد الدائم إلا بعد توثيق المستخدم ووجود Tenant نشط.",
    },
  },
} satisfies Record<InterfaceLanguage, ContactImportMessages>;

export function readContactImportMessages(
  language: InterfaceLanguage,
): ContactImportMessages {
  return messages[language];
}
