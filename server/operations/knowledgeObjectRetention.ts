import { createHash } from "node:crypto";
import { inspectRetentionPolicy, type RetentionPolicyEnvironment } from "./retentionPolicy.ts";
import type { PostgresQueryExecutor, PostgresTransactionManager } from "../platform/postgresTransaction.ts";
import type { KnowledgeObjectIntent } from "../platform/s3KnowledgeStorage.ts";
import { validKnowledgeObjectVersion } from "../platform/s3KnowledgeStorage.ts";
import type { KnowledgeCleanupStorage } from "../platform/s3KnowledgeCleanupStorage.ts";

export class KnowledgeRetentionError extends Error {
  readonly code: "INVALID_INPUT" | "AUTHORIZATION_DENIED" | "CONFIGURATION_REQUIRED" | "CONFLICT" | "RETENTION_NOT_DUE";
  constructor(code: KnowledgeRetentionError["code"]) { super("Knowledge retention blocked"); this.code = code; }
}
type Row = Record<string, unknown>;
interface Target { tenantId: number; sourceKey: string; }
interface Snapshot { tenant: Row; source: Row; ingestion: Row; review: Row | null; job: Row | null; }
interface Observation { snapshot: Snapshot; actor: string; at: string; due: boolean; }
interface Proposal extends Target { schemaVersion: 1; actor: string; snapshotDigest: string; policyDigest: string; preparedAt: string; }
interface Claim extends Target { intent: KnowledgeObjectIntent; versionId: string; version: string; }
function fail(code: KnowledgeRetentionError["code"]): never { throw new KnowledgeRetentionError(code); }
const hash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const validDigest = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
function object(value: unknown, keys: readonly string[]): Row {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) fail("INVALID_INPUT");
  return Object.freeze({ ...value }) as Row;
}
function target(row: Row): Target {
  if (!Number.isSafeInteger(row.tenantId) || Number(row.tenantId) < 1 || typeof row.sourceKey !== "string" || !/^knowledge_source_v1_[a-f0-9]{64}$/.test(row.sourceKey)) fail("INVALID_INPUT");
  return { tenantId: Number(row.tenantId), sourceKey: row.sourceKey };
}
function intent(snapshot: Snapshot): KnowledgeObjectIntent {
  const r = snapshot.ingestion;
  return Object.freeze({ tenantId: Number(r.tenant_id), sourceKey: String(r.source_key), contentSha256: String(r.content_sha256), sizeBytes: Number(r.size_bytes),
    mediaType: String(r.media_type), bucket: String(r.bucket), objectKey: String(r.object_key), kmsKeyArn: String(r.kms_key_arn) });
}
export function createKnowledgeObjectRetention(dependencies: {
  transactions: PostgresTransactionManager;
  environment: RetentionPolicyEnvironment;
}) {
  const environment = Object.freeze({ ...dependencies.environment });
  const transaction = <T>(body: (q: PostgresQueryExecutor) => Promise<T>) => dependencies.transactions.transaction({ isolationLevel: "read-committed" }, body);
  function policy() {
    const result = inspectRetentionPolicy(environment);
    if (result.status !== "configured") fail("CONFIGURATION_REQUIRED");
    return { digest: hash(result.configuration), days: result.configuration.rules.find(r => r.dataClass === "knowledge-source-objects")!.retainForDays };
  }
  async function authorize(q: PostgresQueryExecutor, tenantId: number) {
    try { await q.query("SELECT public.knowledge_retention_authorize_v1($1)", [tenantId]); }
    catch { fail("AUTHORIZATION_DENIED"); }
  }
  const barrier = (q: PostgresQueryExecutor, tenantId: number) => q.query("SELECT pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1($1))", [tenantId]);
  async function observe(q: PostgresQueryExecutor, t: Target, days: number): Promise<Observation> {
    await barrier(q, t.tenantId);
    const tenant = (await q.query<{ value: Row; due: boolean }>(`SELECT to_jsonb(t) AS value,
      knowledge_retention_closed_at+($2::double precision*INTERVAL '1 day')<=public.knowledge_retention_now_v1() AS due FROM tenants t WHERE id=$1 FOR SHARE`, [t.tenantId, days])).rows[0];
    const source = (await q.query<{ value: Row }>("SELECT to_jsonb(s) AS value FROM knowledge_sources s WHERE tenant_id=$1 AND source_key=$2 FOR UPDATE", [t.tenantId, t.sourceKey])).rows[0];
    // Eligible ingestion rows are terminal and immutable under migration 0078.
    // Reading them does not require granting this operator ingestion UPDATE.
    const ingestion = (await q.query<{ value: Row }>("SELECT to_jsonb(i)-'pending_bytes'||jsonb_build_object('has_pending_bytes',i.pending_bytes IS NOT NULL) AS value FROM knowledge_ingestion_jobs i WHERE tenant_id=$1 AND source_key=$2", [t.tenantId, t.sourceKey])).rows[0];
    if (!tenant || !source || !ingestion) fail("CONFLICT");
    const review = (await q.query<{ value: Row }>("SELECT to_jsonb(r)||jsonb_build_object('version',r.version::text,'covers_closure',r.reviewed_at>=(SELECT knowledge_retention_closed_at FROM tenants WHERE id=r.tenant_id)) AS value FROM knowledge_retention_reviews r WHERE tenant_id=$1 FOR SHARE", [t.tenantId])).rows[0];
    const job = (await q.query<{ value: Row }>("SELECT to_jsonb(j)||jsonb_build_object('version',j.version::text,'review_version',j.review_version::text) AS value FROM knowledge_retention_jobs j WHERE tenant_id=$1 AND source_key=$2 FOR UPDATE", [t.tenantId, t.sourceKey])).rows[0];
    const clock = (await q.query<{ actor: string; at: Date }>("SELECT session_user AS actor,public.knowledge_retention_now_v1() AS at", [])).rows[0];
    return { snapshot: { tenant: tenant.value, source: source.value, ingestion: ingestion.value, review: review?.value ?? null, job: job?.value ?? null },
      actor: clock.actor, at: new Date(clock.at).toISOString(), due: tenant.due === true };
  }
  function eligible(current: Observation) {
    const { tenant, source, ingestion, review } = current.snapshot;
    if (tenant.status !== "cancelled" || !tenant.knowledge_retention_closed_at || !current.due) fail("RETENTION_NOT_DUE");
    if (!review || review.legal_hold !== false || review.covers_closure !== true) fail("CONFLICT");
    if (!["ready", "archived", "rejected"].includes(String(source.status)) || !["ready", "rejected"].includes(String(ingestion.state)) ||
      !validKnowledgeObjectVersion(ingestion.version_id) || ingestion.has_pending_bytes !== false || ingestion.claim_expires_at !== null) fail("CONFLICT");
  }
  function currentApproval(current: Observation, expectedPolicy: ReturnType<typeof policy>) {
    eligible(current);
    const { job, tenant, review } = current.snapshot;
    if (!job || job.operator_role !== current.actor || job.policy_digest !== expectedPolicy.digest || job.retain_days !== expectedPolicy.days ||
      job.review_version !== review!.version || job.closure_at !== tenant.knowledge_retention_closed_at || job.object_version_id !== current.snapshot.ingestion.version_id) fail("CONFLICT");
  }
  const service = {
    async status(input: unknown) {
      const t = target(object(input, ["tenantId", "sourceKey"]));
      return transaction(async q => {
        await authorize(q, t.tenantId); const current = await observe(q, t, 1), s = current.snapshot;
        return { reviewVersion: s.review?.version ?? "0", legalHold: s.review?.legal_hold ?? null, closedAt: s.tenant.knowledge_retention_closed_at,
          sourceStatus: s.source.status, deletionState: s.job?.state ?? null, deletionVersion: s.job?.version ?? null, attempts: s.job?.attempts ?? 0, errorCode: s.job?.error_code ?? null };
      });
    },
    async review(input: unknown, evidenceDigest: string): Promise<{ version: string }> {
      const r = object(input, ["tenantId", "expectedVersion", "legalHold"]);
      if (!Number.isSafeInteger(r.tenantId) || Number(r.tenantId) < 1 || !Number.isSafeInteger(r.expectedVersion) || Number(r.expectedVersion) < 0 || typeof r.legalHold !== "boolean" || !validDigest(evidenceDigest)) fail("INVALID_INPUT");
      return transaction(async q => {
        const tenantId = Number(r.tenantId); await authorize(q, tenantId); await barrier(q, tenantId);
        // Capture an existing cancelled tenant conservatively on first review.
        await q.query("UPDATE tenants SET status=status WHERE id=$1 AND status='cancelled' AND knowledge_retention_closed_at IS NULL", [tenantId]);
        const existing = (await q.query<{ version: string }>("SELECT version::text FROM knowledge_retention_reviews WHERE tenant_id=$1 FOR UPDATE", [tenantId])).rows[0];
        if ((existing?.version ?? "0") !== String(r.expectedVersion)) fail("CONFLICT");
        if (!existing) return (await q.query<{ version: string }>(`INSERT INTO knowledge_retention_reviews(tenant_id,version,legal_hold,evidence_digest)
          VALUES($1,1,$2,$3) RETURNING version::text`, [tenantId, r.legalHold === true, evidenceDigest])).rows[0];
        const updated = await q.query<{ version: string }>("UPDATE knowledge_retention_reviews SET version=version+1,legal_hold=$3,evidence_digest=$4 WHERE tenant_id=$1 AND version=$2 RETURNING version::text", [tenantId, Number(r.expectedVersion), r.legalHold === true, evidenceDigest]);
        if (!updated.rows[0]) fail("CONFLICT"); return updated.rows[0];
      });
    },
    async prepare(input: unknown): Promise<Proposal> {
      const t = target(object(input, ["tenantId", "sourceKey"])), p = policy();
      return transaction(async q => {
        await authorize(q, t.tenantId); const current = await observe(q, t, p.days); eligible(current);
        if (current.snapshot.job && !["blocked", "removed"].includes(String(current.snapshot.job.state))) fail("CONFLICT");
        return { ...t, schemaVersion: 1, actor: current.actor, snapshotDigest: hash(current.snapshot), policyDigest: p.digest, preparedAt: current.at };
      });
    },
    async enqueue(input: unknown, evidenceDigest: string): Promise<{ outcome: "queued" | "already-removed" }> {
      const r = object(input, ["tenantId", "sourceKey", "schemaVersion", "actor", "snapshotDigest", "policyDigest", "preparedAt"]), t = target(r), p = policy();
      if (r.schemaVersion !== 1 || typeof r.actor !== "string" || !validDigest(r.snapshotDigest) || r.policyDigest !== p.digest || !validDigest(evidenceDigest) ||
        typeof r.preparedAt !== "string" || !Number.isFinite(Date.parse(r.preparedAt)) || new Date(r.preparedAt).toISOString() !== r.preparedAt) fail("INVALID_INPUT");
      return transaction(async q => {
        await authorize(q, t.tenantId); const current = await observe(q, t, p.days);
        if (current.actor !== r.actor) fail("AUTHORIZATION_DENIED");
        if (current.snapshot.job?.state === "removed") return { outcome: "already-removed" };
        const approvalDigest = hash({ proposal: r, evidenceDigest });
        if (current.snapshot.job?.approval_digest === approvalDigest) return { outcome: "queued" };
        eligible(current);
        const age = Date.parse(current.at) - Date.parse(String(r.preparedAt));
        if (age < 0 || age > 300_000 || hash(current.snapshot) !== r.snapshotDigest || current.snapshot.job && current.snapshot.job.state !== "blocked") fail("CONFLICT");
        // Retire local use before any remote deletion. Tenant closure has already
        // stopped runtime execution; a later tenant reopening cannot revive it.
        if (current.snapshot.source.status === "ready") await q.query("UPDATE knowledge_sources SET status='archived',version=version+1,updated_at=date_trunc('milliseconds',public.knowledge_retention_now_v1()) WHERE tenant_id=$1 AND source_key=$2", [t.tenantId, t.sourceKey]);
        const parameters = [t.sourceKey, t.tenantId, String(current.snapshot.ingestion.version_id), String(current.snapshot.tenant.knowledge_retention_closed_at), String(current.snapshot.review!.version), p.digest, p.days, evidenceDigest, approvalDigest];
        if (current.snapshot.job) await q.query(`UPDATE knowledge_retention_jobs SET version=version+1,state='pending',attempts=0,
          object_version_id=$3,closure_at=$4::timestamptz,review_version=$5,policy_digest=$6,retain_days=$7,evidence_digest=$8,approval_digest=$9,
          operator_role=session_user,lease_expires_at=NULL,next_attempt_at=public.knowledge_retention_now_v1(),error_code=NULL WHERE source_key=$1 AND tenant_id=$2`, parameters);
        else await q.query(`INSERT INTO knowledge_retention_jobs(source_key,tenant_id,object_version_id,closure_at,review_version,policy_digest,retain_days,evidence_digest,approval_digest)
          VALUES($1,$2,$3,$4::timestamptz,$5,$6,$7,$8,$9)`, parameters);
        return { outcome: "queued" };
      });
    },
    async claim(input: unknown): Promise<Claim | null> {
      const t = target(object(input, ["tenantId", "sourceKey"])), p = policy();
      return transaction(async q => {
        await authorize(q, t.tenantId); const current = await observe(q, t, p.days), j = current.snapshot.job;
        if (!j || j.state === "removed" || j.state === "blocked") return null;
        if (j.operator_role !== current.actor) fail("AUTHORIZATION_DENIED");
        const due = await q.query("SELECT source_key FROM knowledge_retention_jobs WHERE source_key=$1 AND next_attempt_at<=public.knowledge_retention_now_v1() AND (lease_expires_at IS NULL OR lease_expires_at<=public.knowledge_retention_now_v1())", [t.sourceKey]);
        if (!due.rowCount) return null;
        let blocked = Number(j.attempts) >= 3;
        try { currentApproval(current, p); } catch (error) { if (!(error instanceof KnowledgeRetentionError)) throw error; blocked = true; }
        if (blocked) {
          await q.query("UPDATE knowledge_retention_jobs SET version=version+1,state='blocked',lease_expires_at=NULL,error_code='REVIEW_REQUIRED' WHERE source_key=$1", [t.sourceKey]); return null;
        }
        const claimed = (await q.query<{ version: string }>("UPDATE knowledge_retention_jobs SET version=version+1,state='running',attempts=attempts+1,lease_expires_at=public.knowledge_retention_now_v1()+interval '10 minutes',error_code=NULL WHERE source_key=$1 RETURNING version::text", [t.sourceKey])).rows[0];
        return Object.freeze({ ...t, intent: intent(current.snapshot), versionId: String(j.object_version_id), version: claimed.version });
      });
    },
    async authorize(claim: Claim): Promise<void> {
      const p = policy();
      await transaction(async q => {
        await authorize(q, claim.tenantId); const current = await observe(q, claim, p.days); currentApproval(current, p);
        const j = current.snapshot.job!;
        if (j.state !== "running" || j.version !== claim.version || j.object_version_id !== claim.versionId || hash(intent(current.snapshot)) !== hash(claim.intent) ||
          Date.parse(String(j.lease_expires_at)) <= Date.parse(current.at)) fail("CONFLICT");
      });
    },
    async finish(claim: Claim, outcome: "removed" | "unknown" | "blocked"): Promise<boolean> {
      if (!["removed", "unknown", "blocked"].includes(outcome)) fail("INVALID_INPUT");
      return transaction(async q => {
        await barrier(q, claim.tenantId);
        const result = await q.query(`UPDATE knowledge_retention_jobs SET version=version+1,state=CASE WHEN $5='unknown' AND attempts>=3 THEN 'blocked' ELSE $5 END,
          lease_expires_at=NULL,next_attempt_at=public.knowledge_retention_now_v1()+interval '1 minute',error_code=CASE WHEN $5='removed' THEN NULL WHEN $5='unknown' THEN 'OUTCOME_UNKNOWN' ELSE 'REVIEW_REQUIRED' END
          WHERE tenant_id=$1 AND source_key=$2 AND version=$3 AND object_version_id=$4 AND state='running' AND operator_role=session_user RETURNING source_key`,
        [claim.tenantId, claim.sourceKey, claim.version, claim.versionId, outcome]);
        return result.rowCount === 1;
      });
    },
    async run(input: unknown, storage: KnowledgeCleanupStorage): Promise<{ outcome: "idle" | "removed" | "unknown" | "blocked" | "stale" }> {
      const claim = await service.claim(input); if (!claim) return { outcome: "idle" };
      let outcome: "removed" | "unknown" | "blocked" = "unknown";
      try { await storage.remove(claim.intent, claim.versionId, () => service.authorize(claim)); outcome = "removed"; }
      catch (error) {
        const code = error && typeof error === "object" && "code" in error ? error.code : null;
        if (["AUTHORIZATION_DENIED", "CONFLICT", "RETENTION_NOT_DUE", "CONFIGURATION_REQUIRED", "INVALID_INPUT", "UNSAFE_BUCKET", "DELETE_REJECTED"].includes(String(code))) outcome = "blocked";
      }
      return { outcome: await service.finish(claim, outcome) ? outcome : "stale" };
    },
  };
  return service;
}
