import type { PostgresTransactionManager } from "../platform/postgresTransaction.ts";
const keys = ["tenantId", "requestKey", "action", "inputTokens", "outputTokens", "costMinorUnits", "currency"];
const proposalKeys = [...keys, "schemaVersion", "operatorRole", "snapshotDigest", "preparedAt"];
type Row = Record<string, unknown>;
function fail(): never { throw Error("AI_RECOVERY_BLOCKED"); }
function exact(input: unknown, expected: readonly string[]): Row {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== expected.length || expected.some(k => !Object.hasOwn(input,k))) fail();
  return Object.freeze({ ...input }) as Row;
}
function request(r: Row) {
  if (!Number.isSafeInteger(r.tenantId) || Number(r.tenantId)<1 || typeof r.requestKey!=="string" || !/^ai_provider_request_v1_[a-f0-9]{64}$/.test(r.requestKey) ||
    !["usage-confirmed","no-charge-confirmed"].includes(String(r.action)) || r.currency!=="USD" ||
    !Number.isSafeInteger(r.inputTokens) || Number(r.inputTokens)<0 || Number(r.inputTokens)>10000000 ||
    !Number.isSafeInteger(r.outputTokens) || Number(r.outputTokens)<0 || Number(r.outputTokens)>10000000 ||
    !Number.isSafeInteger(r.costMinorUnits) || Number(r.costMinorUnits)<0 ||
    (r.action==="no-charge-confirmed" && (r.inputTokens!==0 || r.outputTokens!==0 || r.costMinorUnits!==0))) fail();
  return {tenantId:Number(r.tenantId),requestKey:r.requestKey,action:String(r.action),inputTokens:Number(r.inputTokens),outputTokens:Number(r.outputTokens),costMinorUnits:Number(r.costMinorUnits),currency:"USD"};
}
export function createAiGenerationRecovery(transactions: PostgresTransactionManager) {
  return Object.freeze({
    async prepare(input: unknown) {
      const r=request(exact(input,keys));
      return transactions.transaction({isolationLevel:"read-committed"},async q=>{
        const result=await q.query<{value:Row}>("SELECT public.ai_generation_recovery_snapshot_v1($1,$2) AS value",[r.tenantId,r.requestKey]);
        const v=result.rows[0]?.value;if(!v)fail();
        const snapshot=v.snapshot as Row, generation=snapshot.generation as Row, resolution=snapshot.reconciliation as Row|null;
        if (resolution ? resolution.needs_review!==true : generation.status!=="uncertain" && !(generation.status==="claimed" && Date.parse(String(generation.attempt_deadline))<Date.parse(String(v.observedAt)))) fail();
        return {...r,schemaVersion:1,operatorRole:v.operatorRole,snapshotDigest:v.snapshotDigest,preparedAt:new Date(String(v.observedAt)).toISOString()};
      });
    },
    async apply(input: unknown,evidenceDigest:string) {
      const row=exact(input,proposalKeys),r=request(row);
      if(row.schemaVersion!==1 || typeof row.operatorRole!=="string" || row.operatorRole.length<1 || row.operatorRole.length>63 ||
        typeof row.snapshotDigest!=="string" || !/^[a-f0-9]{64}$/.test(row.snapshotDigest) || !/^[a-f0-9]{64}$/.test(evidenceDigest) ||
        typeof row.preparedAt!=="string" || !Number.isFinite(Date.parse(row.preparedAt)) || new Date(row.preparedAt).toISOString()!==row.preparedAt)fail();
      return transactions.transaction({isolationLevel:"read-committed"},async q=>{
        const result=await q.query<{recoveryKey:string}>(`SELECT public.apply_ai_generation_recovery_v1($1,$2,$3,$4::timestamptz,$5,$6,$7,$8,$9,$10) AS "recoveryKey"`,
          [r.tenantId,r.requestKey,String(row.snapshotDigest),String(row.preparedAt),String(row.operatorRole),r.action,r.inputTokens,r.outputTokens,r.costMinorUnits,evidenceDigest]);
        if(!result.rows[0]?.recoveryKey)fail();return {outcome:"recorded" as const,recoveryKey:result.rows[0].recoveryKey};
      });
    },
  });
}
