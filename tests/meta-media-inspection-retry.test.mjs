import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMetaMediaInspectionRetryInput, META_MEDIA_INSPECTION_RETRY_OPERATION } from '../shared/domain/metaMediaInspectionRetry.ts';
import { parseMetaMediaTaskView, canRequestMetaMediaInspectionRetry } from '../shared/domain/metaMediaTaskView.ts';
import { metaMediaInspectionRetryKey, MetaMediaInspectionRetryError } from '../server/meta/metaMediaInspectionRetry.ts';
import { createPostgresMetaMediaInspectionRetryRepository } from '../server/platform/postgresMetaMediaInspectionRetryRepository.ts';
import { createRailwayMetaMediaInspectionRetryOperation } from '../server/platform/railwayMetaMediaInspectionRetryOperation.ts';
import { createRailwayMetaMediaInspectionRetryHandler } from '../server/meta/railwayMetaMediaInspectionRetryHandler.ts';
import { createRailwayApiHttpHandler } from '../server/platform/railwayApiHttpHandler.ts';
import { createRailwayApiClient } from '../server/platform/railwayApiClient.ts';
import { mediaFileJob } from './fixtures/meta-media-file-read.mjs';
const job=await mediaFileJob(),input={jobKey:job.jobKey,expectedVersion:25},key=await metaMediaInspectionRetryKey(input);
const session={tenantId:job.intent.tenantId,externalUserId:job.intent.actor,role:'owner',status:'active',displayName:'Inspection integration'};
const token='user.payload.signature',oidc='oidc.payload.signature',service={teamSlug:'connect-team',projectName:'connect-web',environment:'production'};
const task={jobKey:job.jobKey,version:25,kind:'inspect',status:'recovery-required',attempts:12,operatorRetries:0,canCleanup:false,cleanup:null,updatedAt:'2026-09-10T00:00:00.000Z',nextAttemptAt:null,leaseExpiresAt:null,leaseExpired:false,scanResults:[],multipleScanVersions:false};
function fixture(options={}) {
  const calls=[],requests=[];
  const api=createRailwayApiHttpHandler({expectedServiceIdentity:service,
    oidcVerifier:{async verify(value){return value===oidc?{provider:'vercel',...service,subject:'owner:connect-team:project:connect-web:environment:production'}:null;}},
    endUserSessionVerifier:{async verify(value){return value===token?{externalUserId:session.externalUserId,externalOrganizationId:'org_verified'}:null;}},
    operations:[createRailwayMetaMediaInspectionRetryOperation({tenantSessions:{async resolve(){return {...session,role:options.role??'owner'};}},
      retries:{async request(s,p,k){calls.push({s,p,k});if(options.error)throw options.error;return options.status??'queued';}}})]});
  const handler=createRailwayMetaMediaInspectionRetryHandler({applicationConfigured:()=>options.configured!==false,
    inspectConfiguration:()=>({status:'configured',configuration:{apiOrigin:'https://connect-api.invalid',deploymentEnvironment:'production'}}),
    resolveIdentity:async()=>({status:'authenticated',oidcToken:oidc,userSessionToken:token}),
    createClient(config){return createRailwayApiClient({apiOrigin:config.apiOrigin,deploymentEnvironment:config.deploymentEnvironment,
      oidcTokenProvider:{async getToken(){return config.oidcToken;}},userSessionTokenProvider:{async getToken(){return config.userSessionToken;}},
      traceparentProvider:{async getTraceparent(){return null;}},telemetry:{record(){return true;},scheduleFlush(){}},
      async fetchImplementation(url,init){requests.push(JSON.parse(init.body));return options.response?Response.json(options.response):api.handle(new Request(url,init));}});},
  });
  const send=(payload=input,changes={},headers={})=>api.handle(new Request('https://connect-api.invalid/v1/connect',{method:'POST',headers:{'content-type':'application/json','x-vercel-oidc-token':oidc,authorization:`Bearer ${token}`,...headers},
    body:JSON.stringify({contractVersion:'connect.railway-api.v1',operation:META_MEDIA_INSPECTION_RETRY_OPERATION,requestKind:'mutation',idempotencyKey:key,payload,...changes})}));
  return {api,handler,send,calls,requests};
}
test('inspection retry input is closed and its idempotency key is deterministic across property order',async()=>{
  assert.deepEqual(parseMetaMediaInspectionRetryInput(input),input);assert.ok(Object.isFrozen(parseMetaMediaInspectionRetryInput(input)));
  assert.equal(await metaMediaInspectionRetryKey({expectedVersion:25,jobKey:job.jobKey}),key);assert.match(key,/^connect_idempotency_v1_[0-9a-f]{64}$/);
  assert.notEqual(await metaMediaInspectionRetryKey({...input,expectedVersion:26}),key);
  for(const value of [null,[],{}, {...input,tenantId:1},{...input,actor:'owner'},{...input,expectedVersion:0},{...input,expectedVersion:'25'},{...input,expectedVersion:2147483647},{...input,jobKey:'https://s3.amazonaws.com'}])assert.equal(parseMetaMediaInspectionRetryInput(value),null);
});
test('inspection retry diagnostic eligibility retains the full cumulative counter and rejects blockers',()=>{
  assert.ok(parseMetaMediaTaskView(task));assert.equal(canRequestMetaMediaInspectionRetry(task),true);
  const granted={...task,operatorRetries:3,attempts:15};assert.ok(parseMetaMediaTaskView(granted));assert.equal(canRequestMetaMediaInspectionRetry(granted),false);
  for(const change of [{operatorRetries:4},{attempts:13},{version:0},{kind:'upload',operatorRetries:1,attempts:1}])assert.equal(parseMetaMediaTaskView({...task,...change}),null);
  for(const change of [{kind:'upload'},{status:'pending'},{status:'running'},{status:'done'},{status:'blocked'},{status:'cancelled'},{attempts:1},{scanResults:['FAILED']},{scanResults:['THREATS_FOUND']},{scanResults:['NO_THREATS_FOUND'],multipleScanVersions:true}])assert.equal(canRequestMetaMediaInspectionRetry({...task,...change}),false);
});
for(const role of ['manager','agent','viewer'])test(`inspection retry rejects ${role} before repository work`,async()=>{
  const f=fixture({role});assert.equal(await f.handler.request(input),'permission-denied');assert.deepEqual(f.calls,[]);
  const repo=createPostgresMetaMediaInspectionRetryRepository({transaction:async()=>assert.fail('no transaction')});
  await assert.rejects(repo.request({...session,role},input,key),{code:'PERMISSION_DENIED'});
});
test('inspection retry BFF and HTTP preserve server identity, payload, and deterministic idempotency',async()=>{
  const f=fixture();assert.equal(await f.handler.request(input),'queued');assert.deepEqual(f.calls,[{s:session,p:input,k:key}]);
  assert.deepEqual(f.requests[0],{contractVersion:'connect.railway-api.v1',operation:META_MEDIA_INSPECTION_RETRY_OPERATION,requestKind:'mutation',idempotencyKey:key,payload:input});
  assert.equal(await fixture({status:'already-requested'}).handler.request(input),'already-requested');
});
for(const [name,payload,changes] of [
  ['tenant',{...input,tenantId:1},{}],['kind',{...input,kind:'upload'},{}],['actor',{...input,actor:session.externalUserId},{}],
  ['key',input,{idempotencyKey:'connect_idempotency_v1_'+'0'.repeat(64)}],['query',input,{requestKind:'query',idempotencyKey:null}],
  ['missing version',{jobKey:input.jobKey},{}],
])test(`inspection retry rejects forged ${name} without queue mutation`,async()=>{
  const f=fixture();const response=await f.send(payload,changes);assert.equal((await response.json()).code,'INVALID_REQUEST');assert.deepEqual(f.calls,[]);
});
test('inspection retry requires both service and end-user proofs',async()=>{
  const f=fixture();for(const headers of [{'x-vercel-oidc-token':'wrong'}, {authorization:'Bearer wrong'}])assert.notEqual((await f.send(input,{},headers)).status,200);assert.deepEqual(f.calls,[]);
});
test('inspection retry maps conflicts and revocation without exposing dependency messages',async()=>{
  assert.equal(await fixture({error:new MetaMediaInspectionRetryError('CONFLICT')}).handler.request(input),'conflict');
  assert.equal(await fixture({error:new MetaMediaInspectionRetryError('PERMISSION_DENIED')}).handler.request(input),'permission-denied');
  assert.equal(await fixture({error:new Error('private credentials')}).handler.request(input),'server-error');
  assert.equal(await fixture({configured:false}).handler.request(input),'configuration-required');
});
test('inspection retry rejects malformed success replies and unconfigured input before network work',async()=>{
  for(const data of [{status:'queued',secret:'private'},{status:'running'},null,[]])assert.equal(await fixture({response:{contractVersion:'connect.railway-api.v1',outcome:'ok',data}}).handler.request(input),'server-error');
  const f=fixture();assert.equal(await f.handler.request({...input,bucket:'private'}),'invalid-request');assert.deepEqual(f.requests,[]);
});
test('inspection retry control renders an explicit localized button without storage identifiers',async()=>{
  const {build}=await import('esbuild'),{renderToStaticMarkup}=await import('react-dom/server'),{createElement}=await import('react');
  const result=await build({entryPoints:[new URL('../features/workspace/MetaMediaInspectionRetryControl.tsx',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',plugins:[{name:'react-runtime',setup(api){api.onResolve({filter:/^react(?:\/jsx-runtime)?$/},args=>({path:import.meta.resolve(args.path),external:true}));}}]});
  const {MetaMediaInspectionRetryControl,mediaInspectionRetryMessages}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  for(const language of ['he','en','ar']){const html=renderToStaticMarkup(createElement(MetaMediaInspectionRetryControl,{language,input,requestRetry:async()=>assert.fail('not called on render')}));assert.ok(html.includes(mediaInspectionRetryMessages[language].label));assert.match(html,/role="status"/);assert.doesNotMatch(html,/href=|Bucket|VersionId|PutObject/);}
});
