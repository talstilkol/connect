import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { readWorkspaceSetupMessages } from '../shared/i18n/workspaceSetup.ts';

// Exercise the real form and draft provider. Only the server-action boundary
// is controlled; no identity, provider request or persistent data is created.
const actionsId = '\0connect-profile-browser-action';
const entryPath = '/__profile-browser-entry.js';
const profile = { businessName: 'Connect', timezone: 'Asia/Jerusalem', interfaceLanguage: 'he' };
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Business profile acceptance</title></head>
<body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const entry = `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceDraftProvider } from '/features/workspace/WorkspaceDraftProvider.tsx';
import { WorkspaceOnboarding } from '/features/workspace/WorkspaceOnboarding.tsx';
const language = new URLSearchParams(location.search).get('language');
document.documentElement.lang = language;
document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
function Harness() {
  const [visible, setVisible] = useState(true);
  window.__showProfile = setVisible;
  return React.createElement(WorkspaceDraftProvider, { initialBusinessProfileDraft: ${JSON.stringify(profile)}, initialBusinessProfileVersion: 1 },
    visible ? React.createElement(WorkspaceOnboarding, { language, metaConnection: {status:'disconnected'}, onConnectMeta() {throw new Error('Meta is outside this acceptance');}, serverPersistenceEnabled:true }) : null);
}
createRoot(document.getElementById('root')).render(React.createElement(Harness));`;
const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envFile: false,
  appType: 'custom', logLevel: 'error',
  plugins: [{
    name: 'connect-profile-browser-boundary', enforce: 'pre',
    resolveId(source) {
      if (source === '../../server/onboarding/saveBusinessProfileAction') return actionsId;
      if (source === entryPath) return entryPath;
    },
    load(id) {
      if (id === entryPath) return entry;
      if (id === actionsId) return `const state = window.__profileActions = {calls:[],pending:null};
        export function saveBusinessProfileAction(input) {
          if (state.pending) throw new Error('Concurrent profile submission');
          state.calls.push(input);
          return new Promise(resolve => { state.pending = result => { state.pending = null; resolve(result); }; });
        }`;
    },
    configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== '/') return next();
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(await vite.transformIndexHtml('/', html));
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
  const errors = [];
  let scenarios = 0;
  for (const language of ['he', 'en', 'ar']) {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${address.port}/?language=${language}`, { waitUntil: 'networkidle' });
    const m = readWorkspaceSetupMessages(language).onboarding;
    const name = page.getByRole('textbox', { name: m.fields.businessName, exact: true });
    const save = page.getByRole('button', { name: m.saveActions.server, exact: true });
    const calls = () => page.evaluate(() => window.__profileActions.calls);
    const resolve = async result => {
      await page.evaluate(value => window.__profileActions.pending(value), result);
      await save.waitFor();
      assert.equal(await save.isEnabled(), true);
    };
    await name.fill('Connect updated');
    await save.click();
    await page.waitForFunction(() => window.__profileActions.pending !== null);
    assert.equal(await name.isDisabled(), true);
    for (const field of [m.fields.timezone, m.fields.interfaceLanguage]) {
      assert.equal(await page.getByRole('combobox', { name: field, exact: true }).isDisabled(), true);
    }
    assert.deepEqual(await calls(), [{ ...profile, businessName: 'Connect updated', expectedVersion: 1 }]);
    await page.getByRole('button', { name: m.saveActions.saving, exact: true }).evaluate(button => button.click());
    assert.equal((await calls()).length, 1);
    await resolve({ status: 'saved', createdTenant: false, profile: { ...profile, businessName: 'Connect updated', version: 2 } });
    scenarios++;

    await name.fill(profile.businessName);
    await save.click();
    await page.waitForFunction(() => window.__profileActions.pending !== null);
    assert.deepEqual((await calls()).at(-1), { ...profile, expectedVersion: 2 });
    await resolve({ status: 'saved', createdTenant: false, profile: { ...profile, version: 3 } });
    await page.evaluate(() => window.__showProfile(false));
    await name.waitFor({ state: 'detached' });
    await page.evaluate(() => window.__showProfile(true));
    await name.waitFor();
    assert.equal(await name.inputValue(), profile.businessName);
    scenarios++;

    await name.fill('Connect updated');
    await save.click();
    await page.waitForFunction(() => window.__profileActions.pending !== null);
    assert.equal((await calls()).at(-1).expectedVersion, 3);
    await resolve({ status: 'conflict' });
    await page.getByRole('alert').filter({ hasText: m.saveFailures.conflict }).waitFor();
    assert.equal(await name.inputValue(), 'Connect updated');
    assert.equal(await page.getByText(m.notices.serverUpdated, { exact: true }).count(), 0);
    scenarios++;
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(`Business profile browser acceptance: PASS (${scenarios} scenarios across Hebrew, English and Arabic; versioned saves, return to prior value, remount, conflict and pending edits)`);
} finally {
  await browser?.close();
  await server.close();
}
