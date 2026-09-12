import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createS3MetaMediaRetentionInspection } from '../server/platform/s3MetaMediaRetentionInspection.ts';
import { inspectMetaMediaRetentionPolicy, createMetaMediaRetention } from '../server/operations/metaMediaRetention.ts';
import { inspectionIntent, inspectionReply } from './fixtures/meta-media-inspection.mjs';
import { quarantineEnvironment } from './fixtures/meta-media-quarantine.mjs';
const intent=inspectionIntent(),versionId='s3-integration-version-1';
function fixture(reply=command=>inspectionReply(command,intent),options={}) {
  const calls=[]; const storage=createS3MetaMediaRetentionInspection(quarantineEnvironment,{client:{async send(command){calls.push(command);return reply(command);}},...options});
  return {calls,storage};
}
test('media retention has no implicit period, uses exact policy keys and supports age or closure',()=>{
  for(const value of [undefined,'{}',JSON.stringify({version:1,trigger:'tenant-closed',retainForDays:0}),JSON.stringify({version:1,trigger:'record-terminal',retainForDays:30}),JSON.stringify({version:1,trigger:'tenant-closed',retainForDays:30,extra:true})])
    assert.throws(()=>inspectMetaMediaRetentionPolicy({META_MEDIA_RETENTION_POLICY_JSON:value}),{code:'CONFIGURATION_REQUIRED'});
  for(const trigger of ['tenant-closed','record-created']) assert.deepEqual(inspectMetaMediaRetentionPolicy({META_MEDIA_RETENTION_POLICY_JSON:JSON.stringify({version:1,trigger,retainForDays:30})}),{version:1,trigger,retainForDays:30});
});
test('media retention metadata inspection binds exact version, tenant, source and encryption without bytes',async()=>{
  const f=fixture();try{await f.storage.verify(intent,versionId,async()=>{});assert.equal(f.calls.length,7);
    assert.deepEqual(f.calls.at(-1).input,{Bucket:intent.bucket,Key:intent.objectKey,VersionId:versionId,ExpectedBucketOwner:'123456789012'});
    assert.equal(f.calls.some(c=>/GetObjectCommand|DeleteObjectCommand|PutObjectCommand/.test(c.constructor.name)),false);
  }finally{f.storage.close();}
});
test('media retention rejects mismatched exact-version metadata and delete markers',async()=>{
  for(const change of [{VersionId:'different-version'},{DeleteMarker:true},{ContentLength:0},{SSEKMSKeyId:'different-key'},{Metadata:{'connect-tenant':'another-tenant'}},{$metadata:{httpStatusCode:404}}]){
    const f=fixture(c=>c.constructor.name==='HeadObjectCommand'?{...inspectionReply(c,intent),...change}:inspectionReply(c,intent));
    try{await assert.rejects(f.storage.verify(intent,versionId,async()=>{}),{code:'CONFLICT'});}finally{f.storage.close();}
  }
});
test('media retention refuses a missing, null or invalid version without accessing S3',async()=>{
  const f=fixture();try{for(const id of [undefined,null,'','null','a b'])await assert.rejects(f.storage.verify(intent,id,async()=>{}),{code:'CONFLICT'});assert.deepEqual(f.calls,[]);}finally{f.storage.close();}
});
test('media retention inventory paginates only the exact key and ignores delete markers and prefix neighbours',async()=>{
  let page=0;const f=fixture(c=>{
    if(c.constructor.name!=='ListObjectVersionsCommand')return inspectionReply(c,intent);
    page++;return {$metadata:{httpStatusCode:200},IsTruncated:page===1,NextKeyMarker:intent.objectKey,NextVersionIdMarker:versionId,
      Versions:[{Key:intent.objectKey,VersionId:page===1?versionId:'s3-integration-version-2',IsLatest:false},{Key:intent.objectKey+'-other',VersionId:'foreign'}],DeleteMarkers:[{Key:intent.objectKey,VersionId:'marker'}]};
  });try{assert.deepEqual(await f.storage.versions(intent,async()=>{}),[versionId,'s3-integration-version-2']);assert.equal(f.calls.at(-1).input.KeyMarker,intent.objectKey);assert.equal(f.calls.at(-1).input.VersionIdMarker,versionId);}finally{f.storage.close();}
});
test('media retention inventory rejects repeated or unbounded pagination instead of returning partial results',async()=>{
  const f=fixture(c=>c.constructor.name==='ListObjectVersionsCommand'?{$metadata:{httpStatusCode:200},IsTruncated:true,NextKeyMarker:intent.objectKey,NextVersionIdMarker:versionId,Versions:[]}:inspectionReply(c,intent));
  try{await assert.rejects(f.storage.versions(intent,async()=>{}),{code:'CONFLICT'});assert.equal(f.calls.filter(c=>c.constructor.name==='ListObjectVersionsCommand').length,2);}finally{f.storage.close();}
});
test('media retention authorization revoked after bucket checks prevents HEAD',async()=>{
  let revoked=false;const f=fixture(c=>{if(c.constructor.name==='GetBucketPolicyCommand')revoked=true;return inspectionReply(c,intent);});
  try{await assert.rejects(f.storage.verify(intent,versionId,async()=>{if(revoked)throw Error('revoked');}));assert.equal(f.calls.some(c=>c.constructor.name==='HeadObjectCommand'),false);}finally{f.storage.close();}
});
test('media retention blocks reuse while a timed-out storage request has not settled',async()=>{
  let release;const f=fixture(c=>c.constructor.name==='HeadObjectCommand'?new Promise(r=>{release=()=>r(inspectionReply(c,intent));}):inspectionReply(c,intent),{requestTimeoutMs:15});
  try{await assert.rejects(f.storage.verify(intent,versionId,async()=>{}));const count=f.calls.length;await assert.rejects(f.storage.versions(intent,async()=>{}));assert.equal(f.calls.length,count);release();await new Promise(r=>setImmediate(r));}finally{f.storage.close();}
});
test('media retention rejects malformed private targets before any database call',async()=>{
  const service=createMetaMediaRetention({transactions:{transaction(){assert.fail('invalid input reached database');}},environment:{}});
  await assert.rejects(service.status({tenantId:0,jobKey:'x'}),{code:'INVALID_INPUT'});
  await assert.rejects(service.review({tenantId:1,legalHold:false,expectedVersion:0},'not-a-digest'),{code:'INVALID_INPUT'});
});

test('media retention checks authorization after the real SDK credential provider and before transport',async()=>{
  const {S3Client}=await import('@aws-sdk/client-s3');let revoked=false,transports=0;
  const real=new S3Client({region:'us-east-1',maxAttempts:1,credentials:async()=>{revoked=true;return{accessKeyId:'integration-key',secretAccessKey:'integration-secret'};},
    requestHandler:{async handle(){transports++;assert.fail('revoked request reached transport');},destroy(){}}});
  const storage=createS3MetaMediaRetentionInspection(quarantineEnvironment,{client:{send(command,options){
    return command.constructor.name==='HeadObjectCommand'?real.send(command,options):Promise.resolve(inspectionReply(command,intent));
  }}});
  try{await assert.rejects(storage.verify(intent,versionId,async()=>{if(revoked)throw Error('revoked');}));assert.equal(revoked,true);assert.equal(transports,0);}finally{storage.close();real.destroy();}
});
