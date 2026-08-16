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

export function CampaignDraftComposer() {
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
            <span className="card-kicker">Campaign draft</span>
            <h2>פרטי הקמפיין</h2>
          </div>
          <span className={`status-pill ${draftSaved ? "success" : "warning"}`}>
            {draftSaved ? "טיוטה מקומית נשמרה" : "טיוטה לא נשמרה"}
          </span>
        </div>

        <form className="campaign-form" onSubmit={saveDraft}>
          <label>
            <span>שם הקמפיין</span>
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
              <span>תבנית לקמפיין</span>
              <select disabled>
                <option>
                  {templateDraft?.name ?? "אין תבניות מאושרות"}
                </option>
              </select>
              <small>
                {templateDraft
                  ? "טיוטה מקומית מחוברת לצורכי תכנון בלבד; היא אינה מאושרת."
                  : "אין טיוטת Template מקומית ונדרש גם סנכרון מ־WABA."}
              </small>
            </label>

            <label>
              <span>קהל יעד</span>
              <select disabled>
                <option>
                  {contactImportDraft
                    ? `${contactImportDraft.rows.length} שורות בקובץ המקומי`
                    : "אין קהל כשיר לשליחה"}
                </option>
              </select>
              <small>
                {contactImportDraft
                  ? `${contactImportDraft.quality.rowsWithPhone} מתוך ${contactImportDraft.quality.totalRows} שורות כוללות ערך טלפון Raw. Consent ו־Unsubscribe לא אומתו.`
                  : "נדרש קהל שעבר בדיקת Consent ו־Unsubscribe."}
              </small>
            </label>
          </div>

          {templateDraft ? (
            <section className="campaign-template-rehearsal">
              <div className="template-rehearsal-header">
                <div>
                  <span className="card-kicker">Template rehearsal</span>
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
                <p>
                  זהו Rehearsal מקומי. הטיוטה אינה תבנית מאושרת ולא ניתן
                  להשתמש בה לשליחה.
                </p>
              </div>
            </section>
          ) : null}

          {templateDraft && contactImportDraft ? (
            <section className="campaign-personalization">
              <div className="card-header">
                <div>
                  <span className="card-kicker">Contact preview</span>
                  <h3>מיפוי משתנים לאיש קשר</h3>
                </div>
                <span className="status-pill warning">ללא אישור שליחה</span>
              </div>

              {contactImportDraft.quality.rowsWithoutPhone > 0 ||
              contactImportDraft.quality.exactDuplicateRows > 0 ? (
                <div className="inline-notice warning" role="status">
                  <span aria-hidden="true">!</span>
                  <p>
                    בקובץ יש {contactImportDraft.quality.rowsWithoutPhone} שורות
                    ללא טלפון ו־
                    {contactImportDraft.quality.exactDuplicateRows} כפילויות
                    מדויקות. הנתונים מוצגים בלבד ולא נוקו.
                  </p>
                </div>
              ) : null}

              <label className="contact-preview-select">
                <span>איש קשר לתצוגה מקדימה</span>
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
                      )}
                    </option>
                  ))}
                </select>
              </label>

              {templateVariables.length > 0 ? (
                <fieldset className="campaign-variable-mapping">
                  <legend>התאמת משתני Template לעמודות קובץ המקור</legend>
                  <p>
                    יש לבחור עמודה עבור כל משתנה. המערכת אינה מנחשת התאמות.
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
                          <option value="">בחירת עמודת מקור</option>
                          {contactImportDraft.headers.map(
                            (header, columnIndex) => (
                              <option
                                value={String(columnIndex)}
                                key={`variable-${variableNumber}-column-${columnIndex}`}
                              >
                                {header || "עמודה ללא שם"} · עמודה{" "}
                                {columnIndex + 1}
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
                  <p>
                    גוף התבנית אינו כולל משתנים ולכן אינו דורש מיפוי עמודות.
                  </p>
                </div>
              )}

              {hasDynamicUrl ? (
                <fieldset className="campaign-variable-mapping campaign-url-mapping">
                  <legend>מיפוי Dynamic URL נפרד</legend>
                  <p>
                    משתנה ה־URL אינו משתנה גוף. יש לבחור עבורו עמודת מקור
                    עצמאית.
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
                        <option value="">בחירת עמודת מקור</option>
                        {contactImportDraft.headers.map(
                          (header, columnIndex) => (
                            <option
                              value={String(columnIndex)}
                              key={`url-column-${columnIndex}`}
                            >
                              {header || "עמודה ללא שם"} · עמודה{" "}
                              {columnIndex + 1}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <div className="campaign-url-preview">
                    <span>URL עבור השורה שנבחרה</span>
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
                        ? "טרם נבחרה עמודה למשתנה ה־URL."
                        : dynamicUrlContactValue
                          ? "משתנה ה־URL קיבל ערך מהשורה שנבחרה."
                          : "העמודה מופתה, אך בשורה שנבחרה אין ערך עבור ה־URL."}
                    </p>
                  </div>
                </fieldset>
              ) : null}

              <div className="personalized-message-preview">
                <span>Preview עבור השורה שנבחרה</span>
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
                    נותרו {unmappedVariables.length} משתנים ללא עמודת מקור.
                    הם נשארים מסומנים בתוך ה־Preview.
                  </p>
                </div>
              ) : emptyContactValues.length > 0 ? (
                <div className="inline-notice warning" role="status">
                  <span aria-hidden="true">!</span>
                  <p>
                    בשורה שנבחרה חסרים ערכים עבור {emptyContactValues.length}
                    {" "}משתנים. לא הוזנו ערכי ברירת מחדל.
                  </p>
                </div>
              ) : (
                <div className="inline-notice success" role="status">
                  <span aria-hidden="true">✓</span>
                  <p>
                    כל משתני ה־Preview קיבלו ערך מהשורה שנבחרה. זה עדיין אינו
                    אישור לשליחה.
                  </p>
                </div>
              )}

              <section className="audience-personalization-audit">
                <div className="card-header">
                  <div>
                    <span className="card-kicker">
                      Audience personalization audit
                    </span>
                    <h4>שלמות ערכי ההתאמה בכל הקובץ</h4>
                  </div>
                  <span
                    className={`status-pill ${
                      audienceAudit.mappingComplete ? "success" : "warning"
                    }`}
                  >
                    {audienceAudit.mappingComplete
                      ? "נבדק מקומית"
                      : "ממתין למיפוי"}
                  </span>
                </div>

                {audienceAudit.mappingComplete ? (
                  <>
                    <div className="audience-audit-grid">
                      <div>
                        <span>שורות שנבדקו</span>
                        <strong>{audienceAudit.auditedRows}</strong>
                      </div>
                      <div>
                        <span>ערכים מלאים</span>
                        <strong>{audienceAudit.completeRows}</strong>
                      </div>
                      <div>
                        <span>שורות לא שלמות</span>
                        <strong>{audienceAudit.incompleteRows}</strong>
                      </div>
                      <div>
                        <span>חסרי ערכי גוף</span>
                        <strong>{audienceAudit.rowsMissingBodyValues}</strong>
                      </div>
                      <div>
                        <span>חסרי ערך URL</span>
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
                          ? "לכל השורות יש ערכים עבור ההתאמות שהוגדרו. לא נבדקו טלפון, Consent או כשירות לשליחה."
                          : `${audienceAudit.incompleteRows} שורות חסרות ערכי התאמה. הן לא הוסרו ולא שונו.`}
                      </p>
                    </div>
                    {audienceAudit.issueSamples.length > 0 ? (
                      <div className="audience-issue-samples">
                        <div>
                          <strong>שורות ראשונות לבדיקה</strong>
                          <small>
                            מוצגות {audienceAudit.issueSamples.length} מתוך{" "}
                            {audienceAudit.incompleteRows} שורות לא שלמות.
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
                              aria-label={`בחירת שורה ${issue.sourceRowNumber} לתצוגה מקדימה`}
                            >
                              <span>שורה {issue.sourceRowNumber}</span>
                              <small>{describeAudienceIssue(issue)}</small>
                              <b>בחירה ל־Preview</b>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="inline-notice warning" role="status">
                    <span aria-hidden="true">i</span>
                    <p>
                      יש להשלים את כל מיפויי הגוף וה־Dynamic URL לפני בדיקת
                      השורות. טרם בוצע Audit.
                    </p>
                  </div>
                )}

                <small>
                  כפילויות נשארות שורות נפרדות. זהו Audit של ערכי התאמה בלבד.
                </small>
              </section>
            </section>
          ) : (
            <div className="inline-notice warning campaign-data-boundary">
              <span aria-hidden="true">i</span>
              <p>
                {!templateDraft
                  ? "יש לשמור תחילה טיוטת Template מקומית."
                  : "אין קובץ אנשי קשר שנבדק ונשמר ב־Workspace המקומי."}
              </p>
            </div>
          )}

          <fieldset className="delivery-fieldset">
            <legend>מועד שליחה</legend>
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
                <strong>שליחה מיידית</strong>
                <small>תופעל בעתיד רק לאחר מעבר כל בדיקות המוכנות.</small>
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
                <strong>שליחה מתוזמנת</strong>
                <small>הזמן יומר בצד השרת לפי אזור הזמן של ה־Tenant.</small>
              </span>
            </label>
          </fieldset>

          {deliveryMode === "scheduled" ? (
            <label>
              <span>תאריך ושעה כפי שהוזנו</span>
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
                בדיקת עבר/עתיד והמרת אזור זמן יבוצעו רק לאחר שמירת Timezone
                מאומת ל־Tenant.
              </small>
            </label>
          ) : null}

          <div className="campaign-form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={!canSaveDraft}
            >
              שמירת טיוטה מקומית
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!canSaveDraft}
              onClick={() => setReadinessChecked(true)}
            >
              בדיקת מוכנות
            </button>
          </div>
        </form>
      </section>

      <aside className="card campaign-readiness-card">
        <section className="campaign-planning-section">
          <div className="card-header">
            <div>
              <span className="card-kicker">Planning completeness</span>
              <h2>שלמות הטיוטה המקומית</h2>
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
              title="פרטי קמפיין ומועד"
              description={
                planningSummary.detailsComplete
                  ? "שם הקמפיין ומצב התזמון הוגדרו."
                  : "נדרשים שם קמפיין ומועד כאשר נבחר תזמון."
              }
            />
            <PlanningItem
              complete={planningSummary.templateDraftAvailable}
              title="טיוטת Template מקומית"
              description={
                planningSummary.templateDraftAvailable
                  ? `הטיוטה "${templateDraft?.name}" מחוברת לתכנון.`
                  : "נדרשת טיוטת Template שמורה."
              }
            />
            <PlanningItem
              complete={planningSummary.contactSnapshotAvailable}
              title="Contact Snapshot"
              description={
                planningSummary.contactSnapshotAvailable
                  ? `${contactImportDraft?.quality.totalRows ?? 0} שורות נשמרו לתכנון מקומי.`
                  : "נדרש קובץ CSV או XLSX שמיפויו נבדק ונשמר."
              }
            />
            <PlanningItem
              complete={planningSummary.variableMappingComplete}
              title="מיפוי משתני Template"
              description={buildVariablePlanningDescription(
                templateDraft !== null,
                contactImportDraft !== null,
                templateVariables.length,
                missingVariableMappings,
                hasDynamicUrl,
                dynamicUrlColumnIndex === null,
              )}
            />
            <PlanningItem
              complete={planningSummary.draftSaved}
              title="שמירת Snapshot מקומי"
              description={
                planningSummary.draftSaved
                  ? "הגרסה הנוכחית נשמרה ב־Workspace."
                  : "יש לשמור את הטיוטה לאחר סיום השינויים."
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
                ? "התכנון המקומי הושלם. אין בכך אישור או הרשאה לשליחת הודעות."
                : "אפשר לשמור טיוטה חלקית ולהשלים את הפריטים החסרים בהמשך."}
            </p>
          </div>
        </section>

        <div className="readiness-divider" />

        <div className="card-header">
          <div>
            <span className="card-kicker">Readiness gate</span>
            <h2>תנאים לפני שליחה</h2>
          </div>
          <span className="readiness-score">0/4</span>
        </div>

        <div className="readiness-list">
          <ReadinessItem
            title="מספר WhatsApp מחובר"
            description="אין כרגע WABA ומספר מאומתים."
          />
          <ReadinessItem
            title="תבנית מאושרת"
            description={
              templateDraft
                ? `הטיוטה המקומית "${templateDraft.name}" טרם אושרה על ידי Meta.`
                : "אין טיוטה מקומית ואין תבנית שאושרה על ידי Meta."
            }
          />
          <ReadinessItem
            title="קהל עם הסכמה תקפה"
            description={
              contactImportDraft
                ? `${contactImportDraft.quality.rowsWithPhone} שורות כוללות ערך טלפון Raw; ${contactImportDraft.quality.rowsWithoutPhone} חסרות ערך ו-${contactImportDraft.quality.exactDuplicateRows} כפולות במדויק. Consent ו-Unsubscribe לא אומתו.`
                : "מדיניות Consent ו-Unsubscribe עדיין לא הוגדרה."
            }
          />
          <ReadinessItem
            title="שליחת ניסיון מוצלחת"
            description="תתאפשר רק לאחר חיבור Meta והקמת Queue."
          />
        </div>

        {readinessChecked ? (
          <div className="inline-notice danger" role="status">
            <span aria-hidden="true">!</span>
            <p>
              הקמפיין אינו מוכן לשליחה. הטיוטה לא נשלחה ולא נוסף Job לתור.
            </p>
          </div>
        ) : (
          <div className="campaign-cost-state">
            <span>הערכת עלות</span>
            <strong>לא זמינה</strong>
            <small>נדרש ספק Meta, תמחור עדכני וקהל כשיר.</small>
          </div>
        )}

        <button type="button" className="primary-button" disabled>
          השליחה חסומה
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
) {
  if (!hasTemplateDraft) {
    return "נדרשת טיוטת Template לפני בדיקת המשתנים.";
  }

  if (variableCount === 0 && !hasDynamicUrl) {
    return "התבנית אינה כוללת משתני גוף או Dynamic URL.";
  }

  if (!hasContactSnapshot) {
    return "נדרש Contact Snapshot לצורך מיפוי עמודות.";
  }

  const missingParts = [
    missingMappingCount > 0
      ? `${missingMappingCount} משתני גוף`
      : null,
    hasDynamicUrl && dynamicUrlMappingMissing ? "Dynamic URL" : null,
  ].filter(Boolean);

  if (missingParts.length > 0) {
    return `נותרו ללא מיפוי: ${missingParts.join(" ו־")}.`;
  }

  if (hasDynamicUrl) {
    return variableCount > 0
      ? `${variableCount} משתני גוף ו־Dynamic URL מופו לעמודות מקור.`
      : "ה־Dynamic URL מופה לעמודת מקור נפרדת.";
  }

  return `כל ${variableCount} משתני הגוף מופו לעמודות מקור.`;
}

function describeAudienceIssue(issue: AudienceRowIssue) {
  const issueParts = [
    issue.missingBodyVariableNumbers.length > 0
      ? `משתני גוף: ${issue.missingBodyVariableNumbers
          .map((variableNumber) => `{{${variableNumber}}}`)
          .join(", ")}`
      : null,
    issue.missingDynamicUrlValue ? "Dynamic URL" : null,
  ].filter(Boolean);

  return issueParts.join(" · ");
}

function buildContactPreviewLabel(
  row: string[],
  rowIndex: number,
  mapping: ContactColumnMapping,
) {
  const name = [
    readContactValue(row, mapping, "firstName"),
    readContactValue(row, mapping, "lastName"),
  ]
    .filter(Boolean)
    .join(" ");
  const phoneNumber = readContactValue(row, mapping, "phoneNumber");

  return [name, phoneNumber].filter(Boolean).join(" · ") || `שורה ${rowIndex + 1}`;
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
