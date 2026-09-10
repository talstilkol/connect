import type { UserId, TenantId } from "../../shared/domain/model.ts";
import { requireTenantPermission, resolveTenantSessionFromMemberships, TenantSessionError, type TenantSession } from "../auth/tenantSession.ts";
import type { TenantMembershipRepository } from "../../db/tenantMembershipRepository.ts";
import { MetaMediaUploadJournalError, type MetaMediaUploadJournal } from "./metaMediaUploadJournal.ts";
import { META_MEDIA_TASK_POLICY, requireMetaMediaTaskKind, validateMetaMediaTask, type MetaMediaTask, type MetaMediaTaskKind, type MetaMediaTaskOutcome, type MetaMediaTaskRepository } from "./metaMediaTasks.ts";

export function createMetaMediaWorker(dependencies: Readonly<{
  kind: MetaMediaTaskKind;
  tasks: MetaMediaTaskRepository;
  journal: MetaMediaUploadJournal;
  memberships: Pick<TenantMembershipRepository,"findActiveByExternalUserId">;
  upload: (task: MetaMediaTask, session: TenantSession) => Promise<unknown>;
  inspect: (task: MetaMediaTask, session: TenantSession) => Promise<"pending"|"clean-observed"|"blocked"|"conflict"|"missing">;
  stopping?: () => boolean;
}>) {
  const kind=requireMetaMediaTaskKind(dependencies.kind);
  let active=false;
  async function uploadState(task:MetaMediaTask) {
    const job=await dependencies.journal.lookup(task.jobKey,task.tenantId,task.actor);
    if(job===null)return null;
    if(job.intent.sourceSha256!==task.sourceSha256||job.intent.connectionVersion!==task.connectionVersion||job.intent.messageKey!==task.messageKey)throw new MetaMediaUploadJournalError("CONFLICT");
    if(["dispatching","reconciliation-required","quarantined"].includes(job.status))return "inspection-ready" as const;
    if(job.status==="rejected")return "recovery-required" as const;
    return null;
  }
  return Object.freeze({
    async run() {
      if(active||dependencies.stopping?.())return;
      active=true;
      try {
        for(let i=0;i<META_MEDIA_TASK_POLICY.discoveryBatch&&!dependencies.stopping?.();i++)if(await dependencies.tasks.discoverNext(kind)==="idle")break;
        for(let i=0;i<META_MEDIA_TASK_POLICY.processingBatch&&!dependencies.stopping?.();i++){
          const claimed=await dependencies.tasks.claimNext(kind);if(claimed===null)break;
          const task=validateMetaMediaTask(claimed);
          if(task.kind!==kind)throw new MetaMediaUploadJournalError("CONFLICT");
          if(task.exhausted)continue;
          let outcome:MetaMediaTaskOutcome="retry";
          try {
            const memberships=await dependencies.memberships.findActiveByExternalUserId(task.actor as UserId);
            const session=resolveTenantSessionFromMemberships({externalUserId:task.actor as UserId},memberships,task.tenantId as TenantId);
            requireTenantPermission(session,"workspace.manage");
            if(kind==="upload"){
              const saved=await uploadState(task);
              if(saved)outcome=saved;
              else {await dependencies.upload(task,session);outcome=await uploadState(task)??"retry";}
            }else{
              const state=await dependencies.inspect(task,session);
              outcome=state==="clean-observed"?"clean-observed":state==="blocked"||state==="conflict"?"blocked":"retry";
            }
          }catch(error){
            const code=error!==null&&typeof error==="object"&&"code"in error?error.code:null;
            if(dependencies.stopping?.())outcome="retry";
            else if(code==="STALE_CLAIM")outcome="retry";
            else if(error instanceof TenantSessionError||code==="AUTHORIZATION_CHANGED")outcome="cancelled";
            else if(["CONTENT_MISMATCH","TOO_LARGE","URL_NOT_ALLOWED","INVALID_METADATA","INVALID_INPUT","CONFLICT","UNSAFE_BUCKET","CONFIGURATION_INVALID"].includes(String(code)))outcome="recovery-required";
            else if(kind==="upload"){
              // An upload may have committed before its acknowledgement was
              // lost. Move only to inspection; never reset its dispatch state.
              try{outcome=await uploadState(task)??"retry";}catch{outcome="retry";}
            }
          }
          await dependencies.tasks.finish(task,outcome);
        }
      }finally{active=false;}
    },
  });
}
