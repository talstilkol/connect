import assert from 'node:assert/strict';
import test from 'node:test';
import { createMetaMediaWorker } from '../server/meta/metaMediaWorker.ts';
import { META_MEDIA_TASK_POLICY, validateMetaMediaTask } from '../server/meta/metaMediaTasks.ts';
import { deriveMetaMediaUploadJobKey } from '../server/meta/metaMediaUploadJournal.ts';
import { inspectionIntent } from './fixtures/meta-media-inspection.mjs';
import { quarantineEnvironment } from './fixtures/meta-media-quarantine.mjs';
import { createMetaMediaWorkerLoop } from '../server/platform/metaMediaWorkerLoop.ts';
import { requireMetaMediaWorkerConfiguration } from '../server/platform/railwayMetaMediaWorkerRuntime.ts';

async function fixture(options={}) {
  const intent=inspectionIntent(),jobKey=await deriveMetaMediaUploadJobKey(intent);
  const task={jobKey,kind:options.kind??'upload',tenantId:intent.tenantId,actor:intent.actor,messageKey:intent.messageKey,
    connectionVersion:intent.connectionVersion,sourceSha256:intent.sourceSha256,version:2,attempts:1,exhausted:false};
  const events=[],outcomes=[];let claimed=false,job=options.status?{intent,status:options.status}:null;
  const tasks={async discoverNext(){events.push('discover');return options.discovery??'idle';},async claimNext(){events.push('claim');
    if(claimed&&!options.unlimited)return null;claimed=true;return {...task,...options.task};},async finish(t,outcome){outcomes.push(outcome);return true;}};
  const worker=createMetaMediaWorker({kind:task.kind,tasks,stopping:options.stopping,
    journal:{async lookup(){events.push('journal');return job;}},
    memberships:{async findActiveByExternalUserId(actor){events.push(actor);return options.revoked?[]:[{tenantId:intent.tenantId,externalUserId:actor,
      tenantDisplayName:'Worker integration',tenantStatus:'active',role:options.role??'owner',version:1}];}},
    async upload(t,session){events.push('upload');assert.equal(session.externalUserId,intent.actor);if(options.upload)await options.upload();job={intent,status:'quarantined'};},
    async inspect(){events.push('inspect');if(options.inspect)await options.inspect();return options.result??'pending';},
  });
  return {task,events,outcomes,run:worker.run};
}
for(const status of ['dispatching','reconciliation-required','quarantined'])test(`worker hands off ${status} without a second upload`,async()=>{
  const f=await fixture({status});await f.run();assert.deepEqual(f.outcomes,['inspection-ready']);assert.equal(f.events.includes('upload'),false);
});
test('worker uploads only under the original owner and hands off its saved receipt',async()=>{
  const f=await fixture();await f.run();assert.deepEqual(f.outcomes,['inspection-ready']);assert.equal(f.events.filter(x=>x==='upload').length,1);
});
for(const options of [{revoked:true},{role:'manager'},{role:'agent'}])test(`worker cancels an unavailable original owner ${JSON.stringify(options)}`,async()=>{
  const f=await fixture(options);await f.run();assert.deepEqual(f.outcomes,['cancelled']);assert.equal(f.events.includes('upload'),false);
});
for(const [result,outcome] of [['pending','retry'],['missing','retry'],['clean-observed','clean-observed'],['blocked','blocked'],['conflict','blocked']])test(`worker maps inspection ${result}`,async()=>{
  const f=await fixture({kind:'inspect',result});await f.run();assert.deepEqual(f.outcomes,[outcome]);assert.equal(f.events.includes('upload'),false);
});
for(const [code,outcome] of [['STALE_CLAIM','retry'],['TIMEOUT','retry'],['AUTHORIZATION_CHANGED','cancelled'],['TOO_LARGE','recovery-required'],['UNSAFE_BUCKET','recovery-required'],['CONFLICT','recovery-required']])test(`worker classifies bounded failure ${code}`,async()=>{
  const f=await fixture({upload:()=>{throw Object.assign(new Error('private'),{code});}});await f.run();assert.deepEqual(f.outcomes,[outcome]);
});
test('worker caps discovery and serial processing per batch',async()=>{
  const f=await fixture({unlimited:true,discovery:'enqueued'});await f.run();assert.equal(f.events.filter(x=>x==='discover').length,100);assert.equal(f.outcomes.length,5);
});
test('worker does not overlap runs or claim more work after shutdown',async()=>{
  let release,entered,stopping=false;const waiting=new Promise(r=>{entered=r;});
  const f=await fixture({unlimited:true,stopping:()=>stopping,upload:()=>{entered();return new Promise(r=>{release=r;});}});
  const active=f.run();await waiting;await f.run();assert.equal(f.events.filter(x=>x==='claim').length,1);stopping=true;release();await active;
  assert.equal(f.outcomes.length,1);await f.run();assert.equal(f.outcomes.length,1);
});
test('exhausted tasks never reach a provider',async()=>{const f=await fixture({task:{exhausted:true,attempts:3}});await f.run();assert.deepEqual(f.outcomes,[]);assert.equal(f.events.includes('upload'),false);});
test('invalid claim identity is rejected before membership or provider access',async()=>{const f=await fixture({task:{kind:'inspect'}});await assert.rejects(f.run(),{code:'CONFLICT'});assert.equal(f.events.includes('upload'),false);});
test('task descriptors reject mutable fields, malformed identities and out-of-policy attempts',async()=>{
  const f=await fixture();assert.ok(Object.isFrozen(validateMetaMediaTask(f.task)));
  for(const changes of [{attempts:4},{version:1},{actor:'\nowner'},{kind:'all'},{extra:true}])assert.throws(()=>validateMetaMediaTask({...f.task,...changes}),{code:'INVALID_INPUT'});
});

test('worker activation is explicit and validates role-specific prerequisites',()=>{
  assert.equal(requireMetaMediaWorkerConfiguration(),null);assert.equal(requireMetaMediaWorkerConfiguration({META_MEDIA_WORKER_MODE:'disabled',META_MEDIA_S3_BUCKET:'invalid'}),null);
  assert.equal(requireMetaMediaWorkerConfiguration({...quarantineEnvironment,META_MEDIA_WORKER_MODE:'inspect'}),'inspect');
  const upload={...quarantineEnvironment,META_MEDIA_WORKER_MODE:'upload',META_GRAPH_API_VERSION:'v23.0',META_CREDENTIAL_ENCRYPTION_KEY_V1:Buffer.from(Array.from({length:32},(_,i)=>i+1)).toString('base64')};
  assert.equal(requireMetaMediaWorkerConfiguration(upload),'upload');
  for(const key of [...Object.keys(quarantineEnvironment),'META_GRAPH_API_VERSION','META_CREDENTIAL_ENCRYPTION_KEY_V1'])assert.throws(()=>requireMetaMediaWorkerConfiguration({...upload,[key]:undefined}));
  for(const mode of ['','all',' upload ','UPLOAD'])assert.throws(()=>requireMetaMediaWorkerConfiguration({...upload,META_MEDIA_WORKER_MODE:mode}));
});
function timers(){const pending=[];return {pending,schedule(work,delay){const item={work,delay};pending.push(item);return item;},cancel(timer){const i=pending.indexOf(timer);if(i>=0)pending.splice(i,1);}};}
test('independent media loops start without awaiting work and wait for shutdown before pool teardown',async()=>{
  const clock=timers();let release,entered,stop,finished=false;const started=new Promise(r=>{entered=r;});
  const loop=createMetaMediaWorkerLoop({timers:clock,recordFailure(){assert.fail('unexpected error');},async run(stopping){stop=stopping;entered();await new Promise(r=>{release=r;});finished=true;}});
  await loop.start();await loop.start();assert.equal(clock.pending.length,1);assert.equal(clock.pending[0].delay,0);
  const tick=clock.pending.shift().work();await started;let closed=false;const closing=loop.close().then(()=>{closed=true;});await Promise.resolve();assert.equal(closed,false);assert.equal(stop(),true);
  release();await Promise.all([tick,closing]);assert.equal(finished,true);assert.equal(clock.pending.length,0);await loop.close();await assert.rejects(loop.start());
});
test('media loop recovers after failure with a bounded delay and sanitized telemetry',async()=>{
  const clock=timers();let failures=0;
  const loop=createMetaMediaWorkerLoop({timers:clock,async run(){throw new Error('private provider');},recordFailure(){failures++;throw new Error('private telemetry');}});
  await loop.start();await clock.pending.shift().work();assert.equal(failures,1);assert.equal(clock.pending[0].delay,META_MEDIA_TASK_POLICY.pollMs);await loop.close();assert.equal(clock.pending.length,0);
});
