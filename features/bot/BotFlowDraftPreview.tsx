import type {
  BotFlowKeywordMatchMode,
} from "../../shared/domain/botFlow";
import type {
  BotFlowButtonMenuEditorDraft,
} from "../../shared/domain/botFlowButtonMenuEditor";
import type {
  KeywordConditionDraft,
  KeywordHandoffReason,
} from "../../shared/domain/botFlowComposer";
import type {
  BotFlowReplyStepDraft,
} from "../../shared/domain/botFlowSequenceEditor";

const PREVIEW_TITLE_ID =
  "bot-flow-draft-preview-title";

function configuredText(value: string): string {
  return value.trim().length > 0
    ? "תוכן מוגדר"
    : "התוכן עדיין לא הוגדר";
}

function conditionBranchSummary(
  replyText: string,
  handoffReason:
    | KeywordHandoffReason
    | ""
    | null
    | undefined,
): string {
  if (handoffReason === "") {
    return "Handoff לנציג; סיבת ההעברה עדיין לא הוגדרה";
  }

  if (handoffReason) {
    return "Handoff לנציג ללא שליחת תשובה באותו Turn";
  }

  return `תשובת Text, ${configuredText(replyText)}, ואז סיום`;
}

function AccessibleDraftSummary({
  keywords,
  matchMode,
  replySteps,
  buttonMenu,
  condition,
  handoffReason,
}: {
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  replySteps: readonly BotFlowReplyStepDraft[];
  buttonMenu: BotFlowButtonMenuEditorDraft | null;
  condition: KeywordConditionDraft | null;
  handoffReason: KeywordHandoffReason | "" | null;
}) {
  const handoffEnabled = handoffReason !== null;

  return (
    <div className="sr-only">
      <p>
        סיכום נגיש של מסלול הטיוטה, לפי הסדר
        והענפים המוצגים בתרשים.
      </p>
      <ol>
        <li>נקודת התחלה: הודעה נכנסת.</li>
        <li>
          בדיקת {keywords.length} מילות מפתח
          בשיטת {matchMode === "exact"
            ? "התאמה מלאה"
            : "ההודעה מכילה"}.
        </li>
        <li>
          ענף יש התאמה.
          {handoffEnabled ? (
            <ol>
              <li>
                {handoffReason
                  ? "Handoff לנציג ללא תשובה אוטומטית."
                  : "Handoff לנציג; סיבת ההעברה עדיין לא הוגדרה."}
              </li>
            </ol>
          ) : (
            <ol>
              {replySteps.map((step, index) => (
                <li key={step.draftStepKey}>
                  הודעת Text {index + 1}: {configuredText(step.text)}.
                </li>
              ))}
              {buttonMenu ? (
                <li>
                  שאלת Buttons: {configuredText(buttonMenu.buttonText)}.
                  <ol>
                    {buttonMenu.options.map((option, index) => (
                      <li key={option.draftOptionKey}>
                        {option.label.trim() || `אפשרות ${index + 1}`}:
                        {" "}{configuredText(option.replyText)}, ואז סיום.
                      </li>
                    ))}
                  </ol>
                </li>
              ) : null}
              {condition ? (
                <li>
                  Condition על {condition.fact ===
                  "conversation-status"
                    ? "מצב השיחה"
                    : "הטקסט הנכנס"}.
                  <ol>
                    <li>
                      התנאי מתקיים: {conditionBranchSummary(
                        condition.matchedReplyText,
                        condition.matchedHandoffReason,
                      )}.
                    </li>
                    <li>
                      התנאי אינו מתקיים: {conditionBranchSummary(
                        condition.unmatchedReplyText,
                        condition.unmatchedHandoffReason,
                      )}.
                    </li>
                  </ol>
                </li>
              ) : null}
              {!buttonMenu && !condition ? (
                <li>סיום התהליך.</li>
              ) : null}
            </ol>
          )}
        </li>
        <li>
          ענף אין התאמה: {handoffEnabled
            ? "סיום ללא שינוי בשיחה"
            : "Handoff לנציג"}.
        </li>
      </ol>
    </div>
  );
}

export function BotFlowDraftPreview({
  name,
  versionLabel,
  keywords,
  matchMode,
  replySteps,
  buttonMenu,
  condition,
  handoffReason,
}: {
  name: string;
  versionLabel: string;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  replySteps: readonly BotFlowReplyStepDraft[];
  buttonMenu: BotFlowButtonMenuEditorDraft | null;
  condition: KeywordConditionDraft | null;
  handoffReason: KeywordHandoffReason | "" | null;
}) {
  const handoffEnabled = handoffReason !== null;
  const matchedConditionHandoffReason =
    condition?.matchedHandoffReason ?? null;
  const unmatchedConditionHandoffReason =
    condition?.unmatchedHandoffReason ?? null;

  return (
    <section
      className="flow-canvas card"
      aria-labelledby={PREVIEW_TITLE_ID}
    >
      <div className="canvas-toolbar">
        <h3 id={PREVIEW_TITLE_ID}>
          {name.trim() || "תהליך ללא שם"}
        </h3>
        <span>{versionLabel}</span>
      </div>

      <AccessibleDraftSummary
        keywords={keywords}
        matchMode={matchMode}
        replySteps={replySteps}
        buttonMenu={buttonMenu}
        condition={condition}
        handoffReason={handoffReason}
      />

      <div
        className="canvas-grid bot-flow-preview"
        aria-hidden="true"
      >
        <div className="start-node">
          <span>▶</span>
          <div>
            <small>נקודת התחלה</small>
            <strong>הודעה נכנסת</strong>
          </div>
        </div>

        <span className="bot-flow-arrow">↓</span>

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
            {handoffEnabled ? (
              <div className="flow-node bot-flow-handoff-node">
                <span className="node-icon">↗</span>
                <div>
                  <small>Handoff אטומי</small>
                  <strong>העברה להמתנה לנציג</strong>
                </div>
              </div>
            ) : (
              <>
                <div className="bot-flow-reply-chain">
                  {replySteps.map((step, index) => (
                    <div key={step.draftStepKey}>
                      <div className="flow-node">
                        <span className="node-icon">T</span>
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
                      {index < replySteps.length - 1 ||
                      buttonMenu ||
                      condition ? (
                        <span className="bot-flow-chain-arrow">
                          ↓
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>

                {buttonMenu ? (
                  <>
                    <div className="flow-node bot-flow-buttons-node">
                      <span className="node-icon">⠿</span>
                      <div>
                        <small>שאלת כפתורים</small>
                        <strong>
                          {buttonMenu.buttonText.trim()
                            ? `${buttonMenu.options.length} אפשרויות בחירה`
                            : "לא הוגדר טקסט שאלה"}
                        </strong>
                      </div>
                    </div>
                    <div className="bot-flow-option-branches">
                      {buttonMenu.options.map((option, index) => (
                        <div key={option.draftOptionKey}>
                          <span>
                            {option.label.trim() ||
                              `אפשרות ${index + 1}`}
                          </span>
                          <div className="flow-node">
                            <span className="node-icon">T</span>
                            <div>
                              <small>תשובת ענף</small>
                              <strong>
                                {option.replyText.trim()
                                  ? "שליחת התשובה שהוגדרה"
                                  : "לא הוגדרה תשובה"}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                {condition ? (
                  <>
                    <div className="flow-node bot-flow-condition-node">
                      <span className="node-icon">◇</span>
                      <div>
                        <small>פיצול לפי תנאי</small>
                        <strong>
                          {condition.fact ===
                          "conversation-status"
                            ? "בדיקת מצב השיחה"
                            : "בדיקת טקסט נכנס"}
                        </strong>
                      </div>
                    </div>
                    <div className="bot-flow-option-branches bot-flow-condition-branches">
                      <div>
                        <span>התנאי מתקיים</span>
                        <div
                          className={`flow-node${
                            matchedConditionHandoffReason !== null
                              ? " bot-flow-handoff-node"
                              : ""
                          }`}
                        >
                          <span className="node-icon">
                            {matchedConditionHandoffReason !== null
                              ? "↗"
                              : "T"}
                          </span>
                          <div>
                            <small>
                              {matchedConditionHandoffReason !== null
                                ? "Handoff אטומי"
                                : "תשובת ענף"}
                            </small>
                            <strong>
                              {matchedConditionHandoffReason !== null
                                ? matchedConditionHandoffReason
                                  ? "העברה להמתנה לנציג"
                                  : "לא הוגדרה סיבת העברה"
                                : condition.matchedReplyText.trim()
                                  ? "שליחת התשובה שהוגדרה"
                                  : "לא הוגדרה תשובה"}
                            </strong>
                          </div>
                        </div>
                      </div>
                      <div>
                        <span>התנאי אינו מתקיים</span>
                        <div
                          className={`flow-node${
                            unmatchedConditionHandoffReason !== null
                              ? " bot-flow-handoff-node"
                              : ""
                          }`}
                        >
                          <span className="node-icon">
                            {unmatchedConditionHandoffReason !== null
                              ? "↗"
                              : "T"}
                          </span>
                          <div>
                            <small>
                              {unmatchedConditionHandoffReason !== null
                                ? "Handoff אטומי"
                                : "תשובת ענף"}
                            </small>
                            <strong>
                              {unmatchedConditionHandoffReason !== null
                                ? unmatchedConditionHandoffReason
                                  ? "העברה להמתנה לנציג"
                                  : "לא הוגדרה סיבת העברה"
                                : condition.unmatchedReplyText.trim()
                                  ? "שליחת התשובה שהוגדרה"
                                  : "לא הוגדרה תשובה"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                {!condition ||
                matchedConditionHandoffReason === null ||
                unmatchedConditionHandoffReason === null ? (
                  <span className="bot-flow-terminal">
                    ■ סיום
                  </span>
                ) : null}
              </>
            )}
          </div>
          <div>
            <span className="bot-flow-branch-label warning">
              אין התאמה
            </span>
            {handoffEnabled ? (
              <span className="bot-flow-terminal">
                ■ סיום ללא שינוי
              </span>
            ) : (
              <div className="flow-node">
                <span className="node-icon">↗</span>
                <div>
                  <small>פעולה אטומית</small>
                  <strong>העברה להמתנה לנציג</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
