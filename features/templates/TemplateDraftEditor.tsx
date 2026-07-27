"use client";

import {
  FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  applyDynamicUrlExample,
  isDynamicHttpsUrlCandidate,
  isHttpsUrlCandidate,
  isPhoneNumberCandidate,
} from "../../shared/validation/templateButtons";
import type {
  TemplateButtonMode,
  TemplateCategory,
  TemplateDraft,
  TemplateLanguage,
  UrlButtonMode,
} from "../../shared/domain/templateDraft";
import type {
  MessageTemplateDirectoryStatus,
  MessageTemplateView,
} from "../../shared/domain/messageTemplateView";
import type {
  SaveMessageTemplateDraftActionResult,
  SubmitMessageTemplateActionResult,
  SyncMessageTemplatesActionResult,
} from "../../server/templates/messageTemplateActionResult";
import {
  saveMessageTemplateDraftAction,
  submitMessageTemplateAction,
  syncMessageTemplatesAction,
} from "../../server/templates/messageTemplateActions";
import {
  applyTemplateVariableValues,
  containsTemplateVariableSyntax,
  inspectTemplateVariables,
} from "../../shared/validation/templateVariables";
import { useWorkspaceDrafts } from "../workspace/WorkspaceDraftProvider";

const categories: Array<{ value: TemplateCategory; label: string }> = [
  { value: "MARKETING", label: "Marketing — שיווק" },
  { value: "UTILITY", label: "Utility — עדכון שירותי" },
  { value: "AUTHENTICATION", label: "Authentication — אימות" },
];

const languages: Array<{ value: TemplateLanguage; label: string }> = [
  { value: "he", label: "עברית — he" },
  { value: "en_US", label: "English (US) — en_US" },
  { value: "ar", label: "العربية — ar" },
];

function toTemplateDraft(
  template: MessageTemplateView,
): TemplateDraft {
  return {
    name: template.name,
    category: template.category,
    language: template.language,
    header: template.header,
    body: template.body,
    footer: template.footer,
    variableExamples: {
      ...template.variableExamples,
    },
    buttonMode: template.buttonMode,
    quickReplies: [...template.quickReplies],
    urlButton: { ...template.urlButton },
    phoneButton: { ...template.phoneButton },
  };
}

export function TemplateDraftEditor({
  authEnabled,
  initialTemplates,
  initialStatus,
  canWrite,
}: {
  authEnabled: boolean;
  initialTemplates: readonly MessageTemplateView[];
  initialStatus: MessageTemplateDirectoryStatus;
  canWrite: boolean;
}) {
  const {
    templateDraft,
    saveTemplateDraft,
    clearTemplateDraft,
  } = useWorkspaceDrafts();
  const initialPersistedDraft = initialTemplates.find(
    (template) => template.status === "draft",
  );
  const startingDraft =
    templateDraft ??
    (initialPersistedDraft
      ? toTemplateDraft(initialPersistedDraft)
      : null);
  const [templates, setTemplates] =
    useState<readonly MessageTemplateView[]>(
      initialTemplates,
    );
  const [activeTemplateKey, setActiveTemplateKey] =
    useState<string | null>(
      templateDraft
        ? null
        : initialPersistedDraft?.templateKey ?? null,
    );
  const [name, setName] = useState(startingDraft?.name ?? "");
  const [category, setCategory] = useState<TemplateCategory>(
    startingDraft?.category ?? "MARKETING",
  );
  const [language, setLanguage] = useState<TemplateLanguage>(
    startingDraft?.language ?? "he",
  );
  const [header, setHeader] = useState(
    startingDraft?.header ?? "",
  );
  const [body, setBody] = useState(startingDraft?.body ?? "");
  const [footer, setFooter] = useState(
    startingDraft?.footer ?? "",
  );
  const [buttonMode, setButtonMode] =
    useState<TemplateButtonMode>(
      startingDraft?.buttonMode ?? "none",
    );
  const [quickReplies, setQuickReplies] = useState<string[]>(
    startingDraft ? [...startingDraft.quickReplies] : [],
  );
  const [urlButtonEnabled, setUrlButtonEnabled] = useState(
    startingDraft?.urlButton.enabled ?? false,
  );
  const [urlButtonMode, setUrlButtonMode] =
    useState<UrlButtonMode>(
      startingDraft?.urlButton.mode ?? "static",
    );
  const [urlButtonText, setUrlButtonText] = useState(
    startingDraft?.urlButton.text ?? "",
  );
  const [urlButtonValue, setUrlButtonValue] = useState(
    startingDraft?.urlButton.value ?? "",
  );
  const [urlButtonExample, setUrlButtonExample] = useState(
    startingDraft?.urlButton.example ?? "",
  );
  const [phoneButtonEnabled, setPhoneButtonEnabled] = useState(
    startingDraft?.phoneButton.enabled ?? false,
  );
  const [phoneButtonText, setPhoneButtonText] = useState(
    startingDraft?.phoneButton.text ?? "",
  );
  const [phoneButtonValue, setPhoneButtonValue] = useState(
    startingDraft?.phoneButton.value ?? "",
  );
  const [variableValues, setVariableValues] = useState<Record<number, string>>(
    startingDraft ? { ...startingDraft.variableExamples } : {},
  );
  const [draftSaved, setDraftSaved] = useState(
    Boolean(startingDraft),
  );
  const [saveResult, setSaveResult] =
    useState<SaveMessageTemplateDraftActionResult | null>(
      null,
    );
  const [submitResult, setSubmitResult] =
    useState<SubmitMessageTemplateActionResult | null>(
      null,
    );
  const [syncResult, setSyncResult] =
    useState<SyncMessageTemplatesActionResult | null>(
      null,
    );
  const [isSaving, startSaving] = useTransition();
  const [isSubmitting, startSubmitting] =
    useTransition();
  const [isSyncing, startSyncing] = useTransition();
  const variableResult = useMemo(
    () => inspectTemplateVariables(body),
    [body],
  );
  const completedVariableCount = variableResult.numbers.filter(
    (variableNumber) => variableValues[variableNumber]?.trim(),
  ).length;
  const headerHasVariableSyntax = containsTemplateVariableSyntax(header);
  const footerHasVariableSyntax = containsTemplateVariableSyntax(footer);
  const quickReplyHasVariableSyntax = quickReplies.some(
    containsTemplateVariableSyntax,
  );
  const allQuickRepliesHaveText = quickReplies.every(
    (quickReply) => quickReply.trim().length > 0,
  );
  const quickReplyConfigurationValid =
    buttonMode !== "quick_reply" ||
    (quickReplies.length > 0 &&
      allQuickRepliesHaveText &&
      !quickReplyHasVariableSyntax);
  const urlButtonTextHasVariableSyntax =
    containsTemplateVariableSyntax(urlButtonText);
  const staticUrlHasVariableSyntax =
    urlButtonMode === "static" &&
    containsTemplateVariableSyntax(urlButtonValue);
  const phoneButtonHasVariableSyntax =
    containsTemplateVariableSyntax(phoneButtonText) ||
    containsTemplateVariableSyntax(phoneButtonValue);
  const urlButtonValid =
    !urlButtonEnabled ||
    (urlButtonText.trim().length > 0 &&
      !urlButtonTextHasVariableSyntax &&
      (urlButtonMode === "static"
        ? isHttpsUrlCandidate(urlButtonValue) && !staticUrlHasVariableSyntax
        : isDynamicHttpsUrlCandidate(urlButtonValue) &&
          urlButtonExample.trim().length > 0 &&
          !containsTemplateVariableSyntax(urlButtonExample)));
  const phoneButtonValid =
    !phoneButtonEnabled ||
    (phoneButtonText.trim().length > 0 &&
      isPhoneNumberCandidate(phoneButtonValue) &&
      !phoneButtonHasVariableSyntax);
  const callToActionConfigurationValid =
    buttonMode !== "call_to_action" ||
    ((urlButtonEnabled || phoneButtonEnabled) &&
      urlButtonValid &&
      phoneButtonValid);
  const allVariablesHaveValues =
    completedVariableCount === variableResult.numbers.length;
  const urlPreviewValue =
    urlButtonMode === "dynamic"
      ? applyDynamicUrlExample(urlButtonValue, urlButtonExample)
      : urlButtonValue.trim();
  const previewBody = useMemo(
    () => applyTemplateVariableValues(body, variableValues),
    [body, variableValues],
  );
  const canSave =
    name.trim().length > 0 &&
    body.trim().length > 0 &&
    category !== "AUTHENTICATION" &&
    !headerHasVariableSyntax &&
    !footerHasVariableSyntax &&
    quickReplyConfigurationValid &&
    callToActionConfigurationValid &&
    variableResult.error === null &&
    allVariablesHaveValues;
  const localRehearsalEnabled =
    !authEnabled ||
    initialStatus === "configuration-required";
  const canPersistDraft =
    localRehearsalEnabled ||
    (initialStatus === "ready" && canWrite);

  const markChanged = () => {
    setDraftSaved(false);
    setSaveResult(null);
    setSubmitResult(null);
  };

  const newTemplate = () => {
    clearTemplateDraft();
    resetEditor();
  };

  const replaceTemplate = (
    template: MessageTemplateView,
  ) => {
    setTemplates((current) => {
      const exists = current.some(
        (item) =>
          item.templateKey === template.templateKey,
      );

      if (!exists) {
        return [template, ...current];
      }

      return current.map((item) =>
        item.templateKey === template.templateKey
          ? template
          : item,
      );
    });
  };

  const loadTemplate = (
    template: MessageTemplateView,
  ) => {
    const draft = toTemplateDraft(template);

    setActiveTemplateKey(template.templateKey);
    setName(draft.name);
    setCategory(draft.category);
    setLanguage(draft.language);
    setHeader(draft.header);
    setBody(draft.body);
    setFooter(draft.footer);
    setVariableValues({ ...draft.variableExamples });
    setButtonMode(draft.buttonMode);
    setQuickReplies([...draft.quickReplies]);
    setUrlButtonEnabled(draft.urlButton.enabled);
    setUrlButtonMode(draft.urlButton.mode);
    setUrlButtonText(draft.urlButton.text);
    setUrlButtonValue(draft.urlButton.value);
    setUrlButtonExample(draft.urlButton.example);
    setPhoneButtonEnabled(draft.phoneButton.enabled);
    setPhoneButtonText(draft.phoneButton.text);
    setPhoneButtonValue(draft.phoneButton.value);
    setDraftSaved(true);
    setSaveResult(null);
    setSubmitResult(null);
  };

  const resetEditor = () => {
    setActiveTemplateKey(null);
    setName("");
    setCategory("MARKETING");
    setLanguage("he");
    setHeader("");
    setBody("");
    setFooter("");
    setVariableValues({});
    setButtonMode("none");
    setQuickReplies([]);
    setUrlButtonEnabled(false);
    setUrlButtonMode("static");
    setUrlButtonText("");
    setUrlButtonValue("");
    setUrlButtonExample("");
    setPhoneButtonEnabled(false);
    setPhoneButtonText("");
    setPhoneButtonValue("");
    setDraftSaved(false);
    setSaveResult(null);
  };

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    const draft: TemplateDraft = {
      name: name.trim(),
      category,
      language,
      header,
      body,
      footer,
      variableExamples: { ...variableValues },
      buttonMode,
      quickReplies: [...quickReplies],
      urlButton: {
        enabled: urlButtonEnabled,
        mode: urlButtonMode,
        text: urlButtonText,
        value: urlButtonValue,
        example: urlButtonExample,
      },
      phoneButton: {
        enabled: phoneButtonEnabled,
        text: phoneButtonText,
        value: phoneButtonValue,
      },
    };

    if (localRehearsalEnabled) {
      saveTemplateDraft(draft);
      setDraftSaved(true);
      setSaveResult({ status: "configuration-required" });
      return;
    }

    if (initialStatus !== "ready") {
      setSaveResult(
        saveFailureForDirectoryStatus(initialStatus),
      );
      return;
    }

    setSaveResult(null);
    startSaving(async () => {
      const result =
        await saveMessageTemplateDraftAction(draft);
      setSaveResult(result);

      if (result.status === "saved") {
        replaceTemplate(result.template);
        setActiveTemplateKey(
          result.template.templateKey,
        );
        saveTemplateDraft(
          toTemplateDraft(result.template),
        );
        setDraftSaved(true);
      }
    });
  };

  const submitTemplate = (templateKey: string) => {
    if (isSubmitting) {
      return;
    }

    setSubmitResult(null);
    startSubmitting(async () => {
      const result =
        await submitMessageTemplateAction(templateKey);
      setSubmitResult(result);

      if (result.status === "submitted") {
        replaceTemplate(result.template);
        clearTemplateDraft();
        resetEditor();
        setSubmitResult(result);
      } else if (
        result.status === "submission-uncertain"
      ) {
        setTemplates((current) =>
          current.map((template) =>
            template.templateKey === templateKey
              ? {
                  ...template,
                  status: "submitting",
                }
              : template,
          ),
        );
      }
    });
  };

  const syncTemplates = () => {
    if (isSyncing) {
      return;
    }

    setSyncResult(null);
    startSyncing(async () => {
      const result = await syncMessageTemplatesAction();
      setSyncResult(result);

      if (result.status === "synced") {
        setTemplates(result.templates);
      }
    });
  };

  return (
    <div className="template-workspace">
      <MessageTemplateDirectory
        activeTemplateKey={activeTemplateKey}
        authEnabled={authEnabled}
        canWrite={canWrite}
        initialStatus={initialStatus}
        isSubmitting={isSubmitting}
        isSyncing={isSyncing}
        onLoad={loadTemplate}
        onNew={newTemplate}
        onSubmit={submitTemplate}
        onSync={syncTemplates}
        submitResult={submitResult}
        syncResult={syncResult}
        templates={templates}
      />

      <div className="template-editor-layout">
        <section className="card template-form-card">
        <div className="card-header">
          <div>
            <span className="card-kicker">
              {initialStatus === "ready"
                ? "Persistent draft"
                : localRehearsalEnabled
                  ? "Local rehearsal"
                  : "Persistence unavailable"}
            </span>
            <h2>הגדרת התבנית</h2>
          </div>
          <span className={`status-pill ${draftSaved ? "success" : "warning"}`}>
            {isSaving
              ? "שומר בשרת"
              : draftSaved && initialStatus === "ready"
                  ? "נשמרה בשרת"
                  : draftSaved && localRehearsalEnabled
                    ? "נשמרה מקומית"
                    : draftSaved
                      ? "לא נשמרה בשרת"
                      : "שינויים לא נשמרו"}
          </span>
        </div>

        <form className="template-form" onSubmit={saveDraft}>
          <label>
            <span>שם תבנית</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                markChanged();
              }}
              required
            />
          </label>

          <div className="template-form-row">
            <label>
              <span>קטגוריה</span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as TemplateCategory);
                  markChanged();
                }}
              >
                {categories.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>שפה</span>
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value as TemplateLanguage);
                  markChanged();
                }}
              >
                {languages.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {category === "AUTHENTICATION" ? (
            <div className="inline-notice warning" role="status">
              <span aria-hidden="true">i</span>
              <p>
                Authentication דורש עורך ייעודי לרכיבי OTP ולכפתורי אימות.
                העורך הכללי הנוכחי אינו שומר טיוטה בקטגוריה זו.
              </p>
            </div>
          ) : null}

          <label>
            <span>כותרת טקסט — רשות וללא משתנים בשלב זה</span>
            <input
              value={header}
              onChange={(event) => {
                setHeader(event.target.value);
                markChanged();
              }}
            />
          </label>

          {headerHasVariableSyntax ? (
            <div className="inline-notice danger" role="alert">
              <span aria-hidden="true">!</span>
              <p>
                משתנים בכותרת דורשים מסלול Examples נפרד. בשלב זה יש להסיר
                אותם מהכותרת או להשתמש בהם בגוף ההודעה.
              </p>
            </div>
          ) : null}

          <label>
            <span>גוף ההודעה</span>
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                markChanged();
              }}
              rows={7}
              required
              aria-describedby="template-variable-guidance"
            />
          </label>

          <div
            id="template-variable-guidance"
            className={`variable-guidance ${variableResult.error ? "invalid" : ""}`}
          >
            <span aria-hidden="true">
              {variableResult.error ? "!" : variableResult.numbers.length}
            </span>
            <p>
              {variableResult.error ??
                (variableResult.numbers.length > 0
                  ? `${variableResult.numbers.length} משתנים תקינים נמצאו. יש להזין עבורם ערכי בדיקה.`
                  : "אפשר להוסיף משתנים סדרתיים: {{1}}, {{2}} וכן הלאה.")}
            </p>
          </div>

          {variableResult.error === null &&
          variableResult.numbers.length > 0 ? (
            <fieldset className="template-variable-examples">
              <legend>ערכי בדיקה למשתנים</legend>
              <p>
                הערכים נשמרים כחלק מהטיוטה ונשלחים ל־Meta כדוגמאות בעת
                הגשה. הם אינם נשלחים לנמענים.
              </p>
              <div>
                {variableResult.numbers.map((variableNumber) => (
                  <label key={variableNumber}>
                    <span>{`{{${variableNumber}}}`}</span>
                    <input
                      value={variableValues[variableNumber] ?? ""}
                      onChange={(event) => {
                        setVariableValues((current) => ({
                          ...current,
                          [variableNumber]: event.target.value,
                        }));
                        markChanged();
                      }}
                      required
                    />
                  </label>
                ))}
              </div>
              <div
                className={`variable-completion ${allVariablesHaveValues ? "complete" : ""}`}
                role="status"
              >
                <span>
                  {completedVariableCount}/{variableResult.numbers.length}
                </span>
                <p>
                  {allVariablesHaveValues
                    ? "כל ערכי הבדיקה הוזנו."
                    : "הטיוטה לא תהיה מוכנה עד שכל משתנה יקבל ערך בדיקה."}
                </p>
              </div>
            </fieldset>
          ) : null}

          <label>
            <span>Footer — רשות וללא משתנים</span>
            <input
              value={footer}
              onChange={(event) => {
                setFooter(event.target.value);
                markChanged();
              }}
            />
          </label>

          {footerHasVariableSyntax ? (
            <div className="inline-notice danger" role="alert">
              <span aria-hidden="true">!</span>
              <p>Footer עם משתנים אינו נתמך בעורך המקומי.</p>
            </div>
          ) : null}

          <fieldset className="template-button-editor">
            <legend>מסלול כפתורים — רשות</legend>
            <div className="button-mode-selector">
              {[
                { value: "none", label: "ללא כפתורים" },
                { value: "quick_reply", label: "Quick Reply" },
                { value: "call_to_action", label: "Call to Action" },
              ].map((mode) => (
                <label
                  className={buttonMode === mode.value ? "selected" : ""}
                  key={mode.value}
                >
                  <input
                    type="radio"
                    name="templateButtonMode"
                    value={mode.value}
                    checked={buttonMode === mode.value}
                    onChange={() => {
                      setButtonMode(mode.value as TemplateButtonMode);
                      markChanged();
                    }}
                  />
                  <span>{mode.label}</span>
                </label>
              ))}
            </div>
            <p>
              כדי לשמור על טיוטה חד־משמעית, העורך המקומי משתמש במסלול כפתורים
              אחד בכל פעם.
            </p>
          </fieldset>

          {buttonMode === "quick_reply" ? (
            <>
              <fieldset className="quick-reply-editor">
                <legend>כפתורי Quick Reply</legend>
                <div className="quick-reply-heading">
                  <p>העורך המקומי תומך כרגע בעד שני כפתורים.</p>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={quickReplies.length >= 2}
                    onClick={() => {
                      setQuickReplies((current) => [...current, ""]);
                      markChanged();
                    }}
                  >
                    הוספת כפתור
                  </button>
                </div>

                {quickReplies.length > 0 ? (
                  <div className="quick-reply-fields">
                    {quickReplies.map((quickReply, index) => (
                      <div key={`quick-reply-${index}`}>
                        <label>
                          <span>טקסט כפתור {index + 1}</span>
                          <input
                            value={quickReply}
                            onChange={(event) => {
                              setQuickReplies((current) =>
                                current.map((value, currentIndex) =>
                                  currentIndex === index
                                    ? event.target.value
                                    : value,
                                ),
                              );
                              markChanged();
                            }}
                            required
                          />
                        </label>
                        <button
                          type="button"
                          className="remove-quick-reply"
                          aria-label={`הסרת כפתור ${index + 1}`}
                          onClick={() => {
                            setQuickReplies((current) =>
                              current.filter(
                                (_, currentIndex) => currentIndex !== index,
                              ),
                            );
                            markChanged();
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="quick-reply-empty">
                    יש להוסיף לפחות כפתור אחד או לבחור מסלול ללא כפתורים.
                  </p>
                )}
              </fieldset>

              {quickReplyHasVariableSyntax ? (
                <div className="inline-notice danger" role="alert">
                  <span aria-hidden="true">!</span>
                  <p>טקסט Quick Reply אינו תומך במשתנים בעורך המקומי.</p>
                </div>
              ) : null}
            </>
          ) : null}

          {buttonMode === "call_to_action" ? (
            <fieldset className="cta-editor">
              <legend>כפתורי Call to Action</legend>
              <p>
                ניתן להגדיר כתובת HTTPS סטטית, מספר טלפון, או את שניהם.
              </p>

              <CtaToggle
                checked={urlButtonEnabled}
                label="פתיחת כתובת אתר"
                onChange={(checked) => {
                  setUrlButtonEnabled(checked);
                  markChanged();
                }}
              />
              {urlButtonEnabled ? (
                <div className="cta-fields">
                  <fieldset className="url-mode-selector">
                    <legend>סוג כתובת</legend>
                    <label
                      className={urlButtonMode === "static" ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="urlButtonMode"
                        value="static"
                        checked={urlButtonMode === "static"}
                        onChange={() => {
                          setUrlButtonMode("static");
                          markChanged();
                        }}
                      />
                      <span>URL סטטי</span>
                    </label>
                    <label
                      className={urlButtonMode === "dynamic" ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="urlButtonMode"
                        value="dynamic"
                        checked={urlButtonMode === "dynamic"}
                        onChange={() => {
                          setUrlButtonMode("dynamic");
                          markChanged();
                        }}
                      />
                      <span>URL דינמי</span>
                    </label>
                  </fieldset>
                  <label>
                    <span>טקסט כפתור URL</span>
                    <input
                      value={urlButtonText}
                      onChange={(event) => {
                        setUrlButtonText(event.target.value);
                        markChanged();
                      }}
                      required
                    />
                  </label>
                  <label>
                    <span>
                      {urlButtonMode === "static"
                        ? "כתובת HTTPS סטטית"
                        : "כתובת HTTPS עם משתנה {{1}}"}
                    </span>
                    <input
                      type={urlButtonMode === "static" ? "url" : "text"}
                      value={urlButtonValue}
                      onChange={(event) => {
                        setUrlButtonValue(event.target.value);
                        markChanged();
                      }}
                      inputMode="url"
                      required
                    />
                  </label>
                  {urlButtonMode === "dynamic" ? (
                    <label>
                      <span>Example עבור משתנה ה־URL</span>
                      <input
                        value={urlButtonExample}
                        onChange={(event) => {
                          setUrlButtonExample(event.target.value);
                          markChanged();
                        }}
                        required
                      />
                    </label>
                  ) : null}
                  {!urlButtonValid ? (
                    <p className="field-error">
                      {urlButtonMode === "static"
                        ? "נדרשים טקסט וכתובת HTTPS תקינה ללא משתנים."
                        : "נדרשים טקסט, כתובת HTTPS עם משתנה {{1}} יחיד ו-Example ללא משתנים."}
                    </p>
                  ) : null}
                  {urlButtonMode === "dynamic" && urlButtonValid ? (
                    <div className="dynamic-url-preview" role="status">
                      <span>URL לאחר הצבת Example</span>
                      <code dir="ltr">{urlPreviewValue}</code>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <CtaToggle
                checked={phoneButtonEnabled}
                label="התקשרות למספר טלפון"
                onChange={(checked) => {
                  setPhoneButtonEnabled(checked);
                  markChanged();
                }}
              />
              {phoneButtonEnabled ? (
                <div className="cta-fields">
                  <label>
                    <span>טקסט כפתור טלפון</span>
                    <input
                      value={phoneButtonText}
                      onChange={(event) => {
                        setPhoneButtonText(event.target.value);
                        markChanged();
                      }}
                      required
                    />
                  </label>
                  <label>
                    <span>מספר טלפון</span>
                    <input
                      type="tel"
                      value={phoneButtonValue}
                      onChange={(event) => {
                        setPhoneButtonValue(event.target.value);
                        markChanged();
                      }}
                      inputMode="tel"
                      required
                    />
                  </label>
                  {!phoneButtonValid ? (
                    <p className="field-error">
                      נדרשים טקסט ומספר הכולל ספרות בלבד, עם `+` אופציונלי
                      בתחילתו.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!urlButtonEnabled && !phoneButtonEnabled ? (
                <p className="field-error">
                  יש להפעיל לפחות כפתור CTA אחד.
                </p>
              ) : null}
            </fieldset>
          ) : null}

          <button
            type="submit"
            className="primary-button"
            disabled={
              !canSave ||
              isSaving ||
              !canPersistDraft
            }
          >
            {!canWrite && initialStatus === "ready"
              ? "אין הרשאת שמירה"
              : isSaving
              ? "שומר..."
              : initialStatus === "ready"
                ? "שמירת טיוטה בשרת"
                : localRehearsalEnabled
                  ? "שמירת Rehearsal מקומית"
                  : "השמירה אינה זמינה"}
          </button>
          {saveResult ? (
            <ActionNotice
              message={describeSaveResult(
                saveResult,
                initialStatus,
              )}
              tone={
                saveResult.status === "saved" ||
                (draftSaved && localRehearsalEnabled)
                  ? "success"
                  : "danger"
              }
            />
          ) : null}
        </form>
      </section>

      <aside className="card template-preview-card">
        <div className="card-header">
          <div>
            <span className="card-kicker">Preview</span>
            <h2>תצוגה מקדימה</h2>
          </div>
          <div className="template-preview-meta">
            <span className="template-language-code">{language}</span>
            <span className="template-language-code">{category}</span>
          </div>
        </div>

        <div className="phone-preview" dir={language === "en_US" ? "ltr" : "rtl"}>
          <div className="phone-preview-top">
            <span aria-hidden="true">‹</span>
            <strong>WhatsApp</strong>
            <i aria-hidden="true" />
          </div>
          <div className="message-preview">
            {header.trim() ? <strong>{header}</strong> : null}
            <p>{previewBody || "—"}</p>
            {footer.trim() ? (
              <small className="message-footer-preview">{footer}</small>
            ) : null}
            {buttonMode === "quick_reply" &&
            quickReplies.some((quickReply) => quickReply.trim()) ? (
              <div className="quick-reply-preview">
                {quickReplies.map((quickReply, index) =>
                  quickReply.trim() ? (
                    <span key={`quick-reply-preview-${index}`}>
                      {quickReply}
                    </span>
                  ) : null,
                )}
              </div>
            ) : null}
            {buttonMode === "call_to_action" &&
            ((urlButtonEnabled && urlButtonText.trim()) ||
              (phoneButtonEnabled && phoneButtonText.trim())) ? (
              <div className="quick-reply-preview cta-preview">
                {urlButtonEnabled && urlButtonText.trim() ? (
                  <span title={urlButtonValid ? urlPreviewValue : undefined}>
                    ↗ {urlButtonText}
                  </span>
                ) : null}
                {phoneButtonEnabled && phoneButtonText.trim() ? (
                  <span>☎ {phoneButtonText}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={`inline-notice ${
            initialStatus === "ready"
              ? "success"
              : "warning"
          }`}
        >
          <span aria-hidden="true">i</span>
          <p>
            {initialStatus === "ready"
              ? "שמירת הטיוטה מתבצעת ב־D1. לאחר השמירה ניתן לשלוח אותה לאישור מתוך הרשימה שמעל."
              : localRehearsalEnabled
                ? "ללא Clerk ו־D1 הטיוטה נשמרת בזיכרון המסך בלבד ואינה נשלחת ל־Meta."
                : "השמירה אינה זמינה עד לפתרון מצב החשבון או השרת שמופיע מעל."}
          </p>
        </div>
      </aside>
      </div>
    </div>
  );
}

const templateStatusPresentation: Record<
  MessageTemplateView["status"],
  {
    label: string;
    tone: "success" | "warning" | "critical";
    detail: string;
  }
> = {
  draft: {
    label: "טיוטה",
    tone: "warning",
    detail: "ניתנת לעריכה ולשליחה לאישור.",
  },
  submitting: {
    label: "תוצאת הגשה בבדיקה",
    tone: "warning",
    detail:
      "לא תתבצע שליחה חוזרת עד שסנכרון Meta יקבע את התוצאה.",
  },
  pending_review: {
    label: "ממתינה לאישור",
    tone: "warning",
    detail: "Meta קיבלה את התבנית והיא ממתינה לבדיקה.",
  },
  approved: {
    label: "אושרה",
    tone: "success",
    detail: "התבנית זמינה לשימוש לאחר סנכרון הקמפיינים.",
  },
  rejected: {
    label: "נדחתה",
    tone: "critical",
    detail: "התבנית נעולה; סטטוס הדחייה הגיע מ־Meta.",
  },
  disabled: {
    label: "הושבתה",
    tone: "critical",
    detail: "Meta סימנה את התבנית כלא פעילה.",
  },
  deleted: {
    label: "נמחקה",
    tone: "critical",
    detail: "Meta סימנה את התבנית כמחוקה.",
  },
};

function MessageTemplateDirectory({
  activeTemplateKey,
  authEnabled,
  canWrite,
  initialStatus,
  isSubmitting,
  isSyncing,
  onLoad,
  onNew,
  onSubmit,
  onSync,
  submitResult,
  syncResult,
  templates,
}: {
  activeTemplateKey: string | null;
  authEnabled: boolean;
  canWrite: boolean;
  initialStatus: MessageTemplateDirectoryStatus;
  isSubmitting: boolean;
  isSyncing: boolean;
  onLoad: (template: MessageTemplateView) => void;
  onNew: () => void;
  onSubmit: (templateKey: string) => void;
  onSync: () => void;
  submitResult: SubmitMessageTemplateActionResult | null;
  syncResult: SyncMessageTemplatesActionResult | null;
  templates: readonly MessageTemplateView[];
}) {
  const directoryFailure =
    describeDirectoryFailure(
      authEnabled,
      initialStatus,
    );
  const localRehearsalEnabled =
    !authEnabled ||
    initialStatus === "configuration-required";

  return (
    <section className="card template-directory-card">
      <div className="card-header">
        <div>
          <span className="card-kicker">
            Persistent templates
          </span>
          <h2>תבניות שמורות</h2>
        </div>
        <div className="template-directory-actions">
          <span
            className={`status-pill ${
              initialStatus === "ready"
                ? "success"
                : "warning"
            }`}
          >
            {initialStatus === "ready"
              ? `${templates.length} מהשרת`
              : localRehearsalEnabled
                ? "מצב מקומי"
                : "לא זמין"}
          </span>
          <button
            type="button"
            className="secondary-button"
            onClick={onSync}
            disabled={
              initialStatus !== "ready" ||
              !canWrite ||
              isSyncing
            }
          >
            {isSyncing
              ? "מסנכרן..."
              : "סנכרון מול Meta"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onNew}
            disabled={
              !localRehearsalEnabled &&
              (initialStatus !== "ready" || !canWrite)
            }
          >
            טיוטה חדשה
          </button>
        </div>
      </div>

      {directoryFailure ? (
        <div className="inline-notice warning">
          <span aria-hidden="true">i</span>
          <p>{directoryFailure}</p>
        </div>
      ) : (
        <>
          {!canWrite ? (
            <div className="inline-notice warning">
              <span aria-hidden="true">i</span>
              <p>
                התפקיד הנוכחי מורשה לצפות בתבניות אך
                אינו מורשה לשמור או לשלוח אותן.
              </p>
            </div>
          ) : null}
          {templates.length === 0 ? (
        <div className="template-directory-empty">
          <strong>אין תבניות שמורות</strong>
          <p>
            הטיוטה הראשונה תופיע כאן לאחר שמירה
            מוצלחת ב־D1.
          </p>
        </div>
          ) : (
        <div className="template-record-list">
          {templates.map((template) => {
            const presentation =
              templateStatusPresentation[template.status];

            return (
              <article
                className={`template-record ${
                  activeTemplateKey ===
                  template.templateKey
                    ? "active"
                    : ""
                }`}
                key={template.templateKey}
              >
                <div className="template-record-copy">
                  <div>
                    <strong>{template.name}</strong>
                    <span
                      className={`status-pill ${presentation.tone}`}
                    >
                      {presentation.label}
                    </span>
                  </div>
                  <p>{presentation.detail}</p>
                  <small>
                    {template.language} ·{" "}
                    {template.category} · עודכן{" "}
                    {formatStoredTimestamp(
                      template.updatedAt,
                    )}
                  </small>
                </div>
                <div className="template-record-actions">
                  {template.status === "draft" &&
                  canWrite ? (
                    <>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => onLoad(template)}
                      >
                        טעינה לעריכה
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={isSubmitting}
                        onClick={() =>
                          onSubmit(template.templateKey)
                        }
                      >
                        {isSubmitting
                          ? "שולח..."
                          : "שליחה לאישור"}
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
          )}
        </>
      )}

      {submitResult ? (
        <ActionNotice
          message={describeSubmitResult(submitResult)}
          tone={
            submitResult.status === "submitted"
              ? "success"
              : submitResult.status ===
                  "submission-uncertain"
                ? "warning"
                : "danger"
          }
        />
      ) : null}

      {syncResult ? (
        <ActionNotice
          message={describeSyncResult(syncResult)}
          tone={
            syncResult.status === "synced"
              ? "success"
              : syncResult.status ===
                    "identity-conflict" ||
                  syncResult.status === "sync-failed" ||
                  syncResult.status === "server-error"
                ? "danger"
                : "warning"
          }
        />
      ) : null}
    </section>
  );
}

function describeDirectoryFailure(
  authEnabled: boolean,
  status: MessageTemplateDirectoryStatus,
): string | null {
  if (!authEnabled || status === "configuration-required") {
    return "Clerk ו־D1 אינם מוגדרים. אפשר להכין Rehearsal מקומית, אך היא תימחק ברענון ולא תישלח ל־Meta.";
  }

  if (status === "onboarding-required") {
    return "יש להשלים תחילה את פרטי העסק כדי ליצור Tenant פעיל.";
  }

  if (status === "tenant-selection-required") {
    return "המשתמש משויך למספר Tenants ונדרשת בחירה מפורשת.";
  }

  if (status === "permission-denied") {
    return "התפקיד הנוכחי אינו מורשה לקרוא תבניות.";
  }

  if (status === "server-error") {
    return "לא ניתן היה לטעון את התבניות מהשרת. לא הוצג מידע חלופי.";
  }

  return null;
}

function describeSaveResult(
  result: SaveMessageTemplateDraftActionResult,
  directoryStatus: MessageTemplateDirectoryStatus,
): string {
  if (result.status === "saved") {
    return "הטיוטה נשמרה ב־D1 והיא זמינה לאחר רענון.";
  }

  if (
    directoryStatus === "configuration-required" &&
    (result.status === "configuration-required" ||
      result.status === "server-error")
  ) {
    return "ה־Rehearsal נשמרה בזיכרון המסך בלבד ולא בשרת.";
  }

  if (result.status === "validation-error") {
    return "השרת דחה את הטיוטה מפני שאחד או יותר מהשדות אינם תקינים.";
  }

  if (result.status === "not-editable") {
    return "תבנית שכבר נשלחה ל־Meta נעולה ואינה ניתנת לדריסה.";
  }

  if (result.status === "unauthenticated") {
    return "נדרשת התחברות מחדש לפני שמירת התבנית.";
  }

  if (result.status === "onboarding-required") {
    return "יש להשלים תחילה את פרטי העסק.";
  }

  if (result.status === "tenant-selection-required") {
    return "נדרשת בחירה מפורשת של Tenant.";
  }

  if (result.status === "permission-denied") {
    return "התפקיד הנוכחי אינו מורשה לשמור תבניות.";
  }

  return "שמירת הטיוטה בשרת נכשלה. היא לא סומנה כשמורה.";
}

function saveFailureForDirectoryStatus(
  status: MessageTemplateDirectoryStatus,
): SaveMessageTemplateDraftActionResult {
  if (status === "onboarding-required") {
    return { status: "onboarding-required" };
  }

  if (status === "tenant-selection-required") {
    return { status: "tenant-selection-required" };
  }

  if (status === "permission-denied") {
    return { status: "permission-denied" };
  }

  return { status: "server-error" };
}

function describeSubmitResult(
  result: SubmitMessageTemplateActionResult,
): string {
  const messages: Record<
    SubmitMessageTemplateActionResult["status"],
    string
  > = {
    submitted:
      "Meta קיבלה את התבנית והיא ממתינה לאישור.",
    "invalid-input": "מזהה התבנית אינו תקין.",
    "not-found": "התבנית לא נמצאה ב־Tenant הנוכחי.",
    "not-editable":
      "רק טיוטה שטרם נשלחה ניתנת להגשה.",
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
    "configuration-required":
      "Clerk ו־D1 אינם מוגדרים.",
    unauthenticated:
      "נדרשת התחברות מחדש לפני השליחה.",
    "onboarding-required":
      "יש להשלים תחילה את פרטי העסק.",
    "tenant-selection-required":
      "נדרשת בחירה מפורשת של Tenant.",
    "permission-denied":
      "התפקיד הנוכחי אינו מורשה לשלוח תבניות.",
    "server-error":
      "השרת לא הצליח להשלים את הפעולה.",
  };

  return messages[result.status];
}

function describeSyncResult(
  result: SyncMessageTemplatesActionResult,
): string {
  if (result.status === "synced") {
    return [
      `Meta החזירה ${result.summary.received} תבניות.`,
      `${result.summary.updated} עודכנו,`,
      `${result.summary.unchanged} לא השתנו,`,
      `${result.summary.stale} אירועים ישנים דולגו,`,
      `${result.summary.unmatched} אינן מנוהלות מקומית`,
      `ו־${result.summary.unsupported} אינן נתמכות במסלול הנוכחי.`,
    ].join(" ");
  }

  const messages: Record<
    Exclude<
      SyncMessageTemplatesActionResult["status"],
      "synced"
    >,
    string
  > = {
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
    "configuration-required":
      "Clerk ו־D1 אינם מוגדרים.",
    unauthenticated:
      "נדרשת התחברות מחדש לפני הסנכרון.",
    "onboarding-required":
      "יש להשלים תחילה את פרטי העסק.",
    "tenant-selection-required":
      "נדרשת בחירה מפורשת של Tenant.",
    "permission-denied":
      "התפקיד הנוכחי אינו מורשה לסנכרן תבניות.",
    "server-error":
      "השרת לא הצליח להתחיל את הסנכרון.",
  };

  return messages[result.status];
}

function formatStoredTimestamp(value: string): string {
  return value
    .trim()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, "")
    .slice(0, 16);
}

function ActionNotice({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "warning" | "danger";
}) {
  return (
    <div
      className={`inline-notice ${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span aria-hidden="true">
        {tone === "success"
          ? "✓"
          : tone === "warning"
            ? "i"
            : "!"}
      </span>
      <p>{message}</p>
    </div>
  );
}

function CtaToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="cta-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
