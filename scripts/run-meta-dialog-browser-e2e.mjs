import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { launchAcceptanceBrowser, restrictAcceptancePage } from "./browser-acceptance.mjs";

// Render the actual unconfigured Meta panel. There are no credentials, provider
// requests, user records, or successful server actions in this keyboard check.
const root = fileURLToPath(new URL("../", import.meta.url));
const entry = "/__meta-dialog-keyboard-check.tsx";
const actionsId = "\0connect-meta-dialog-test-actions";
const navigationId = "\0connect-meta-dialog-test-navigation";
const document = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><div id="root"></div><script type="module" src="${entry}"></script></body></html>`;
const source = `
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MetaConnectionPanel } from "/features/workspace/MetaConnectionPanel.tsx";
function Check() {
  const [open, setOpen] = useState(false);
  const language = new URLSearchParams(location.search).get("lang") ?? "en";
  return <>
    <button id="opener" onClick={() => setOpen(true)}>Open connection panel</button>
    {open && <MetaConnectionPanel language={language}
      connection={{status:"configuration-required"}}
      embeddedSignup={{status:"configuration-required"}}
      onClose={() => setOpen(false)} />}
  </>;
}
createRoot(document.getElementById("root")).render(<Check />);`;

const server = await createServer({
  root, configFile: false, envFile: false, appType: "custom", logLevel: "error",
  plugins: [{
    name: "connect-meta-dialog-keyboard-acceptance", enforce: "pre",
    resolveId(id) {
      if (id === entry) return id;
      if (id === "next/navigation") return navigationId;
      if (id === "../../server/meta/metaEmbeddedSignupActions") return actionsId;
    },
    load(id) {
      if (id === entry) return source;
      if (id === navigationId) return "export function useRouter(){return {refresh(){throw Error('Unexpected router refresh')}}}";
      if (id === actionsId) return `
        export async function beginMetaEmbeddedSignupAction(){throw Error("Unexpected provider action")}
        export async function completeMetaEmbeddedSignupAction(){throw Error("Unexpected provider action")}`;
    },
    configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        if (new URL(request.url, "http://localhost").pathname !== "/") return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(await vite.transformIndexHtml("/", document));
      });
    },
  }, react()],
  server: { host: "127.0.0.1", port: 0 },
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await launchAcceptanceBrowser();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (new URL(request.url()).origin !== origin) externalRequests.push(request.url());
  });
  await restrictAcceptancePage(page, origin);
  const focused = locator => locator.evaluate(element => element === document.activeElement);

  for (const language of ["en", "he", "ar"]) {
    await page.goto(`${origin}/?lang=${language}`);
    const opener = page.locator("#opener");
    // Keyboard activation keeps opener restoration deterministic across engines;
    // WebKit intentionally does not focus buttons on pointer activation.
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    const close = dialog.locator(".close-button");
    const summary = dialog.locator("details > summary");
    const footerClose = dialog.locator(".panel-footer .secondary-button");
    await page.waitForFunction(() => document.activeElement?.matches(".close-button"));

    await page.keyboard.press("Tab");
    assert.equal(await focused(dialog.locator('input[value="cloud-api"]')), true,
      `${language}: native Tab reaches the enabled selected flow`);
    await page.keyboard.press("Tab");
    assert.equal(await focused(summary), true, `${language}: native Tab reaches the summary`);
    await page.keyboard.press("Tab");
    assert.equal(await focused(footerClose), true,
      `${language}: Tab from summary must continue to the footer`);

    await page.keyboard.press("Shift+Tab");
    assert.equal(await focused(summary), true, `${language}: reverse Tab reaches the summary`);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await focused(dialog.locator('input[value="cloud-api"]')), true,
      `${language}: reverse Tab from summary returns to the flow choice`);

    await summary.focus();
    await page.keyboard.press("Enter");
    assert.equal(await summary.evaluate(element => element.parentElement.open), true,
      `${language}: keyboard opens the details disclosure`);
    await page.keyboard.press("Tab");
    assert.equal(await focused(footerClose), true, `${language}: expanded details preserve traversal`);
    await page.keyboard.press("Tab");
    assert.equal(await focused(close), true, `${language}: final Tab wraps to the close button`);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await focused(footerClose), true, `${language}: first reverse Tab wraps to the footer`);
    await page.keyboard.press("Escape");
    assert.equal(await dialog.count(), 0, `${language}: Escape closes the panel`);
    assert.equal(await focused(opener), true, `${language}: closing restores the opener`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  console.log("Meta dialog browser acceptance passed: en/he/ar, native summary traversal in both directions, disclosure, focus wrap, Escape and opener restoration; no external requests.");
} finally {
  await browser?.close();
  await server.close();
}
