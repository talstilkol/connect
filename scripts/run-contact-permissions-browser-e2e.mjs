import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { readContactDirectoryMessages } from '../features/contacts/contactDirectoryMessages.ts';

// Deterministic test fixtures only. Browser requests cannot leave localhost.
const contact = {
  id:23, phoneNumber:'+972500000023', firstName:'Tal', lastName:null, email:null,
  company:'Connect', mailingStatus:'subscribed', consentStatus:'granted',
  consentSource:'website', consentRecordedAt:'2026-08-17T10:00:00.000Z',
  consentWithdrawnAt:null, version:4,
};
const organization = {
  revision:4, scopeContactIds:[23], tags:[{id:5,name:'Customers',contactCount:1}], lists:[],
  tagAssignments:[{contactId:23,tagId:5}], listMemberships:[],
};
const entryPath='/__contact-permissions-entry.js';
const actionExports = {
  contactActions:['grantContactConsentAction','loadMoreContactsAction','saveContactAction','unsubscribeContactAction'],
  contactOrganizationActions:['createContactTagAction','createContactListAction','setContactTagAssignmentAction','setContactListMembershipAction'],
  contactImportActions:['processContactImportChunkAction','startContactImportAction'],
  tenantSelectionActions:['selectTenantAction'],
};
const entry=`import React from 'react';
import {createRoot} from 'react-dom/client';
import {ContactDirectory} from '/features/contacts/ContactDirectory.tsx';
import {TenantWorkspaceProvider} from '/features/workspace/TenantWorkspaceSwitcher.tsx';
import {useCurrentTenantRole} from '/features/workspace/tenantWorkspaceContext.ts';
import {WorkspaceDraftProvider} from '/features/workspace/WorkspaceDraftProvider.tsx';
import {hasPermission} from '/shared/domain/model.ts';
const root=createRoot(document.getElementById('root'));
window.__contactCalls=[];
function Contacts({language}) {
 const role=useCurrentTenantRole();
 return React.createElement(ContactDirectory,{authEnabled:true,language,canWrite:role!==null&&hasPermission(role,'contacts.write'),initialContacts:[${JSON.stringify(contact)}],initialNextCursor:23,initialOrganization:${JSON.stringify(organization)},initialStatus:'ready'});
}
window.__renderContacts=(language,directory)=>root.render(React.createElement(TenantWorkspaceProvider,{directory},React.createElement(WorkspaceDraftProvider,null,React.createElement(Contacts,{language}))));`;
const html=`<!doctype html><html><head><meta charset="utf-8"><title>Contact permission acceptance</title></head><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,envFile:false,appType:'custom',logLevel:'error',plugins:[{
 name:'contact-permissions-browser-boundary',enforce:'pre',
 resolveId(source) {
  if(source===entryPath)return entryPath;
  if(source==='@clerk/nextjs')return '\0contact-clerk';
  if(source==='next/navigation')return '\0contact-navigation';
  for(const name of Object.keys(actionExports)) if(source.endsWith('/'+name)||source.endsWith('/'+name+'.ts'))return '\0contact-actions:'+name;
 },
 load(id) {
  if(id===entryPath)return entry;
  if(id==='\0contact-clerk')return 'export const useClerk=()=>({setActive:async()=>{throw new Error("Clerk must not be called");}});';
  if(id==='\0contact-navigation')return 'export const useRouter=()=>({refresh(){}});';
  if(id.startsWith('\0contact-actions:'))return actionExports[id.split(':')[1]].map(name=>`export async function ${name}(input){window.__contactCalls.push({name:${JSON.stringify(name)},input});return {status:'permission-denied'};}`).join('\n');
 },
 configureServer(vite){vite.middlewares.use(async(request,response,next)=>{if(request.url?.split('?')[0]!=='/')return next();response.setHeader('Content-Type','text/html; charset=utf-8');response.end(await vite.transformIndexHtml('/',html));});},
},react()],server:{host:'127.0.0.1',port:0}});
let browser;
try {
 await server.listen();
 const address=server.httpServer.address();assert.ok(address&&typeof address!=='string');
 browser=await chromium.launch({headless:true});
 let scenarios=0;const errors=[];
 const directory=role=>({version:1,selectionRequired:false,options:[{selectionKey:'contact-test-selection',displayName:'Connect',role,selected:true}]});
 const cases=[['viewer',directory('viewer'),false],['agent',directory('agent'),false],['owner',directory('owner'),true],['manager',directory('manager'),true],['missing',null,false],['unselected',{...directory('owner'),options:[{...directory('owner').options[0],selected:false}]},false],['selection-required',{...directory('owner'),selectionRequired:true},false],['ambiguous',{...directory('owner'),options:[...directory('owner').options,...directory('manager').options]},false]];
 for(const language of ['he','en','ar']) for(const [name,selection,canWrite] of cases) {
  const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.waitForFunction(()=>typeof window.__renderContacts==='function');
  await page.evaluate(({language,selection})=>window.__renderContacts(language,selection),{language,selection});
  const m=readContactDirectoryMessages(language);
  await page.getByText(m.directory.loaded(1),{exact:true}).waitFor();
  assert.equal(await page.locator('.contact-profile-form').count(),canWrite?1:0,name);
  assert.equal(await page.locator('.contact-import-section').count(),canWrite?1:0,name);
  assert.equal(await page.locator('.contact-load-more-button').isEnabled(),true);
  await page.getByRole('combobox',{name:m.organization.contactPicker}).selectOption('23');
  const groupButton=page.locator('.contact-group-columns button');
  assert.equal(await groupButton.isEnabled(),canWrite,name);
  if(canWrite) {
   await page.getByRole('textbox',{name:m.organization.tagName,exact:true}).fill('Customers');
   await page.getByRole('button',{name:m.organization.createTag,exact:true}).click();
   await page.waitForFunction(()=>window.__contactCalls.length===1);
   assert.equal((await page.evaluate(()=>window.__contactCalls))[0].name,'createContactTagAction');
   await page.getByRole('button',{name:m.directory.documentUnsubscribe,exact:true}).click();
   await page.locator('.consent-editor-card').waitFor();
   await page.evaluate(({language,selection})=>window.__renderContacts(language,selection),{language,selection:directory('viewer')});
   await page.locator('.consent-editor-card').waitFor({state:'hidden'});
   await page.getByText(m.directory.readOnly,{exact:true}).waitFor();
   assert.equal((await page.evaluate(()=>window.__contactCalls)).length,1);
  } else {
   await page.getByText(m.directory.readOnly,{exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:m.directory.documentUnsubscribe,exact:true}).count(),0);
   assert.equal((await page.evaluate(()=>window.__contactCalls)).length,0);
  }
  scenarios++;await page.close();
 }
 assert.deepEqual(errors,[]);
 console.log(`Contact permission browser acceptance passed: ${scenarios} scenarios; 3 languages; viewer/agent read-only; owner/manager write controls; missing, unselected, ambiguous and required selection deny writes; open consent editor hidden after role loss.`);
} finally {await browser?.close();await server.close();}
