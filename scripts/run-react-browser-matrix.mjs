import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { acceptanceBrowserNames, browserEvidencePrefix, readAcceptanceBrowserName } from "./browser-acceptance.mjs";

export const acceptanceSuites = Object.freeze([
  "workspace-navigation", "ai-agent-editor", "clerk-workspace-language",
  "team-management", "business-profile", "contact-permissions", "meta-dialog",
  "template-campaign-demo", "import-inbox-demo", "knowledge-billing-demo", "tenant-reports-demo",
]);

export function acceptanceRunResult(engine, suite, result) {
  const output = result.stdout ?? "";
  const evidence = output.split(/\r?\n/).filter(line => line.startsWith(browserEvidencePrefix));
  let browser = null;
  if (evidence.length === 1) {
    try { browser = JSON.parse(evidence[0].slice(browserEvidencePrefix.length)); } catch { /* Failed evidence fails the run. */ }
  }
  const passed = result.status === 0 && !result.error && !result.signal
    && browser?.engine === engine && typeof browser.version === "string" && /^\d+(?:\.\d+)*$/.test(browser.version);
  return {
    engine, suite, status: passed ? "passed" : "failed",
    browserVersion: browser?.engine === engine ? browser.version ?? null : null,
    exitCode: result.status, signal: result.signal ?? null,
    error: result.error?.message ?? null, stdout: output, stderr: result.stderr ?? "",
  };
}

async function run() {
  if (process.argv.length > 2) throw new Error("React browser matrix accepts no command-line arguments; use CONNECT_E2E_BROWSER for a single-engine diagnostic run.");
  const projectRoot = fileURLToPath(new URL("../", import.meta.url));
  // A supplied engine narrows a diagnostic run. CI leaves this unset, requiring every suite in every engine.
  const engines = process.env.CONNECT_E2E_BROWSER === undefined
    ? acceptanceBrowserNames : [readAcceptanceBrowserName()];
  readAcceptanceBrowserName(); // Reject credentials before starting any child process.
  const runs = [];
  for (const engine of engines) {
    for (const suite of acceptanceSuites) {
      console.log(`React browser acceptance: ${engine} / ${suite}`);
      const result = spawnSync(process.execPath, [`scripts/run-${suite}-browser-e2e.mjs`], {
        cwd: projectRoot, env: { ...process.env, CONNECT_E2E_BROWSER: engine },
        encoding: "utf8", timeout: 180_000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024,
      });
      const record = acceptanceRunResult(engine, suite, result);
      runs.push(record);
      // Keep a compact engine/version record in CI logs. Full diagnostics stay
      // in the local report; this command does not publish or upload artifacts.
      console.log("CONNECT_BROWSER_RESULT " + JSON.stringify({ engine, suite,
        status: record.status, version: record.status === "passed" ? record.browserVersion : null }));
      if (record.status !== "passed") console.error(record.stderr || record.error || "Browser acceptance evidence is missing or mismatched.");
    }
  }
  const passed = runs.length === engines.length * acceptanceSuites.length
    && runs.every(record => record.status === "passed");
  const report = {
    schemaVersion: 1, status: passed ? "passed" : "failed",
    host: { platform: process.platform, architecture: process.arch, node: process.version },
    engines, expectedRuns: engines.length * acceptanceSuites.length, runs,
    scope: {
      realReactComponents: true, credentialsUsed: false, externalProviderAcceptance: false,
      mobileCoverage: "Workspace navigation and Meta dialog use a 390px-wide viewport and keyboard input; navigation also resizes to desktop and checks the built configuration-required AI layout at 320px. Component fixtures do not prove styled mobile layout or touch. Added demo journeys use explicit local accounts and action doubles; the Paddle SDK URL is fulfilled synthetically without external network.",
      physicalDeviceAcceptance: false, installedSafariOrChromeAcceptance: false,
      limitations: "Playwright browser engines on this host do not prove every operating system, touch device, authenticated flow or production service.",
    },
  };
  const reportFile = resolve(projectRoot, "output/playwright/react-browser-matrix.json");
  await mkdir(dirname(reportFile), { recursive: true });
  await writeFile(reportFile, JSON.stringify(report, null, 2) + "\n");
  console.log(`React browser matrix: ${passed ? "PASS" : "FAIL"} (${runs.filter(record => record.status === "passed").length}/${report.expectedRuns}); ${reportFile}`);
  if (!passed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run();
