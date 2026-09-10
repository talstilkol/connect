import { normalizeMetaAccountLifecycleObservation, type MetaAccountLifecycleCommand, type MetaAccountLifecycleRepository } from "../meta/metaAccountLifecycleRecord.ts";
import { MetaWebhookProcessorError } from "../meta/metaWebhookIngress.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { postgresMetaTenantBarrierCte } from "./postgresMetaTenantBarrier.ts";
import { postgresMetaSql } from "./postgresMetaRepository.ts";
import { parsePostgresPositiveInteger, parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresTransactionManager } from "./postgresTransaction.ts";

export const postgresMetaAccountLifecycleSql = Object.freeze({
  barrier: `WITH ${postgresMetaTenantBarrierCte} SELECT 1 AS locked FROM tenant_barrier`,
  connection: `SELECT waba_id AS "wabaId", phone_number_id AS "phoneNumberId", business_portfolio_id AS "businessPortfolioId",
    version, status, snapshot_started_at AS "snapshotStartedAt", snapshot_version AS "snapshotVersion" FROM meta_connections WHERE tenant_id=$1 FOR UPDATE`,
  receipt: `SELECT id FROM meta_webhook_receipts WHERE tenant_id=$1 AND id=$2 AND waba_id=$3 AND event_key=$4 AND status='processing' FOR SHARE`,
  existing: `SELECT tenant_id AS "tenantId" FROM meta_account_lifecycle_events WHERE waba_id=$1 AND event_digest=$2`,
  insert: `INSERT INTO meta_account_lifecycle_events (tenant_id,event_digest,receipt_id,event_key,waba_id,phone_number_id,business_portfolio_id,
    connection_version,resolved_version,result_version,event_type,occurred_at,snapshot_started_at,timing,outcome,owner_business_id,reported_phone_number,reason,initiated_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::timestamptz,$13::timestamptz,$14,$15,$16,$17,$18,$19) RETURNING event_digest AS digest`,
  audit: `INSERT INTO audit_logs (tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES ($1,NULL,'meta.account-lifecycle.observed','meta_account_event',$2,$3::jsonb) RETURNING id`,
});
function fail(): never { throw new MetaWebhookProcessorError("ACCOUNT_LIFECYCLE_STORAGE_FAILED"); }
function positive(value: unknown): number { if (!Number.isSafeInteger(value) || Number(value) <= 0) return fail(); return Number(value); }
function asset(value: unknown): string { if (typeof value !== "string" || !/^[1-9][0-9]{0,254}$/.test(value)) return fail(); return value; }
function normalize(command: MetaAccountLifecycleCommand) {
  const tenantId = positive(command?.tenantId), receiptId = positive(command.receiptId), connectionVersion = positive(command.connectionVersion);
  const wabaId = asset(command.wabaId), phoneNumberId = asset(command.phoneNumberId), businessPortfolioId = asset(command.businessPortfolioId);
  if (typeof command.eventKey !== "string" || !/^[0-9a-f]{64}$/.test(command.eventKey) || !Array.isArray(command.events) || command.events.length === 0 || command.events.length > 100) return fail();
  const events = command.events.map(normalizeMetaAccountLifecycleObservation);
  if (events.some((event) => event.ownerBusinessId !== null && event.ownerBusinessId !== businessPortfolioId)) return fail();
  return Object.freeze({ tenantId, receiptId, connectionVersion, wabaId, phoneNumberId, businessPortfolioId, eventKey: command.eventKey, events });
}
export function createPostgresMetaAccountLifecycleRepository(transactions: PostgresTransactionManager): MetaAccountLifecycleRepository {
  return Object.freeze({
    async recordBatch(rawCommand: MetaAccountLifecycleCommand) {
      const command = normalize(rawCommand);
      const entries = await Promise.all(command.events.map(async (event) => ({ event,
        digest: await sha256Hex(new TextEncoder().encode(JSON.stringify({ namespace: "meta_account_lifecycle_v1", wabaId: command.wabaId, ...event }))) })));
      await transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        const one = async (sql: string, values: readonly PostgresParameter[]) => requirePostgresRows(await tx.query(sql, values), 1)[0] ?? null;
        await one(postgresMetaAccountLifecycleSql.barrier, [command.tenantId]);
        const connection = requireExactPostgresRow(await one(postgresMetaAccountLifecycleSql.connection, [command.tenantId]),
          ["wabaId", "phoneNumberId", "businessPortfolioId", "version", "status", "snapshotStartedAt", "snapshotVersion"]);
        const receipt = await one(postgresMetaAccountLifecycleSql.receipt, [command.tenantId, command.receiptId, command.wabaId, command.eventKey]);
        if (receipt === null || parsePostgresPositiveInteger(requireExactPostgresRow(receipt, ["id"]).id) !== command.receiptId) return fail();
        let version = parsePostgresPositiveInteger(connection.version), status = connection.status;
        const snapshotVersion = connection.snapshotVersion === null ? null : parsePostgresPositiveInteger(connection.snapshotVersion);
        // Operational status changes increment version without replacing the
        // snapshot. They must not shield the same snapshot from revocation.
        const versionChanged = command.connectionVersion > version ||
          (snapshotVersion !== null && command.connectionVersion < snapshotVersion);
        const scopeChanged = versionChanged || connection.wabaId !== command.wabaId ||
          connection.phoneNumberId !== command.phoneNumberId || connection.businessPortfolioId !== command.businessPortfolioId;
        const epoch = connection.snapshotStartedAt === null ? null : parsePostgresTimestamp(connection.snapshotStartedAt);
        for (const { event, digest } of entries) {
          const existing = await one(postgresMetaAccountLifecycleSql.existing, [command.wabaId, digest]);
          if (existing !== null) {
            if (parsePostgresPositiveInteger(requireExactPostgresRow(existing, ["tenantId"]).tenantId) !== command.tenantId) return fail();
            continue;
          }
          const beforeVersion = version;
          // Local snapshot time is not provider authorization time. Never ignore a
          // new removal solely because its trigger predates our database write.
          const eventSecond = Date.parse(event.occurredAt) / 1000;
          const epochSecond = epoch === null ? null : Math.floor(Date.parse(epoch) / 1000);
          const timing = epochSecond === null ? "unknown" : eventSecond < epochSecond ? "before-snapshot" : eventSecond === epochSecond ? "same-second" : "after-snapshot";
          const outcome = scopeChanged ? "connection-changed" :
            event.event === "ACCOUNT_RECONNECTED" ? "reconnected-observed" : status === "revoked" ? "already-revoked" : "revoked";
          if (outcome === "revoked") {
            const revoked = await one(postgresMetaSql.revokeConnection, [command.tenantId, command.wabaId, version]);
            if (revoked === null || parsePostgresPositiveInteger(requireExactPostgresRow(revoked, ["tenantId"]).tenantId) !== command.tenantId) return fail();
            version++; status = "revoked";
          }
          const inserted = await one(postgresMetaAccountLifecycleSql.insert, [command.tenantId,digest,command.receiptId,command.eventKey,command.wabaId,
            command.phoneNumberId,command.businessPortfolioId,command.connectionVersion,beforeVersion,version,event.event,event.occurredAt,epoch,timing,outcome,
            event.ownerBusinessId,event.reportedPhoneNumber,event.reason,event.initiatedBy]);
          if (requireExactPostgresRow(inserted, ["digest"]).digest !== digest) return fail();
          const audit = await one(postgresMetaAccountLifecycleSql.audit, [command.tenantId,digest,JSON.stringify({ event: event.event, outcome, timing, connectionVersion: command.connectionVersion })]);
          parsePostgresPositiveInteger(requireExactPostgresRow(audit, ["id"]).id);
        }
      });
    },
  });
}
