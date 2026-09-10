import type {
  ValidatedBotFlowDefinition,
} from "../domain/botFlow.ts";
import type {
  BotFlowDefinitionIssue,
} from "./botFlowDefinition.ts";

export const WHATSAPP_REPLY_BUTTON_MAXIMUM_COUNT = 3;
export const WHATSAPP_REPLY_BUTTON_LABEL_MAXIMUM_LENGTH = 20;

export type WhatsappBotFlowPublicationValidation =
  | { success: true }
  | {
      success: false;
      issues: readonly BotFlowDefinitionIssue[];
    };

/**
 * Validates transport compatibility without changing a valid editable graph.
 * Connect does not silently convert reply buttons into list messages.
 */
export function validateWhatsappBotFlowPublication(
  definition: ValidatedBotFlowDefinition,
): WhatsappBotFlowPublicationValidation {
  const issues = new Set<BotFlowDefinitionIssue>();

  for (const block of definition.blocks) {
    if (block.type !== "buttons") {
      continue;
    }

    if (
      block.options.length >
        WHATSAPP_REPLY_BUTTON_MAXIMUM_COUNT
    ) {
      issues.add(
        "whatsapp-button-count-exceeded",
      );
    }

    if (
      block.options.some(
        (option) =>
          option.label.length >
          WHATSAPP_REPLY_BUTTON_LABEL_MAXIMUM_LENGTH,
      )
    ) {
      issues.add(
        "whatsapp-button-label-too-long",
      );
    }
  }

  return issues.size === 0
    ? { success: true }
    : {
        success: false,
        issues: [...issues],
      };
}
