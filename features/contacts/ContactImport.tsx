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
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
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
import {
  readContactImportMessages,
  type ContactImportActionFailureStatus,
  type ContactImportMessages,
} from "./contactImportMessages";

const contactFieldDefinitions: Array<{
  id: ContactField;
  required: boolean;
}> = [
  { id: "phoneNumber", required: true },
  { id: "firstName", required: false },
  { id: "lastName", required: false },
  { id: "email", required: false },
  { id: "company", required: false },
  { id: "consentStatusRaw", required: false },
  { id: "consentSourceRaw", required: false },
  { id: "consentRecordedAtRaw", required: false },
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
  language,
  serverImportEnabled,
  onImportedContacts,
}: {
  language: InterfaceLanguage;
  serverImportEnabled: boolean;
  onImportedContacts: (contacts: readonly ContactRecord[]) => void;
}) {
  const messages = readContactImportMessages(language);
  const contactFields = contactFieldDefinitions.map((field) => ({
    ...field,
    label: messages.fields[field.id],
  }));
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
          ? messages.sourceFailures[caughtError.code]
          : messages.runtime.unreadableFile,
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
        setImportError(
          contactImportFailureMessage(
            startResult.status,
            messages,
          ),
        );
        return;
      }

      let currentJob = startResult.job;
      setImportJob(currentJob);

      if (currentJob.status === "completed") {
        setImportMessage(messages.runtime.alreadyCompleted);
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
          setImportError(
            contactImportFailureMessage(
              result.status,
              messages,
            ),
          );
          return;
        }

        currentJob = result.job;
        setImportJob(currentJob);
        onImportedContacts(result.contacts);
      }

      setImportMessage(
        currentJob.status === "completed"
          ? messages.runtime.completed
          : messages.runtime.incomplete,
      );
    } catch {
      setImportError(messages.runtime.connectionFailed);
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
            <span className="card-kicker">{messages.source.kicker}</span>
            <h2>{fileName ?? messages.source.chooseTitle}</h2>
            <p>{messages.source.description}</p>
            <p>{messages.source.limits}</p>
          </div>
        </div>
        <label className="primary-button file-button">
          {fileName
            ? messages.source.chooseAnother
            : messages.source.chooseFile}
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
                  <span className="card-kicker">
                    {messages.schema.kicker}
                  </span>
                  <h2>{messages.schema.title}</h2>
                </div>
                <span
                  className={`status-pill ${
                    schemaAudit.isConsistent ? "success" : "warning"
                  }`}
                >
                  {schemaAudit.isConsistent
                    ? messages.schema.consistent
                    : messages.schema.reviewRequired}
                </span>
              </div>

              <div className="csv-schema-metrics">
                <div>
                  <span>{messages.schema.headerColumns}</span>
                  <strong>{schemaAudit.headerColumnCount}</strong>
                </div>
                <div>
                  <span>{messages.schema.emptyHeaders}</span>
                  <strong>{schemaAudit.emptyHeaderColumns.length}</strong>
                </div>
                <div>
                  <span>{messages.schema.duplicateHeaders}</span>
                  <strong>{schemaAudit.duplicateHeaders.length}</strong>
                </div>
                <div>
                  <span>{messages.schema.mismatchedRows}</span>
                  <strong>{schemaAudit.rowsWithColumnCountMismatch}</strong>
                </div>
              </div>

              {!schemaAudit.isConsistent ? (
                <div className="csv-schema-issues">
                  {schemaAudit.emptyHeaderColumns.length > 0 ? (
                    <p>
                      <strong>{messages.schema.emptyHeadersDetail}</strong>{" "}
                      {messages.schema.columns}{" "}
                      {schemaAudit.emptyHeaderColumns.join(", ")}
                    </p>
                  ) : null}
                  {schemaAudit.duplicateHeaders.map((duplicate) => (
                    <p key={`duplicate-header-${duplicate.header}`}>
                      <strong>{messages.schema.duplicateHeaderDetail}</strong>{" "}
                      <code>{duplicate.header}</code>{" "}
                      {messages.schema.columns}{" "}
                      {duplicate.columnNumbers.join(", ")}
                    </p>
                  ))}
                  {schemaAudit.rowIssueSamples.length > 0 ? (
                    <div>
                      <strong>{messages.schema.firstMismatchedRows}</strong>
                      <ul>
                        {schemaAudit.rowIssueSamples.map((issue) => (
                          <li key={`schema-row-${issue.rowIndex}`}>
                            {messages.schema.rowIssue(
                              issue.sourceRowNumber,
                              issue.actualColumnCount,
                              issue.expectedColumnCount,
                            )}
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
                    ? messages.schema.consistentDetail
                    : messages.schema.inconsistentDetail(
                        schemaAudit.shortRows,
                        schemaAudit.longRows,
                      )}
                </p>
              </div>
            </section>
          ) : null}

          <section className="card mapping-card">
            <div className="card-header">
              <div>
                <span className="card-kicker">
                  {messages.mapping.kicker}
                </span>
                <h2>{messages.mapping.rowsFound(csv.rows.length)}</h2>
              </div>
              <span
                className={`status-pill ${mappingChecked ? "success" : "warning"}`}
              >
                {mappingChecked
                  ? messages.mapping.ready
                  : messages.mapping.notSaved}
              </span>
            </div>

            <div className="mapping-grid">
              {contactFields.map((field) => (
                <label key={field.id}>
                  <span>
                    {field.label}
                    {field.required ? (
                      <b>{messages.mapping.required}</b>
                    ) : (
                      <small>{messages.mapping.optional}</small>
                    )}
                  </span>
                  <select
                    value={mapping[field.id] ?? ""}
                    onChange={(event) =>
                      updateMapping(field.id, event.target.value)
                    }
                  >
                    <option value="">{messages.mapping.doNotMap}</option>
                    {csv.headers.map((header, index) => (
                      <option value={String(index)} key={`column-${index}`}>
                        {header || messages.mapping.unnamedColumn} ·{" "}
                        {messages.mapping.column(index + 1)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {hasMappingCollision ? (
              <div className="inline-notice danger" role="alert">
                <span aria-hidden="true">!</span>
                <p>{messages.mapping.collision}</p>
              </div>
            ) : null}

            <div className="mapping-actions">
              <button
                type="button"
                className="primary-button"
                disabled={!canCheckMapping}
                onClick={checkAndSaveMapping}
              >
                {messages.mapping.check}
              </button>
              <p>{messages.mapping.normalizationNotice}</p>
            </div>

            {mapping.consentStatusRaw !== null ||
            mapping.consentSourceRaw !== null ||
            mapping.consentRecordedAtRaw !== null ? (
              <div className="inline-notice warning" role="status">
                <span aria-hidden="true">i</span>
                <p>{messages.mapping.rawConsentNotice}</p>
              </div>
            ) : null}
          </section>

          {mappingChecked ? (
            <section className="card contact-import-commit-card">
              <div className="card-header">
                <div>
                  <span className="card-kicker">
                    {messages.commit.kicker}
                  </span>
                  <h2>{messages.commit.title}</h2>
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
                    : messages.commit.notStarted}
                </span>
              </div>

              <p>{messages.commit.description}</p>

              {importJob ? (
                <div
                  className="contact-quality-grid"
                  aria-label={messages.commit.summaryAriaLabel}
                >
                  <div>
                    <span>{messages.commit.created}</span>
                    <strong>{importJob.createdRows}</strong>
                  </div>
                  <div>
                    <span>{messages.commit.updated}</span>
                    <strong>{importJob.updatedRows}</strong>
                  </div>
                  <div>
                    <span>{messages.commit.unchanged}</span>
                    <strong>{importJob.unchangedRows}</strong>
                  </div>
                  <div>
                    <span>{messages.commit.rejectedOrDuplicate}</span>
                    <strong>
                      {importJob.rejectedRows + importJob.duplicateRows}
                    </strong>
                  </div>
                </div>
              ) : null}

              {!serverImportEnabled ? (
                <div className="inline-notice warning" role="status">
                  <span aria-hidden="true">i</span>
                  <p>{messages.commit.disabledNotice}</p>
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
                  ? messages.commit.processing(
                      importJob?.processedRows ?? 0,
                      csv.rows.length,
                    )
                  : importJob?.status === "processing"
                    ? messages.commit.continueImport
                    : messages.commit.startImport}
              </button>
            </section>
          ) : null}

          <section className="card csv-preview-card">
            <div className="card-header">
              <div>
                <span className="card-kicker">
                  {messages.preview.kicker}
                </span>
                <h2>{messages.preview.title}</h2>
              </div>
              {mappingChecked ? (
                <span className="status-pill success">
                  {messages.preview.mappingChecked}
                </span>
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
                {messages.preview.mapAtLeastOne}
              </p>
            )}

            {mappingChecked ? (
              <>
                <div
                  className="contact-quality-grid"
                  aria-label={messages.preview.qualityAriaLabel}
                >
                  <div>
                    <span>{messages.preview.fileRows}</span>
                    <strong>{qualitySummary?.totalRows ?? 0}</strong>
                  </div>
                  <div>
                    <span>{messages.preview.rawPhone}</span>
                    <strong>{qualitySummary?.rowsWithPhone ?? 0}</strong>
                  </div>
                  <div>
                    <span>{messages.preview.missingPhone}</span>
                    <strong>{qualitySummary?.rowsWithoutPhone ?? 0}</strong>
                  </div>
                  <div>
                    <span>{messages.preview.exactDuplicates}</span>
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
                      ? messages.preview.issues
                      : messages.preview.clean}
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
            <strong>{messages.boundary.title}</strong>
            <p>{messages.boundary.description}</p>
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

function contactImportFailureMessage(
  status: ContactImportActionFailureStatus,
  messages: ContactImportMessages,
): string {
  return messages.actionFailures[status];
}
