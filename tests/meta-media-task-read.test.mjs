import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMetaMediaTaskPage,parseMetaMediaTaskCursor,parseMetaMediaTaskView,decodeMetaMediaTaskCursor,encodeMetaMediaTaskCursor,metaMediaTaskAttention,META_MEDIA_TASKS_READ_OPERATION } from '../shared/domain/metaMediaTaskView.ts';
import { createPostgresMetaMediaTaskReader,postgresMetaMediaTaskReadSql } from '../server/platform/postgresMetaMediaTaskReader.ts';
import { createRailwayMetaMediaTaskReadOperation } from '../server/platform/railwayMetaMediaTaskReadOperation.ts';
import { createRailwayMetaMediaTaskReadHandler } from '../server/meta/railwayMetaMediaTaskReadHandler.ts';
import { createRailwayApiClient } from '../server/platform/railwayApiClient.ts';
import { createRailwayApiHttpHandler } from '../server/platform/railwayApiHttpHandler.ts';
import { deriveMetaMediaUploadJobKey } from '../server/meta/metaMediaUploadJournal.ts';
import { inspectionIntent } from './fixtures/meta-media-inspection.mjs';
const intent=inspectionIntent(),jobKey=await deriveMetaMediaUploadJobKey(intent);
const task={version:1,operatorRetries:0,canCleanup:false,cleanup:null,jobKey,kind:'upload',status:'pending',attempts:0,updatedAt:'2026-09-10T00:00:00.000Z',nextAttemptAt:'2026-09-10T00:00:00.000Z',leaseExpiresAt:null,leaseExpired:false,scanResults:[],multipleScanVersions:false};
const session={tenantId:intent.tenantId,externalUserId:intent.actor,role:'owner',status:'active',displayName:'Media diagnostic integration'};
const empty={tasks:[],nextCursor:null},page={tasks:[task],nextCursor:null};

test('diagnostic contract strips no fields silently and freezes valid pages',()=>{
  const parsed=parseMetaMediaTaskPage(page);assert.deepEqual(parsed,page);assert.ok(Object.isFrozen(parsed.tasks[0].scanResults));
  for(const changes of [{bucket:intent.bucket},{actor:intent.actor},{mediaUrl:'private'},{attempts:4},{status:'safe'},{nextAttemptAt:null},{leaseExpired:true},{scanResults:['OTHER']},{scanResults:['PENDING','PENDING']},{scanResults:['PENDING','NO_THREATS_FOUND']},{multipleScanVersions:true},{updatedAt:'not-a-date'}])assert.equal(parseMetaMediaTaskView({...task,...changes}),null);
});
test('diagnostic cursor has only the immutable task identity and rejects URLs or extra fields',()=>{
  const cursor={jobKey,kind:'upload'};assert.deepEqual(decodeMetaMediaTaskCursor(encodeMetaMediaTaskCursor(cursor)),cursor);
  for(const value of [null,[],{}, {...cursor,tenantId:7},{...cursor,kind:'all'},{...cursor,jobKey:'https://s3.amazonaws.com'}])assert.equal(parseMetaMediaTaskCursor(value),null);
  for(const value of ['',[],[encodeMetaMediaTaskCursor(cursor)],`${jobKey}.upload.extra`])assert.equal(decodeMetaMediaTaskCursor(value),null);
});
test('diagnostic page rejects duplicates, reversed task order, false cursors and excess rows',()=>{
  assert.equal(parseMetaMediaTaskPage(empty)?.tasks.length,0);
  for(const value of [{...page,secret:'private'},{tasks:[task,task],nextCursor:null},{tasks:[task,{...task,kind:'inspect'}],nextCursor:null},{...page,nextCursor:{jobKey,kind:'upload'}},{tasks:Array.from({length:51},()=>task),nextCursor:null}])assert.equal(parseMetaMediaTaskPage(value),null);
});
test('diagnostic attention separates historical scan evidence, attempt exhaustion and unknown causes',()=>{
  assert.equal(metaMediaTaskAttention({...task,status:'done',attempts:1,nextAttemptAt:null,scanResults:['NO_THREATS_FOUND']}),'none');
  assert.equal(metaMediaTaskAttention({...task,status:'done',scanResults:['FAILED','NO_THREATS_FOUND']}),'scan-blocked');
  assert.equal(metaMediaTaskAttention({...task,multipleScanVersions:true,scanResults:['NO_THREATS_FOUND']}),'scan-conflict');
  for(const [changes,expected] of [[{status:'recovery-required',attempts:3},'attempt-limit'],[{status:'recovery-required',attempts:1},'review-required'],[{status:'blocked',attempts:1},'review-required'],[{status:'cancelled',attempts:1},'cancelled'],[{status:'running',attempts:1,leaseExpired:true},'lease-expired']])assert.equal(metaMediaTaskAttention({...task,...changes}),expected);
});
function repositoryFixture(options={}){const calls=[];const reader=createPostgresMetaMediaTaskReader({async query(sql,parameters){calls.push({sql,parameters});if(options.error)throw new Error('private database credentials');return options.result??{rowCount:1,rows:[{authorized:true,cursorValid:true,tasks:[task],...options.row}]};}});return {calls,read:(s=session,cursor=null)=>reader.read(s,cursor)};}
test('diagnostic reader uses one bounded read with server tenant and owner identity',async()=>{
  const f=repositoryFixture();assert.deepEqual(await f.read(),page);assert.deepEqual(f.calls,[{sql:postgresMetaMediaTaskReadSql,parameters:[intent.tenantId,intent.actor,null,null]}]);
  assert.doesNotMatch(postgresMetaMediaTaskReadSql,/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i);assert.match(postgresMetaMediaTaskReadSql,/LIMIT 51/);
});
for(const role of ['manager','agent','viewer'])test(`diagnostic reader rejects ${role} without querying`,async()=>{const f=repositoryFixture();await assert.rejects(f.read({...session,role}),{code:'PERMISSION_DENIED'});assert.deepEqual(f.calls,[]);});
test('diagnostic reader rechecks owner even with a stale authorized session',async()=>{const f=repositoryFixture({row:{authorized:false,cursorValid:false}});await assert.rejects(f.read(),{code:'PERMISSION_DENIED'});});
test('diagnostic reader rejects a foreign or unknown cursor without exposing its existence',async()=>{const f=repositoryFixture({row:{cursorValid:false}});await assert.rejects(f.read(session,{jobKey,kind:'upload'}),{code:'INVALID_REQUEST'});});
for(const row of [{authorized:'yes'},{cursorValid:null},{tasks:[{...task,actor:'private'}]},{tasks:[task,task]},{tasks:null}])test(`diagnostic reader rejects malformed adapter output ${Object.keys(row)}`,async()=>{const f=repositoryFixture({row});await assert.rejects(f.read(),{code:'DEPENDENCY_UNAVAILABLE'});});
test('diagnostic reader sanitizes dependency failures and rejects cursor replay',async()=>{
  await assert.rejects(repositoryFixture({error:true}).read(),e=>e.code==='DEPENDENCY_UNAVAILABLE'&&!e.message.includes('credentials'));
  const f=repositoryFixture();await assert.rejects(f.read(session,{jobKey,kind:'upload'}),{code:'DEPENDENCY_UNAVAILABLE'});
});
const oidc='oidc.payload.signature',user='user.payload.signature';
const identity={teamSlug:'connect-team',projectName:'connect-web',environment:'production'};
function httpFixture(options={}){
  const reads=[],requests=[];
  const api=createRailwayApiHttpHandler({expectedServiceIdentity:identity,
    oidcVerifier:{async verify(t){return t===oidc?{provider:'vercel',...identity,subject:'owner:connect-team:project:connect-web:environment:production'}:null;}},
    endUserSessionVerifier:{async verify(t){return t===user?{externalUserId:intent.actor,externalOrganizationId:'org_verified'}:null;}},
    operations:[createRailwayMetaMediaTaskReadOperation({tenantSessions:{async resolve(){return {...session,role:options.role??'owner'};}},mediaTasks:{async read(s,after){reads.push({s,after});if(options.error)throw new Error('private connection');return options.page??page;}}})],
  });
  const handler=createRailwayMetaMediaTaskReadHandler({applicationConfigured:()=>options.configured!==false,
    inspectConfiguration:()=>({status:'configured',configuration:{apiOrigin:'https://connect-api.invalid',deploymentEnvironment:'production'}}),resolveIdentity:async()=>({status:'authenticated',oidcToken:oidc,userSessionToken:user}),
    createClient(config){return createRailwayApiClient({apiOrigin:config.apiOrigin,deploymentEnvironment:config.deploymentEnvironment,
      oidcTokenProvider:{async getToken(){return config.oidcToken;}},userSessionTokenProvider:{async getToken(){return config.userSessionToken;}},traceparentProvider:{async getTraceparent(){return null;}},telemetry:{record(){return true;},scheduleFlush(){}},
      async fetchImplementation(url,init){requests.push(JSON.parse(init.body));return options.response?Response.json(options.response):api.handle(new Request(url,init));}});},
  });
  const send=(payload={},changes={})=>api.handle(new Request('https://connect-api.invalid/v1/connect',{method:'POST',headers:{'content-type':'application/json','x-vercel-oidc-token':oidc,authorization:`Bearer ${user}`},body:JSON.stringify({contractVersion:'connect.railway-api.v1',operation:META_MEDIA_TASKS_READ_OPERATION,requestKind:'query',idempotencyKey:null,payload,...changes})}));
  return {reads,requests,handler,send};
}
test('diagnostic BFF traverses the authenticated HTTP operation and carries only the cursor',async()=>{
  const f=httpFixture();assert.deepEqual(await f.handler.read(),{status:'ready',page});assert.deepEqual(f.reads[0],{s:session,after:null});assert.deepEqual(f.requests[0].payload,{});
  const other=httpFixture({page:empty});assert.deepEqual(await other.handler.read(`${jobKey}.upload`),{status:'ready',page:empty});assert.deepEqual(other.reads[0].after,{jobKey,kind:'upload'});
});
test('diagnostic operation blocks mutations, arbitrary filters and identity injection before storage',async()=>{
  const f=httpFixture();for(const [payload,changes] of [[{tenantId:9},{}],[{after:null},{}],[{limit:1000},{}],[{reset:true},{}],[{}, {requestKind:'mutation'}],[{}, {idempotencyKey:`connect_idempotency_v1_${'a'.repeat(64)}`}],[{after:{jobKey,kind:'upload',actor:'private'}},{}]]){
    const response=await f.send(payload,changes);assert.notEqual(response.status,200);
  }assert.deepEqual(f.reads,[]);
});
test('diagnostic BFF fails closed for missing configuration, invalid links and permission loss',async()=>{
  const disabled=httpFixture({configured:false});assert.deepEqual(await disabled.handler.read(),{status:'configuration-required',page:null});assert.deepEqual(disabled.requests,[]);
  const invalid=httpFixture();assert.equal((await invalid.handler.read(['bad','cursor'])).status,'invalid-request');assert.deepEqual(invalid.requests,[]);
  const denied=httpFixture({role:'agent'});assert.equal((await denied.handler.read()).status,'permission-denied');assert.deepEqual(denied.reads,[]);
  assert.equal((await httpFixture({error:true}).handler.read()).status,'server-error');
});
test('diagnostic BFF rejects extra provider fields and malformed successful pages',async()=>{
  for(const data of [{page,credentials:'private'},{page:{tasks:[{...task,url:'private'}],nextCursor:null}},{page:{tasks:[task],nextCursor:{jobKey,kind:'upload'}}}]){
    const f=httpFixture({response:{contractVersion:'connect.railway-api.v1',outcome:'ok',data}});assert.deepEqual(await f.handler.read(),{status:'server-error',page:null});
  }
});
test('diagnostic operation rejects malformed repository pages and sends no-store responses',async()=>{
  const invalid=httpFixture({page:{...page,raw:'private'}});assert.equal((await invalid.handler.read()).status,'server-error');
  const response=await httpFixture().send();assert.equal(response.headers.get('cache-control'),'no-store');
});
