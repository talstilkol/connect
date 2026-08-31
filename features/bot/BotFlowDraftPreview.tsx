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
import type {
  BotFlowTwoStepButtonMenuEditorDraft,
} from "../../shared/domain/botFlowTwoStepButtonMenuEditor";
import type {
  BotFlowGraphEditorDraft,
} from "../../shared/domain/botFlowGraphEditor";
import type {
  BotFlowGraphDraftNode,
} from "../../shared/domain/botFlowGraphDraft";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import { readBotFlowMessages } from "./botFlowMessages";

const PREVIEW_TITLE_ID =
  "bot-flow-draft-preview-title";

function configuredText(
  value: string,
  language: InterfaceLanguage,
): string {
  const messages = readBotFlowMessages(language).preview;
  return value.trim().length > 0
    ? messages.configured
    : messages.notConfigured;
}

function conditionBranchSummary(
  replyText: string,
  handoffReason:
    | KeywordHandoffReason
    | ""
    | null
    | undefined,
  language: InterfaceLanguage,
): string {
  const messages = readBotFlowMessages(language).preview;
  if (handoffReason === "") {
    return messages.handoffReasonMissing;
  }

  if (handoffReason) {
    return messages.handoffNoReply;
  }

  return messages.textThenEnd(
    configuredText(replyText, language),
  );
}

function graphNodeTitle(
  node: BotFlowGraphDraftNode,
  index: number,
  language: InterfaceLanguage,
): string {
  return readBotFlowMessages(language).preview.nodeTitle(
    index + 1,
    node.type,
  );
}

function graphNodeTargetSummary(
  node: BotFlowGraphDraftNode,
  positions: ReadonlyMap<string, number>,
  language: InterfaceLanguage,
): string {
  const messages = readBotFlowMessages(language).preview;
  const position = (key: string) =>
    positions.get(key) ?? 0;

  if (node.type === "text") {
    return messages.continuesTo(
      position(node.nextDraftNodeKey),
    );
  }

  if (node.type === "buttons") {
    return node.options
      .map(
        (option, index) =>
          messages.optionToNode(
            option.label.trim() || messages.option(index + 1),
            position(option.nextDraftNodeKey),
          ),
      )
      .join("; ");
  }

  if (node.type === "condition") {
    return messages.conditionTargets(
      position(node.matchedDraftNodeKey),
      position(node.unmatchedDraftNodeKey),
    );
  }

  return node.type === "handoff"
    ? messages.handoffEnds
    : messages.botEnds;
}

function graphNodeConnectionLabels(
  node: BotFlowGraphDraftNode,
  index: number,
  positions: ReadonlyMap<string, number>,
  language: InterfaceLanguage,
): readonly string[] {
  const messages = readBotFlowMessages(language).preview;
  const source = `Node ${index + 1}`;
  const target = (key: string) =>
    `Node ${positions.get(key) ?? 0}`;

  if (node.type === "text") {
    return [
      `${source} → ${target(node.nextDraftNodeKey)}`,
    ];
  }

  if (node.type === "buttons") {
    return node.options.map(
      (option, optionIndex) =>
        `${source} — ${option.label.trim() || messages.option(optionIndex + 1)} → ${target(option.nextDraftNodeKey)}`,
    );
  }

  if (node.type === "condition") {
    return [
      `${source} — ${messages.matched} → ${target(node.matchedDraftNodeKey)}`,
      `${source} — ${messages.unmatched} → ${target(node.unmatchedDraftNodeKey)}`,
    ];
  }

  return [];
}

function AccessibleDraftSummary({
  language,
  keywords,
  matchMode,
  replySteps,
  buttonMenu,
  twoStepButtonMenu,
  graphDraft,
  condition,
  handoffReason,
}: {
  language: InterfaceLanguage;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  replySteps: readonly BotFlowReplyStepDraft[];
  buttonMenu: BotFlowButtonMenuEditorDraft | null;
  twoStepButtonMenu:
    BotFlowTwoStepButtonMenuEditorDraft | null;
  graphDraft: BotFlowGraphEditorDraft | null;
  condition: KeywordConditionDraft | null;
  handoffReason: KeywordHandoffReason | "" | null;
}) {
  const messages = readBotFlowMessages(language).preview;
  const handoffEnabled = handoffReason !== null;
  const graphNodePositions = new Map(
    graphDraft?.nodes.map((node, index) => [
      node.draftNodeKey,
      index + 1,
    ]) ?? [],
  );

  return (
    <div className="sr-only">
      <p>
        {messages.accessibleIntro}
      </p>
      <ol>
        <li>{messages.startSummary}</li>
        <li>
          {messages.keywordSummary(
            keywords.length,
            matchMode === "exact"
              ? messages.exact
              : messages.contains,
          )}
        </li>
        <li>
          {messages.matchedBranch}
          {handoffEnabled ? (
            <ol>
              <li>
                {handoffReason
                  ? messages.handoffAutomatic
                  : messages.handoffMissingPeriod}
              </li>
            </ol>
          ) : (
            <ol>
              {replySteps.map((step, index) => (
                <li key={step.draftStepKey}>
                  {messages.textMessage(
                    index + 1,
                    configuredText(step.text, language),
                  )}
                </li>
              ))}
              {graphDraft ? (
                <li>
                  {messages.graphEntry(
                    graphNodePositions.get(
                      graphDraft.entryDraftNodeKey,
                    ) ?? 0,
                  )}
                  <ol>
                    {graphDraft.nodes.map(
                      (node, index) => (
                        <li key={node.draftNodeKey}>
                          {graphNodeTitle(node, index, language)}:{" "}
                          {graphNodeTargetSummary(
                            node,
                            graphNodePositions,
                            language,
                          )}.
                        </li>
                      ),
                    )}
                  </ol>
                </li>
              ) : null}
              {buttonMenu ? (
                <li>
                  {messages.buttonQuestion(
                    configuredText(
                      buttonMenu.buttonText,
                      language,
                    ),
                  )}
                  <ol>
                    {buttonMenu.options.map((option, index) => (
                      <li key={option.draftOptionKey}>
                        {messages.optionThenEnd(
                          option.label.trim() || messages.option(index + 1),
                          configuredText(option.replyText, language),
                        )}
                      </li>
                    ))}
                  </ol>
                </li>
              ) : null}
              {twoStepButtonMenu ? (
                <li>
                  {messages.firstButtonQuestion(
                    configuredText(
                      twoStepButtonMenu.firstButtonText,
                      language,
                    ),
                  )}
                  <ol>
                    {twoStepButtonMenu.branches.map(
                      (branch, branchIndex) => (
                        <li key={branch.draftBranchKey}>
                          {messages.secondButtonQuestion(
                            branch.label.trim() ||
                              messages.branch(branchIndex + 1),
                            configuredText(
                              branch.menu.buttonText,
                              language,
                            ),
                          )}
                          <ol>
                            {branch.menu.options.map(
                              (option, optionIndex) => (
                                <li
                                  key={
                                    option.draftOptionKey
                                  }
                                >
                                  {messages.optionThenEnd(
                                    option.label.trim() ||
                                      messages.option(optionIndex + 1),
                                    configuredText(
                                      option.replyText,
                                      language,
                                    ),
                                  )}
                                </li>
                              ),
                            )}
                          </ol>
                        </li>
                      ),
                    )}
                  </ol>
                </li>
              ) : null}
              {condition ? (
                <li>
                  {messages.conditionOn(
                    condition.fact === "conversation-status"
                      ? messages.conversationFact
                      : messages.inboundFact,
                  )}
                  <ol>
                    <li>
                      {messages.matchedSummary(
                        conditionBranchSummary(
                          condition.matchedReplyText,
                          condition.matchedHandoffReason,
                          language,
                        ),
                      )}
                    </li>
                    <li>
                      {messages.unmatchedSummary(
                        conditionBranchSummary(
                          condition.unmatchedReplyText,
                          condition.unmatchedHandoffReason,
                          language,
                        ),
                      )}
                    </li>
                  </ol>
                </li>
              ) : null}
              {!buttonMenu &&
              !twoStepButtonMenu &&
              !graphDraft &&
              !condition ? (
                <li>{messages.flowEnd}</li>
              ) : null}
            </ol>
          )}
        </li>
        <li>
          {messages.unmatchedBranch(
            handoffEnabled
              ? messages.noChangeEnd
              : messages.handoff,
          )}
        </li>
      </ol>
    </div>
  );
}

export function BotFlowDraftPreview({
  language,
  name,
  versionLabel,
  keywords,
  matchMode,
  replySteps,
  buttonMenu,
  twoStepButtonMenu,
  graphDraft,
  condition,
  handoffReason,
}: {
  language: InterfaceLanguage;
  name: string;
  versionLabel: string;
  keywords: readonly string[];
  matchMode: BotFlowKeywordMatchMode;
  replySteps: readonly BotFlowReplyStepDraft[];
  buttonMenu: BotFlowButtonMenuEditorDraft | null;
  twoStepButtonMenu:
    BotFlowTwoStepButtonMenuEditorDraft | null;
  graphDraft: BotFlowGraphEditorDraft | null;
  condition: KeywordConditionDraft | null;
  handoffReason: KeywordHandoffReason | "" | null;
}) {
  const messages = readBotFlowMessages(language).preview;
  const handoffEnabled = handoffReason !== null;
  const matchedConditionHandoffReason =
    condition?.matchedHandoffReason ?? null;
  const unmatchedConditionHandoffReason =
    condition?.unmatchedHandoffReason ?? null;
  const graphNodePositions = new Map(
    graphDraft?.nodes.map((node, index) => [
      node.draftNodeKey,
      index + 1,
    ]) ?? [],
  );

  return (
    <section
      className="flow-canvas card"
      aria-labelledby={PREVIEW_TITLE_ID}
    >
      <div className="canvas-toolbar">
        <h3 id={PREVIEW_TITLE_ID}>
          {name.trim() || messages.unnamed}
        </h3>
        <span>{versionLabel}</span>
      </div>

      <AccessibleDraftSummary
        language={language}
        keywords={keywords}
        matchMode={matchMode}
        replySteps={replySteps}
        buttonMenu={buttonMenu}
        twoStepButtonMenu={twoStepButtonMenu}
        graphDraft={graphDraft}
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
            <small>{messages.start}</small>
            <strong>{messages.inboundMessage}</strong>
          </div>
        </div>

        <span className="bot-flow-arrow">↓</span>

        <div className="flow-node bot-flow-node-main">
          <span className="node-icon">#</span>
          <div>
            <small>{messages.check}</small>
            <strong>
              {keywords.length > 0
                ? messages.keywordCount(keywords.length)
                : messages.noKeywords}
            </strong>
          </div>
        </div>

        <div className="bot-flow-branches">
          <div>
            <span className="bot-flow-branch-label success">
              {messages.match}
            </span>
            {handoffEnabled ? (
              <div className="flow-node bot-flow-handoff-node">
                <span className="node-icon">↗</span>
                <div>
                  <small>{messages.atomicHandoff}</small>
                  <strong>{messages.transferToAgent}</strong>
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
                            {messages.textMessageLabel(index + 1)}
                          </small>
                          <strong>
                            {step.text.trim()
                              ? messages.sendConfigured
                              : messages.noContent}
                          </strong>
                        </div>
                      </div>
                      {index < replySteps.length - 1 ||
                      buttonMenu ||
                      twoStepButtonMenu ||
                      graphDraft ||
                      condition ? (
                        <span className="bot-flow-chain-arrow">
                          ↓
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>

                {graphDraft ? (
                  <div className="bot-flow-graph-preview">
                    <div className="bot-flow-graph-preview-list">
                      {graphDraft.nodes.map((node, index) => (
                        <div
                          className="flow-node bot-flow-graph-preview-node"
                          key={node.draftNodeKey}
                        >
                          <span className="node-icon">
                            {node.type === "text"
                              ? "T"
                              : node.type === "buttons"
                                ? "⠿"
                                : node.type === "condition"
                                  ? "◇"
                                  : node.type === "handoff"
                                    ? "↗"
                                    : "■"}
                          </span>
                          <div>
                            <small>
                              {graphNodeTitle(node, index, language)}
                              {node.draftNodeKey ===
                              graphDraft.entryDraftNodeKey
                                ? messages.entrySuffix
                                : ""}
                            </small>
                            <strong>
                              {graphNodeTargetSummary(
                                node,
                                graphNodePositions,
                                language,
                              )}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bot-flow-graph-preview-connections">
                      {graphDraft.nodes.flatMap(
                        (node, index) =>
                          graphNodeConnectionLabels(
                            node,
                            index,
                            graphNodePositions,
                            language,
                          ).map((label) => (
                            <span key={label}>{label}</span>
                          )),
                      )}
                    </div>
                  </div>
                ) : null}

                {buttonMenu ? (
                  <>
                    <div className="flow-node bot-flow-buttons-node">
                      <span className="node-icon">⠿</span>
                      <div>
                        <small>{messages.buttonQuestionLabel}</small>
                        <strong>
                          {buttonMenu.buttonText.trim()
                            ? messages.choiceCount(buttonMenu.options.length)
                            : messages.noQuestion}
                        </strong>
                      </div>
                    </div>
                    <div className="bot-flow-option-branches">
                      {buttonMenu.options.map((option, index) => (
                        <div key={option.draftOptionKey}>
                          <span>
                            {option.label.trim() ||
                              messages.option(index + 1)}
                          </span>
                          <div className="flow-node">
                            <span className="node-icon">T</span>
                            <div>
                              <small>{messages.branchReply}</small>
                              <strong>
                                {option.replyText.trim()
                                  ? messages.sendReply
                                  : messages.noReply}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                {twoStepButtonMenu ? (
                  <>
                    <div className="flow-node bot-flow-buttons-node">
                      <span className="node-icon">⠿</span>
                      <div>
                        <small>{messages.firstButtons}</small>
                        <strong>
                          {twoStepButtonMenu.firstButtonText.trim()
                            ? messages.secondBranchCount(
                                twoStepButtonMenu.branches.length,
                              )
                            : messages.noQuestion}
                        </strong>
                      </div>
                    </div>
                    <div className="bot-flow-option-branches bot-flow-two-step-preview-branches">
                      {twoStepButtonMenu.branches.map(
                        (branch, index) => (
                          <div key={branch.draftBranchKey}>
                            <span>
                              {branch.label.trim() ||
                                messages.branch(index + 1)}
                            </span>
                            <div className="flow-node bot-flow-buttons-node">
                              <span className="node-icon">
                                ⠿
                              </span>
                              <div>
                                <small>
                                  {messages.secondButtons}
                                </small>
                                <strong>
                                  {branch.menu.buttonText.trim()
                                    ? messages.replyOptionCount(
                                        branch.menu.options.length,
                                      )
                                    : messages.noQuestion}
                                </strong>
                              </div>
                            </div>
                            <div className="bot-flow-two-step-preview-options">
                              {branch.menu.options.map(
                                (option, optionIndex) => (
                                  <span
                                    key={
                                      option.draftOptionKey
                                    }
                                  >
                                    {option.label.trim() ||
                                      messages.option(optionIndex + 1)}
                                    {" → Text → End"}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </>
                ) : null}

                {condition ? (
                  <>
                    <div className="flow-node bot-flow-condition-node">
                      <span className="node-icon">◇</span>
                      <div>
                        <small>{messages.conditionSplit}</small>
                        <strong>
                          {condition.fact ===
                          "conversation-status"
                            ? messages.statusCheck
                            : messages.textCheck}
                        </strong>
                      </div>
                    </div>
                    <div className="bot-flow-option-branches bot-flow-condition-branches">
                      <div>
                        <span>{messages.conditionMatched}</span>
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
                                ? messages.atomicHandoff
                                : messages.branchReply}
                            </small>
                            <strong>
                              {matchedConditionHandoffReason !== null
                                ? matchedConditionHandoffReason
                                  ? messages.transferToAgent
                                  : messages.noHandoffReason
                                : condition.matchedReplyText.trim()
                                  ? messages.sendReply
                                  : messages.noReply}
                            </strong>
                          </div>
                        </div>
                      </div>
                      <div>
                        <span>{messages.conditionUnmatched}</span>
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
                                ? messages.atomicHandoff
                                : messages.branchReply}
                            </small>
                            <strong>
                              {unmatchedConditionHandoffReason !== null
                                ? unmatchedConditionHandoffReason
                                  ? messages.transferToAgent
                                  : messages.noHandoffReason
                                : condition.unmatchedReplyText.trim()
                                  ? messages.sendReply
                                  : messages.noReply}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                {!graphDraft &&
                (!condition ||
                  matchedConditionHandoffReason === null ||
                  unmatchedConditionHandoffReason === null) ? (
                  <span className="bot-flow-terminal">
                    {messages.end}
                  </span>
                ) : null}
              </>
            )}
          </div>
          <div>
            <span className="bot-flow-branch-label warning">
              {messages.noMatch}
            </span>
            {handoffEnabled ? (
              <span className="bot-flow-terminal">
                {messages.endNoChange}
              </span>
            ) : (
              <div className="flow-node">
                <span className="node-icon">↗</span>
                <div>
                  <small>{messages.atomicAction}</small>
                  <strong>{messages.transferToAgent}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
