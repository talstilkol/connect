import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { launchAcceptanceBrowser, readAcceptanceBrowserName, restrictAcceptancePage } from './browser-acceptance.mjs';
import { readMetaDataSyncMessages } from '../features/workspace/metaDataSyncMessages.ts';
import { readMetaConnectionPanelMessages } from '../features/workspace/metaConnectionPanelMessages.ts';
import { readConversationMessages } from '../features/conversations/conversationMessages.ts';
import { metaMediaTaskMessages } from '../features/workspace/metaMediaTaskMessages.ts';
import {
  metaLifecycleMediaAccounts, metaLifecycleMediaTime, metaLifecycleMediaBytes, metaLifecycleMediaMessageKey,
  metaLifecycleMediaTasks, metaLifecycleMediaToken, metaLifecycleSignup, metaLifecycleDeletedOriginalText,
} from '../tests/fixtures/meta-lifecycle-media-demo.mjs';

// Actual React controls, coordinator, message parser and streamed download client.
// Only SDK loading, action/router callbacks and the owned local HTTP response are
// fixtures. Neither browser requests nor the synthetic token reach a provider.
const engine = readAcceptanceBrowserName();
const output = fileURLToPath(new URL('../output/demo-journeys/meta-lifecycle-media/', import.meta.url));
const entryPath = '/__meta-lifecycle-media-demo.js';
const entry = `import React,{useState}from'react';
import{createRoot}from'react-dom/client';
import{MetaDataSyncStatus}from'/features/workspace/MetaDataSyncStatus.tsx';
import{MetaMediaDownloadControl}from'/features/conversations/MetaMediaDownloadControl.tsx';
import{MetaMediaTaskPanel}from'/features/workspace/MetaMediaTaskPanel.tsx';
import{mediaInspectionRetryMessages}from'/features/workspace/MetaMediaInspectionRetryControl.tsx';
import{mediaCleanupMessages}from'/features/workspace/MetaMediaCleanupControl.tsx';
import{MetaConnectionPanel}from'/features/workspace/MetaConnectionPanel.tsx';
import{ConversationMessageView}from'/features/conversations/ConversationMessageView.tsx';
import{emptyManualReplyDraft}from'/features/conversations/manualReplyDraft.ts';
import{createMetaLifecycleMediaBoundary,metaLifecycleMediaAccounts,metaLifecycleSyncStates,metaLifecycleMediaTasks,metaLifecycleMediaMessageKey,metaLifecycleSignup,metaLifecycleHistoryThread}from'/tests/fixtures/meta-lifecycle-media-demo.mjs';
import'/app/globals.css';
const root=createRoot(document.getElementById('root'));
window.__metaDemo=createMetaLifecycleMediaBoundary();
window.__metaTexts={retry:mediaInspectionRetryMessages,cleanup:mediaCleanupMessages};
function Demo({kind,language}){
 const [index,setIndex]=useState(0);
 const [signupOpen,setSignupOpen]=useState(true);
 const denied=kind==='tasks-denied';const readOnly=kind==='tasks-viewer';
 return React.createElement('main',{lang:language,dir:language==='en'?'ltr':'rtl'},
  React.createElement('p',null,'LOCAL DEMO ONLY · '+(readOnly?metaLifecycleMediaAccounts.viewer.email:metaLifecycleMediaAccounts.owner.email)),
  kind==='sync'?React.createElement(MetaDataSyncStatus,{language,dataSync:metaLifecycleSyncStates[index],onRefresh(){window.__metaDemo.state.refreshes++;setIndex(current=>Math.min(current+1,metaLifecycleSyncStates.length-1));}}):null,
  kind==='download'?React.createElement(MetaMediaDownloadControl,{language,messageKey:metaLifecycleMediaMessageKey,origin:location.origin,getToken:window.__metaDemo.getToken}):null,
  kind.startsWith('tasks')?React.createElement(MetaMediaTaskPanel,{language,result:denied?{status:'permission-denied',page:null}:{status:'ready',page:metaLifecycleMediaTasks},requestRetry:readOnly?undefined:window.__metaDemo.requestRetry,requestCleanup:readOnly?undefined:window.__metaDemo.requestCleanup}):null,
  kind.startsWith('signup')&&signupOpen?React.createElement(MetaConnectionPanel,{language,connection:{status:'disconnected'},embeddedSignup:kind==='signup-business-app'?{...metaLifecycleSignup.configuration,businessAppEnabled:true}:metaLifecycleSignup.configuration,onClose(){setSignupOpen(false);}}):null,
  kind==='history'?React.createElement(ConversationMessageView,{language,authEnabled:false,selectedThread:metaLifecycleHistoryThread,conversations:[metaLifecycleHistoryThread.conversation],selectedAiApprovals:[],canReply:false,canDecideAi:false,aiApprovalStatus:'ready',feedback:null,isBusy:false,pendingConversationKey:null,pendingApprovalKey:null,changeSelectedAssignment(){throw Error('Read-only fixture');},markSelectedRead(){throw Error('Read-only fixture');},manualReplyDraft:emptyManualReplyDraft,updateManualReplyDraft(){throw Error('Read-only fixture');},requestGate:{current:false},decideAiApproval(){throw Error('Read-only fixture');}}):null
 );
}
window.__renderMetaDemo=(kind,language)=>{document.documentElement.lang=language;document.documentElement.dir=language==='en'?'ltr':'rtl';root.render(React.createElement(Demo,{kind,language}));};`;
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Meta lifecycle and media demo</title></head><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envFile: false, appType: 'custom', logLevel: 'error',
  define: { 'process.env.NEXT_PUBLIC_META_MEDIA_DOWNLOAD_ORIGIN': 'undefined' },
  plugins: [{
    name: 'meta-lifecycle-media-demo-boundaries', enforce: 'pre',
    resolveId(source) {
      if (source === entryPath) return entryPath;
      if (source === 'next/navigation') return '\0meta-demo-router';
      if (source === '@clerk/nextjs') return '\0meta-demo-clerk';
      if (/\/metaEmbeddedSignupSdk(?:\.ts)?$/.test(source)) return '\0meta-demo-sdk';
      if (/\/metaEmbeddedSignupActions(?:\.ts)?$/.test(source)) return '\0meta-demo-actions';
      if (/\/conversationActions(?:\.ts)?$/.test(source)) return '\0meta-demo-reply';
    },
    load(id) {
      if (id === entryPath) return entry;
      if (id === '\0meta-demo-router') return 'const router={refresh(){window.__metaDemo.state.refreshes++;}};export function useRouter(){return router;}';
      if (id === '\0meta-demo-clerk') return 'export function useAuth(){throw Error("No real Clerk in this local demo");}';
      if (id === '\0meta-demo-sdk') return 'export const metaEmbeddedSignupSdkLoader={load(configuration){return window.__metaDemo.sdkLoad(configuration);}};';
      if (id === '\0meta-demo-actions') return 'export function beginMetaEmbeddedSignupAction(flow){return window.__metaDemo.beginSignup(flow);}export function completeMetaEmbeddedSignupAction(input){return window.__metaDemo.completeSignup(input);}';
      if (id === '\0meta-demo-reply') return 'export function sendManualReplyAction(){throw Error("History demo must not send replies");}';
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
const errors = [];
const externalRequests = [];
const scenarios = [];
const downloadLabels = {
  he: { cancelled: 'ההורדה בוטלה.', saved: 'הקובץ הועבר לדפדפן לשמירה.', limited: 'הגעת למגבלת ההורדות. נסה שוב בעוד דקה.' },
  en: { cancelled: 'Download cancelled.', saved: 'The file was sent to your browser to save.', limited: 'Download limit reached. Try again in a minute.' },
  ar: { cancelled: 'تم إلغاء التنزيل.', saved: 'أُرسل الملف إلى المتصفح لحفظه.', limited: 'تم بلوغ حد التنزيل. حاول مجددًا بعد دقيقة.' },
};
const waitText = (page, text) => page.getByText(text, { exact: true }).first().waitFor();
const stateOf = page => page.evaluate(() => window.__metaDemo.state);
let browser;
try {
  await mkdir(output, { recursive: true });
  await server.listen();
  const address = server.httpServer.address(); assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await launchAcceptanceBrowser();
  async function open(kind, language) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push({ kind, language, message: error.message }));
    page.on('request', request => { if (new URL(request.url()).origin !== origin) externalRequests.push(request.url()); });
    await restrictAcceptancePage(page, origin);
    if (kind.startsWith('signup')) await page.clock.install({ time: new Date(metaLifecycleMediaTime) });
    await page.goto(origin + '/');
    await page.waitForFunction(() => typeof window.__renderMetaDemo === 'function');
    await page.evaluate(({ kind, language }) => window.__renderMetaDemo(kind, language), { kind, language });
    return page;
  }
  async function finish(page, language, scenario, details = {}) {
    assert.equal(await page.locator('main').first().getAttribute('lang'), language);
    assert.equal(await page.locator('main').first().getAttribute('dir'), language === 'en' ? 'ltr' : 'rtl');
    scenarios.push({ language, scenario, status: 'passed', details, state: await stateOf(page) });
    if (language === 'en' && ['sync-lifecycle', 'task-actions', 'signup-cancel-timeout-retry'].includes(scenario)) {
      await page.screenshot({ path: output + engine + '-' + scenario + '.png', fullPage: true });
    }
    await page.close();
  }
  for (const language of ['he', 'en', 'ar']) {
    {
      const page = await open('sync', language); const m = readMetaDataSyncMessages(language);
      await waitText(page, m.stages['receiving-history']);
      assert.deepEqual(await page.locator('bdi').allTextContents(), ['50%', '2 / 4']);
      await page.getByRole('button', { name: m.refresh, exact: true }).click();
      await waitText(page, m.stages['awaiting-verification']); await waitText(page, m.verificationNotice);
      assert.deepEqual(await page.locator('bdi').allTextContents(), ['100%', '4 / 4']);
      await page.getByRole('button', { name: m.refresh, exact: true }).click();
      await waitText(page, m.stages['recovery-required']); await waitText(page, m.requests.unknown); await waitText(page, m.recoveryNotice);
      assert.equal(await page.locator('bdi').count(), 0);
      await page.getByRole('button', { name: m.refresh, exact: true }).click();
      await waitText(page, m.stages['connection-changed']);
      assert.equal(await page.locator('bdi').count(), 0);
      assert.equal((await stateOf(page)).refreshes, 3);
      await finish(page, language, 'sync-lifecycle', { providerProgress100StillRequiresVerification: true, hiddenProgressAfterRecovery: true });
    }
    {
      const page = await open('history', language); const m = readConversationMessages(language);
      await waitText(page, 'Demo imported historical message'); await waitText(page, m.labels.historySource);
      await waitText(page, m.labels.historyDeliveryStates.READ); await waitText(page, 'Demo edited Business App echo');
      await waitText(page, m.labels.contentStates.edited); await waitText(page, m.labels.contentStates.deleted);
      assert.equal((await page.locator('.message-stream').textContent()).includes(metaLifecycleDeletedOriginalText), false,
        'Even stale boundary text for a deleted message must not reach the visible message stream');
      assert.equal(await page.locator('.message-bubble.inbound').count(), 1);
      assert.equal(await page.locator('.message-bubble.outbound').count(), 2);
      assert.equal(await page.locator('.manual-reply-composer textarea').isDisabled(), true);
      await finish(page, language, 'history-and-echo-display', { historicalDeliverySeparated: true, deletedBodyAbsent: true });
    }
    {
      const page = await open('download', language); const m = downloadLabels[language];
      const control = page.locator('.media-download-control'); const calls = [];
      let mode = 'limited';
      await page.route(origin + '/v1/media-files/**', async route => {
        const request = route.request();
        assert.equal(request.url(), origin + '/v1/media-files/' + metaLifecycleMediaMessageKey);
        assert.equal(request.method(), 'GET');
        assert.equal(request.headers().authorization, 'Bearer ' + metaLifecycleMediaToken);
        assert.equal(request.headers().cookie, undefined);
        calls.push({ path: new URL(request.url()).pathname, method: request.method(), syntheticAuthorizationMatched: true, cookiesAbsent: true, mode });
        await route.fulfill(mode === 'limited' ? { status: 429, body: '' } : { status: 200, body: Buffer.from(metaLifecycleMediaBytes),
          headers: { 'content-type': 'application/octet-stream', 'content-length': String(Buffer.byteLength(metaLifecycleMediaBytes)),
            'content-disposition': 'attachment; filename="media.bin"', 'cache-control': 'private, no-store' } });
      });
      await control.locator('button').first().click();
      await control.locator('button').nth(1).waitFor();
      assert.equal(await control.locator('button').first().isDisabled(), true);
      await control.locator('button').nth(1).click(); await waitText(page, m.cancelled);
      assert.equal(calls.length, 0, 'Cancellation while obtaining a token must not request media');
      await page.evaluate(() => { window.__metaDemo.state.tokenMode = 'valid'; });
      await control.locator('button').first().click(); await waitText(page, m.limited);
      assert.equal(calls.length, 1);
      mode = 'valid';
      const downloaded = page.waitForEvent('download');
      await control.locator('button').first().click();
      const download = await downloaded;
      await waitText(page, m.saved);
      assert.equal(download.suggestedFilename(), 'media.bin');
      assert.equal((await readFile(await download.path())).toString('utf8'), metaLifecycleMediaBytes, 'The saved file must contain the exact local fixture bytes');
      assert.equal(calls.length, 2);
      await finish(page, language, 'media-cancel-rate-limit-retry-download', { requests: calls, bytesVerified: true });
    }
    {
      const page = await open('tasks', language);
      const m = await page.evaluate(language => ({ retry: window.__metaTexts.retry[language], cleanup: window.__metaTexts.cleanup[language] }), language);
      const retry = page.locator('.media-inspection-retry'); const cleanup = page.locator('.media-cleanup-control');
      assert.equal(await page.locator('.media-diagnostics-task').count(), 3);
      assert.equal(await retry.count(), 1, 'Exhausted retries must not expose a retry action');
      assert.equal(await cleanup.count(), 1, 'Only the eligible quarantined fixture exposes cleanup');
      await retry.getByRole('button', { name: m.retry.label, exact: true }).click();
      await page.waitForFunction(() => window.__metaDemo.state.retryCalls.length === 1);
      assert.equal(await retry.locator('button').isDisabled(), true);
      await page.evaluate(() => window.__metaDemo.resolveRetry('server-error'));
      await waitText(page, m.retry['server-error']);
      await retry.locator('button').click(); await waitText(page, m.retry['already-requested']);
      assert.equal(await retry.locator('button').isDisabled(), true);
      const retryPayload = { jobKey: metaLifecycleMediaTasks.tasks[0].jobKey, expectedVersion: 4 };
      assert.deepEqual((await stateOf(page)).retryCalls, [retryPayload, retryPayload]);
      assert.equal((await stateOf(page)).retryIntents, 1);
      await cleanup.getByRole('button', { name: m.cleanup.label, exact: true }).click();
      await cleanup.getByRole('button', { name: m.cleanup.cancel, exact: true }).click();
      assert.equal((await stateOf(page)).cleanupCalls.length, 0, 'Cancel must not issue cleanup');
      await cleanup.getByRole('button', { name: m.cleanup.label, exact: true }).click();
      await cleanup.getByRole('button', { name: m.cleanup.confirm, exact: true }).click();
      await page.waitForFunction(() => window.__metaDemo.state.cleanupCalls.length === 1);
      assert.equal(await cleanup.locator('button').isDisabled(), true);
      await page.evaluate(() => window.__metaDemo.resolveCleanup('conflict')); await waitText(page, m.cleanup.conflict);
      assert.equal((await stateOf(page)).cleanupIntents, 0);
      await cleanup.getByRole('button', { name: m.cleanup.label, exact: true }).click();
      await cleanup.getByRole('button', { name: m.cleanup.confirm, exact: true }).click();
      await page.waitForFunction(() => window.__metaDemo.state.cleanupCalls.length === 2);
      await page.evaluate(() => window.__metaDemo.resolveCleanup('queued')); await waitText(page, m.cleanup.queued);
      assert.equal(await cleanup.locator('button').isDisabled(), true);
      const cleanupPayload = { jobKey: metaLifecycleMediaTasks.tasks[1].jobKey, expectedVersion: 7, confirm: 'remove-quarantined-copy' };
      assert.deepEqual((await stateOf(page)).cleanupCalls, [cleanupPayload, cleanupPayload]);
      assert.equal((await stateOf(page)).cleanupIntents, 1);
      await finish(page, language, 'task-actions', { retryLostAcknowledgementDeduplicated: true, cleanupConfirmationAndConflict: true });
    }
    for (const kind of ['tasks-viewer', 'tasks-denied']) {
      const page = await open(kind, language);
      await page.getByRole('heading', { name: metaMediaTaskMessages[language].title, exact: true }).waitFor();
      assert.equal(await page.locator('.media-inspection-retry,.media-cleanup-control').count(), 0);
      if (kind === 'tasks-denied') await waitText(page, metaMediaTaskMessages[language].failures['permission-denied']);
      assert.deepEqual((await stateOf(page)).retryCalls, []); assert.deepEqual((await stateOf(page)).cleanupCalls, []);
      await finish(page, language, kind, { mutationsAbsent: true });
    }
    {
      const page = await open('signup', language); const m = readMetaConnectionPanelMessages(language);
      const button = page.locator('.panel-footer .primary-button');
      await page.getByRole('button', { name: m.actions.connect, exact: true }).waitFor();
      await button.click(); await waitText(page, m.attemptDetails['ready-to-launch']);
      assert.deepEqual((await stateOf(page)).beginCalls, ['cloud-api']);
      assert.equal((await stateOf(page)).sdkLogins.length, 0, 'Preparing a launch must not open the SDK asynchronously');
      await button.click(); await page.waitForFunction(() => window.__metaDemo.state.sdkLogins.length === 1);
      assert.equal(await button.isDisabled(), true);
      await page.evaluate(() => window.__metaDemo.loginResponse({})); await waitText(page, m.attemptDetails['client-cancelled']);
      assert.equal((await stateOf(page)).completeCalls.length, 0);
      await button.click(); await page.waitForFunction(() => window.__metaDemo.state.sdkLogins.length === 2);
      await page.evaluate(code => window.__metaDemo.loginResponse({ authResponse: { code } }), metaLifecycleSignup.authorizationCode);
      await page.clock.fastForward(25_001); await waitText(page, m.attemptDetails['client-error']);
      assert.equal((await stateOf(page)).completeCalls.length, 0, 'Authorization without asset completion must expire without submission');
      await button.click(); await page.waitForFunction(() => window.__metaDemo.state.sdkLogins.length === 3);
      const payload = { type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH', data: { business_id: metaLifecycleSignup.assets.businessPortfolioId, waba_id: metaLifecycleSignup.assets.wabaId, phone_number_id: metaLifecycleSignup.assets.phoneNumberId } };
      await page.evaluate(({ code, payload }) => {
        window.__metaDemo.loginResponse({ authResponse: { code } });
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://untrusted.example', data: JSON.stringify(payload) }));
      }, { code: metaLifecycleSignup.authorizationCode, payload });
      assert.equal((await stateOf(page)).completeCalls.length, 0, 'An untrusted message origin must not complete signup');
      await page.evaluate(payload => window.dispatchEvent(new MessageEvent('message', { origin: 'https://www.facebook.com', data: JSON.stringify(payload) })), payload);
      await waitText(page, m.attemptDetails.connected);
      assert.equal(await button.isDisabled(), true);
      const state = await stateOf(page);
      assert.deepEqual(state.sdkLoads, [{ appId: metaLifecycleSignup.configuration.appId, apiVersion: metaLifecycleSignup.configuration.apiVersion }]);
      assert.deepEqual(state.sdkLogins, Array.from({ length: 3 }, () => ({ config_id: metaLifecycleSignup.configuration.configurationId, response_type: 'code', override_default_response_type: true, extras: { setup: {} } })));
      assert.deepEqual(state.completeCalls, [{ authorizationCode: metaLifecycleSignup.authorizationCode, ...metaLifecycleSignup.assets, launchId: metaLifecycleSignup.launch.launchId }]);
      assert.equal(state.refreshes, 1);
      await finish(page, language, 'signup-cancel-timeout-retry', { realCoordinatorAndParser: true, untrustedOriginIgnored: true, providerOutcomeSimulated: true });
    }
    {
      const page = await open('signup-business-app', language); const m = readMetaConnectionPanelMessages(language);
      const button = page.locator('.panel-footer .primary-button');
      await page.getByRole('button', { name: m.actions.connect, exact: true }).waitFor();
      assert.equal(await page.locator('input[value="business-app"]').isChecked(), true);
      await button.click(); await waitText(page, m.attemptDetails['ready-to-launch']);
      assert.deepEqual((await stateOf(page)).beginCalls, ['business-app']);
      assert.equal((await stateOf(page)).sdkLogins.length, 0);
      await button.click(); await page.waitForFunction(() => window.__metaDemo.state.sdkLogins.length === 1);
      await page.evaluate(({ code, wabaId }) => {
        window.dispatchEvent(new MessageEvent('message', { origin: 'https://www.facebook.com', data: JSON.stringify({
          type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', data: { waba_id: wabaId },
        }) }));
        window.__metaDemo.loginResponse({ authResponse: { code } });
      }, { code: metaLifecycleSignup.authorizationCode, wabaId: metaLifecycleSignup.assets.wabaId });
      await waitText(page, m.attemptDetails['synchronization-pending']);
      assert.equal(await button.isDisabled(), true);
      const state = await stateOf(page);
      assert.deepEqual(state.sdkLogins, [{ config_id: metaLifecycleSignup.configuration.configurationId,
        response_type: 'code', override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' } }]);
      assert.deepEqual(state.completeCalls, [{ authorizationCode: metaLifecycleSignup.authorizationCode,
        flow: 'business-app', wabaId: metaLifecycleSignup.assets.wabaId, launchId: metaLifecycleSignup.launch.launchId }],
      'Business App completion must not invent an owner or phone absent from the SDK event');
      assert.equal(state.refreshes, 1);
      await page.getByRole('button', { name: m.businessApp.refresh, exact: true }).click();
      assert.equal((await stateOf(page)).refreshes, 2);
      await finish(page, language, 'business-app-signup-background-sync', { realCoordinatorAndParser: true, onlyWabaFromEvent: true, synchronizationPending: true });
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  const result = { suite: 'meta-lifecycle-media-demo', status: 'passed', engine, browserVersion: browser.version(),
    accounts: metaLifecycleMediaAccounts, workflows: ['W08', 'W09', 'W10'], scenarios,
    externalProviderCalls: 0, pageErrors: errors,
    scope: 'Real React controls, signup coordinator/parser and Blob download client. Local SDK/action/router/HTTP boundaries; no real account, asset, token, provider connection, cleanup or storage acceptance.',
    residuals: ['Historical message retrieval and echo ingestion are mocked display inputs; actual provider ingestion remains separate.', 'Cleanup and scan retry are queued action acknowledgements, not real storage/scan outcomes.'] };
  await writeFile(output + engine + '.json', JSON.stringify(result, null, 2) + '\n');
  console.log('CONNECT_DEMO_RESULT ' + JSON.stringify({ suite: result.suite, status: result.status, engine, scenarios: scenarios.length, languages: ['he', 'en', 'ar'], externalProviderCalls: 0 }));
} finally { await browser?.close(); await server.close(); }
