import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { launchAcceptanceBrowser, restrictAcceptancePage, readAcceptanceBrowserName } from './browser-acceptance.mjs';
import { tenantReportsDemoTenants as tenants, tenantReportsDemoAccount as account, tenantReportsDemoReport } from './tenant-reports-demo-fixtures.mjs';
import { readWorkspaceShellMessages } from '../shared/i18n/workspace.ts';
import { readOperationalReportMessages } from '../features/reports/operationalReportMessages.ts';

const engine = readAcceptanceBrowserName();
const evidence = fileURLToPath(new URL(`../output/demo-journeys/tenant-reports/${engine}/`, import.meta.url));
await mkdir(evidence, { recursive: true });
const entryPath = '/__tenant-reports-demo.js';
const reports = tenants.map((_, index) => ({ initial: tenantReportsDemoReport(index), updated: tenantReportsDemoReport(index, true) }));
const boundary = String.raw`
const s = () => window.__tenantReportsDemo;
const persist = () => sessionStorage.setItem('tenant-reports-demo', JSON.stringify({activeKey:s().activeKey,committedKey:s().committedKey,version:s().version,selectCalls:s().selectCalls,activationCalls:s().activationCalls,refreshes:s().refreshes,navigationCount:s().navigationCount}));
export function useClerk(){return {async setActive({organization}){
 const state=s();state.activationCalls.push(organization);
 if(state.activationMode==='reject'){persist();throw Error('Controlled demo setActive failure');}
 const tenant=state.tenants.find(x=>x.organizationId===organization);if(!tenant)throw Error('Unknown demo organization');
 state.activeKey=tenant.selectionKey;persist();
}};}
export function useRouter(){return {refresh(){const state=s();state.refreshes++;persist();window.__refreshTenantReportsDirectory();}};}
export async function selectTenantAction(input){
 const state=s();state.selectCalls.push(structuredClone(input));
 if(state.selectMode==='pending')return new Promise(resolve=>state.resolveSelection=result=>{state.resolveSelection=null;resolve(result);});
 if(state.selectMode!=='selected')return {status:state.selectMode};
 if(input.expectedVersion!==state.version)return {status:'conflict'};
 const target=state.tenants.find(x=>x.selectionKey===input.selectionKey);if(!target)return {status:'selection-required'};
 state.committedKey=target.selectionKey;state.version++;persist();
 return {status:'selected',organizationId:target.organizationId,version:state.version,unchanged:false};
}
export async function loadOperationalReportAction(input){
 const state=s();state.reportCalls.push({input:structuredClone(input),tenantKey:state.activeKey});
 if(state.reportMode==='pending')return new Promise(resolve=>state.resolveReport=result=>{state.resolveReport=null;resolve(result);});
 if(state.reportMode!=='loaded')return {status:state.reportMode};
 return {status:'loaded',report:structuredClone(state.reports[state.tenants.findIndex(x=>x.selectionKey===state.activeKey)].updated)};
}`;
const entry = `import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{TenantWorkspaceProvider,TenantWorkspaceSwitcher}from'/features/workspace/TenantWorkspaceSwitcher.tsx';
import{OperationalReports}from'/features/reports/OperationalReports.tsx';
import'/app/globals.css';
const language=new URLSearchParams(location.search).get('lang')||'en';const denied=new URLSearchParams(location.search).get('denied')==='1';
const tenants=${JSON.stringify(tenants)},reports=${JSON.stringify(reports)};
const saved=JSON.parse(sessionStorage.getItem('tenant-reports-demo')||'null');
const state=window.__tenantReportsDemo={account:${JSON.stringify(account)},tenants,reports,activeKey:tenants[0].selectionKey,committedKey:tenants[0].selectionKey,version:1,selectCalls:[],activationCalls:[],refreshes:0,navigationCount:0,...saved,selectMode:'selected',activationMode:'ready',reportMode:'loaded',reportCalls:[]};state.navigationCount++;
document.documentElement.lang=language;document.documentElement.dir=language==='en'?'ltr':'rtl';
function directory(){return {version:state.version,selectionRequired:false,options:tenants.map(({selectionKey,displayName,role})=>({selectionKey,displayName,role,selected:selectionKey===state.activeKey}))};}
function App(){const[d,setDirectory]=useState(directory);window.__refreshTenantReportsDirectory=()=>setDirectory(directory());const index=tenants.findIndex(t=>t.selectionKey===state.activeKey);return React.createElement('main',{style:{maxWidth:1200,margin:'0 auto',padding:24}},
 React.createElement('p',{role:'note'},'LOCAL DEMO — tenant selection and report fixtures; no Clerk account or provider calls'),
 React.createElement('p',{'data-testid':'active-demo-tenant'},tenants[index].displayName),
 React.createElement(TenantWorkspaceProvider,{directory:d},React.createElement(TenantWorkspaceSwitcher,{connectionStatus:'Local demo',language})),
 React.createElement(OperationalReports,{language,initialStatus:denied?'permission-denied':'ready',initialReport:denied?null:reports[index].initial}));}
createRoot(document.getElementById('root')).render(React.createElement(App));`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Connect tenant and reports demo</title></head><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envFile: false,
  appType: 'custom', logLevel: 'error', plugins: [{ name: 'tenant-reports-demo-boundary', enforce: 'pre',
    resolveId(id) { if(id===entryPath)return id;if(id==='@clerk/nextjs'||id==='next/navigation'||id.endsWith('/tenantSelectionActions.ts')||id.endsWith('/operationalReportActions'))return '\0tenant-reports-demo-actions'; },
    load(id) { if(id===entryPath)return entry;if(id==='\0tenant-reports-demo-actions')return boundary; },
    configureServer(vite) { vite.middlewares.use(async(req,res,next)=>{if(req.url?.split('?')[0]!=='/')return next();res.setHeader('Content-Type','text/html;charset=utf-8');res.end(await vite.transformIndexHtml('/',html));}); },
  },react()], server: { host: '127.0.0.1', port: 0 } });
let browser;
const errors = [], externalAttempts = [], scenarioResults = [];
const passed = (language, id) => scenarioResults.push({ language, id, status: 'passed' });
try {
  await server.listen();
  const address=server.httpServer.address();assert.ok(address&&typeof address!=='string');
  const origin=`http://127.0.0.1:${address.port}`;
  browser=await launchAcceptanceBrowser();
  async function open(language, denied=false) {
    const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:960}});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(new URL(r.url()).origin!==origin)externalAttempts.push(r.url());});
    await restrictAcceptancePage(page,origin);await page.goto(`${origin}/?lang=${language}${denied?'&denied=1':''}`);
    await page.getByRole('note').waitFor();return {page,context};
  }
  for(const language of ['he','en','ar']) {
    const {page,context}=await open(language);
    const tm=readWorkspaceShellMessages(language).tenant,rm=readOperationalReportMessages(language);
    const selector=page.getByRole('combobox',{name:tm.switchLabel,exact:true});
    // ICU data can differ between Node and the browser, especially Arabic digits.
    const formattedNumber = value => page.evaluate(({locale,value}) => new Intl.NumberFormat(locale).format(value), {locale:rm.locale,value});
    const metric=()=>page.locator('.report-metric').filter({has:page.locator('span').getByText(rm.campaigns.total,{exact:true})}).locator('strong');
    const show=()=>page.getByRole('button',{name:rm.toolbar.show,exact:true});
    assert.equal(await selector.inputValue(),tenants[0].selectionKey);
    for(const tenant of tenants)assert.equal(await selector.locator('option').filter({hasText:tenant.displayName+' — '+tm.roles[tenant.role]}).count(),1);
    assert.equal(await metric().textContent(),await formattedNumber(1));passed(language,'two-demo-tenants-roles-and-initial-report');

    await page.evaluate(()=>window.__tenantReportsDemo.selectMode='pending');
    await selector.selectOption(tenants[1].selectionKey);await page.waitForFunction(()=>!!window.__tenantReportsDemo.resolveSelection);
    assert.equal(await selector.isDisabled(),true);
    assert.deepEqual(await page.evaluate(()=>window.__tenantReportsDemo.selectCalls),[{selectionKey:tenants[1].selectionKey,expectedVersion:1}]);
    await page.evaluate(()=>window.__tenantReportsDemo.resolveSelection({status:'conflict'}));
    await page.locator('#tenant-workspace-status').getByText(tm.failures.conflict,{exact:true}).waitFor();
    assert.equal(await selector.inputValue(),tenants[0].selectionKey);assert.equal(await selector.isEnabled(),true);
    assert.deepEqual(await page.evaluate(()=>[window.__tenantReportsDemo.activationCalls.length,window.__tenantReportsDemo.refreshes]),[0,1]);passed(language,'pending-selection-and-stale-version-preserve-active-tenant');

    await page.evaluate(()=>window.__tenantReportsDemo.selectMode='selection-required');await selector.selectOption(tenants[1].selectionKey);
    await page.locator('#tenant-workspace-status').getByText(tm.failures['selection-required'],{exact:true}).waitFor();
    assert.equal(await selector.inputValue(),tenants[0].selectionKey);assert.equal(await page.evaluate(()=>window.__tenantReportsDemo.activationCalls.length),0);passed(language,'revoked-selection-never-activates-clerk');

    await page.evaluate(()=>{const s=window.__tenantReportsDemo;s.selectMode='selected';s.activationMode='reject';});
    await selector.selectOption(tenants[1].selectionKey);
    await page.locator('#tenant-workspace-status').getByText(tm.failures['temporarily-unavailable'],{exact:true}).waitFor();
    assert.equal(await selector.inputValue(),tenants[0].selectionKey);
    assert.deepEqual(await page.evaluate(()=>({active:window.__tenantReportsDemo.activeKey,committed:window.__tenantReportsDemo.committedKey,refreshes:window.__tenantReportsDemo.refreshes,navigationCount:window.__tenantReportsDemo.navigationCount})),{active:tenants[0].selectionKey,committed:tenants[1].selectionKey,refreshes:3,navigationCount:1});
    assert.equal(await metric().textContent(),await formattedNumber(1));passed(language,'setActive-failure-keeps-active-view-and-refreshes-without-false-rollback');

    await page.evaluate(()=>window.__tenantReportsDemo.activationMode='ready');
    await selector.selectOption(tenants[1].selectionKey);
    await page.waitForFunction(key=>window.__tenantReportsDemo?.activeKey===key&&window.__tenantReportsDemo?.navigationCount===2,tenants[1].selectionKey);
    await page.getByTestId('active-demo-tenant').getByText(tenants[1].displayName,{exact:true}).waitFor();
    assert.equal(await selector.inputValue(),tenants[1].selectionKey);
    assert.equal(await metric().textContent(),await formattedNumber(3));
    assert.deepEqual(await page.evaluate(()=>window.__tenantReportsDemo.selectCalls.at(-1)),{selectionKey:tenants[1].selectionKey,expectedVersion:2});
    assert.deepEqual(await page.evaluate(()=>window.__tenantReportsDemo.activationCalls),[tenants[1].organizationId,tenants[1].organizationId]);passed(language,'explicit-retry-switches-organization-and-reloads-beta-report');

    const from=page.getByLabel(rm.toolbar.from,{exact:true}),to=page.getByLabel(rm.toolbar.to,{exact:true});
    await from.fill('2026-07-10');await to.fill('2026-07-20');
    await page.evaluate(()=>window.__tenantReportsDemo.reportMode='pending');await show().click();
    await page.waitForFunction(()=>!!window.__tenantReportsDemo.resolveReport);
    assert.equal(await page.getByRole('button',{name:rm.toolbar.loading,exact:true}).isDisabled(),true);
    assert.deepEqual(await page.evaluate(()=>window.__tenantReportsDemo.reportCalls),[{input:{startDate:'2026-07-10',endDate:'2026-07-20'},tenantKey:tenants[1].selectionKey}]);
    await page.evaluate(report=>window.__tenantReportsDemo.resolveReport({status:'loaded',report}),reports[1].updated);
    await show().waitFor();assert.equal(await metric().textContent(),await formattedNumber(4));
    assert.equal(await from.inputValue(),'2026-07-10');assert.equal(await to.inputValue(),'2026-07-20');passed(language,'date-range-read-is-pending-then-displays-beta-result');

    for(const status of ['permission-denied','server-error']) {
      await page.evaluate(value=>window.__tenantReportsDemo.reportMode=value,status);await show().click();
      await page.getByRole('alert').getByText(rm.actionFailures[status],{exact:true}).waitFor();
      assert.equal(await metric().textContent(),await formattedNumber(4));
      assert.equal(await show().isEnabled(),true);passed(language,'report-'+status+'-does-not-replace-last-loaded-result');
    }
    const callsBeforeInvalid=await page.evaluate(()=>window.__tenantReportsDemo.reportCalls.length);
    await from.fill('2026-08-01');assert.equal(await from.evaluate(input=>input.checkValidity()),false);await show().click();
    assert.equal(await page.evaluate(()=>window.__tenantReportsDemo.reportCalls.length),callsBeforeInvalid);passed(language,'invalid-date-range-blocked-before-action');
    await from.fill('2026-07-10');await page.evaluate(()=>window.__tenantReportsDemo.reportMode='loaded');await show().click();
    await page.getByRole('alert').waitFor({state:'hidden'});assert.equal(await metric().textContent(),await formattedNumber(4));passed(language,'successful-report-retry-clears-error');
    await page.screenshot({path:`${evidence}${language}-tenant-beta-reports.png`,fullPage:true});
    await context.close();

    const denied=await open(language,true);await denied.page.getByRole('status').getByText(rm.statuses['permission-denied'],{exact:true}).waitFor();
    assert.equal(await denied.page.locator('.report-metric').count(),0);assert.equal(await denied.page.locator('input[type=date]').count(),0);
    assert.equal(await denied.page.evaluate(()=>window.__tenantReportsDemo.reportCalls.length),0);passed(language,'initial-permission-denial-renders-no-report-or-query-controls');
    await denied.context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(externalAttempts,[]);assert.equal(scenarioResults.length,33);
  const result={suite:'tenant-reports-demo',status:'passed',engine,version:browser.version(),scenarios:scenarioResults.length,languages:['he','en','ar'],accounts:[account],tenants,scenarioResults,externalProviderCalls:0,pageErrors:errors,
    scope:'Real TenantWorkspaceSwitcher and OperationalReports React UI; virtual Clerk/router/Server Action boundaries and deterministic local report fixtures. No real identity, membership enforcement or report SQL acceptance is claimed.'};
  await writeFile(`${evidence}result.json`,JSON.stringify(result,null,2)+'\n');
  console.log('CONNECT_DEMO_RESULT '+JSON.stringify(result));
} finally { await browser?.close();await server.close(); }
