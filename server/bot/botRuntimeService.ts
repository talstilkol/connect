import type {
  BotFlowRepository,
} from "../../db/botFlowRepository.ts";
import type {
  BotRuntimeConversationState,
  BotRuntimeRepository,
} from "../../db/botRuntimeRepository.ts";
import type {
  PersistedBotFlow,
  PersistedBotFlowVersion,
} from "../../shared/domain/botFlow.ts";
import {
  deriveBotFlowKey,
  deriveBotFlowVersionKey,
} from "./botFlowKey.ts";
import {
  BotFlowRuntimeError,
  executeBotFlowTurn,
  type BotFlowExecutionPlan,
} from "./botFlowRuntime.ts";

const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;

export type BotRuntimeServiceErrorCode =
  | "INVALID_INPUT"
  | "FLOW_CONFIGURATION_INVALID"
  | "PERSISTENCE_FAILED";

export class BotRuntimeServiceError extends Error {
  readonly code: BotRuntimeServiceErrorCode;

  constructor(code: BotRuntimeServiceErrorCode) {
    super("Bot runtime service failed");
    this.name = "BotRuntimeServiceError";
    this.code = code;
  }
}

export type BotRuntimeSkipReason =
  | "conversation-not-found"
  | "conversation-ineligible"
  | "assignment-locked"
  | "no-active-flow"
  | "ambiguous-active-flow";

export type ProcessBotRuntimeResult =
  | {
      outcome: "skipped";
      reason: BotRuntimeSkipReason;
    }
  | {
      outcome: "planned";
      botFlowKey: string;
      botFlowVersionKey: string;
      conversationVersion: number;
      plan: Exclude<
        BotFlowExecutionPlan,
        { outcome: "handoff" }
      >;
    }
  | {
      outcome: "handoff-applied";
      persistenceOutcome:
        | "updated"
        | "unchanged";
      botFlowKey: string;
      botFlowVersionKey: string;
      conversation: BotRuntimeConversationState;
      plan: Extract<
        BotFlowExecutionPlan,
        { outcome: "handoff" }
      >;
    }
  | {
      outcome: "conflict";
      reason: "conversation-state-changed";
    };

export interface BotRuntimeService {
  processInbound(
    tenantId: number,
    conversationKey: string,
    lastInboundText: string | null,
  ): Promise<ProcessBotRuntimeResult>;
}

function serviceError(
  code: BotRuntimeServiceErrorCode,
): BotRuntimeServiceError {
  return new BotRuntimeServiceError(code);
}

function assertInput(
  tenantId: number,
  conversationKey: string,
  lastInboundText: string | null,
): void {
  if (
    !Number.isSafeInteger(tenantId) ||
    tenantId <= 0 ||
    !CONVERSATION_KEY_PATTERN.test(
      conversationKey,
    ) ||
    (lastInboundText !== null &&
      (typeof lastInboundText !== "string" ||
        lastInboundText.trim().length ===
          0 ||
        lastInboundText.length > 4_096))
  ) {
    throw serviceError("INVALID_INPUT");
  }
}

async function assertActiveRuntimeIdentity(
  tenantId: number,
  flow: PersistedBotFlow,
  version: PersistedBotFlowVersion,
): Promise<void> {
  let expectedFlowKey: string;
  let expectedVersionKey: string;

  try {
    expectedFlowKey =
      await deriveBotFlowKey(
        tenantId,
        version.definition.name,
      );
    expectedVersionKey =
      await deriveBotFlowVersionKey(
        tenantId,
        flow.botFlowKey,
        version.versionNumber,
        version.definition,
      );
  } catch {
    throw serviceError(
      "FLOW_CONFIGURATION_INVALID",
    );
  }

  if (
    flow.tenantId !== tenantId ||
    version.tenantId !== tenantId ||
    flow.status !== "active" ||
    flow.activeVersionKey === null ||
    flow.activeVersionKey !==
      version.botFlowVersionKey ||
    version.botFlowKey !== flow.botFlowKey ||
    flow.name !== version.definition.name ||
    version.status !== "published" ||
    expectedFlowKey !== flow.botFlowKey ||
    expectedVersionKey !==
      version.botFlowVersionKey
  ) {
    throw serviceError(
      "FLOW_CONFIGURATION_INVALID",
    );
  }
}

function isEligibleConversation(
  state: BotRuntimeConversationState,
): boolean {
  return (
    state.status === "new" ||
    state.status === "bot_active"
  );
}

export function createBotRuntimeService(
  flows: BotFlowRepository,
  runtime: BotRuntimeRepository,
): BotRuntimeService {
  return {
    async processInbound(
      tenantId,
      conversationKey,
      lastInboundText,
    ) {
      assertInput(
        tenantId,
        conversationKey,
        lastInboundText,
      );

      let conversation:
        | BotRuntimeConversationState
        | null;

      try {
        conversation =
          await runtime.findConversationState(
            tenantId,
            conversationKey,
          );
      } catch {
        throw serviceError(
          "PERSISTENCE_FAILED",
        );
      }

      if (!conversation) {
        return {
          outcome: "skipped",
          reason: "conversation-not-found",
        };
      }

      if (
        conversation.assignedExternalUserId !==
        null
      ) {
        return {
          outcome: "skipped",
          reason: "assignment-locked",
        };
      }

      if (!isEligibleConversation(conversation)) {
        return {
          outcome: "skipped",
          reason: "conversation-ineligible",
        };
      }

      let activeFlows:
        readonly PersistedBotFlow[];

      try {
        activeFlows =
          await flows.listActiveByTenant(
            tenantId,
            2,
          );
      } catch {
        throw serviceError(
          "PERSISTENCE_FAILED",
        );
      }

      if (activeFlows.length === 0) {
        return {
          outcome: "skipped",
          reason: "no-active-flow",
        };
      }

      if (activeFlows.length > 1) {
        return {
          outcome: "skipped",
          reason: "ambiguous-active-flow",
        };
      }

      const flow = activeFlows[0];

      if (flow.activeVersionKey === null) {
        throw serviceError(
          "FLOW_CONFIGURATION_INVALID",
        );
      }

      let version:
        | PersistedBotFlowVersion
        | null;

      try {
        version =
          await flows.findVersionByKey(
            tenantId,
            flow.botFlowKey,
            flow.activeVersionKey,
          );
      } catch {
        throw serviceError(
          "PERSISTENCE_FAILED",
        );
      }

      if (!version) {
        throw serviceError(
          "FLOW_CONFIGURATION_INVALID",
        );
      }

      await assertActiveRuntimeIdentity(
        tenantId,
        flow,
        version,
      );

      let plan: BotFlowExecutionPlan;

      try {
        plan = executeBotFlowTurn(
          version.definition,
          {
            lastInboundText,
            conversationStatus:
              conversation.status,
          },
        );
      } catch (error) {
        if (error instanceof BotFlowRuntimeError) {
          if (error.code === "INVALID_INPUT") {
            throw serviceError(
              "INVALID_INPUT",
            );
          }

          throw serviceError(
            "FLOW_CONFIGURATION_INVALID",
          );
        }

        throw error;
      }

      if (plan.outcome !== "handoff") {
        return {
          outcome: "planned",
          botFlowKey: flow.botFlowKey,
          botFlowVersionKey:
            version.botFlowVersionKey,
          conversationVersion:
            conversation.version,
          plan,
        };
      }

      if (plan.replies.length > 0) {
        throw serviceError(
          "FLOW_CONFIGURATION_INVALID",
        );
      }

      let handoff;

      try {
        handoff = await runtime.applyHandoff(
          tenantId,
          conversationKey,
          conversation.version,
        );
      } catch {
        throw serviceError(
          "PERSISTENCE_FAILED",
        );
      }

      if (
        handoff.outcome === "updated" ||
        handoff.outcome === "unchanged"
      ) {
        return {
          outcome: "handoff-applied",
          persistenceOutcome:
            handoff.outcome,
          botFlowKey: flow.botFlowKey,
          botFlowVersionKey:
            version.botFlowVersionKey,
          conversation: handoff.state,
          plan,
        };
      }

      if (handoff.outcome === "locked") {
        return {
          outcome: "skipped",
          reason: "assignment-locked",
        };
      }

      if (handoff.outcome === "not-found") {
        return {
          outcome: "skipped",
          reason: "conversation-not-found",
        };
      }

      if (
        handoff.outcome === "invalid-state"
      ) {
        return {
          outcome: "skipped",
          reason: "conversation-ineligible",
        };
      }

      return {
        outcome: "conflict",
        reason: "conversation-state-changed",
      };
    },
  };
}
