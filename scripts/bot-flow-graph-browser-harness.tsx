import {
  useState,
} from "react";
import {
  createRoot,
} from "react-dom/client";

import "../app/globals.css";
import {
  BotFlowDraftPreview,
} from "../features/bot/BotFlowDraftPreview";
import {
  BotFlowGraphEditor,
} from "../features/bot/BotFlowGraphEditor";
import {
  createBotFlowGraphEditorDraft,
  isBotFlowGraphEditorDraftComplete,
  type BotFlowGraphEditorDraft,
} from "../shared/domain/botFlowGraphEditor";

function BotFlowGraphBrowserHarness() {
  const [draft, setDraft] =
    useState<BotFlowGraphEditorDraft>(() =>
      createBotFlowGraphEditorDraft(),
    );
  const [announcement, setAnnouncement] =
    useState("");

  return (
    <main className="bot-flow-browser-harness">
      <h1>Browser E2E — עורך Graph</h1>
      <output
        hidden
        data-e2e-graph-state
        data-node-count={draft.nodes.length}
        data-entry-node-key={
          draft.entryDraftNodeKey
        }
        data-complete={
          isBotFlowGraphEditorDraftComplete(draft)
            ? "true"
            : "false"
        }
      >
        {JSON.stringify(draft)}
      </output>
      <p role="status" aria-live="polite">
        {announcement}
      </p>
      <BotFlowGraphEditor
        draft={draft}
        disabled={false}
        focusOnMount
        onChange={setDraft}
        onAnnouncement={setAnnouncement}
      />
      <BotFlowDraftPreview
        name=""
        versionLabel="טרם נשמר"
        keywords={[]}
        matchMode="exact"
        replySteps={[]}
        buttonMenu={null}
        twoStepButtonMenu={null}
        graphDraft={draft}
        condition={null}
        handoffReason={null}
      />
    </main>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("BOT_FLOW_GRAPH_BROWSER_ROOT_MISSING");
}

createRoot(rootElement).render(
  <BotFlowGraphBrowserHarness />,
);
