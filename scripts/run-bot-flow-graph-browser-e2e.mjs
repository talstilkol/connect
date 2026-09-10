import assert from "node:assert/strict";
import {
  fileURLToPath,
} from "node:url";

import react from "@vitejs/plugin-react";
import {
  chromium,
} from "playwright";
import {
  createServer,
} from "vite";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const harnessPath =
  "/__bot-flow-graph-browser-e2e";
const harnessDocument = `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bot Flow Graph Browser E2E</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/scripts/bot-flow-graph-browser-harness.tsx"></script>
  </body>
</html>`;

function createHarnessPlugin() {
  return {
    name: "connect-bot-flow-graph-browser-harness",
    configureServer(server) {
      server.middlewares.use(
        async (request, response, next) => {
          if (
            request.url !== harnessPath &&
            request.url !== `${harnessPath}/`
          ) {
            next();
            return;
          }

          response.statusCode = 200;
          response.setHeader(
            "Content-Type",
            "text/html; charset=utf-8",
          );
          response.setHeader(
            "Cache-Control",
            "no-store",
          );
          response.end(
            await server.transformIndexHtml(
              request.url,
              harnessDocument,
            ),
          );
        },
      );
    },
  };
}

function requireServerPort(server) {
  const address = server.httpServer?.address();

  if (
    !address ||
    typeof address === "string" ||
    !Number.isSafeInteger(address.port) ||
    address.port <= 0
  ) {
    throw new Error(
      "BOT_FLOW_GRAPH_BROWSER_SERVER_UNAVAILABLE",
    );
  }

  return address.port;
}

async function readDraft(page) {
  const serialized = await page
    .locator("[data-e2e-graph-state]")
    .textContent();

  if (!serialized) {
    throw new Error(
      "BOT_FLOW_GRAPH_BROWSER_STATE_MISSING",
    );
  }

  return JSON.parse(serialized);
}

function nodeCard(page, draftNodeKey) {
  return page
    .locator(
      `[data-graph-node-key="${draftNodeKey}"]`,
    )
    .locator("..")
    .locator("..");
}

async function assertFocusedNode(
  page,
  draftNodeKey,
) {
  await page.waitForFunction(
    (nodeKey) =>
      document.activeElement?.getAttribute(
        "data-graph-node-key",
      ) === nodeKey,
    draftNodeKey,
  );
}

async function addNode(page, typeLabel) {
  const before = await readDraft(page);

  await page
    .getByRole("button", {
      name: `הוספת ${typeLabel}`,
      exact: true,
    })
    .click();
  await page.waitForFunction(
    (nodeCount) =>
      document.querySelector(
        "[data-e2e-graph-state]",
      )?.getAttribute("data-node-count") ===
      String(nodeCount),
    before.nodes.length + 1,
  );

  const after = await readDraft(page);
  const added = after.nodes.at(-1);

  assert.ok(added);
  await assertFocusedNode(page, added.draftNodeKey);
  return added;
}

async function runBrowserAcceptance() {
  const browserErrors = [];
  const server = await createServer({
    appType: "custom",
    configFile: false,
    root: projectRoot,
    plugins: [react(), createHarnessPlugin()],
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
  });
  let browser;

  try {
    await server.listen();
    const port = requireServerPort(server);
    browser = await chromium.launch({
      headless: true,
    });
    const page = await browser.newPage({
      locale: "he-IL",
      viewport: {
        width: 1_440,
        height: 1_000,
      },
    });

    page.on("pageerror", (error) => {
      browserErrors.push(error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        browserErrors.push(message.text());
      }
    });

    await page.goto(
      `http://127.0.0.1:${port}${harnessPath}`,
      { waitUntil: "networkidle" },
    );
    await page
      .getByRole("group", {
        name: "עורך Graph מלא",
      })
      .waitFor();

    const initial = await readDraft(page);

    assert.deepEqual(
      initial.nodes.map((node) => node.type),
      ["text", "end"],
    );
    await assertFocusedNode(
      page,
      initial.entryDraftNodeKey,
    );

    const buttons = await addNode(page, "Buttons");
    const condition = await addNode(
      page,
      "Condition",
    );
    const handoff = await addNode(page, "Handoff");
    const addedText = await addNode(page, "Text");
    const addedEnd = await addNode(page, "End");

    assert.deepEqual(
      (await readDraft(page)).nodes.map(
        (node) => node.type,
      ),
      [
        "text",
        "end",
        "buttons",
        "condition",
        "handoff",
        "text",
        "end",
      ],
    );

    const buttonsCard = nodeCard(
      page,
      buttons.draftNodeKey,
    );

    await buttonsCard
      .getByRole("button", {
        name: "הוספת אפשרות",
      })
      .click();
    await page.waitForFunction(
      (nodeKey) => {
        const state = document.querySelector(
          "[data-e2e-graph-state]",
        )?.textContent;

        if (!state) {
          return false;
        }

        const draft = JSON.parse(state);
        return (
          draft.nodes.find(
            (node) =>
              node.draftNodeKey === nodeKey,
          )?.options.length === 2
        );
      },
      buttons.draftNodeKey,
    );
    await buttonsCard
      .getByRole("button", {
        name: "מחק את אפשרות 2",
      })
      .click();
    await assertFocusedNode(
      page,
      buttons.draftNodeKey,
    );

    const beforeKeyboardMove = await readDraft(page);
    const handoffIndex =
      beforeKeyboardMove.nodes.findIndex(
        (node) =>
          node.draftNodeKey ===
          handoff.draftNodeKey,
      );
    const handoffCard = nodeCard(
      page,
      handoff.draftNodeKey,
    );
    const moveUpButton = handoffCard.getByRole(
      "button",
      { name: /למעלה/ },
    );

    await moveUpButton.focus();
    await page.keyboard.press("Enter");
    const afterKeyboardMove = await readDraft(page);

    assert.equal(
      afterKeyboardMove.nodes[
        handoffIndex - 1
      ].draftNodeKey,
      handoff.draftNodeKey,
    );
    await page
      .getByRole("status")
      .filter({ hasText: "הועבר למעלה" })
      .waitFor();

    const textCard = nodeCard(
      page,
      addedText.draftNodeKey,
    );
    const conditionCard = nodeCard(
      page,
      condition.draftNodeKey,
    );
    const conditionIndex = (
      await readDraft(page)
    ).nodes.findIndex(
      (node) =>
        node.draftNodeKey ===
        condition.draftNodeKey,
    );

    await textCard.dragTo(conditionCard);
    assert.equal(
      (await readDraft(page)).nodes[conditionIndex]
        .draftNodeKey,
      addedText.draftNodeKey,
    );

    await nodeCard(page, addedText.draftNodeKey)
      .getByLabel("ה־Node הבא")
      .selectOption(handoff.draftNodeKey);
    assert.equal(
      (await readDraft(page)).nodes.find(
        (node) =>
          node.draftNodeKey ===
          addedText.draftNodeKey,
      )?.nextDraftNodeKey,
      handoff.draftNodeKey,
    );

    const endCard = nodeCard(
      page,
      addedEnd.draftNodeKey,
    );

    await endCard
      .getByRole("button", {
        name: "מחיקת Node",
      })
      .click();
    assert.equal(
      (await readDraft(page)).nodes.some(
        (node) =>
          node.draftNodeKey ===
          addedEnd.draftNodeKey,
      ),
      false,
    );
    assert.equal(
      await page.locator(
        "[data-graph-node-key]:focus",
      ).count(),
      1,
    );

    const currentEntryCard = nodeCard(
      page,
      initial.entryDraftNodeKey,
    );

    assert.equal(
      await currentEntryCard
        .getByRole("button", {
          name: "מחיקת Node",
        })
        .isDisabled(),
      true,
    );
    await currentEntryCard
      .getByText(
        "כדי למחוק Node זה יש לבחור קודם Node כניסה אחר.",
      )
      .waitFor();

    assert.equal(
      await page
        .locator(
          ".bot-flow-graph-preview-connections",
        )
        .isVisible(),
      true,
    );
    assert.ok(
      await page
        .locator(
          ".bot-flow-graph-preview-connections span",
        )
        .count() >= 3,
    );
    assert.equal(
      await page
        .locator(".bot-flow-preview[aria-hidden=true]")
        .count(),
      1,
    );
    assert.equal(
      await page
        .locator(".flow-canvas .sr-only")
        .count(),
      1,
    );
    assert.equal(condition.type, "condition");
    assert.deepEqual(browserErrors, []);

    console.log(
      "Bot Flow Graph Browser E2E: PASS (all node types, keyboard, drag-and-drop, connections, deletion, preview)",
    );
  } finally {
    await browser?.close();
    await server.close();
  }
}

await runBrowserAcceptance();
