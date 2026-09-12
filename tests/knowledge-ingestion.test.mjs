import assert from 'node:assert/strict';
import test from 'node:test';
import { knowledgeFixture } from './fixtures/knowledge-ingestion.mjs';
import { s3Reply } from './fixtures/meta-media-quarantine.mjs';
import { createS3KnowledgeStorage } from '../server/platform/s3KnowledgeStorage.ts';
import { requiredKnowledgeQuarantineBucketPolicy,hasRequiredKnowledgeQuarantineBucketPolicy } from '../server/platform/s3KnowledgeQuarantinePolicy.ts';
import { prepareKnowledgeUploadForm } from '../server/ai/railwayKnowledgeUploadForm.ts';
import { parseKnowledgeUploadPayload } from '../server/ai/knowledgeUploadRequest.ts';
import { normalizeRailwayApiJson } from '../server/platform/railwayApiContract.ts';
const versionId='s3-integration-version-1';
async function setup(options={}) {
  const f=await knowledgeFixture(),requests=[];let tags=0;
  const client={async send(cmd){
    requests.push(cmd);const name=cmd.constructor.name;
    if(name==='GetBucketPolicyCommand')return{$metadata:{httpStatusCode:200},Policy:JSON.stringify(requiredKnowledgeQuarantineBucketPolicy(f.config))};
    if(name==='PutObjectCommand')return{...s3Reply(cmd),ChecksumSHA256:Buffer.from(f.intent.contentSha256,'hex').toString('base64'),...(options.put??{})};
    if(name==='GetObjectTaggingCommand'){tags++;return{$metadata:{httpStatusCode:200},VersionId:versionId,TagSet:[{Key:'GuardDutyMalwareScanStatus',Value:tags>1?(options.lastTag??'NO_THREATS_FOUND'):(options.tag??'NO_THREATS_FOUND')}],...(options.tags??{})};}
    if(name==='ListObjectVersionsCommand')return{$metadata:{httpStatusCode:200},Name:f.config.bucket,Prefix:f.intent.objectKey,MaxKeys:2,IsTruncated:false,Versions:[{Key:f.intent.objectKey,Size:f.bytes.length,VersionId:versionId}],...(options.list??{})};
    if(name==='GetObjectCommand')return{$metadata:{httpStatusCode:200},VersionId:versionId,ContentLength:f.bytes.length,
      ChecksumSHA256:Buffer.from(f.intent.contentSha256,'hex').toString('base64'),ServerSideEncryption:'aws:kms',SSEKMSKeyId:f.config.kmsKeyArn,
      ContentType:'application/octet-stream',ContentDisposition:'attachment',CacheControl:'no-store',Metadata:{'connect-tenant':String(f.intent.tenantId),'connect-source':f.intent.sourceKey,'connect-content-sha256':f.intent.contentSha256,'connect-media-type':f.intent.mediaType},
      Body:{transformToWebStream(){return new ReadableStream({start(c){c.enqueue(options.bytes??f.bytes);c.close()}})}},...(options.get??{})};
    return s3Reply(cmd);
  }};
  return{...f,requests,storage:createS3KnowledgeStorage(f.config,{client,timeoutMs:100}),authorize:async()=>{}};
}
test('Knowledge private PUT is create-only, checksum/KMS/owner bound and returns explicit version',async()=>{
  const f=await setup();assert.equal(await f.storage.put(f.intent,f.bytes,f.authorize),versionId);
  const i=f.requests.find(r=>r.constructor.name==='PutObjectCommand').input;
  assert.equal(i.IfNoneMatch,'*');assert.equal(i.ExpectedBucketOwner,f.config.accountId);assert.equal(i.Key,f.intent.objectKey);assert.equal(i.ContentType,'application/octet-stream');assert.equal(i.Tagging,undefined);
  assert.equal(i.ChecksumSHA256,Buffer.from(f.intent.contentSha256,'hex').toString('base64'));
});
test('Knowledge rejects tenant/hash tampering before upload and ambiguous PUT replies never become receipts',async()=>{
  for(const altered of ['tenant','hash']){const f=await setup();await assert.rejects(f.storage.put({...f.intent,...(altered==='tenant'?{tenantId:8}:{contentSha256:'0'.repeat(64)})},f.bytes,f.authorize));assert.equal(f.requests.length,0);}
  for(const put of [{VersionId:'null'},{VersionId:undefined},{ChecksumSHA256:'invalid'},{ServerSideEncryption:'AES256'}]){
    const f=await setup({put});await assert.rejects(f.storage.put(f.intent,f.bytes,f.authorize),{code:'UNKNOWN'});
  }
});
test('Knowledge S3 policy requires scanner-only tags and blocks unscanned reads for its own prefix',async()=>{
  const f=await setup(),policy=requiredKnowledgeQuarantineBucketPolicy(f.config);
  assert.equal(hasRequiredKnowledgeQuarantineBucketPolicy(JSON.stringify(policy),f.config),true);
  for(let i=0;i<policy.Statement.length;i++)assert.equal(hasRequiredKnowledgeQuarantineBucketPolicy(JSON.stringify({...policy,Statement:policy.Statement.filter((_,n)=>n!==i)}),f.config),false);
  assert.ok(policy.Statement.some(s=>String(s.Resource).includes('/quarantine/knowledge/v1/*')));
});
test('Knowledge never reads body for missing, foreign-version or nonclean scan evidence',async()=>{
  for(const options of [{tag:'THREATS_FOUND'},{tag:'FAILED'},{tags:{TagSet:[]}},{tags:{VersionId:'foreign-version'}},{tag:'UNKNOWN'}]){
    const f=await setup(options);await assert.rejects(f.storage.read(f.intent,versionId,f.authorize));assert.equal(f.requests.filter(r=>r.constructor.name==='GetObjectCommand').length,0);
  }
});
test('Knowledge accepts only exact version metadata/hash and checks scan again after streaming',async()=>{
  const clean=await setup();assert.deepEqual(await clean.storage.read(clean.intent,versionId,clean.authorize),clean.bytes);
  for(const options of [{get:{VersionId:'foreign-version'}},{get:{Metadata:{}}},{get:{ContentRange:'bytes 0-3/4'}},{get:{ContentEncoding:'gzip'}},{bytes:new Uint8Array([0])},{lastTag:'THREATS_FOUND'}]){
    const f=await setup(options);await assert.rejects(f.storage.read(f.intent,versionId,f.authorize));
  }
});
test('Knowledge lost-upload recovery rejects ambiguous/deleted inventories and uses explicit version tags',async()=>{
  for(const list of [{IsTruncated:true},{DeleteMarkers:[{}]},{Versions:[{},{}]}]){
    const f=await setup({list});await assert.rejects(f.storage.inspect(f.intent,null,f.authorize));
  }
  const f=await setup();assert.deepEqual(await f.storage.inspect(f.intent,null,f.authorize),{versionId,verdict:'NO_THREATS_FOUND'});
  assert.equal(f.requests.at(-1).input.VersionId,versionId);
});
test('Knowledge bounded form relay keeps all segments within existing API contract and validates actual bytes',async()=>{
  const f=await setup();const data=new FormData();data.set('file',new File([f.bytes],'מדיניות-שירות.txt',{type:'text/plain'}));
  assert.deepEqual(await prepareKnowledgeUploadForm(data),f.payload);
  const maximum=new FormData();maximum.set('file',new File([Buffer.alloc(131072,65)],'מדיניות-שירות.txt',{type:'text/plain'}));
  const payload=await prepareKnowledgeUploadForm(maximum);assert.doesNotThrow(()=>normalizeRailwayApiJson(payload));assert.ok(Buffer.byteLength(JSON.stringify(payload))<262144);
  for(const input of [{...f.payload,tenantId:8},{...f.payload,mediaType:'application/pdf'},{...f.payload,segments:['Zh==']},{...f.payload,segments:['']},{...f.payload,fileName:'../\u0000'}])assert.throws(()=>parseKnowledgeUploadPayload(input));
  const tooLarge=new FormData();tooLarge.set('file',new File([Buffer.alloc(131073)],'מדיניות-שירות.txt',{type:'text/plain'}));await assert.rejects(prepareKnowledgeUploadForm(tooLarge));
});

import { requireKnowledgeConfiguration } from '../server/platform/s3KnowledgeConfiguration.ts';
import { readRailwayBullMqWorkerEnvironment } from '../server/platform/railwayBullMqWorkerMain.ts';
test('Knowledge startup is explicitly enabled and the real worker entry point forwards complete storage settings',async()=>{
  const {config}=await knowledgeFixture();assert.equal(requireKnowledgeConfiguration({}),null);
  for(const env of [{KNOWLEDGE_ENABLED:'true'},{KNOWLEDGE_ENABLED:'1'},{KNOWLEDGE_ENABLED:'TRUE'}])assert.throws(()=>requireKnowledgeConfiguration(env));
  const env={KNOWLEDGE_ENABLED:'true',KNOWLEDGE_S3_REGION:config.region,KNOWLEDGE_S3_BUCKET:config.bucket,KNOWLEDGE_S3_ACCOUNT_ID:config.accountId,
    KNOWLEDGE_S3_KMS_KEY_ARN:config.kmsKeyArn,KNOWLEDGE_S3_SCANNER_ROLE_ARN:config.scannerRoleArn};assert.deepEqual(requireKnowledgeConfiguration(env),config);
  const previous=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
  try{Object.assign(process.env,env);const captured=readRailwayBullMqWorkerEnvironment();for(const [k,v]of Object.entries(env))assert.equal(captured[k],v);}
  finally{for(const[k,v]of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
