"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import type {
  AiResponseMode,
  ValidatedAiAgentDefinition,
} from "../../shared/domain/aiAgent";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import type {
  AiAgentDetailsView,
  AiAgentDirectoryStatus,
  AiAgentDirectoryView,
  AiAgentSummaryView,
} from "../../shared/domain/aiAgentView";
import type {
  AiAgentActionFailure,
} from "../../server/ai/aiAgentActionResult";
import {
  loadAiAgentDetailsAction,
  publishAiAgentDraftAction,
  saveAiAgentDraftAction,
} from "../../server/ai/aiAgentActions";
import {
  readAiAgentMessages,
  type AiAgentMessages,
} from "./aiAgentMessages";

function replaceAgent(
  agents: readonly AiAgentSummaryView[],
  nextAgent: AiAgentSummaryView,
): readonly AiAgentSummaryView[] {
  const exists = agents.some(
    (agent) =>
      agent.aiAgentKey ===
      nextAgent.aiAgentKey,
  );

  return exists
    ? agents.map((agent) =>
        agent.aiAgentKey ===
        nextAgent.aiAgentKey
          ? nextAgent
          : agent,
      )
    : [nextAgent, ...agents];
}

function latestVersion(
  details: AiAgentDetailsView | null,
) {
  if (!details) {
    return null;
  }

  return (
    details.versions.find(
      (version) =>
        version.aiAgentVersionKey ===
        details.agent.latestVersionKey,
    ) ?? null
  );
}

function positiveIntegerOrNull(
  value: string,
): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) &&
    parsed > 0
    ? parsed
    : null;
}

function validOptionalInteger(
  value: string,
  maximum?: number,
): boolean {
  if (value.trim().length === 0) {
    return true;
  }

  const parsed = positiveIntegerOrNull(
    value,
  );

  return (
    parsed !== null &&
    (maximum === undefined ||
      parsed <= maximum)
  );
}

function formatBytes(
  sizeBytes: number,
  language: InterfaceLanguage,
): string {
  const wholeNumber = new Intl.NumberFormat(language, {
    maximumFractionDigits: 0,
  });
  const decimalNumber = new Intl.NumberFormat(language, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });

  if (sizeBytes < 1_024) {
    return `${wholeNumber.format(sizeBytes)} B`;
  }

  if (sizeBytes < 1_048_576) {
    return `${decimalNumber.format(sizeBytes / 1_024)} KB`;
  }

  return `${decimalNumber.format(sizeBytes / 1_048_576)} MB`;
}

function failureMessage(
  failure: AiAgentActionFailure,
  messages: AiAgentMessages,
): string {
  if (
    failure.status === "activation-blocked"
  ) {
    return failure.issues
      .map(
        (issue) =>
          messages.activationIssues[issue],
      )
      .join(" · ");
  }

  return messages.actionStatuses[failure.status];
}

export function AiAgentEditor({
  language,
  initialStatus,
  initialDirectory,
}: {
  language: InterfaceLanguage;
  initialStatus: AiAgentDirectoryStatus;
  initialDirectory: AiAgentDirectoryView;
}) {
  const messages = readAiAgentMessages(language);
  const [agents, setAgents] = useState(
    initialDirectory.agents,
  );
  const [details, setDetails] =
    useState<AiAgentDetailsView | null>(
      initialDirectory.selectedAgent,
    );
  const firstVersion =
    latestVersion(details) ??
    details?.versions[0] ??
    null;
  const firstDefinition =
    firstVersion?.definition ?? null;
  const [name, setName] = useState(
    firstDefinition?.name ?? "",
  );
  const [systemPrompt, setSystemPrompt] =
    useState(
      firstDefinition?.systemPrompt ?? "",
    );
  const [handoffMessage, setHandoffMessage] =
    useState(
      firstDefinition?.handoffMessage ?? "",
    );
  const [responseMode, setResponseMode] =
    useState<AiResponseMode | "">(
      firstDefinition?.responseMode ?? "",
    );
  const [
    groundingThreshold,
    setGroundingThreshold,
  ] = useState(
    firstDefinition
      ?.minimumGroundingScoreBasisPoints
      ?.toString() ?? "",
  );
  const [costLimit, setCostLimit] = useState(
    firstDefinition
      ?.monthlyCostLimitMinorUnits
      ?.toString() ?? "",
  );
  const [billingCurrency, setBillingCurrency] =
    useState(
      firstDefinition?.billingCurrency ?? "",
    );
  const [
    selectedSourceKeys,
    setSelectedSourceKeys,
  ] = useState<readonly string[]>(
    firstDefinition?.knowledgeSourceKeys ??
      [],
  );
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "warning" | "danger";
    message: string;
  } | null>(null);
  const [isLoading, startLoading] =
    useTransition();
  const [isSaving, startSaving] =
    useTransition();
  const [isPublishing, startPublishing] =
    useTransition();
  const currentVersion = latestVersion(details);
  const canWrite =
    initialStatus === "ready" &&
    initialDirectory.canWrite;
  const currency = billingCurrency
    .trim()
    .toUpperCase();
  const costPolicyComplete =
    (costLimit.trim().length === 0 &&
      currency.length === 0) ||
    (validOptionalInteger(costLimit) &&
      costLimit.trim().length > 0 &&
      /^[A-Z]{3}$/.test(currency));
  const groundingValid =
    validOptionalInteger(
      groundingThreshold,
      10_000,
    );
  const canSave =
    canWrite &&
    name.trim().length > 0 &&
    systemPrompt.trim().length > 0 &&
    handoffMessage.trim().length > 0 &&
    groundingValid &&
    costPolicyComplete &&
    !isSaving &&
    !isPublishing;
  const canPublish =
    canWrite &&
    !dirty &&
    currentVersion?.status === "draft" &&
    details?.activationReadiness.ready ===
      true &&
    !isSaving &&
    !isPublishing;

  const markChanged = () => {
    setDirty(true);
    setNotice(null);
  };

  const applyDefinition = (
    definition: ValidatedAiAgentDefinition,
  ) => {
    setName(definition.name);
    setSystemPrompt(definition.systemPrompt);
    setHandoffMessage(
      definition.handoffMessage,
    );
    setResponseMode(
      definition.responseMode ?? "",
    );
    setGroundingThreshold(
      definition
        .minimumGroundingScoreBasisPoints
        ?.toString() ?? "",
    );
    setCostLimit(
      definition
        .monthlyCostLimitMinorUnits
        ?.toString() ?? "",
    );
    setBillingCurrency(
      definition.billingCurrency ?? "",
    );
    setSelectedSourceKeys([
      ...definition.knowledgeSourceKeys,
    ]);
  };

  const applyDetails = (
    nextDetails: AiAgentDetailsView,
  ) => {
    const nextVersion =
      latestVersion(nextDetails) ??
      nextDetails.versions[0] ??
      null;

    setDetails(nextDetails);

    if (nextVersion) {
      applyDefinition(
        nextVersion.definition,
      );
    }

    setDirty(false);
  };

  const beginNewAgent = () => {
    setDetails(null);
    setName("");
    setSystemPrompt("");
    setHandoffMessage("");
    setResponseMode("");
    setGroundingThreshold("");
    setCostLimit("");
    setBillingCurrency("");
    setSelectedSourceKeys([]);
    setDirty(false);
    setNotice(null);
  };

  const loadAgent = (aiAgentKey: string) => {
    if (isLoading) {
      return;
    }

    setNotice(null);
    startLoading(async () => {
      const result =
        await loadAiAgentDetailsAction(
          aiAgentKey,
        );

      if (result.status === "loaded") {
        applyDetails(result.aiAgent);
        return;
      }

      setNotice({
        tone: "danger",
        message: failureMessage(result, messages),
      });
    });
  };

  const reloadAgent = async (
    aiAgentKey: string,
  ): Promise<boolean> => {
    const result =
      await loadAiAgentDetailsAction(
        aiAgentKey,
      );

    if (result.status === "loaded") {
      applyDetails(result.aiAgent);
      return true;
    }

    return false;
  };

  const toggleSource = (
    sourceKey: string,
    checked: boolean,
  ) => {
    setSelectedSourceKeys((current) => {
      const next = checked
        ? current.includes(sourceKey)
          ? [...current]
          : [...current, sourceKey]
        : current.filter(
            (candidate) =>
              candidate !== sourceKey,
          );

      return next.sort();
    });
    markChanged();
  };

  const saveDraft = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    setNotice(null);
    startSaving(async () => {
      const result =
        await saveAiAgentDraftAction({
          definition: {
            name,
            systemPrompt,
            handoffMessage,
            responseMode:
              responseMode || null,
            minimumGroundingScoreBasisPoints:
              positiveIntegerOrNull(
                groundingThreshold,
              ),
            monthlyCostLimitMinorUnits:
              positiveIntegerOrNull(
                costLimit,
              ),
            billingCurrency:
              currency || null,
            knowledgeSourceKeys: [
              ...selectedSourceKeys,
            ],
          },
          expectedAgentVersion:
            details?.agent.version ?? null,
        });

      if (result.status === "saved") {
        setAgents((current) =>
          replaceAgent(
            current,
            result.agent,
          ),
        );
        const reloaded = await reloadAgent(
          result.agent.aiAgentKey,
        );

        if (!reloaded) {
          setDirty(true);
        }

        setNotice({
          tone: reloaded
            ? "success"
            : "warning",
          message:
            !reloaded
              ? messages.feedback.savedReloadFailed
              : result.outcome === "unchanged"
                ? messages.feedback.draftUnchanged
                : messages.feedback.draftSaved,
        });
        return;
      }

      setNotice({
        tone: "danger",
        message: failureMessage(result, messages),
      });
    });
  };

  const publishDraft = () => {
    if (
      !canPublish ||
      !details ||
      !currentVersion
    ) {
      return;
    }

    setNotice(null);
    startPublishing(async () => {
      const result =
        await publishAiAgentDraftAction({
          aiAgentKey:
            details.agent.aiAgentKey,
          aiAgentVersionKey:
            currentVersion.aiAgentVersionKey,
          expectedAgentVersion:
            details.agent.version,
        });

      if (result.status === "published") {
        setAgents((current) =>
          replaceAgent(
            current,
            result.agent,
          ),
        );
        const reloaded = await reloadAgent(
          result.agent.aiAgentKey,
        );

        if (!reloaded) {
          setDetails((current) =>
            current
              ? {
                  agent: result.agent,
                  versions: [
                    result.publishedVersion,
                    ...current.versions
                      .filter(
                        (version) =>
                          version.aiAgentVersionKey !==
                          result.publishedVersion
                            .aiAgentVersionKey,
                      )
                      .map((version) =>
                        version.status ===
                        "published"
                          ? {
                              ...version,
                              status:
                                "archived" as const,
                            }
                          : version,
                      ),
                  ],
                  activationReadiness: {
                    ready: true,
                    issues: [],
                  },
                }
              : current,
          );
        }

        setDirty(false);
        setNotice({
          tone: reloaded
            ? "success"
            : "warning",
          message:
            !reloaded
              ? messages.feedback
                  .publishedReloadFailed
              : result.outcome === "unchanged"
                ? messages.feedback
                    .publishedUnchanged
                : messages.feedback.published,
        });
        return;
      }

      setNotice({
        tone: "danger",
        message: failureMessage(result, messages),
      });
    });
  };

  return (
    <div className="ai-agent-workspace">
      <section className="card ai-agent-directory">
        <div className="card-header">
          <div>
            <span className="card-kicker">
              {messages.directory.kicker}
            </span>
            <h2>{messages.directory.title}</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={beginNewAgent}
            disabled={!canWrite}
          >
            {messages.directory.newAgent}
          </button>
        </div>

        {initialStatus !== "ready" ? (
          <div className="inline-notice warning">
            {
              messages.directoryStatuses[
                initialStatus
              ]
            }
          </div>
        ) : null}

        {initialStatus === "ready" &&
        !initialDirectory.canWrite ? (
          <div className="inline-notice warning">
            {messages.directory.readOnly}
          </div>
        ) : null}

        {agents.length === 0 ? (
          <div className="ai-agent-empty">
            <strong>{messages.directory.emptyTitle}</strong>
            <p>{messages.directory.emptyDescription}</p>
          </div>
        ) : (
          <div className="ai-agent-record-list">
            {agents.map((agent) => (
              <button
                type="button"
                className={`ai-agent-record ${
                  details?.agent.aiAgentKey ===
                  agent.aiAgentKey
                    ? "active"
                    : ""
                }`}
                key={agent.aiAgentKey}
                onClick={() =>
                  loadAgent(
                    agent.aiAgentKey,
                  )
                }
                disabled={isLoading}
              >
                <span>
                  <strong>{agent.name}</strong>
                  <small>
                    {messages.directory.version(
                      agent.latestVersionNumber,
                    )}
                  </small>
                </span>
                <span
                  className={`status-pill ${
                    agent.status === "active"
                      ? "success"
                      : "warning"
                  }`}
                >
                  {
                    messages.labels.agentStatuses[
                      agent.status
                    ]
                  }
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="ai-agent-main-grid">
        <form
          className="card ai-agent-editor"
          onSubmit={saveDraft}
        >
          <span className="card-kicker">
            {messages.editor.kicker}
          </span>
          <h2>
            {details
              ? messages.editor.editTitle
              : messages.editor.newTitle}
          </h2>
          <p>
            {messages.editor.boundary}
          </p>

          <div className="ai-agent-fields">
            <label>
              <span>{messages.editor.name}</span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  markChanged();
                }}
                disabled={
                  Boolean(details) || !canWrite
                }
                maxLength={160}
                required
              />
              {details ? (
                <small>
                  {messages.editor.immutableName}
                </small>
              ) : null}
            </label>

            <label>
              <span>{messages.editor.systemPrompt}</span>
              <textarea
                rows={7}
                value={systemPrompt}
                onChange={(event) => {
                  setSystemPrompt(
                    event.target.value,
                  );
                  markChanged();
                }}
                disabled={!canWrite}
                maxLength={16_384}
                required
              />
              <small>
                {messages.editor.systemPromptHelp}
              </small>
            </label>

            <label>
              <span>{messages.editor.handoffMessage}</span>
              <textarea
                rows={4}
                value={handoffMessage}
                onChange={(event) => {
                  setHandoffMessage(
                    event.target.value,
                  );
                  markChanged();
                }}
                disabled={!canWrite}
                maxLength={4_096}
                required
              />
            </label>

            <div className="ai-agent-policy-grid">
              <label>
                <span>{messages.editor.responseMode}</span>
                <select
                  value={responseMode}
                  onChange={(event) => {
                    setResponseMode(
                      event.target
                        .value as
                        | AiResponseMode
                        | "",
                    );
                    markChanged();
                  }}
                  disabled={!canWrite}
                >
                  <option value="">
                    {messages.editor.responseModes.undecided}
                  </option>
                  <option value="automatic">
                    {messages.editor.responseModes.automatic}
                  </option>
                  <option value="agent-approval">
                    {messages.editor.responseModes.agentApproval}
                  </option>
                </select>
              </label>

              <label>
                <span>
                  {messages.editor.groundingThreshold}
                </span>
                <input
                  type="number"
                  min={1}
                  max={10_000}
                  step={1}
                  value={groundingThreshold}
                  onChange={(event) => {
                    setGroundingThreshold(
                      event.target.value,
                    );
                    markChanged();
                  }}
                  disabled={!canWrite}
                />
                <small>
                  {messages.editor.groundingHelp}
                </small>
              </label>

              <label>
                <span>
                  {messages.editor.costLimit}
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={costLimit}
                  onChange={(event) => {
                    setCostLimit(
                      event.target.value,
                    );
                    markChanged();
                  }}
                  disabled={!canWrite}
                />
              </label>

              <label>
                <span>{messages.editor.currency}</span>
                <input
                  value={billingCurrency}
                  onChange={(event) => {
                    setBillingCurrency(
                      event.target.value,
                    );
                    markChanged();
                  }}
                  disabled={!canWrite}
                  maxLength={3}
                  inputMode="text"
                />
                <small>
                  {messages.editor.costHelp}
                </small>
              </label>
            </div>
          </div>

          <div className="ai-agent-editor-actions">
            <button
              type="submit"
              className="secondary-button"
              disabled={!canSave}
            >
              {isSaving
                ? messages.editor.saving
                : messages.editor.save}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={publishDraft}
              disabled={!canPublish}
            >
              {isPublishing
                ? messages.editor.publishing
                : messages.editor.publish}
            </button>
          </div>

          {notice ? (
            <div
              className={`inline-notice ${notice.tone}`}
              role="status"
            >
              {notice.message}
            </div>
          ) : null}
        </form>

        <aside className="card ai-readiness-card">
          <div className="ai-orb" aria-hidden="true">
            ✦
          </div>
          <span
            className={`status-pill ${
              details?.activationReadiness.ready
                ? "success"
                : "warning"
            }`}
          >
            {details?.activationReadiness.ready
              ? messages.readiness.ready
              : messages.readiness.blocked}
          </span>
          <h2>{messages.readiness.title}</h2>
          <p>
            {messages.readiness.description}
          </p>

          {!details ? (
            <div className="ai-readiness-empty">
              {messages.readiness.empty}
            </div>
          ) : details.activationReadiness
              .issues.length > 0 ? (
            <ul className="ai-readiness-list">
              {details.activationReadiness.issues.map(
                (issue) => (
                  <li key={issue}>
                    <span aria-hidden="true">
                      !
                    </span>
                    {messages.activationIssues[issue]}
                  </li>
                ),
              )}
            </ul>
          ) : (
            <div className="inline-notice success">
              {messages.readiness.success}
            </div>
          )}

          {details ? (
            <div className="ai-version-history">
              <span className="card-kicker">
                {messages.readiness.history}
              </span>
              {details.versions.map(
                (version) => (
                  <div
                    key={
                      version.aiAgentVersionKey
                    }
                  >
                    <strong>
                      {messages.readiness.version(
                        version.versionNumber,
                      )}
                    </strong>
                    <span>
                      {
                        messages.labels.versionStatuses[
                          version.status
                        ]
                      }
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <section className="card ai-knowledge-card">
        <div className="card-header">
          <div>
            <span className="card-kicker">
              {messages.knowledge.kicker}
            </span>
            <h2>{messages.knowledge.title}</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            aria-describedby="ai-knowledge-upload-boundary"
            disabled
          >
            {messages.knowledge.upload}
          </button>
          <small
            className="sr-only"
            id="ai-knowledge-upload-boundary"
          >
            {messages.knowledge.uploadBoundary}
          </small>
        </div>
        <p>{messages.knowledge.description}</p>

        {initialDirectory.knowledgeSources
          .length === 0 ? (
          <div className="knowledge-dropzone">
            <span>⇧</span>
            <strong>
              {messages.knowledge.emptyTitle}
            </strong>
            <small>
              {messages.knowledge.emptyDescription}
            </small>
          </div>
        ) : (
          <div className="ai-source-list">
            {initialDirectory.knowledgeSources.map(
              (source) => (
                <label
                  className={`ai-source-record ${
                    selectedSourceKeys.includes(
                      source.sourceKey,
                    )
                      ? "selected"
                      : ""
                  }`}
                  key={source.sourceKey}
                >
                  <input
                    type="checkbox"
                    checked={selectedSourceKeys.includes(
                      source.sourceKey,
                    )}
                    onChange={(event) =>
                      toggleSource(
                        source.sourceKey,
                        event.target.checked,
                      )
                    }
                    disabled={!canWrite}
                  />
                  <span className="ai-source-icon">
                    D
                  </span>
                  <span>
                    <strong>
                      {source.fileName}
                    </strong>
                    <small>
                      {source.mediaType} ·{" "}
                      {formatBytes(
                        source.sizeBytes,
                        language,
                      )}
                    </small>
                  </span>
                  <span
                    className={`status-pill ${
                      source.status === "ready"
                        ? "success"
                        : source.status ===
                            "rejected"
                          ? "critical"
                          : "warning"
                    }`}
                  >
                    {
                      messages.labels.sourceStatuses[
                        source.status
                      ]
                    }
                  </span>
                </label>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
