import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { owner, agent, teamDirectoryFixture } from '../tests/fixtures/team-memberships.mjs';
import { readTeamManagementMessages } from '../features/team/teamManagementMessages.ts';
import { readTeamDirectoryMessages } from '../features/team/teamDirectoryMessages.ts';

// Real team components, existing fixtures and controlled server-action promises.
// No Clerk session, invitation, permission change or provider call is created.
const actionsId = '\0connect-team-browser-actions';
const invitationsId = '\0connect-team-browser-invitations';
const navigationId = '\0connect-team-browser-navigation';
const entryPath = '/__team-browser-entry.js';
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Team management acceptance</title></head>
<body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const entry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { TeamDirectory } from '/features/team/TeamDirectory.tsx';
const root = createRoot(document.getElementById('root'));
window.__renderTeam = (language, directory) => {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  root.render(React.createElement(TeamDirectory, {language, directory, status:'ready'}));
};
window.__renderTeam(new URLSearchParams(location.search).get('language'), ${JSON.stringify(teamDirectoryFixture())});`;
const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envFile: false,
  appType: 'custom', logLevel: 'error',
  plugins: [{
    name: 'connect-team-browser-action-boundary', enforce: 'pre',
    resolveId(source) {
      if (source === '../../server/team/teamMembershipActions.ts') return actionsId;
      if (source === '../../server/team/teamInvitationActions.ts') return invitationsId;
      if (source === 'next/navigation') return navigationId;
      if (source === entryPath) return entryPath;
    },
    load(id) {
      if (id === entryPath) return entry;
      if (id === navigationId) return `export function useRouter() { return { refresh() { window.__workspaceRefreshes = (window.__workspaceRefreshes ?? 0) + 1; } }; }`;
      if (id === invitationsId) return `export async function inviteTeamMemberAction() { throw new Error('Invitations must not be submitted by this acceptance'); }`;
      if (id === actionsId) return `
        const state = window.__teamActions = {calls:[],pending:null};
        const action = name => input => new Promise((resolve, reject) => {
          if (state.pending) throw new Error('Concurrent team mutation');
          state.calls.push({name,input});
          state.pending = {
            resolve(result) {state.pending = null; resolve(result);},
            reject() {state.pending = null; reject(new Error('Controlled transport failure'));}
          };
        });
        export const changeTeamMemberRoleAction = action('role');
        export const changeTeamMemberStatusAction = action('status');
        export const transferTeamOwnershipAction = action('transfer');`;
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
    // The harness has no reason to access any external service.
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
      ? route.continue() : route.abort());
    const m = readTeamManagementMessages(language);
    const labels = readTeamDirectoryMessages(language);
    const management = page.locator('.team-management-card');
    const member = page.locator('#team-managed-member');
    const role = page.locator('#team-managed-role');
    const button = name => management.getByRole('button', { name, exact: true });
    const calls = () => page.evaluate(() => window.__teamActions.calls);
    const pending = () => page.waitForFunction(() => window.__teamActions.pending !== null);
    async function open() {
      await page.goto(`http://127.0.0.1:${address.port}/?language=${language}`, { waitUntil: 'networkidle' });
      await member.selectOption(agent.memberKey);
    }
    async function resolve(result) {
      await page.evaluate(value => window.__teamActions.pending.resolve(value), result);
      await page.waitForFunction(() => document.querySelector('.team-management-fields')?.matches(':disabled') !== true);
    }
    async function savedMember(change) {
      await resolve({ status: 'saved', membership: { ...agent, ...change } });
      await page.getByRole('status', { exact: false }).filter({ hasText: m.saved }).waitFor();
    }
    async function assertPending(actionButton) {
      await pending();
      assert.equal(await member.isDisabled(), true);
      assert.equal(await management.locator('fieldset').evaluate(element => element.matches(':disabled')), true);
      const before = await calls();
      await actionButton.evaluate(element => { element.click(); element.click(); });
      assert.deepEqual(await calls(), before);
    }
    async function assertRefreshRequired() {
      await management.getByRole('alert').waitFor();
      assert.equal(await button(m.refresh).isVisible(), true);
      assert.equal(await member.isDisabled(), true);
      assert.equal(await management.locator('fieldset').evaluate(element => element.matches(':disabled')), true);
    }

    await open();
    await role.selectOption('viewer');
    // Same-event double click exercises the synchronous in-flight guard.
    await button(m.save).evaluate(element => { element.click(); element.click(); });
    await assertPending(button(m.save));
    assert.deepEqual(await calls(), [{ name: 'role', input: { memberKey: agent.memberKey, expectedVersion: 1, role: 'viewer' } }]);
    await savedMember({ role: 'viewer', version: 2 });
    assert.equal(await role.inputValue(), 'viewer');
    scenarios++;

    await button(m.suspend).click();
    assert.equal((await calls()).length, 1, 'Opening confirmation must not submit');
    await button(m.cancel).click();
    assert.equal((await calls()).length, 1, 'Cancel must not submit');
    await button(m.suspend).click();
    await button(m.confirm).click();
    await assertPending(button(m.confirm));
    assert.deepEqual((await calls()).at(-1), { name: 'status', input: { memberKey: agent.memberKey, expectedVersion: 2, status: 'suspended' } });
    await savedMember({ role: 'viewer', version: 3, status: 'suspended' });
    assert.equal(await role.isDisabled(), true);
    assert.equal(await button(m.transfer).count(), 0);
    await button(m.restore).click();
    await assertPending(button(m.restore));
    assert.deepEqual((await calls()).at(-1).input, { memberKey: agent.memberKey, expectedVersion: 3, status: 'active' });
    await savedMember({ role: 'viewer', version: 4 });
    scenarios++;

    await button(m.transfer).click();
    assert.equal(await button(m.confirm).isDisabled(), true);
    await page.getByLabel(m.confirmTransfer, { exact: true }).check();
    await button(m.cancel).click();
    await button(m.transfer).click();
    assert.equal(await page.getByLabel(m.confirmTransfer, { exact: true }).isChecked(), false);
    assert.equal(await button(m.confirm).isDisabled(), true);
    await page.getByLabel(m.formerRole, { exact: true }).selectOption('viewer');
    await page.getByLabel(m.confirmTransfer, { exact: true }).check();
    await button(m.confirm).click();
    await assertPending(button(m.confirm));
    assert.deepEqual((await calls()).at(-1), { name: 'transfer', input: {
      newOwnerMemberKey: agent.memberKey, formerOwnerExpectedVersion: 2,
      newOwnerExpectedVersion: 4, formerOwnerRole: 'viewer',
    } });
    await resolve({ status: 'saved', formerOwner: { ...owner, role: 'viewer', version: 3 }, newOwner: { ...agent, role: 'owner', version: 5 } });
    await management.getByText(m.ownerOnly, { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__workspaceRefreshes), 1);
    assert.equal(await member.count(), 0);
    assert.equal(await page.getByRole('button', { name: labels.invite, exact: true }).count(), 0);
    assert.equal(await page.locator('.team-member-list').getByText(labels.roles.owner, { exact: true }).count(), 1);
    scenarios++;

    for (const actorRole of ['manager', 'agent', 'viewer']) {
      await open();
      const directory = teamDirectoryFixture();
      directory.members[0].currentUser = false;
      directory.members[1] = { ...directory.members[1], currentUser: true, role: actorRole };
      await page.evaluate(({ language, directory }) => window.__renderTeam(language, directory), { language, directory });
      await management.getByText(m.ownerOnly, { exact: true }).waitFor();
      assert.equal(await member.count(), 0);
      assert.equal(await page.getByRole('button', { name: labels.invite, exact: true }).count(), actorRole === 'manager' ? 1 : 0);
      assert.deepEqual(await calls(), []);
      scenarios++;
    }

    for (const outcome of [
      { status: 'conflict' },
      { status: 'permission-denied' },
      { status: 'saved', membership: { ...agent, memberKey: 'foreign', role: 'viewer', version: 2 } },
      { status: 'saved', membership: { ...agent, role: 'viewer', version: 0 } },
      null,
    ]) {
      await open();
      await role.selectOption('viewer');
      await button(m.save).click();
      await pending();
      if (outcome === null) await page.evaluate(() => window.__teamActions.pending.reject());
      else await page.evaluate(value => window.__teamActions.pending.resolve(value), outcome);
      await assertRefreshRequired();
      await button(m.save).evaluate(element => element.click());
      assert.equal((await calls()).length, 1);
      assert.equal(await page.locator('.team-member-list').getByText(labels.roles.agent, { exact: true }).count(), 1);
      scenarios++;
    }

    await open();
    await role.selectOption('viewer');
    await button(m.save).click();
    await pending();
    const refreshed = teamDirectoryFixture();
    refreshed.members[0] = { ...refreshed.members[0], role: 'viewer', version: 3 };
    refreshed.members[1] = { ...refreshed.members[1], role: 'owner', version: 2 };
    await page.evaluate(({ language, directory }) => window.__renderTeam(language, directory), { language, directory: refreshed });
    await management.getByText(m.ownerOnly, { exact: true }).waitFor();
    await resolve({ status: 'saved', membership: { ...agent, role: 'viewer', version: 2 } });
    assert.equal(await member.count(), 0, 'Old acknowledgement must not restore stale owner controls');
    assert.equal(await page.locator('.team-member-list').getByText(labels.roles.owner, { exact: true }).count(), 1);
    scenarios++;
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(`Team management browser acceptance: PASS (${scenarios} scenarios across Hebrew, English and Arabic; roles, suspension, restoration, owner transfer, duplicate submission, stale responses and refreshed authority)`);
} finally {
  await browser?.close();
  await server.close();
}
