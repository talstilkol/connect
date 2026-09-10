import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchMetaMediaDownload, getMetaMediaDownloadToken, readMetaMediaDownloadOrigin, META_MEDIA_DOWNLOAD_MAX_BYTES } from '../features/conversations/metaMediaDownloadClient.ts';
import { mediaBytes } from './fixtures/meta-media.mjs';
import { mediaFileJob } from './fixtures/meta-media-file-read.mjs';
const messageKey=(await mediaFileJob()).intent.messageKey;
const headers={'content-type':'application/octet-stream','content-disposition':'attachment; filename="media.bin"','content-length':String(mediaBytes.length),'cache-control':'private, no-store'};
const options={origin:'https://railway.example.com',messageKey,token:'header.payload.signature'};
const run=(reply,signal=new AbortController().signal)=>fetchMetaMediaDownload({...options,signal,fetch:async()=>reply});
test('download cancellation also interrupts a pending identity token refresh',async()=>{
  let release;const controller=new AbortController();
  const pending=getMetaMediaDownloadToken(()=>new Promise(resolve=>{release=resolve;}),controller.signal);
  controller.abort();await assert.rejects(pending,{name:'AbortError'});release(options.token);
  await assert.rejects(getMetaMediaDownloadToken(async()=>null,new AbortController().signal),{code:'signed-out'});
});
test('download client permits only canonical HTTPS origins or explicit development loopback',()=>{
  for(const value of [undefined,'','https://api.example.com/','https://api.example.com/path','https://user:secret@api.example.com','http://api.example.com','https://api.example.com?token=1','null'])assert.equal(readMetaMediaDownloadOrigin(value,false),null);
  assert.equal(readMetaMediaDownloadOrigin(options.origin,true),options.origin);assert.equal(readMetaMediaDownloadOrigin('http://127.0.0.1:3001',true),null);assert.equal(readMetaMediaDownloadOrigin('http://127.0.0.1:3001',false),'http://127.0.0.1:3001');
});
test('download client uses header credentials and exact route, and makes a saveable copy only after complete validation',async()=>{
  const blob=await fetchMetaMediaDownload({...options,signal:new AbortController().signal,fetch:async(url,init)=>{
    assert.equal(url,`${options.origin}/v1/media-files/${messageKey}`);assert.equal(init.headers.authorization,`Bearer ${options.token}`);assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');assert.equal(init.referrerPolicy,'no-referrer');return new Response(mediaBytes.slice(),{headers});
  }});assert.equal(blob.type,'application/octet-stream');assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),mediaBytes);
});
for(const [name,changed] of [['oversized',{'content-length':String(META_MEDIA_DOWNLOAD_MAX_BYTES+1)}],['missing length',{'content-length':''}],['wrong type',{'content-type':'text/html'}],['inline file',{'content-disposition':'inline'}],['cacheable',{'cache-control':'public'}],['partial',{'content-range':'bytes 0-1/2'}]])test(`download client rejects ${name} metadata and cancels the body`,async()=>{
  let cancelled=false;const stream=new ReadableStream({cancel(){cancelled=true;}});await assert.rejects(run(new Response(stream,{headers:{...headers,...changed}})));assert.ok(cancelled);
});
test('download client rejects short and overflowing content instead of saving a partial file',async()=>{
  await assert.rejects(run(new Response(mediaBytes.slice(0,-1),{headers})));
  await assert.rejects(run(new Response(mediaBytes.slice(),{headers:{...headers,'content-length':String(mediaBytes.length-1)}})));
});
test('download client maps safe errors without trusting provider response text',async()=>{
  for(const [status,code] of [[401,'signed-out'],[429,'rate-limited'],[403,'unavailable'],[409,'unavailable'],[503,'unavailable']])await assert.rejects(run(new Response('private-provider-token',{status})),e=>e.code===code&&!e.message.includes('private-provider'));
});
test('download client cancellation closes a hanging response and cannot produce a blob',async()=>{
  const controller=new AbortController();let cancelled=false,started;const reading=new Promise(r=>{started=r;});
  const result=run(new Response(new ReadableStream({pull(){started();},cancel(){cancelled=true;}}),{headers}),controller.signal);
  await reading;controller.abort();await assert.rejects(result,{name:'AbortError'});assert.ok(cancelled);
});

// Render the production control with real React. No authenticated UI session is
// claimed by this isolated component check.
test('download control renders an accessible localized action and no inline storage URL',async()=>{
  const {build}=await import('esbuild');const {renderToStaticMarkup}=await import('react-dom/server');const {createElement}=await import('react');
  const compiled=await build({entryPoints:[new URL('../features/conversations/MetaMediaDownloadControl.tsx',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',
    plugins:[{name:'installed-runtime',setup(api){api.onResolve({filter:/^(?:react(?:\/.*)?|@clerk\/nextjs)$/},args=>({path:import.meta.resolve(args.path),external:true}));}}]});
  const {MetaMediaDownloadControl}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
  for(const [language,label] of [['he','בדיקה והורדת קובץ'],['en','Check and download file'],['ar','فحص الملف وتنزيله']]){
    const html=renderToStaticMarkup(createElement(MetaMediaDownloadControl,{language,messageKey,origin:options.origin,getToken:async()=>null}));
    assert.ok(html.includes(label));assert.match(html,/role="status"/);assert.doesNotMatch(html,/href=|<img|s3.amazonaws|iframe|disabled=""/);
  }
});
