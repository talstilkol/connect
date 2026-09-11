import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { S3Client } from '@aws-sdk/client-s3';
import { knowledgeFixture } from './fixtures/knowledge-ingestion.mjs';
import { wireInspectionReply } from './fixtures/meta-media-s3-wire.mjs';
import { inspectionIntent } from './fixtures/meta-media-inspection.mjs';
import { createS3KnowledgeStorage } from '../server/platform/s3KnowledgeStorage.ts';
import { metaMediaQuarantineS3ClientConfiguration } from '../server/platform/s3MetaMediaQuarantineStorage.ts';
import { requiredKnowledgeQuarantineBucketPolicy } from '../server/platform/s3KnowledgeQuarantinePolicy.ts';
import { KnowledgeIngestionError } from '../server/ai/knowledgeUploadRequest.ts';
const versionId='wire-version+/=';
async function run(options={}) {
  const f=await knowledgeFixture(),requests=[];let revoked=false;
  const client=new S3Client({...metaMediaQuarantineS3ClientConfiguration(f.config),credentials:async()=>{
    if(options.revokeAt===requests.length)revoked=true;
    return {accessKeyId:'integration-access-key',secretAccessKey:'integration-signing-key',...(options.revokeAt?{expiration:new Date(Date.now()+1000)}:{})};
  },requestHandler:{async handle(request){
    requests.push(request);
    if(request.method==='PUT')return{response:{statusCode:200,headers:{'x-amz-version-id':versionId,'x-amz-checksum-sha256':Buffer.from(f.intent.contentSha256,'hex').toString('base64'),
      'x-amz-server-side-encryption':'aws:kms','x-amz-server-side-encryption-aws-kms-key-id':f.config.kmsKeyArn},body:new Uint8Array()}};
    if(Object.hasOwn(request.query,'policy'))return{response:{statusCode:200,headers:{'content-type':'application/json'},body:new TextEncoder().encode(JSON.stringify(requiredKnowledgeQuarantineBucketPolicy(f.config)))}};
    if(request.method==='GET'&&Object.hasOwn(request.query,'versionId')&&!Object.hasOwn(request.query,'tagging'))return{response:{statusCode:200,headers:{
      'x-amz-version-id':versionId,'x-amz-checksum-sha256':Buffer.from(f.intent.contentSha256,'hex').toString('base64'),'content-length':String(f.bytes.length),
      'x-amz-server-side-encryption':'aws:kms','x-amz-server-side-encryption-aws-kms-key-id':f.config.kmsKeyArn,'content-type':'application/octet-stream',
      'content-disposition':'attachment','cache-control':'no-store','x-amz-meta-connect-tenant':String(f.intent.tenantId),'x-amz-meta-connect-source':f.intent.sourceKey,
      'x-amz-meta-connect-content-sha256':f.intent.contentSha256,'x-amz-meta-connect-media-type':f.intent.mediaType},body:Readable.from([f.bytes.slice()])}};
    return wireInspectionReply(request,inspectionIntent(),{});
  }}});
  const storage=createS3KnowledgeStorage(f.config,{client});
  const authorize=async()=>{if(revoked)throw new KnowledgeIngestionError('AUTHORIZATION_DENIED')};
  try { const result=options.put?await storage.put(f.intent,f.bytes,authorize):await storage.read(f.intent,versionId,authorize);return{result,requests,fixture:f}; }
  catch(error){return{error,requests};}finally{storage.close();client.destroy();}
}
test('real AWS SDK signs conditional Knowledge PUT with checksum/owner/KMS and no generated invocation ID',async()=>{
  const r=await run({put:true});assert.equal(r.error,undefined);assert.equal(r.result,versionId);assert.equal(r.requests.length,7);
  const put=r.requests.at(-1);assert.equal(put.method,'PUT');assert.equal(put.headers['if-none-match'],'*');assert.equal(put.headers['x-amz-checksum-sha256'],Buffer.from(r.fixture.intent.contentSha256,'hex').toString('base64'));
  for(const q of r.requests){assert.match(q.headers.authorization,/^AWS4-HMAC-SHA256 /);assert.equal(q.headers['amz-sdk-invocation-id'],undefined);assert.equal(q.headers['x-amz-expected-bucket-owner'],r.fixture.config.accountId);}
});
test('real AWS SDK reads only explicit Knowledge object version and verifies the streamed body',async()=>{
  const r=await run();assert.equal(r.error,undefined);assert.deepEqual(r.result,r.fixture.bytes);assert.equal(r.requests.length,9);
  for(const q of r.requests.slice(6)){assert.equal(q.query.versionId,versionId);assert.equal(q.method,'GET');assert.equal(q.headers['amz-sdk-invocation-id'],undefined);}
});
test('real AWS SDK rechecks authority after credentials/signing before PUT, tags, body and final tag',async()=>{
  for(const options of [{put:true,revokeAt:6},{revokeAt:6},{revokeAt:7},{revokeAt:8}]){
    const r=await run(options);assert.ok(r.error);assert.equal(r.requests.length,options.revokeAt);assert.equal(r.result,undefined);
  }
});
