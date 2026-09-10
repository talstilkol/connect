import assert from 'node:assert/strict';
import test from 'node:test';
import {S3Client} from '@aws-sdk/client-s3';
import {createS3MetaMediaCleanupStorage} from '../server/platform/s3MetaMediaCleanupStorage.ts';
import {metaMediaQuarantineS3ClientConfiguration} from '../server/platform/s3MetaMediaQuarantineStorage.ts';
import {requireMetaMediaWorkerConfiguration} from '../server/platform/railwayMetaMediaWorkerRuntime.ts';
import {quarantineEnvironment as env,quarantineConfig as config,s3Reply} from './fixtures/meta-media-quarantine.mjs';
import {inspectionIntent} from './fixtures/meta-media-inspection.mjs';
import {wireInspectionReply} from './fixtures/meta-media-s3-wire.mjs';
const versionId='wire-version+/=',intent=inspectionIntent();
function fixture(options={}){const calls=[];const storage=createS3MetaMediaCleanupStorage(env,{requestTimeoutMs:options.timeout??30000,client:{async send(command){calls.push(command);if(command.constructor.name==='DeleteObjectCommand'){if(options.remove)return options.remove(command);return {$metadata:{httpStatusCode:204},VersionId:versionId};}return s3Reply(command);}}});return {storage,calls,run:(authorize=async()=>{})=>storage.remove(intent,versionId,authorize)};}
test('cleanup uses only six bucket checks and one exact-version DELETE',async()=>{
  const f=fixture();try{await f.run();assert.equal(f.calls.length,7);assert.deepEqual(f.calls.at(-1).input,{Bucket:config.bucket,Key:intent.objectKey,VersionId:versionId,ExpectedBucketOwner:config.accountId});assert.equal(f.calls.some(c=>['PutObjectCommand','GetObjectCommand','ListObjectVersionsCommand','PutObjectTaggingCommand'].includes(c.constructor.name)),false);}finally{f.storage.close();}
});
test('cleanup invalid target or unknown version cannot reach S3',async()=>{
  const f=fixture();try{for(const v of [null,'','null','a\n'])await assert.rejects(f.storage.remove(intent,v,async()=>{}),{code:'INVALID_REQUEST'});await assert.rejects(f.storage.remove({...intent,bucket:'other-bucket'},versionId,async()=>{}));assert.deepEqual(f.calls,[]);}finally{f.storage.close();}
});
test('cleanup refuses access loss before DELETE and retains a returned acknowledgement after access loss',async()=>{
  const f=fixture();try{await assert.rejects(f.run(async()=>{if(f.calls.length===6)throw new Error('private revocation');}));assert.equal(f.calls.length,6);}finally{f.storage.close();}
  let allowed=true;const g=fixture({remove:async()=>{allowed=false;return {$metadata:{httpStatusCode:204}};}});try{await g.run(async()=>{assert.equal(allowed,true);});assert.equal(allowed,false);}finally{g.storage.close();}
});
for(const status of [403,404,409,429,500])test(`cleanup handles S3 ${status} without falling back to unversioned deletion`,async()=>{
  const f=fixture({remove:async()=>{throw Object.assign(new Error('private S3 details'),{$metadata:{httpStatusCode:status}});}});try{await assert.rejects(f.run(),{code:[403,404].includes(status)?'DELETE_REJECTED':'OUTCOME_UNKNOWN'});assert.equal(f.calls.filter(c=>c.constructor.name==='DeleteObjectCommand').length,1);}finally{f.storage.close();}
});
test('cleanup malformed acknowledgements stay unresolved',async()=>{
  for(const result of [{$metadata:{httpStatusCode:200}},{$metadata:{httpStatusCode:204},VersionId:'another-version'},{$metadata:{httpStatusCode:204},DeleteMarker:true}]){const f=fixture({remove:async()=>result});try{await assert.rejects(f.run(),{code:'OUTCOME_UNKNOWN'});}finally{f.storage.close();}}
});
test('cleanup timeout fences another operation until the pending transport settles',async()=>{
  let release,entered;const started=new Promise(r=>{entered=r;});const f=fixture({timeout:30,remove:()=>{entered();return new Promise(r=>{release=r;});}});
  try{const p=assert.rejects(f.run(),{code:'OUTCOME_UNKNOWN'});await started;await p;await assert.rejects(f.run(),{code:'DEPENDENCY_UNAVAILABLE'});assert.equal(f.calls.length,7);release({$metadata:{httpStatusCode:204}});await new Promise(r=>setImmediate(r));}finally{f.storage.close();}
});
async function wire(options={}){
  const requests=[];let revoked=false;
  const client=new S3Client({...metaMediaQuarantineS3ClientConfiguration(config),credentials:async()=>{
    if(options.revoke&&requests.length===6)revoked=true;
    return {accessKeyId:'integration-access-key',secretAccessKey:'integration-signing-key',...(options.revoke?{expiration:new Date(Date.now()+1000)}:{})};
  },requestHandler:{async handle(request){requests.push(request);if(request.method==='DELETE')return {response:{statusCode:options.status??204,headers:{'x-amz-version-id':versionId},body:new TextEncoder().encode(options.status?'<Error><Code>AccessDenied</Code></Error>':'')}};return wireInspectionReply(request,intent);}}});
  const storage=createS3MetaMediaCleanupStorage(env,{client});try{await storage.remove(intent,versionId,async()=>{if(revoked)throw new Error('revoked');});return {requests};}catch(error){return{requests,error};}finally{storage.close();client.destroy();}
}
test('actual SDK signs one version-bound DELETE with no governance bypass or generated invocation ID',async()=>{
  const r=await wire();assert.equal(r.error,undefined);assert.equal(r.requests.length,7);const q=r.requests.at(-1);assert.equal(q.method,'DELETE');assert.equal(q.query.versionId,versionId);assert.equal(decodeURIComponent(q.path.slice(1)),intent.objectKey);
  assert.equal(q.hostname,`${config.bucket}.s3.${config.region}.amazonaws.com`);assert.equal(q.headers['x-amz-expected-bucket-owner'],config.accountId);assert.match(q.headers.authorization,/^AWS4-HMAC-SHA256 /);
  for(const name of ['x-amz-bypass-governance-retention','x-amz-mfa','amz-sdk-invocation-id'])assert.equal(q.headers[name],undefined);
});
test('actual SDK rechecks owner authorization after credential waits and treats Object Lock denial as unresolved',async()=>{
  const revoked=await wire({revoke:true});assert.ok(revoked.error);assert.equal(revoked.requests.length,6);
  const locked=await wire({status:403});assert.equal(locked.error.code,'DELETE_REJECTED');assert.equal(locked.requests.length,7);
});
test('cleanup worker activation is explicit and requires S3 configuration while disabled mode remains dormant',()=>{
  assert.equal(requireMetaMediaWorkerConfiguration(),null);assert.equal(requireMetaMediaWorkerConfiguration({...env,META_MEDIA_WORKER_MODE:'cleanup'}),'cleanup');
  for(const key of Object.keys(env))assert.throws(()=>requireMetaMediaWorkerConfiguration({...env,[key]:undefined,META_MEDIA_WORKER_MODE:'cleanup'}));
});
