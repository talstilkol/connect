import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { metaMediaTaskMessages } from '../features/workspace/metaMediaTaskMessages.ts';
import { inspectionIntent } from './fixtures/meta-media-inspection.mjs';
import { deriveMetaMediaUploadJobKey } from '../server/meta/metaMediaUploadJournal.ts';
const compiled=await build({entryPoints:[new URL('../features/workspace/MetaMediaTaskPanel.tsx',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',
  plugins:[{name:'real-react',setup(api){api.onResolve({filter:/^react(?:\/jsx-runtime)?$/},args=>({path:import.meta.resolve(args.path),external:true}));}}]});
const {MetaMediaTaskPanel,metaMediaTasksPath}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const jobKey=await deriveMetaMediaUploadJobKey(inspectionIntent());
const task={version:1,operatorRetries:0,canCleanup:false,cleanup:null,jobKey,kind:'inspect',status:'blocked',attempts:2,updatedAt:'2026-09-10T00:00:00.000Z',nextAttemptAt:null,leaseExpiresAt:null,leaseExpired:false,scanResults:['NO_THREATS_FOUND','THREATS_FOUND'],multipleScanVersions:false};
for(const language of ['he','en','ar'])test(`diagnostic panel renders recorded evidence and safe navigation in ${language}`,()=>{
  const html=renderToStaticMarkup(createElement(MetaMediaTaskPanel,{language,result:{status:'ready',page:{tasks:[task],nextCursor:null}}}));
  const text=metaMediaTaskMessages[language];assert.ok(html.includes(text.title));assert.ok(html.includes(text.scans.THREATS_FOUND));assert.ok(html.includes(text.attention['scan-blocked']));assert.ok(html.includes(text.notice));assert.match(html,/<bdi dir="ltr">2 \/ 12<\/bdi>/);
  assert.match(html,new RegExp(`dir="${language==='en'?'ltr':'rtl'}"`));assert.ok(html.includes(`/workspace/onboarding?lang=${language}`));
  assert.doesNotMatch(html,/<form|download=|PutObject|s3.amazonaws|media-token|type="submit"/);
});
test('diagnostic empty state does not claim a complete synchronization',()=>{
  const html=renderToStaticMarkup(createElement(MetaMediaTaskPanel,{language:'he',result:{status:'ready',page:{tasks:[],nextCursor:null}}}));
  assert.ok(html.includes(metaMediaTaskMessages.he.emptyDetail));assert.doesNotMatch(html,/<li/);
});
test('diagnostic failures do not render task rows or a cursor from another workspace',()=>{
  for(const status of Object.keys(metaMediaTaskMessages.he.failures)){
    const html=renderToStaticMarkup(createElement(MetaMediaTaskPanel,{language:'he',result:{status,page:null}}));
    assert.ok(html.includes(metaMediaTaskMessages.he.failures[status]));assert.doesNotMatch(html,/media_upload_v1_|<li/);
  }
});
test('diagnostic links preserve the locale and exact cursor without arbitrary redirect targets',()=>{
  const cursor={jobKey,kind:'inspect'},path=metaMediaTasksPath('ar',cursor);
  assert.equal(new URL(path,'https://connect.invalid').searchParams.get('after'),`${jobKey}.inspect`);
  const html=renderToStaticMarkup(createElement(MetaMediaTaskPanel,{language:'ar',after:cursor,result:{status:'ready',page:{tasks:[task],nextCursor:cursor}}}));
  assert.match(html,/rel="next"/);assert.ok(html.includes('lang=ar'));
});
test('diagnostic panel offers a recheck only for an exhausted inspection without blocking evidence',()=>{
  const render=(changes)=>renderToStaticMarkup(createElement(MetaMediaTaskPanel,{language:'en',requestRetry:async()=> 'queued',result:{status:'ready',page:{tasks:[{...task,status:'recovery-required',attempts:12,scanResults:[],...changes}],nextCursor:null}}}));
  assert.match(render({}),/Recheck the scan result/);
  for(const changes of [{kind:'upload',attempts:3},{attempts:1},{status:'running'},{status:'blocked'},{status:'cancelled'},{scanResults:['FAILED']},{multipleScanVersions:true},{attempts:15,operatorRetries:3}])assert.doesNotMatch(render(changes),/Recheck the scan result/);
});
test('diagnostic panel includes only explicitly granted extra attempts in its counters',()=>{
  const html=renderToStaticMarkup(createElement(MetaMediaTaskPanel,{language:'he',requestRetry:async()=> 'queued',result:{status:'ready',page:{tasks:[{...task,status:'recovery-required',attempts:13,operatorRetries:1,scanResults:[]}],nextCursor:null}}}));
  assert.match(html,/<bdi dir="ltr">13 \/ 13<\/bdi>/);assert.match(html,/<bdi dir="ltr">1 \/ 3<\/bdi>/);
});
test('diagnostic panel exposes removal only when the server marks the task eligible',()=>{
  const render=(change={})=>renderToStaticMarkup(createElement(MetaMediaTaskPanel,{language:'en',requestCleanup:async()=> 'queued',result:{status:'ready',page:{tasks:[{...task,canCleanup:true,...change}],nextCursor:null}}}));
  assert.match(render(),/Remove the stored file copy/);assert.doesNotMatch(render({canCleanup:false}),/Remove the stored file copy/);
  for(const status of ['pending','running','removed','recovery-required','cancelled']){const html=render({canCleanup:false,cleanup:{status,attempts:1}});assert.doesNotMatch(html,/Remove the stored file copy/);assert.match(html,/1 \/ 3/);}
});
