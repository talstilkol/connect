import type {
  BotReplyProcessor,
} from "../../shared/domain/botReplyDelivery.ts";

export function createUnavailableBotReplyProcessor(): BotReplyProcessor {
  return {
    isConfigured() {
      return false;
    },

    async process() {
      throw new Error(
        "Bot reply processor is not configured",
      );
    },
  };
}
