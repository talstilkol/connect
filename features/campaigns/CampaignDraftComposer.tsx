"use client";

import { FormEvent, useMemo, useState } from "react";
import type {
  CampaignDeliveryMode,
  CampaignVariableColumnMapping,
} from "../../shared/domain/campaignDraft";
import type {
  ContactColumnMapping,
  ContactField,
} from "../../shared/domain/contactImportDraft";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  applyTemplateVariableValues,
  inspectTemplateVariables,
} from "../../shared/validation/templateVariables";
import { applyDynamicUrlExample } from "../../shared/validation/templateButtons";
import { inspectCampaignPlanning } from "../../shared/validation/campaignPlanning";
import {
  inspectAudiencePersonalization,
  type AudienceRowIssue,
} from "../../shared/validation/audiencePersonalization";
import { useWorkspaceDrafts } from "../workspace/WorkspaceDraftProvider";
import { readCampaignMessages } from "./campaignMessages";

export function CampaignDraftComposer({
  language,
}: {
  language: InterfaceLanguage;
}) {
  const messages = readCampaignMessages(language);
  const {
    campaignDraft,
    contactImportDraft,
    saveCampaignDraft,
    templateDraft,
  } = useWorkspaceDrafts();
  const [name, setName] = useState(campaignDraft?.name ?? "");
  const [deliveryMode, setDeliveryMode] = useState<CampaignDeliveryMode>(
    campaignDraft?.deliveryMode ?? "immediate",
  );
  const [scheduledAt, setScheduledAt] = useState(
    campaignDraft?.scheduledAt ?? "",
  );
  const [selectedContactIndex, setSelectedContactIndex] = useState(
    campaignDraft?.selectedContactIndex ?? 0,
  );
  const [variableColumnMapping, setVariableColumnMapping] =
    useState<CampaignVariableColumnMapping>(
      campaignDraft ? { ...campaignDraft.variableColumnMapping } : {},
    );
  const [dynamicUrlColumnIndex, setDynamicUrlColumnIndex] = useState<
    number | null
  >(campaignDraft?.dynamicUrlColumnIndex ?? null);
  const [draftSaved, setDraftSaved] = useState(Boolean(campaignDraft));
  const [readinessChecked, setReadinessChecked] = useState(false);

  const hasTiming =
    deliveryMode === "immediate" || scheduledAt.trim().length > 0;
  const canSaveDraft = name.trim().length > 0 && hasTiming;
  const linkedTemplatePreview = useMemo(
    () =>
      templateDraft
        ? applyTemplateVariableValues(
            templateDraft.body,
            templateDraft.variableExamples,
          )
        : null,
    [templateDraft],
  );
  const templateVariables = useMemo(
    () =>
      templateDraft
        ? inspectTemplateVariables(templateDraft.body).numbers
        : [],
    [templateDraft],
  );
  const activeContactIndex =
    contactImportDraft &&
    selectedContactIndex >= 0 &&
    selectedContactIndex < contactImportDraft.rows.length
      ? selectedContactIndex
      : 0;
  const selectedContact =
    contactImportDraft?.rows[activeContactIndex] ?? null;
  const personalizedValues = useMemo(() => {
    if (!selectedContact) {
      return {};
    }

    return Object.fromEntries(
      templateVariables.map((variableNumber) => {
        const mappedColumn = variableColumnMapping[variableNumber];
        const value =
          mappedColumn === undefined || mappedColumn === null
            ? ""
            : (selectedContact[mappedColumn] ?? "");

        return [variableNumber, value];
      }),
    );
  }, [selectedContact, templateVariables, variableColumnMapping]);
  const personalizedPreview = useMemo(
    () =>
      templateDraft
        ? applyTemplateVariableValues(templateDraft.body, personalizedValues)
        : null,
    [personalizedValues, templateDraft],
  );
  const unmappedVariables = templateVariables.filter(
    (variableNumber) =>
      variableColumnMapping[variableNumber] === undefined ||
      variableColumnMapping[variableNumber] === null,
  );
  const emptyContactValues = templateVariables.filter((variableNumber) => {
    const mappedColumn = variableColumnMapping[variableNumber];

    return (
      mappedColumn !== undefined &&
      mappedColumn !== null &&
      !personalizedValues[variableNumber]?.trim()
    );
  });
  const hasDynamicUrl =
    templateDraft?.buttonMode === "call_to_action" &&
    templateDraft.urlButton.enabled &&
    templateDraft.urlButton.mode === "dynamic";
  const dynamicUrlContactValue =
    selectedContact && dynamicUrlColumnIndex !== null
      ? (selectedContact[dynamicUrlColumnIndex] ?? "").trim()
      : "";
  const personalizedUrlPreview = templateDraft?.urlButton.enabled
    ? hasDynamicUrl && dynamicUrlContactValue
      ? applyDynamicUrlExample(
          templateDraft.urlButton.value,
          dynamicUrlContactValue,
        )
      : templateDraft.urlButton.value.trim()
    : null;
  const planningSummary = inspectCampaignPlanning({
    name,
    deliveryMode,
    scheduledAt,
    hasTemplateDraft: templateDraft !== null,
    hasContactSnapshot: contactImportDraft !== null,
    templateVariableNumbers: templateVariables,
    variableColumnMapping,
    requiresDynamicUrlMapping: hasDynamicUrl,
    dynamicUrlColumnIndex,
    isDraftSaved: draftSaved,
  });
  const audienceAudit = useMemo(
    () =>
      inspectAudiencePersonalization({
        rows: contactImportDraft?.rows ?? [],
        templateVariableNumbers: templateVariables,
        variableColumnMapping,
        requiresDynamicUrlValue: hasDynamicUrl,
        dynamicUrlColumnIndex,
      }),
    [
      contactImportDraft,
      dynamicUrlColumnIndex,
      hasDynamicUrl,
      templateVariables,
      variableColumnMapping,
    ],
  );
  const missingVariableMappings =
    templateVariables.length -
    templateVariables.filter((variableNumber) => {
      const columnIndex = variableColumnMapping[variableNumber];
      return columnIndex !== undefined && columnIndex !== null;
    }).length;

  const markChanged = () => {
    setDraftSaved(false);
    setReadinessChecked(false);
  };

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSaveDraft) {
      return;
    }

    saveCampaignDraft({
      name: name.trim(),
      deliveryMode,
      scheduledAt: deliveryMode === "scheduled" ? scheduledAt : "",
      selectedContactIndex: activeContactIndex,
      variableColumnMapping: { ...variableColumnMapping },
      dynamicUrlColumnIndex: hasDynamicUrl ? dynamicUrlColumnIndex : null,
    });
    setDraftSaved(true);
  };

  return (
    <div className="campaign-composer-layout">
      <section className="card campaign-form-card">
        <div className="card-header">
          <div>
            <span className="card-kicker">
              {messages.rehearsal.form.kicker}
            </span>
            <h2>{messages.rehearsal.form.title}</h2>
          </div>
          <span className={`status-pill ${draftSaved ? "success" : "warning"}`}>
            {draftSaved
              ? messages.rehearsal.form.saved
              : messages.rehearsal.form.unsaved}
          </span>
        </div>

        <form className="campaign-form" onSubmit={saveDraft}>
          <label>
            <span>{messages.rehearsal.form.name}</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                markChanged();
              }}
              required
            />
          </label>

          <div className="campaign-locked-row">
            <label>
              <span>{messages.rehearsal.form.template}</span>
              <select disabled>
                <option>
                  {templateDraft?.name ??
                    messages.rehearsal.form.noApprovedTemplates}
                </option>
              </select>
              <small>
                {templateDraft
                  ? messages.rehearsal.form.templateLinked
                  : messages.rehearsal.form.templateMissing}
              </small>
            </label>

            <label>
              <span>{messages.rehearsal.form.audience}</span>
              <select disabled>
                <option>
                  {contactImportDraft
                    ? messages.rehearsal.form.localRows(
                        contactImportDraft.rows.length,
                      )
                    : messages.rehearsal.form.noEligibleAudience}
                </option>
              </select>
              <small>
                {contactImportDraft
                  ? messages.rehearsal.form.rawPhoneSummary(
                      contactImportDraft.quality.rowsWithPhone,
                      contactImportDraft.quality.totalRows,
                    )
                  : messages.rehearsal.form.audienceRequired}
              </small>
            </label>
          </div>

          {templateDraft ? (
            <section className="campaign-template-rehearsal">
              <div className="template-rehearsal-header">
                <div>
                  <span className="card-kicker">
                    {messages.rehearsal.form.templateKicker}
                  </span>
                  <strong>{templateDraft.name}</strong>
                </div>
                <div className="template-rehearsal-meta">
                  <span>{templateDraft.language}</span>
                  <span>{templateDraft.category}</span>
                </div>
              </div>
              {templateDraft.header.trim() ? (
                <h3>{templateDraft.header}</h3>
              ) : null}
              <p>{linkedTemplatePreview}</p>
              {templateDraft.footer.trim() ? (
                <small>{templateDraft.footer}</small>
              ) : null}
              <div className="inline-notice warning">
                <span aria-hidden="true">i</span>
                <p>{messages.rehearsal.form.templateWarning}</p>
              </div>
            </section>
          ) : null}

          {templateDraft && contactImportDraft ? (
            <section className="campaign-personalization">
              <div className="card-header">
                <div>
                  <span className="card-kicker">
                    {messages.rehearsal.personalization.kicker}
                  </span>
                  <h3>{messages.rehearsal.personalization.title}</h3>
                </div>
                <span className="status-pill warning">
                  {messages.rehearsal.personalization.notApproved}
                </span>
              </div>

              {contactImportDraft.quality.rowsWithoutPhone > 0 ||
              contactImportDraft.quality.exactDuplicateRows > 0 ? (
                <div className="inline-notice warning" role="status">
                  <span aria-hidden="true">!</span>
                  <p>
                    {messages.rehearsal.personalization.sourceQualityWarning(
                      contactImportDraft.quality.rowsWithoutPhone,
                      contactImportDraft.quality.exactDuplicateRows,
                    )}
                  </p>
                </div>
              ) : null}

              <label className="contact-preview-select">
                <span>{messages.rehearsal.personalization.previewContact}</span>
                <select
                  value={String(activeContactIndex)}
                  onChange={(event) => {
                    setSelectedContactIndex(Number(event.target.value));
                    markChanged();
                  }}
                >
                  {contactImportDraft.rows.map((row, rowIndex) => (
                    <option value={String(rowIndex)} key={`contact-${rowIndex}`}>
                      {buildContactPreviewLabel(
                        row,
                        rowIndex,
                        contactImportDraft.mapping,
                        messages.rehearsal.personalization.fallbackRow,
                      )}
                    </option>
                  ))}
                </select>
              </label>

              {templateVariables.length > 0 ? (
                <fieldset className="campaign-variable-mapping">
                  <legend>
                    {messages.rehearsal.personalization.mappingLegend}
                  </legend>
                  <p>
                    {messages.rehearsal.personalization.mappingDescription}
                  </p>
                  <div className="campaign-variable-mapping-grid">
                    {templateVariables.map((variableNumber) => (
                      <label key={variableNumber}>
                        <span>{`{{${variableNumber}}}`}</span>
                        <select
                          value={variableColumnMapping[variableNumber] ?? ""}
                          onChange={(event) => {
                            setVariableColumnMapping((current) => ({
                              ...current,
                              [variableNumber]:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            }));
                            markChanged();
                          }}
                        >
                          <option value="">
                            {
                              messages.rehearsal.personalization
                                .chooseSourceColumn
                            }
                          </option>
                          {contactImportDraft.headers.map(
                            (header, columnIndex) => (
                              <option
                                value={String(columnIndex)}
                                key={`variable-${variableNumber}-column-${columnIndex}`}
                              >
                                {header ||
                                  messages.rehearsal.personalization
                                    .unnamedColumn}{" "}
                                ·{" "}
                                {messages.rehearsal.personalization.column(
                                  columnIndex + 1,
                                )}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <div className="inline-notice success" role="status">
                  <span aria-hidden="true">✓</span>
                  <p>{messages.rehearsal.personalization.noBodyVariables}</p>
                </div>
              )}

              {hasDynamicUrl ? (
                <fieldset className="campaign-variable-mapping campaign-url-mapping">
                  <legend>
                    {messages.rehearsal.personalization.dynamicUrlLegend}
                  </legend>
                  <p>
                    {messages.rehearsal.personalization.dynamicUrlDescription}
                  </p>
                  <div className="campaign-variable-mapping-grid">
                    <label>
                      <span>URL {"{{1}}"}</span>
                      <select
                        value={dynamicUrlColumnIndex ?? ""}
                        onChange={(event) => {
                          setDynamicUrlColumnIndex(
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                          );
                          markChanged();
                        }}
                      >
                        <option value="">
                          {
                            messages.rehearsal.personalization
                              .chooseSourceColumn
                          }
                        </option>
                        {contactImportDraft.headers.map(
                          (header, columnIndex) => (
                            <option
                              value={String(columnIndex)}
                              key={`url-column-${columnIndex}`}
                            >
                              {header ||
                                messages.rehearsal.personalization
                                  .unnamedColumn}{" "}
                              ·{" "}
                              {messages.rehearsal.personalization.column(
                                columnIndex + 1,
                              )}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <div className="campaign-url-preview">
                    <span>
                      {messages.rehearsal.personalization.selectedRowUrl}
                    </span>
                    <code dir="ltr">{personalizedUrlPreview}</code>
                  </div>
                  <div
                    className={`inline-notice ${
                      dynamicUrlColumnIndex !== null && dynamicUrlContactValue
                        ? "success"
                        : "warning"
                    }`}
                    role="status"
                  >
                    <span aria-hidden="true">
                      {dynamicUrlColumnIndex !== null && dynamicUrlContactValue
                        ? "✓"
                        : "!"}
                    </span>
                    <p>
                      {dynamicUrlColumnIndex === null
                        ? messages.rehearsal.personalization.urlColumnMissing
                        : dynamicUrlContactValue
                          ? messages.rehearsal.personalization.urlValueReady
                          : messages.rehearsal.personalization.urlValueMissing}
                    </p>
                  </div>
                </fieldset>
              ) : null}

              <div className="personalized-message-preview">
                <span>
                  {messages.rehearsal.personalization.selectedRowPreview}
                </span>
                {templateDraft.header.trim() ? (
                  <h4>{templateDraft.header}</h4>
                ) : null}
                <p>{personalizedPreview}</p>
                {templateDraft.footer.trim() ? (
                  <small>{templateDraft.footer}</small>
                ) : null}
                {templateDraft.buttonMode === "quick_reply" &&
                templateDraft.quickReplies.length > 0 ? (
                  <div className="personalized-message-actions">
                    {templateDraft.quickReplies.map((quickReply, index) => (
                      <span key={`campaign-quick-reply-${index}`}>
                        {quickReply}
                      </span>
                    ))}
                  </div>
                ) : null}
                {templateDraft.buttonMode === "call_to_action" &&
                (templateDraft.urlButton.enabled ||
                  templateDraft.phoneButton.enabled) ? (
                  <div className="personalized-message-actions cta">
                    {templateDraft.urlButton.enabled ? (
                      <span>
                        <strong>↗ {templateDraft.urlButton.text}</strong>
                        <code dir="ltr">{personalizedUrlPreview}</code>
                      </span>
                    ) : null}
                    {templateDraft.phoneButton.enabled ? (
                      <span>
                        <strong>☎ {templateDraft.phoneButton.text}</strong>
                        <code dir="ltr">
                          {templateDraft.phoneButton.value}
                        </code>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {unmappedVariables.length > 0 ? (
                <div className="inline-notice warning" role="status">
                  <span aria-hidden="true">!</span>
                  <p>
                    {messages.rehearsal.personalization.unmappedVariables(
                      unmappedVariables.length,
                    )}
                  </p>
                </div>
              ) : emptyContactValues.length > 0 ? (
                <div className="inline-notice warning" role="status">
                  <span aria-hidden="true">!</span>
                  <p>
                    {messages.rehearsal.personalization.emptyValues(
                      emptyContactValues.length,
                    )}
                  </p>
                </div>
              ) : (
                <div className="inline-notice success" role="status">
                  <span aria-hidden="true">✓</span>
                  <p>{messages.rehearsal.personalization.previewComplete}</p>
                </div>
              )}

              <section className="audience-personalization-audit">
                <div className="card-header">
                  <div>
                    <span className="card-kicker">
                      {messages.rehearsal.audit.kicker}
                    </span>
                    <h4>{messages.rehearsal.audit.title}</h4>
                  </div>
                  <span
                    className={`status-pill ${
                      audienceAudit.mappingComplete ? "success" : "warning"
                    }`}
                  >
                    {audienceAudit.mappingComplete
                      ? messages.rehearsal.audit.completeStatus
                      : messages.rehearsal.audit.pendingStatus}
                  </span>
                </div>

                {audienceAudit.mappingComplete ? (
                  <>
                    <div className="audience-audit-grid">
                      <div>
                        <span>{messages.rehearsal.audit.rowsAudited}</span>
                        <strong>{audienceAudit.auditedRows}</strong>
                      </div>
                      <div>
                        <span>{messages.rehearsal.audit.completeRows}</span>
                        <strong>{audienceAudit.completeRows}</strong>
                      </div>
                      <div>
                        <span>{messages.rehearsal.audit.incompleteRows}</span>
                        <strong>{audienceAudit.incompleteRows}</strong>
                      </div>
                      <div>
                        <span>
                          {messages.rehearsal.audit.missingBodyValues}
                        </span>
                        <strong>{audienceAudit.rowsMissingBodyValues}</strong>
                      </div>
                      <div>
                        <span>{messages.rehearsal.audit.missingUrlValue}</span>
                        <strong>
                          {audienceAudit.rowsMissingDynamicUrlValue}
                        </strong>
                      </div>
                    </div>
                    <div
                      className={`inline-notice ${
                        audienceAudit.incompleteRows === 0
                          ? "success"
                          : "warning"
                      }`}
                      role="status"
                    >
                      <span aria-hidden="true">
                        {audienceAudit.incompleteRows === 0 ? "✓" : "!"}
                      </span>
                      <p>
                        {audienceAudit.incompleteRows === 0
                          ? messages.rehearsal.audit.allComplete
                          : messages.rehearsal.audit.incomplete(
                              audienceAudit.incompleteRows,
                            )}
                      </p>
                    </div>
                    {audienceAudit.issueSamples.length > 0 ? (
                      <div className="audience-issue-samples">
                        <div>
                          <strong>{messages.rehearsal.audit.samplesTitle}</strong>
                          <small>
                            {messages.rehearsal.audit.samplesSummary(
                              audienceAudit.issueSamples.length,
                              audienceAudit.incompleteRows,
                            )}
                          </small>
                        </div>
                        <div>
                          {audienceAudit.issueSamples.map((issue) => (
                            <button
                              type="button"
                              className={
                                activeContactIndex === issue.rowIndex
                                  ? "active"
                                  : ""
                              }
                              key={`audience-issue-${issue.rowIndex}`}
                              onClick={() => {
                                setSelectedContactIndex(issue.rowIndex);
                                markChanged();
                              }}
                              aria-label={
                                messages.rehearsal.audit.chooseRowAria(
                                  issue.sourceRowNumber,
                                )
                              }
                            >
                              <span>
                                {messages.rehearsal.audit.row(
                                  issue.sourceRowNumber,
                                )}
                              </span>
                              <small>
                                {describeAudienceIssue(issue, messages)}
                              </small>
                              <b>{messages.rehearsal.audit.choosePreview}</b>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="inline-notice warning" role="status">
                    <span aria-hidden="true">i</span>
                    <p>{messages.rehearsal.audit.mappingRequired}</p>
                  </div>
                )}

                <small>{messages.rehearsal.audit.duplicatesBoundary}</small>
              </section>
            </section>
          ) : (
            <div className="inline-notice warning campaign-data-boundary">
              <span aria-hidden="true">i</span>
              <p>
                {!templateDraft
                  ? messages.rehearsal.boundary.templateRequired
                  : messages.rehearsal.boundary.contactsRequired}
              </p>
            </div>
          )}

          <fieldset className="delivery-fieldset">
            <legend>{messages.rehearsal.timing.legend}</legend>
            <label className={deliveryMode === "immediate" ? "selected" : ""}>
              <input
                type="radio"
                name="deliveryMode"
                value="immediate"
                checked={deliveryMode === "immediate"}
                onChange={() => {
                  setDeliveryMode("immediate");
                  markChanged();
                }}
              />
              <span>
                <strong>{messages.rehearsal.timing.immediate}</strong>
                <small>{messages.rehearsal.timing.immediateDetail}</small>
              </span>
            </label>
            <label className={deliveryMode === "scheduled" ? "selected" : ""}>
              <input
                type="radio"
                name="deliveryMode"
                value="scheduled"
                checked={deliveryMode === "scheduled"}
                onChange={() => {
                  setDeliveryMode("scheduled");
                  markChanged();
                }}
              />
              <span>
                <strong>{messages.rehearsal.timing.scheduled}</strong>
                <small>{messages.rehearsal.timing.scheduledDetail}</small>
              </span>
            </label>
          </fieldset>

          {deliveryMode === "scheduled" ? (
            <label>
              <span>{messages.rehearsal.timing.dateTime}</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => {
                  setScheduledAt(event.target.value);
                  markChanged();
                }}
                required
              />
              <small className="schedule-boundary-note">
                {messages.rehearsal.timing.timezoneBoundary}
              </small>
            </label>
          ) : null}

          <div className="campaign-form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={!canSaveDraft}
            >
              {messages.rehearsal.timing.save}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!canSaveDraft}
              onClick={() => setReadinessChecked(true)}
            >
              {messages.rehearsal.timing.checkReadiness}
            </button>
          </div>
        </form>
      </section>

      <aside className="card campaign-readiness-card">
        <section className="campaign-planning-section">
          <div className="card-header">
            <div>
              <span className="card-kicker">
                {messages.rehearsal.planning.kicker}
              </span>
              <h2>{messages.rehearsal.planning.title}</h2>
            </div>
            <span
              className={`readiness-score ${
                planningSummary.isComplete ? "complete" : ""
              }`}
            >
              {planningSummary.completedCount}/{planningSummary.totalCount}
            </span>
          </div>

          <div className="planning-list">
            <PlanningItem
              complete={planningSummary.detailsComplete}
              title={messages.rehearsal.planning.detailsTitle}
              description={
                planningSummary.detailsComplete
                  ? messages.rehearsal.planning.detailsComplete
                  : messages.rehearsal.planning.detailsIncomplete
              }
            />
            <PlanningItem
              complete={planningSummary.templateDraftAvailable}
              title={messages.rehearsal.planning.templateTitle}
              description={
                planningSummary.templateDraftAvailable
                  ? messages.rehearsal.planning.templateComplete(
                      templateDraft?.name ?? "",
                    )
                  : messages.rehearsal.planning.templateIncomplete
              }
            />
            <PlanningItem
              complete={planningSummary.contactSnapshotAvailable}
              title={messages.rehearsal.planning.contactsTitle}
              description={
                planningSummary.contactSnapshotAvailable
                  ? messages.rehearsal.planning.contactsComplete(
                      contactImportDraft?.quality.totalRows ?? 0,
                    )
                  : messages.rehearsal.planning.contactsIncomplete
              }
            />
            <PlanningItem
              complete={planningSummary.variableMappingComplete}
              title={messages.rehearsal.planning.mappingTitle}
              description={buildVariablePlanningDescription(
                templateDraft !== null,
                contactImportDraft !== null,
                templateVariables.length,
                missingVariableMappings,
                hasDynamicUrl,
                dynamicUrlColumnIndex === null,
                messages,
              )}
            />
            <PlanningItem
              complete={planningSummary.draftSaved}
              title={messages.rehearsal.planning.snapshotTitle}
              description={
                planningSummary.draftSaved
                  ? messages.rehearsal.planning.snapshotComplete
                  : messages.rehearsal.planning.snapshotIncomplete
              }
            />
          </div>

          <div
            className={`inline-notice ${
              planningSummary.isComplete ? "success" : "warning"
            }`}
            role="status"
          >
            <span aria-hidden="true">
              {planningSummary.isComplete ? "✓" : "i"}
            </span>
            <p>
              {planningSummary.isComplete
                ? messages.rehearsal.planning.complete
                : messages.rehearsal.planning.incomplete}
            </p>
          </div>
        </section>

        <div className="readiness-divider" />

        <div className="card-header">
          <div>
            <span className="card-kicker">
              {messages.rehearsal.readiness.kicker}
            </span>
            <h2>{messages.rehearsal.readiness.title}</h2>
          </div>
          <span className="readiness-score">0/4</span>
        </div>

        <div className="readiness-list">
          <ReadinessItem
            title={messages.rehearsal.readiness.phoneTitle}
            description={messages.rehearsal.readiness.phoneDescription}
          />
          <ReadinessItem
            title={messages.rehearsal.readiness.templateTitle}
            description={
              templateDraft
                ? messages.rehearsal.readiness.templateDraftPending(
                    templateDraft.name,
                  )
                : messages.rehearsal.readiness.templateMissing
            }
          />
          <ReadinessItem
            title={messages.rehearsal.readiness.audienceTitle}
            description={
              contactImportDraft
                ? messages.rehearsal.readiness.audienceSnapshot(
                    contactImportDraft.quality.rowsWithPhone,
                    contactImportDraft.quality.rowsWithoutPhone,
                    contactImportDraft.quality.exactDuplicateRows,
                  )
                : messages.rehearsal.readiness.audienceMissing
            }
          />
          <ReadinessItem
            title={messages.rehearsal.readiness.testTitle}
            description={messages.rehearsal.readiness.testDescription}
          />
        </div>

        {readinessChecked ? (
          <div className="inline-notice danger" role="status">
            <span aria-hidden="true">!</span>
            <p>{messages.rehearsal.readiness.blockedNotice}</p>
          </div>
        ) : (
          <div className="campaign-cost-state">
            <span>{messages.rehearsal.readiness.costLabel}</span>
            <strong>{messages.rehearsal.readiness.costUnavailable}</strong>
            <small>{messages.rehearsal.readiness.costDescription}</small>
          </div>
        )}

        <button type="button" className="primary-button" disabled>
          {messages.rehearsal.readiness.sendBlocked}
        </button>
      </aside>
    </div>
  );
}

function buildVariablePlanningDescription(
  hasTemplateDraft: boolean,
  hasContactSnapshot: boolean,
  variableCount: number,
  missingMappingCount: number,
  hasDynamicUrl: boolean,
  dynamicUrlMappingMissing: boolean,
  messages: ReturnType<typeof readCampaignMessages>,
) {
  if (!hasTemplateDraft) {
    return messages.rehearsal.planning.variable.templateRequired;
  }

  if (variableCount === 0 && !hasDynamicUrl) {
    return messages.rehearsal.planning.variable.notRequired;
  }

  if (!hasContactSnapshot) {
    return messages.rehearsal.planning.variable.contactsRequired;
  }

  const missingParts = [
    missingMappingCount > 0
      ? messages.rehearsal.planning.variable.missingBody(
          missingMappingCount,
        )
      : null,
    hasDynamicUrl && dynamicUrlMappingMissing
      ? messages.rehearsal.planning.variable.dynamicUrl
      : null,
  ].filter(Boolean);

  if (missingParts.length > 0) {
    return messages.rehearsal.planning.variable.missing(
      missingParts.join(messages.rehearsal.planning.variable.and),
    );
  }

  if (hasDynamicUrl) {
    return variableCount > 0
      ? messages.rehearsal.planning.variable.allWithUrl(variableCount)
      : messages.rehearsal.planning.variable.urlOnly;
  }

  return messages.rehearsal.planning.variable.allBody(variableCount);
}

function describeAudienceIssue(
  issue: AudienceRowIssue,
  messages: ReturnType<typeof readCampaignMessages>,
) {
  const issueParts = [
    issue.missingBodyVariableNumbers.length > 0
      ? messages.rehearsal.audit.bodyVariables(
          issue.missingBodyVariableNumbers
            .map((variableNumber) => `{{${variableNumber}}}`)
            .join(", "),
        )
      : null,
    issue.missingDynamicUrlValue
      ? messages.rehearsal.audit.dynamicUrl
      : null,
  ].filter(Boolean);

  return issueParts.join(" · ");
}

function buildContactPreviewLabel(
  row: string[],
  rowIndex: number,
  mapping: ContactColumnMapping,
  fallbackRow: (rowNumber: number) => string,
) {
  const name = [
    readContactValue(row, mapping, "firstName"),
    readContactValue(row, mapping, "lastName"),
  ]
    .filter(Boolean)
    .join(" ");
  const phoneNumber = readContactValue(row, mapping, "phoneNumber");

  return (
    [name, phoneNumber].filter(Boolean).join(" · ") ||
    fallbackRow(rowIndex + 1)
  );
}

function readContactValue(
  row: string[],
  mapping: ContactColumnMapping,
  field: ContactField,
) {
  const columnIndex = mapping[field];
  return columnIndex === null ? "" : (row[columnIndex] ?? "").trim();
}

function PlanningItem({
  complete,
  title,
  description,
}: {
  complete: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className={`planning-item ${complete ? "complete" : "incomplete"}`}>
      <span aria-hidden="true">{complete ? "✓" : "×"}</span>
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

function ReadinessItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="readiness-item blocked">
      <span aria-hidden="true">×</span>
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}
