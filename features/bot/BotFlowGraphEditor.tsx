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
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import { readBotFlowMessages } from "./botFlowMessages";

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
  language: InterfaceLanguage,
): string {
  return readBotFlowMessages(language).graph.nodeLabel(
    index + 1,
    nodeTypeLabels[node.type],
  );
}

function NodeTargetSelect({
  language,
  value,
  nodes,
  label,
  disabled,
  onChange,
}: {
  language: InterfaceLanguage;
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
            {nodeLabel(node, index, language)}
          </option>
        ))}
      </select>
    </label>
  );
}

function GraphNodeFields({
  language,
  node,
  draft,
  disabled,
  onNodeChange,
  onAnnouncement,
  onRequestNodeFocus,
}: {
  language: InterfaceLanguage;
  node: BotFlowGraphDraftNode;
  draft: BotFlowGraphEditorDraft;
  disabled: boolean;
  onNodeChange(node: BotFlowGraphDraftNode): void;
  onAnnouncement(message: string): void;
  onRequestNodeFocus(): void;
}) {
  const botMessages = readBotFlowMessages(language);
  const messages = botMessages.graph;
  const fallbackTarget =
    draft.nodes.find(
      (candidate) => candidate.type === "end",
    )?.draftNodeKey ?? draft.entryDraftNodeKey;

  if (node.type === "text") {
    return (
      <div className="bot-flow-graph-node-fields">
        <label>
          <span>{messages.messageContent}</span>
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
          language={language}
          value={node.nextDraftNodeKey}
          nodes={draft.nodes}
          label={messages.nextNode}
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
          <span>{messages.question}</span>
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
                <strong>{messages.option(index + 1)}</strong>
                <div className="bot-flow-step-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={disabled || index === 0}
                    aria-label={messages.moveOptionUp(index + 1)}
                    onClick={() => {
                      onNodeChange(
                        moveBotFlowGraphButtonOption(
                          node,
                          option.draftOptionKey,
                          "up",
                        ),
                      );
                      onAnnouncement(
                        messages.optionMovedUp(index + 1),
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
                    aria-label={messages.moveOptionDown(index + 1)}
                    onClick={() => {
                      onNodeChange(
                        moveBotFlowGraphButtonOption(
                          node,
                          option.draftOptionKey,
                          "down",
                        ),
                      );
                      onAnnouncement(
                        messages.optionMovedDown(index + 1),
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
                    aria-label={messages.deleteOption(index + 1)}
                    onClick={() => {
                      onRequestNodeFocus();
                      onNodeChange(
                        removeBotFlowGraphButtonOption(
                          node,
                          option.draftOptionKey,
                        ),
                      );
                      onAnnouncement(
                        messages.optionDeleted(index + 1),
                      );
                    }}
                  >
                    {messages.delete}
                  </button>
                </div>
              </div>
              <label>
                <span>{messages.buttonLabel}</span>
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
                language={language}
                value={option.nextDraftNodeKey}
                nodes={draft.nodes}
                label={messages.choiceTarget}
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
            onAnnouncement(messages.optionAdded);
          }}
        >
          {messages.addOption}
        </button>
      </div>
    );
  }

  if (node.type === "condition") {
    return (
      <div className="bot-flow-graph-node-fields">
        <div className="bot-flow-graph-condition-row">
          <label>
            <span>{messages.fact}</span>
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
                {messages.inboundText}
              </option>
              <option value="conversation-status">
                {messages.conversationStatus}
              </option>
            </select>
          </label>
          <label>
            <span>{messages.operator}</span>
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
              <option value="equals">{messages.equals}</option>
              <option value="contains">{messages.contains}</option>
            </select>
          </label>
        </div>
        <label>
          <span>{messages.value}</span>
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
                {messages.chooseStatus}
              </option>
              {persistedConversationStatuses.map(
                (status) => (
                  <option key={status} value={status}>
                    {botMessages.labels.conversationStatuses[status]}
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
          language={language}
          value={node.matchedDraftNodeKey}
          nodes={draft.nodes}
          label={messages.matchedTarget}
          disabled={disabled}
          onChange={(matchedDraftNodeKey) =>
            onNodeChange({
              ...node,
              matchedDraftNodeKey,
            })
          }
        />
        <NodeTargetSelect
          language={language}
          value={node.unmatchedDraftNodeKey}
          nodes={draft.nodes}
          label={messages.unmatchedTarget}
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
        <span>{messages.handoffReason}</span>
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
            {messages.customerRequest}
          </option>
          <option value="flow-rule">
            {messages.flowRule}
          </option>
        </select>
      </label>
    );
  }

  return (
    <p className="bot-flow-graph-end-description">
      {messages.endDescription}
    </p>
  );
}

export function BotFlowGraphEditor({
  language,
  draft,
  disabled,
  focusOnMount,
  onChange,
  onAnnouncement,
}: {
  language: InterfaceLanguage;
  draft: BotFlowGraphEditorDraft;
  disabled: boolean;
  focusOnMount: boolean;
  onChange(draft: BotFlowGraphEditorDraft): void;
  onAnnouncement(message: string): void;
}) {
  const messages = readBotFlowMessages(language).graph;
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
      messages.nodeAdded(nodeTypeLabels[type]),
    );
  };

  return (
    <fieldset
      ref={editorRef}
      className="bot-flow-graph-editor"
    >
      <legend>{messages.legend}</legend>
      <p id="bot-flow-graph-help">
        {messages.help}
      </p>
      <label className="bot-flow-graph-entry">
        <span>{messages.entry}</span>
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
            onAnnouncement(messages.entryChanged);
          }}
        >
          {draft.nodes.map((node, index) => (
            <option
              key={node.draftNodeKey}
              value={node.draftNodeKey}
            >
              {nodeLabel(node, index, language)}
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
                  messages.cardDragged(index + 1),
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
                  {nodeLabel(node, index, language)}
                  {isEntry ? messages.entrySuffix : ""}
                </h4>
                <div className="bot-flow-step-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={disabled || index === 0}
                    aria-label={messages.moveNodeUp(index + 1)}
                    onClick={() => {
                      onChange(
                        moveBotFlowGraphNode(
                          draft,
                          node.draftNodeKey,
                          "up",
                        ),
                      );
                      onAnnouncement(
                        messages.nodeMovedUp(index + 1),
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
                    aria-label={messages.moveNodeDown(index + 1)}
                    onClick={() => {
                      onChange(
                        moveBotFlowGraphNode(
                          draft,
                          node.draftNodeKey,
                          "down",
                        ),
                      );
                      onAnnouncement(
                        messages.nodeMovedDown(index + 1),
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
                        ? messages.chooseEntryBeforeDelete
                        : references > 0
                          ? messages.removeReferencesBeforeDelete
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
                        messages.nodeDeleted(index + 1),
                      );
                    }}
                  >
                    {messages.deleteNode}
                  </button>
                </div>
              </div>
              {!disabled &&
              (isEntry || references > 0) ? (
                <small className="bot-flow-graph-remove-help">
                  {isEntry
                    ? messages.chooseEntryHelp
                    : messages.removeReferencesHelp(references)}
                </small>
              ) : null}
              <GraphNodeFields
                language={language}
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
            {messages.addNode(nodeTypeLabels[type])}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
