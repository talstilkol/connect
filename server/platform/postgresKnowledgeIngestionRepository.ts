import { hasPermission, type TenantRole } from "../../shared/domain/model.ts";
import { requireTenantPermission, type TenantSession } from "../auth/tenantSession.ts";
import { deriveKnowledgeSourceKey, deriveKnowledgePassageKey } from "../ai/aiAgentKey.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { KnowledgeIngestionError, KNOWLEDGE_UPLOAD_OPERATION, parseKnowledgeUploadPayload, knowledgeUploadContent, type KnowledgeUploadPayload } from "../ai/knowledgeUploadRequest.ts";
import { toKnowledgeSourceView } from "../ai/aiAgentView.ts";
import { createPostgresKnowledgeSourceRepository } from "./postgresKnowledgeSourceRepository.ts";
import { createPostgresKnowledgePassageRepository } from "./postgresKnowledgePassageRepository.ts";
import { postgresManualReplySql as authoritySql } from "./postgresManualReplyRepository.ts";
import { postgresRailwayAiAgentMutationSql as receiptSql } from "./postgresRailwayAiAgentMutationExecutor.ts";
import { deriveRailwayApiDeterministicIdempotencyKey, deriveRailwayApiMutationRequestDigest } from "./railwayApiMutationExecutor.ts";
import type { KnowledgeStorageConfiguration } from "./s3KnowledgeConfiguration.ts";
import { knowledgeObjectKey, validKnowledgeObjectVersion, type KnowledgeObjectIntent, type KnowledgeScanVerdict } from "./s3KnowledgeStorage.ts";
import { requirePostgresRows, parsePostgresPositiveInteger as integer } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresQueryExecutor, PostgresTransactionManager } from "./postgresTransaction.ts";
const now = "date_trunc('milliseconds', statement_timestamp())";
type Row = Record<string, unknown>;
function fail(code: KnowledgeIngestionError["code"]): never { throw new KnowledgeIngestionError(code); }
async function one(q: PostgresQueryExecutor, sql: string, p: readonly PostgresParameter[]) { return requirePostgresRows(await q.query<Row>(sql, p), 1)[0] ?? null; }
function inline(q: PostgresQueryExecutor): PostgresTransactionManager { return { transaction: async (_o, fn) => fn(q) }; }
function text(r: Row, k: string): string { if (typeof r[k] !== "string" || r[k].length === 0) throw new Error("Knowledge database value invalid"); return r[k]; }
export interface KnowledgeClaim { readonly intent: KnowledgeObjectIntent; readonly claimVersion: number; readonly state: string; readonly versionId: string | null; readonly bytes: Uint8Array<ArrayBuffer> | null; }
function intent(r: Row): KnowledgeObjectIntent { return Object.freeze({ tenantId: integer(r.tenant_id), sourceKey: text(r,"source_key"),
  contentSha256: text(r,"content_sha256"), sizeBytes: integer(r.size_bytes), mediaType: text(r,"media_type"), bucket: text(r,"bucket"),
  objectKey: text(r,"object_key"), kmsKeyArn: text(r,"kms_key_arn") }); }
export function createPostgresKnowledgeIngestionRepository(deps: { queries: PostgresQueryExecutor; transactions: PostgresTransactionManager }) {
  async function tx<T>(tenantId: number, fn: (q: PostgresQueryExecutor) => Promise<T>): Promise<T> {
    return deps.transactions.transaction({ isolationLevel: "read-committed" }, async q => { await q.query(authoritySql.barrier,[tenantId]); return fn(q); });
  }
  async function authorizeActor(q: PostgresQueryExecutor, tenant: number, actor: string) {
    const t = await one(q, authoritySql.tenant,[tenant]); const m = await one(q,authoritySql.membership,[tenant,actor]);
    if (!t || !m || !hasPermission(m.role as TenantRole,"ai.write")) fail("AUTHORIZATION_DENIED");
  }
  const sourceRepo = (q: PostgresQueryExecutor) => createPostgresKnowledgeSourceRepository({ queries: q, transactions: inline(q) });
  async function locked(q: PostgresQueryExecutor, c: KnowledgeClaim) {
    const r = await one(q,"SELECT *, claim_expires_at > statement_timestamp() AS lease_live FROM knowledge_ingestion_jobs WHERE tenant_id=$1 AND source_key=$2 FOR UPDATE",[c.intent.tenantId,c.intent.sourceKey]);
    if (!r || r.claim_version !== c.claimVersion || r.lease_live !== true || ["ready","rejected"].includes(String(r.state))) fail("CONFLICT");
    return r;
  }
  async function authorizeSource(q: PostgresQueryExecutor, r: Row) {
    const tenant = integer(r.tenant_id); await authorizeActor(q,tenant,text(r,"actor_external_user_id"));
    const s = await one(q,"SELECT status FROM knowledge_sources WHERE tenant_id=$1 AND source_key=$2 FOR UPDATE",[tenant,text(r,"source_key")]);
    if (!s || !["pending-validation","pending-scan","scanning"].includes(String(s.status))) fail("AUTHORIZATION_DENIED");
  }
  async function rejectRow(q: PostgresQueryExecutor, r: Row, code: string) {
    await q.query(`UPDATE knowledge_ingestion_jobs SET state='rejected', error_code=$3, pending_bytes=NULL, claim_expires_at=NULL, updated_at=${now} WHERE tenant_id=$1 AND source_key=$2`,[integer(r.tenant_id),text(r,"source_key"),code]);
    const sources = sourceRepo(q), s = await sources.findByKey(integer(r.tenant_id),text(r,"source_key"));
    if (s && ["pending-validation","pending-scan","scanning"].includes(s.status)) {
      const result = await sources.transition({ tenantId:s.tenantId,sourceKey:s.sourceKey,expectedVersion:s.version,action:"rejected",errorCode:code });
      if (result.outcome !== "updated") throw new Error("Knowledge rejection conflict");
    }
  }
  return Object.freeze({
    async enqueue(session: TenantSession, raw: KnowledgeUploadPayload, config: KnowledgeStorageConfiguration, idempotencyKey: string, requestDigest: string) {
      requireTenantPermission(session,"ai.write"); const payload = parseKnowledgeUploadPayload(raw);
      if (idempotencyKey !== await deriveRailwayApiDeterministicIdempotencyKey(KNOWLEDGE_UPLOAD_OPERATION,payload) ||
        requestDigest !== await deriveRailwayApiMutationRequestDigest(KNOWLEDGE_UPLOAD_OPERATION,payload)) fail("INVALID_REQUEST");
      const { bytes,contentSha256 } = await knowledgeUploadContent(payload);
      const sourceKey = await deriveKnowledgeSourceKey(session.tenantId,contentSha256);
      try { return await tx(session.tenantId,async q => {
        await authorizeActor(q,session.tenantId,session.externalUserId);
        const claimed = await one(q,receiptSql.claimReceipt,[session.tenantId,KNOWLEDGE_UPLOAD_OPERATION,idempotencyKey,requestDigest,session.externalUserId]);
        if (!claimed) {
          const receipt = await one(q,receiptSql.lockReceipt,[session.tenantId,KNOWLEDGE_UPLOAD_OPERATION,idempotencyKey]);
          if (!receipt || receipt.requestDigest !== requestDigest || receipt.status !== "completed") fail("CONFLICT");
          const s = await sourceRepo(q).findByKey(session.tenantId,sourceKey); if (!s) fail("CONFLICT");
          return { source: toKnowledgeSourceView(s), outcome:"unchanged" as const };
        }
        const existing = await one(q,"SELECT source_key FROM knowledge_ingestion_jobs WHERE tenant_id=$1 AND source_key=$2",[session.tenantId,sourceKey]);
        if (!existing) {
          const capacity = await one(q,"SELECT count(*) AS total, count(*) FILTER (WHERE state NOT IN ('ready','rejected')) AS pending FROM knowledge_ingestion_jobs WHERE tenant_id=$1",[session.tenantId]);
          if (Number(capacity?.total) >= 100 || Number(capacity?.pending) >= 10) fail("DEPENDENCY_UNAVAILABLE");
        }
        const registered = await sourceRepo(q).registerUploaded({ tenantId:session.tenantId,sourceKey,contentSha256,fileName:payload.fileName,mediaType:payload.mediaType,sizeBytes:bytes.length });
        if (registered.outcome === "conflict") fail("CONFLICT");
        if (!existing && registered.source.status !== "pending-validation") fail("CONFLICT");
        if (!existing) await q.query(`INSERT INTO knowledge_ingestion_jobs (source_key,tenant_id,actor_external_user_id,content_sha256,media_type,size_bytes,bucket,object_key,kms_key_arn,pending_bytes)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,decode($10,'hex'))`,[sourceKey,session.tenantId,session.externalUserId,contentSha256,payload.mediaType,bytes.length,config.bucket,knowledgeObjectKey(session.tenantId,sourceKey),config.kmsKeyArn,Buffer.from(bytes).toString("hex")]);
        const result = { source:toKnowledgeSourceView(registered.source),outcome:existing?"unchanged" as const:"processing" as const };
        await q.query(`INSERT INTO audit_logs (tenant_id,actor_external_user_id,action,target_type,target_id,idempotency_key,metadata_json)
          VALUES ($1,$2,'ai.knowledge.upload','knowledge_source',$3,$4,$5::jsonb)`,[session.tenantId,session.externalUserId,sourceKey,idempotencyKey,JSON.stringify({ outcome:result.outcome })]);
        await q.query(receiptSql.completeReceipt,[session.tenantId,KNOWLEDGE_UPLOAD_OPERATION,idempotencyKey,requestDigest,JSON.stringify(result)]);
        return result;
      }); } finally { bytes.fill(0); }
    },
    async claim(): Promise<KnowledgeClaim | null> {
      const c = await one(deps.queries,`SELECT tenant_id,source_key FROM knowledge_ingestion_jobs WHERE state NOT IN ('ready','rejected') AND next_attempt_at <= statement_timestamp()
        AND (claim_expires_at IS NULL OR claim_expires_at <= statement_timestamp()) ORDER BY next_attempt_at,source_key LIMIT 1`,[]);
      if (!c) return null;
      return tx(integer(c.tenant_id),async q => {
        const r = await one(q,`SELECT *, encode(pending_bytes,'hex') AS bytes_hex, greatest(created_at,coalesce((SELECT max(recorded_at) FROM knowledge_ingestion_reconciliations r WHERE r.source_key=knowledge_ingestion_jobs.source_key AND r.action='reprocess'),created_at)) < statement_timestamp() - interval '7 days' AS expired FROM knowledge_ingestion_jobs
          WHERE tenant_id=$1 AND source_key=$2 AND state NOT IN ('ready','rejected') AND next_attempt_at <= statement_timestamp()
          AND (claim_expires_at IS NULL OR claim_expires_at <= statement_timestamp()) FOR UPDATE`,[integer(c.tenant_id),text(c,"source_key")]);
        if (!r) return null;
        if (r.expired) { await rejectRow(q,r,"KNOWLEDGE_PROCESSING_EXPIRED"); return null; }
        try { await authorizeSource(q,r); } catch (e) { if (!(e instanceof KnowledgeIngestionError)) throw e; await rejectRow(q,r,"KNOWLEDGE_AUTHORIZATION_CHANGED"); return null; }
        const state = r.state === "queued" || r.state === "preparing" ? "preparing" : r.state === "uploading" ? "unknown" : text(r,"state");
        const next = await one(q,`UPDATE knowledge_ingestion_jobs SET state=$3, claim_version=claim_version+1,claim_expires_at=statement_timestamp()+interval '5 minutes',updated_at=${now}
          WHERE tenant_id=$1 AND source_key=$2 RETURNING claim_version`,[integer(r.tenant_id),text(r,"source_key"),state]);
        return Object.freeze({ intent:intent(r),claimVersion:integer(next?.claim_version),state,versionId:r.version_id===null?null:text(r,"version_id"),
          bytes:r.bytes_hex===null?null:new Uint8Array(Buffer.from(text(r,"bytes_hex"),"hex")) });
      });
    },
    async authorize(c: KnowledgeClaim) { await tx(c.intent.tenantId,async q => { const r = await locked(q,c); await authorizeSource(q,r); }); },
    async seal(c: KnowledgeClaim) { await tx(c.intent.tenantId,async q => {
      const r = await locked(q,c); await authorizeSource(q,r); if (r.state !== "preparing") fail("CONFLICT");
      await q.query(`UPDATE knowledge_ingestion_jobs SET state='uploading',updated_at=${now} WHERE tenant_id=$1 AND source_key=$2`,[c.intent.tenantId,c.intent.sourceKey]);
    }); },
    async receipt(c: KnowledgeClaim, versionId: string) {
      if (!validKnowledgeObjectVersion(versionId)) fail("INVALID_REQUEST");
      await tx(c.intent.tenantId,async q => {
        // Persist a late confirmed PUT even after the lease changed. Terminal
        // rejection keeps the object locator available to operations.
        const r = await one(q,"SELECT * FROM knowledge_ingestion_jobs WHERE tenant_id=$1 AND source_key=$2 FOR UPDATE",[c.intent.tenantId,c.intent.sourceKey]);
        if (!r || (r.version_id !== null && r.version_id !== versionId)) fail("CONFLICT");
        if (r.state === "rejected" && r.version_id === null) {
          await q.query("SELECT public.record_knowledge_late_receipt_v1($1,$2,$3)", [c.intent.tenantId,c.intent.sourceKey,versionId]);
          return;
        }
        if (["ready","rejected"].includes(String(r.state))) return;
        if (!["uploading","unknown","quarantined"].includes(String(r.state))) fail("CONFLICT");
        await q.query(`UPDATE knowledge_ingestion_jobs SET version_id=$3,state='quarantined',pending_bytes=NULL,updated_at=${now} WHERE tenant_id=$1 AND source_key=$2`,[c.intent.tenantId,c.intent.sourceKey,versionId]);
        const sources = sourceRepo(q); let s = await sources.findByKey(c.intent.tenantId,c.intent.sourceKey); if (!s) fail("CONFLICT");
        for (const [status,action] of [["pending-validation","validation-passed"],["pending-scan","scan-started"]] as const) if (s.status === status) {
          const result = await sources.transition({tenantId:s.tenantId,sourceKey:s.sourceKey,expectedVersion:s.version,action,errorCode:null});
          if (result.outcome !== "updated") fail("CONFLICT"); s=result.source;
        }
      });
    },
    async defer(c: KnowledgeClaim, verdict: KnowledgeScanVerdict | null = null) { await tx(c.intent.tenantId,async q => {
      const r = await locked(q,c);
      await q.query(`UPDATE knowledge_ingestion_jobs SET state=CASE WHEN state='uploading' THEN 'unknown' ELSE state END,
        scan_verdict=coalesce($3,scan_verdict),claim_expires_at=NULL,next_attempt_at=statement_timestamp()+interval '30 seconds',updated_at=${now}
        WHERE tenant_id=$1 AND source_key=$2`,[c.intent.tenantId,c.intent.sourceKey,verdict]);
      if (r.state === "ready") fail("CONFLICT");
    }); },
    async reject(c: KnowledgeClaim, code: string) { if (!/^[A-Z0-9_]{1,100}$/.test(code)) fail("INVALID_REQUEST");
      await tx(c.intent.tenantId,async q => { await rejectRow(q,await locked(q,c),code); }); },
    async complete(c: KnowledgeClaim, versionId: string, sections: readonly { content: string }[]) {
      const passages = await Promise.all(sections.map(async ({content},index) => {
        const contentSha256 = await sha256Hex(new TextEncoder().encode(content)); const passageOrdinal=index+1;
        return { content,contentSha256,passageOrdinal,passageKey:await deriveKnowledgePassageKey(c.intent.tenantId,c.intent.sourceKey,passageOrdinal,contentSha256) };
      }));
      await tx(c.intent.tenantId,async q => {
        const r = await locked(q,c); await authorizeSource(q,r);
        if (r.state !== "quarantined" || r.version_id !== versionId) fail("CONFLICT");
        const s = await sourceRepo(q).findByKey(c.intent.tenantId,c.intent.sourceKey); if (!s || s.status !== "scanning") fail("CONFLICT");
        await q.query(`UPDATE knowledge_ingestion_jobs SET state='ready',scan_verdict='NO_THREATS_FOUND',pending_bytes=NULL,claim_expires_at=NULL,updated_at=${now}
          WHERE tenant_id=$1 AND source_key=$2`,[c.intent.tenantId,c.intent.sourceKey]);
        const result = await createPostgresKnowledgePassageRepository({ queries:q,transactions:inline(q) }).storeProcessedAndMarkReady({ tenantId:c.intent.tenantId,
          sourceKey:c.intent.sourceKey,expectedSourceVersion:s.version,passages });
        if (result.outcome !== "updated") fail("CONFLICT");
      });
    },
  });
}
export type KnowledgeIngestionRepository = ReturnType<typeof createPostgresKnowledgeIngestionRepository>;
