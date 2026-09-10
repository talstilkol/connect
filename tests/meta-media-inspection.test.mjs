import assert from 'node:assert/strict';
import test from 'node:test';
import { createMetaMediaInspectionService, validateMetaMediaScanObservation } from '../server/meta/metaMediaInspection.ts';
import { deriveMetaMediaUploadJobKey, MetaMediaUploadJournalError } from '../server/meta/metaMediaUploadJournal.ts';
import { inspectionIntent } from './fixtures/meta-media-inspection.mjs';

async function fixture(options = {}) {
  const intent=inspectionIntent(),jobKey=await deriveMetaMediaUploadJobKey(intent),events=[];
  const session={tenantId:intent.tenantId,externalUserId:intent.actor,role:'owner',status:'active',displayName:'Scan integration'};
  const descriptor={...intent};delete descriptor.actor;delete descriptor.kmsKeyArn;
  const receipt={...descriptor,versionId:'s3-integration-version-1',state:'quarantined'};
  const job={jobKey,intent,status:'reconciliation-required',version:4,claimVersion:2,expired:false,receipt:null,...options.job};
  const observation={versionId:receipt.versionId,result:'NO_THREATS_FOUND',receipt};
  const journal={async lookup(){events.push('lookup');return options.lookup?options.lookup(job,events):job;}};
  const scans={async record(j,o){events.push('record');assert.deepEqual(j,job);assert.deepEqual(o,observation);return options.record?options.record():'clean-observed';}};
  const inspector={async inspect(i,v,authorize){events.push('inspect');assert.deepEqual(i,intent);assert.equal(v,job.receipt?.versionId??null);await authorize();return options.inspect?options.inspect():observation;}};
  const service=createMetaMediaInspectionService({journal,scans,inspector});
  return {job,receipt,observation,session,events,journal,scans,inspector,run:()=>service.inspect(session,jobKey)};
}
const rejects=(promise,code)=>assert.rejects(promise,(error)=>{assert.equal(error.code,code);return true;});
test('inspection records historical facts before returning an authorized result',async()=>{
  const f=await fixture();assert.equal(await f.run(),'clean-observed');assert.deepEqual(f.events,['lookup','inspect','lookup','record','lookup']);
});
test('unstarted or active upload is not inspected or re-dispatched',async()=>{
  for(const job of [{status:'prepared'},{status:'claimed'},{status:'rejected'},{status:'dispatching',expired:false}]){
    const f=await fixture({job});await rejects(f.run(),'IN_PROGRESS');assert.deepEqual(f.events,['lookup']);
  }
});
test('expired dispatch and stored receipt both support read-only inspection',async()=>{
  const base=await fixture();
  for(const job of [{status:'dispatching',expired:true},{status:'quarantined',receipt:base.receipt}]){
    const f=await fixture({job});assert.equal(await f.run(),'clean-observed');
  }
});
test('missing remote object leaves durable upload state unchanged',async()=>{
  const f=await fixture({inspect:()=>null});assert.equal(await f.run(),'missing');assert.equal(f.events.includes('record'),false);
});
test('post-read revocation withholds the result but preserves the scan observation',async()=>{
  const f=await fixture({lookup(job,events){if(events.includes('record'))throw new MetaMediaUploadJournalError('AUTHORIZATION_CHANGED');return job;}});
  await rejects(f.run(),'AUTHORIZATION_CHANGED');assert.equal(f.events.includes('record'),true);
});
test('source or claim changes during inspection block its next provider read',async()=>{
  for(const changes of [{claimVersion:3},{intent:{...inspectionIntent(),actor:'other-owner'}}]){
    const f=await fixture({lookup(job,events){return events.includes('inspect')?{...job,...changes}:job;}});
    await rejects(f.run(),'AUTHORIZATION_CHANGED');assert.equal(f.events.includes('record'),false);
  }
});
test('recording failure is not turned into success and its details are not exposed',async()=>{
  const f=await fixture({record(){throw new Error('private-database-path');}});await rejects(f.run(),'DEPENDENCY_UNAVAILABLE');
});
test('scan result validation rejects clean without matching verified receipt, and negative results carrying receipts',async()=>{
  const f=await fixture();assert.deepEqual(validateMetaMediaScanObservation(f.observation,f.job.intent),f.observation);
  for(const change of [{receipt:null},{result:'THREATS_FOUND'},{versionId:'null'},{extra:true},{receipt:{...f.receipt,versionId:'different-version'}},{receipt:{...f.receipt,tenantId:99}}]){
    assert.throws(()=>validateMetaMediaScanObservation({...f.observation,...change},f.job.intent));
  }
});
