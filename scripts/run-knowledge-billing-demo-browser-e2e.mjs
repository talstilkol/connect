import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';
import { launchAcceptanceBrowser, restrictAcceptancePage } from './browser-acceptance.mjs';
import { paddleFixture } from '../tests/fixtures/paddle-billing.mjs';
import { knowledgeFixture } from '../tests/fixtures/knowledge-ingestion.mjs';
import { parsePaddleBillingView } from '../shared/domain/paddleBillingView.ts';

// Explicitly authorized local demo accounts. These fixtures are never login
// credentials and this harness neither loads .env nor calls a provider.
const payment = paddleFixture(41001);
const knowledge = await knowledgeFixture(41001);
const owner = { id: payment.session.externalUserId, email: 'billing-owner@connect-demo.invalid', tenantId:41001, role:'owner' };
const viewer = { id:'user_demo_knowledge_viewer', email:'knowledge-viewer@connect-demo.invalid', tenantId:41001, role:'viewer' };
const source = { sourceKey:knowledge.intent.sourceKey, fileName:knowledge.payload.fileName,
  mediaType:'text/plain', sizeBytes:knowledge.bytes.length, status:'scanning', readyAt:null,
  version:1, createdAt:'2026-07-26T09:00:00.000Z', updatedAt:'2026-07-26T09:00:00.000Z' };
function billing(state=null, canManage=true) {
  const value = { environment:'sandbox', clientToken:payment.config.clientToken,
    customerPortalUrl:payment.config.customerPortalUrl, canManage, attempt:state ? 1 : 0,
    canCreateCheckout:canManage && !state, paidAccessReason:'manual-pilot', subscription:null,
    checkout:state ? {state, transactionId:state==='ready'&&canManage ? payment.receipt.id:null,
      url:state==='ready'&&canManage ? payment.receipt.checkoutUrl:null}:null };
  if(state==='completed') { value.paidAccessReason='paid-active'; value.subscription={
    id:payment.subscription.id, status:'active', endsAt:'2026-08-26T00:00:00.000Z', needsReview:false, scheduledChange:null }; }
  assert.ok(parsePaddleBillingView(value));
  return value;
}
const views = Object.fromEntries([null,'queued','ready','unknown','completed'].map(state=>[state??'idle',billing(state)]));
views.viewer=billing('ready',false);
const entryPath='/__knowledge-billing-demo.js';
const actions = String.raw`
export async function uploadKnowledgeSourceAction(data) {
 const s=window.__knowledgeBillingDemo;
 const f=data.get('file');s.knowledge.calls.push({name:'upload',fileName:f.name,type:f.type,size:f.size,text:await f.text()});
 if(s.knowledge.uploadMode==='pending')await new Promise(resolve=>s.knowledge.resolveUpload=resolve);
 if(s.knowledge.uploadMode==='throw')throw Error('controlled upload failure');
 return {status:s.knowledge.uploadMode==='pending'?'processing':s.knowledge.uploadMode};
}
export async function refreshKnowledgeSourcesAction() {
 const s=window.__knowledgeBillingDemo;
 s.knowledge.calls.push({name:'refresh'});
 if(s.knowledge.refreshMode==='throw')throw Error('controlled scan status failure');
 return {status:'ready',aiAgents:{agents:[],selectedAgent:null,canWrite:s.account.role==='owner',knowledgeSources:s.knowledge.sources}};
}
export async function readPaddleBillingAction() {
 const s=window.__knowledgeBillingDemo;
 s.billing.calls.push({name:'read'});
 if(s.billing.readMode==='throw')throw Error('controlled billing status failure');
 if(s.billing.readMode!=='ready')return {status:s.billing.readMode};
 return {status:'ready',billing:structuredClone(s.billing.view)};
}
export async function createPaddleCheckoutAction(attempt) {
 const s=window.__knowledgeBillingDemo;
 s.billing.calls.push({name:'create',attempt});
 if(s.billing.createMode==='pending')await new Promise(resolve=>s.billing.resolveCreate=resolve);
 if(s.billing.createMode==='throw')throw Error('controlled checkout creation failure');
 s.billing.view=structuredClone(s.views.queued);return {status:'ready',billing:s.billing.view};
}`;
const entry=`import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{KnowledgeUploadPanel}from'/features/ai/KnowledgeUploadPanel.tsx';
import{PaddleBillingPanel}from'/features/billing/PaddleBillingPanel.tsx';
const query=new URLSearchParams(location.search);const language=query.get('lang')||'en';const readOnly=query.get('role')==='viewer';
window.__knowledgeBillingDemo={account:readOnly?${JSON.stringify(viewer)}:${JSON.stringify(owner)},views:${JSON.stringify(views)},sdkCalls:[],knowledge:{calls:[],sources:[],uploadMode:'processing',refreshMode:'ready'},billing:{calls:[],view:${JSON.stringify(views.idle)},readMode:'ready',createMode:'queued'}};
if(readOnly)window.__knowledgeBillingDemo.billing.view=window.__knowledgeBillingDemo.views.viewer;
function App(){const[sources,setSources]=useState([]);return React.createElement('main',{lang:language,dir:language==='en'?'ltr':'rtl'},
React.createElement('p',{role:'note'},'LOCAL DEMO — no provider account or real charge'),
React.createElement(KnowledgeUploadPanel,{language,canWrite:!readOnly,onSources:setSources}),
React.createElement('ul',{'aria-label':'Demo source status'},sources.map(s=>React.createElement('li',{key:s.sourceKey,'data-source-status':s.status},s.fileName+' — '+s.status))),
React.createElement(PaddleBillingPanel,{language}));}createRoot(document.getElementById('root')).render(React.createElement(App));`;
const html=`<!doctype html><html><head><meta charset="utf-8"><title>Connect local knowledge and billing demo</title></head><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`;
const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,envFile:false,appType:'custom',logLevel:'error',plugins:[{
 name:'knowledge-billing-demo-boundary',enforce:'pre',resolveId(id){if(id===entryPath)return id;if(id.endsWith('/knowledgeUploadActions')||id.endsWith('/paddleActions'))return '\0knowledge-billing-actions';},
 load(id){if(id===entryPath)return entry;if(id==='\0knowledge-billing-actions')return actions;},
 configureServer(vite){vite.middlewares.use(async(req,res,next)=>{if(req.url?.split('?')[0]!=='/')return next();res.setHeader('Content-Type','text/html;charset=utf-8');res.end(await vite.transformIndexHtml('/',html));});}
},react()],server:{host:'127.0.0.1',port:0}});
const labels={
 en:{idle:'No checkout has been created.',ready:'Checkout is ready.',unknown:'This checkout needs investigation.',upload:'Upload source',refreshSources:'Refresh source status',create:'Prepare checkout',open:'Open secure checkout',refreshBilling:'Refresh status',failed:'The operation could not complete. Refresh status before retrying.',uploadFailed:'The operation did not complete. Refresh status before retrying.'},
 he:{idle:'אין עדיין עסקת תשלום.',ready:'התשלום מוכן לפתיחה.',unknown:'נדרש בירור של עסקת התשלום.',upload:'העלאת מקור',refreshSources:'רענון מצב מקורות',create:'הכנת תשלום',open:'פתיחת תשלום מאובטח',refreshBilling:'רענון מצב',failed:'לא ניתן להשלים את הפעולה כרגע. רענן את המצב לפני ניסיון נוסף.',uploadFailed:'הפעולה לא הושלמה. רענן את המצב לפני ניסיון נוסף.'},
 ar:{idle:'لم يتم إنشاء عملية دفع بعد.',ready:'الدفع جاهز.',unknown:'تحتاج عملية الدفع إلى مراجعة.',upload:'رفع مصدر',refreshSources:'تحديث حالة المصادر',create:'تحضير الدفع',open:'فتح الدفع الآمن',refreshBilling:'تحديث الحالة',failed:'تعذر إكمال العملية. حدّث الحالة قبل المحاولة مجددًا.',uploadFailed:'لم تكتمل العملية. حدّث الحالة قبل المحاولة مجددًا.'}
};
let browser;let scenarios=0;const errors=[];let sdkFulfilled=0;const externalAttempts=[];
try {
 await server.listen();const address=server.httpServer.address();assert.ok(address&&typeof address!=='string');const origin=`http://127.0.0.1:${address.port}`;
 browser=await launchAcceptanceBrowser();
 async function open(language,role='owner') {
  const context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await restrictAcceptancePage(page,origin);
  // Only a synthetic SDK response is permitted. No network request to the CDN is forwarded.
  await page.route('https://cdn.paddle.com/paddle/v2/paddle.js',async route=>{
   sdkFulfilled++;
   await route.fulfill({contentType:'application/javascript',body:`window.Paddle={Environment:{set(value){window.__knowledgeBillingDemo.sdkCalls.push({name:'environment',value});}},Initialize(options){window.__knowledgeBillingDemo.sdkCalls.push({name:'initialize',options});},Checkout:{open(options){const s=window.__knowledgeBillingDemo;s.sdkCalls.push({name:'open',options});if(s.sdkThrow)throw Error('controlled SDK failure');const b=document.createElement('button');b.textContent='Close simulated checkout';b.id='close-simulated-checkout';b.onclick=()=>b.remove();document.body.append(b);}}};`});
  });
  page.on('request',r=>{const u=r.url();if(new URL(u).origin!==origin&&u!=='https://cdn.paddle.com/paddle/v2/paddle.js')externalAttempts.push(u);});
  await page.goto(`${origin}/?lang=${language}&role=${role}`);await page.getByRole('note').waitFor();
  await page.waitForFunction(()=>window.__knowledgeBillingDemo.billing.calls.length===1);
  await page.locator('.paddle-billing-panel').getByRole('status').filter({hasText:role==='viewer'?labels[language].ready:labels[language].idle}).waitFor();
  return{page,context};
 }
 for(const language of ['he','en','ar']) {
  const m=labels[language];const{page,context}=await open(language);
  const panel=page.locator('.knowledge-upload-panel');const paymentPanel=page.locator('.paddle-billing-panel');
  await page.evaluate(source=>{const s=window.__knowledgeBillingDemo;s.knowledge.uploadMode='pending';s.knowledge.sources=[source];},source);
  await panel.locator('input[type=file]').setInputFiles({name:knowledge.payload.fileName,mimeType:'text/plain',buffer:Buffer.from(knowledge.bytes)});
  await panel.locator('button[type=submit]').click();
  await page.waitForFunction(()=>!!window.__knowledgeBillingDemo.knowledge.resolveUpload);
  assert.equal(await panel.locator('input').isDisabled(),true);assert.equal(await panel.getByRole('button',{name:m.refreshSources,exact:true}).isDisabled(),true);
  const payload=await page.evaluate(()=>window.__knowledgeBillingDemo.knowledge.calls[0]);
  assert.deepEqual(payload,{name:'upload',fileName:knowledge.payload.fileName,type:'text/plain',size:knowledge.bytes.length,text:new TextDecoder().decode(knowledge.bytes)});
  await page.evaluate(()=>window.__knowledgeBillingDemo.knowledge.resolveUpload());
  await page.locator('[data-source-status=scanning]').waitFor();scenarios++;
  await page.evaluate(()=>{const s=window.__knowledgeBillingDemo;s.knowledge.sources=s.knowledge.sources.map(x=>({...x,status:'ready',version:2,readyAt:'2026-07-26T09:05:00.000Z'}));});
  await panel.getByRole('button',{name:m.refreshSources,exact:true}).click();await page.locator('[data-source-status=ready]').waitFor();scenarios++;
  await page.evaluate(()=>window.__knowledgeBillingDemo.knowledge.uploadMode='throw');
  await panel.locator('button[type=submit]').click();await panel.getByRole('status').filter({hasText:m.uploadFailed}).waitFor();
  assert.equal(await panel.locator('input').isEnabled(),true);assert.equal(await page.locator('[data-source-status=ready]').count(),1);scenarios++;
  await page.evaluate(()=>window.__knowledgeBillingDemo.billing.createMode='pending');
  await paymentPanel.getByRole('button',{name:m.create,exact:true}).click();await page.waitForFunction(()=>!!window.__knowledgeBillingDemo.billing.resolveCreate);
  assert.equal(await paymentPanel.getByRole('button',{name:m.create,exact:true}).isDisabled(),true);
  assert.equal(await paymentPanel.getByRole('button',{name:m.refreshBilling,exact:true}).isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>window.__knowledgeBillingDemo.billing.calls.filter(x=>x.name==='create')),[{name:'create',attempt:0}]);
  await page.evaluate(()=>window.__knowledgeBillingDemo.billing.resolveCreate());
  await paymentPanel.getByRole('button',{name:m.create,exact:true}).waitFor({state:'hidden'});scenarios++;
  await page.evaluate(()=>{const s=window.__knowledgeBillingDemo;s.billing.view=s.views.ready;});
  await paymentPanel.getByRole('button',{name:m.refreshBilling,exact:true}).click();await paymentPanel.getByRole('button',{name:m.open,exact:true}).click();
  await page.locator('#close-simulated-checkout').waitFor();
  const sdk=await page.evaluate(()=>window.__knowledgeBillingDemo.sdkCalls);
  assert.deepEqual(sdk,[{name:'environment',value:'sandbox'},{name:'initialize',options:{token:payment.config.clientToken}},{name:'open',options:{transactionId:payment.receipt.id,settings:{displayMode:'overlay',locale:language==='ar'?'ar':'en'}}}]);
  await page.locator('#close-simulated-checkout').click();
  assert.equal(await paymentPanel.locator('bdi').count(),0);assert.equal(await paymentPanel.getByRole('button',{name:m.create,exact:true}).count(),0);scenarios++;
  await page.evaluate(()=>window.__knowledgeBillingDemo.billing.readMode='permission-denied');
  await paymentPanel.getByRole('button',{name:m.open,exact:true}).click();await paymentPanel.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(()=>window.__knowledgeBillingDemo.sdkCalls.filter(x=>x.name==='open').length),1);
  assert.equal(await paymentPanel.getByRole('button',{name:m.open,exact:true}).count(),0);scenarios++;
  await page.evaluate(()=>{const s=window.__knowledgeBillingDemo;s.billing.readMode='ready';s.billing.view=s.views.unknown;});
  await paymentPanel.getByRole('button',{name:m.refreshBilling,exact:true}).click();
  await paymentPanel.getByRole('status').filter({hasText:m.unknown}).waitFor();
  assert.equal(await paymentPanel.getByRole('button',{name:m.create,exact:true}).count(),0);assert.equal(await paymentPanel.getByRole('button',{name:m.open,exact:true}).count(),0);scenarios++;
  await page.evaluate(()=>{const s=window.__knowledgeBillingDemo;s.billing.view=s.views.completed;});
  await paymentPanel.getByRole('button',{name:m.refreshBilling,exact:true}).click();await paymentPanel.locator('bdi').waitFor();
  assert.equal(await paymentPanel.locator('bdi').textContent(),payment.subscription.id);
  assert.equal(await paymentPanel.locator('a').getAttribute('href'),payment.config.customerPortalUrl);scenarios++;
  await context.close();
  const readOnly=await open(language,'viewer');
  assert.equal(await readOnly.page.locator('.knowledge-upload-panel input').isDisabled(),true);
  assert.equal(await readOnly.page.getByRole('button',{name:m.create,exact:true}).count(),0);
  assert.equal(await readOnly.page.getByRole('button',{name:m.open,exact:true}).count(),0);scenarios++;
  await readOnly.context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(externalAttempts,[]);assert.equal(sdkFulfilled,3);
 console.log('CONNECT_DEMO_RESULT '+JSON.stringify({suite:'knowledge-billing-demo',status:'passed',scenarios,languages:['he','en','ar'],accounts:[owner,viewer],sdkResponsesFulfilledLocally:sdkFulfilled,externalProviderCalls:0,scope:'Real React UI, controlled Server Action results and synthetic Paddle SDK; no user session, storage provider or payment account accepted.'}));
} finally {await browser?.close();await server.close();}
