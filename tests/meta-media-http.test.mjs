import assert from 'node:assert/strict';
import test from 'node:test';
import { Writable } from 'node:stream';
import { createRailwayMetaMediaFileHttpHandler } from '../server/platform/railwayMetaMediaFileHttpHandler.ts';
import { requireRailwayMetaMediaFileEnvironment } from '../server/platform/railwayMetaMediaFileConfiguration.ts';
import { writeRailwayNodeMediaFileResponse } from '../server/platform/railwayNodeMediaFileResponse.ts';
import { createMetaMediaFileReadService, MetaMediaFileReadError } from '../server/meta/metaMediaFileRead.ts';
import { createS3MetaMediaFileReader } from '../server/platform/s3MetaMediaFileReader.ts';
import { mediaFileJob, mediaFileReply } from './fixtures/meta-media-file-read.mjs';
import { mediaBytes } from './fixtures/meta-media.mjs';
import { quarantineEnvironment } from './fixtures/meta-media-quarantine.mjs';

const origin='https://connect.example.com', token='header.payload.signature';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function fixture(options={}) {
  const job=await mediaFileJob(), events=[];
  const session={tenantId:job.intent.tenantId,externalUserId:job.intent.actor,role:'viewer',status:'active',displayName:'Scan integration'};
  const identity={externalUserId:session.externalUserId,externalOrganizationId:'org_verified'};
  const reader=createS3MetaMediaFileReader(quarantineEnvironment,{client:{async send(command,context){events.push(command.constructor.name);return options.reply?options.reply(command,context):mediaFileReply(command);}}});
  const service=createMetaMediaFileReadService({authorization:{async authorize(){events.push('authorize');return job;}},reader,scans:{async record(){events.push('scan');return 'clean-observed';}}});
  let verifications=0, delivered=false, borrowed;
  const handler=createRailwayMetaMediaFileHttpHandler({origin,deadlineMs:options.deadlineMs,
    verifier:{async verify(t){assert.equal(t,token);events.push('verify');return options.verify?options.verify(++verifications,identity):identity;}},
    sessions:{async resolve(id){return options.resolve?options.resolve(id,session):session;}},
    files:{...service,close:reader.close,async admit(){events.push('admit');await options.admit?.();}},
  });
  const request=(init={},path=`/v1/media-files/${job.intent.messageKey}`)=>new Request(`https://railway.example.com${path}`,{...init,headers:{origin,authorization:`Bearer ${token}`,...init.headers}});
  const deliver=async(file,headers,signal)=>{delivered=true;borrowed=file.bytes;assert.deepEqual(file.bytes,mediaBytes);assert.equal(headers.get('access-control-allow-origin'),origin);assert.equal(headers.get('content-length'),String(mediaBytes.length));assert.equal(signal.aborted,false);await options.deliver?.(file,headers,signal);};
  return {handler,events,job,request,deliver,get delivered(){return delivered;},get borrowed(){return borrowed;},run(init,path){return handler.handle(request(init,path),deliver);}};
}
test('binary HTTP authenticates before audit/S3, rechecks identity, releases bytes and clears the borrowed buffer',async()=>{
  const f=await fixture();try {assert.equal(await f.run(),null);assert.ok(f.delivered);assert.ok(f.borrowed.every(v=>v===0));assert.ok(f.events.indexOf('admit')>f.events.indexOf('verify'));assert.ok(f.events.indexOf('admit')<f.events.indexOf('GetObjectCommand'));assert.ok(f.events.filter(v=>v==='verify').length>4);}finally{await f.handler.close();}
});
for(const [name,init,path,status] of [
  ['missing origin',{headers:{origin:''}},undefined,403],['foreign origin',{headers:{origin:'https://foreign.example.com'}},undefined,403],
  ['missing token',{headers:{authorization:''}},undefined,401],['duplicate token',{headers:{authorization:`Bearer ${token}, Bearer ${token}`}},undefined,401],
  ['cookie',{headers:{cookie:'session=private'}},undefined,400],['range',{headers:{range:'bytes=0-10'}},undefined,400],
  ['body header',{headers:{'content-length':'3'}},undefined,400],['POST',{method:'POST'},undefined,405],['HEAD',{method:'HEAD'},undefined,405],
  ['query',{},'/v1/media-files/message_v1_'+ 'a'.repeat(64)+'?token=private',404],
  ['encoded key',{},'/v1/media-files/%6dessage_v1_'+ 'a'.repeat(64),404],
])test(`binary HTTP rejects ${name} before authentication or S3`,async()=>{
  const f=await fixture();try {const r=await f.run(init,path);assert.equal(r.status,status);assert.equal(await r.text(),'MEDIA_FILE_UNAVAILABLE');assert.deepEqual(f.events,[]);if(status===403)assert.equal(r.headers.has('access-control-allow-origin'),false);}finally{await f.handler.close();}
});
test('binary preflight permits only the configured origin, GET and Authorization',async()=>{
  const f=await fixture();try {
    const r=await f.run({method:'OPTIONS',headers:{'access-control-request-method':'GET','access-control-request-headers':'authorization'}});
    assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-headers'),'Authorization');assert.equal(r.headers.has('access-control-allow-credentials'),false);
    assert.equal((await f.run({method:'OPTIONS',headers:{'access-control-request-method':'GET','access-control-request-headers':'authorization,x-tenant-id'}})).status,403);
    assert.deepEqual(f.events,[]);
  }finally{await f.handler.close();}
});
for(const code of ['RATE_LIMITED','ACCESS_DENIED','NOT_READY','DEPENDENCY_UNAVAILABLE'])test(`binary HTTP ${code} admission never reads S3 or exposes provider details`,async()=>{
  const f=await fixture({admit:()=>{throw new MetaMediaFileReadError(code);}});try {
    const r=await f.run();assert.equal(r.status,{RATE_LIMITED:429,ACCESS_DENIED:403,NOT_READY:409,DEPENDENCY_UNAVAILABLE:503}[code]);
    if(code==='RATE_LIMITED')assert.equal(r.headers.get('retry-after'),'60');assert.equal(f.delivered,false);assert.ok(!f.events.some(v=>v.endsWith('Command')));
  }finally{await f.handler.close();}
});
test('binary HTTP cannot use a revoked, expired or different organization identity',async()=>{
  for(const changed of [null,{externalUserId:'changed',externalOrganizationId:'org_verified'},{externalOrganizationId:'changed'}]) {
    const f=await fixture({verify:(count,id)=>count===1?id:changed});try {assert.equal((await f.run()).status,403);assert.equal(f.delivered,false);assert.ok(!f.events.includes('admit'));}finally{await f.handler.close();}
  }
  const f=await fixture({verify:()=>null});try{assert.equal((await f.run()).status,401);}finally{await f.handler.close();}
});
test('binary HTTP rejects a changed tenant selection before releasing already-read bytes',async()=>{
  let f;f=await fixture({resolve:(_identity,session)=>({...session,tenantId:f.events.includes('GetObjectCommand')?session.tenantId+1:session.tenantId})});
  try{assert.equal((await f.run()).status,403);assert.ok(f.events.includes('GetObjectCommand'));assert.equal(f.delivered,false);}finally{await f.handler.close();}
});
test('binary HTTP holds one admission through the complete consumer and rejects parallel work',async()=>{
  const gate=deferred(),entered=deferred(),f=await fixture({deliver:async()=>{entered.resolve();await gate.promise;}});
  const first=f.run();await entered.promise;assert.equal((await f.run()).status,503);assert.ok(f.borrowed.some(v=>v!==0));gate.resolve();assert.equal(await first,null);await f.handler.close();assert.ok(f.borrowed.every(v=>v===0));assert.equal((await f.run()).status,503);
});
test('binary HTTP timeout returns promptly but keeps admission closed until late identity work settles',async()=>{
  const gate=deferred(),entered=deferred(),f=await fixture({deadlineMs:15,verify:async(_count,id)=>{entered.resolve();await gate.promise;return id;}});
  const run=f.run();await entered.promise;assert.equal((await run).status,503);assert.equal((await f.run()).status,503);gate.resolve();await f.handler.close();assert.ok(!f.events.includes('admit'));
});
test('binary client disconnect aborts an outstanding S3 body and never releases bytes',async()=>{
  const entered=deferred();let cancelled=false;
  const f=await fixture({reply:(command)=>mediaFileReply(command,undefined,undefined,command.constructor.name==='GetObjectCommand'?{stream:new ReadableStream({start(){entered.resolve();},cancel(){cancelled=true;}})}:{})});
  const controller=new AbortController(),run=f.run({signal:controller.signal});await entered.promise;controller.abort();assert.equal((await run).status,503);await f.handler.close();assert.ok(cancelled);assert.equal(f.delivered,false);
});
test('file read mode defaults off and validates every enabled storage setting before composition',()=>{
  assert.equal(requireRailwayMetaMediaFileEnvironment({}),null);assert.equal(requireRailwayMetaMediaFileEnvironment({META_MEDIA_FILE_READ_MODE:'disabled'}),null);
  assert.throws(()=>requireRailwayMetaMediaFileEnvironment({META_MEDIA_FILE_READ_MODE:'true'}));
  assert.throws(()=>requireRailwayMetaMediaFileEnvironment({META_MEDIA_FILE_READ_MODE:'enabled'}));
  assert.equal(requireRailwayMetaMediaFileEnvironment({...quarantineEnvironment,META_MEDIA_FILE_READ_MODE:'enabled'}).META_MEDIA_FILE_READ_MODE,'enabled');
});
test('Node binary response waits for each write and finish, copying only one bounded chunk',async()=>{
  const chunks=[],callbacks=[];
  const target=new Writable({highWaterMark:1,write(chunk,_encoding,callback){chunks.push(chunk);callbacks.push(callback);}});
  target.headersSent=false;target.setHeader=()=>{};
  const source=mediaBytes.slice(),file={bytes:source,sizeBytes:source.length};let complete=false;
  const work=writeRailwayNodeMediaFileResponse(target,file,new Headers(),new AbortController().signal).then(()=>{complete=true;});
  await new Promise(r=>setImmediate(r));assert.equal(chunks.length,1);assert.equal(complete,false);assert.notEqual(chunks[0].buffer,source.buffer);
  while(!complete){callbacks.shift()?.();await new Promise(r=>setImmediate(r));}
  await work;assert.deepEqual(Buffer.concat(chunks),Buffer.from(mediaBytes));assert.ok(chunks.every(c=>c.length<=65536));
});
test('Node binary response destroys interrupted output and releases its caller before a late write callback',async()=>{
  let callback;const target=new Writable({write(_chunk,_encoding,done){callback=done;}});target.headersSent=false;target.setHeader=()=>{};
  const signal=new AbortController();const work=writeRailwayNodeMediaFileResponse(target,{bytes:mediaBytes.slice()},new Headers(),signal.signal);
  signal.abort();await assert.rejects(work,/interrupted/);assert.ok(target.destroyed);callback?.();
});

test('Node HTTP rejects duplicate raw credentials and noncanonical media paths before calling the media handler',async()=>{
  const {createRailwayNodeHttpServer}=await import('../server/platform/railwayNodeHttpServer.ts');const {Readable}=await import('node:stream');
  let listener,calls=0;
  createRailwayNodeHttpServer({port:3001,runtime:{handler:{handle:async()=>new Response(null,{status:404})},readiness:{check:async()=>({status:'ready'})},mediaFileHandler:{handle:async()=>{calls++;throw new Error('not expected');}}}},
    {createServer(_options,callback){listener=callback;return {};}});
  const key=(await mediaFileJob()).intent.messageKey;
  for(const [path,raw,status] of [
    [`/v1/media-files/${key}`,['Authorization','Bearer one','authorization','Bearer two'],400],
    [`/v1/media-files/${key}`,['Origin',origin,'origin',origin],400],
    [`/v1/media-files/../media-files/${key}`,[],404],
    [`/v1/media-files/${key}?token=private`,[],404],
  ]){
    const request=Readable.from([]);request.url=path;request.method='GET';request.headers={};request.rawHeaders=raw;
    const target=new Writable({write(_chunk,_encoding,done){done();}});target.setHeader=()=>{};
    const done=new Promise(resolve=>target.once('finish',resolve));listener(request,target);await done;assert.equal(target.statusCode,status);
  }
  assert.equal(calls,0);
});
