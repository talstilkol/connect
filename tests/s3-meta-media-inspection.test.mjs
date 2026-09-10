import assert from 'node:assert/strict';
import test from 'node:test';
import { createS3MetaMediaInspector } from '../server/platform/s3MetaMediaInspector.ts';
import { quarantineEnvironment as env, quarantineConfig as config } from './fixtures/meta-media-quarantine.mjs';
import { inspectionIntent, inspectionReply } from './fixtures/meta-media-inspection.mjs';

function fixture(options = {}) {
  const calls = [], intent = inspectionIntent(); let authorized = 0;
  const providerIntent = { ...intent };
  const inspector = createS3MetaMediaInspector(env, { requestTimeoutMs: options.timeout ?? 1000, client: {
    async send(command) { calls.push(command); return options.reply ? options.reply(command, calls, providerIntent) : inspectionReply(command, providerIntent); },
  } });
  const authorize = async () => { authorized++; if (options.authorize) await options.authorize(calls, authorized); };
  return { inspector, intent, calls, authorize, run: (version = null) => inspector.inspect(intent, version, authorize) };
}
const rejects = (promise, code) => assert.rejects(promise, (error) => { assert.equal(error.code, code); assert.doesNotMatch(error.message, /private-/); return true; });

test('reconciliation discovers one exact version and verifies clean tags, full content metadata and KMS without object bytes', async () => {
  const f = fixture(), observation = await f.run();
  assert.equal(observation.result, 'NO_THREATS_FOUND'); assert.equal(observation.receipt.state, 'quarantined');
  assert.equal(observation.receipt.objectKey, f.intent.objectKey); assert.equal(Object.hasOwn(observation.receipt, 'bytes'), false);
  assert.deepEqual(f.calls.slice(6).map((c) => c.constructor.name), ['ListObjectVersionsCommand','GetObjectTaggingCommand','HeadObjectCommand','GetObjectTaggingCommand']);
  assert.equal(f.calls[6].input.Prefix, f.intent.objectKey); assert.equal(f.calls[6].input.MaxKeys, 2);
  for (const c of f.calls) { assert.equal(c.input.Bucket, config.bucket); assert.equal(c.input.ExpectedBucketOwner, config.accountId); }
  for (const c of f.calls.slice(7)) { assert.equal(c.input.VersionId, observation.versionId); assert.equal(c.input.Key, f.intent.objectKey); }
  assert.equal(f.calls[8].input.ChecksumMode, 'ENABLED'); assert.equal(f.calls[8].input.ServerSideEncryption, undefined);
});
test('known receipt inspects its exact version without listing or selecting the latest object', async () => {
  const f = fixture(); assert.equal((await f.run('s3-integration-version-1')).result, 'NO_THREATS_FOUND');
  assert.equal(f.calls.length, 9); assert.equal(f.calls.some((c) => c.constructor.name === 'ListObjectVersionsCommand'), false);
});
test('pending, threats, unsupported, access denied and failed scans never invoke HEAD or emit a receipt', async () => {
  for (const result of ['PENDING','THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED']) {
    const f = fixture({ reply: (c, _calls, intent) => inspectionReply(c, intent, result) });
    assert.deepEqual(await f.run(), { versionId: 's3-integration-version-1', result, receipt: null });
    assert.equal(f.calls.length, 8); assert.equal(f.calls.some((c) => c.constructor.name === 'HeadObjectCommand'), false);
  }
});
test('empty version inventory means missing without a retry, write or claimed scan result', async () => {
  const f = fixture({ reply(c) { const r = inspectionReply(c); if (c.constructor.name === 'ListObjectVersionsCommand') r.Versions = []; return r; } });
  assert.equal(await f.run(), null); assert.equal(f.calls.length, 7);
});
test('truncated inventory, multiple versions, delete markers and mismatching listing scope are unresolved', async () => {
  for (const change of [{IsTruncated:true},{IsTruncated:undefined},{Name:'foreign-bucket'},{Prefix:'foreign-key'},{MaxKeys:1000},
    {DeleteMarkers:[{VersionId:'deleted-version'}]},{Versions:[{VersionId:'a'},{VersionId:'b'}]}]) {
    const f = fixture({reply(c) {const r=inspectionReply(c);return c.constructor.name==='ListObjectVersionsCommand'?{...r,...change}:r;}});
    await rejects(f.run(),'OUTCOME_UNKNOWN');assert.equal(f.calls.length,7);
  }
});
test('foreign, unversioned or wrong-sized candidate fails before reading its tags', async () => {
  for(const change of [{Key:'foreign-key'},{Size:1},{VersionId:'null'},{VersionId:'bad\nversion'}]) {
    const f=fixture({reply(c){const r=inspectionReply(c);if(c.constructor.name==='ListObjectVersionsCommand')Object.assign(r.Versions[0],change);return r;}});
    await rejects(f.run(),'CONTENT_MISMATCH');assert.equal(f.calls.length,7);
  }
});
test('duplicate, unknown, malformed or foreign-version tag responses cannot approve HEAD', async () => {
  for(const change of [{TagSet:undefined},{TagSet:[{Key:'GuardDutyMalwareScanStatus',Value:'PENDING'}]},
    {TagSet:[{Key:'GuardDutyMalwareScanStatus',Value:'CLEAN'}]}, {TagSet:[{Key:'x'}]},
    {TagSet:[{Key:'GuardDutyMalwareScanStatus',Value:'NO_THREATS_FOUND'},{Key:'GuardDutyMalwareScanStatus',Value:'THREATS_FOUND'}]}, {VersionId:'foreign-version'}]) {
    const f=fixture({reply(c){const r=inspectionReply(c);return c.constructor.name==='GetObjectTaggingCommand'?{...r,...change}:r;}});
    await rejects(f.run(),'OUTCOME_UNKNOWN');assert.equal(f.calls.some(c=>c.constructor.name==='HeadObjectCommand'),false);
  }
});
test('HEAD must prove the exact version, full checksum, size, KMS and original metadata', async () => {
  const head=inspectionReply({constructor:{name:'HeadObjectCommand'}});
  for(const change of [{VersionId:'foreign-version'},{DeleteMarker:true},{ContentLength:1},{ChecksumSHA256:undefined},
    {ChecksumSHA256:'wrong'},{ChecksumType:'COMPOSITE'},{PartsCount:1},{ServerSideEncryption:'AES256'},
    {SSEKMSKeyId:'foreign-key'},{ContentType:'image/png'},{ContentDisposition:'inline'},{CacheControl:'public'},
    {MissingMeta:1},{Metadata:undefined},{Metadata:{...head.Metadata,'connect-source-sha256':'0'.repeat(64)}},{Metadata:{...head.Metadata,extra:'private-field'}}]) {
    const f=fixture({reply(c){const r=inspectionReply(c);return c.constructor.name==='HeadObjectCommand'?{...r,...change}:r;}});
    await rejects(f.run(),'CONTENT_MISMATCH');assert.equal(f.calls.length,9);
  }
});
test('a verdict changed during HEAD is returned as the new blocking observation without recovery receipt', async () => {
  for(const verdict of ['PENDING','THREATS_FOUND','FAILED']) {
    let tags=0;const f=fixture({reply(c){return inspectionReply(c,inspectionIntent(),c.constructor.name==='GetObjectTaggingCommand'&&++tags===2?verdict:'NO_THREATS_FOUND');}});
    assert.deepEqual(await f.run(),{versionId:'s3-integration-version-1',result:verdict,receipt:null});
  }
});
test('weak bucket policy fails before any version, tag or object inspection', async () => {
  const f=fixture({reply(c){const r=inspectionReply(c);if(c.constructor.name==='GetBucketPolicyCommand')r.Policy='{}';return r;}});
  await rejects(f.run(),'UNSAFE_BUCKET');assert.equal(f.calls.length,6);
});
test('target mismatch, invalid version or intent and unknown configuration options perform zero requests', async () => {
  const f=fixture();for(const intent of [{...f.intent,bucket:'different-bucket'},{...f.intent,kmsKeyArn:config.kmsKeyArn.replace('12345678','22345678')}])await rejects(f.inspector.inspect(intent,null,f.authorize),'INVALID_INPUT');
  for(const version of ['null','','v\n'])await rejects(f.run(version),'INVALID_INPUT');assert.equal(f.calls.length,0);
  for(const options of [{requestTimeoutMs:0},{endpoint:'http://localhost'}])assert.throws(()=>createS3MetaMediaInspector(env,options),{code:'CONFIGURATION_INVALID'});
});
test('403, 404, 5xx and redirects are not absence proof and never trigger automatic retries', async () => {
  for(const status of [403,404,500,301]) {
    const f=fixture({reply(c){if(c.constructor.name==='ListObjectVersionsCommand')throw Object.assign(new Error('private-provider'),{$metadata:{httpStatusCode:status}});return inspectionReply(c);}});
    await rejects(f.run(),'DEPENDENCY_UNAVAILABLE');assert.equal(f.calls.length,7);
  }
});
test('revocation before and after preflight blocks all subsequent object operations', async () => {
  for(const before of [true,false]) {
    const f=fixture({authorize(calls){if(before||calls.length===6)throw new Error('private-revocation');}});
    await rejects(f.run(),'AUTHORIZATION_CHANGED');assert.equal(f.calls.length,before?0:6);
  }
});
test('timeout bounds inspection and releases its single active slot', async () => {
  let first=true;const f=fixture({timeout:15,reply(c){if(c.constructor.name==='ListObjectVersionsCommand'&&first){first=false;return new Promise(()=>{});}return inspectionReply(c);}});
  const pending=f.run();await rejects(f.run(),'IN_PROGRESS');await rejects(pending,'DEPENDENCY_UNAVAILABLE');
  assert.equal((await f.run()).result,'NO_THREATS_FOUND');
});
test('input intent is snapshotted before awaiting authorization', async () => {
  const f=fixture({authorize(_calls,n){if(n===1)f.intent.objectKey='changed-during-await';}});
  const result=await f.run();assert.equal(result.receipt.objectKey,inspectionIntent().objectKey);
});
