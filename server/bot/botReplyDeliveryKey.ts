import type {
  BotReplyPayload,
} from "../../shared/domain/botReplyDelivery.ts";
import type {
  BotFlowReply,
} from "./botFlowRuntime.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

const CONVERSATION_KEY_PATTERN =
  /^conversation_v1_[0-9a-f]{64}$/;
const MESSAGE_KEY_PATTERN =
  /^message_v1_[0-9a-f]{64}$/;
const BOT_FLOW_VERSION_KEY_PATTERN =
  /^bot_flow_version_v1_[0-9a-f]{64}$/;

export function toBotReplyPayload(
  reply: BotFlowReply,
): BotReplyPayload {
  if (reply.kind === "text") {
    return {
      kind: "text",
      text: reply.text,
    };
  }

  return {
    kind: "buttons",
    text: reply.text,
    options: reply.options.map((option) => ({
      optionKey: option.optionKey,
      label: option.label,
    })),
  };
}

export async function deriveBotReplyDeliveryKey(
  tenantId: number,
  input: {
    conversationKey: string;
    inboundMessageKey: string;
    botFlowVersionKey: string;
    replyIndex: number;
    reply: BotReplyPayload;
  },
): Promise<string> {
  if (
    !Number.isSafeInteger(tenantId) ||
    tenantId <= 0 ||
    !CONVERSATION_KEY_PATTERN.test(
      input.conversationKey,
    ) ||
    !MESSAGE_KEY_PATTERN.test(
      input.inboundMessageKey,
    ) ||
    !BOT_FLOW_VERSION_KEY_PATTERN.test(
      input.botFlowVersionKey,
    ) ||
    !Number.isSafeInteger(input.replyIndex) ||
    input.replyIndex <= 0
  ) {
    throw new Error(
      "bot reply delivery identity is invalid",
    );
  }

  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "bot_reply_delivery_v1",
        tenantId,
        conversationKey:
          input.conversationKey,
        inboundMessageKey:
          input.inboundMessageKey,
        botFlowVersionKey:
          input.botFlowVersionKey,
        replyIndex: input.replyIndex,
        reply: input.reply,
      }),
    ),
  );

  return `bot_reply_delivery_v1_${digest}`;
}
