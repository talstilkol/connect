"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
  ContactImportSourceError,
  parseContactImportSourceFile,
  type ContactImportSourceFormat,
} from "../../shared/contactImport/parseContactImportSource";
import type { ParsedCsv } from "../../shared/csv/parseCsv";
import {
  CONTACT_IMPORT_CHUNK_SIZE,
  type ContactImportCandidate,
  type ContactImportJobSummary,
  type ContactImportProfileMapping,
} from "../../shared/domain/contactImportJob";
import type { ContactRecord } from "../../shared/domain/contactRecord";
import type {
  ContactColumnMapping,
  ContactField,
} from "../../shared/domain/contactImportDraft";
import { inspectContactRows } from "../../shared/validation/contactRows";
import { inspectCsvSchema } from "../../shared/validation/csvSchema";
import {
  processContactImportChunkAction,
  startContactImportAction,
} from "../../server/contacts/contactImportActions";
import { useWorkspaceDrafts } from "../workspace/WorkspaceDraftProvider";

const contactFields: Array<{
  id: ContactField;
  label: string;
  required: boolean;
}> = [
  { id: "phoneNumber", label: "מספר טלפון", required: true },
  { id: "firstName", label: "שם פרטי", required: false },
  { id: "lastName", label: "שם משפחה", required: false },
  { id: "email", label: "אימייל", required: false },
  { id: "company", label: "חברה", required: false },
  {
    id: "consentStatusRaw",
    label: "מצב הסכמה — Raw",
    required: false,
  },
  {
    id: "consentSourceRaw",
    label: "מקור הסכמה — Raw",
    required: false,
  },
  {
    id: "consentRecordedAtRaw",
    label: "מועד הסכמה — Raw",
    required: false,
  },
];

const emptyMapping: ContactColumnMapping = {
  phoneNumber: null,
  firstName: null,
  lastName: null,
  email: null,
  company: null,
  consentStatusRaw: null,
  consentSourceRaw: null,
  consentRecordedAtRaw: null,
};

export function ContactImport({
  serverImportEnabled,
  onImportedContacts,
}: {
  serverImportEnabled: boolean;
  onImportedContacts: (contacts: readonly ContactRecord[]) => void;
}) {
  const {
    contactImportDraft,
    saveContactImportDraft,
    clearContactImportDraft,
  } = useWorkspaceDrafts();
  const [fileName, setFileName] = useState<string | null>(
    contactImportDraft?.fileName ?? null,
  );
  const [sourceDigest, setSourceDigest] = useState<string | null>(
    contactImportDraft?.sourceDigest ?? null,
  );
  const [sourceFormat, setSourceFormat] =
    useState<ContactImportSourceFormat | null>(
      contactImportDraft?.sourceFormat ?? null,
    );
  const [csv, setCsv] = useState<ParsedCsv | null>(
    contactImportDraft
      ? {
          headers: [...contactImportDraft.headers],
          rows: contactImportDraft.rows.map((row) => [...row]),
        }
      : null,
  );
  const [mapping, setMapping] = useState<ContactColumnMapping>(
    contactImportDraft ? { ...contactImportDraft.mapping } : { ...emptyMapping },
  );
  const [error, setError] = useState<string | null>(null);
  const [mappingChecked, setMappingChecked] = useState(
    Boolean(contactImportDraft),
  );
  const [importJob, setImportJob] =
    useState<ContactImportJobSummary | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const readSequence = useRef(0);

  const mappedColumns = Object.values(mapping).filter(
    (columnIndex): columnIndex is number => columnIndex !== null,
  );
  const hasMappingCollision =
    new Set(mappedColumns).size !== mappedColumns.length;
  const phoneColumnIndex = mapping.phoneNumber;
  const qualitySummary =
    csv && phoneColumnIndex !== null
      ? inspectContactRows(csv.rows, phoneColumnIndex)
      : null;
  const schemaAudit = useMemo(
    () => (csv ? inspectCsvSchema(csv.headers, csv.rows) : null),
    [csv],
  );
  const canCheckMapping =
    csv !== null &&
    csv.rows.length > 0 &&
    phoneColumnIndex !== null &&
    !hasMappingCollision;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    readSequence.current += 1;
    const currentRead = readSequence.current;

    setFileName(file?.name ?? null);
    setSourceDigest(null);
    setSourceFormat(null);
    setCsv(null);
    setMapping({ ...emptyMapping });
    setError(null);
    setMappingChecked(false);
    setImportJob(null);
    setImportMessage(null);
    setImportError(null);
    clearContactImportDraft();

    if (!file) {
      return;
    }

    try {
      const parsed = await parseContactImportSourceFile(file);

      if (currentRead !== readSequence.current) {
        return;
      }

      setCsv({ headers: parsed.headers, rows: parsed.rows });
      setSourceDigest(parsed.sourceDigest);
      setSourceFormat(parsed.format);
    } catch (caughtError) {
      if (currentRead !== readSequence.current) {
        return;
      }

      setError(
        caughtError instanceof ContactImportSourceError
          ? caughtError.message
          : "לא ניתן לקרוא את הקובץ.",
      );
    }
  };

  const updateMapping = (field: ContactField, columnIndex: string) => {
    setMapping((current) => ({
      ...current,
      [field]: columnIndex === "" ? null : Number(columnIndex),
    }));
    setMappingChecked(false);
    setImportJob(null);
    setImportMessage(null);
    setImportError(null);
    clearContactImportDraft();
  };

  const checkAndSaveMapping = () => {
    if (
      !csv ||
      !fileName ||
      !sourceFormat ||
      !sourceDigest ||
      !canCheckMapping ||
      !qualitySummary ||
      !schemaAudit
    ) {
      return;
    }

    saveContactImportDraft({
      fileName,
      sourceFormat,
      sourceDigest,
      headers: [...csv.headers],
      rows: csv.rows.map((row) => [...row]),
      mapping: { ...mapping },
      quality: { ...qualitySummary },
      schema: {
        ...schemaAudit,
        emptyHeaderColumns: [...schemaAudit.emptyHeaderColumns],
        duplicateHeaders: schemaAudit.duplicateHeaders.map((duplicate) => ({
          ...duplicate,
          columnNumbers: [...duplicate.columnNumbers],
        })),
        rowIssueSamples: schemaAudit.rowIssueSamples.map((issue) => ({
          ...issue,
        })),
      },
    });
    setMappingChecked(true);
  };

  const startPersistentImport = async () => {
    if (
      !csv ||
      !fileName ||
      !sourceDigest ||
      !mappingChecked ||
      mapping.phoneNumber === null ||
      isImporting
    ) {
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportMessage(null);

    try {
      const profileMapping: ContactImportProfileMapping = {
        phoneNumber: mapping.phoneNumber,
        firstName: mapping.firstName,
        lastName: mapping.lastName,
        email: mapping.email,
        company: mapping.company,
      };
      const startResult = await startContactImportAction({
        fileName,
        sourceDigest,
        totalRows: csv.rows.length,
        mapping: profileMapping,
      });

      if (startResult.status !== "ready") {
        setImportError(contactImportFailureMessage(startResult.status));
        return;
      }

      let currentJob = startResult.job;
      setImportJob(currentJob);

      if (currentJob.status === "completed") {
        setImportMessage("הייבוא הזה כבר הושלם בעבר; לא נוצרו רשומות כפולות.");
        return;
      }

      const candidates = csv.rows.map((row, rowIndex) =>
        toImportCandidate(row, rowIndex + 2, profileMapping),
      );

      for (
        let offset = 0;
        offset < candidates.length;
        offset += CONTACT_IMPORT_CHUNK_SIZE
      ) {
        const result = await processContactImportChunkAction({
          jobId: currentJob.id,
          rows: candidates.slice(
            offset,
            offset + CONTACT_IMPORT_CHUNK_SIZE,
          ),
        });

        if (result.status !== "processed") {
          setImportError(contactImportFailureMessage(result.status));
          return;
        }

        currentJob = result.job;
        setImportJob(currentJob);
        onImportedContacts(result.contacts);
      }

      setImportMessage(
        currentJob.status === "completed"
          ? "הייבוא הושלם ונשמר במסד הנתונים."
          : "העיבוד נעצר לפני שכל השורות הושלמו. ניתן להפעיל שוב כדי להמשיך.",
      );
    } catch {
      setImportError("החיבור לשרת נכשל. ניתן להפעיל שוב כדי להמשיך מאותה נקודה.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="contact-import-flow">
      <section className="card import-start-card">
        <div className="import-start-copy">
          <span className="document-icon" aria-hidden="true">
            {sourceFormat?.toUpperCase() ?? "CSV/XLSX"}
          </span>
          <div>
            <span className="card-kicker">שלב 1 — קובץ מקור</span>
            <h2>{fileName ?? "בחירת קובץ אנשי קשר"}</h2>
            <p>
              הקובץ נקרא תחילה מקומית בדפדפן והנתונים אינם מועלים בשלב
              זה. רק לאחר בדיקת המיפוי ואישור מפורש, שורות הפרופיל נשלחות
              לשרת במנות קטנות.
            </p>
            <p>
              עד 5 MiB, ‏50,000 שורות ו־100 עמודות. XLSX חייב לכלול
              גיליון גלוי יחיד וערכים בלבד — ללא נוסחאות, Macros או
              קישורים חיצוניים.
            </p>
          </div>
        </div>
        <label className="primary-button file-button">
          {fileName ? "בחירת קובץ אחר" : "בחירת CSV או XLSX"}
          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
          />
        </label>
      </section>

      {error ? (
        <div className="inline-notice danger" role="alert">
          <span aria-hidden="true">!</span>
          <p>{error}</p>
        </div>
      ) : null}

      {csv ? (
        <>
          {schemaAudit ? (
            <section className="card csv-schema-audit-card">
              <div className="card-header">
                <div>
                  <span className="card-kicker">Source schema audit</span>
                  <h2>בדיקת מבנה הקובץ</h2>
                </div>
                <span
                  className={`status-pill ${
                    schemaAudit.isConsistent ? "success" : "warning"
                  }`}
                >
                  {schemaAudit.isConsistent
                    ? "מבנה עקבי"
                    : "נדרשת בדיקה"}
                </span>
              </div>

              <div className="csv-schema-metrics">
                <div>
                  <span>עמודות בכותרת</span>
                  <strong>{schemaAudit.headerColumnCount}</strong>
                </div>
                <div>
                  <span>כותרות ריקות</span>
                  <strong>{schemaAudit.emptyHeaderColumns.length}</strong>
                </div>
                <div>
                  <span>כותרות כפולות</span>
                  <strong>{schemaAudit.duplicateHeaders.length}</strong>
                </div>
                <div>
                  <span>שורות ברוחב שונה</span>
                  <strong>{schemaAudit.rowsWithColumnCountMismatch}</strong>
                </div>
              </div>

              {!schemaAudit.isConsistent ? (
                <div className="csv-schema-issues">
                  {schemaAudit.emptyHeaderColumns.length > 0 ? (
                    <p>
                      <strong>כותרות ריקות:</strong> עמודות{" "}
                      {schemaAudit.emptyHeaderColumns.join(", ")}
                    </p>
                  ) : null}
                  {schemaAudit.duplicateHeaders.map((duplicate) => (
                    <p key={`duplicate-header-${duplicate.header}`}>
                      <strong>כותרת כפולה:</strong>{" "}
                      <code>{duplicate.header}</code> בעמודות{" "}
                      {duplicate.columnNumbers.join(", ")}
                    </p>
                  ))}
                  {schemaAudit.rowIssueSamples.length > 0 ? (
                    <div>
                      <strong>שורות ראשונות ברוחב שונה:</strong>
                      <ul>
                        {schemaAudit.rowIssueSamples.map((issue) => (
                          <li key={`schema-row-${issue.rowIndex}`}>
                            שורה {issue.sourceRowNumber}: נמצאו{" "}
                            {issue.actualColumnCount} עמודות במקום{" "}
                            {issue.expectedColumnCount}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div
                className={`inline-notice ${
                  schemaAudit.isConsistent ? "success" : "warning"
                }`}
                role="status"
              >
                <span aria-hidden="true">
                  {schemaAudit.isConsistent ? "✓" : "!"}
                </span>
                <p>
                  {schemaAudit.isConsistent
                    ? "הכותרות ייחודיות וכל שורות הנתונים תואמות למספר העמודות."
                    : `נמצאו ${schemaAudit.shortRows} שורות קצרות ו-${schemaAudit.longRows} שורות ארוכות. הקובץ לא תוקן אוטומטית.`}
                </p>
              </div>
            </section>
          ) : null}

          <section className="card mapping-card">
            <div className="card-header">
              <div>
                <span className="card-kicker">שלב 2 — התאמת עמודות</span>
                <h2>נמצאו {csv.rows.length} שורות נתונים</h2>
              </div>
              <span
                className={`status-pill ${mappingChecked ? "success" : "warning"}`}
              >
                {mappingChecked ? "המיפוי מוכן לייבוא" : "טרם נשמר"}
              </span>
            </div>

            <div className="mapping-grid">
              {contactFields.map((field) => (
                <label key={field.id}>
                  <span>
                    {field.label}
                    {field.required ? <b>חובה</b> : <small>רשות</small>}
                  </span>
                  <select
                    value={mapping[field.id] ?? ""}
                    onChange={(event) =>
                      updateMapping(field.id, event.target.value)
                    }
                  >
                    <option value="">לא למפות</option>
                    {csv.headers.map((header, index) => (
                      <option value={String(index)} key={`column-${index}`}>
                        {header || "עמודה ללא שם"} · עמודה {index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {hasMappingCollision ? (
              <div className="inline-notice danger" role="alert">
                <span aria-hidden="true">!</span>
                <p>אותה עמודת מקור מופתה ליותר משדה אחד.</p>
              </div>
            ) : null}

            <div className="mapping-actions">
              <button
                type="button"
                className="primary-button"
                disabled={!canCheckMapping}
                onClick={checkAndSaveMapping}
              >
                בדיקת המיפוי והכנה לייבוא
              </button>
              <p>
                אין נרמול מספרים בשלב זה. הבדיקה משווה רק ערכי טלפון זהים
                לחלוטין לאחר הסרת רווחים בתחילת ובסוף הערך.
              </p>
            </div>

            {mapping.consentStatusRaw !== null ||
            mapping.consentSourceRaw !== null ||
            mapping.consentRecordedAtRaw !== null ? (
              <div className="inline-notice warning" role="status">
                <span aria-hidden="true">i</span>
                <p>
                  עמודות ההסכמה מוצגות כ־Raw בלבד. המערכת עדיין אינה מתרגמת
                  ערכים ל״מאושר״ או ״חסום״, והייבוא הקבוע מתעלם מהן. כל איש
                  קשר חדש נשמר חסום לדיוור עד לאירוע הסכמה נפרד.
                </p>
              </div>
            ) : null}
          </section>

          {mappingChecked ? (
            <section className="card contact-import-commit-card">
              <div className="card-header">
                <div>
                  <span className="card-kicker">שלב 3 — ייבוא קבוע</span>
                  <h2>שמירת פרופילי אנשי הקשר</h2>
                </div>
                <span
                  className={`status-pill ${
                    importJob?.status === "completed"
                      ? "success"
                      : "warning"
                  }`}
                >
                  {importJob
                    ? `${importJob.processedRows}/${importJob.totalRows}`
                    : "טרם הופעל"}
                </span>
              </div>

              <p>
                השרת מאמת שוב כל שורה, מזהה כפילויות בתוך הקובץ ושומר
                התקדמות. שדות Consent גולמיים אינם משנים הרשאת דיוור.
              </p>

              {importJob ? (
                <div
                  className="contact-quality-grid"
                  aria-label="סיכום תוצאות הייבוא"
                >
                  <div>
                    <span>נוצרו</span>
                    <strong>{importJob.createdRows}</strong>
                  </div>
                  <div>
                    <span>עודכנו</span>
                    <strong>{importJob.updatedRows}</strong>
                  </div>
                  <div>
                    <span>ללא שינוי</span>
                    <strong>{importJob.unchangedRows}</strong>
                  </div>
                  <div>
                    <span>נדחו / כפולים</span>
                    <strong>
                      {importJob.rejectedRows + importJob.duplicateRows}
                    </strong>
                  </div>
                </div>
              ) : null}

              {!serverImportEnabled ? (
                <div className="inline-notice warning" role="status">
                  <span aria-hidden="true">i</span>
                  <p>
                    נדרשים Clerk ו־Tenant פעיל כדי לבצע ייבוא קבוע. בדיקת
                    הקובץ המקומית נשארת זמינה.
                  </p>
                </div>
              ) : null}

              {importError ? (
                <div className="inline-notice danger" role="alert">
                  <span aria-hidden="true">!</span>
                  <p>{importError}</p>
                </div>
              ) : null}

              {importMessage ? (
                <div className="inline-notice success" role="status">
                  <span aria-hidden="true">✓</span>
                  <p>{importMessage}</p>
                </div>
              ) : null}

              <button
                type="button"
                className="primary-button"
                disabled={!serverImportEnabled || isImporting}
                onClick={startPersistentImport}
              >
                {isImporting
                  ? `מעבד ${importJob?.processedRows ?? 0}/${csv.rows.length}...`
                  : importJob?.status === "processing"
                    ? "המשך ייבוא"
                    : "התחלת ייבוא קבוע"}
              </button>
            </section>
          ) : null}

          <section className="card csv-preview-card">
            <div className="card-header">
              <div>
                <span className="card-kicker">שלב 4 — תצוגה מקדימה</span>
                <h2>עד 5 שורות ראשונות מהקובץ</h2>
              </div>
              {mappingChecked ? (
                <span className="status-pill success">המיפוי נבדק מקומית</span>
              ) : null}
            </div>

            {mappedColumns.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {contactFields
                        .filter((field) => mapping[field.id] !== null)
                        .map((field) => (
                          <th key={field.id}>{field.label}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csv.rows.slice(0, 5).map((row, rowIndex) => (
                      <tr key={`preview-row-${rowIndex}`}>
                        {contactFields
                          .filter((field) => mapping[field.id] !== null)
                          .map((field) => (
                            <td key={field.id}>
                              {readMappedValue(row, mapping[field.id])}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="preview-placeholder">
                יש למפות לפחות עמודה אחת כדי להציג נתונים.
              </p>
            )}

            {mappingChecked ? (
              <>
                <div className="contact-quality-grid" aria-label="סיכום איכות הקובץ">
                  <div>
                    <span>שורות בקובץ</span>
                    <strong>{qualitySummary?.totalRows ?? 0}</strong>
                  </div>
                  <div>
                    <span>עם ערך טלפון Raw</span>
                    <strong>{qualitySummary?.rowsWithPhone ?? 0}</strong>
                  </div>
                  <div>
                    <span>ללא ערך טלפון</span>
                    <strong>{qualitySummary?.rowsWithoutPhone ?? 0}</strong>
                  </div>
                  <div>
                    <span>כפילויות מדויקות</span>
                    <strong>{qualitySummary?.exactDuplicateRows ?? 0}</strong>
                  </div>
                </div>

                <div
                  className={`inline-notice ${
                    (qualitySummary?.rowsWithoutPhone ?? 0) > 0 ||
                    (qualitySummary?.exactDuplicateRows ?? 0) > 0
                      ? "warning"
                      : "success"
                  }`}
                  role="status"
                >
                  <span aria-hidden="true">
                    {(qualitySummary?.rowsWithoutPhone ?? 0) > 0 ||
                    (qualitySummary?.exactDuplicateRows ?? 0) > 0
                      ? "!"
                      : "✓"}
                  </span>
                  <p>
                    {(qualitySummary?.rowsWithoutPhone ?? 0) > 0 ||
                    (qualitySummary?.exactDuplicateRows ?? 0) > 0
                      ? "נמצאו בעיות איכות גולמיות. לא הוסרו שורות ולא נקבעה מדיניות טיפול."
                      : "לכל השורות יש ערך טלפון ולא נמצאו כפילויות מדויקות. לא בוצעו אימות E.164 או בדיקת Consent."}
                  </p>
                </div>
              </>
            ) : null}
          </section>
        </>
      ) : (
        <section className="card import-boundaries">
          <span aria-hidden="true">i</span>
          <div>
            <strong>גבול המימוש הנוכחי</strong>
            <p>
              CSV ו־XLSX נבדקים מקומית תחת מגבלות גודל ותוכן. ייבוא קבוע
              זמין רק לאחר אימות משתמש ו־Tenant פעיל.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function readMappedValue(row: string[], columnIndex: number | null) {
  return columnIndex === null ? "" : (row[columnIndex] ?? "");
}

function toImportCandidate(
  row: string[],
  sourceRowNumber: number,
  mapping: ContactImportProfileMapping,
): ContactImportCandidate {
  return {
    sourceRowNumber,
    phoneNumber: readMappedValue(row, mapping.phoneNumber),
    firstName: readMappedValue(row, mapping.firstName),
    lastName: readMappedValue(row, mapping.lastName),
    email: readMappedValue(row, mapping.email),
    company: readMappedValue(row, mapping.company),
  };
}

function contactImportFailureMessage(status: string): string {
  if (status === "configuration-required") {
    return "חיבור Clerk אינו מוגדר.";
  }

  if (status === "unauthenticated") {
    return "ה־Session אינו פעיל. יש להתחבר מחדש.";
  }

  if (status === "onboarding-required") {
    return "יש להשלים תחילה את יצירת סביבת העבודה.";
  }

  if (status === "tenant-selection-required") {
    return "נדרשת בחירת Tenant מפורשת.";
  }

  if (status === "permission-denied") {
    return "לתפקיד הנוכחי אין הרשאה לייבא אנשי קשר.";
  }

  if (status === "not-found") {
    return "משימת הייבוא אינה שייכת ל־Tenant הנוכחי.";
  }

  if (status === "conflict") {
    return "פרטי משימת הייבוא אינם תואמים לקובץ שנשמר קודם.";
  }

  if (status === "validation-error") {
    return "מבנה בקשת הייבוא אינו תקין.";
  }

  return "הייבוא נכשל בשרת. ניתן להפעיל שוב כדי להמשיך מאותה נקודה.";
}
