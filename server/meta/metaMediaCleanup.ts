import { META_MEDIA_CLEANUP_OPERATION,parseMetaMediaCleanupInput,type MetaMediaCleanupInput } from '../../shared/domain/metaMediaCleanup.ts';
import type { TenantSession } from '../auth/tenantSession.ts';
import type { MetaMediaUploadJob,MetaMediaUploadIntent } from './metaMediaUploadJournal.ts';
import { validMetaMediaObjectVersion } from './metaMediaInspection.ts';
import { sha256Hex } from './metaWebhookSecurity.ts';
export const META_MEDIA_CLEANUP_POLICY=Object.freeze({attempts:3,leaseMs:600_000,retryBaseMs:60_000,processingBatch:5});
export class MetaMediaCleanupError extends Error {
  readonly code:'INVALID_REQUEST'|'PERMISSION_DENIED'|'CONFLICT'|'DEPENDENCY_UNAVAILABLE'|'STALE_CLAIM'|'DELETE_REJECTED'|'OUTCOME_UNKNOWN';
  constructor(code:MetaMediaCleanupError['code']){super(`Media cleanup failed: ${code}`);this.code=code;}
}
export interface MetaMediaCleanupTask {
  readonly tenantId:number;readonly jobKey:string;readonly actor:string;readonly versionId:string;
  readonly version:number;readonly attempts:number;readonly exhausted:boolean;
}
export interface MetaMediaCleanupRepository {
  request(session:TenantSession,input:MetaMediaCleanupInput,idempotencyKey:string):Promise<'queued'|'already-requested'>;
  claimNext():Promise<Readonly<MetaMediaCleanupTask>|null>;
  authorize(task:MetaMediaCleanupTask):Promise<Readonly<MetaMediaUploadJob>>;
  finish(task:MetaMediaCleanupTask,outcome:'removed'|'retry'|'recovery-required'|'cancelled'):Promise<boolean>;
}
export interface MetaMediaCleanupStorage { remove(intent:MetaMediaUploadIntent,versionId:string,authorize:()=>Promise<void>):Promise<void>;close():void }
export function validateMetaMediaCleanupTask(raw:MetaMediaCleanupTask):Readonly<MetaMediaCleanupTask>{
  if(!raw||typeof raw!=='object'||Object.keys(raw).sort().join(',')!=='actor,attempts,exhausted,jobKey,tenantId,version,versionId')throw new MetaMediaCleanupError('INVALID_REQUEST');
  const v=Object.freeze({...raw});
  if(!/^media_upload_v1_[0-9a-f]{64}$/.test(v.jobKey)||!validMetaMediaObjectVersion(v.versionId)||typeof v.actor!=='string'||!v.actor||v.actor.length>512||v.actor.trim()!==v.actor||/[\u0000-\u001f\u007f]/.test(v.actor)||
    [v.tenantId,v.version,v.attempts].some(n=>!Number.isSafeInteger(n)||n<1)||v.version<2||v.attempts>3||typeof v.exhausted!=='boolean')throw new MetaMediaCleanupError('INVALID_REQUEST');
  return v;
}
export async function metaMediaCleanupKey(raw:MetaMediaCleanupInput){
  const input=parseMetaMediaCleanupInput(raw);if(!input)throw new MetaMediaCleanupError('INVALID_REQUEST');
  return `connect_idempotency_v1_${await sha256Hex(new TextEncoder().encode(JSON.stringify({operation:META_MEDIA_CLEANUP_OPERATION,input})))}`;
}
export function createMetaMediaCleanupWorker(dependencies:Readonly<{jobs:MetaMediaCleanupRepository;storage:MetaMediaCleanupStorage;stopping:()=>boolean}>){
  let active=false;
  return Object.freeze({async run(){
    if(active||dependencies.stopping())return;active=true;
    try{for(let i=0;i<META_MEDIA_CLEANUP_POLICY.processingBatch&&!dependencies.stopping();i++){
      const raw=await dependencies.jobs.claimNext();if(!raw)break;const task=validateMetaMediaCleanupTask(raw);if(task.exhausted)continue;
      let outcome:'removed'|'retry'|'recovery-required'|'cancelled'='retry';
      try{
        const job=await dependencies.jobs.authorize(task);
        await dependencies.storage.remove(job.intent,task.versionId,async()=>{if(dependencies.stopping())throw new MetaMediaCleanupError('STALE_CLAIM');await dependencies.jobs.authorize(task);});
        outcome='removed';
      }catch(error){
        const code=error&&typeof error==='object'&&'code'in error?error.code:null;
        if(code==='PERMISSION_DENIED')outcome='cancelled';
        else if(['DELETE_REJECTED','CONFIGURATION_INVALID','UNSAFE_BUCKET','INVALID_INPUT','INVALID_REQUEST','CONFLICT'].includes(String(code)))outcome='recovery-required';
      }
      // A provider acknowledgement is a fact even if membership changed or
      // shutdown started while DELETE was in flight. The claim still fences it.
      await dependencies.jobs.finish(task,outcome);
    }}finally{active=false;}
  }});
}
