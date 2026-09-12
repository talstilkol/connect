import type { PostgresTransactionManager } from "../platform/postgresTransaction.ts";
type Row=Record<string,unknown>;
const keys=["tenantId","deliveryKey","action","providerMessageId"];
const proposalKeys=[...keys,"schemaVersion","operatorRole","snapshotDigest","preparedAt"];
function fail():never{throw Error("MESSAGE_DELIVERY_RECOVERY_BLOCKED");}
function exact(input:unknown,expected:readonly string[]):Row{
  if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length!==expected.length||expected.some(k=>!Object.hasOwn(input,k)))fail();return {...input} as Row;
}
function request(r:Row,kind: "ai"|"manual"){
  if(!Number.isSafeInteger(r.tenantId)||Number(r.tenantId)<1||typeof r.deliveryKey!=="string"||!(kind==="ai"?/^ai_reply_delivery_v1_[a-f0-9]{64}$/:/^manual_reply_delivery_v1_[a-f0-9]{64}$/).test(r.deliveryKey)||!["accepted","not-accepted"].includes(String(r.action)))fail();
  if(r.action==="not-accepted"?r.providerMessageId!==null:typeof r.providerMessageId!=="string"||!/^[^\u0000-\u001f\u007f]{1,255}$/.test(r.providerMessageId)||r.providerMessageId.trim()!==r.providerMessageId)fail();
  return {tenantId:Number(r.tenantId),deliveryKey:r.deliveryKey,action:String(r.action),providerMessageId:r.providerMessageId as string|null};
}
export function createMessageDeliveryRecovery(transactions:PostgresTransactionManager,kind: "ai"|"manual"){
  const snapshotSql=kind==="ai"?"SELECT public.ai_delivery_recovery_snapshot_v1($1,$2) AS value":"SELECT public.manual_delivery_recovery_snapshot_v1($1,$2) AS value";
  const applySql=kind==="ai"?`SELECT public.apply_ai_delivery_recovery_v1($1,$2,$3,$4::timestamptz,$5,$6,$7,$8) AS "recoveryKey"`:`SELECT public.apply_manual_delivery_recovery_v1($1,$2,$3,$4::timestamptz,$5,$6,$7,$8) AS "recoveryKey"`;
  return Object.freeze({
  async prepare(input:unknown){const r=request(exact(input,keys),kind);return transactions.transaction({isolationLevel:"read-committed"},async q=>{
    const v=(await q.query<{value:Row}>(snapshotSql,[r.tenantId,r.deliveryKey])).rows[0]?.value;if(!v)fail();
    const d=(v.snapshot as Row).delivery as Row;
    if(!(d.state==="unknown"||d.state==="sending"&&Date.parse(String(d.provider_started_at))+120000<Date.parse(String(v.observedAt))))fail();
    return {...r,schemaVersion:1,operatorRole:v.operatorRole,snapshotDigest:v.snapshotDigest,preparedAt:new Date(String(v.observedAt)).toISOString()};
  });},
  async apply(input:unknown,evidence:string){const row=exact(input,proposalKeys),r=request(row,kind);
    if(row.schemaVersion!==1||typeof row.operatorRole!=="string"||row.operatorRole.length<1||row.operatorRole.length>63||typeof row.snapshotDigest!=="string"||!/^[a-f0-9]{64}$/.test(row.snapshotDigest)||!/^[a-f0-9]{64}$/.test(evidence)||typeof row.preparedAt!=="string"||!Number.isFinite(Date.parse(row.preparedAt))||new Date(row.preparedAt).toISOString()!==row.preparedAt)fail();
    return transactions.transaction({isolationLevel:"read-committed"},async q=>{
      const result=(await q.query<{recoveryKey:string}>(applySql,[r.tenantId,r.deliveryKey,String(row.snapshotDigest),String(row.preparedAt),String(row.operatorRole),r.action,r.providerMessageId,evidence])).rows[0];if(!result?.recoveryKey)fail();return {outcome:"recorded" as const,recoveryKey:result.recoveryKey};
    });
  },
});}
