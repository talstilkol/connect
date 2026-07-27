import type {
  AiReplyOutboxRepository,
} from "../../db/aiReplyOutboxRepository.ts";
import type {
  BotRuntimeRepository,
} from "../../db/botRuntimeRepository.ts";
import type {
  ActiveAiRuntimeAgentLoader,
} from "./activeAiRuntimeAgent.ts";
import type {
  AiRuntimeService,
} from "./aiRuntimeService.ts";
import {
  deriveAiReplyOutboxKey,
} from "./aiReplyOutboxKey.ts";

const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;
const MESSAGE_KEY_PATTERN =
  /^message_v1_[0-9a-f]{64}$/;
const PHONE_PATTERN =
  /^\+[1-9][0-9]{0,14}$/;
const MAXIMUM_MESSAGE_LENGTH = 4_096;

export type AiInboundRuntimeSkipReason =
  | "unsupported-message-content"
  | "conversation-not-found"
  | "conversation-ineligible"
  | "assignment-locked"
  | "no-active-agent"
  | "ambiguous-active-agent";

export type AiInboundRuntimeProcessorErrorCode =
  | "INVALID_INPUT"
  | "PERSISTENCE_FAILED"
  | "RUNTIME_FAILED";

export class AiInboundRuntimeProcessorError
  extends Error {
  readonly code:
    AiInboundRuntimeProcessorErrorCode;

  constructor(
    code: AiInboundRuntimeProcessorErrorCode,
  ) {
    super("Inbound AI runtime processing failed");
    this.name =
      "AiInboundRuntimeProcessorError";
    this.code = code;
  }
}

export interface ProcessInboundAiRuntimeInput {
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  recipientPhoneNumber: string;
  textContent: string | null;
  customerRequestedHuman: boolean;
}

export type ProcessInboundAiRuntimeResult =
  | {
      outcome: "skipped";
      reason: AiInboundRuntimeSkipReason;
    }
  | {
      outcome: "handoff-planned";
    }
  | {
      outcome: "reply-staged";
      persistenceOutcome:
        | "created"
        | "unchanged";
      approvalRequired: boolean;
    };

export interface AiInboundRuntimeProcessor {
  process(
    input: ProcessInboundAiRuntimeInput,
  ): Promise<ProcessInboundAiRuntimeResult>;
}

function processorError(
  code: AiInboundRuntimeProcessorErrorCode,
): AiInboundRuntimeProcessorError {
  return new AiInboundRuntimeProcessorError(
    code,
  );
}

function assertInput(
  input: ProcessInboundAiRuntimeInput,
): void {
  if (
    !Number.isSafeInteger(input.tenantId) ||
    input.tenantId <= 0 ||
    !CONVERSATION_KEY_PATTERN.test(
      input.conversationKey,
    ) ||
    !MESSAGE_KEY_PATTERN.test(
      input.inboundMessageKey,
    ) ||
    !PHONE_PATTERN.test(
      input.recipientPhoneNumber,
    ) ||
    typeof input.customerRequestedHuman !==
      "boolean" ||
    (input.textContent !== null &&
      (typeof input.textContent !== "string" ||
        input.textContent.trim().length === 0 ||
        input.textContent.length >
          MAXIMUM_MESSAGE_LENGTH))
  ) {
    throw processorError("INVALID_INPUT");
  }
}

export function createAiInboundRuntimeProcessor(
  conversations: BotRuntimeRepository,
  activeAgents: ActiveAiRuntimeAgentLoader,
  runtime: AiRuntimeService,
  outbox: AiReplyOutboxRepository,
): AiInboundRuntimeProcessor {
  return {
    async process(input) {
      assertInput(input);

      if (input.textContent === null) {
        return {
          outcome: "skipped",
          reason:
            "unsupported-message-content",
        };
      }

      let conversation;

      try {
        conversation =
          await conversations
            .findConversationState(
              input.tenantId,
              input.conversationKey,
            );
      } catch {
        throw processorError(
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
        conversation
          .assignedExternalUserId !== null
      ) {
        return {
          outcome: "skipped",
          reason: "assignment-locked",
        };
      }

      if (
        conversation.status !== "new" &&
        conversation.status !==
          "bot_active"
      ) {
        return {
          outcome: "skipped",
          reason: "conversation-ineligible",
        };
      }

      let activeAgent;

      try {
        activeAgent =
          await activeAgents.load(
            input.tenantId,
          );
      } catch {
        throw processorError(
          "PERSISTENCE_FAILED",
        );
      }

      if (
        activeAgent.outcome ===
        "unavailable"
      ) {
        return {
          outcome: "skipped",
          reason: activeAgent.reason,
        };
      }

      let existingReply;

      try {
        existingReply =
          await outbox
            .findByInboundMessage(
            input.tenantId,
            input.inboundMessageKey,
          );
      } catch {
        throw processorError(
          "PERSISTENCE_FAILED",
        );
      }

      if (existingReply) {
        return {
          outcome: "reply-staged",
          persistenceOutcome: "unchanged",
          approvalRequired:
            existingReply.responseMode ===
            "agent-approval",
        };
      }

      let plan;

      try {
        plan = await runtime.process({
          tenantId: input.tenantId,
          conversationKey:
            input.conversationKey,
          conversationVersion:
            conversation.version,
          inboundMessageKey:
            input.inboundMessageKey,
          customerMessage:
            input.textContent,
          customerRequestedHuman:
            input.customerRequestedHuman,
          agent: activeAgent.agent,
          version: activeAgent.version,
        });
      } catch {
        throw processorError(
          "RUNTIME_FAILED",
        );
      }

      if (
        plan.outcome ===
        "handoff-planned"
      ) {
        return {
          outcome: "handoff-planned",
        };
      }

      try {
        const outboxKey =
          await deriveAiReplyOutboxKey(
            input.tenantId,
            plan.requestKey,
          );
        const staged = await outbox.stage({
          outboxKey,
          requestKey: plan.requestKey,
          auditKey: plan.auditKey,
          tenantId: input.tenantId,
          conversationKey:
            input.conversationKey,
          inboundMessageKey:
            input.inboundMessageKey,
          aiAgentKey: plan.aiAgentKey,
          aiAgentVersionKey:
            plan.aiAgentVersionKey,
          expectedConversationVersion:
            conversation.version,
          recipientPhoneNumber:
            input.recipientPhoneNumber,
          responseMode:
            plan.responseMode,
          replyText: plan.text,
          groundedSourceKeys:
            plan.groundedSourceKeys,
          groundingScoreBasisPoints:
            plan.groundingScoreBasisPoints,
        });

        return {
          outcome: "reply-staged",
          persistenceOutcome:
            staged.outcome,
          approvalRequired:
            plan.approvalRequired,
        };
      } catch {
        throw processorError(
          "PERSISTENCE_FAILED",
        );
      }
    },
  };
}
