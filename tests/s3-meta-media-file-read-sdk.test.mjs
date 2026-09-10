import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { S3Client } from '@aws-sdk/client-s3';
import { createS3MetaMediaFileReader } from '../server/platform/s3MetaMediaFileReader.ts';
import { MetaMediaFileReadError } from '../server/meta/metaMediaFileRead.ts';
import { metaMediaQuarantineS3ClientConfiguration } from '../server/platform/s3MetaMediaQuarantineStorage.ts';
import { quarantineEnvironment, quarantineConfig } from './fixtures/meta-media-quarantine.mjs';
import { inspectionIntent } from './fixtures/meta-media-inspection.mjs';
import { wireInspectionReply } from './fixtures/meta-media-s3-wire.mjs';
import { mediaBytes } from './fixtures/meta-media.mjs';

const versionId = 'wire-version+/=';
async function run(options={}) {
  const requests=[],observations=[],intent=inspectionIntent(); let revoked=false;
  const client=new S3Client({...metaMediaQuarantineS3ClientConfiguration(quarantineConfig),credentials:async()=>{
    if(options.revokeAt===requests.length)revoked=true;
    return {accessKeyId:'integration-access-key',secretAccessKey:'integration-signing-key',
      ...(options.revokeAt?{expiration:new Date(Date.now()+1000)}:{})};
  },requestHandler:{async handle(request){
    requests.push(request);
    if(request.method==='GET'&&Object.hasOwn(request.query,'versionId')&&!Object.hasOwn(request.query,'tagging')) {
      const reply=wireInspectionReply({...request,method:'HEAD'},intent,{});
      reply.response.body=Readable.from([mediaBytes.slice()]);
      if(options.status) { reply.response.statusCode=options.status; reply.response.body=Readable.from(['<Error><Code>Rejected</Code><Message>private-provider</Message></Error>']); }
      if(options.corrupt) { const wrong=mediaBytes.slice();wrong[0]^=1;reply.response.body=Readable.from([wrong]); }
      return reply;
    }
    return wireInspectionReply(request,intent,{});
  }}});
  const reader=createS3MetaMediaFileReader(quarantineEnvironment,{client});
  try {
    const bytes=await reader.read(intent,versionId,async()=>{if(revoked)throw new MetaMediaFileReadError('ACCESS_DENIED');},async observation=>{observations.push(observation);});
    return {bytes,requests,observations};
  } catch(error) { return {error,requests,observations}; }
  finally { reader.close();client.destroy(); }
}
test('actual SDK file read signs only exact-version GETs, validates a streamed body, and emits no random invocation ID',async()=>{
  const r=await run();assert.equal(r.error,undefined);assert.deepEqual(r.bytes,mediaBytes);assert.equal(r.requests.length,9);assert.equal(r.observations.length,1);
  for(const request of r.requests) {
    assert.equal(request.protocol,'https:');assert.equal(request.hostname,`${quarantineConfig.bucket}.s3.${quarantineConfig.region}.amazonaws.com`);
    assert.equal(request.method,'GET');assert.equal(request.headers['x-amz-expected-bucket-owner'],quarantineConfig.accountId);
    assert.match(request.headers.authorization,/^AWS4-HMAC-SHA256 /);assert.equal(request.headers['amz-sdk-invocation-id'],undefined);
    assert.equal(request.headers.range,undefined);
  }
  for(const request of r.requests.slice(6))assert.equal(request.query.versionId,versionId);
  assert.equal(r.requests[7].headers['x-amz-checksum-mode'],'ENABLED');assert.equal(r.requests[7].headers['x-amz-server-side-encryption'],undefined);
  r.bytes.fill(0);
});
test('actual SDK file read repeats authorization after credential waits before tags, bytes and final tags',async()=>{
  for(const revokeAt of [6,7,8]) { const r=await run({revokeAt});assert.equal(r.error?.code,'ACCESS_DENIED');assert.equal(r.requests.length,revokeAt);assert.equal(r.bytes,undefined); }
});
test('actual SDK file read cannot retry denied, missing, redirect or server-error object responses',async()=>{
  for(const status of [403,404,301,500]) { const r=await run({status});assert.equal(r.error?.code,'DEPENDENCY_UNAVAILABLE');assert.equal(r.requests.length,8);assert.equal(r.bytes,undefined);assert.doesNotMatch(r.error.message,/private-provider/); }
});
test('actual SDK file read rejects a corrupt stream even when response headers advertise the expected checksum',async()=>{
  const r=await run({corrupt:true});assert.ok(['DEPENDENCY_UNAVAILABLE','CONTENT_MISMATCH'].includes(r.error?.code));
  assert.equal(r.bytes,undefined);assert.equal(r.requests.length,8);assert.deepEqual(r.observations,[]);
});
