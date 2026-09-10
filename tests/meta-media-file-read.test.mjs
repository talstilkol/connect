import assert from 'node:assert/strict';
import test from 'node:test';
import { createMetaMediaFileReadService, MetaMediaFileReadError } from '../server/meta/metaMediaFileRead.ts';
import { createS3MetaMediaFileReader } from '../server/platform/s3MetaMediaFileReader.ts';
import { mediaFileJob, mediaFileReply, mediaFileVersion } from './fixtures/meta-media-file-read.mjs';
import { quarantineEnvironment } from './fixtures/meta-media-quarantine.mjs';
import { mediaBytes } from './fixtures/meta-media.mjs';

async function fixture(options = {}) {
  const job = await mediaFileJob(), calls = [], observations = [];
  const session = { tenantId: job.intent.tenantId, externalUserId: job.intent.actor, role: 'viewer', status: 'active', displayName: 'Scan integration' };
  let authorizations = 0, consumed = false;
  const authorization = { async authorize(s, key) {
    authorizations++; assert.equal(s.tenantId, session.tenantId); assert.equal(key, job.intent.messageKey);
    return options.authorize ? options.authorize(job, calls, authorizations, observations) : job;
  } };
  const reader = options.reader ?? createS3MetaMediaFileReader(quarantineEnvironment, { requestTimeoutMs: options.timeout ?? 30000, client: { async send(command, context) {
    calls.push(command);
    return options.reply ? options.reply(command, calls, context) : mediaFileReply(command);
  } } });
  const service = createMetaMediaFileReadService({ authorization, reader, scans: { async record(j, observation) {
    assert.equal(j.intent.actor, job.intent.actor); observations.push(observation);
    return options.record ? options.record(observation) : observation.result === 'NO_THREATS_FOUND' ? 'clean-observed' : 'blocked';
  } } });
  return { job, calls, observations, session, reader, service,
    get consumed() { return consumed; }, get authorizations() { return authorizations; },
    run: (consume = async file => { assert.deepEqual(file.bytes, mediaBytes); return file.sizeBytes; }) => service.withFile(session, job.intent.messageKey, async file => {
      consumed = true; return consume(file);
    }) };
}
const rejects = (promise, code) => assert.rejects(promise, error => { assert.equal(error.code, code); assert.doesNotMatch(error.message, /private-provider|private-database/); return true; });

test('media file releases only fully verified bytes to a bounded consumer, then clears its buffer', async () => {
  const f = await fixture(); let borrowed;
  assert.equal(await f.run(async file => {
    assert.deepEqual(Object.keys(file).sort(), ['bytes','cacheControl','contentDisposition','contentType','sizeBytes']);
    assert.deepEqual(file.bytes, mediaBytes); assert.equal(file.contentType, 'application/octet-stream');
    assert.equal(file.contentDisposition, 'attachment'); assert.equal(file.cacheControl, 'private, no-store');
    borrowed = file.bytes; return file.sizeBytes;
  }), mediaBytes.length);
  assert.ok(borrowed.every(value => value === 0)); assert.equal(f.observations.length, 1); assert.equal(f.observations[0].result, 'NO_THREATS_FOUND');
  assert.deepEqual(f.calls.slice(6).map(c => c.constructor.name), ['GetObjectTaggingCommand','GetObjectCommand','GetObjectTaggingCommand']);
  for (const command of f.calls.slice(6)) { assert.equal(command.input.VersionId, mediaFileVersion); assert.equal(command.input.Key, f.job.intent.objectKey); }
  assert.equal(f.calls[7].input.ChecksumMode, 'ENABLED'); assert.equal(f.calls[7].input.Range, undefined);
});
test('media file rejects missing and every blocking initial scan tag before GET and retains the observation', async () => {
  for (const scan of ['PENDING','THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED']) {
    const f = await fixture({ reply: command => mediaFileReply(command, undefined, undefined, { scan }) });
    await rejects(f.run(), 'NOT_READY'); assert.equal(f.consumed, false); assert.equal(f.calls.length, 7);
    assert.equal(f.observations[0].result, scan); assert.equal(f.observations[0].receipt, null);
  }
});
test('media file withholds downloaded bytes when the final tag changes or disappears', async () => {
  for (const scan of ['PENDING','THREATS_FOUND','UNSUPPORTED','ACCESS_DENIED','FAILED']) {
    const f = await fixture({ reply: (command, calls) => mediaFileReply(command, undefined, undefined, { scan: calls.length === 9 ? scan : 'NO_THREATS_FOUND' }) });
    await rejects(f.run(), 'NOT_READY'); assert.equal(f.consumed, false); assert.equal(f.calls.length, 9); assert.equal(f.observations[0].result, scan);
  }
});
test('media file rejects malformed scan metadata without inventing a durable provider verdict', async () => {
  for (const change of [{ VersionId: 'null' }, { VersionId: 'different-version' }, { TagSet: [{ Key: 'GuardDutyMalwareScanStatus', Value: 'UNKNOWN' }] },
    { TagSet: [{ Key: 'GuardDutyMalwareScanStatus', Value: 'PENDING' }] }, { TagSet: [{ Key:'same',Value:'one' },{ Key:'same',Value:'two' }] }]) {
    const f = await fixture({ reply: command => ({ ...mediaFileReply(command), ...(command.constructor.name === 'GetObjectTaggingCommand' ? change : {}) }) });
    await rejects(f.run(), 'NOT_READY'); assert.equal(f.calls.length, 7); assert.deepEqual(f.observations, []);
  }
});
test('media file rejects changed version, checksum, identity, encryption and unsafe response metadata', async () => {
  for (const metadata of [{ VersionId:'different-version' }, { ChecksumSHA256:'mismatch' }, { ChecksumType:'COMPOSITE' }, { Metadata:{} },
    { ContentLength:mediaBytes.length+1 }, { ContentType:'text/html' }, { ContentDisposition:'inline' }, { CacheControl:'public' },
    { ServerSideEncryption:'AES256' }, { DeleteMarker:true }, { ContentRange:'bytes 0-1/2' }, { ContentEncoding:'gzip' },
    { WebsiteRedirectLocation:'https://outside.invalid' }, { PartsCount:2 }, { MissingMeta:1 }]) {
    const f = await fixture({ reply: command => mediaFileReply(command, undefined, undefined, { metadata }) });
    await rejects(f.run(), 'CONTENT_MISMATCH'); assert.equal(f.consumed, false); assert.equal(f.calls.length, 8);
  }
});
test('media file checks actual bytes independently of advertised SHA-256 and content length', async () => {
  const wrong = mediaBytes.slice(); wrong[0] ^= 1;
  for (const data of [mediaBytes.slice(1), new Uint8Array(mediaBytes.length+1), wrong]) {
    const stream = new ReadableStream({ start(c) { c.enqueue(data); c.close(); } });
    const f = await fixture({ reply: command => mediaFileReply(command, undefined, undefined, { stream }) });
    await rejects(f.run(), 'CONTENT_MISMATCH'); assert.equal(f.consumed, false); assert.deepEqual(f.observations, []);
  }
});
test('media file fails closed on a stalled body, cancels it and remains reusable', async () => {
  let cancelled = 0, stall = true;
  const f = await fixture({ timeout: 20, reply: command => mediaFileReply(command, undefined, undefined,
    stall ? { stream: new ReadableStream({ cancel() { cancelled++; } }) } : {}) });
  await rejects(f.run(), 'DEPENDENCY_UNAVAILABLE'); assert.equal(cancelled, 1); assert.equal(f.consumed, false);
  stall = false; assert.equal(await f.run(), mediaBytes.length);
});
test('media file cancels a body whose headers arrive after the request deadline', async () => {
  let cancelled = 0, release;
  const delayed = new Promise(resolve => { release = resolve; });
  const f = await fixture({ timeout: 15, async reply(command) {
    if (command.constructor.name === 'GetObjectCommand') await delayed;
    return mediaFileReply(command, undefined, undefined, { stream: new ReadableStream({ cancel() { cancelled++; } }) });
  } });
  await rejects(f.run(), 'DEPENDENCY_UNAVAILABLE'); release(); await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(cancelled, 1); assert.equal(f.consumed, false); assert.deepEqual(f.observations, []);
});
test('media file cannot proceed after closing the reader or with a foreign storage target', async () => {
  const f = await fixture(); f.reader.close(); await rejects(f.run(), 'DEPENDENCY_UNAVAILABLE'); assert.deepEqual(f.calls, []);
  const reader = createS3MetaMediaFileReader(quarantineEnvironment, { client:{ async send() { assert.fail('No S3 call expected'); } } });
  for (const [intent, version] of [[{...f.job.intent,bucket:'foreign-bucket'},mediaFileVersion],[f.job.intent,'null']]) {
    await rejects(reader.read(intent, version, async()=>{}, async()=>{}), 'INVALID_INPUT');
  }
});
test('media file refuses unsafe bucket configuration before any object request', async () => {
  const f = await fixture({ reply: command => command.constructor.name === 'GetBucketVersioningCommand' ? { Status:'Suspended' } : mediaFileReply(command) });
  await rejects(f.run(), 'DEPENDENCY_UNAVAILABLE'); assert.equal(f.calls.length, 6); assert.equal(f.consumed, false);
});
test('media file authorization loss after preflight, GET and final scan never reaches the consumer', async () => {
  for (const limit of [6,8,9]) {
    const f = await fixture({ authorize(job,calls) { if(calls.length>=limit)throw new MetaMediaFileReadError('ACCESS_DENIED'); return job; } });
    await rejects(f.run(), 'ACCESS_DENIED'); assert.equal(f.calls.length, limit); assert.equal(f.consumed, false);
    assert.equal(f.observations.length, limit===9?1:0);
  }
});
test('media file preserves the final received blocking fact after concurrent viewer revocation', async () => {
  const f = await fixture({ reply: (command,calls)=>mediaFileReply(command,undefined,undefined,{scan:calls.length===9?'THREATS_FOUND':'NO_THREATS_FOUND'}),
    authorize(job,calls) { if(calls.length>=9)throw new MetaMediaFileReadError('ACCESS_DENIED'); return job; } });
  await rejects(f.run(),'NOT_READY'); assert.equal(f.observations[0].result,'THREATS_FOUND'); assert.equal(f.consumed,false);
});
test('media file scan audit failure or historical conflict prevents delivery despite a current clean tag', async () => {
  for (const record of [()=>{throw new Error('private-database');},()=> 'conflict',()=> 'blocked']) {
    const f=await fixture({record}); await rejects(f.run(),record.toString().includes('throw')?'DEPENDENCY_UNAVAILABLE':'NOT_READY'); assert.equal(f.consumed,false);
  }
});
test('media file refuses a reader that bypasses the required current scan observation and clears its output', async () => {
  const bytes=mediaBytes.slice(),f=await fixture({reader:{async read(){return bytes;}}});
  await rejects(f.run(),'NOT_READY'); assert.ok(bytes.every(v=>v===0)); assert.equal(f.consumed,false);
});
test('media file clears borrowed bytes on consumer failure and contains private errors', async () => {
  const f=await fixture(); let bytes;
  await rejects(f.run(async file=>{bytes=file.bytes;throw new Error('private-provider');}),'DEPENDENCY_UNAVAILABLE');
  assert.ok(bytes.every(v=>v===0)); assert.equal(await f.run(),mediaBytes.length);
});
test('media file single-flight remains held until consumption finishes', async () => {
  const f=await fixture(); let entered, release; const started=new Promise(r=>{entered=r;});
  const first=f.run(async()=>{entered();await new Promise(r=>{release=r;});return true;}); await started;
  await rejects(f.run(),'IN_PROGRESS'); release(); assert.equal(await first,true);
});
test('media file rejects invalid locators and unrecognized roles before dependency access', async () => {
  const f=await fixture();
  await rejects(f.service.withFile(f.session,'invalid',async()=>{}),'INVALID_INPUT');
  await rejects(f.service.withFile({...f.session,role:'unknown'},f.job.intent.messageKey,async()=>{}),'ACCESS_DENIED');
  assert.equal(f.authorizations,0); assert.deepEqual(f.calls,[]);
});
test('media file detects changed authorized job identity without replacing the upload actor', async () => {
  const f=await fixture({authorize(job,_calls,n){return n>1?{...job,intent:{...job.intent,actor:'changed-actor'}}:job;}});
  await rejects(f.run(),'ACCESS_DENIED'); assert.deepEqual(f.calls,[]); assert.equal(f.consumed,false);
});
test('media file rejects incomplete upload journal states before any S3 call', async () => {
  for(const status of ['prepared','claimed','dispatching','reconciliation-required','rejected']) {
    const f=await fixture({authorize:job=>({...job,status})}); await rejects(f.run(),'NOT_READY'); assert.deepEqual(f.calls,[]);
  }
});

test('media file verifies the reader output again at the consumer boundary and clears mismatching bytes',async()=>{
  const bytes=mediaBytes.slice();bytes[0]^=1;
  const job=await mediaFileJob();
  const f=await fixture({reader:{async read(_intent,_version,authorize,observe){
    await authorize();await observe({versionId:job.receipt.versionId,result:'NO_THREATS_FOUND',receipt:job.receipt});return bytes;
  }}});
  await rejects(f.run(),'CONTENT_MISMATCH');assert.ok(bytes.every(v=>v===0));assert.equal(f.consumed,false);
});
