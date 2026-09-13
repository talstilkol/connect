import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { launchAcceptanceBrowser, readAcceptanceBrowserName, restrictAcceptancePage } from './browser-acceptance.mjs';
import { readContactImportMessages } from '../features/contacts/contactImportMessages.ts';
import { readConversationMessages } from '../features/conversations/conversationMessages.ts';
import { readManualReplyMessages } from '../features/conversations/manualReplyMessages.ts';
import { parseManualReplyRequest } from '../shared/domain/manualReply.ts';
import {
  importInboxDemoAccounts, importInboxDemoCsv, importInboxDemoFileName, importInboxDemoReply,
  importInboxDemoConversationKey, importInboxDemoOtherConversationKey,
} from '../tests/fixtures/import-inbox-demo.mjs';

// Real React screens, file parser, validation and draft state; only server action
// boundaries are replaced. No authentication, external send or DB persistence claim.
const engine = readAcceptanceBrowserName();
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = fileURLToPath(new URL('../output/demo-journeys/import-inbox/', import.meta.url));
const entryPath = '/__import-inbox-demo-entry.js';
const actionExports = {
  contactImportActions: ['startContactImportAction', 'processContactImportChunkAction'],
  conversationActions: ['loadConversationThreadAction', 'markConversationReadAction', 'changeConversationAssignmentAction', 'refreshInboxAction', 'sendManualReplyAction'],
  aiReplyApprovalActions: ['loadAiReplyApprovalsAction', 'decideAiReplyApprovalAction'],
};
const entry = `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ContactImport } from '/features/contacts/ContactImport.tsx';
import { ConversationInbox } from '/features/conversations/ConversationInbox.tsx';
import { WorkspaceDraftProvider } from '/features/workspace/WorkspaceDraftProvider.tsx';
import { createImportInboxDemoBoundary, importInboxDemoAccounts } from '/tests/fixtures/import-inbox-demo.mjs';
import '/styles/tokens.css';
import '/styles/foundations.css';
import '/features/contacts/import.css';
import '/features/conversations/conversations.css';
const root = createRoot(document.getElementById('root'));
function ImportDemo({language}) {
  const [contacts,setContacts] = useState([]);
  return React.createElement(WorkspaceDraftProvider, null,
    React.createElement(ContactImport, {language, serverImportEnabled: true, onImportedContacts(rows) {
      window.__demoImported.push(...rows);
      setContacts(current => [...current,...rows]);
    }}),
    React.createElement('ul', {'data-testid':'demo-imported-contacts'}, contacts.map(row => React.createElement('li',{key:row.id},row.firstName)))
  );
}
window.__renderDemo = (kind,language,scenario) => {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  window.__demo = createImportInboxDemoBoundary(scenario);
  window.__demoImported = [];
  root.render(React.createElement('main', {lang:language,dir:language === 'en'?'ltr':'rtl'},
    React.createElement('p', null, 'LOCAL DEMO ONLY · '+importInboxDemoAccounts.owner.email),
    kind === 'import' ? React.createElement(ImportDemo,{language}) : React.createElement(ConversationInbox,{
      authEnabled:true,language,initialInbox:window.__demo.inbox(),initialStatus:'ready',
      initialAiReplyApprovals:{approvals:[],canDecide:false},initialAiReplyApprovalStatus:'ready'
    })
  ));
};`;
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local import/inbox demo acceptance</title></head><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const server = await createServer({
  root: projectRoot, configFile: false, envFile: false, appType: 'custom', logLevel: 'error',
  define: { 'process.env.NEXT_PUBLIC_META_MEDIA_DOWNLOAD_ORIGIN': 'undefined' },
  plugins: [{
    name: 'import-inbox-demo-boundaries', enforce: 'pre',
    resolveId(source) {
      if (source === entryPath) return entryPath;
      if (source === '@clerk/nextjs') return '\0import-inbox-demo-clerk';
      for (const name of Object.keys(actionExports)) {
        if (source.endsWith('/' + name) || source.endsWith('/' + name + '.ts')) return '\0import-inbox-demo-actions:' + name;
      }
    },
    load(id) {
      if (id === entryPath) return entry;
      if (id === '\0import-inbox-demo-clerk') return 'export function useAuth(){throw new Error("Clerk must not run in this local demo");}';
      if (id.startsWith('\0import-inbox-demo-actions:')) return actionExports[id.split(':')[1]]
        .map(name => `export async function ${name}(input){return window.__demo.action(${JSON.stringify(name)},input);}`).join('\n');
    },
    configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== '/') return next();
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(await vite.transformIndexHtml('/', html));
      });
    },
  }, react()], server: { host: '127.0.0.1', port: 0 },
});

const callsNamed = (state, name) => state.calls.filter(call => call.name === name);
async function stateOf(page) { return page.evaluate(() => window.__demo.state); }
async function assertText(page, text) { await page.getByText(text, { exact: true }).first().waitFor(); }
async function filterInbox(page, messages, value) {
  await page.getByRole('searchbox', { name: messages.threadList.searchLabel, exact: true }).fill(value);
  await page.getByRole('button', { name: messages.threadList.applyFilters, exact: true }).click();
}
async function importScenario(page, language, scenario) {
  const m = readContactImportMessages(language);
  const upload = page.locator('input[type=file]');
  await upload.setInputFiles({ name: 'unsupported-demo.txt', mimeType: 'text/plain', buffer: Buffer.from('demo') });
  await assertText(page, m.sourceFailures['unsupported-format']);
  assert.equal((await stateOf(page)).calls.length, 0, 'Unsupported files cannot begin an import');
  await upload.setInputFiles({ name: importInboxDemoFileName, mimeType: 'text/csv', buffer: Buffer.from(importInboxDemoCsv) });
  await assertText(page, m.mapping.rowsFound(7));
  const mapping = page.locator('.mapping-grid select');
  await mapping.nth(0).selectOption('0');
  await mapping.nth(1).selectOption('0');
  await assertText(page, m.mapping.collision);
  assert.equal(await page.getByRole('button', { name: m.mapping.check, exact: true }).isDisabled(), true);
  for (let index = 1; index <= 5; index += 1) await mapping.nth(index).selectOption(String(index));
  await assertText(page, m.mapping.rawConsentNotice);
  await page.getByRole('button', { name: m.mapping.check, exact: true }).click();
  const commit = page.locator('.contact-import-commit-card');
  await commit.getByRole('button', { name: m.commit.startImport, exact: true }).click();
  if (scenario === 'import-resume') {
    await assertText(page, m.actionFailures['server-error']);
    assert.equal(await page.locator('[data-testid=demo-imported-contacts] li').count(), 6);
    assert.equal((await stateOf(page)).job.processedRows, 6);
    await commit.getByRole('button', { name: m.commit.continueImport, exact: true }).click();
  }
  await assertText(page, m.runtime.completed);
  assert.equal(await page.locator('[data-testid=demo-imported-contacts] li').count(), 7);
  assert.deepEqual(await page.evaluate(() => window.__demoImported), importInboxDemoAccounts.recipients);
  const state = await stateOf(page);
  assert.equal(state.job.status, 'completed');
  const expectedStart = {
    fileName: importInboxDemoFileName, sourceDigest: createHash('sha256').update(importInboxDemoCsv).digest('hex'),
    totalRows: 7, mapping: { phoneNumber: 0, firstName: 1, lastName: 2, email: 3, company: 4 },
  };
  const starts = callsNamed(state, 'startContactImportAction');
  assert.equal(starts.length, scenario === 'import-resume' ? 2 : 1);
  for (const call of starts) assert.deepEqual(call.input, expectedStart, 'Raw CSV consent must not grant mailing permission');
  const expectedRows = importInboxDemoAccounts.recipients.map((row, index) => ({
    sourceRowNumber: index + 2, phoneNumber: row.phoneNumber, firstName: row.firstName,
    lastName: row.lastName, email: row.email, company: row.company,
  }));
  const chunks = callsNamed(state, 'processContactImportChunkAction');
  assert.deepEqual(chunks.map(call => call.input), (scenario === 'import-resume' ? [0, 6, 0, 6] : [0, 6])
    .map(offset => ({ jobId: 71, rows: expectedRows.slice(offset, offset + 6) })));
  await commit.getByRole('button', { name: m.commit.startImport, exact: true }).click();
  await assertText(page, m.runtime.alreadyCompleted);
  assert.equal(callsNamed(await stateOf(page), 'processContactImportChunkAction').length, chunks.length, 'A completed import must not process another chunk');
  assert.equal(await page.locator('[data-testid=demo-imported-contacts] li').count(), 7);
}

async function inboxScenario(page, language, scenario) {
  const m = readConversationMessages(language);
  const reply = readManualReplyMessages(language);
  const composer = page.getByRole('textbox', { name: reply.label, exact: true });
  await page.locator('.conversation-stage h2').getByText('Demo recipient 1', { exact: true }).waitFor();
  if (scenario === 'reply-uncertain') {
    await composer.fill(importInboxDemoReply);
    await page.getByRole('button', { name: reply.send, exact: true }).click();
    await assertText(page, reply.uncertain);
    assert.equal(await composer.inputValue(), importInboxDemoReply);
    assert.equal(await composer.isDisabled(), true);
    await filterInbox(page, m, 'No demo matches');
    await assertText(page, m.threadList.emptyTitle);
    assert.equal(await page.locator('.manual-reply-composer').count(), 0);
    await page.getByRole('button', { name: m.threadList.clear, exact: true }).click();
    await page.getByRole('button', { name: reply.retry, exact: true }).waitFor();
    assert.equal(await composer.inputValue(), importInboxDemoReply, 'The Inbox must preserve an uncertain draft after the composer unmounts');
    assert.equal(await composer.isDisabled(), true);
    await page.getByRole('button', { name: reply.retry, exact: true }).click();
    await assertText(page, reply.queued);
    await page.locator('.manual-reply-pending.queued').waitFor();
    const state = await stateOf(page);
    const sends = callsNamed(state, 'sendManualReplyAction');
    assert.equal(sends.length, 2);
    assert.deepEqual(sends[0].input, { conversationKey: importInboxDemoConversationKey, expectedVersion: 3, text: importInboxDemoReply });
    assert.deepEqual(sends[1].input, sends[0].input, 'Retry must reuse the original version and text after a newer thread version is loaded');
    assert.equal(state.acceptedReplies.length, 1, 'A lost acknowledgement must not create a second delivery');
    assert.equal(await composer.inputValue(), '');
    assert.equal(await page.getByRole('button', { name: reply.send, exact: true }).isDisabled(), true);
    return;
  }
  assert.equal(await composer.isDisabled(), true, 'Unassigned conversations cannot send');
  await page.getByRole('button', { name: m.assignmentControls.assignSelf, exact: true }).click();
  if (scenario === 'inbox-conflict') {
    await assertText(page, m.actionFailures['state-conflict']);
    assert.equal(await composer.isDisabled(), true);
    assert.equal((await stateOf(page)).threads[0].conversation.version, 3);
    await page.getByRole('button', { name: m.assignmentControls.assignSelf, exact: true }).click();
  }
  await assertText(page, m.feedback.assigned);
  assert.equal(await composer.isEnabled(), true);
  const assignmentCalls = callsNamed(await stateOf(page), 'changeConversationAssignmentAction');
  assert.equal(assignmentCalls.length, scenario === 'inbox-conflict' ? 2 : 1);
  for (const call of assignmentCalls) assert.deepEqual(call.input, { conversationKey: importInboxDemoConversationKey, expectedVersion: 3, action: 'assign-self' });
  await page.getByRole('button', { name: m.assignmentControls.markRead, exact: true }).click();
  await assertText(page, m.feedback.markedRead);
  assert.equal(await page.getByRole('button', { name: m.assignmentControls.markRead, exact: true }).count(), 0);
  assert.deepEqual(callsNamed(await stateOf(page), 'markConversationReadAction')[0].input, { conversationKey: importInboxDemoConversationKey, expectedVersion: 4 });
  await page.locator('.conversation-record').filter({ hasText: 'Demo recipient 2' }).click();
  await page.locator('.message-stream').getByText('Demo inbound message 2', { exact: true }).waitFor();
  assert.equal(await composer.isDisabled(), true);
  assert.equal(callsNamed(await stateOf(page), 'loadConversationThreadAction').at(-1).input, importInboxDemoOtherConversationKey);
  await filterInbox(page, m, 'Demo recipient 1');
  await page.locator('.message-stream').getByText('Demo inbound message 1', { exact: true }).waitFor();
  assert.equal(await page.locator('.conversation-record').count(), 1);
  const filterCall = callsNamed(await stateOf(page), 'refreshInboxAction').at(-1);
  assert.deepEqual(filterCall.input, { filters: { searchTerm: 'Demo recipient 1', status: 'all', assignment: 'all' }, selectedConversationKey: importInboxDemoOtherConversationKey });
  await composer.fill(importInboxDemoReply);
  await page.getByRole('button', { name: reply.send, exact: true }).click();
  await assertText(page, reply.queued);
  await page.locator('.manual-reply-pending.queued').waitFor();
  const state = await stateOf(page);
  const sends = callsNamed(state, 'sendManualReplyAction');
  assert.equal(sends.length, 1);
  assert.deepEqual(sends[0].input, { conversationKey: importInboxDemoConversationKey, expectedVersion: 5, text: importInboxDemoReply });
  assert.ok(parseManualReplyRequest(sends[0].input));
  assert.equal(state.acceptedReplies.length, 1);
  assert.equal(await composer.inputValue(), '');
  assert.equal(await composer.isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: reply.send, exact: true }).isDisabled(), true);
}

let browser;
const scenarios = [];
const errors = [];
const forbiddenRequests = [];
try {
  await mkdir(outputDirectory, { recursive: true });
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await launchAcceptanceBrowser();
  for (const language of ['he', 'en', 'ar']) {
    for (const scenario of ['import-success', 'import-resume', 'inbox-success', 'inbox-conflict', 'reply-uncertain']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      page.setDefaultTimeout(15_000);
      page.on('pageerror', error => errors.push({ language, scenario, message: error.message }));
      page.on('request', request => { if (new URL(request.url()).origin !== origin) forbiddenRequests.push(request.url()); });
      await restrictAcceptancePage(page, origin);
      await page.goto(origin + '/');
      await page.waitForFunction(() => typeof window.__renderDemo === 'function');
      const kind = scenario.startsWith('import') ? 'import' : 'inbox';
      await page.evaluate(({ kind, language, scenario }) => window.__renderDemo(kind, language, scenario), { kind, language, scenario });
      if (kind === 'import') await importScenario(page, language, scenario);
      else await inboxScenario(page, language, scenario);
      assert.equal(await page.locator('main').getAttribute('lang'), language);
      assert.equal(await page.locator('main').getAttribute('dir'), language === 'en' ? 'ltr' : 'rtl');
      if (language === 'en' && ['import-resume', 'reply-uncertain'].includes(scenario)) {
        await page.screenshot({ path: outputDirectory + engine + '-' + scenario + '.png', fullPage: true });
      }
      scenarios.push({ language, scenario, status: 'passed', state: await stateOf(page) });
      await page.close();
    }
  }
  assert.deepEqual(errors, [], 'Real components must not throw browser errors');
  assert.deepEqual(forbiddenRequests, [], 'The demo must not attempt external network requests');
  await writeFile(outputDirectory + engine + '-results.json', JSON.stringify({
    suite: 'import-inbox-demo', engine, browserVersion: browser.version(), accounts: importInboxDemoAccounts,
    scope: 'Real React components and CSV parser; local action boundary; no provider accounts, real authentication, database persistence or message delivery.',
    viewport: { width: 1280, height: 900 }, scenarios, errors, forbiddenRequests,
  }, null, 2) + '\n');
  console.log(`Import/inbox demo browser acceptance passed: ${scenarios.length} scenarios; 3 languages; CSV mapping/chunks/resume; Inbox assignment/read/filter; manual reply acknowledgement loss and exact retry without duplicate delivery.`);
} finally {
  await browser?.close();
  await server.close();
}
