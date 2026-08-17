"use client";

import {
  useEffect,
  useRef,
} from "react";
import {
  appendBotFlowGraphButtonOption,
  appendBotFlowGraphNode,
  countBotFlowGraphNodeReferences,
  moveBotFlowGraphButtonOption,
  moveBotFlowGraphNode,
  moveBotFlowGraphNodeToPosition,
  removeBotFlowGraphButtonOption,
  removeBotFlowGraphNode,
  updateBotFlowGraphButtonOption,
  updateBotFlowGraphConditionFact,
  updateBotFlowGraphConditionOperator,
  updateBotFlowGraphEntry,
  updateBotFlowGraphNode,
  type BotFlowGraphEditorDraft,
  type BotFlowGraphEditorNodeType,
} from "../../shared/domain/botFlowGraphEditor";
import {
  BOT_FLOW_GRAPH_DRAFT_MAXIMUM_NODE_COUNT,
  BOT_FLOW_GRAPH_DRAFT_MAXIMUM_OPTION_COUNT,
  type BotFlowGraphDraftNode,
} from "../../shared/domain/botFlowGraphDraft";
import {
  persistedConversationStatuses,
} from "../../shared/domain/conversation";

const nodeTypeLabels = {
  text: "Text",
  buttons: "Buttons",
  condition: "Condition",
  handoff: "Handoff",
  end: "End",
} as const;

function nodeLabel(
  node: BotFlowGraphDraftNode,
  index: number,
): string {
  return `Node ${index + 1} — ${nodeTypeLabels[node.type]}`;
}

function NodeTargetSelect({
  value,
  nodes,
  label,
  disabled,
  onChange,
}: {
  value: string;
  nodes: readonly BotFlowGraphDraftNode[];
  label: string;
  disabled: boolean;
  onChange(value: string): void;
}) {
  return (
    <label className="bot-flow-graph-target">
      <span>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {nodes.map((node, index) => (
          <option
            key={node.draftNodeKey}
            value={node.draftNodeKey}
          >
            {nodeLabel(node, index)}
          </option>
        ))}
      </select>
    </label>
  );
}

function GraphNodeFields({
  node,
  draft,
  disabled,
  onNodeChange,
  onAnnouncement,
  onRequestNodeFocus,
}: {
  node: BotFlowGraphDraftNode;
  draft: BotFlowGraphEditorDraft;
  disabled: boolean;
  onNodeChange(node: BotFlowGraphDraftNode): void;
  onAnnouncement(message: string): void;
  onRequestNodeFocus(): void;
}) {
  const fallbackTarget =
    draft.nodes.find(
      (candidate) => candidate.type === "end",
    )?.draftNodeKey ?? draft.entryDraftNodeKey;

  if (node.type === "text") {
    return (
      <div className="bot-flow-graph-node-fields">
        <label>
          <span>תוכן ההודעה</span>
          <textarea
            rows={4}
            value={node.text}
            maxLength={4096}
            disabled={disabled}
            required
            onChange={(event) =>
              onNodeChange({
                ...node,
                text: event.target.value,
              })
            }
          />
        </label>
        <NodeTargetSelect
          value={node.nextDraftNodeKey}
          nodes={draft.nodes}
          label="ה־Node הבא"
          disabled={disabled}
          onChange={(nextDraftNodeKey) =>
            onNodeChange({
              ...node,
              nextDraftNodeKey,
            })
          }
        />
      </div>
    );
  }

  if (node.type === "buttons") {
    return (
      <div className="bot-flow-graph-node-fields">
        <label>
          <span>טקסט השאלה</span>
          <textarea
            rows={4}
            value={node.text}
            maxLength={4096}
            disabled={disabled}
            required
            onChange={(event) =>
              onNodeChange({
                ...node,
                text: event.target.value,
              })
            }
          />
        </label>
        <ol className="bot-flow-graph-options">
          {node.options.map((option, index) => (
            <li key={option.draftOptionKey}>
              <div className="bot-flow-graph-option-header">
                <strong>אפשרות {index + 1}</strong>
                <div className="bot-flow-step-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={disabled || index === 0}
                    aria-label={`העבר את אפשרות ${index + 1} למעלה`}
                    onClick={() => {
                      onNodeChange(
                        moveBotFlowGraphButtonOption(
                          node,
                          option.draftOptionKey,
                          "up",
                        ),
                      );
                      onAnnouncement(
                        `אפשרות ${index + 1} הועברה למעלה.`,
                      );
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      disabled ||
                      index === node.options.length - 1
                    }
                    aria-label={`העבר את אפשרות ${index + 1} למטה`}
                    onClick={() => {
                      onNodeChange(
                        moveBotFlowGraphButtonOption(
                          node,
                          option.draftOptionKey,
                          "down",
                        ),
                      );
                      onAnnouncement(
                        `אפשרות ${index + 1} הועברה למטה.`,
                      );
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="danger-text-button"
                    disabled={
                      disabled || node.options.length === 1
                    }
                    aria-label={`מחק את אפשרות ${index + 1}`}
                    onClick={() => {
                      onRequestNodeFocus();
                      onNodeChange(
                        removeBotFlowGraphButtonOption(
                          node,
                          option.draftOptionKey,
                        ),
                      );
                      onAnnouncement(
                        `אפשרות ${index + 1} נמחקה.`,
                      );
                    }}
                  >
                    מחיקה
                  </button>
                </div>
              </div>
              <label>
                <span>תווית הכפתור</span>
                <input
                  value={option.label}
                  maxLength={80}
                  disabled={disabled}
                  required
                  onChange={(event) =>
                    onNodeChange(
                      updateBotFlowGraphButtonOption(
                        node,
                        {
                          ...option,
                          label: event.target.value,
                        },
                      ),
                    )
                  }
                />
              </label>
              <NodeTargetSelect
                value={option.nextDraftNodeKey}
                nodes={draft.nodes}
                label="יעד הבחירה"
                disabled={disabled}
                onChange={(nextDraftNodeKey) =>
                  onNodeChange(
                    updateBotFlowGraphButtonOption(
                      node,
                      {
                        ...option,
                        nextDraftNodeKey,
                      },
                    ),
                  )
                }
              />
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="secondary-button"
          disabled={
            disabled ||
            node.options.length >=
              BOT_FLOW_GRAPH_DRAFT_MAXIMUM_OPTION_COUNT
          }
          onClick={() => {
            onNodeChange(
              appendBotFlowGraphButtonOption(
                node,
                fallbackTarget,
              ),
            );
            onAnnouncement("נוספה אפשרות כפתור.");
          }}
        >
          הוספת אפשרות
        </button>
      </div>
    );
  }

  if (node.type === "condition") {
    return (
      <div className="bot-flow-graph-node-fields">
        <div className="bot-flow-graph-condition-row">
          <label>
            <span>שדה לבדיקה</span>
            <select
              value={node.fact}
              disabled={disabled}
              onChange={(event) =>
                onNodeChange(
                  updateBotFlowGraphConditionFact(
                    node,
                    event.target.value as typeof node.fact,
                  ),
                )
              }
            >
              <option value="last-inbound-text">
                טקסט נכנס אחרון
              </option>
              <option value="conversation-status">
                מצב השיחה
              </option>
            </select>
          </label>
          <label>
            <span>פעולת ההשוואה</span>
            <select
              value={node.operator}
              disabled={
                disabled ||
                node.fact === "conversation-status"
              }
              onChange={(event) =>
                onNodeChange(
                  updateBotFlowGraphConditionOperator(
                    node,
                    event.target
                      .value as typeof node.operator,
                  ),
                )
              }
            >
              <option value="equals">שווה</option>
              <option value="contains">מכיל</option>
            </select>
          </label>
        </div>
        <label>
          <span>ערך להשוואה</span>
          {node.fact === "conversation-status" ? (
            <select
              value={node.value}
              disabled={disabled}
              required
              onChange={(event) =>
                onNodeChange({
                  ...node,
                  value: event.target.value,
                })
              }
            >
              <option value="" disabled>
                בחירת מצב שיחה
              </option>
              {persistedConversationStatuses.map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ),
              )}
            </select>
          ) : (
            <input
              value={node.value}
              maxLength={80}
              disabled={disabled}
              required
              onChange={(event) =>
                onNodeChange({
                  ...node,
                  value: event.target.value,
                })
              }
            />
          )}
        </label>
        <NodeTargetSelect
          value={node.matchedDraftNodeKey}
          nodes={draft.nodes}
          label="יעד כאשר התנאי מתקיים"
          disabled={disabled}
          onChange={(matchedDraftNodeKey) =>
            onNodeChange({
              ...node,
              matchedDraftNodeKey,
            })
          }
        />
        <NodeTargetSelect
          value={node.unmatchedDraftNodeKey}
          nodes={draft.nodes}
          label="יעד כאשר התנאי אינו מתקיים"
          disabled={disabled}
          onChange={(unmatchedDraftNodeKey) =>
            onNodeChange({
              ...node,
              unmatchedDraftNodeKey,
            })
          }
        />
      </div>
    );
  }

  if (node.type === "handoff") {
    return (
      <label className="bot-flow-graph-node-fields">
        <span>סיבת ההעברה לנציג</span>
        <select
          value={node.reason}
          disabled={disabled}
          onChange={(event) =>
            onNodeChange({
              ...node,
              reason: event.target
                .value as typeof node.reason,
            })
          }
        >
          <option value="customer-request">
            בקשת הלקוח
          </option>
          <option value="flow-rule">
            כלל בתהליך
          </option>
        </select>
      </label>
    );
  }

  return (
    <p className="bot-flow-graph-end-description">
      Node זה מסיים את הרצת הבוט ללא שינוי במצב השיחה.
    </p>
  );
}

export function BotFlowGraphEditor({
  draft,
  disabled,
  focusOnMount,
  onChange,
  onAnnouncement,
}: {
  draft: BotFlowGraphEditorDraft;
  disabled: boolean;
  focusOnMount: boolean;
  onChange(draft: BotFlowGraphEditorDraft): void;
  onAnnouncement(message: string): void;
}) {
  const editorRef = useRef<HTMLFieldSetElement>(null);
  const pendingFocusKeyRef = useRef<string | null>(null);
  const draggedNodeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (focusOnMount) {
      editorRef.current
        ?.querySelector<HTMLElement>(
          "[data-graph-node-key]",
        )
        ?.focus();
    }
  }, [focusOnMount]);

  useEffect(() => {
    const pendingKey = pendingFocusKeyRef.current;

    if (!pendingKey) {
      return;
    }

    pendingFocusKeyRef.current = null;
    editorRef.current
      ?.querySelector<HTMLElement>(
        `[data-graph-node-key="${pendingKey}"]`,
      )
      ?.focus();
  }, [draft.nodes]);

  const addNode = (
    type: BotFlowGraphEditorNodeType,
  ) => {
    const nextDraft = appendBotFlowGraphNode(
      draft,
      type,
    );

    if (nextDraft === draft) {
      return;
    }

    pendingFocusKeyRef.current =
      nextDraft.nodes.at(-1)?.draftNodeKey ?? null;
    onChange(nextDraft);
    onAnnouncement(
      `נוסף Node מסוג ${nodeTypeLabels[type]}.`,
    );
  };

  return (
    <fieldset
      ref={editorRef}
      className="bot-flow-graph-editor"
    >
      <legend>עורך Graph מלא</legend>
      <p id="bot-flow-graph-help">
        כל Connection נבחר בשדה יעד. אפשר לסדר את כרטיסי
        ה־Nodes בגרירה או בכפתורי המקלדת; הסדר החזותי אינו
        משנה את החיבורים.
      </p>
      <label className="bot-flow-graph-entry">
        <span>Node הכניסה לאחר התאמת מילת המפתח</span>
        <select
          value={draft.entryDraftNodeKey}
          disabled={disabled}
          onChange={(event) => {
            onChange(
              updateBotFlowGraphEntry(
                draft,
                event.target.value,
              ),
            );
            onAnnouncement("Node הכניסה השתנה.");
          }}
        >
          {draft.nodes.map((node, index) => (
            <option
              key={node.draftNodeKey}
              value={node.draftNodeKey}
            >
              {nodeLabel(node, index)}
            </option>
          ))}
        </select>
      </label>
      <ol className="bot-flow-graph-node-list">
        {draft.nodes.map((node, index) => {
          const references =
            countBotFlowGraphNodeReferences(
              draft,
              node.draftNodeKey,
            );
          const isEntry =
            draft.entryDraftNodeKey ===
            node.draftNodeKey;
          const removeDisabled =
            disabled || isEntry || references > 0;

          return (
            <li
              key={node.draftNodeKey}
              className="bot-flow-graph-node-card"
              draggable={
                !disabled && draft.nodes.length > 1
              }
              onDragStart={(event) => {
                draggedNodeKeyRef.current =
                  node.draftNodeKey;
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (!disabled) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceKey =
                  draggedNodeKeyRef.current;

                if (!sourceKey) {
                  return;
                }

                draggedNodeKeyRef.current = null;
                onChange(
                  moveBotFlowGraphNodeToPosition(
                    draft,
                    sourceKey,
                    index,
                  ),
                );
                onAnnouncement(
                  `כרטיס ה־Node נגרר למיקום ${index + 1}.`,
                );
              }}
            >
              <div className="bot-flow-graph-node-header">
                <h4
                  className="bot-flow-graph-node-title"
                  data-graph-node-key={node.draftNodeKey}
                  tabIndex={-1}
                  aria-describedby="bot-flow-graph-help"
                >
                  {nodeLabel(node, index)}
                  {isEntry ? " — כניסה" : ""}
                </h4>
                <div className="bot-flow-step-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={disabled || index === 0}
                    aria-label={`העבר את Node ${index + 1} למעלה`}
                    onClick={() => {
                      onChange(
                        moveBotFlowGraphNode(
                          draft,
                          node.draftNodeKey,
                          "up",
                        ),
                      );
                      onAnnouncement(
                        `Node ${index + 1} הועבר למעלה.`,
                      );
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      disabled ||
                      index === draft.nodes.length - 1
                    }
                    aria-label={`העבר את Node ${index + 1} למטה`}
                    onClick={() => {
                      onChange(
                        moveBotFlowGraphNode(
                          draft,
                          node.draftNodeKey,
                          "down",
                        ),
                      );
                      onAnnouncement(
                        `Node ${index + 1} הועבר למטה.`,
                      );
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="danger-text-button"
                    disabled={removeDisabled}
                    title={
                      isEntry
                        ? "יש לבחור Node כניסה אחר לפני המחיקה."
                        : references > 0
                          ? "יש להסיר תחילה את החיבורים אל ה־Node."
                          : undefined
                    }
                    onClick={() => {
                      const nextDraft =
                        removeBotFlowGraphNode(
                          draft,
                          node.draftNodeKey,
                        );

                      if (nextDraft === draft) {
                        return;
                      }

                      pendingFocusKeyRef.current =
                        nextDraft.nodes[
                          Math.min(
                            index,
                            nextDraft.nodes.length - 1,
                          )
                        ]?.draftNodeKey ?? null;
                      onChange(nextDraft);
                      onAnnouncement(
                        `Node ${index + 1} נמחק.`,
                      );
                    }}
                  >
                    מחיקת Node
                  </button>
                </div>
              </div>
              {!disabled &&
              (isEntry || references > 0) ? (
                <small className="bot-flow-graph-remove-help">
                  {isEntry
                    ? "כדי למחוק Node זה יש לבחור קודם Node כניסה אחר."
                    : `כדי למחוק Node זה יש להסיר קודם ${references} חיבורים שמפנים אליו.`}
                </small>
              ) : null}
              <GraphNodeFields
                node={node}
                draft={draft}
                disabled={disabled}
                onNodeChange={(nextNode) =>
                  onChange(
                    updateBotFlowGraphNode(
                      draft,
                      nextNode,
                    ),
                  )
                }
                onAnnouncement={onAnnouncement}
                onRequestNodeFocus={() => {
                  pendingFocusKeyRef.current =
                    node.draftNodeKey;
                }}
              />
            </li>
          );
        })}
      </ol>
      <div className="bot-flow-graph-add-actions">
        {(
          [
            "text",
            "buttons",
            "condition",
            "handoff",
            "end",
          ] as const
        ).map((type) => (
          <button
            key={type}
            type="button"
            className="secondary-button"
            disabled={
              disabled ||
              draft.nodes.length >=
                BOT_FLOW_GRAPH_DRAFT_MAXIMUM_NODE_COUNT
            }
            onClick={() => addNode(type)}
          >
            הוספת {nodeTypeLabels[type]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
