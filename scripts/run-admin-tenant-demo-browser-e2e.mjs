import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { launchAcceptanceBrowser, readAcceptanceBrowserName, restrictAcceptancePage } from './browser-acceptance.mjs';
import { readSystemAdminTenantMessages } from '../features/admin/systemAdminTenantMessages.ts';
import { readSystemAdminBusinessProfileMessages } from '../features/admin/systemAdminBusinessProfileMessages.ts';
import { adminTenantDemoAccount, adminTenantDemoId } from './admin-tenant-demo-fixtures.mjs';

// Exercise existing Admin React forms. Server actions are local stateful fixtures;
// no real admin authorization, subscription, billing provider or DB is accessed.
const engine = readAcceptanceBrowserName();
const output = fileURLToPath(new URL('../output/demo-journeys/admin-tenant/', import.meta.url));
const entryPath = '/__admin-tenant-demo.js';
const actions = ['loadSystemAdminTenantDirectoryAction', 'createTenantSubscriptionAdminAction', 'extendTenantSubscriptionAdminAction',
  'changeTenantSubscriptionStatusAdminAction', 'cancelTenantSubscriptionAdminAction', 'updateBusinessProfileAdminAction'];
const entry = `import React from'react';import{createRoot}from'react-dom/client';
import{SystemAdminTenantPanel}from'/features/admin/SystemAdminTenantPanel.tsx';
import{createAdminTenantDemo,adminTenantDemoAccount}from'/scripts/admin-tenant-demo-fixtures.mjs';
import'/app/globals.css';
const q=new URLSearchParams(location.search),language=q.get('lang');window.__adminTenantDemo=createAdminTenantDemo();
createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,
React.createElement('p',null,'LOCAL DEMO ONLY · '+adminTenantDemoAccount.email),
React.createElement(SystemAdminTenantPanel,{language,initialStatus:q.has('denied')?'permission-denied':'ready',initialDirectory:window.__adminTenantDemo.directory()})));`;
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Admin tenant demo</title></head><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envFile: false,
  appType: 'custom', logLevel: 'error', plugins: [{ name: 'admin-tenant-demo-boundaries', enforce: 'pre',
    resolveId(source) {
      if (source === entryPath) return entryPath;
      if (source === 'next/link') return '\0admin-tenant-demo-link';
      if (/\/(systemAdminTenantDirectoryActions|systemAdminSubscriptionActions|systemAdminBusinessProfileActions)(?:\.ts)?$/.test(source)) return '\0admin-tenant-demo-actions';
    },
    load(id) {
      if (id === entryPath) return entry;
      if (id === '\0admin-tenant-demo-link') return "import React from'react';export default function Link({children,...props}){return React.createElement('a',props,children);}";
      if (id === '\0admin-tenant-demo-actions') return actions.map(name => `export function ${name}(input){return window.__adminTenantDemo.action('${name}',input);}`).join('\n');
    },
    configureServer(vite) { vite.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== '/') return next(); response.setHeader('Content-Type', 'text/html;charset=utf-8');
      response.end(await vite.transformIndexHtml('/', html));
    }); },
  }, react()], server: { host: '127.0.0.1', port: 0 } });
const scenarios = [], errors = [], externalRequests = [];
const stateOf = page => page.evaluate(() => window.__adminTenantDemo.state);
const waitText = (page, text) => page.getByText(text, { exact: true }).first().waitFor();
async function release(page, action) {
  await page.waitForFunction(action => window.__adminTenantDemo.state.pending === action, action);
  await page.evaluate(() => window.__adminTenantDemo.release());
}
async function failNext(page, status) { await page.evaluate(status => { window.__adminTenantDemo.state.failure = status; }, status); }
let browser;
try {
  await mkdir(output, { recursive: true }); await server.listen();
  const address = server.httpServer.address(); assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`; browser = await launchAcceptanceBrowser();
  for (const language of ['he', 'en', 'ar']) {
    const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, timezoneId: 'UTC' }); page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push({ language, message: error.message }));
    page.on('request', request => { if (new URL(request.url()).origin !== origin) externalRequests.push(request.url()); });
    await restrictAcceptancePage(page, origin); await page.goto(origin + '/?lang=' + language);
    const m = readSystemAdminTenantMessages(language), profileMessages = readSystemAdminBusinessProfileMessages(language);
    const create = page.locator('.admin-create-subscription'), card = page.locator('.admin-tenant-card');
    await create.waitFor(); await create.getByRole('button', { name: m.createSubscription, exact: true }).click();
    assert.equal((await stateOf(page)).calls.length, 0, 'Native required date validation must stop empty creation');
    await create.locator('[name=status]').selectOption('active');
    await create.locator('[name=startsAt]').fill('2026-09-01'); await create.locator('[name=endsAt]').fill('2026-10-01');
    await failNext(page, 'server-error'); await create.locator('button').click();
    await page.waitForFunction(() => window.__adminTenantDemo.state.pending !== null);
    assert.equal(await create.locator('button').isDisabled(), true);
    await release(page, 'createTenantSubscriptionAdminAction'); await waitText(page, m.subscriptionActionFailures['server-error']);
    assert.equal((await stateOf(page)).tenant.subscription, null); assert.equal(await create.locator('[name=endsAt]').inputValue(), '2026-10-01');
    await create.locator('button').click(); await release(page, 'createTenantSubscriptionAdminAction'); await waitText(page, m.subscriptionCreated);
    assert.equal(await create.count(), 0); assert.equal((await stateOf(page)).tenant.subscription.version, 1);
    const createPayload = { tenantId: adminTenantDemoId, status: 'active', startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-10-01T00:00:00.000Z' };
    assert.deepEqual((await stateOf(page)).calls.filter(call => call.name === 'createTenantSubscriptionAdminAction').map(call => call.input), [createPayload, createPayload]);
    scenarios.push({ language, id: 'create-required-date-validation-pending-error-retry', status: 'passed' });

    const extension = card.locator('form').filter({ has: page.locator('input[name=newEndsAt]') });
    await extension.locator('input').fill('2026-09-30'); await extension.locator('button').click();
    assert.equal((await stateOf(page)).calls.length, 2, 'An end date before the loaded minimum must not submit');
    await extension.locator('input').fill('2026-11-01'); await extension.locator('button').click();
    await release(page, 'extendTenantSubscriptionAdminAction'); await waitText(page, m.subscriptionExtended);
    assert.equal((await stateOf(page)).tenant.subscription.version, 2);
    assert.deepEqual((await stateOf(page)).calls.at(-1).input, { tenantId: adminTenantDemoId, expectedVersion: 1, newEndsAt: '2026-11-01T00:00:00.000Z' });
    scenarios.push({ language, id: 'extend-date-validation-and-current-version', status: 'passed' });

    const statusForm = card.locator('.admin-mutation-grid form').filter({ has: page.locator('select[name=status]') });
    await statusForm.locator('select').selectOption('suspended'); await statusForm.locator('button').click();
    await release(page, 'changeTenantSubscriptionStatusAdminAction'); await waitText(page, m.subscriptionStatusUpdated);
    await card.locator('.admin-tenant-heading .admin-status').getByText(m.tenantStatuses.suspended, { exact: true }).waitFor();
    assert.deepEqual((await stateOf(page)).calls.at(-1).input, { tenantId: adminTenantDemoId, expectedVersion: 2, status: 'suspended' });
    assert.equal((await stateOf(page)).tenant.subscription.version, 3);
    scenarios.push({ language, id: 'status-change-updates-summary-and-version', status: 'passed' });

    const cancel = card.getByRole('button', { name: m.cancelSubscription, exact: true });
    const beforeCancel = (await stateOf(page)).calls.length;
    page.once('dialog', dialog => { assert.equal(dialog.message(), m.cancelConfirmation('Demo admin business')); return dialog.dismiss(); });
    await cancel.click(); assert.equal((await stateOf(page)).calls.length, beforeCancel);
    page.once('dialog', dialog => dialog.accept()); await cancel.click();
    await release(page, 'cancelTenantSubscriptionAdminAction'); await waitText(page, m.subscriptionCancelled);
    assert.equal(await cancel.isDisabled(), true); assert.equal((await stateOf(page)).tenant.subscription.version, 4);
    assert.deepEqual((await stateOf(page)).calls.at(-1).input, { tenantId: adminTenantDemoId, expectedVersion: 3 });
    scenarios.push({ language, id: 'cancel-dismiss-does-nothing-confirm-uses-current-version', status: 'passed' });

    const profile = card.locator('.admin-business-profile-form');
    const name = profile.locator('[name=businessName]'), timezone = profile.locator('[name=timezone]');
    await name.fill(''); const beforeProfile = (await stateOf(page)).calls.length; await profile.getByRole('button', { name: profileMessages.save, exact: true }).click();
    assert.equal((await stateOf(page)).calls.length, beforeProfile);
    await name.fill('Demo updated by Admin'); await timezone.fill('Europe/London'); await profile.locator('select').selectOption(language);
    await failNext(page, 'conflict'); await profile.locator('button').click();
    await page.waitForFunction(() => window.__adminTenantDemo.state.pending !== null); assert.equal(await name.isDisabled(), true);
    await release(page, 'updateBusinessProfileAdminAction'); await waitText(page, m.profileActionFailures.conflict);
    assert.equal(await name.inputValue(), 'Demo updated by Admin'); assert.equal((await stateOf(page)).tenant.businessProfile.version, 2);
    await profile.locator('button').click(); await release(page, 'updateBusinessProfileAdminAction'); await waitText(page, m.profileUpdated);
    await card.getByRole('heading', { name: 'Demo updated by Admin', exact: true }).waitFor();
    const expectedProfile = { tenantId: adminTenantDemoId, expectedVersion: 2, businessName: 'Demo updated by Admin', timezone: 'Europe/London', interfaceLanguage: language };
    assert.deepEqual((await stateOf(page)).calls.filter(call => call.name === 'updateBusinessProfileAdminAction').map(call => call.input), [expectedProfile, expectedProfile]);
    scenarios.push({ language, id: 'profile-validation-conflict-retains-fields-and-retry-updates-heading', status: 'passed' });
    await timezone.fill('Asia/Jerusalem'); await profile.locator('button').click(); await release(page, 'updateBusinessProfileAdminAction');
    await page.waitForFunction(() => window.__adminTenantDemo.state.tenant.businessProfile.version === 4);
    assert.deepEqual((await stateOf(page)).calls.at(-1).input, { ...expectedProfile, expectedVersion: 3, timezone: 'Asia/Jerusalem' });
    assert.equal(await profile.locator('[name=timezone]').inputValue(), 'Asia/Jerusalem');
    scenarios.push({ language, id: 'profile-second-edit-uses-server-returned-version', status: 'passed' });
    assert.equal(await page.locator('main').getAttribute('lang'), language); assert.equal(await page.locator('main').getAttribute('dir'), language === 'en' ? 'ltr' : 'rtl');
    await page.screenshot({ path: output + engine + '-' + language + '.png', fullPage: true });
    const finalState = await stateOf(page);
    await page.goto(origin + '/?lang=' + language + '&denied'); await waitText(page, m.states['permission-denied'].title);
    assert.equal(await page.locator('.admin-tenant-card,.admin-directory-toolbar').count(), 0);
    assert.deepEqual((await stateOf(page)).calls, []);
    scenarios.push({ language, id: 'denied-admin-renders-no-tenant-forms', status: 'passed', finalAuthorizedFixtureState: finalState });
    await page.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
  const report = { suite: 'admin-tenant-demo', status: 'passed', engine, browserVersion: browser.version(), accounts: [adminTenantDemoAccount],
    workflows: ['W20'], scenarios, errors, externalRequests, externalProviderCalls: 0,
    scope: 'Existing SystemAdminTenantPanel and BusinessProfileForm with stateful local Server Action fixtures. Native validation, lifecycle payload versions, confirmation and failure/retry; no real authorization, subscription, payment or database.' };
  await writeFile(output + engine + '.json', JSON.stringify(report, null, 2) + '\n');
  console.log('CONNECT_DEMO_RESULT ' + JSON.stringify({ suite: report.suite, status: report.status, engine, scenarios: scenarios.length, languages: ['he', 'en', 'ar'], externalProviderCalls: 0 }));
} finally { await browser?.close(); await server.close(); }
