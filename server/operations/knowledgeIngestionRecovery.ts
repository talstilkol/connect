import { createHash } from "node:crypto";
import type { PostgresTransactionManager } from "../platform/postgresTransaction.ts";
import { validKnowledgeObjectVersion, type KnowledgeStorage, type KnowledgeObjectIntent } from "../platform/s3KnowledgeStorage.ts";
type Row=Record<string,unknown>;
const keys=["tenantId","sourceKey","action","versionId"];
const proposalKeys=[...keys,"schemaVersion","operatorRole","snapshotDigest","preparedAt"];
function fail():never{throw Error("KNOWLEDGE_RECOVERY_BLOCKED");}
function exact(input:unknown,expected:readonly string[]):Row{
  if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length!==expected.length||expected.some(k=>!Object.hasOwn(input,k)))fail();return {...input} as Row;
}
function request(r:Row){
  if(!Number.isSafeInteger(r.tenantId)||Number(r.tenantId)<1||typeof r.sourceKey!=="string"||!/^knowledge_source_v1_[a-f0-9]{64}$/.test(r.sourceKey)||!["reprocess","absent"].includes(String(r.action))||(r.action==="absent"?r.versionId!==null:!validKnowledgeObjectVersion(r.versionId)))fail();
  return {tenantId:Number(r.tenantId),sourceKey:r.sourceKey,action:String(r.action),versionId:r.versionId as string|null};
}
export function createKnowledgeIngestionRecovery(transactions:PostgresTransactionManager,storage:Pick<KnowledgeStorage,"inspect"|"read">){
  async function observe(t:number,k:string){return transactions.transaction({isolationLevel:"read-committed"},async q=>{
    const v=(await q.query<{value:Row}>("SELECT public.knowledge_recovery_snapshot_v1($1,$2) AS value",[t,k])).rows[0]?.value;if(!v)fail();return v;
  });}
  return Object.freeze({
    async prepare(input:unknown){const r=request(exact(input,keys));const current=await observe(r.tenantId,r.sourceKey);const j=(current.snapshot as Row).job as Row;
      if(!["unknown","quarantined","rejected"].includes(String(j.state))||j.claim_expires_at&&Date.parse(String(j.claim_expires_at))>Date.parse(String(current.observedAt))||
        j.state==="rejected"&&!["KNOWLEDGE_SCAN_FAILED","KNOWLEDGE_SCAN_ACCESS_DENIED","KNOWLEDGE_PROCESSING_EXPIRED","KNOWLEDGE_AUTHORIZATION_CHANGED","KNOWLEDGE_LATE_OBJECT_CONFIRMED"].includes(String(j.error_code)))fail();
      if(r.action==="absent"){if(j.state!=="unknown"||j.version_id!==null)fail();}
      else{
        if(j.version_id!==null&&j.version_id!==r.versionId)fail();
        const intent:KnowledgeObjectIntent={tenantId:r.tenantId,sourceKey:r.sourceKey,contentSha256:String(j.content_sha256),sizeBytes:Number(j.size_bytes),mediaType:String(j.media_type),bucket:String(j.bucket),objectKey:String(j.object_key),kmsKeyArn:String(j.kms_key_arn)};
        const authorize=async()=>{const latest=await observe(r.tenantId,r.sourceKey);if(latest.operatorRole!==current.operatorRole||latest.snapshotDigest!==current.snapshotDigest)fail();};
        const found=await storage.inspect(intent,r.versionId,authorize);if(!found||found.versionId!==r.versionId||found.verdict!=="NO_THREATS_FOUND")fail();
        let bytes:Uint8Array|undefined;
        try{bytes=await storage.read(intent,r.versionId!,authorize);if(bytes.byteLength!==intent.sizeBytes||createHash("sha256").update(bytes).digest("hex")!==intent.contentSha256)fail();await authorize();}
        finally{bytes?.fill(0);}
      }
      return {...r,schemaVersion:1,operatorRole:current.operatorRole,snapshotDigest:current.snapshotDigest,preparedAt:new Date(String(current.observedAt)).toISOString()};
    },
    async apply(input:unknown,evidence:string){const row=exact(input,proposalKeys),r=request(row);
      if(row.schemaVersion!==1||typeof row.operatorRole!=="string"||row.operatorRole.length<1||row.operatorRole.length>63||typeof row.snapshotDigest!=="string"||!/^[a-f0-9]{64}$/.test(row.snapshotDigest)||!/^[a-f0-9]{64}$/.test(evidence)||typeof row.preparedAt!=="string"||!Number.isFinite(Date.parse(row.preparedAt))||new Date(row.preparedAt).toISOString()!==row.preparedAt)fail();
      return transactions.transaction({isolationLevel:"read-committed"},async q=>{
        const result=(await q.query<{recoveryKey:string}>(`SELECT public.apply_knowledge_recovery_v1($1,$2,$3,$4::timestamptz,$5,$6,$7,$8) AS "recoveryKey"`,[r.tenantId,r.sourceKey,String(row.snapshotDigest),String(row.preparedAt),String(row.operatorRole),r.action,r.versionId,evidence])).rows[0];if(!result?.recoveryKey)fail();return {outcome:"recorded" as const,recoveryKey:result.recoveryKey};
      });
    },
  });
}
