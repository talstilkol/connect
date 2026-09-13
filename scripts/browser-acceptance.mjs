import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { chromium, firefox, webkit } from "playwright";

export const acceptanceBrowserNames = Object.freeze(["chromium", "firefox", "webkit"]);
const browserTypes = { chromium, firefox, webkit };
export const browserEvidencePrefix = "CONNECT_BROWSER_ACCEPTANCE ";

export function readAcceptanceBrowserName(environment = process.env) {
  const name = environment.CONNECT_E2E_BROWSER ?? "chromium";
  if (!acceptanceBrowserNames.includes(name)) {
    throw new Error("CONNECT_E2E_BROWSER must be chromium, firefox or webkit; no browser substitution is permitted.");
  }
  for (const key of ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]) {
    if (environment[key]?.trim()) {
      throw new Error("Run fixture browser acceptance without Clerk credentials.");
    }
  }
  return name;
}

export async function launchAcceptanceBrowser(environment = process.env) {
  const engine = readAcceptanceBrowserName(environment);
  const browserType = browserTypes[engine];
  try {
    await access(browserType.executablePath(), constants.R_OK);
  } catch (cause) {
    throw new Error(`The locked ${engine} browser is unavailable. Run: node node_modules/playwright/cli.js install ${engine}`, { cause });
  }
  const browser = await browserType.launch({ headless: true });
  console.log(browserEvidencePrefix + JSON.stringify({ engine, version: browser.version() }));
  return browser;
}

export async function restrictAcceptancePage(page, origin) {
  const allowed = new URL(origin);
  if (allowed.protocol !== "http:" || allowed.hostname !== "127.0.0.1" || allowed.origin !== origin) {
    throw new Error("Browser acceptance requires the exact loopback HTTP origin of its owned server.");
  }
  // Match the port as well: another local application is outside this harness.
  await page.route("**/*", (route) => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
}
