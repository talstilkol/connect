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
  BotFlowActionFailure,
} from "../../server/bot/botFlowActionResult";
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
      `הודעת הטקסט הועברה למיקום ${nextPosition}.`,
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
      `הודעת הטקסט נגררה למיקום ${targetIndex + 1}.`,
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
      `הודעת הטקסט במיקום ${currentIndex + 1} נמחקה.`,
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
      `נוספה הודעת טקסט במיקום ${replySteps.length + 1}.`,
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
      "נוספה שאלת כפתורים עם אפשרות אחת.",
    );
  };

  const removeButtonMenu = () => {
    focusAddButtonAfterRemovalRef.current = true;
    setFocusButtonMenuOnMount(false);
    setButtonMenu(null);
    markChanged();
    setEditorAnnouncement(
      "שאלת הכפתורים וכל ענפיה הוסרו מהטיוטה.",
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
      `אפשרות הכפתור הועברה למיקום ${nextPosition}.`,
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
      `אפשרות הכפתור נגררה למיקום ${targetIndex + 1}.`,
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
      `אפשרות הכפתור במיקום ${currentIndex + 1} נמחקה.`,
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
      `נוספה אפשרות כפתור במיקום ${(buttonMenu?.options.length ?? 0) + 1}.`,
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
      "נוספו שתי שאלות Buttons עוקבות עם ענף ראשון.",
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
      "שתי שאלות ה־Buttons וכל ענפיהן הוסרו מהטיוטה.",
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
      "נוסף פיצול לפי תנאי עם שני ענפי תשובה.",
    );
  };

  const removeCondition = () => {
    focusAddConditionAfterRemovalRef.current = true;
    setFocusConditionOnMount(false);
    setCondition(null);
    markChanged();
    setEditorAnnouncement(
      "התנאי ושני ענפי התשובה הוסרו מהטיוטה.",
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
        ? "הענף הוגדר להעברה לנציג ללא הודעת Intro באותו Turn."
        : "הענף הוגדר לשליחת תשובת Text.",
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
      "נוסף מסלול העברה לנציג בעת התאמת מילת מפתח.",
    );
  };

  const removeHandoff = () => {
    focusAddHandoffAfterRemovalRef.current = true;
    setFocusHandoffOnMount(false);
    setHandoffReason(null);
    markChanged();
    setEditorAnnouncement(
      "מסלול ההעברה לנציג הוסר מהטיוטה.",
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
        message:
          "יש לשמור או לטעון מחדש את השינויים לפני מעבר לעורך Graph מלא.",
      });
      return;
    }

    if (details && !storedGraphDraft) {
      setNotice({
        tone: "warning",
        message:
          "מבנה התהליך הנוכחי אינו ניתן להמרה בטוחה לעורך Graph מלא.",
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
        message:
          "יש להתחיל תהליך חדש וריק לפני מעבר לעורך Graph מלא.",
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
        ? "התהליך הומר לעורך Graph מלא ללא שינוי בחיבורים."
        : "נוצר Graph חדש עם Text ו־End מחוברים.",
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
            הגדרת מסלול Text, ‏Buttons, ‏Condition ו־Handoff
          </span>
          <h2>
            {details
              ? "עריכת תהליך"
              : "תהליך חדש"}
          </h2>
          <p>
            הודעה נכנסת נבדקת מול מילות
            המפתח. התאמה יכולה לשלוח הודעות Text,
            להציג Buttons, להתפצל לפי Condition או
            להעביר מיד לנציג במסלול Handoff בטוח.
          </p>

          {unsupportedDefinition ? (
            <div className="inline-notice warning">
              הגרסה כוללת מבנה Graph מתקדם שעדיין
              אינו ניתן לעריכה בעורך.
              הנתונים נשארו שמורים ללא שינוי.
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
                    מעבר לעורך Graph מלא
                  </button>
                  <small>
                    המעבר מאפשר חיבורים חופשיים בין כל
                    סוגי ה־Nodes. זהויות השמירה עדיין
                    נגזרות רק בשרת.
                  </small>
                </div>
              ) : null}

              {graphDraft ? (
                <>
                  <BotFlowGraphEditor
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
                      יש להשלים את כל התכנים והחיבורים,
                      להסיר Cycles ולחבר כל Node למסלול
                      הכניסה לפני השמירה.
                    </div>
                  ) : null}
                </>
              ) : handoffEnabled ? (
                <BotFlowHandoffEditor
                  handoffReason={handoffReason}
                  disabled={!canWrite}
                  focusOnMount={focusHandoffOnMount}
                  onReasonChange={changeHandoffReason}
                  onRemoveHandoff={removeHandoff}
                />
              ) : (
                <>
                  <BotFlowReplySequenceEditor
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
                        הוספת שאלת כפתורים
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
                        הוספת פיצול לפי תנאי
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
                        הוספת שתי שאלות עוקבות
                      </button>
                      <button
                        ref={addHandoffButtonRef}
                        type="button"
                        className="secondary-button bot-flow-add-handoff"
                        onClick={addHandoff}
                        disabled={!canWrite}
                      >
                        מעבר למסלול Handoff
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

        <BotFlowDraftPreview
          name={name}
          versionLabel={
            details
              ? `גרסה ${details.flow.latestVersionNumber}`
              : "טרם נשמר"
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
