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
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
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
import {
  readTemplateEditorMessages,
  type TemplateEditorMessages,
} from "./templateEditorMessages";

const categories: readonly TemplateCategory[] = [
  "MARKETING",
  "UTILITY",
  "AUTHENTICATION",
];

const languages: readonly TemplateLanguage[] = [
  "he",
  "en_US",
  "ar",
];

const railwayMetaTemplateProviderActionsReady = false;

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
  interfaceLanguage,
  initialTemplates,
  initialStatus,
  canWrite,
}: {
  authEnabled: boolean;
  interfaceLanguage: InterfaceLanguage;
  initialTemplates: readonly MessageTemplateView[];
  initialStatus: MessageTemplateDirectoryStatus;
  canWrite: boolean;
}) {
  const messages = readTemplateEditorMessages(interfaceLanguage);
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
  const variableErrorMessage =
    variableResult.error === null
      ? null
      : variableResult.error.code === "invalid-syntax"
        ? messages.editor.variableGuidance.invalidSyntax
        : messages.editor.variableGuidance.missingSequence(
            variableResult.error.expected,
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
    if (!railwayMetaTemplateProviderActionsReady || isSubmitting) {
      if (!railwayMetaTemplateProviderActionsReady) {
        setSubmitResult({ status: "meta-configuration-required" });
      }
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
        result.status === "submission-uncertain" ||
        result.status === "submission-staged"
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
    if (!railwayMetaTemplateProviderActionsReady || isSyncing) {
      if (!railwayMetaTemplateProviderActionsReady) {
        setSyncResult({ status: "meta-configuration-required" });
      }
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
        messages={messages}
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
                ? messages.editor.kickers.persistent
                : localRehearsalEnabled
                  ? messages.editor.kickers.local
                  : messages.editor.kickers.unavailable}
            </span>
            <h2>{messages.editor.title}</h2>
          </div>
          <span className={`status-pill ${draftSaved ? "success" : "warning"}`}>
            {isSaving
              ? messages.editor.persistence.saving
              : draftSaved && initialStatus === "ready"
                  ? messages.editor.persistence.savedServer
                  : draftSaved && localRehearsalEnabled
                    ? messages.editor.persistence.savedLocal
                    : draftSaved
                      ? messages.editor.persistence.notSavedServer
                      : messages.editor.persistence.unsavedChanges}
          </span>
        </div>

        <form className="template-form" onSubmit={saveDraft}>
          <label>
            <span>{messages.editor.fields.name}</span>
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
              <span>{messages.editor.fields.category}</span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as TemplateCategory);
                  markChanged();
                }}
              >
                {categories.map((item) => (
                  <option value={item} key={item}>
                    {messages.options.categories[item]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{messages.editor.fields.language}</span>
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value as TemplateLanguage);
                  markChanged();
                }}
              >
                {languages.map((item) => (
                  <option value={item} key={item}>
                    {messages.options.languages[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {category === "AUTHENTICATION" ? (
            <div className="inline-notice warning" role="status">
              <span aria-hidden="true">i</span>
              <p>{messages.editor.authenticationNotice}</p>
            </div>
          ) : null}

          <label>
            <span>{messages.editor.fields.header}</span>
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
              <p>{messages.editor.headerVariableError}</p>
            </div>
          ) : null}

          <label>
            <span>{messages.editor.fields.body}</span>
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
            className={`variable-guidance ${variableErrorMessage ? "invalid" : ""}`}
          >
            <span aria-hidden="true">
              {variableErrorMessage ? "!" : variableResult.numbers.length}
            </span>
            <p>
              {variableErrorMessage ??
                (variableResult.numbers.length > 0
                  ? messages.editor.variableGuidance.found(
                      variableResult.numbers.length,
                    )
                  : messages.editor.variableGuidance.none)}
            </p>
          </div>

          {variableResult.error === null &&
          variableResult.numbers.length > 0 ? (
            <fieldset className="template-variable-examples">
              <legend>
                {messages.editor.variableGuidance.examplesTitle}
              </legend>
              <p>{messages.editor.variableGuidance.examplesDescription}</p>
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
                    ? messages.editor.variableGuidance.complete
                    : messages.editor.variableGuidance.incomplete}
                </p>
              </div>
            </fieldset>
          ) : null}

          <label>
            <span>{messages.editor.fields.footer}</span>
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
              <p>{messages.editor.footerVariableError}</p>
            </div>
          ) : null}

          <fieldset className="template-button-editor">
            <legend>{messages.editor.buttons.legend}</legend>
            <div className="button-mode-selector">
              {[
                {
                  value: "none",
                  label: messages.options.buttonModes.none,
                },
                {
                  value: "quick_reply",
                  label: messages.options.buttonModes.quick_reply,
                },
                {
                  value: "call_to_action",
                  label: messages.options.buttonModes.call_to_action,
                },
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
            <p>{messages.editor.buttons.explanation}</p>
          </fieldset>

          {buttonMode === "quick_reply" ? (
            <>
              <fieldset className="quick-reply-editor">
                <legend>{messages.editor.buttons.quickReplyLegend}</legend>
                <div className="quick-reply-heading">
                  <p>{messages.editor.buttons.quickReplyLimit}</p>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={quickReplies.length >= 2}
                    onClick={() => {
                      setQuickReplies((current) => [...current, ""]);
                      markChanged();
                    }}
                  >
                    {messages.editor.buttons.add}
                  </button>
                </div>

                {quickReplies.length > 0 ? (
                  <div className="quick-reply-fields">
                    {quickReplies.map((quickReply, index) => (
                      <div key={`quick-reply-${index}`}>
                        <label>
                          <span>
                            {messages.editor.buttons.quickReplyText(index + 1)}
                          </span>
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
                          aria-label={
                            messages.editor.buttons.removeAriaLabel(index + 1)
                          }
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
                    {messages.editor.buttons.quickReplyEmpty}
                  </p>
                )}
              </fieldset>

              {quickReplyHasVariableSyntax ? (
                <div className="inline-notice danger" role="alert">
                  <span aria-hidden="true">!</span>
                  <p>{messages.editor.buttons.quickReplyVariableError}</p>
                </div>
              ) : null}
            </>
          ) : null}

          {buttonMode === "call_to_action" ? (
            <fieldset className="cta-editor">
              <legend>{messages.editor.buttons.ctaLegend}</legend>
              <p>{messages.editor.buttons.ctaDescription}</p>

              <CtaToggle
                checked={urlButtonEnabled}
                label={messages.editor.buttons.openWebsite}
                onChange={(checked) => {
                  setUrlButtonEnabled(checked);
                  markChanged();
                }}
              />
              {urlButtonEnabled ? (
                <div className="cta-fields">
                  <fieldset className="url-mode-selector">
                    <legend>{messages.editor.buttons.urlType}</legend>
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
                      <span>{messages.options.urlModes.static}</span>
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
                      <span>{messages.options.urlModes.dynamic}</span>
                    </label>
                  </fieldset>
                  <label>
                    <span>{messages.editor.buttons.urlText}</span>
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
                        ? messages.editor.buttons.staticUrl
                        : messages.editor.buttons.dynamicUrl}
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
                      <span>{messages.editor.buttons.urlExample}</span>
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
                        ? messages.editor.buttons.staticUrlError
                        : messages.editor.buttons.dynamicUrlError}
                    </p>
                  ) : null}
                  {urlButtonMode === "dynamic" && urlButtonValid ? (
                    <div className="dynamic-url-preview" role="status">
                      <span>{messages.editor.buttons.resolvedUrl}</span>
                      <code dir="ltr">{urlPreviewValue}</code>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <CtaToggle
                checked={phoneButtonEnabled}
                label={messages.editor.buttons.callPhone}
                onChange={(checked) => {
                  setPhoneButtonEnabled(checked);
                  markChanged();
                }}
              />
              {phoneButtonEnabled ? (
                <div className="cta-fields">
                  <label>
                    <span>{messages.editor.buttons.phoneText}</span>
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
                    <span>{messages.editor.buttons.phoneNumber}</span>
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
                      {messages.editor.buttons.phoneError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!urlButtonEnabled && !phoneButtonEnabled ? (
                <p className="field-error">
                  {messages.editor.buttons.ctaEmpty}
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
              ? messages.editor.save.noPermission
              : isSaving
              ? messages.editor.save.saving
              : initialStatus === "ready"
                ? messages.editor.save.server
                : localRehearsalEnabled
                  ? messages.editor.save.local
                  : messages.editor.save.unavailable}
          </button>
          {saveResult ? (
            <ActionNotice
              message={describeSaveResult(
                saveResult,
                initialStatus,
                messages,
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
            <span className="card-kicker">
              {messages.editor.preview.kicker}
            </span>
            <h2>{messages.editor.preview.title}</h2>
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
              ? messages.editor.preview.persistentNotice
              : localRehearsalEnabled
                ? messages.editor.preview.localNotice
                : messages.editor.preview.unavailableNotice}
          </p>
        </div>
      </aside>
      </div>
    </div>
  );
}

const templateStatusTones: Record<
  MessageTemplateView["status"],
  "success" | "warning" | "critical"
> = {
  draft: "warning",
  submitting: "warning",
  pending_review: "warning",
  approved: "success",
  rejected: "critical",
  disabled: "critical",
  deleted: "critical",
};

function MessageTemplateDirectory({
  activeTemplateKey,
  authEnabled,
  canWrite,
  initialStatus,
  isSubmitting,
  isSyncing,
  messages,
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
  messages: TemplateEditorMessages;
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
      messages,
    );
  const localRehearsalEnabled =
    !authEnabled ||
    initialStatus === "configuration-required";

  return (
    <section className="card template-directory-card">
      <div className="card-header">
        <div>
          <span className="card-kicker">
            {messages.directory.kicker}
          </span>
          <h2>{messages.directory.title}</h2>
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
              ? messages.directory.fromServer(templates.length)
              : localRehearsalEnabled
                ? messages.directory.localMode
                : messages.directory.unavailable}
          </span>
          <button
            type="button"
            className="secondary-button"
            onClick={onSync}
            aria-describedby="message-template-provider-actions-boundary"
            disabled={
              !railwayMetaTemplateProviderActionsReady ||
              initialStatus !== "ready" ||
              !canWrite ||
              isSyncing
            }
          >
            {isSyncing
              ? messages.directory.syncing
              : messages.directory.sync}
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
            {messages.directory.newDraft}
          </button>
        </div>
      </div>

      {!railwayMetaTemplateProviderActionsReady ? (
        <div
          className="inline-notice warning"
          id="message-template-provider-actions-boundary"
          role="status"
        >
          <span aria-hidden="true">i</span>
          <p>{messages.directory.providerActionsUnavailable}</p>
        </div>
      ) : null}

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
              <p>{messages.directory.readOnly}</p>
            </div>
          ) : null}
          {templates.length === 0 ? (
        <div className="template-directory-empty">
          <strong>{messages.directory.emptyTitle}</strong>
          <p>{messages.directory.emptyDescription}</p>
        </div>
          ) : (
        <div className="template-record-list">
          {templates.map((template) => {
            const presentation =
              messages.directory.statuses[template.status];
            const tone = templateStatusTones[template.status];

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
                      className={`status-pill ${tone}`}
                    >
                      {presentation.label}
                    </span>
                  </div>
                  <p>{presentation.detail}</p>
                  <small>
                    {template.language} ·{" "}
                    {template.category} · {messages.directory.updated}{" "}
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
                        {messages.directory.load}
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        aria-describedby="message-template-provider-actions-boundary"
                        disabled={
                          !railwayMetaTemplateProviderActionsReady ||
                          isSubmitting
                        }
                        onClick={() =>
                          onSubmit(template.templateKey)
                        }
                      >
                        {isSubmitting
                          ? messages.directory.submitting
                          : messages.directory.submit}
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
          message={describeSubmitResult(submitResult, messages)}
          tone={
            submitResult.status === "submitted"
              ? "success"
              : submitResult.status ===
                  "submission-uncertain" ||
                  submitResult.status === "submission-staged"
                ? "warning"
                : "danger"
          }
        />
      ) : null}

      {syncResult ? (
        <ActionNotice
          message={describeSyncResult(syncResult, messages)}
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
  messages: TemplateEditorMessages,
): string | null {
  if (!authEnabled || status === "configuration-required") {
    return messages.feedback.directoryFailures["configuration-required"];
  }

  if (status === "onboarding-required") {
    return messages.feedback.directoryFailures[status];
  }

  if (status === "tenant-selection-required") {
    return messages.feedback.directoryFailures[status];
  }

  if (status === "permission-denied") {
    return messages.feedback.directoryFailures[status];
  }

  if (status === "server-error") {
    return messages.feedback.directoryFailures[status];
  }

  return null;
}

function describeSaveResult(
  result: SaveMessageTemplateDraftActionResult,
  directoryStatus: MessageTemplateDirectoryStatus,
  messages: TemplateEditorMessages,
): string {
  if (
    directoryStatus === "configuration-required" &&
    (result.status === "configuration-required" ||
      result.status === "server-error")
  ) {
    return messages.feedback.localRehearsalSaved;
  }

  return messages.feedback.saveResults[result.status];
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
  messages: TemplateEditorMessages,
): string {
  return messages.feedback.submitResults[result.status];
}

function describeSyncResult(
  result: SyncMessageTemplatesActionResult,
  messages: TemplateEditorMessages,
): string {
  if (result.status === "synced") {
    return messages.feedback.syncSummary(result.summary);
  }

  return messages.feedback.syncResults[result.status];
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
