import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { launchAcceptanceBrowser, readAcceptanceBrowserName, restrictAcceptancePage } from "./browser-acceptance.mjs";
import { readTemplateEditorMessages } from "../features/templates/templateEditorMessages.ts";
import { readCampaignMessages } from "../features/campaigns/campaignMessages.ts";
import { campaignControlMessages } from "../features/campaigns/campaignControlMessages.ts";
import { demoTimestamp, demoTemplateKey, demoCampaignKey, demoAccounts } from "./fixtures/template-campaign-demo.ts";

if (process.argv.length > 2) throw new Error("Template/campaign demo accepts no arguments; use CONNECT_E2E_BROWSER.");
const engine = readAcceptanceBrowserName();
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = new URL("../output/demo-journeys/templates-campaigns/", import.meta.url);
const fixturePath = "/scripts/fixtures/template-campaign-demo.ts";
const templateActions = "\0connect-template-demo-actions";
const campaignActions = "\0connect-campaign-demo-actions";
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Template and campaign local demo acceptance</title></head><body><div id="root"></div><script type="module" src="/scripts/template-campaign-demo-harness.tsx"></script></body></html>`;
const server = await createServer({
  root: projectRoot, configFile: false, envFile: false, appType: "custom", logLevel: "error",
  plugins: [{
    name: "connect-template-campaign-demo-boundary", enforce: "pre",
    resolveId(source) {
      if (source === "../../server/templates/messageTemplateActions") return templateActions;
      if (source === "../../server/campaigns/campaignActions") return campaignActions;
    },
    load(id) {
      if (id === templateActions) return `import { templateCampaignDemo as demo } from '${fixturePath}';
        export const saveMessageTemplateDraftAction = input => demo.saveTemplate(input);
        export const submitMessageTemplateAction = (key, version) => demo.submitTemplate(key, version);
        export const syncMessageTemplatesAction = timestamp => demo.syncTemplates(timestamp);`;
      if (id === campaignActions) return `import { templateCampaignDemo as demo } from '${fixturePath}';
        export const saveCampaignSnapshotAction = input => demo.saveCampaign(input);
        export const activateCampaignAction = input => demo.activateCampaign(input);
        export const controlCampaignAction = input => demo.controlCampaign(input);
        export const refreshCampaignDirectoryAction = () => demo.refreshCampaigns();`;
    },
    configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        if (request.url?.split("?")[0] !== "/") return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        response.end(await vite.transformIndexHtml("/", html));
      });
    },
  }, react()],
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
const errors = [];
const externalRequests = [];
const journeys = [];
let browser;
let activePage;
let failure = null;

try {
  await mkdir(outputDirectory, { recursive: true });
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await launchAcceptanceBrowser();
  for (const language of ["he", "en", "ar"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "UTC", serviceWorkers: "block" });
    const page = activePage = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on("pageerror", error => errors.push({ language, message: error.message }));
    page.on("request", request => { if (new URL(request.url()).origin !== origin) externalRequests.push(request.url()); });
    await restrictAcceptancePage(page, origin);
    await page.clock.setFixedTime(demoTimestamp);
    await page.goto(`${origin}/?language=${language}`, { waitUntil: "networkidle" });
    await page.getByRole("note").filter({ hasText: "DEMO" }).waitFor();
    assert.equal(await page.locator("html").getAttribute("dir"), language === "en" ? "ltr" : "rtl");
    const t = readTemplateEditorMessages(language);
    const c = readCampaignMessages(language).manager;
    const controls = campaignControlMessages[language];
    const steps = [];
    const calls = () => page.evaluate(() => window.__templateCampaignDemo.state.calls);
    const state = () => page.evaluate(() => window.__templateCampaignDemo.state);
    const pending = async (operation, input) => {
      await page.waitForFunction(value => window.__templateCampaignDemo.pendingOperation === value, operation);
      assert.deepEqual((await calls()).at(-1), { operation, input, actor: demoAccounts.owner });
    };
    const release = async failureStatus => page.evaluate(value => window.__templateCampaignDemo.release(value), failureStatus);
    const text = async value => page.getByText(value, { exact: true }).waitFor();
    const button = name => page.getByRole("button", { name, exact: true });
    const templateRecord = () => page.locator(".template-record");
    const campaignRecord = () => page.locator(".campaign-record");
    const campaignStatus = async (status, version) => {
      await campaignRecord().getByText(c.campaignStatuses[status], { exact: true }).waitFor();
      await campaignRecord().getByText(c.directory.version(version), { exact: true }).waitFor();
    };

    await button("Demo campaigns").click();
    await text(c.form.noTemplate);
    assert.equal(await button(c.form.save).isDisabled(), true);
    assert.equal((await calls()).length, 0);
    await button("Demo templates").click();
    steps.push("W13: campaign creation blocked before an approved template exists");

    const templateName = `demo_greeting_${language}`;
    const templateLanguage = language === "en" ? "en_US" : language;
    await page.getByRole("textbox", { name: t.editor.fields.name, exact: true }).fill(templateName);
    await page.getByRole("combobox", { name: t.editor.fields.language, exact: true }).selectOption(templateLanguage);
    const body = page.getByRole("textbox", { name: t.editor.fields.body, exact: true });
    await body.fill("Hello {{2}}");
    await text(t.editor.variableGuidance.missingSequence(1));
    assert.equal(await button(t.editor.save.server).isDisabled(), true);
    await body.fill("Hello {{1}}");
    assert.equal(await button(t.editor.save.server).isDisabled(), true);
    await page.getByRole("textbox", { name: "{{1}}", exact: true }).fill("Demo Customer");
    await page.locator(".template-preview-card").getByText("Hello Demo Customer", { exact: true }).waitFor();
    steps.push("W11: missing variable sequence/example blocks save; actual preview substitutes the supplied example");

    const draft = { name: templateName, category: "MARKETING", language: templateLanguage, header: "", body: "Hello {{1}}", footer: "", variableExamples: { 1: "Demo Customer" }, buttonMode: "none", quickReplies: [], urlButton: { enabled: false, mode: "static", text: "", value: "", example: "" }, phoneButton: { enabled: false, text: "", value: "" } };
    await button(t.editor.save.server).click();
    await pending("template.save", draft);
    assert.equal(await button(t.editor.save.saving).isDisabled(), true);
    await button(t.editor.save.saving).evaluate(element => element.click());
    assert.equal((await calls()).length, 1);
    await release("server-error");
    await text(t.feedback.saveResults["server-error"]);
    assert.equal(await body.inputValue(), draft.body);
    assert.equal((await state()).templates.length, 0);
    await button(t.editor.save.server).click();
    await pending("template.save", draft);
    await release();
    await templateRecord().getByText(t.directory.statuses.draft.label, { exact: true }).waitFor();
    assert.equal((await state()).templates[0].version, 1);
    steps.push("W11: pending save prevents a duplicate click; failure retains input; identical retry renders the stored draft");

    await templateRecord().getByRole("button", { name: t.directory.submit, exact: true }).click();
    await pending("template.submit", { templateKey: demoTemplateKey, expectedVersion: 1 });
    assert.equal(await button(t.directory.submitting).isDisabled(), true);
    await release();
    await templateRecord().getByText(t.directory.statuses.pending_review.label, { exact: true }).waitFor();
    assert.equal(await button(t.directory.submit).count(), 0);
    steps.push("W12: versioned submit renders the mocked pending-review result and removes resubmit");

    await button(t.directory.sync).click();
    await pending("template.sync", { observedAt: demoTimestamp });
    await release("sync-failed");
    await text(t.feedback.syncResults["sync-failed"]);
    await templateRecord().getByText(t.directory.statuses.pending_review.label, { exact: true }).waitFor();
    await page.clock.setFixedTime("2026-09-13T12:01:00.000Z");
    await button(t.directory.sync).click();
    await pending("template.sync", { observedAt: demoTimestamp });
    await release();
    await templateRecord().getByText(t.directory.statuses.approved.label, { exact: true }).waitFor();
    assert.equal((await state()).templates[0].version, 3);
    steps.push("W12: failed sync retains pending review; retry retains the request timestamp and renders a local approved fixture");
    await page.screenshot({ path: fileURLToPath(new URL(`${engine}-${language}-template-approved.png`, outputDirectory)), fullPage: true });

    await button("Demo campaigns").click();
    await page.getByRole("textbox", { name: c.form.name, exact: true }).fill(`Demo campaign ${language}`);
    assert.equal(await page.getByRole("combobox", { name: c.form.approvedTemplate, exact: true }).inputValue(), demoTemplateKey);
    assert.equal(await button(c.form.save).isDisabled(), true);
    await page.getByRole("combobox", { name: c.bodyVariable("1"), exact: true }).selectOption("firstName");
    await page.locator('input[name="audienceKind"]').nth(1).check();
    await page.getByRole("combobox", { name: c.form.chooseList, exact: true }).selectOption("41");
    await page.locator('input[name="deliveryMode"]').nth(1).check();
    assert.equal(await button(c.form.save).isDisabled(), true);
    await page.locator('input[type="datetime-local"]').fill("2026-09-14T12:00");
    const snapshot = { name: `Demo campaign ${language}`, deliveryMode: "scheduled", scheduledAt: "2026-09-14T12:00:00.000Z", templateKey: demoTemplateKey, audienceSource: { kind: "list", listId: 41 }, personalizationMapping: { "body:1": "firstName" } };
    await button(c.form.save).click();
    await pending("campaign.save", snapshot);
    assert.equal(await page.getByRole("textbox", { name: c.form.name, exact: true }).isDisabled(), true);
    assert.equal(await button(c.form.saving).isDisabled(), true);
    await release("audience-invalid");
    await text(c.saveResults["audience-invalid"]);
    assert.equal(await page.getByRole("textbox", { name: c.form.name, exact: true }).inputValue(), snapshot.name);
    assert.equal((await state()).campaigns.length, 0);
    await button(c.form.save).click();
    await pending("campaign.save", snapshot);
    await release();
    await campaignStatus("draft", 1);
    await campaignRecord().getByText(c.directory.recipients(2), { exact: false }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: c.form.name, exact: true }).inputValue(), "");
    steps.push("W13: approved-template handoff, required mapping and UTC schedule; failed snapshot retains inputs; retry renders two demo recipients");

    await button(c.directory.activate).click();
    await pending("campaign.activate", { campaignKey: demoCampaignKey, expectedVersion: 1 });
    await release();
    await campaignStatus("scheduled", 2);
    assert.equal(await button(c.directory.alreadyActivated).isDisabled(), true);
    steps.push("W13: activation sends version 1 and displays the mocked scheduled version 2 without sending messages");

    await page.evaluate(() => window.__templateCampaignDemo.simulateOtherTabCampaignUpdate());
    await button(controls.actions.pause).click();
    await pending("campaign.control", { campaignKey: demoCampaignKey, expectedVersion: 2, action: "pause" });
    await release();
    await text(controls.results["state-conflict"]);
    await campaignStatus("scheduled", 2);
    await button(controls.refresh).click();
    await pending("campaign.refresh", null);
    await release();
    await campaignStatus("scheduled", 3);
    steps.push("W14: stale-version control renders conflict; refresh exposes the newer fixture version without pretending the pause succeeded");

    for (const [action, beforeVersion, status] of [["pause", 3, "paused"], ["resume", 4, "scheduled"], ["cancel", 5, "cancelled"]]) {
      await button(controls.actions[action]).click();
      await pending("campaign.control", { campaignKey: demoCampaignKey, expectedVersion: beforeVersion, action });
      assert.equal(await button(controls.actions[action]).isDisabled(), true);
      await release();
      await campaignStatus(status, beforeVersion + 1);
    }
    for (const action of Object.values(controls.actions)) assert.equal(await button(action).count(), 0);
    steps.push("W14: pause/resume/cancel carry updated versions 3/4/5; final cancelled state exposes no further control actions");

    await button("Demo templates").click();
    await templateRecord().getByText(t.directory.statuses.approved.label, { exact: true }).waitFor();
    await button("Demo campaigns").click();
    await campaignStatus("cancelled", 6);
    steps.push("W11–W14: component remounts preserve the shared in-memory fixture template and campaign results");

    const beforeViewer = (await calls()).length;
    await page.getByRole("combobox", { name: "Demo account", exact: true }).selectOption("viewer");
    await text(c.form.readOnly);
    assert.equal(await button(c.form.save).isDisabled(), true);
    assert.equal(await page.getByRole("textbox", { name: c.form.name, exact: true }).isDisabled(), true);
    await button("Demo templates").click();
    await text(t.directory.readOnly);
    assert.equal(await button(t.editor.save.noPermission).isDisabled(), true);
    assert.equal(await button(t.directory.sync).isDisabled(), true);
    assert.equal(await button(t.directory.newDraft).isDisabled(), true);
    assert.equal((await calls()).length, beforeViewer);
    steps.push("W11–W14: viewer fixture role renders read-only controls and causes zero additional mutations");

    await page.screenshot({ path: fileURLToPath(new URL(`${engine}-${language}-viewer.png`, outputDirectory)), fullPage: true });
    const finalState = await state();
    assert.equal(finalState.calls.length, 13);
    assert.equal(finalState.results.length, 13);
    journeys.push({ language, status: "passed", steps, actionCalls: finalState.calls, actionResults: finalState.results, finalTemplates: finalState.templates, finalCampaigns: finalState.campaigns });
    await context.close();
    activePage = null;
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
} catch (error) {
  failure = error;
  await activePage?.screenshot({ path: fileURLToPath(new URL(`${engine}-failure.png`, outputDirectory)), fullPage: true }).catch(() => {});
} finally {
  const report = {
    schemaVersion: 1, suite: "template-campaign-demo", status: failure ? "failed" : "passed", engine, browserVersion: browser?.version() ?? null,
    host: { platform: process.platform, architecture: process.arch, node: process.version },
    workflows: ["W11", "W12", "W13", "W14"], journeys, errors, externalRequests,
    failure: failure instanceof Error ? { message: failure.message, stack: failure.stack } : failure,
    scope: { actualComponents: ["TemplateDraftEditor", "CampaignManager", "WorkspaceDraftProvider"], productCss: true,
      fixtureIdentities: demoAccounts, languages: ["he", "en", "ar"], viewport: { width: 1440, height: 1000 },
      statePersistence: "in-memory action fixture across component remounts only", authenticatedAccount: false,
      actualServerActions: false, providerApproval: "local mocked Meta response", databasePersistence: false,
      queueExecution: false, realMessageDelivery: false, externalProviderAcceptance: false,
      limitations: "Harness navigation is test-only. This proves React payloads and visible transitions, not real Clerk/MFA, authorization enforcement, API/DB transactions, Meta approval, worker delivery, physical devices or full workspace routing." },
  };
  await writeFile(new URL(`${engine}.json`, outputDirectory), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  await server.close();
}
if (failure) throw failure;
console.log(`Template/campaign demo browser acceptance: PASS (${journeys.length} language journeys, ${journeys.reduce((count, journey) => count + journey.steps.length, 0)} checked stages; W11–W14; deterministic local actions only)`);
