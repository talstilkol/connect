import assert from 'node:assert/strict';
import test from 'node:test';
import {S3Client} from '@aws-sdk/client-s3';
import {knowledgeFixture} from './fixtures/knowledge-ingestion.mjs';
import {s3Reply} from './fixtures/meta-media-quarantine.mjs';
import {wireInspectionReply} from './fixtures/meta-media-s3-wire.mjs';
import {inspectionIntent} from './fixtures/meta-media-inspection.mjs';
import {requiredKnowledgeQuarantineBucketPolicy} from '../server/platform/s3KnowledgeQuarantinePolicy.ts';
import {metaMediaQuarantineS3ClientConfiguration} from '../server/platform/s3MetaMediaQuarantineStorage.ts';
import {createS3KnowledgeCleanupStorage} from '../server/platform/s3KnowledgeCleanupStorage.ts';
import {KnowledgeRetentionError} from '../server/operations/knowledgeObjectRetention.ts';
const versionId='wire-version+/=';
async function fixture(options={}){
  const f=await knowledgeFixture(),calls=[];
  const storage=createS3KnowledgeCleanupStorage(f.config,{timeoutMs:options.timeout??30000,client:{async send(command){
    calls.push(command);
    if(command.constructor.name==='DeleteObjectCommand')return options.remove?options.remove(command):{$metadata:{httpStatusCode:204},VersionId:versionId};
    if(command.constructor.name==='GetBucketPolicyCommand')return {$metadata:{httpStatusCode:200},Policy:JSON.stringify(requiredKnowledgeQuarantineBucketPolicy(f.config))};
    return s3Reply(command);
  }}});
  return {f,storage,calls,run:(authorize=async()=>{})=>storage.remove(f.intent,versionId,authorize)};
}
test('Knowledge cleanup checks the bucket and deletes only the exact immutable version without reading content or listing',async()=>{
  const f=await fixture();try{
    await f.run();assert.equal(f.calls.length,7);assert.deepEqual(f.calls.at(-1).input,{Bucket:f.f.config.bucket,ExpectedBucketOwner:f.f.config.accountId,Key:f.f.intent.objectKey,VersionId:versionId});
    assert.equal(f.calls.some(c=>['GetObjectCommand','ListObjectVersionsCommand','PutObjectCommand','PutObjectTaggingCommand'].includes(c.constructor.name)),false);
  }finally{f.storage.close();}
});
test('unknown version, wrong tenant/hash/bucket or key cannot reach deletion storage',async()=>{
  const f=await fixture();try{
    for(const v of [null,'','null','a\n'])await assert.rejects(f.storage.remove(f.f.intent,v,async()=>{}),{code:'INVALID_INPUT'});
    for(const change of [{tenantId:8},{objectKey:f.f.intent.objectKey+'/other'},{bucket:'other-bucket'},{contentSha256:'f'.repeat(64)}])await assert.rejects(f.storage.remove({...f.f.intent,...change},versionId,async()=>{}),{code:'INVALID_INPUT'});
    assert.equal(f.calls.length,0);
  }finally{f.storage.close();}
});
for(const status of [403,404,409,429,500])test(`Knowledge cleanup preserves uncertainty/denial for S3 ${status}`,async()=>{
  const f=await fixture({remove:()=>{throw Object.assign(Error('private provider details'),{$metadata:{httpStatusCode:status}})}});
  try{await assert.rejects(f.run(),{code:[403,404].includes(status)?'DELETE_REJECTED':'OUTCOME_UNKNOWN'});assert.equal(f.calls.filter(c=>c.constructor.name==='DeleteObjectCommand').length,1);}finally{f.storage.close();}
});
test('malformed S3 acknowledgements never claim deletion success',async()=>{
  for(const response of [{$metadata:{httpStatusCode:200}},{$metadata:{httpStatusCode:204},DeleteMarker:true},{$metadata:{httpStatusCode:204},VersionId:'another-version'}]){
    const f=await fixture({remove:()=>response});try{await assert.rejects(f.run(),{code:'OUTCOME_UNKNOWN'});}finally{f.storage.close();}
  }
});
test('a hold before DELETE prevents dispatch; an in-flight change does not erase an actual acknowledgement',async()=>{
  const f=await fixture();try{await assert.rejects(f.run(async()=>{if(f.calls.length===6)throw new KnowledgeRetentionError('CONFLICT')}),{code:'CONFLICT'});assert.equal(f.calls.length,6);}finally{f.storage.close();}
  let allowed=true;const g=await fixture({remove:()=>{allowed=false;return {$metadata:{httpStatusCode:204}}}});
  try{await g.run(async()=>assert.equal(allowed,true));assert.equal(allowed,false);}finally{g.storage.close();}
});
test('timeout keeps an in-flight cleanup operation fenced until its transport settles',async()=>{
  let release,entered;const started=new Promise(r=>{entered=r});
  const f=await fixture({timeout:30,remove:()=>{entered();return new Promise(r=>{release=r})}});
  try{const pending=assert.rejects(f.run(),{code:'OUTCOME_UNKNOWN'});await started;await pending;await assert.rejects(f.run(),{code:'UNAVAILABLE'});assert.equal(f.calls.length,7);release({$metadata:{httpStatusCode:204}});await new Promise(r=>setImmediate(r));}finally{f.storage.close();}
});
async function wire(options={}){
  const f=await knowledgeFixture(),requests=[];let revoked=false;
  const client=new S3Client({...metaMediaQuarantineS3ClientConfiguration(f.config),credentials:async()=>{
    if(options.revoke&&requests.length===6)revoked=true;
    return {accessKeyId:'integration-access-key',secretAccessKey:'integration-signing-key',...(options.revoke?{expiration:new Date(Date.now()+1000)}:{})};
  },requestHandler:{async handle(request){
    requests.push(request);
    if(request.method==='DELETE')return{response:{statusCode:options.status??204,headers:{'x-amz-version-id':versionId},body:new TextEncoder().encode(options.status?'<Error><Code>AccessDenied</Code></Error>':'')}};
    if(Object.hasOwn(request.query,'policy'))return{response:{statusCode:200,headers:{'content-type':'application/json'},body:new TextEncoder().encode(JSON.stringify(requiredKnowledgeQuarantineBucketPolicy(f.config)))}};
    return wireInspectionReply(request,inspectionIntent(),{});
  }}});
  const storage=createS3KnowledgeCleanupStorage(f.config,{client});
  try{await storage.remove(f.intent,versionId,async()=>{if(revoked)throw new KnowledgeRetentionError('AUTHORIZATION_DENIED')});return{requests,f};}
  catch(error){return{error,requests,f};}finally{storage.close();client.destroy();}
}
test('actual AWS SDK signs an exact-version Knowledge DELETE, with no unversioned fallback or generated invocation ID',async()=>{
  const r=await wire();assert.equal(r.error,undefined);assert.equal(r.requests.length,7);const request=r.requests.at(-1);
  assert.equal(request.method,'DELETE');assert.equal(request.query.versionId,versionId);assert.equal(decodeURIComponent(request.path.slice(1)),r.f.intent.objectKey);
  assert.equal(request.hostname,`${r.f.config.bucket}.s3.${r.f.config.region}.amazonaws.com`);assert.equal(request.headers['x-amz-expected-bucket-owner'],r.f.config.accountId);assert.match(request.headers.authorization,/^AWS4-HMAC-SHA256 /);
  for(const key of ['x-amz-bypass-governance-retention','x-amz-mfa','amz-sdk-invocation-id'])assert.equal(request.headers[key],undefined);
});
test('actual SDK checks authority after credentials and respects Object Lock denial',async()=>{
  const revoked=await wire({revoke:true});assert.equal(revoked.error.code,'AUTHORIZATION_DENIED');assert.equal(revoked.requests.length,6);
  const locked=await wire({status:403});assert.equal(locked.error.code,'DELETE_REJECTED');assert.equal(locked.requests.length,7);
});
