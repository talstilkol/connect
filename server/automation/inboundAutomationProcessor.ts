import type {
  ProcessInboundBotRuntimeInput,
  ProcessInboundBotRuntimeResult,
  BotInboundRuntimeProcessor,
} from "../bot/botInboundRuntimeProcessor.ts";
import type {
  AiInboundRuntimeProcessor,
  ProcessInboundAiRuntimeResult,
} from "../ai/aiInboundRuntimeProcessor.ts";
import {
  customerRequestedHuman,
} from "./customerHandoffIntent.ts";

export type InboundAutomationResult =
  | {
      outcome: "bot";
      result:
        ProcessInboundBotRuntimeResult;
    }
  | {
      outcome: "ai";
      result:
        ProcessInboundAiRuntimeResult;
    }
  | {
      outcome: "skipped";
      reason:
        | "bot-conflict"
        | "bot-ineligible"
        | "ai-unavailable";
    };

export interface InboundAutomationProcessor {
  process(
    input: ProcessInboundBotRuntimeInput,
  ): Promise<InboundAutomationResult>;
}

export function createInboundAutomationProcessor(
  bot: BotInboundRuntimeProcessor,
  ai: AiInboundRuntimeProcessor,
): InboundAutomationProcessor {
  return {
    async process(input) {
      const botResult =
        await bot.process(input);

      if (
        botResult.runtimeOutcome ===
          "planned" ||
        botResult.runtimeOutcome ===
          "handoff-applied"
      ) {
        return {
          outcome: "bot",
          result: botResult,
        };
      }

      if (
        botResult.runtimeOutcome ===
        "conflict"
      ) {
        return {
          outcome: "skipped",
          reason: "bot-conflict",
        };
      }

      if (
        botResult.runtimeSkipReason !==
        "no-active-flow"
      ) {
        return {
          outcome: "skipped",
          reason: "bot-ineligible",
        };
      }

      const aiResult = await ai.process({
        tenantId: input.tenantId,
        conversationKey:
          input.conversationKey,
        inboundMessageKey:
          input.inboundMessageKey,
        recipientPhoneNumber:
          input.recipientPhoneNumber,
        textContent: input.textContent,
        customerRequestedHuman:
          customerRequestedHuman(
            input.textContent,
          ),
      });

      if (aiResult.outcome === "skipped") {
        return {
          outcome: "skipped",
          reason: "ai-unavailable",
        };
      }

      return {
        outcome: "ai",
        result: aiResult,
      };
    },
  };
}
