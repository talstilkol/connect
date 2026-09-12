import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { runtimeFixture } from '../tests/fixtures/ai-runtime.mjs';
import { knowledgeFixture } from '../tests/fixtures/knowledge-ingestion.mjs';
import { toAiAgentSummaryView, toAiAgentVersionView } from '../server/ai/aiAgentView.ts';
import { readAiAgentMessages } from '../features/ai/aiAgentMessages.ts';

// Existing test fixtures and controlled action promises only. This harness
// renders the real editor without importing or invoking server actions.
const fixture = await runtimeFixture({
  definition: { billingCurrency: 'USD', responseMode: 'agent-approval' },
  agent: { status: 'draft', activeVersionKey: null },
  version: { status: 'draft', publishedAt: null },
});
const knowledge = await knowledgeFixture();
const details = {
  agent: toAiAgentSummaryView(fixture.input.agent),
  versions: [toAiAgentVersionView(fixture.input.version)],
  activationReadiness: { ready: true, issues: [] },
};
const directory = {
  agents: [details.agent], selectedAgent: null, canWrite: true,
  knowledgeSources: [{
    sourceKey: fixture.sourceKey, fileName: knowledge.payload.fileName,
    mediaType: knowledge.payload.mediaType, sizeBytes: knowledge.bytes.length,
    status: 'ready', version: 1, readyAt: details.agent.updatedAt,
    createdAt: details.agent.createdAt, updatedAt: details.agent.updatedAt,
  }],
};
const actionsId = '\0connect-ai-editor-test-actions';
const uploadId = '\0connect-ai-editor-test-upload';
const entryPath = '/__ai-editor-browser-entry.js';
const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>AI editor concurrency test</title></head>
<body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const entry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { AiAgentEditor } from '/features/ai/AiAgentEditor.tsx';
createRoot(document.getElementById('root')).render(React.createElement(AiAgentEditor,
  {language:'en',initialStatus:'ready',initialDirectory:${JSON.stringify(directory)}}));`;
const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envFile: false,
  appType: 'custom', logLevel: 'error',
  plugins: [{
    name: 'connect-ai-editor-action-boundary', enforce: 'pre',
    resolveId(source) {
      if (source === '../../server/ai/aiAgentActions') return actionsId;
      if (source === './KnowledgeUploadPanel') return uploadId;
      if (source === entryPath) return entryPath;
    },
    load(id) {
      if (id === entryPath) return entry;
      if (id === uploadId) return 'export function KnowledgeUploadPanel(){return null}';
      if (id === actionsId) return `
        const state = window.__aiEditorActions = {calls:[],pending:{}};
        const action = name => input => new Promise(resolve => {
          state.calls.push(name); state.pending[name] = result => { delete state.pending[name]; resolve(result); };
        });
        export const loadAiAgentDetailsAction = action('load');
        export const saveAiAgentDraftAction = action('save');
        export const publishAiAgentDraftAction = action('publish');`;
    },
    configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        if (request.url !== '/') return next();
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(await vite.transformIndexHtml('/', document));
      });
    },
  }, react()],
  server: { host: '127.0.0.1', port: 0, strictPort: false },
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  assert.ok(address && typeof address !== 'string');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const messages = readAiAgentMessages('en');
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'networkidle' });
  const newAgent = page.getByRole('button', { name: messages.directory.newAgent, exact: true });
  const record = page.locator('.ai-agent-record');
  const prompt = page.getByLabel(messages.editor.systemPrompt);
  async function pending(name) {
    await page.waitForFunction(key => typeof window.__aiEditorActions.pending[key] === 'function', name);
  }
  async function resolve(name, result) {
    await page.evaluate(({ name, result }) => window.__aiEditorActions.pending[name](result), { name, result });
  }
  async function assertBusy(name) {
    await pending(name);
    const enabled = await page.locator('.ai-agent-workspace').evaluate(root =>
      [...root.querySelectorAll('button,input,textarea,select')].filter(element => !element.disabled).map(element => element.outerHTML));
    assert.deepEqual(enabled, [], `${name} must lock navigation and every editable definition field`);
    const calls = await page.evaluate(() => [...window.__aiEditorActions.calls]);
    await newAgent.evaluate(button => button.click());
    await record.evaluate(button => button.click());
    await page.locator('form.ai-agent-editor').evaluate(form => form.requestSubmit());
    assert.deepEqual(await page.evaluate(() => window.__aiEditorActions.calls), calls);
  }
  async function resolveLoad() {
    await pending('load');
    await resolve('load', { status: 'loaded', aiAgent: details });
    await page.waitForFunction(() => !document.querySelector('.ai-agent-record').disabled);
    assert.equal(await prompt.inputValue(), fixture.input.version.definition.systemPrompt);
  }

  await record.click();
  await assertBusy('load');
  await resolveLoad();
  await page.getByRole('button', { name: messages.editor.save, exact: true }).click();
  await assertBusy('save');
  await resolve('save', { status: 'saved', agent: details.agent, outcome: 'unchanged' });
  await assertBusy('load'); // Saving includes the subsequent reload.
  await resolveLoad();
  await page.getByRole('button', { name: messages.editor.publish, exact: true }).click();
  await assertBusy('publish');
  await resolve('publish', { status: 'published', agent: details.agent, publishedVersion: details.versions[0], outcome: 'unchanged' });
  await assertBusy('load'); // Publishing includes the subsequent reload.
  await resolveLoad();
  await newAgent.click();
  assert.equal(await prompt.inputValue(), '');
  assert.equal(await prompt.isEnabled(), true);
  assert.deepEqual(errors, []);
  console.log('AI editor browser concurrency: PASS (load, save, publish, reload locks, idle reset)');
} finally {
  await browser?.close();
  await server.close();
}
