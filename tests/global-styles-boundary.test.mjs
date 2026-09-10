import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

test("keeps design tokens outside the global feature stylesheet", async () => {
  const [globalSource, tokenSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("styles/tokens.css"),
    ]);

  assert.match(
    globalSource,
    /@import "\.\.\/styles\/tokens\.css";/,
  );
  assert.doesNotMatch(globalSource, /:root\s*\{/);
  assert.match(tokenSource, /^:root\s*\{/);
  assert.match(tokenSource, /--ink:|--surface:|--shadow:/);
});

test("keeps document foundations in their ordered stylesheet", async () => {
  const [globalSource, foundationSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("styles/foundations.css"),
    ]);
  const tokenImport = globalSource.indexOf(
    '@import "../styles/tokens.css";',
  );
  const foundationImport = globalSource.indexOf(
    '@import "../styles/foundations.css";',
  );

  assert.ok(tokenImport >= 0);
  assert.ok(foundationImport > tokenImport);
  assert.doesNotMatch(globalSource, /box-sizing:\s*border-box/);
  assert.match(foundationSource, /\*\s*\{[\s\S]*box-sizing:\s*border-box/);
  assert.match(foundationSource, /body\s*\{[\s\S]*background:\s*var\(--canvas\)/);
});

test("keeps shared brand primitives outside feature stylesheets", async () => {
  const [globalSource, brandSource, publicSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("styles/brand.css"),
      readSource("features/public/public.css"),
    ]);
  const foundationImport = globalSource.indexOf(
    '@import "../styles/foundations.css";',
  );
  const brandImport = globalSource.indexOf(
    '@import "../styles/brand.css";',
  );
  const conversationImport = globalSource.indexOf(
    '@import "../features/conversations/conversations.css";',
  );

  assert.ok(brandImport > foundationImport);
  assert.ok(conversationImport > brandImport);
  assert.match(brandSource, /^\.public-brand\s*\{/);
  assert.match(brandSource, /\.hero-badge\s*\{/);
  assert.match(
    brandSource,
    /@media \(max-width: 560px\)[\s\S]*\.public-brand small/,
  );
  assert.doesNotMatch(publicSource, /^\.public-brand\s*\{/m);
  assert.doesNotMatch(publicSource, /^\.hero-badge\s*\{/m);
});

test("keeps inbox base and responsive rules inside one feature stylesheet", async () => {
  const [globalSource, conversationSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource(
        "features/conversations/conversations.css",
      ),
    ]);
  const foundationImport = globalSource.indexOf(
    '@import "../styles/foundations.css";',
  );
  const conversationImport = globalSource.indexOf(
    '@import "../features/conversations/conversations.css";',
  );

  assert.ok(conversationImport > foundationImport);
  assert.doesNotMatch(
    globalSource,
    /\.inbox-shell|\.conversation-stage|\.message-bubble/,
  );
  assert.match(conversationSource, /^\.inbox-shell\s*\{/);
  assert.match(conversationSource, /\.conversation-stage\s*\{/);
  assert.match(conversationSource, /\.message-bubble\s*\{/);
  assert.match(
    conversationSource,
    /@media \(max-width: 1100px\)[\s\S]*@media \(max-width: 820px\)[\s\S]*@media \(max-width: 560px\)/,
  );
  assert.doesNotMatch(conversationSource, /\.panel-label\s*\{/);
  assert.match(globalSource, /\.panel-label\s*\{/);
});

test("keeps contact directory and consent rules inside one feature stylesheet", async () => {
  const [globalSource, contactSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("features/contacts/directory.css"),
    ]);
  const conversationImport = globalSource.indexOf(
    '@import "../features/conversations/conversations.css";',
  );
  const contactImport = globalSource.indexOf(
    '@import "../features/contacts/directory.css";',
  );
  const botImport = globalSource.indexOf(
    '@import "../features/bot/bot.css";',
  );

  assert.ok(contactImport > conversationImport);
  assert.ok(botImport > contactImport);
  assert.doesNotMatch(
    globalSource,
    /\.contact-directory|\.contact-management-card|\.contact-record-row|\.consent-editor-card/,
  );
  assert.match(contactSource, /^\.contact-directory\s*\{/);
  assert.match(contactSource, /\.contact-group-create-grid/);
  assert.match(contactSource, /\.contact-record-row\s*\{/);
  assert.match(contactSource, /\.consent-editor-card\s*\{/);
  assert.match(
    contactSource,
    /@media \(max-width: 820px\)[\s\S]*@media \(max-width: 560px\)/,
  );
  assert.doesNotMatch(
    contactSource,
    /\.csv-schema-metrics|\.template-workspace|\.contact-panel|\.danger-text-button/,
  );
  assert.match(globalSource, /\.danger-text-button\s*\{/);
});

test("keeps contact import, CSV, and mapping rules inside one feature stylesheet", async () => {
  const [globalSource, importSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("features/contacts/import.css"),
    ]);
  const directoryImport = globalSource.indexOf(
    '@import "../features/contacts/directory.css";',
  );
  const contactImport = globalSource.indexOf(
    '@import "../features/contacts/import.css";',
  );
  const templateImport = globalSource.indexOf(
    '@import "../features/templates/templates.css";',
  );

  assert.ok(contactImport > directoryImport);
  assert.ok(templateImport > contactImport);
  assert.doesNotMatch(
    globalSource,
    /\.contact-import-flow|\.mapping-grid|\.csv-schema-metrics|\.contact-quality-grid|\.table-scroll/,
  );
  assert.match(importSource, /^\.file-button\s*\{/);
  assert.match(importSource, /\.contact-import-flow\s*\{/);
  assert.match(importSource, /\.mapping-grid\s*\{/);
  assert.match(importSource, /\.csv-schema-metrics\s*\{/);
  assert.match(importSource, /\.contact-quality-grid\s*\{/);
  assert.match(importSource, /\.table-scroll\s*\{/);
  assert.match(
    importSource,
    /@media \(max-width: 820px\)[\s\S]*@media \(max-width: 560px\)/,
  );
  assert.doesNotMatch(
    importSource,
    /\.contact-directory|\.template-workspace|\.campaign-form|\.business-profile-checks/,
  );
  assert.doesNotMatch(
    importSource,
    /^\.inline-notice\s*\{/m,
  );
  assert.match(globalSource, /\.inline-notice\s*\{/);
});

test("keeps template editor, preview, and breakpoints inside one feature stylesheet", async () => {
  const [globalSource, templateSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("features/templates/templates.css"),
    ]);
  const contactImport = globalSource.indexOf(
    '@import "../features/contacts/directory.css";',
  );
  const templateImport = globalSource.indexOf(
    '@import "../features/templates/templates.css";',
  );
  const botImport = globalSource.indexOf(
    '@import "../features/bot/bot.css";',
  );

  assert.ok(templateImport > contactImport);
  assert.ok(botImport > templateImport);
  assert.doesNotMatch(
    globalSource,
    /\.template-workspace|\.template-form|\.quick-reply-editor|\.phone-preview/,
  );
  assert.match(templateSource, /^\.template-form-card h2,/);
  assert.match(templateSource, /\.template-workspace\s*\{/);
  assert.match(templateSource, /\.template-variable-examples\s*\{/);
  assert.match(templateSource, /\.quick-reply-editor\s*\{/);
  assert.match(templateSource, /\.phone-preview\s*\{/);
  assert.match(
    templateSource,
    /@media \(max-width: 820px\)[\s\S]*@media \(max-width: 560px\)/,
  );
  assert.doesNotMatch(
    templateSource,
    /\.mapping-grid|\.csv-schema-metrics|\.contact-quality-grid|\.campaign-form/,
  );
});

test("keeps bot builder and canvas rules inside one feature stylesheet", async () => {
  const [globalSource, botSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("features/bot/bot.css"),
    ]);
  const conversationImport = globalSource.indexOf(
    '@import "../features/conversations/conversations.css";',
  );
  const botImport = globalSource.indexOf(
    '@import "../features/bot/bot.css";',
  );

  assert.ok(botImport > conversationImport);
  assert.doesNotMatch(
    globalSource,
    /\.bot-builder|\.bot-flow-editor|\.canvas-grid|\.flow-node/,
  );
  assert.match(botSource, /^\.bot-builder\s*\{/);
  assert.match(botSource, /\.bot-flow-editor\s*\{/);
  assert.match(botSource, /\.canvas-grid\s*\{/);
  assert.match(botSource, /\.flow-node\s*\{/);
  assert.match(
    botSource,
    /@media \(max-width: 820px\)[\s\S]*@media \(max-width: 560px\)/,
  );
  assert.doesNotMatch(
    botSource,
    /\.ai-layout|\.report-toolbar|\.public-hero/,
  );
});

test("keeps AI workspace and responsive rules inside one feature stylesheet", async () => {
  const [globalSource, aiSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("features/ai/ai.css"),
    ]);
  const botImport = globalSource.indexOf(
    '@import "../features/bot/bot.css";',
  );
  const aiImport = globalSource.indexOf(
    '@import "../features/ai/ai.css";',
  );

  assert.ok(aiImport > botImport);
  assert.doesNotMatch(
    globalSource,
    /\.ai-layout|\.ai-agent-workspace|\.knowledge-dropzone|\.ai-readiness-card/,
  );
  assert.match(aiSource, /^\.ai-layout\s*\{/);
  assert.match(aiSource, /\.ai-agent-workspace\s*\{/);
  assert.match(aiSource, /\.knowledge-dropzone\s*\{/);
  assert.match(aiSource, /\.ai-readiness-card\s*\{/);
  assert.match(
    aiSource,
    /@media \(max-width: 820px\)[\s\S]*@media \(max-width: 560px\)/,
  );
  assert.doesNotMatch(
    aiSource,
    /\.reports-grid|\.billing-card|\.public-hero/,
  );
});

test("keeps campaign composer and audience rules inside one feature stylesheet", async () => {
  const [globalSource, campaignSource, templateSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("features/campaigns/campaigns.css"),
      readSource("features/templates/templates.css"),
    ]);
  const aiImport = globalSource.indexOf(
    '@import "../features/ai/ai.css";',
  );
  const campaignImport = globalSource.indexOf(
    '@import "../features/campaigns/campaigns.css";',
  );

  assert.ok(campaignImport > aiImport);
  assert.doesNotMatch(
    globalSource,
    /\.campaign-composer-layout|\.campaign-form|\.audience-issue-samples|\.delivery-fieldset/,
  );
  assert.match(
    campaignSource,
    /^\.campaign-composer-layout\s*\{/,
  );
  assert.match(campaignSource, /\.campaign-form\s*\{/);
  assert.match(
    campaignSource,
    /\.audience-issue-samples\s*\{/,
  );
  assert.match(campaignSource, /\.delivery-fieldset\s*\{/);
  assert.match(
    campaignSource,
    /@media \(max-width: 820px\)[\s\S]*@media \(max-width: 560px\)/,
  );
  assert.doesNotMatch(
    campaignSource,
    /\.template-directory-card|\.quick-reply-heading|\.reports-grid/,
  );
  assert.match(templateSource, /\.template-form-row/);
});

test("keeps report surfaces and breakpoints inside one feature stylesheet", async () => {
  const [globalSource, reportSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("features/reports/reports.css"),
    ]);
  const campaignImport = globalSource.indexOf(
    '@import "../features/campaigns/campaigns.css";',
  );
  const reportImport = globalSource.indexOf(
    '@import "../features/reports/reports.css";',
  );

  assert.ok(reportImport > campaignImport);
  assert.doesNotMatch(
    globalSource,
    /\.reports-grid|\.report-toolbar|\.report-costs|\.report-empty-state/,
  );
  assert.match(reportSource, /^\.reports-grid\s*\{/);
  assert.match(reportSource, /\.report-toolbar\s*\{/);
  assert.match(reportSource, /\.report-costs\s*\{/);
  assert.match(reportSource, /\.report-empty-state/);
  assert.match(
    reportSource,
    /@media \(max-width: 1100px\)[\s\S]*@media \(max-width: 820px\)[\s\S]*@media \(max-width: 560px\)/,
  );
  assert.doesNotMatch(
    reportSource,
    /\.billing-card|\.public-hero|\.sidebar/,
  );
});

test("keeps the public landing page and breakpoints inside one feature stylesheet", async () => {
  const [globalSource, publicSource] =
    await Promise.all([
      readSource("app/globals.css"),
      readSource("features/public/public.css"),
    ]);
  const reportImport = globalSource.indexOf(
    '@import "../features/reports/reports.css";',
  );
  const publicImport = globalSource.indexOf(
    '@import "../features/public/public.css";',
  );

  assert.ok(publicImport > reportImport);
  assert.doesNotMatch(
    globalSource,
    /\.public-shell|\.public-hero|\.capability-grid|\.architecture-section/,
  );
  assert.match(publicSource, /^\.public-shell\s*\{/);
  assert.match(publicSource, /\.public-hero\s*\{/);
  assert.match(publicSource, /\.capability-grid\s*\{/);
  assert.match(publicSource, /\.architecture-section\s*\{/);
  assert.match(publicSource, /\.pricing-section\s*\{/);
  assert.match(
    publicSource,
    /@media \(max-width: 1100px\)[\s\S]*@media \(max-width: 820px\)[\s\S]*@media \(max-width: 560px\)/,
  );
  assert.doesNotMatch(
    publicSource,
    /\.auth-shell|\.billing-card|\.admin-content|\.sidebar/,
  );
});
