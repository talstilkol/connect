import {
  KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT,
  type KeywordTwoStepButtonBranchDraft,
} from "./botFlowComposer.ts";
import {
  createBotFlowButtonMenuDraft,
  type BotFlowButtonMenuEditorDraft,
} from "./botFlowButtonMenuEditor.ts";

const DRAFT_BRANCH_KEY_PREFIX =
  "bot_two_step_branch_draft_v1_";
const DRAFT_BRANCH_KEY_PATTERN =
  /^bot_two_step_branch_draft_v1_([1-9][0-9]*)$/;

export interface BotFlowTwoStepButtonBranchEditorDraft {
  draftBranchKey: string;
  label: string;
  menu: BotFlowButtonMenuEditorDraft;
}

export interface BotFlowTwoStepButtonMenuEditorDraft {
  firstButtonText: string;
  branches: readonly BotFlowTwoStepButtonBranchEditorDraft[];
}

export type BotFlowTwoStepButtonBranchMoveDirection =
  | "up"
  | "down";

function branchKey(ordinal: number): string {
  return `${DRAFT_BRANCH_KEY_PREFIX}${ordinal}`;
}

function nextBranchOrdinal(
  branches: readonly BotFlowTwoStepButtonBranchEditorDraft[],
): number {
  return (
    branches.reduce((maximum, branch) => {
      const match = DRAFT_BRANCH_KEY_PATTERN.exec(
        branch.draftBranchKey,
      );
      const ordinal = match
        ? Number.parseInt(match[1], 10)
        : 0;

      return Math.max(maximum, ordinal);
    }, 0) + 1
  );
}

export function createBotFlowTwoStepButtonMenuDraft(
  firstButtonText: string,
  branches: readonly KeywordTwoStepButtonBranchDraft[],
): BotFlowTwoStepButtonMenuEditorDraft {
  if (
    branches.length >
    KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT
  ) {
    throw new Error(
      "Bot flow two-step button menu is too large",
    );
  }

  const initialBranches =
    branches.length === 0
      ? [
          {
            label: "",
            buttonText: "",
            options: [],
          },
        ]
      : branches;

  return {
    firstButtonText,
    branches: initialBranches.map(
      (branch, index) => ({
        draftBranchKey: branchKey(index + 1),
        label: branch.label,
        menu: createBotFlowButtonMenuDraft(
          branch.buttonText,
          branch.options,
        ),
      }),
    ),
  };
}

export function readBotFlowTwoStepButtonBranches(
  draft: BotFlowTwoStepButtonMenuEditorDraft,
): readonly KeywordTwoStepButtonBranchDraft[] {
  return draft.branches.map((branch) => ({
    label: branch.label,
    buttonText: branch.menu.buttonText,
    options: branch.menu.options.map(
      (option) => ({
        label: option.label,
        replyText: option.replyText,
      }),
    ),
  }));
}

export function updateBotFlowTwoStepFirstButtonText(
  draft: BotFlowTwoStepButtonMenuEditorDraft,
  firstButtonText: string,
): BotFlowTwoStepButtonMenuEditorDraft {
  return {
    ...draft,
    firstButtonText,
  };
}

export function updateBotFlowTwoStepBranchLabel(
  draft: BotFlowTwoStepButtonMenuEditorDraft,
  draftBranchKey: string,
  label: string,
): BotFlowTwoStepButtonMenuEditorDraft {
  return {
    ...draft,
    branches: draft.branches.map((branch) =>
      branch.draftBranchKey === draftBranchKey
        ? { ...branch, label }
        : branch,
    ),
  };
}

export function updateBotFlowTwoStepBranchMenu(
  draft: BotFlowTwoStepButtonMenuEditorDraft,
  draftBranchKey: string,
  menu: BotFlowButtonMenuEditorDraft,
): BotFlowTwoStepButtonMenuEditorDraft {
  return {
    ...draft,
    branches: draft.branches.map((branch) =>
      branch.draftBranchKey === draftBranchKey
        ? { ...branch, menu }
        : branch,
    ),
  };
}

export function appendBotFlowTwoStepBranch(
  draft: BotFlowTwoStepButtonMenuEditorDraft,
): BotFlowTwoStepButtonMenuEditorDraft {
  if (
    draft.branches.length >=
    KEYWORD_BUTTON_MENU_MAXIMUM_OPTION_COUNT
  ) {
    return draft;
  }

  return {
    ...draft,
    branches: [
      ...draft.branches,
      {
        draftBranchKey: branchKey(
          nextBranchOrdinal(draft.branches),
        ),
        label: "",
        menu: createBotFlowButtonMenuDraft("", []),
      },
    ],
  };
}

export function removeBotFlowTwoStepBranch(
  draft: BotFlowTwoStepButtonMenuEditorDraft,
  draftBranchKey: string,
): BotFlowTwoStepButtonMenuEditorDraft {
  if (draft.branches.length <= 1) {
    return draft;
  }

  return {
    ...draft,
    branches: draft.branches.filter(
      (branch) =>
        branch.draftBranchKey !==
        draftBranchKey,
    ),
  };
}

export function moveBotFlowTwoStepBranch(
  draft: BotFlowTwoStepButtonMenuEditorDraft,
  draftBranchKey: string,
  direction:
    BotFlowTwoStepButtonBranchMoveDirection,
): BotFlowTwoStepButtonMenuEditorDraft {
  const currentIndex = draft.branches.findIndex(
    (branch) =>
      branch.draftBranchKey === draftBranchKey,
  );
  const targetIndex =
    direction === "up"
      ? currentIndex - 1
      : currentIndex + 1;

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= draft.branches.length
  ) {
    return draft;
  }

  const branches = [...draft.branches];
  const [branch] = branches.splice(
    currentIndex,
    1,
  );
  branches.splice(targetIndex, 0, branch);

  return {
    ...draft,
    branches,
  };
}
