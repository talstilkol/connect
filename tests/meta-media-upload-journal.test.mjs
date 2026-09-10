import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveMetaMediaUploadJobKey, metaMediaUploadObjectKey, validateMetaMediaUploadIntent, mediaUploadReceiptMatches,
  storeMetaMediaWithJournal, MetaMediaUploadJournalError } from '../server/meta/metaMediaUploadJournal.ts';
import { MetaMediaQuarantineError } from '../server/meta/metaMediaQuarantine.ts';
import { quarantineInput, quarantineConfig } from './fixtures/meta-media-quarantine.mjs';

function intentFor(input = quarantineInput()) {
  const { bytes, ...descriptor } = input; assert.ok(bytes.byteLength > 0);
  return { ...descriptor, actor: 'media-journal-test-owner', bucket: quarantineConfig.bucket, objectKey: metaMediaUploadObjectKey(input), kmsKeyArn: quarantineConfig.kmsKeyArn };
}
function receiptFor(intent) {
  const { actor, kmsKeyArn, ...descriptor } = intent; assert.ok(actor && kmsKeyArn);
  return { ...descriptor, versionId: 'journal-s3-version-1', state: 'quarantined' };
}
async function fixture(options = {}) {
  const input = quarantineInput(), intent = intentFor(input), jobKey = await deriveMetaMediaUploadJobKey(intent), events = [];
  const receipt = receiptFor(intent), claim = { jobKey, tenantId: intent.tenantId, actor: intent.actor, claimVersion: 2 };
  const journal = {
    async prepare(value) { events.push('prepare'); assert.deepEqual(value, intent); return options.prepare ? options.prepare(value) : { jobKey, intent, status: options.status ?? 'prepared', expired: options.expired ?? false, version: 1, claimVersion: null, receipt: options.receipt ?? null }; },
    async claim(...args) { events.push('claim'); assert.deepEqual(args, [jobKey,intent.tenantId,intent.actor]); return options.claim ? options.claim() : claim; },
    async dispatch(value) { events.push('dispatch'); assert.deepEqual(value, claim); return options.dispatch ? options.dispatch() : true; },
    async checkDispatched(value) { events.push('permit'); assert.deepEqual(value, claim); return options.permit ? options.permit() : true; },
    async finish(value, outcome) { events.push(['finish',outcome]); assert.deepEqual(value, claim); return options.finish ? options.finish(outcome) : true; },
  };
  const storage = { async store(value, authorize) { events.push('store'); assert.deepEqual(value, input); await authorize(); return options.store ? options.store() : receipt; } };
  const authorize = async () => { events.push('authorize'); if (options.authorize) await options.authorize(events); };
  return { input,intent,jobKey,receipt,claim,journal,storage,events,authorize,
    run: () => storeMetaMediaWithJournal({ journal, storage }, intent, input, authorize) };
}
const rejects = (promise, code) => assert.rejects(promise, (error) => { assert.equal(error.code, code); return true; });

test('upload is invoked only after durable prepare, claim and a fresh dispatch acknowledgement', async () => {
  const f = await fixture(); assert.deepEqual(await f.run(), f.receipt);
  assert.deepEqual(f.events, ['authorize','prepare','claim','dispatch','store','authorize','permit',['finish',{receipt:f.receipt}],'authorize']);
});
test('source identity is deterministic and remains distinct across tenant, generation and message', async () => {
  const intent = intentFor(), key = await deriveMetaMediaUploadJobKey(intent);
  assert.equal(await deriveMetaMediaUploadJobKey({ ...intent }), key);
  for (const change of [{ tenantId: 9 }, { connectionVersion: 9 }, { messageKey: `message_v1_${'c'.repeat(64)}` }, { sourceSha256: 'c'.repeat(64) }]) assert.notEqual(await deriveMetaMediaUploadJobKey({ ...intent,...change }), key);
  assert.equal(await deriveMetaMediaUploadJobKey({ ...intent,bucket:'different-target',contentSha256:'c'.repeat(64) }), key);
});
test('intent validation rejects unsafe identities, retargeted keys and accidental byte persistence', () => {
  for (const change of [{ tenantId: 0 }, { actor: ' owner ' }, { sourceSha256: 'bad' }, { objectKey: '../escape' },
    { bucket: 'https://bucket' }, { kmsKeyArn: 'alias/aws/s3' }, { bytes: quarantineInput().bytes }, { sizeBytes: 0 }, { sizeBytes: 104857601 }]) {
    assert.throws(() => validateMetaMediaUploadIntent({ ...intentFor(),...change }), { code: 'INVALID_INPUT' });
  }
});
test('foreign descriptor or mismatched job cannot reach claim or storage', async () => {
  const f = await fixture(); await rejects(storeMetaMediaWithJournal(f, f.intent, { ...f.input,tenantId:99 },f.authorize), 'CONFLICT'); assert.deepEqual(f.events,[]);
  const bad = await fixture({ prepare: async (intent) => ({ jobKey: `media_upload_v1_${'f'.repeat(64)}`,intent,status:'prepared' }) });
  await rejects(bad.run(),'CONFLICT'); assert.equal(bad.events.includes('claim'),false);
});
test('committed quarantine receipt replays without claim, S3 calls or another finish', async () => {
  const receipt = receiptFor(intentFor()), f = await fixture({ status:'quarantined',receipt });
  assert.deepEqual(await f.run(),receipt); assert.deepEqual(f.events,['authorize','prepare','authorize']);
});
test('replay requires an exact receipt and current authorization', async () => {
  const f = await fixture({ status:'quarantined',receipt:{...receiptFor(intentFor()),versionId:'null'} });
  await rejects(f.run(),'CONFLICT');
  const denied = await fixture({ status:'quarantined',receipt:receiptFor(intentFor()),authorize(events) { if(events.length>2) throw new MetaMediaUploadJournalError('AUTHORIZATION_CHANGED'); } });
  await rejects(denied.run(),'AUTHORIZATION_CHANGED'); assert.equal(denied.events.includes('store'),false);
});
test('dispatching jobs are not reclaimed, whether active, expired or marked for reconciliation', async () => {
  for (const [status,expired,code] of [['dispatching',false,'IN_PROGRESS'],['dispatching',true,'RECOVERY_REQUIRED'],['reconciliation-required',false,'RECOVERY_REQUIRED'],['rejected',false,'RECOVERY_REQUIRED']]) {
    const f = await fixture({status,expired}); await rejects(f.run(),code); assert.deepEqual(f.events,['authorize','prepare']);
  }
});
test('failed prepare, busy claim or stale dispatch performs no storage operation', async () => {
  for (const [options,code] of [[{prepare(){throw new MetaMediaUploadJournalError('DEPENDENCY_UNAVAILABLE');}},'DEPENDENCY_UNAVAILABLE'],
    [{claim:()=>null},'IN_PROGRESS'],[{dispatch:()=>false},'STALE_CLAIM'],[{dispatch(){throw new MetaMediaUploadJournalError('DEPENDENCY_UNAVAILABLE');}},'DEPENDENCY_UNAVAILABLE']]) {
    const f = await fixture(options); await rejects(f.run(),code); assert.equal(f.events.includes('store'),false);
  }
});
test('failed current claim permit is recorded as reconciliation, never a safe retry', async () => {
  const f=await fixture({permit:()=>false});await rejects(f.run(),'STALE_CLAIM');
  assert.deepEqual(f.events.at(-1),['finish',{errorCode:'RECONCILIATION_REQUIRED'}]);
});
test('unknown, existing, authorization and preflight failures retain a conservative reconciliation outcome', async () => {
  for (const code of ['OUTCOME_UNKNOWN','OBJECT_EXISTS','AUTHORIZATION_CHANGED','UNSAFE_BUCKET','DEPENDENCY_UNAVAILABLE']) {
    const f=await fixture({store(){throw new MetaMediaQuarantineError(code);}});await rejects(f.run(),code);
    assert.deepEqual(f.events.at(-1),['finish',{errorCode:'RECONCILIATION_REQUIRED'}]);
  }
  const rejected=await fixture({store(){throw new MetaMediaQuarantineError('WRITE_REJECTED');}});await rejects(rejected.run(),'WRITE_REJECTED');
  assert.deepEqual(rejected.events.at(-1),['finish',{errorCode:'WRITE_REJECTED'}]);
});
test('a mismatching remote receipt is never committed as successful quarantine', async () => {
  const f=await fixture({store:()=>({...receiptFor(intentFor()),objectKey:'foreign-object'})});await rejects(f.run(),'CONFLICT');
  assert.deepEqual(f.events.at(-1),['finish',{errorCode:'RECONCILIATION_REQUIRED'}]);
});
test('lost finish acknowledgement never changes known remote success into a failure write', async () => {
  const f=await fixture({finish(){throw new MetaMediaUploadJournalError('DEPENDENCY_UNAVAILABLE');}});await rejects(f.run(),'DEPENDENCY_UNAVAILABLE');
  assert.equal(f.events.filter(Array.isArray).length,1);assert.ok(f.events.at(-1)[1].receipt);
});
test('revocation after storage still records the receipt before withholding it from the caller', async () => {
  const f=await fixture({authorize(events){if(events.some(Array.isArray))throw new MetaMediaUploadJournalError('AUTHORIZATION_CHANGED');}});
  await rejects(f.run(),'AUTHORIZATION_CHANGED');assert.ok(f.events.at(-2)[1].receipt);
});
test('receipt validation rejects changed scope, content, versions and extra fields', () => {
  const intent=intentFor(),receipt=receiptFor(intent);assert.equal(mediaUploadReceiptMatches(receipt,intent),true);
  for(const change of [{tenantId:99},{sourceSha256:'b'.repeat(64)},{versionId:'null'},{versionId:'bad\nversion'},{state:'available'},{extra:true}])assert.equal(mediaUploadReceiptMatches({...receipt,...change},intent),false);
});

test('storage receipt callback persists before post-write revocation and does not overwrite success', async () => {
  const f = await fixture({ authorize(events) { if (events.some(Array.isArray)) throw new MetaMediaUploadJournalError('AUTHORIZATION_CHANGED'); } });
  f.storage.store = async (_input, authorize, recordReceipt) => {
    await authorize(); await recordReceipt(f.receipt); await authorize(); return f.receipt;
  };
  await rejects(f.run(), 'AUTHORIZATION_CHANGED');
  assert.deepEqual(f.events.filter(Array.isArray), [['finish', { receipt: f.receipt }]]);
});

test('receipt callback commit ambiguity and differing returned version cannot replace the original receipt', async () => {
  for (const lostAck of [true, false]) {
    const f = await fixture(lostAck ? { finish() { throw new MetaMediaUploadJournalError('DEPENDENCY_UNAVAILABLE'); } } : {});
    f.storage.store = async (_input, authorize, recordReceipt) => {
      await authorize(); await recordReceipt(f.receipt); await authorize(); return { ...f.receipt, versionId: 'different-version' };
    };
    await rejects(f.run(), lostAck ? 'DEPENDENCY_UNAVAILABLE' : 'CONFLICT');
    assert.deepEqual(f.events.filter(Array.isArray), [['finish', { receipt: f.receipt }]]);
  }
});
