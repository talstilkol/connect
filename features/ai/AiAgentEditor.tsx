"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import type {
  AiAgentActivationIssue,
  AiResponseMode,
  KnowledgeSourceStatus,
  ValidatedAiAgentDefinition,
} from "../../shared/domain/aiAgent";
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

const directoryStatusMessages: Record<
  Exclude<AiAgentDirectoryStatus, "ready">,
  string
> = {
  "configuration-required":
    "נדרשת הגדרת Clerk ו־D1 כדי לטעון ולשמור סוכני AI.",
  unauthenticated:
    "יש להתחבר לפני צפייה בסוכני AI.",
  "onboarding-required":
    "יש להשלים יצירת סביבת עבודה לפני שמירת סוכן.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה לפני שמירת סוכן.",
  "permission-denied":
    "אין לחשבון הנוכחי הרשאה לצפות בסוכני AI.",
  "server-error":
    "לא ניתן לטעון כרגע את סוכני ה־AI.",
};

const actionStatusMessages: Record<
  Exclude<
    AiAgentActionFailure["status"],
    "activation-blocked"
  >,
  string
> = {
  "configuration-required":
    "החיבור ל־Clerk או ל־D1 אינו מוגדר.",
  unauthenticated:
    "החיבור פג. יש להתחבר מחדש.",
  "onboarding-required":
    "יש להשלים יצירת סביבת עבודה.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה.",
  "permission-denied":
    "אין הרשאה לבצע פעולה זו.",
  "validation-error":
    "השרת דחה את הגדרת הסוכן. בדקו את שדות הטיוטה.",
  "invalid-input":
    "הבקשה אינה תקינה.",
  "not-found":
    "הסוכן, הגרסה או מקור הידע כבר אינם קיימים.",
  "state-conflict":
    "הסוכן השתנה בחלון אחר. טענו אותו מחדש לפני שמירה.",
  "invalid-state":
    "אי אפשר לפרסם את הגרסה במצבה הנוכחי.",
  "server-error":
    "הפעולה נכשלה בשרת. לא בוצע שינוי חלקי.",
};

const activationIssueLabels: Record<
  AiAgentActivationIssue,
  string
> = {
  "provider-required":
    "לא הוגדר Provider פעיל",
  "billing-policy-required":
    "מדיניות החיוב טרם אושרה",
  "handoff-policy-required":
    "מדיניות המעבר לנציג טרם אושרה",
  "audit-sink-required":
    "יעד Audit טרם הוגדר",
  "response-mode-required":
    "לא נבחר אופן אישור תשובות",
  "grounding-threshold-required":
    "לא הוגדר סף Grounding",
  "cost-limit-required":
    "לא הוגדרה מגבלת עלות ומטבע",
  "knowledge-source-required":
    "לא נבחר מקור ידע",
  "knowledge-source-not-ready":
    "מקור ידע שנבחר עדיין אינו מוכן",
};

const agentStatusLabels = {
  draft: "טיוטה",
  active: "פעיל",
  inactive: "לא פעיל",
} as const;

const versionStatusLabels = {
  draft: "טיוטה",
  published: "פורסמה",
  archived: "בארכיון",
} as const;

const sourceStatusLabels: Record<
  KnowledgeSourceStatus,
  string
> = {
  "pending-upload": "ממתין להעלאה",
  "pending-validation": "ממתין לאימות",
  "pending-scan": "ממתין לסריקה",
  scanning: "בסריקה",
  ready: "מוכן",
  rejected: "נדחה",
  archived: "בארכיון",
};

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

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1_024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1_048_576) {
    return `${(sizeBytes / 1_024).toFixed(1)} KB`;
  }

  return `${(
    sizeBytes / 1_048_576
  ).toFixed(1)} MB`;
}

function failureMessage(
  failure: AiAgentActionFailure,
): string {
  if (
    failure.status === "activation-blocked"
  ) {
    return failure.issues
      .map(
        (issue) =>
          activationIssueLabels[issue],
      )
      .join(" · ");
  }

  return actionStatusMessages[failure.status];
}

export function AiAgentEditor({
  initialStatus,
  initialDirectory,
}: {
  initialStatus: AiAgentDirectoryStatus;
  initialDirectory: AiAgentDirectoryView;
}) {
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
        message: failureMessage(result),
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
              ? "הטיוטה נשמרה, אך מצב ההפעלה לא נטען מחדש. יש לבחור את הסוכן מהרשימה לפני פרסום."
              : result.outcome === "unchanged"
                ? "הטיוטה כבר הייתה שמורה ללא שינוי."
                : "הטיוטה נשמרה ב־D1 כגרסה חדשה.",
        });
        return;
      }

      setNotice({
        tone: "danger",
        message: failureMessage(result),
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
              ? "הגרסה פורסמה, אך ההיסטוריה המלאה לא נטענה מחדש."
              : result.outcome === "unchanged"
                ? "הגרסה כבר הייתה פעילה."
                : "הגרסה פורסמה והסוכן פעיל.",
        });
        return;
      }

      setNotice({
        tone: "danger",
        message: failureMessage(result),
      });
    });
  };

  return (
    <div className="ai-agent-workspace">
      <section className="card ai-agent-directory">
        <div className="card-header">
          <div>
            <span className="card-kicker">
              סוכנים שמורים
            </span>
            <h2>ספריית סוכני AI</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={beginNewAgent}
            disabled={!canWrite}
          >
            סוכן חדש
          </button>
        </div>

        {initialStatus !== "ready" ? (
          <div className="inline-notice warning">
            {
              directoryStatusMessages[
                initialStatus
              ]
            }
          </div>
        ) : null}

        {initialStatus === "ready" &&
        !initialDirectory.canWrite ? (
          <div className="inline-notice warning">
            החשבון הנוכחי נמצא במצב צפייה בלבד.
          </div>
        ) : null}

        {agents.length === 0 ? (
          <div className="ai-agent-empty">
            <strong>עדיין אין סוכנים</strong>
            <p>
              אפשר להגדיר ולשמור טיוטה ללא
              הפעלת Provider.
            </p>
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
                    גרסה{" "}
                    {agent.latestVersionNumber}
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
                    agentStatusLabels[
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
            Agent Definition
          </span>
          <h2>
            {details
              ? "עריכת סוכן"
              : "סוכן חדש"}
          </h2>
          <p>
            הטיוטה מגדירה גבולות בלבד. מפתח
            ספק, Tenant ומספר גרסה אינם מתקבלים
            מהדפדפן.
          </p>

          <div className="ai-agent-fields">
            <label>
              <span>שם הסוכן</span>
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
                  השם הוא הזהות הדטרמיניסטית
                  ולכן אינו משתנה אחרי השמירה.
                </small>
              ) : null}
            </label>

            <label>
              <span>System Prompt</span>
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
                הוראות התפקיד והגבולות של
                הסוכן. אין להזין Secret או API
                Key.
              </small>
            </label>

            <label>
              <span>הודעת מעבר לנציג</span>
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
                <span>אופן אישור תשובה</span>
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
                    טרם הוחלט
                  </option>
                  <option value="automatic">
                    אוטומטי
                  </option>
                  <option value="agent-approval">
                    אישור נציג
                  </option>
                </select>
              </label>

              <label>
                <span>
                  סף Grounding — Basis Points
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
                  10,000 הם 100%. אפשר להשאיר
                  ריק בטיוטה.
                </small>
              </label>

              <label>
                <span>
                  מגבלת עלות ביחידות מטבע קטנות
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
                <span>מטבע — ISO 4217</span>
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
                  המגבלה והמטבע נשמרים יחד או
                  נשארים ריקים.
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
                ? "שומר טיוטה…"
                : "שמירת טיוטה"}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={publishDraft}
              disabled={!canPublish}
            >
              {isPublishing
                ? "מפרסם…"
                : "פרסום והפעלה"}
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
              ? "מוכן להפעלה"
              : "הפעלה חסומה"}
          </span>
          <h2>בדיקת מוכנות שרתית</h2>
          <p>
            הרשאת כתיבה אינה מספיקה. כל התנאים
            הבאים נבדקים שוב בשרת לפני פרסום.
          </p>

          {!details ? (
            <div className="ai-readiness-empty">
              שמרו טיוטה כדי לקבל בדיקת מוכנות
              מלאה.
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
                    {activationIssueLabels[issue]}
                  </li>
                ),
              )}
            </ul>
          ) : (
            <div className="inline-notice success">
              כל תנאי ההפעלה אושרו בצד השרת.
            </div>
          )}

          {details ? (
            <div className="ai-version-history">
              <span className="card-kicker">
                היסטוריית גרסאות
              </span>
              {details.versions.map(
                (version) => (
                  <div
                    key={
                      version.aiAgentVersionKey
                    }
                  >
                    <strong>
                      גרסה {version.versionNumber}
                    </strong>
                    <span>
                      {
                        versionStatusLabels[
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
              מאגר ידע
            </span>
            <h2>מקורות השייכים לסביבה</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            disabled
          >
            העלאת מקור
          </button>
        </div>
        <p>
          הבחירה נשמרת בתוך גרסת הסוכן. רק מקור
          במצב Ready יוכל לעבור את שער ההפעלה.
        </p>

        {initialDirectory.knowledgeSources
          .length === 0 ? (
          <div className="knowledge-dropzone">
            <span>⇧</span>
            <strong>
              אין מקורות ידע שמורים
            </strong>
            <small>
              העלאה תופעל רק לאחר הגדרת R2,
              סוגי קובץ, מגבלת גודל וסריקה.
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
                      sourceStatusLabels[
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
