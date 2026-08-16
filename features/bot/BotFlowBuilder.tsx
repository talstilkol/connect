"use client";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";
import type {
  BotFlowKeywordMatchMode,
} from "../../shared/domain/botFlow";
import {
  readKeywordSequenceBotFlowComposerDraft,
} from "../../shared/domain/botFlowComposer";
import {
  appendBotFlowReplyStep,
  createBotFlowReplySteps,
  moveBotFlowReplyStep,
  readBotFlowReplyTexts,
  removeBotFlowReplyStep,
  updateBotFlowReplyStep,
  type BotFlowReplyStepMoveDirection,
} from "../../shared/domain/botFlowSequenceEditor";
import type {
  BotFlowDetailsView,
  BotFlowDirectoryStatus,
  BotFlowDirectoryView,
  BotFlowSummaryView,
} from "../../shared/domain/botFlowView";
import type {
  BotFlowActionFailure,
} from "../../server/bot/botFlowActionResult";
import {
  loadBotFlowDetailsAction,
  publishBotFlowDraftAction,
  saveBotFlowDraftAction,
} from "../../server/bot/botFlowActions";
import {
  BotFlowReplySequenceEditor,
} from "./BotFlowReplySequenceEditor";

const directoryStatusMessages: Record<
  Exclude<BotFlowDirectoryStatus, "ready">,
  string
> = {
  "configuration-required":
    "נדרשת הגדרת Clerk ו־D1 כדי לשמור תהליכי בוט.",
  unauthenticated:
    "יש להתחבר לפני צפייה בתהליכי הבוט.",
  "onboarding-required":
    "יש להשלים יצירת סביבת עבודה לפני שמירת תהליך.",
  "tenant-selection-required":
    "יש לבחור סביבת עבודה פעילה לפני שמירת תהליך.",
  "permission-denied":
    "אין לחשבון הנוכחי הרשאה לערוך תהליכי בוט.",
  "server-error":
    "לא ניתן לטעון כרגע את תהליכי הבוט.",
};

const actionStatusMessages: Record<
  BotFlowActionFailure["status"],
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
    "השרת דחה את מבנה התהליך. בדקו שם, מילות מפתח והודעות תשובה.",
  "invalid-input":
    "הבקשה אינה תקינה.",
  "not-found":
    "התהליך או הגרסה כבר אינם קיימים.",
  "state-conflict":
    "התהליך השתנה בחלון אחר. טענו אותו מחדש לפני שמירה.",
  "invalid-state":
    "אי אפשר לפרסם את הגרסה במצבה הנוכחי.",
  "server-error":
    "הפעולה נכשלה בשרת. לא בוצע שינוי חלקי.",
};

const flowStatusLabels = {
  draft: "טיוטה",
  active: "פעיל",
  inactive: "לא פעיל",
} as const;

function replaceFlow(
  flows: readonly BotFlowSummaryView[],
  nextFlow: BotFlowSummaryView,
): readonly BotFlowSummaryView[] {
  const exists = flows.some(
    (flow) =>
      flow.botFlowKey === nextFlow.botFlowKey,
  );

  return exists
    ? flows.map((flow) =>
        flow.botFlowKey ===
        nextFlow.botFlowKey
          ? nextFlow
          : flow,
      )
    : [nextFlow, ...flows];
}

function latestVersion(
  details: BotFlowDetailsView | null,
) {
  if (!details) {
    return null;
  }

  return (
    details.versions.find(
      (version) =>
        version.botFlowVersionKey ===
        details.flow.latestVersionKey,
    ) ?? null
  );
}

function splitKeywords(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
}

export function BotFlowBuilder({
  initialStatus,
  initialDirectory,
}: {
  initialStatus: BotFlowDirectoryStatus;
  initialDirectory: BotFlowDirectoryView;
}) {
  const [flows, setFlows] = useState(
    initialDirectory.flows,
  );
  const [details, setDetails] =
    useState<BotFlowDetailsView | null>(
      initialDirectory.selectedFlow,
    );
  const initialVersion =
    latestVersion(details) ??
    details?.versions[0] ??
    null;
  const initialComposerDraft = initialVersion
    ? readKeywordSequenceBotFlowComposerDraft(
        initialVersion.definition,
      )
    : null;
  const [name, setName] = useState(
    initialComposerDraft?.name ?? "",
  );
  const [keywordsText, setKeywordsText] =
    useState(
      initialComposerDraft?.keywords.join("\n") ??
        "",
    );
  const [matchMode, setMatchMode] =
    useState<BotFlowKeywordMatchMode>(
      initialComposerDraft?.matchMode ??
        "exact",
    );
  const [replySteps, setReplySteps] = useState(
    createBotFlowReplySteps(
      initialComposerDraft?.replyTexts ?? [],
    ),
  );
  const [unsupportedDefinition, setUnsupportedDefinition] =
    useState(
      Boolean(details && !initialComposerDraft),
    );
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "warning" | "danger";
    message: string;
  } | null>(null);
  const [editorAnnouncement, setEditorAnnouncement] =
    useState("");
  const [isLoading, startLoading] =
    useTransition();
  const [isSaving, startSaving] =
    useTransition();
  const [isPublishing, startPublishing] =
    useTransition();
  const currentVersion = latestVersion(details);
  const keywords = splitKeywords(keywordsText);
  const replyTexts = readBotFlowReplyTexts(
    replySteps,
  );
  const canWrite =
    initialStatus === "ready" &&
    initialDirectory.canWrite;
  const canSave =
    canWrite &&
    !unsupportedDefinition &&
    name.trim().length > 0 &&
    keywords.length > 0 &&
    replyTexts.every(
      (replyText) => replyText.trim().length > 0,
    ) &&
    !isSaving &&
    !isPublishing;
  const canPublish =
    canWrite &&
    !dirty &&
    currentVersion?.status === "draft" &&
    !isSaving &&
    !isPublishing;

  const markChanged = () => {
    setDirty(true);
    setNotice(null);
  };

  const applyDetails = (
    nextDetails: BotFlowDetailsView,
  ) => {
    const nextVersion = latestVersion(
      nextDetails,
    );
    const draft = nextVersion
      ? readKeywordSequenceBotFlowComposerDraft(
          nextVersion.definition,
        )
      : null;

    setDetails(nextDetails);
    setName(draft?.name ?? nextDetails.flow.name);
    setKeywordsText(
      draft?.keywords.join("\n") ?? "",
    );
    setMatchMode(draft?.matchMode ?? "exact");
    setReplySteps(
      createBotFlowReplySteps(
        draft?.replyTexts ?? [],
      ),
    );
    setUnsupportedDefinition(!draft);
    setDirty(false);
    setEditorAnnouncement("");
  };

  const beginNewFlow = () => {
    setDetails(null);
    setName("");
    setKeywordsText("");
    setMatchMode("exact");
    setReplySteps(createBotFlowReplySteps([]));
    setUnsupportedDefinition(false);
    setDirty(false);
    setNotice(null);
    setEditorAnnouncement("");
  };

  const changeReplyText = (
    draftStepKey: string,
    text: string,
  ) => {
    setReplySteps((current) =>
      updateBotFlowReplyStep(
        current,
        draftStepKey,
        text,
      ),
    );
    markChanged();
  };

  const moveReplyStep = (
    draftStepKey: string,
    direction: BotFlowReplyStepMoveDirection,
  ) => {
    const currentIndex = replySteps.findIndex(
      (step) => step.draftStepKey === draftStepKey,
    );
    const nextPosition =
      direction === "up"
        ? currentIndex
        : currentIndex + 2;

    setReplySteps((current) =>
      moveBotFlowReplyStep(
        current,
        draftStepKey,
        direction,
      ),
    );
    markChanged();
    setEditorAnnouncement(
      `הודעת הטקסט הועברה למיקום ${nextPosition}.`,
    );
  };

  const removeReplyStep = (
    draftStepKey: string,
  ) => {
    const currentIndex = replySteps.findIndex(
      (step) => step.draftStepKey === draftStepKey,
    );

    setReplySteps((current) =>
      removeBotFlowReplyStep(
        current,
        draftStepKey,
      ),
    );
    markChanged();
    setEditorAnnouncement(
      `הודעת הטקסט במיקום ${currentIndex + 1} נמחקה.`,
    );
  };

  const addReplyStep = () => {
    setReplySteps((current) =>
      appendBotFlowReplyStep(current),
    );
    markChanged();
    setEditorAnnouncement(
      `נוספה הודעת טקסט במיקום ${replySteps.length + 1}.`,
    );
  };

  const loadFlow = (botFlowKey: string) => {
    if (isLoading) {
      return;
    }

    setNotice(null);
    startLoading(async () => {
      const result =
        await loadBotFlowDetailsAction(
          botFlowKey,
        );

      if (result.status === "loaded") {
        applyDetails(result.botFlow);
        return;
      }

      setNotice({
        tone: "danger",
        message:
          actionStatusMessages[result.status],
      });
    });
  };

  const reloadFlow = async (
    botFlowKey: string,
  ): Promise<boolean> => {
    const result =
      await loadBotFlowDetailsAction(
        botFlowKey,
      );

    if (result.status === "loaded") {
      applyDetails(result.botFlow);
      return true;
    }

    return false;
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
        await saveBotFlowDraftAction({
          name,
          keywords,
          matchMode,
          replyTexts,
          expectedFlowVersion:
            details?.flow.version ?? null,
        });

      if (result.status === "saved") {
        setFlows((current) =>
          replaceFlow(current, result.flow),
        );
        const reloaded = await reloadFlow(
          result.flow.botFlowKey,
        );

        if (!reloaded) {
          const priorVersions =
            details?.flow.botFlowKey ===
            result.flow.botFlowKey
              ? details.versions
              : [];

          applyDetails({
            flow: result.flow,
            versions: [
              result.draftVersion,
              ...priorVersions.filter(
                (version) =>
                  version.botFlowVersionKey !==
                  result.draftVersion
                    .botFlowVersionKey,
              ),
            ],
          });
        }

        setNotice({
          tone: reloaded
            ? "success"
            : "warning",
          message:
            !reloaded
              ? "הטיוטה נשמרה, אך טעינת ההיסטוריה המלאה נכשלה. אפשר לטעון את התהליך מחדש מהרשימה."
              : result.outcome === "unchanged"
              ? "הטיוטה כבר הייתה שמורה ללא שינוי."
              : "הטיוטה נשמרה ב־D1 כגרסה חדשה.",
        });
        return;
      }

      setNotice({
        tone: "danger",
        message:
          actionStatusMessages[result.status],
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
        await publishBotFlowDraftAction({
          botFlowKey:
            details.flow.botFlowKey,
          botFlowVersionKey:
            currentVersion.botFlowVersionKey,
          expectedFlowVersion:
            details.flow.version,
        });

      if (result.status === "published") {
        setFlows((current) =>
          replaceFlow(current, result.flow),
        );
        const reloaded = await reloadFlow(
          result.flow.botFlowKey,
        );

        if (!reloaded) {
          const priorVersions =
            details.versions.map(
              (version) =>
                version.status === "published"
                  ? {
                      ...version,
                      status:
                        "archived" as const,
                    }
                  : version,
            );

          applyDetails({
            flow: result.flow,
            versions: [
              result.publishedVersion,
              ...priorVersions.filter(
                (version) =>
                  version.botFlowVersionKey !==
                  result.publishedVersion
                    .botFlowVersionKey,
              ),
            ],
          });
        }

        setNotice({
          tone: reloaded
            ? "success"
            : "warning",
          message:
            !reloaded
              ? "הגרסה פורסמה, אך טעינת ההיסטוריה המלאה נכשלה. אפשר לטעון את התהליך מחדש מהרשימה."
              : result.outcome === "unchanged"
              ? "הגרסה כבר הייתה פעילה."
              : "הגרסה פורסמה והיא זמינה למנוע הבוט.",
        });
        return;
      }

      setNotice({
        tone: "danger",
        message:
          actionStatusMessages[result.status],
      });
    });
  };

  return (
    <div className="bot-flow-workspace">
      <section className="card bot-flow-directory">
        <div className="card-header">
          <div>
            <span className="card-kicker">
              תהליכים שמורים
            </span>
            <h2>ספריית תהליכים</h2>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={beginNewFlow}
            disabled={!canWrite}
          >
            תהליך חדש
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

        {flows.length === 0 ? (
          <div className="bot-flow-directory-empty">
            <strong>עדיין אין תהליכים</strong>
            <p>
              צרו תהליך ראשון ושמרו אותו כטיוטה.
            </p>
          </div>
        ) : (
          <div className="bot-flow-record-list">
            {flows.map((flow) => (
              <button
                type="button"
                className={`bot-flow-record ${
                  details?.flow.botFlowKey ===
                  flow.botFlowKey
                    ? "active"
                    : ""
                }`}
                key={flow.botFlowKey}
                onClick={() =>
                  loadFlow(flow.botFlowKey)
                }
                disabled={isLoading}
              >
                <span>
                  <strong>{flow.name}</strong>
                  <small>
                    גרסה{" "}
                    {flow.latestVersionNumber}
                  </small>
                </span>
                <span
                  className={`status-pill ${
                    flow.status === "active"
                      ? "success"
                      : "warning"
                  }`}
                >
                  {flowStatusLabels[flow.status]}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <form
        className="bot-builder"
        onSubmit={saveDraft}
      >
        <aside className="card bot-flow-editor">
          <span className="card-kicker">
            הגדרת מסלול טקסט מדורג
          </span>
          <h2>
            {details
              ? "עריכת תהליך"
              : "תהליך חדש"}
          </h2>
          <p>
            הודעה נכנסת נבדקת מול מילות
            המפתח. התאמה שולחת את הודעות הטקסט
            לפי הסדר; אי־התאמה מעבירה לנציג.
          </p>

          {unsupportedDefinition ? (
            <div className="inline-notice warning">
              הגרסה כוללת Buttons, תנאים או מבנה
              מתקדם שעדיין אינו ניתן לעריכה בעורך
              הרצף. הנתונים נשארו שמורים ללא שינוי.
            </div>
          ) : (
            <div className="bot-flow-fields">
              <label>
                <span>שם התהליך</span>
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
                    ולכן אינו משתנה לאחר השמירה.
                  </small>
                ) : null}
              </label>

              <label>
                <span>
                  מילות מפתח — אחת בכל שורה
                </span>
                <textarea
                  rows={5}
                  value={keywordsText}
                  onChange={(event) => {
                    setKeywordsText(
                      event.target.value,
                    );
                    markChanged();
                  }}
                  disabled={!canWrite}
                  required
                />
                <small>
                  עד 20 מילים או ביטויים, עד 80
                  תווים לכל ערך.
                </small>
              </label>

              <label>
                <span>אופן התאמה</span>
                <select
                  value={matchMode}
                  onChange={(event) => {
                    setMatchMode(
                      event.target
                        .value as BotFlowKeywordMatchMode,
                    );
                    markChanged();
                  }}
                  disabled={!canWrite}
                >
                  <option value="exact">
                    התאמה מלאה
                  </option>
                  <option value="contains">
                    ההודעה מכילה
                  </option>
                </select>
              </label>

              <BotFlowReplySequenceEditor
                steps={replySteps}
                disabled={!canWrite}
                onTextChange={changeReplyText}
                onMove={moveReplyStep}
                onRemove={removeReplyStep}
                onAdd={addReplyStep}
              />
            </div>
          )}

          <p
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {editorAnnouncement}
          </p>

          <div className="bot-flow-editor-actions">
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
                : "פרסום גרסה"}
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
        </aside>

        <section className="flow-canvas card">
          <div className="canvas-toolbar">
            <span>
              {name.trim() || "תהליך ללא שם"}
            </span>
            <span>
              {details
                ? `גרסה ${details.flow.latestVersionNumber}`
                : "טרם נשמר"}
            </span>
          </div>
          <div className="canvas-grid bot-flow-preview">
            <div className="start-node">
              <span>▶</span>
              <div>
                <small>נקודת התחלה</small>
                <strong>הודעה נכנסת</strong>
              </div>
            </div>

            <span
              className="bot-flow-arrow"
              aria-hidden="true"
            >
              ↓
            </span>

            <div className="flow-node bot-flow-node-main">
              <span className="node-icon">#</span>
              <div>
                <small>בדיקה</small>
                <strong>
                  {keywords.length > 0
                    ? `${keywords.length} מילות מפתח`
                    : "לא הוגדרו מילות מפתח"}
                </strong>
              </div>
            </div>

            <div className="bot-flow-branches">
              <div>
                <span className="bot-flow-branch-label success">
                  יש התאמה
                </span>
                <div className="bot-flow-reply-chain">
                  {replySteps.map((step, index) => (
                    <div key={step.draftStepKey}>
                      <div className="flow-node">
                        <span className="node-icon">
                          T
                        </span>
                        <div>
                          <small>
                            הודעת טקסט {index + 1}
                          </small>
                          <strong>
                            {step.text.trim()
                              ? "שליחת ההודעה שהוגדרה"
                              : "לא הוגדר תוכן"}
                          </strong>
                        </div>
                      </div>
                      {index < replySteps.length - 1 ? (
                        <span
                          className="bot-flow-chain-arrow"
                          aria-hidden="true"
                        >
                          ↓
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
                <span
                  className="bot-flow-terminal"
                  aria-label="סיום התהליך"
                >
                  ■ סיום
                </span>
              </div>
              <div>
                <span className="bot-flow-branch-label warning">
                  אין התאמה
                </span>
                <div className="flow-node">
                  <span className="node-icon">
                    ↗
                  </span>
                  <div>
                    <small>פעולה אטומית</small>
                    <strong>
                      העברה להמתנה לנציג
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
