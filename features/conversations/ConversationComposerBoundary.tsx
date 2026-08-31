import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import {
  readConversationMessages,
} from "./conversationMessages.ts";

export function ConversationComposerBoundary({
  language,
}: {
  language: InterfaceLanguage;
}) {
  const message =
    readConversationMessages(language).composerBoundary;

  return (
    <footer className="outbound-boundary">
      <span aria-hidden="true">i</span>
      <p>{message}</p>
    </footer>
  );
}
