import assert from 'node:assert/strict';
import test from 'node:test';
import { S3Client } from '@aws-sdk/client-s3';
import { createS3MetaMediaInspector } from '../server/platform/s3MetaMediaInspector.ts';
import { metaMediaQuarantineS3ClientConfiguration } from '../server/platform/s3MetaMediaQuarantineStorage.ts';
import { quarantineEnvironment as env, quarantineConfig as config } from './fixtures/meta-media-quarantine.mjs';
import { inspectionIntent } from './fixtures/meta-media-inspection.mjs';
import { wireInspectionReply as wireReply } from './fixtures/meta-media-s3-wire.mjs';

const versionId='wire-version+/=';
async function run(options={}){
  const requests=[],intent=inspectionIntent();let revoked=false;
  const client=new S3Client({...metaMediaQuarantineS3ClientConfiguration(config),credentials:async()=>{
    if(options.revokeAt===requests.length)revoked=true;
    return{accessKeyId:'integration-access-key',secretAccessKey:'integration-signing-key',...(options.revokeAt?{expiration:new Date(Date.now()+1000)}:{})};
  },requestHandler:{async handle(request){requests.push(request);return wireReply(request,intent,options);}}});
  const inspector=createS3MetaMediaInspector(env,{client});
  try{return{result:await inspector.inspect(intent,null,async()=>{if(revoked)throw new Error('private-revocation');}),requests};}
  catch(error){return{error,requests};}finally{client.destroy();}
}
test('actual SDK signs version-bound tag GETs and checksum HEAD without retrieving bytes, random invocation IDs or writes',async()=>{
  const r=await run();assert.equal(r.error,undefined);assert.equal(r.result.receipt.versionId,versionId);assert.equal(r.requests.length,10);
  for(const request of r.requests){assert.equal(request.protocol,'https:');assert.equal(request.hostname,`${config.bucket}.s3.${config.region}.amazonaws.com`);
    assert.equal(request.headers['x-amz-expected-bucket-owner'],config.accountId);assert.match(request.headers.authorization,/^AWS4-HMAC-SHA256 /);
    assert.equal(request.headers['amz-sdk-invocation-id'],undefined);assert.ok(['GET','HEAD'].includes(request.method));}
  const objectRequests=r.requests.filter(q=>q.method==='HEAD'||'tagging'in q.query);assert.equal(objectRequests.length,3);
  for(const request of objectRequests)assert.equal(request.query.versionId,versionId);
  const head=objectRequests.find(q=>q.method==='HEAD');assert.equal(head.headers['x-amz-checksum-mode'],'ENABLED');assert.equal(head.headers['x-amz-server-side-encryption'],undefined);
});
test('actual SDK inspection rechecks authorization after AWS credential waits before version listing and HEAD',async()=>{
  for(const revokeAt of [6,8]){const r=await run({revokeAt});assert.equal(r.error?.code,'AUTHORIZATION_CHANGED');assert.equal(r.requests.length,revokeAt);}
});
test('actual SDK treats missing or denied inventory and redirects as unresolved without retry',async()=>{
  for(const listStatus of [403,404,500,301]){const r=await run({listStatus});assert.equal(r.error?.code,'DEPENDENCY_UNAVAILABLE');assert.equal(r.requests.length,7);}
});
test('actual SDK cannot turn metadata for a different version into a recovered receipt',async()=>{
  const r=await run({foreignHead:true});assert.equal(r.error?.code,'CONTENT_MISMATCH');assert.equal(r.requests.length,9);
});
