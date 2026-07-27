import type {
  BotFlowBlock,
  BotFlowStatus,
  BotFlowTerminalEffect,
} from "../../shared/domain/botFlow.ts";

export type BotFlowLifecycleAction =
  | "publish"
  | "deactivate"
  | "activate";

const botFlowStatusTransitions: Readonly<
  Record<
    BotFlowStatus,
    Partial<
      Record<
        BotFlowLifecycleAction,
        BotFlowStatus
      >
    >
  >
> = {
  draft: {
    publish: "active",
  },
  active: {
    deactivate: "inactive",
  },
  inactive: {
    activate: "active",
  },
};

export function resolveBotFlowStatusTransition(
  currentStatus: BotFlowStatus,
  action: BotFlowLifecycleAction,
): BotFlowStatus | null {
  return (
    botFlowStatusTransitions[currentStatus][
      action
    ] ?? null
  );
}

export function resolveBotFlowTerminalEffect(
  block: Extract<
    BotFlowBlock,
    { type: "handoff" }
  >,
): Extract<
  BotFlowTerminalEffect,
  { outcome: "handoff" }
>;
export function resolveBotFlowTerminalEffect(
  block: Extract<
    BotFlowBlock,
    { type: "end" }
  >,
): Extract<
  BotFlowTerminalEffect,
  { outcome: "end" }
>;
export function resolveBotFlowTerminalEffect(
  block: Extract<
    BotFlowBlock,
    { type: "handoff" | "end" }
  >,
): BotFlowTerminalEffect {
  if (block.type === "handoff") {
    return {
      outcome: "handoff",
      stopExecution: true,
      conversationStatus: "waiting_for_agent",
      assignmentAction: "none",
      reason: block.reason,
    };
  }

  return {
    outcome: "end",
    stopExecution: true,
    conversationStatus: null,
    assignmentAction: "none",
  };
}
