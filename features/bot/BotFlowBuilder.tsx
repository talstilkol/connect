"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  BotFlowConditionFact,
  BotFlowConditionOperator,
  BotFlowKeywordMatchMode,
  ValidatedBotFlowDefinition,
} from "../../shared/domain/botFlow";
import {
  KEYWORD_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT,
  KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT,
  KEYWORD_CONDITION_MAXIMUM_INTRO_COUNT,
  KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT,
  KEYWORD_TWO_STEP_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT,
  readKeywordButtonMenuBotFlowComposerDraft,
  readKeywordConditionBotFlowComposerDraft,
  readKeywordHandoffBotFlowComposerDraft,
  readKeywordSequenceBotFlowComposerDraft,
  readKeywordTwoStepButtonMenuBotFlowComposerDraft,
  type KeywordConditionDraft,
  type KeywordHandoffReason,
} from "../../shared/domain/botFlowComposer";
import {
  appendBotFlowButtonOption,
  createBotFlowButtonMenuDraft,
  moveBotFlowButtonOption,
  moveBotFlowButtonOptionToPosition,
  readBotFlowButtonOptions,
  removeBotFlowButtonOption,
  updateBotFlowButtonOption,
  updateBotFlowButtonText,
  type BotFlowButtonMenuEditorDraft,
  type BotFlowButtonOptionField,
  type BotFlowButtonOptionMoveDirection,
} from "../../shared/domain/botFlowButtonMenuEditor";
import {
  appendBotFlowReplyStep,
  createBotFlowReplySteps,
  moveBotFlowReplyStep,
  moveBotFlowReplyStepToPosition,
  readBotFlowReplyTexts,
  removeBotFlowReplyStep,
  updateBotFlowReplyStep,
  type BotFlowReplyStepMoveDirection,
} from "../../shared/domain/botFlowSequenceEditor";
import {
  createBotFlowTwoStepButtonMenuDraft,
  readBotFlowTwoStepButtonBranches,
  type BotFlowTwoStepButtonMenuEditorDraft,
} from "../../shared/domain/botFlowTwoStepButtonMenuEditor";
import {
  readKeywordGraphBotFlowComposerDraft,
} from "../../shared/domain/botFlowGraphDraft";
import {
  createBotFlowGraphEditorDraft,
  isBotFlowGraphEditorDraftComplete,
  type BotFlowGraphEditorDraft,
} from "../../shared/domain/botFlowGraphEditor";
import type {
  BotFlowDetailsView,
  BotFlowDirectoryStatus,
  BotFlowDirectoryView,
  BotFlowSummaryView,
} from "../../shared/domain/botFlowView";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import {
  loadBotFlowDetailsAction,
  publishBotFlowDraftAction,
  saveBotFlowDraftAction,
} from "../../server/bot/botFlowActions";
import {
  BotFlowButtonMenuEditor,
} from "./BotFlowButtonMenuEditor";
import {
  BotFlowConditionEditor,
} from "./BotFlowConditionEditor";
import {
  BotFlowDraftPreview,
} from "./BotFlowDraftPreview";
import {
  BotFlowHandoffEditor,
} from "./BotFlowHandoffEditor";
import {
  BotFlowGraphEditor,
} from "./BotFlowGraphEditor";
import {
  BotFlowReplySequenceEditor,
} from "./BotFlowReplySequenceEditor";
import {
  BotFlowTwoStepButtonMenuEditor,
} from "./BotFlowTwoStepButtonMenuEditor";
import { readBotFlowMessages } from "./botFlowMessages";

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

function readEditableComposerDraft(
  definition: ValidatedBotFlowDefinition,
  preferGraph = false,
) {
  const preferredGraphDraft = preferGraph
    ? readKeywordGraphBotFlowComposerDraft(
        definition,
      )
    : null;

  if (preferredGraphDraft) {
    return {
      kind: "graph" as const,
      name: preferredGraphDraft.name,
      keywords: preferredGraphDraft.keywords,
      matchMode: preferredGraphDraft.matchMode,
      replyTexts: [],
      buttonMenu: null,
      twoStepButtonMenu: null,
      graphDraft: preferredGraphDraft,
      condition: null,
      handoffReason: null,
    };
  }

  const handoff =
    readKeywordHandoffBotFlowComposerDraft(
      definition,
    );

  if (handoff) {
    return {
      kind: "handoff" as const,
      name: handoff.name,
      keywords: handoff.keywords,
      matchMode: handoff.matchMode,
      replyTexts: [],
      buttonMenu: null,
      twoStepButtonMenu: null,
      graphDraft: null,
      condition: null,
      handoffReason: handoff.handoffReason,
    };
  }

  const condition =
    readKeywordConditionBotFlowComposerDraft(
      definition,
    );

  if (condition) {
    return {
      kind: "condition" as const,
      name: condition.name,
      keywords: condition.keywords,
      matchMode: condition.matchMode,
      replyTexts: condition.introTexts,
      buttonMenu: null,
      twoStepButtonMenu: null,
      graphDraft: null,
      condition: condition.condition,
      handoffReason: null,
    };
  }

  const twoStepButtonMenu =
    readKeywordTwoStepButtonMenuBotFlowComposerDraft(
      definition,
    );

  if (twoStepButtonMenu) {
    return {
      kind: "two-step-button-menu" as const,
      name: twoStepButtonMenu.name,
      keywords: twoStepButtonMenu.keywords,
      matchMode: twoStepButtonMenu.matchMode,
      replyTexts: twoStepButtonMenu.introTexts,
      buttonMenu: null,
      twoStepButtonMenu,
      graphDraft: null,
      condition: null,
      handoffReason: null,
    };
  }

  const buttonMenu =
    readKeywordButtonMenuBotFlowComposerDraft(
      definition,
    );

  if (buttonMenu) {
    return {
      kind: "button-menu" as const,
      name: buttonMenu.name,
      keywords: buttonMenu.keywords,
      matchMode: buttonMenu.matchMode,
      replyTexts: buttonMenu.introTexts,
      buttonMenu,
      twoStepButtonMenu: null,
      graphDraft: null,
      condition: null,
      handoffReason: null,
    };
  }

  const sequence =
    readKeywordSequenceBotFlowComposerDraft(
      definition,
    );

  if (sequence) {
    return {
      kind: "sequence" as const,
      ...sequence,
      buttonMenu: null,
      twoStepButtonMenu: null,
      graphDraft: null,
      condition: null,
      handoffReason: null,
    };
  }

  const graphDraft =
    readKeywordGraphBotFlowComposerDraft(
      definition,
    );

  return graphDraft
    ? {
        kind: "graph" as const,
        name: graphDraft.name,
        keywords: graphDraft.keywords,
        matchMode: graphDraft.matchMode,
        replyTexts: [],
        buttonMenu: null,
        twoStepButtonMenu: null,
        graphDraft,
        condition: null,
        handoffReason: null,
      }
    : null;
}

export function BotFlowBuilder({
  language,
  initialStatus,
  initialDirectory,
}: {
  language: InterfaceLanguage;
  initialStatus: BotFlowDirectoryStatus;
  initialDirectory: BotFlowDirectoryView;
}) {
  const messages = readBotFlowMessages(language);
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
    ? readEditableComposerDraft(
        initialVersion.definition,
      )
    : null;
  const preferGraphEditorRef = useRef(
    initialComposerDraft?.kind === "graph",
  );
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
    initialComposerDraft?.kind === "condition" &&
      initialComposerDraft.replyTexts.length === 0
      ? []
      : createBotFlowReplySteps(
          initialComposerDraft?.replyTexts ?? [],
        ),
  );
  const [buttonMenu, setButtonMenu] =
    useState<BotFlowButtonMenuEditorDraft | null>(
      initialComposerDraft?.kind === "button-menu"
        ? createBotFlowButtonMenuDraft(
            initialComposerDraft.buttonMenu.buttonText,
            initialComposerDraft.buttonMenu.options,
          )
        : null,
    );
  const [twoStepButtonMenu, setTwoStepButtonMenu] =
    useState<BotFlowTwoStepButtonMenuEditorDraft | null>(
      initialComposerDraft?.kind ===
      "two-step-button-menu"
        ? createBotFlowTwoStepButtonMenuDraft(
            initialComposerDraft.twoStepButtonMenu
              .firstButtonText,
            initialComposerDraft.twoStepButtonMenu
              .branches,
          )
        : null,
    );
  const [graphDraft, setGraphDraft] =
    useState<BotFlowGraphEditorDraft | null>(
      initialComposerDraft?.kind === "graph"
        ? createBotFlowGraphEditorDraft(
            initialComposerDraft.graphDraft,
          )
        : null,
    );
  const [condition, setCondition] =
    useState<KeywordConditionDraft | null>(
      initialComposerDraft?.kind === "condition"
        ? initialComposerDraft.condition
        : null,
    );
  const [handoffReason, setHandoffReason] =
    useState<KeywordHandoffReason | "" | null>(
      initialComposerDraft?.kind === "handoff"
        ? initialComposerDraft.handoffReason
        : null,
    );
  const [focusButtonMenuOnMount, setFocusButtonMenuOnMount] =
    useState(false);
  const [focusConditionOnMount, setFocusConditionOnMount] =
    useState(false);
  const [focusTwoStepOnMount, setFocusTwoStepOnMount] =
    useState(false);
  const [focusHandoffOnMount, setFocusHandoffOnMount] =
    useState(false);
  const [focusGraphOnMount, setFocusGraphOnMount] =
    useState(false);
  const addButtonMenuButtonRef =
    useRef<HTMLButtonElement>(null);
  const addConditionButtonRef =
    useRef<HTMLButtonElement>(null);
  const addTwoStepButtonRef =
    useRef<HTMLButtonElement>(null);
  const addHandoffButtonRef =
    useRef<HTMLButtonElement>(null);
  const addGraphButtonRef =
    useRef<HTMLButtonElement>(null);
  const focusAddButtonAfterRemovalRef =
    useRef(false);
  const focusAddConditionAfterRemovalRef =
    useRef(false);
  const focusAddTwoStepAfterRemovalRef =
    useRef(false);
  const focusAddHandoffAfterRemovalRef =
    useRef(false);
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
  const storedGraphDraft = currentVersion
    ? readKeywordGraphBotFlowComposerDraft(
        currentVersion.definition,
      )
    : null;
  const handoffEnabled = handoffReason !== null;
  const matchedConditionHandoffReason =
    condition?.matchedHandoffReason ?? null;
  const unmatchedConditionHandoffReason =
    condition?.unmatchedHandoffReason ?? null;
  const conditionHasHandoff = Boolean(
    condition &&
      (matchedConditionHandoffReason !== null ||
        unmatchedConditionHandoffReason !== null),
  );
  const keywords = splitKeywords(keywordsText);
  const replyTexts = readBotFlowReplyTexts(
    replySteps,
  );
  const buttonOptions = buttonMenu
    ? readBotFlowButtonOptions(buttonMenu)
    : [];
  const twoStepButtonBranches = twoStepButtonMenu
    ? readBotFlowTwoStepButtonBranches(
        twoStepButtonMenu,
      )
    : [];
  const twoStepNestedOptionCount =
    twoStepButtonBranches.reduce(
      (count, branch) =>
        count + branch.options.length,
      0,
    );
  const maximumReplyStepCount = conditionHasHandoff
    ? 0
    : twoStepButtonMenu
      ? KEYWORD_TWO_STEP_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT -
        twoStepButtonBranches.length -
        twoStepNestedOptionCount
      : buttonMenu
      ? KEYWORD_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT -
        buttonMenu.options.length
      : condition
        ? KEYWORD_CONDITION_MAXIMUM_INTRO_COUNT
        : KEYWORD_SEQUENCE_MAXIMUM_REPLY_COUNT;
  const maximumButtonOptionCount = Math.min(
    KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT,
    KEYWORD_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT -
      replySteps.length,
  );
  const buttonMenuComplete =
    buttonMenu === null ||
    (buttonMenu.buttonText.trim().length > 0 &&
      buttonOptions.every(
        (option) =>
          option.label.trim().length > 0 &&
          option.replyText.trim().length > 0,
      ));
  const twoStepButtonMenuComplete =
    twoStepButtonMenu === null ||
    (twoStepButtonMenu.firstButtonText.trim()
      .length > 0 &&
      twoStepButtonBranches.every(
        (branch) =>
          branch.label.trim().length > 0 &&
          branch.buttonText.trim().length > 0 &&
          branch.options.every(
            (option) =>
              option.label.trim().length > 0 &&
              option.replyText.trim().length > 0,
          ),
      ));
  const graphDraftComplete =
    graphDraft === null ||
    isBotFlowGraphEditorDraftComplete(graphDraft);
  const conditionComplete =
    condition === null ||
    (condition.value.trim().length > 0 &&
      (matchedConditionHandoffReason === null
        ? condition.matchedReplyText.trim().length > 0
        : matchedConditionHandoffReason !== "") &&
      (unmatchedConditionHandoffReason === null
        ? condition.unmatchedReplyText.trim().length > 0
        : unmatchedConditionHandoffReason !== "") &&
      (!conditionHasHandoff || replyTexts.length === 0) &&
      (condition.fact === "last-inbound-text" ||
        condition.operator === "equals"));
  const canWrite =
    initialStatus === "ready" &&
    initialDirectory.canWrite;
  const canSave =
    canWrite &&
    !unsupportedDefinition &&
    name.trim().length > 0 &&
    keywords.length > 0 &&
    (graphDraft
      ? graphDraftComplete
      : handoffEnabled
        ? handoffReason !== ""
        : replyTexts.every(
            (replyText) =>
              replyText.trim().length > 0,
          )) &&
    buttonMenuComplete &&
    twoStepButtonMenuComplete &&
    conditionComplete &&
    !isSaving &&
    !isPublishing;
  const canPublish =
    canWrite &&
    !dirty &&
    currentVersion?.status === "draft" &&
    !isSaving &&
    !isPublishing;

  useEffect(() => {
    if (
      buttonMenu !== null ||
      !focusAddButtonAfterRemovalRef.current
    ) {
      return;
    }

    focusAddButtonAfterRemovalRef.current = false;
    addButtonMenuButtonRef.current?.focus();
  }, [buttonMenu]);

  useEffect(() => {
    if (
      condition !== null ||
      !focusAddConditionAfterRemovalRef.current
    ) {
      return;
    }

    focusAddConditionAfterRemovalRef.current = false;
    addConditionButtonRef.current?.focus();
  }, [condition]);

  useEffect(() => {
    if (
      twoStepButtonMenu !== null ||
      !focusAddTwoStepAfterRemovalRef.current
    ) {
      return;
    }

    focusAddTwoStepAfterRemovalRef.current = false;
    addTwoStepButtonRef.current?.focus();
  }, [twoStepButtonMenu]);

  useEffect(() => {
    if (
      handoffReason !== null ||
      !focusAddHandoffAfterRemovalRef.current
    ) {
      return;
    }

    focusAddHandoffAfterRemovalRef.current = false;
    addHandoffButtonRef.current?.focus();
  }, [handoffReason]);

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
      ? readEditableComposerDraft(
          nextVersion.definition,
          preferGraphEditorRef.current,
        )
      : null;

    setDetails(nextDetails);
    setName(draft?.name ?? nextDetails.flow.name);
    setKeywordsText(
      draft?.keywords.join("\n") ?? "",
    );
    setMatchMode(draft?.matchMode ?? "exact");
    setReplySteps(
      draft?.kind === "condition" &&
        draft.replyTexts.length === 0
        ? []
        : createBotFlowReplySteps(
            draft?.replyTexts ?? [],
          ),
    );
    setButtonMenu(
      draft?.kind === "button-menu"
        ? createBotFlowButtonMenuDraft(
            draft.buttonMenu.buttonText,
            draft.buttonMenu.options,
          )
        : null,
    );
    setTwoStepButtonMenu(
      draft?.kind === "two-step-button-menu"
        ? createBotFlowTwoStepButtonMenuDraft(
            draft.twoStepButtonMenu
              .firstButtonText,
            draft.twoStepButtonMenu.branches,
          )
        : null,
    );
    setGraphDraft(
      draft?.kind === "graph"
        ? createBotFlowGraphEditorDraft(
            draft.graphDraft,
          )
        : null,
    );
    setCondition(
      draft?.kind === "condition"
        ? draft.condition
        : null,
    );
    setHandoffReason(
      draft?.kind === "handoff"
        ? draft.handoffReason
        : null,
    );
    setFocusButtonMenuOnMount(false);
    setFocusConditionOnMount(false);
    setFocusTwoStepOnMount(false);
    setFocusHandoffOnMount(false);
    setFocusGraphOnMount(false);
    setUnsupportedDefinition(!draft);
    setDirty(false);
    setEditorAnnouncement("");
  };

  const beginNewFlow = () => {
    preferGraphEditorRef.current = false;
    setDetails(null);
    setName("");
    setKeywordsText("");
    setMatchMode("exact");
    setReplySteps(createBotFlowReplySteps([]));
    setButtonMenu(null);
    setTwoStepButtonMenu(null);
    setGraphDraft(null);
    setCondition(null);
    setHandoffReason(null);
    setFocusButtonMenuOnMount(false);
    setFocusConditionOnMount(false);
    setFocusTwoStepOnMount(false);
    setFocusHandoffOnMount(false);
    setFocusGraphOnMount(false);
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
      messages.announcements.replyMoved(nextPosition),
    );
  };

  const moveReplyStepToPosition = (
    draftStepKey: string,
    targetIndex: number,
  ) => {
    const currentIndex = replySteps.findIndex(
      (step) => step.draftStepKey === draftStepKey,
    );

    if (
      currentIndex < 0 ||
      !Number.isSafeInteger(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= replySteps.length ||
      targetIndex === currentIndex
    ) {
      return;
    }

    setReplySteps((current) =>
      moveBotFlowReplyStepToPosition(
        current,
        draftStepKey,
        targetIndex,
      ),
    );
    markChanged();
    setEditorAnnouncement(
      messages.announcements.replyDragged(targetIndex + 1),
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
        condition ? 0 : 1,
      ),
    );
    markChanged();
    setEditorAnnouncement(
      messages.announcements.replyRemoved(currentIndex + 1),
    );
  };

  const addReplyStep = () => {
    setReplySteps((current) =>
      appendBotFlowReplyStep(
        current,
        maximumReplyStepCount,
      ),
    );
    markChanged();
    setEditorAnnouncement(
      messages.announcements.replyAdded(replySteps.length + 1),
    );
  };

  const addButtonMenu = () => {
    if (
      condition !== null ||
      twoStepButtonMenu !== null ||
      graphDraft !== null ||
      handoffReason !== null ||
      replySteps.length + 1 >
      KEYWORD_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT
    ) {
      return;
    }

    setButtonMenu(
      createBotFlowButtonMenuDraft("", []),
    );
    setFocusButtonMenuOnMount(true);
    markChanged();
    setEditorAnnouncement(
      messages.announcements.menuAdded,
    );
  };

  const removeButtonMenu = () => {
    focusAddButtonAfterRemovalRef.current = true;
    setFocusButtonMenuOnMount(false);
    setButtonMenu(null);
    markChanged();
    setEditorAnnouncement(
      messages.announcements.menuRemoved,
    );
  };

  const changeButtonText = (value: string) => {
    setButtonMenu((current) =>
      current
        ? updateBotFlowButtonText(current, value)
        : current,
    );
    markChanged();
  };

  const changeButtonOption = (
    draftOptionKey: string,
    field: BotFlowButtonOptionField,
    value: string,
  ) => {
    setButtonMenu((current) =>
      current
        ? updateBotFlowButtonOption(
            current,
            draftOptionKey,
            field,
            value,
          )
        : current,
    );
    markChanged();
  };

  const moveButtonOption = (
    draftOptionKey: string,
    direction: BotFlowButtonOptionMoveDirection,
  ) => {
    const currentIndex =
      buttonMenu?.options.findIndex(
        (option) =>
          option.draftOptionKey ===
          draftOptionKey,
      ) ?? -1;
    const nextPosition =
      direction === "up"
        ? currentIndex
        : currentIndex + 2;

    setButtonMenu((current) =>
      current
        ? moveBotFlowButtonOption(
            current,
            draftOptionKey,
            direction,
          )
        : current,
    );
    markChanged();
    setEditorAnnouncement(
      messages.announcements.optionMoved(nextPosition),
    );
  };

  const moveButtonOptionToPosition = (
    draftOptionKey: string,
    targetIndex: number,
  ) => {
    const optionCount = buttonMenu?.options.length ?? 0;
    const currentIndex =
      buttonMenu?.options.findIndex(
        (option) =>
          option.draftOptionKey === draftOptionKey,
      ) ?? -1;

    if (
      currentIndex < 0 ||
      !Number.isSafeInteger(targetIndex) ||
      targetIndex < 0 ||
      targetIndex >= optionCount ||
      targetIndex === currentIndex
    ) {
      return;
    }

    setButtonMenu((current) =>
      current
        ? moveBotFlowButtonOptionToPosition(
            current,
            draftOptionKey,
            targetIndex,
          )
        : current,
    );
    markChanged();
    setEditorAnnouncement(
      messages.announcements.optionDragged(targetIndex + 1),
    );
  };

  const removeButtonOption = (
    draftOptionKey: string,
  ) => {
    const currentIndex =
      buttonMenu?.options.findIndex(
        (option) =>
          option.draftOptionKey ===
          draftOptionKey,
      ) ?? -1;

    setButtonMenu((current) =>
      current
        ? removeBotFlowButtonOption(
            current,
            draftOptionKey,
          )
        : current,
    );
    markChanged();
    setEditorAnnouncement(
      messages.announcements.optionRemoved(currentIndex + 1),
    );
  };

  const addButtonOption = () => {
    setButtonMenu((current) =>
      current
        ? appendBotFlowButtonOption(
            current,
            maximumButtonOptionCount,
          )
        : current,
    );
    markChanged();
    setEditorAnnouncement(
      messages.announcements.optionAdded(
        (buttonMenu?.options.length ?? 0) + 1,
      ),
    );
  };

  const addTwoStepButtonMenu = () => {
    if (
      buttonMenu !== null ||
      condition !== null ||
      graphDraft !== null ||
      handoffReason !== null ||
      replySteps.length + 2 >
        KEYWORD_TWO_STEP_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT
    ) {
      return;
    }

    setTwoStepButtonMenu(
      createBotFlowTwoStepButtonMenuDraft(
        "",
        [],
      ),
    );
    setFocusTwoStepOnMount(true);
    markChanged();
    setEditorAnnouncement(
      messages.announcements.twoStepAdded,
    );
  };

  const changeTwoStepButtonMenu = (
    nextDraft:
      BotFlowTwoStepButtonMenuEditorDraft,
  ) => {
    setTwoStepButtonMenu(nextDraft);
    markChanged();
  };

  const removeTwoStepButtonMenu = () => {
    focusAddTwoStepAfterRemovalRef.current = true;
    setFocusTwoStepOnMount(false);
    setTwoStepButtonMenu(null);
    markChanged();
    setEditorAnnouncement(
      messages.announcements.twoStepRemoved,
    );
  };

  const addCondition = () => {
    if (
      buttonMenu !== null ||
      twoStepButtonMenu !== null ||
      graphDraft !== null ||
      handoffReason !== null ||
      replySteps.length >
        KEYWORD_CONDITION_MAXIMUM_INTRO_COUNT
    ) {
      return;
    }

    setCondition({
      fact: "last-inbound-text",
      operator: "equals",
      value: "",
      matchedReplyText: "",
      unmatchedReplyText: "",
    });
    setFocusConditionOnMount(true);
    markChanged();
    setEditorAnnouncement(
      messages.announcements.conditionAdded,
    );
  };

  const removeCondition = () => {
    focusAddConditionAfterRemovalRef.current = true;
    setFocusConditionOnMount(false);
    setCondition(null);
    markChanged();
    setEditorAnnouncement(
      messages.announcements.conditionRemoved,
    );
  };

  const changeConditionFact = (
    fact: BotFlowConditionFact,
  ) => {
    setCondition((current) =>
      current
        ? {
            ...current,
            fact,
            operator: "equals",
            value: "",
          }
        : current,
    );
    markChanged();
  };

  const changeConditionOperator = (
    operator: BotFlowConditionOperator,
  ) => {
    setCondition((current) =>
      current
        ? { ...current, operator }
        : current,
    );
    markChanged();
  };

  const changeConditionField = (
    field:
      | "value"
      | "matchedReplyText"
      | "unmatchedReplyText",
    value: string,
  ) => {
    setCondition((current) =>
      current
        ? { ...current, [field]: value }
        : current,
    );
    markChanged();
  };

  const changeConditionBranchKind = (
    branch: "matched" | "unmatched",
    kind: "reply" | "handoff",
  ) => {
    setCondition((current) => {
      if (!current) {
        return current;
      }

      const matchedReason =
        current.matchedHandoffReason ?? null;
      const unmatchedReason =
        current.unmatchedHandoffReason ?? null;

      return branch === "matched"
        ? {
            ...current,
            matchedReplyText:
              kind === "handoff"
                ? ""
                : current.matchedReplyText,
            matchedHandoffReason:
              kind === "handoff" ? "" : null,
            unmatchedHandoffReason:
              unmatchedReason,
          }
        : {
            ...current,
            unmatchedReplyText:
              kind === "handoff"
                ? ""
                : current.unmatchedReplyText,
            matchedHandoffReason: matchedReason,
            unmatchedHandoffReason:
              kind === "handoff" ? "" : null,
          };
    });

    if (kind === "handoff") {
      setReplySteps([]);
    }

    markChanged();
    setEditorAnnouncement(
      kind === "handoff"
        ? messages.announcements.branchHandoff
        : messages.announcements.branchReply,
    );
  };

  const changeConditionHandoffReason = (
    branch: "matched" | "unmatched",
    reason: KeywordHandoffReason,
  ) => {
    setCondition((current) =>
      current
        ? {
            ...current,
            matchedHandoffReason:
              branch === "matched"
                ? reason
                : (current.matchedHandoffReason ??
                  null),
            unmatchedHandoffReason:
              branch === "unmatched"
                ? reason
                : (current.unmatchedHandoffReason ??
                  null),
          }
        : current,
    );
    markChanged();
  };

  const addHandoff = () => {
    if (
      buttonMenu !== null ||
      twoStepButtonMenu !== null ||
      condition !== null ||
      graphDraft !== null
    ) {
      return;
    }

    setHandoffReason("");
    setFocusHandoffOnMount(true);
    markChanged();
    setEditorAnnouncement(
      messages.announcements.handoffAdded,
    );
  };

  const removeHandoff = () => {
    focusAddHandoffAfterRemovalRef.current = true;
    setFocusHandoffOnMount(false);
    setHandoffReason(null);
    markChanged();
    setEditorAnnouncement(
      messages.announcements.handoffRemoved,
    );
  };

  const changeHandoffReason = (
    reason: KeywordHandoffReason,
  ) => {
    setHandoffReason(reason);
    markChanged();
  };

  const enterGraphEditor = () => {
    if (dirty && details) {
      setNotice({
        tone: "warning",
        message: messages.announcements.graphDirty,
      });
      return;
    }

    if (details && !storedGraphDraft) {
      setNotice({
        tone: "warning",
        message: messages.announcements.graphUnsupported,
      });
      return;
    }

    if (
      !details &&
      replySteps.some(
        (step) => step.text.trim().length > 0,
      )
    ) {
      setNotice({
        tone: "warning",
        message: messages.announcements.graphRequiresEmpty,
      });
      return;
    }

    preferGraphEditorRef.current = true;
    setGraphDraft(
      createBotFlowGraphEditorDraft(
        storedGraphDraft ?? undefined,
      ),
    );
    setReplySteps([]);
    setButtonMenu(null);
    setTwoStepButtonMenu(null);
    setCondition(null);
    setHandoffReason(null);
    setFocusButtonMenuOnMount(false);
    setFocusConditionOnMount(false);
    setFocusTwoStepOnMount(false);
    setFocusHandoffOnMount(false);
    setFocusGraphOnMount(true);
    markChanged();
    setEditorAnnouncement(
      storedGraphDraft
        ? messages.announcements.graphConverted
        : messages.announcements.graphCreated,
    );
  };

  const loadFlow = (botFlowKey: string) => {
    if (isLoading) {
      return;
    }

    preferGraphEditorRef.current = false;
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
          messages.actionStatuses[result.status],
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
      const draftInput = graphDraft
        ? {
            name,
            keywords,
            matchMode,
            entryDraftNodeKey:
              graphDraft.entryDraftNodeKey,
            nodes: graphDraft.nodes,
            expectedFlowVersion:
              details?.flow.version ?? null,
          }
        : handoffEnabled
          ? {
            name,
            keywords,
            matchMode,
            handoffReason,
            expectedFlowVersion:
              details?.flow.version ?? null,
            }
          : condition
          ? {
              name,
              keywords,
              matchMode,
              introTexts: replyTexts,
              condition,
              expectedFlowVersion:
                details?.flow.version ?? null,
            }
          : twoStepButtonMenu
            ? {
                name,
                keywords,
                matchMode,
                introTexts: replyTexts,
                firstButtonText:
                  twoStepButtonMenu.firstButtonText,
                branches: twoStepButtonBranches,
                expectedFlowVersion:
                  details?.flow.version ?? null,
              }
          : buttonMenu
            ? {
                name,
                keywords,
                matchMode,
                introTexts: replyTexts,
                buttonText: buttonMenu.buttonText,
                options: buttonOptions,
                expectedFlowVersion:
                  details?.flow.version ?? null,
              }
            : {
                name,
                keywords,
                matchMode,
                replyTexts,
                expectedFlowVersion:
                  details?.flow.version ?? null,
              };
      const result =
        await saveBotFlowDraftAction(draftInput);

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
              ? messages.feedback.savedReloadFailed
              : result.outcome === "unchanged"
              ? messages.feedback.draftUnchanged
              : messages.feedback.draftSaved,
        });
        return;
      }

      setNotice({
        tone: "danger",
        message:
          messages.actionStatuses[result.status],
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
              ? messages.feedback.publishedReloadFailed
              : result.outcome === "unchanged"
              ? messages.feedback.publishedUnchanged
              : messages.feedback.published,
        });
        return;
      }

      setNotice({
        tone: "danger",
        message:
          messages.actionStatuses[result.status],
      });
    });
  };

  return (
    <div className="bot-flow-workspace">
      <section className="card bot-flow-directory">
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
            onClick={beginNewFlow}
            disabled={!canWrite}
          >
            {messages.directory.newFlow}
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

        {flows.length === 0 ? (
          <div className="bot-flow-directory-empty">
            <strong>{messages.directory.emptyTitle}</strong>
            <p>
              {messages.directory.emptyDescription}
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
                    {messages.directory.version(
                      flow.latestVersionNumber,
                    )}
                  </small>
                </span>
                <span
                  className={`status-pill ${
                    flow.status === "active"
                      ? "success"
                      : "warning"
                  }`}
                >
                  {messages.labels.flowStatuses[flow.status]}
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
            {messages.editor.kicker}
          </span>
          <h2>
            {details
              ? messages.editor.editTitle
              : messages.editor.newTitle}
          </h2>
          <p>
            {messages.editor.description}
          </p>

          {unsupportedDefinition ? (
            <div className="inline-notice warning">
              {messages.editor.unsupported}
            </div>
          ) : (
            <div className="bot-flow-fields">
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
                <span>
                  {messages.editor.keywords}
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
                  {messages.editor.keywordsHelp}
                </small>
              </label>

              <label>
                <span>{messages.editor.matchMode}</span>
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
                    {messages.editor.exact}
                  </option>
                  <option value="contains">
                    {messages.editor.contains}
                  </option>
                </select>
              </label>

              {!graphDraft ? (
                <div className="bot-flow-graph-mode-action">
                  <button
                    ref={addGraphButtonRef}
                    type="button"
                    className="secondary-button"
                    onClick={enterGraphEditor}
                    disabled={
                      !canWrite ||
                      (Boolean(details) &&
                        storedGraphDraft === null)
                    }
                  >
                    {messages.editor.enterGraph}
                  </button>
                  <small>
                    {messages.editor.graphHelp}
                  </small>
                </div>
              ) : null}

              {graphDraft ? (
                <>
                  <BotFlowGraphEditor
                    language={language}
                    draft={graphDraft}
                    disabled={!canWrite}
                    focusOnMount={focusGraphOnMount}
                    onChange={(nextDraft) => {
                      setGraphDraft(nextDraft);
                      markChanged();
                    }}
                    onAnnouncement={
                      setEditorAnnouncement
                    }
                  />
                  {!graphDraftComplete ? (
                    <div className="inline-notice warning">
                      {messages.editor.graphIncomplete}
                    </div>
                  ) : null}
                </>
              ) : handoffEnabled ? (
                <BotFlowHandoffEditor
                  language={language}
                  handoffReason={handoffReason}
                  disabled={!canWrite}
                  focusOnMount={focusHandoffOnMount}
                  onReasonChange={changeHandoffReason}
                  onRemoveHandoff={removeHandoff}
                />
              ) : (
                <>
                  <BotFlowReplySequenceEditor
                    language={language}
                    steps={replySteps}
                    disabled={!canWrite}
                    minimumSteps={condition ? 0 : 1}
                    maximumSteps={maximumReplyStepCount}
                    onTextChange={changeReplyText}
                    onMove={moveReplyStep}
                    onMoveToPosition={
                      moveReplyStepToPosition
                    }
                    onRemove={removeReplyStep}
                    onAdd={addReplyStep}
                  />

                  {twoStepButtonMenu ? (
                    <BotFlowTwoStepButtonMenuEditor
                      language={language}
                      draft={twoStepButtonMenu}
                      disabled={!canWrite}
                      focusOnMount={focusTwoStepOnMount}
                      maximumBranchBlockCount={
                        KEYWORD_TWO_STEP_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT -
                        replySteps.length
                      }
                      onChange={changeTwoStepButtonMenu}
                      onRemove={removeTwoStepButtonMenu}
                    />
                  ) : buttonMenu ? (
                    <BotFlowButtonMenuEditor
                      language={language}
                      draft={buttonMenu}
                      disabled={!canWrite}
                      focusOnMount={focusButtonMenuOnMount}
                      maximumOptionCount={
                        maximumButtonOptionCount
                      }
                      onButtonTextChange={
                        changeButtonText
                      }
                      onOptionChange={
                        changeButtonOption
                      }
                      onMoveOption={moveButtonOption}
                      onMoveOptionToPosition={
                        moveButtonOptionToPosition
                      }
                      onRemoveOption={
                        removeButtonOption
                      }
                      onAddOption={addButtonOption}
                      onRemoveMenu={removeButtonMenu}
                    />
                  ) : condition ? (
                    <BotFlowConditionEditor
                      language={language}
                      draft={condition}
                      disabled={!canWrite}
                      focusOnMount={focusConditionOnMount}
                      onFactChange={changeConditionFact}
                      onOperatorChange={
                        changeConditionOperator
                      }
                      onValueChange={(value) =>
                        changeConditionField(
                          "value",
                          value,
                        )
                      }
                      onMatchedReplyChange={(value) =>
                        changeConditionField(
                          "matchedReplyText",
                          value,
                        )
                      }
                      onUnmatchedReplyChange={(value) =>
                        changeConditionField(
                          "unmatchedReplyText",
                          value,
                        )
                      }
                      onMatchedBranchKindChange={(value) =>
                        changeConditionBranchKind(
                          "matched",
                          value,
                        )
                      }
                      onUnmatchedBranchKindChange={(value) =>
                        changeConditionBranchKind(
                          "unmatched",
                          value,
                        )
                      }
                      onMatchedHandoffReasonChange={(value) =>
                        changeConditionHandoffReason(
                          "matched",
                          value,
                        )
                      }
                      onUnmatchedHandoffReasonChange={(value) =>
                        changeConditionHandoffReason(
                          "unmatched",
                          value,
                        )
                      }
                      onRemoveCondition={removeCondition}
                    />
                  ) : (
                    <div className="bot-flow-terminal-actions">
                      <button
                        ref={addButtonMenuButtonRef}
                        type="button"
                        className="secondary-button bot-flow-add-menu"
                        onClick={addButtonMenu}
                        disabled={
                          !canWrite ||
                          replySteps.length + 1 >
                            KEYWORD_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT
                        }
                      >
                        {messages.editor.addMenu}
                      </button>
                      <button
                        ref={addConditionButtonRef}
                        type="button"
                        className="secondary-button bot-flow-add-condition"
                        onClick={addCondition}
                        disabled={
                          !canWrite ||
                          replySteps.length >
                            KEYWORD_CONDITION_MAXIMUM_INTRO_COUNT
                        }
                      >
                        {messages.editor.addCondition}
                      </button>
                      <button
                        ref={addTwoStepButtonRef}
                        type="button"
                        className="secondary-button bot-flow-add-two-step"
                        onClick={addTwoStepButtonMenu}
                        disabled={
                          !canWrite ||
                          replySteps.length + 2 >
                            KEYWORD_TWO_STEP_BUTTON_MENU_MAXIMUM_BRANCH_BLOCK_COUNT
                        }
                      >
                        {messages.editor.addTwoStep}
                      </button>
                      <button
                        ref={addHandoffButtonRef}
                        type="button"
                        className="secondary-button bot-flow-add-handoff"
                        onClick={addHandoff}
                        disabled={!canWrite}
                      >
                        {messages.editor.addHandoff}
                      </button>
                    </div>
                  )}
                </>
              )}
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
        </aside>

        <BotFlowDraftPreview
          language={language}
          name={name}
          versionLabel={
            details
              ? messages.directory.version(
                  details.flow.latestVersionNumber,
                )
              : messages.editor.notSaved
          }
          keywords={keywords}
          matchMode={matchMode}
          replySteps={replySteps}
          buttonMenu={buttonMenu}
          twoStepButtonMenu={twoStepButtonMenu}
          graphDraft={graphDraft}
          condition={condition}
          handoffReason={handoffReason}
        />
      </form>
    </div>
  );
}
