import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMetaMediaCleanupInput, META_MEDIA_CLEANUP_OPERATION } from '../shared/domain/metaMediaCleanup.ts';
import { parseMetaMediaTaskView, canRequestMetaMediaInspectionRetry } from '../shared/domain/metaMediaTaskView.ts';
import { metaMediaCleanupKey, MetaMediaCleanupError } from '../server/meta/metaMediaCleanup.ts';
import { createPostgresMetaMediaCleanupRepository } from '../server/platform/postgresMetaMediaCleanupRepository.ts';
import { createRailwayMetaMediaCleanupOperation } from '../server/platform/railwayMetaMediaCleanupOperation.ts';
import { createRailwayMetaMediaCleanupHandler } from '../server/meta/railwayMetaMediaCleanupHandler.ts';
import { createRailwayApiHttpHandler } from '../server/platform/railwayApiHttpHandler.ts';
import { createRailwayApiClient } from '../server/platform/railwayApiClient.ts';
import { mediaFileJob } from './fixtures/meta-media-file-read.mjs';
const job=await mediaFileJob(),input={jobKey:job.jobKey,expectedVersion:25,confirm:'remove-quarantined-copy'},key=await metaMediaCleanupKey(input);
const session={tenantId:job.intent.tenantId,externalUserId:job.intent.actor,role:'owner',status:'active',displayName:'Inspection integration'};
const token='user.payload.signature',oidc='oidc.payload.signature',service={teamSlug:'connect-team',projectName:'connect-web',environment:'production'};
const task={jobKey:job.jobKey,version:25,kind:'inspect',status:'recovery-required',attempts:12,operatorRetries:0,canCleanup:false,cleanup:null,updatedAt:'2026-09-10T00:00:00.000Z',nextAttemptAt:null,leaseExpiresAt:null,leaseExpired:false,scanResults:[],multipleScanVersions:false};
function fixture(options={}) {
  const calls=[],requests=[];
  const api=createRailwayApiHttpHandler({expectedServiceIdentity:service,
    oidcVerifier:{async verify(value){return value===oidc?{provider:'vercel',...service,subject:'owner:connect-team:project:connect-web:environment:production'}:null;}},
    endUserSessionVerifier:{async verify(value){return value===token?{externalUserId:session.externalUserId,externalOrganizationId:'org_verified'}:null;}},
    operations:[createRailwayMetaMediaCleanupOperation({tenantSessions:{async resolve(){return {...session,role:options.role??'owner'};}},
      cleanup:{async request(s,p,k){calls.push({s,p,k});if(options.error)throw options.error;return options.status??'queued';}}})]});
  const handler=createRailwayMetaMediaCleanupHandler({applicationConfigured:()=>options.configured!==false,
    inspectConfiguration:()=>({status:'configured',configuration:{apiOrigin:'https://connect-api.invalid',deploymentEnvironment:'production'}}),
    resolveIdentity:async()=>({status:'authenticated',oidcToken:oidc,userSessionToken:token}),
    createClient(config){return createRailwayApiClient({apiOrigin:config.apiOrigin,deploymentEnvironment:config.deploymentEnvironment,
      oidcTokenProvider:{async getToken(){return config.oidcToken;}},userSessionTokenProvider:{async getToken(){return config.userSessionToken;}},
      traceparentProvider:{async getTraceparent(){return null;}},telemetry:{record(){return true;},scheduleFlush(){}},
      async fetchImplementation(url,init){requests.push(JSON.parse(init.body));return options.response?Response.json(options.response):api.handle(new Request(url,init));}});},
  });
  const send=(payload=input,changes={},headers={})=>api.handle(new Request('https://connect-api.invalid/v1/connect',{method:'POST',headers:{'content-type':'application/json','x-vercel-oidc-token':oidc,authorization:`Bearer ${token}`,...headers},
    body:JSON.stringify({contractVersion:'connect.railway-api.v1',operation:META_MEDIA_CLEANUP_OPERATION,requestKind:'mutation',idempotencyKey:key,payload,...changes})}));
  return {api,handler,send,calls,requests};
}
test('cleanup request requires explicit confirmation and a canonical deterministic identity',async()=>{
  assert.deepEqual(parseMetaMediaCleanupInput(input),input);assert.ok(Object.isFrozen(parseMetaMediaCleanupInput(input)));
  assert.equal(await metaMediaCleanupKey({confirm:input.confirm,expectedVersion:input.expectedVersion,jobKey:input.jobKey}),key);
  for(const bad of [null,{}, {...input,confirm:undefined},{...input,confirm:'yes'},{...input,bucket:'private'},{...input,versionId:job.receipt.versionId},{...input,expectedVersion:0}])assert.equal(parseMetaMediaCleanupInput(bad),null);
  assert.notEqual(await metaMediaCleanupKey({...input,expectedVersion:26}),key);
});
for(const role of ['manager','agent','viewer'])test(`cleanup rejects ${role} before mutation`,async()=>{
  const f=fixture({role});assert.equal(await f.handler.request(input),'permission-denied');assert.deepEqual(f.calls,[]);
  const repo=createPostgresMetaMediaCleanupRepository({transaction:async()=>assert.fail('unauthorized transaction')});
  await assert.rejects(repo.request({...session,role},input,key),{code:'PERMISSION_DENIED'});
});
test('cleanup HTTP and BFF retain verified identity, exact input and idempotent outcomes',async()=>{
  for(const status of ['queued','already-requested']){const f=fixture({status});assert.equal(await f.handler.request(input),status);assert.deepEqual(f.calls,[{s:session,p:input,k:key}]);}
  const f=fixture();for(const headers of [{'x-vercel-oidc-token':'wrong'},{authorization:'Bearer wrong'}])assert.notEqual((await f.send(input,{},headers)).status,200);assert.deepEqual(f.calls,[]);
});
test('cleanup rejects injected targets, wrong idempotency and query use without invoking the repository',async()=>{
  const f=fixture();for(const [payload,changes]of [[{...input,tenantId:1},{}],[{...input,objectKey:job.intent.objectKey},{}],[{...input,confirm:undefined},{}],[input,{idempotencyKey:'connect_idempotency_v1_'+'0'.repeat(64)}],[input,{requestKind:'query',idempotencyKey:null}]])assert.notEqual((await f.send(payload,changes)).status,200);
  assert.deepEqual(f.calls,[]);
});
test('cleanup BFF sanitizes dependency and malformed provider results',async()=>{
  assert.equal(await fixture({error:new MetaMediaCleanupError('CONFLICT')}).handler.request(input),'conflict');
  assert.equal(await fixture({error:new MetaMediaCleanupError('OUTCOME_UNKNOWN')}).handler.request(input),'server-error');
  assert.equal(await fixture({configured:false}).handler.request(input),'configuration-required');
  for(const data of [{status:'removed'},{status:'queued',secret:'private'},null])assert.equal(await fixture({response:{contractVersion:'connect.railway-api.v1',outcome:'ok',data}}).handler.request(input),'server-error');
});
test('cleanup diagnostics reject inconsistent eligibility and disable inspection retry after withdrawal',()=>{
  for(const status of ['pending','running','removed','cancelled','recovery-required']){const value={...task,cleanup:{status,attempts:status==='pending'?0:1}};assert.ok(parseMetaMediaTaskView(value));assert.equal(canRequestMetaMediaInspectionRetry(value),false);}
  for(const change of [{cleanup:{status:'removed',attempts:0}},{cleanup:{status:'pending',attempts:4}},{cleanup:{status:'pending',attempts:0,bucket:'private'}},{cleanup:{status:'running',attempts:1},canCleanup:true},{canCleanup:true,kind:'upload'},{canCleanup:true,status:'running'},{canCleanup:true,multipleScanVersions:true}])assert.equal(parseMetaMediaTaskView({...task,...change}),null);
});
