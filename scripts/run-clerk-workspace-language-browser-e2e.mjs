import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const entry = "/__clerk-workspace-language-check.tsx";
const document = `<html><body><div id="root"></div><script type="module" src="${entry}"></script></body></html>`;
// Exercise the actual React bridge; the controls only select supported interface
// languages and mount/unmount the workspace. No Clerk account or product data.
const source = `
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ClerkWorkspaceLanguageContext, useClerkWorkspaceLanguage } from "/features/auth/ClerkWorkspaceLanguage.tsx";
function Bridge({ language }) { useClerkWorkspaceLanguage(language); return null; }
function Check() {
  const [language, setLanguage] = useState("en");
  const [active, setActive] = useState(true);
  const [selected, setSelected] = useState(null);
  return <>
    <output>{selected ?? "none"}</output>
    <select aria-label="language" value={language} onChange={event => setLanguage(event.target.value)}>
      {["he", "en", "ar"].map(value => <option key={value}>{value}</option>)}
    </select>
    <button onClick={() => setActive(value => !value)}>mount</button>
    <ClerkWorkspaceLanguageContext.Provider value={setSelected}>
      {active && <Bridge language={language} />}
    </ClerkWorkspaceLanguageContext.Provider>
    <Bridge language="he" />
  </>;
}
createRoot(document.getElementById("root")).render(<Check />);`;

const server = await createServer({
  root, configFile: false, appType: "custom",
  plugins: [react(), {
    name: "connect-clerk-workspace-language-acceptance",
    resolveId(id) { if (id === entry) return id; },
    load(id) { if (id === entry) return source; },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url !== "/") return next();
        response.setHeader("Content-Type", "text/html");
        response.end(await server.transformIndexHtml("/", document));
      });
    },
  }],
  server: { host: "127.0.0.1", port: 0 },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  const expectLanguage = (language) => page.waitForFunction(
    value => document.querySelector("output")?.textContent === value, language,
  );
  await expectLanguage("en");
  await page.getByLabel("language").selectOption("ar");
  await expectLanguage("ar");
  await page.getByRole("button", { name: "mount" }).click();
  await expectLanguage("none");
  await page.getByRole("button", { name: "mount" }).click();
  await expectLanguage("ar");
  await page.getByLabel("language").selectOption("he");
  await expectLanguage("he");
  assert.deepEqual(errors, []);
  console.log("Clerk workspace language browser acceptance passed: en/ar/he updates, unmount cleanup, remount, and no-provider rendering.");
} finally {
  await browser?.close();
  await server.close();
}
