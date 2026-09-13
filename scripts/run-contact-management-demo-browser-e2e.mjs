import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { launchAcceptanceBrowser, readAcceptanceBrowserName, restrictAcceptancePage } from './browser-acceptance.mjs';
import { readContactDirectoryMessages } from '../features/contacts/contactDirectoryMessages.ts';
import { contactDemoAccounts, contactDemoAt } from './contact-management-demo-fixtures.mjs';

const engine = readAcceptanceBrowserName();
const output = fileURLToPath(new URL('../output/demo-journeys/contact-management/', import.meta.url));
const entryPath = '/__contact-management-demo.js';
const actions = ['saveContactAction', 'loadMoreContactsAction', 'grantContactConsentAction', 'unsubscribeContactAction',
  'createContactTagAction', 'createContactListAction', 'setContactTagAssignmentAction', 'setContactListMembershipAction'];
const entry = `import React from 'react';import{createRoot}from'react-dom/client';
import{ContactDirectory}from'/features/contacts/ContactDirectory.tsx';
import{WorkspaceDraftProvider}from'/features/workspace/WorkspaceDraftProvider.tsx';
import{createContactManagementDemo}from'/scripts/contact-management-demo-fixtures.mjs';
import'/styles/tokens.css';import'/styles/foundations.css';import'/features/contacts/directory.css';import'/features/contacts/import.css';
const q=new URLSearchParams(location.search),language=q.get('lang'),role=q.get('role')||'owner';
window.__contactDemo=createContactManagementDemo(role);
createRoot(document.getElementById('root')).render(React.createElement(WorkspaceDraftProvider,null,
React.createElement('main',{lang:language,dir:language==='en'?'ltr':'rtl'},
React.createElement('p',null,'LOCAL DEMO — '+window.__contactDemo.state.account.email),
React.createElement(ContactDirectory,{authEnabled:true,canWrite:role==='owner',language,
initialContacts:[window.__contactDemo.state.contacts[0]],initialNextCursor:43001,
initialOrganization:window.__contactDemo.snapshot(),initialStatus:'ready'}))));`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Contact management demo</title></head><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envFile: false,
  appType: 'custom', logLevel: 'error', plugins: [{ name: 'contact-management-demo', enforce: 'pre',
    resolveId(id) {
      if (id === entryPath) return id;
      if (/\/(contactActions|contactOrganizationActions)(\.ts)?$/.test(id)) return '\0contact-demo-actions';
      if (/\/contactImportActions(\.ts)?$/.test(id)) return '\0contact-demo-no-import';
    },
    load(id) {
      if (id === entryPath) return entry;
      if (id === '\0contact-demo-actions') return actions.map(name => `export async function ${name}(...args){return window.__contactDemo.action('${name}',...args);}`).join('\n');
      if (id === '\0contact-demo-no-import') return ['startContactImportAction','processContactImportChunkAction'].map(name=>`export function ${name}(){throw Error('Import belongs to its separate acceptance suite');}`).join('\n');
    },
    configureServer(vite) { vite.middlewares.use(async(req,res,next)=> {
      if(req.url?.split('?')[0] !== '/')return next();res.setHeader('Content-Type','text/html;charset=utf-8');res.end(await vite.transformIndexHtml('/',html));
    }); },
  },react()], server: { host: '127.0.0.1', port: 0 } });
const results=[],errors=[],externalRequests=[];
let browser;
async function state(page) { return page.evaluate(()=>window.__contactDemo.state); }
async function visible(page,text) { await page.getByText(text,{exact:true}).first().waitFor(); }
async function release(page,name) {
  await page.waitForFunction(name=>window.__contactDemo.state.pending===name,name);
  await page.evaluate(()=>window.__contactDemo.release());
}
async function failNext(page,status='server-error') { await page.evaluate(status=>window.__contactDemo.state.failure=status,status); }
try {
  await mkdir(output,{recursive:true});await server.listen();
  const origin='http://127.0.0.1:'+server.httpServer.address().port;
  browser=await launchAcceptanceBrowser();
  for(const language of ['he','en','ar']) {
    const page=await browser.newPage({viewport:{width:1280,height:900},timezoneId:'UTC'});page.setDefaultTimeout(12000);
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==origin)externalRequests.push(r.url());});
    await restrictAcceptancePage(page,origin);await page.goto(origin+'/?lang='+language);
    const m=readContactDirectoryMessages(language),d=m.directory,o=m.organization,c=m.consentEditor;
    const record=()=>page.locator('.contact-record-row').filter({hasText:'+12025550123'});
    const form=page.locator('.contact-profile-form'),submit=form.locator('button[type=submit]');
    await form.waitFor();assert.equal(await submit.isDisabled(),true);
    const input={phoneNumber:'+12025550123',firstName:'Demo New',lastName:'Contact',email:'new@connect-demo.invalid',company:'Local demo'};
    for(const [key,value]of Object.entries(input))await form.getByLabel(d.fields[key],{exact:true}).fill(value);
    await failNext(page);await submit.click();await page.waitForFunction(()=>window.__contactDemo.state.pending==='saveContactAction');
    assert.equal(await submit.isDisabled(),true);await release(page,'saveContactAction');await visible(page,d.feedback.failures['server-error']);
    assert.equal(await form.getByLabel(d.fields.firstName,{exact:true}).inputValue(),'Demo New');assert.equal(await page.locator('.contact-record-row').count(),1);
    await submit.click();await release(page,'saveContactAction');await record().waitFor();
    assert.equal(await form.getByLabel(d.fields.phoneNumber,{exact:true}).inputValue(),'');assert.equal(await record().getByText(d.blocked,{exact:true}).count(),1);
    const saves=(await state(page)).calls.filter(c=>c.name==='saveContactAction');assert.equal(saves.length,2);
    for(const call of saves){const {submissionOccurredAt,...payload}=call.args[0];assert.deepEqual(payload,input);assert.ok(Number.isFinite(Date.parse(submissionOccurredAt)));}
    results.push({language,id:'create-pending-failure-retains-input-and-retry-saves-blocked-contact',status:'passed'});

    for(const [key,value]of Object.entries({...input,firstName:'Demo Updated'}))await form.getByLabel(d.fields[key],{exact:true}).fill(value);
    await submit.click();await release(page,'saveContactAction');await record().getByText('Demo Updated Contact',{exact:true}).waitFor();
    assert.equal(await page.locator('.contact-record-row').count(),2);
    results.push({language,id:'same-phone-update-replaces-row-without-duplicate',status:'passed'});
    await failNext(page);await page.getByRole('button',{name:d.loadMore,exact:true}).click();await release(page,'loadMoreContactsAction');
    await visible(page,d.feedback.loadFailures['server-error']);assert.equal(await page.locator('.contact-record-row').count(),2);
    await page.getByRole('button',{name:d.loadMore,exact:true}).click();await release(page,'loadMoreContactsAction');await visible(page,d.allLoaded);
    assert.equal(await page.locator('.contact-record-row').count(),3);
    assert.deepEqual((await state(page)).calls.filter(c=>c.name==='loadMoreContactsAction').map(c=>c.args),[[43001],[43001]]);
    results.push({language,id:'pagination-failure-retry-merges-overlapping-page-once',status:'passed'});

    for(const [kind,groupName,fieldLabel,buttonLabel,action] of [
      ['tags','Demo tag',o.tagName,o.createTag,'createContactTagAction'],['lists','Demo list',o.listName,o.createList,'createContactListAction']]) {
      await page.getByLabel(fieldLabel,{exact:true}).fill(groupName);await page.getByRole('button',{name:buttonLabel,exact:true}).click();
      await release(page,action);await page.locator('.contact-group-list button').filter({hasText:groupName}).waitFor();
      assert.equal(await page.getByLabel(fieldLabel,{exact:true}).inputValue(),'');assert.equal((await state(page)).organization[kind][0].name,groupName);
    }
    await page.locator('.contact-group-contact-picker select').selectOption('43003');
    const tag=page.locator('.contact-group-list button').filter({hasText:'Demo tag'}),list=page.locator('.contact-group-list button').filter({hasText:'Demo list'});
    await failNext(page);await tag.click();await release(page,'setContactTagAssignmentAction');await visible(page,o.failures['server-error']);
    assert.equal(await tag.getAttribute('class'),'');await tag.click();await release(page,'setContactTagAssignmentAction');await page.waitForFunction(()=>document.querySelector('.contact-group-list button')?.className==='assigned');
    await list.click();await release(page,'setContactListMembershipAction');await list.locator('b').getByText(o.assigned,{exact:true}).waitFor();
    await tag.click();await release(page,'setContactTagAssignmentAction');await page.waitForFunction(()=>document.querySelector('.contact-group-list button')?.className==='');
    const assignments=(await state(page)).calls.filter(c=>c.name==='setContactTagAssignmentAction'||c.name==='setContactListMembershipAction');
    assert.deepEqual(assignments.map(c=>c.args[0]),[
      {contactId:43003,groupId:43011,assigned:true,expectedRevision:3},{contactId:43003,groupId:43011,assigned:true,expectedRevision:3},
      {contactId:43003,groupId:43012,assigned:true,expectedRevision:4},{contactId:43003,groupId:43011,assigned:false,expectedRevision:5}]);
    results.push({language,id:'create-tag-list-assign-remove-and-retry-use-current-revision',status:'passed'});

    await record().getByRole('button',{name:d.documentConsent,exact:true}).click();
    const consent=page.locator('.consent-editor-card');
    await consent.getByLabel(c.source,{exact:true}).fill('Explicit local demo only');
    await consent.getByLabel(c.occurredAt,{exact:true}).fill('2026-09-13T10:00');
    await consent.getByLabel(c.evidenceReference,{exact:true}).fill('demo-evidence-43003');
    await failNext(page);await consent.getByRole('button',{name:c.saveGrant,exact:true}).click();await release(page,'grantContactConsentAction');
    await consent.getByText(d.feedback.failures['server-error'],{exact:true}).waitFor();assert.equal(await record().getByText(d.blocked,{exact:true}).count(),1);
    await consent.getByRole('button',{name:c.saveGrant,exact:true}).click();await release(page,'grantContactConsentAction');await record().getByText(d.subscribed,{exact:true}).waitFor();
    const grants=(await state(page)).calls.filter(c=>c.name==='grantContactConsentAction');
    assert.deepEqual(grants.map(c=>c.args),Array.from({length:2},()=>[43003,{source:'Explicit local demo only',occurredAt:contactDemoAt,evidenceReference:'demo-evidence-43003'}]));
    await record().getByRole('button',{name:d.documentUnsubscribe,exact:true}).click();
    await consent.getByLabel(c.source,{exact:true}).fill('Demo withdrawal');await consent.getByLabel(c.occurredAt,{exact:true}).fill('2026-09-13T10:05');
    await consent.getByRole('button',{name:c.saveUnsubscribe,exact:true}).click();await release(page,'unsubscribeContactAction');await record().getByText(d.blocked,{exact:true}).waitFor();
    assert.equal((await state(page)).contacts.find(c=>c.id===43003).consentStatus,'withdrawn');
    assert.deepEqual((await state(page)).calls.filter(call=>call.name==='unsubscribeContactAction').map(call=>call.args),
      [[43003,{source:'Demo withdrawal',occurredAt:'2026-09-13T10:05:00.000Z',evidenceReference:''}]]);
    results.push({language,id:'explicit-demo-consent-failure-retry-and-withdrawal-update-status',status:'passed'});
    await failNext(page,'conflict');await list.click();await release(page,'setContactListMembershipAction');await visible(page,o.refreshNotice);
    assert.equal(await list.getAttribute('class'),'assigned');results.push({language,id:'relationship-conflict-keeps-last-confirmed-assignment-and-requests-refresh',status:'passed'});
    await page.screenshot({path:output+engine+'-'+language+'.png',fullPage:true});
    await page.goto(origin+'/?lang='+language+'&role=viewer');await visible(page,d.readOnly);
    assert.equal(await page.locator('.contact-profile-form,.consent-editor-card,.contact-group-create-grid,.contact-import-section').count(),0);
    assert.equal((await state(page)).calls.length,0);results.push({language,id:'viewer-exposes-no-write-or-import-controls',status:'passed'});
    await page.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
  const report={suite:'contact-management-demo',status:'passed',engine,browserVersion:browser.version(),accounts:contactDemoAccounts,
    scenarios:results.length,results,errors,externalRequests,scope:'Actual React contact directory and organization with controlled actions; fixture consent is not real consent, and no database or identity provider is involved.'};
  await writeFile(output+engine+'.json',JSON.stringify(report,null,2)+'\n');
  console.log('CONNECT_DEMO_RESULT '+JSON.stringify(report));
} finally {await browser?.close();await server.close();}
