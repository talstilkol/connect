import { createHash } from "node:crypto";
import type { PostgresQueryExecutor, PostgresTransactionManager } from "../platform/postgresTransaction.ts";
import { validateMetaMediaUploadIntent, type MetaMediaUploadIntent } from "../meta/metaMediaUploadJournal.ts";
import { validMetaMediaObjectVersion } from "../meta/metaMediaInspection.ts";
import type { MetaMediaCleanupStorage } from "../meta/metaMediaCleanup.ts";

export class MetaMediaRetentionError extends Error {
  readonly code: "INVALID_INPUT" | "AUTHORIZATION_DENIED" | "CONFIGURATION_REQUIRED" | "CONFLICT" | "RETENTION_NOT_DUE";
  constructor(code: MetaMediaRetentionError["code"]) { super("Media retention blocked"); this.code = code; }
}
export interface MetaMediaRetentionInspection {
  versions(intent: MetaMediaUploadIntent, authorize: () => Promise<void>): Promise<readonly string[]>;
  verify(intent: MetaMediaUploadIntent, versionId: string, authorize: () => Promise<void>): Promise<void>;
}
type Row = Record<string, unknown>;
interface Target { tenantId: number; jobKey: string; objectVersionId: string; }
interface Snapshot { tenant: Row; upload: Row; review: Row | null; job: Row | null; busy: boolean; }
interface Observation { snapshot: Snapshot; actor: string; at: string; basisAt: string | null; due: boolean; }
interface Claim extends Target { intent: MetaMediaUploadIntent; version: string; }
const hash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const validDigest = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
function fail(code: MetaMediaRetentionError["code"]): never { throw new MetaMediaRetentionError(code); }
function object(value: unknown, keys: readonly string[]): Row {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) fail("INVALID_INPUT");
  return Object.freeze({ ...value }) as Row;
}
function locator(row: Row) {
  if (!Number.isSafeInteger(row.tenantId) || Number(row.tenantId) < 1 || typeof row.jobKey !== "string" || !/^media_upload_v1_[a-f0-9]{64}$/.test(row.jobKey)) fail("INVALID_INPUT");
  return { tenantId: Number(row.tenantId), jobKey: row.jobKey };
}
function target(row: Row): Target {
  const t = locator(row); if (!validMetaMediaObjectVersion(row.objectVersionId)) fail("INVALID_INPUT");
  return { ...t, objectVersionId: row.objectVersionId };
}
function intent(snapshot: Snapshot): MetaMediaUploadIntent {
  const i = snapshot.upload;
  return validateMetaMediaUploadIntent({ tenantId: Number(i.tenant_id), actor: String(i.actor_external_user_id), messageKey: String(i.message_key),
    connectionVersion: Number(i.connection_version), sourceSha256: String(i.source_sha256), contentSha256: String(i.content_sha256),
    sizeBytes: Number(i.size_bytes), mediaType: String(i.media_type), bucket: String(i.bucket), objectKey: String(i.object_key), kmsKeyArn: String(i.kms_key_arn) });
}
export function inspectMetaMediaRetentionPolicy(environment: { META_MEDIA_RETENTION_POLICY_JSON?: string }) {
  let r: Row;
  try { r = object(JSON.parse(environment.META_MEDIA_RETENTION_POLICY_JSON ?? ""), ["version", "trigger", "retainForDays"]); }
  catch { return fail("CONFIGURATION_REQUIRED"); }
  if (r.version !== 1 || !["record-created", "tenant-closed"].includes(String(r.trigger)) || !Number.isSafeInteger(r.retainForDays) || Number(r.retainForDays) < 1 || Number(r.retainForDays) > 100_000_000) fail("CONFIGURATION_REQUIRED");
  return Object.freeze({ version: 1, trigger: r.trigger as "record-created" | "tenant-closed", retainForDays: Number(r.retainForDays) });
}
export function createMetaMediaRetention(dependencies: {
  transactions: PostgresTransactionManager; environment: { META_MEDIA_RETENTION_POLICY_JSON?: string };
}) {
  const environment = Object.freeze({ ...dependencies.environment });
  const transaction = <T>(body: (q: PostgresQueryExecutor) => Promise<T>) => dependencies.transactions.transaction({ isolationLevel: "read-committed" }, body);
  const policy = () => { const p = inspectMetaMediaRetentionPolicy(environment); return { ...p, digest: hash(p) }; };
  async function authorize(q: PostgresQueryExecutor, tenantId: number) {
    try { await q.query("SELECT public.meta_media_retention_authorize_v1($1)", [tenantId]); } catch { fail("AUTHORIZATION_DENIED"); }
  }
  const barrier = (q: PostgresQueryExecutor, tenantId: number) => q.query("SELECT pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1($1))", [tenantId]);
  async function observe(q: PostgresQueryExecutor, t: Target, p: ReturnType<typeof policy>): Promise<Observation> {
    await barrier(q, t.tenantId);
    const tenant = (await q.query<{ value: Row }>("SELECT to_jsonb(t) AS value FROM tenants t WHERE id=$1 FOR SHARE", [t.tenantId])).rows[0];
    const upload = (await q.query<{ value: Row; basis: string | null; due: boolean; busy: boolean }>(`SELECT to_jsonb(i) AS value,
      to_jsonb(CASE WHEN $3='tenant-closed' THEN (SELECT knowledge_retention_closed_at FROM tenants WHERE id=$1) ELSE i.created_at END) AS basis,
      (CASE WHEN $3='tenant-closed' THEN (SELECT knowledge_retention_closed_at FROM tenants WHERE id=$1) ELSE i.created_at END)
        +($4::double precision*INTERVAL '1 day')<=public.knowledge_retention_now_v1() AS due,
      (i.lease_expires_at>clock_timestamp()
        OR EXISTS(SELECT 1 FROM meta_media_tasks task WHERE task.job_key=i.job_key AND task.status='running' AND task.lease_expires_at>clock_timestamp())
        OR EXISTS(SELECT 1 FROM meta_media_cleanup_jobs c WHERE c.job_key=i.job_key AND c.status IN ('pending','running'))) IS TRUE AS busy
      FROM meta_media_upload_jobs i WHERE tenant_id=$1 AND job_key=$2 FOR UPDATE`, [t.tenantId, t.jobKey, p.trigger, p.retainForDays])).rows[0];
    if (!tenant || !upload) fail("CONFLICT");
    const review = (await q.query<{ value: Row }>("SELECT to_jsonb(r)||jsonb_build_object('version',r.version::text,'covers_basis',r.reviewed_at>=$2::timestamptz) AS value FROM meta_media_retention_reviews r WHERE tenant_id=$1 FOR SHARE", [t.tenantId, upload.basis])).rows[0];
    const job = (await q.query<{ value: Row }>("SELECT to_jsonb(j)||jsonb_build_object('version',j.version::text,'review_version',j.review_version::text) AS value FROM meta_media_retention_jobs j WHERE tenant_id=$1 AND job_key=$2 AND object_version_id=$3 FOR UPDATE", [t.tenantId, t.jobKey, t.objectVersionId])).rows[0];
    const clock = (await q.query<{ actor: string; at: Date }>("SELECT session_user AS actor,public.knowledge_retention_now_v1() AS at", [])).rows[0];
    return { snapshot: { tenant: tenant.value, upload: upload.value, review: review?.value ?? null, job: job?.value ?? null, busy: upload.busy },
      actor: clock.actor, at: new Date(clock.at).toISOString(), basisAt: upload.basis, due: upload.due === true };
  }
  function eligible(current: Observation, p: ReturnType<typeof policy>) {
    const { tenant, upload, review, busy } = current.snapshot;
    if (!current.due || !current.basisAt || (p.trigger === "tenant-closed" && tenant.status !== "cancelled")) fail("RETENTION_NOT_DUE");
    if (!review || review.legal_hold !== false || review.covers_basis !== true || busy ||
      !["dispatching", "reconciliation-required", "quarantined", "rejected"].includes(String(upload.status))) fail("CONFLICT");
  }
  function currentApproval(current: Observation, p: ReturnType<typeof policy>) {
    eligible(current, p); const { job, review } = current.snapshot;
    if (!job || job.operator_role !== current.actor || job.policy_digest !== p.digest || job.retain_days !== p.retainForDays ||
      job.policy_trigger !== p.trigger || job.review_version !== review!.version || job.basis_at !== current.basisAt) fail("CONFLICT");
  }
  const service = {
    async status(input: unknown) {
      const t = locator(object(input, ["tenantId", "jobKey"]));
      return transaction(async q => {
        await authorize(q, t.tenantId);
        const rows = await q.query<{ objectVersionId: string; state: string; version: string; attempts: number; errorCode: string | null }>(`SELECT object_version_id AS "objectVersionId",state,version::text,attempts,error_code AS "errorCode"
          FROM meta_media_retention_jobs WHERE tenant_id=$1 AND job_key=$2 ORDER BY object_version_id COLLATE "C"`, [t.tenantId, t.jobKey]);
        const review = (await q.query("SELECT version::text,legal_hold AS \"legalHold\" FROM meta_media_retention_reviews WHERE tenant_id=$1", [t.tenantId])).rows[0] ?? null;
        return { versions: rows.rows, review };
      });
    },
    async review(input: unknown, evidenceDigest: string) {
      const r = object(input, ["tenantId", "expectedVersion", "legalHold"]);
      if (!Number.isSafeInteger(r.tenantId) || Number(r.tenantId) < 1 || !Number.isSafeInteger(r.expectedVersion) || Number(r.expectedVersion) < 0 || typeof r.legalHold !== "boolean" || !validDigest(evidenceDigest)) fail("INVALID_INPUT");
      return transaction(async q => {
        const tenantId = Number(r.tenantId); await authorize(q, tenantId); await barrier(q, tenantId);
        await q.query("UPDATE tenants SET status=status WHERE id=$1 AND status='cancelled' AND knowledge_retention_closed_at IS NULL", [tenantId]);
        const existing = (await q.query<{ version: string }>("SELECT version::text FROM meta_media_retention_reviews WHERE tenant_id=$1 FOR UPDATE", [tenantId])).rows[0];
        if ((existing?.version ?? "0") !== String(r.expectedVersion)) fail("CONFLICT");
        return (await q.query<{ version: string }>(existing
          ? "UPDATE meta_media_retention_reviews SET version=version+1,legal_hold=$2,evidence_digest=$3 WHERE tenant_id=$1 RETURNING version::text"
          : "INSERT INTO meta_media_retention_reviews(tenant_id,version,legal_hold,evidence_digest) VALUES($1,1,$2,$3) RETURNING version::text",
        [tenantId, r.legalHold === true, evidenceDigest])).rows[0];
      });
    },
    async versions(input: unknown, storage: MetaMediaRetentionInspection) {
      const t = locator(object(input, ["tenantId", "jobKey"])), p = policy();
      // The marker is only used to read the database snapshot. It is never sent
      // to S3 as a version or persisted as evidence.
      const selected = { ...t, objectVersionId: "discovery" };
      const read = () => transaction(async q => { await authorize(q, t.tenantId); const c = await observe(q, selected, p); eligible(c, p); return c; });
      const original = await read();
      const check = async () => { if (hash((await read()).snapshot) !== hash(original.snapshot)) fail("CONFLICT"); };
      const versions = await storage.versions(intent(original.snapshot), check); await check(); return { objectVersionIds: versions };
    },
    async prepare(input: unknown, storage: MetaMediaRetentionInspection) {
      const t = target(object(input, ["tenantId", "jobKey", "objectVersionId"])), p = policy();
      const read = () => transaction(async q => { await authorize(q, t.tenantId); const c = await observe(q, t, p); eligible(c, p);
        if (c.snapshot.job && !["blocked", "removed"].includes(String(c.snapshot.job.state))) fail("CONFLICT"); return c; });
      const original = await read();
      const check = async () => { if (hash((await read()).snapshot) !== hash(original.snapshot)) fail("CONFLICT"); };
      await storage.verify(intent(original.snapshot), t.objectVersionId, check); await check();
      return { ...t, schemaVersion: 1, actor: original.actor, snapshotDigest: hash(original.snapshot), policyDigest: p.digest, preparedAt: original.at };
    },
    async enqueue(input: unknown, evidenceDigest: string): Promise<{ outcome: "queued" | "already-removed" }> {
      const r = object(input, ["tenantId", "jobKey", "objectVersionId", "schemaVersion", "actor", "snapshotDigest", "policyDigest", "preparedAt"]), t = target(r), p = policy();
      if (r.schemaVersion !== 1 || typeof r.actor !== "string" || !validDigest(r.snapshotDigest) || r.policyDigest !== p.digest || !validDigest(evidenceDigest) ||
        typeof r.preparedAt !== "string" || !Number.isFinite(Date.parse(r.preparedAt)) || new Date(r.preparedAt).toISOString() !== r.preparedAt) fail("INVALID_INPUT");
      return transaction(async q => {
        await authorize(q, t.tenantId); const c = await observe(q, t, p);
        if (c.actor !== r.actor) fail("AUTHORIZATION_DENIED");
        if (c.snapshot.job?.state === "removed") return { outcome: "already-removed" };
        const approvalDigest = hash({ proposal: r, evidenceDigest });
        if (c.snapshot.job?.approval_digest === approvalDigest) return { outcome: "queued" };
        eligible(c, p);
        const age = Date.parse(c.at) - Date.parse(String(r.preparedAt));
        if (age < 0 || age > 300_000 || hash(c.snapshot) !== r.snapshotDigest || c.snapshot.job && c.snapshot.job.state !== "blocked") fail("CONFLICT");
        const params = [t.jobKey, t.tenantId, t.objectVersionId, c.basisAt, String(c.snapshot.review!.version), p.digest, p.retainForDays, evidenceDigest, approvalDigest, p.trigger];
        await q.query(c.snapshot.job ? `UPDATE meta_media_retention_jobs SET version=version+1,state='pending',attempts=0,
          basis_at=$4::timestamptz,review_version=$5,policy_digest=$6,retain_days=$7,evidence_digest=$8,approval_digest=$9,policy_trigger=$10,
          operator_role=session_user,lease_expires_at=NULL,next_attempt_at=public.knowledge_retention_now_v1(),error_code=NULL WHERE job_key=$1 AND tenant_id=$2 AND object_version_id=$3`
          : `INSERT INTO meta_media_retention_jobs(job_key,tenant_id,object_version_id,basis_at,review_version,policy_digest,retain_days,evidence_digest,approval_digest,policy_trigger)
          VALUES($1,$2,$3,$4::timestamptz,$5,$6,$7,$8,$9,$10)`, params);
        return { outcome: "queued" };
      });
    },
    async claim(input: unknown): Promise<Claim | null> {
      const t = target(object(input, ["tenantId", "jobKey", "objectVersionId"])), p = policy();
      return transaction(async q => {
        await authorize(q, t.tenantId); const c = await observe(q, t, p), j = c.snapshot.job;
        if (!j || ["removed", "blocked"].includes(String(j.state))) return null;
        if (j.operator_role !== c.actor) fail("AUTHORIZATION_DENIED");
        const key = [t.tenantId, t.jobKey, t.objectVersionId];
        if (Date.parse(String(j.next_attempt_at)) > Date.parse(c.at) || j.lease_expires_at && Date.parse(String(j.lease_expires_at)) > Date.parse(c.at)) return null;
        let blocked = Number(j.attempts) >= 3;
        try { currentApproval(c, p); } catch (error) { if (!(error instanceof MetaMediaRetentionError)) throw error; blocked = true; }
        if (blocked) { await q.query("UPDATE meta_media_retention_jobs SET version=version+1,state='blocked',lease_expires_at=NULL,error_code='REVIEW_REQUIRED' WHERE tenant_id=$1 AND job_key=$2 AND object_version_id=$3", key); return null; }
        const claimed = (await q.query<{ version: string }>("UPDATE meta_media_retention_jobs SET version=version+1,state='running',attempts=attempts+1,lease_expires_at=public.knowledge_retention_now_v1()+interval '10 minutes',error_code=NULL WHERE tenant_id=$1 AND job_key=$2 AND object_version_id=$3 RETURNING version::text", key)).rows[0];
        return Object.freeze({ ...t, intent: intent(c.snapshot), version: claimed.version });
      });
    },
    async authorize(claim: Claim) {
      const p = policy(); await transaction(async q => {
        await authorize(q, claim.tenantId); const c = await observe(q, claim, p); currentApproval(c, p); const j = c.snapshot.job!;
        if (j.state !== "running" || j.version !== claim.version || hash(intent(c.snapshot)) !== hash(claim.intent) || Date.parse(String(j.lease_expires_at)) <= Date.parse(c.at)) fail("CONFLICT");
      });
    },
    async finish(claim: Claim, outcome: "removed" | "unknown" | "blocked") {
      if (!["removed", "unknown", "blocked"].includes(outcome)) fail("INVALID_INPUT");
      return transaction(async q => {
        await barrier(q, claim.tenantId);
        const result = await q.query(`UPDATE meta_media_retention_jobs SET version=version+1,state=CASE WHEN $5='unknown' AND attempts>=3 THEN 'blocked' ELSE $5 END,
          lease_expires_at=NULL,next_attempt_at=public.knowledge_retention_now_v1()+interval '1 minute',error_code=CASE WHEN $5='removed' THEN NULL WHEN $5='unknown' THEN 'OUTCOME_UNKNOWN' ELSE 'REVIEW_REQUIRED' END
          WHERE tenant_id=$1 AND job_key=$2 AND object_version_id=$3 AND version=$4 AND state='running' AND operator_role=session_user RETURNING job_key`,
        [claim.tenantId, claim.jobKey, claim.objectVersionId, claim.version, outcome]);
        return result.rowCount === 1;
      });
    },
    async sweep(input: unknown, evidenceDigest: string, inspection: MetaMediaRetentionInspection, storage: MetaMediaCleanupStorage) {
      const r = object(input, ["tenantId", "afterJobKey", "maximumJobs"]);
      if (!Number.isSafeInteger(r.tenantId) || Number(r.tenantId) < 1 || !Number.isSafeInteger(r.maximumJobs) || Number(r.maximumJobs) < 1 || Number(r.maximumJobs) > 10 ||
        (r.afterJobKey !== null && (typeof r.afterJobKey !== "string" || !/^media_upload_v1_[a-f0-9]{64}$/.test(r.afterJobKey))) || !validDigest(evidenceDigest)) fail("INVALID_INPUT");
      const tenantId = Number(r.tenantId), p = policy();
      const candidates = await transaction(async q => {
        await authorize(q, tenantId);
        const review = (await q.query<{ evidence: string; hold: boolean }>("SELECT evidence_digest AS evidence,legal_hold AS hold FROM meta_media_retention_reviews WHERE tenant_id=$1", [tenantId])).rows[0];
        if (!review || review.hold || review.evidence !== evidenceDigest) fail("CONFLICT");
        // Cursor pagination avoids permanently starving later keys. Every
        // candidate is rechecked before inventory, preparation and transport.
        return (await q.query<{ jobKey: string }>(`SELECT i.job_key AS "jobKey" FROM meta_media_upload_jobs i JOIN tenants t ON t.id=i.tenant_id
          WHERE i.tenant_id=$1 AND ($2::text IS NULL OR i.job_key COLLATE "C">$2::text COLLATE "C")
          AND i.status IN ('dispatching','reconciliation-required','quarantined','rejected')
          AND ($3<>'tenant-closed' OR t.status='cancelled')
          AND (CASE WHEN $3='tenant-closed' THEN t.knowledge_retention_closed_at ELSE i.created_at END)
            +($4::double precision*INTERVAL '1 day')<=public.knowledge_retention_now_v1()
          ORDER BY i.job_key COLLATE "C" LIMIT $5`, [tenantId, r.afterJobKey as string | null, p.trigger, p.retainForDays, Number(r.maximumJobs) + 1])).rows;
      });
      const results: { jobKey: string; state: "processed" | "review-required"; attemptedVersions: number }[] = [];
      let remaining = 20, cursor = r.afterJobKey as string | null;
      for (const candidate of candidates.slice(0, Number(r.maximumJobs))) {
        const t = { tenantId, jobKey: candidate.jobKey }; let attempted = 0;
        try {
          const inventory = await service.versions(t, inspection), status = await service.status(t);
          const prior = new Map(status.versions.map(j => [String(j.objectVersionId), String(j.state)]));
          const versions = [...new Set([...inventory.objectVersionIds, ...prior.keys()])].sort();
          for (const id of versions) {
            if (prior.get(id) === "removed" || prior.get(id) === "blocked") continue;
            if (remaining === 0) return { results, nextJobKey: cursor, cycleComplete: false };
            remaining--; attempted++;
            const selected = { ...t, objectVersionId: id };
            if (!prior.has(id)) {
              const proposal = await service.prepare(selected, inspection);
              // The hold document must still be current when a policy sweep
              // creates new deletion intent. Manual prepare/enqueue is separate.
              await transaction(async q => { await authorize(q, tenantId); const c = await observe(q, selected, p);
                if (c.snapshot.review?.evidence_digest !== evidenceDigest) fail("CONFLICT"); });
              await service.enqueue(proposal, evidenceDigest);
            }
            await service.run(selected, storage);
          }
          const latest = await service.status(t);
          results.push({ jobKey: t.jobKey, state: latest.versions.some(j => j.state !== "removed") ? "review-required" : "processed", attemptedVersions: attempted });
        } catch (error) {
          if (error instanceof MetaMediaRetentionError && error.code === "AUTHORIZATION_DENIED") throw error;
          results.push({ jobKey: t.jobKey, state: "review-required", attemptedVersions: attempted });
        }
        cursor = t.jobKey;
      }
      return { results, nextJobKey: candidates.length > Number(r.maximumJobs) ? cursor : null, cycleComplete: candidates.length <= Number(r.maximumJobs) };
    },
    async run(input: unknown, storage: MetaMediaCleanupStorage): Promise<{ outcome: "idle" | "removed" | "unknown" | "blocked" | "stale" }> {
      const claim = await service.claim(input); if (!claim) return { outcome: "idle" };
      let outcome: "removed" | "unknown" | "blocked" = "unknown";
      try { await storage.remove(claim.intent, claim.objectVersionId, () => service.authorize(claim)); outcome = "removed"; }
      catch (error) {
        const code = error && typeof error === "object" && "code" in error ? error.code : null;
        if (["AUTHORIZATION_DENIED", "CONFLICT", "RETENTION_NOT_DUE", "CONFIGURATION_REQUIRED", "INVALID_INPUT", "INVALID_REQUEST", "UNSAFE_BUCKET", "DELETE_REJECTED"].includes(String(code))) outcome = "blocked";
      }
      return { outcome: await service.finish(claim, outcome) ? outcome : "stale" };
    },
  };
  return service;
}
