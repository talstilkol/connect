import { normalizeMetaContactSync, type MetaContactSyncChange } from '../meta/metaContactSync.ts';
import { normalizeMetaHistorySync, type MetaHistoryItem } from '../meta/metaHistorySync.ts';
import { sha256Hex } from '../meta/metaWebhookSecurity.ts';
import { captureMetaContactInTransaction } from './postgresMetaContactSyncRepository.ts';
import { captureMetaHistoryInTransaction } from './postgresMetaHistorySyncRepository.ts';
import { lockMetaSyncAttribution } from './postgresMetaSyncUnattributed.ts';
import { parsePostgresPositiveInteger, requireExactPostgresRow, requirePostgresRows } from './postgresResultValidation.ts';
import type { PostgresTransactionManager } from './postgresTransaction.ts';

// Also used by history projection after an approved late batch. This permits
// local projection only; media acquisition continues requiring the source's
// original connection version and never uses this broader read authorization.
export const postgresMetaSyncGenerationConnectionSql = `SELECT connection.tenant_id AS "tenantId"
  FROM meta_connections connection JOIN tenants tenant ON tenant.id=connection.tenant_id
  JOIN meta_sync_generation_authorizations permitted ON permitted.tenant_id=connection.tenant_id
    AND permitted.current_connection_version=connection.version AND permitted.sync_type=$5
  WHERE connection.tenant_id=$1 AND connection.waba_id=$2 AND connection.phone_number_id=$3
    AND permitted.source_connection_version=$4 FOR SHARE OF connection,tenant`;
const candidateSql = `SELECT a.tenant_id AS "tenantId",a.event_digest AS "eventDigest"
  FROM meta_sync_attributions a JOIN meta_sync_unattributed_events e USING(tenant_id,event_digest)
  LEFT JOIN meta_sync_generation_authorizations permitted ON permitted.tenant_id=a.tenant_id
    AND permitted.source_connection_version=a.connection_version AND permitted.sync_type=a.sync_type
  WHERE NOT EXISTS(SELECT 1 FROM meta_sync_attribution_imports i WHERE i.tenant_id=a.tenant_id AND i.event_digest=a.event_digest)
    AND (e.payload IS NULL OR permitted.tenant_id IS NOT NULL)
  ORDER BY a.recorded_at,a.tenant_id,a.event_digest LIMIT 1`;
const sourceSql = `SELECT e.waba_id AS "wabaId",e.phone_number_id AS "phoneNumberId",e.observed_connection_version AS "observedVersion",
  e.kind,e.payload,a.connection_version AS "targetVersion",a.sync_type AS "syncType"
  FROM meta_sync_attributions a JOIN meta_sync_unattributed_events e USING(tenant_id,event_digest)
  WHERE a.tenant_id=$1 AND a.event_digest=$2 AND NOT EXISTS(
    SELECT 1 FROM meta_sync_attribution_imports i WHERE i.tenant_id=a.tenant_id AND i.event_digest=a.event_digest)`;
const fail = (): never => { throw Error('SYNC_ATTRIBUTION_IMPORT_FAILED'); };
export function createPostgresMetaSyncAttributionImporter(transactions: PostgresTransactionManager) {
  return Object.freeze({
    async importNext(): Promise<'idle'|'imported'|'discarded'> {
      return transactions.transaction({isolationLevel:'read-committed'},async tx => {
        const raw = requirePostgresRows(await tx.query(candidateSql,[]),1)[0];
        if (!raw) return 'idle';
        const selected = requireExactPostgresRow(raw,['tenantId','eventDigest']);
        const tenantId = parsePostgresPositiveInteger(selected.tenantId), eventDigest = selected.eventDigest;
        if (typeof eventDigest!=='string'||!/^[a-f0-9]{64}$/.test(eventDigest)) return fail();
        await lockMetaSyncAttribution(tx,tenantId);
        const rows = requirePostgresRows(await tx.query(sourceSql,[tenantId,eventDigest]),1);
        if (!rows.length) return 'idle';
        const source = requireExactPostgresRow(rows[0],['wabaId','phoneNumberId','observedVersion','kind','payload','targetVersion','syncType']);
        let outcome: 'stored'|'duplicate'|'conflicted'|'discarded'|'updated'|'ignored' = 'discarded';
        if (source.payload !== null) {
          const scope = {tenantId,wabaId:source.wabaId as string,phoneNumberId:source.phoneNumberId as string,
            connectionVersion:parsePostgresPositiveInteger(source.observedVersion)};
          const contact = source.kind==='contact';
          if (source.syncType!==(contact?'smb_app_state_sync':'history')||!['contact','chunk','media'].includes(String(source.kind))) return fail();
          const normalized = contact ? normalizeMetaContactSync(scope,source.payload as MetaContactSyncChange).change
            : normalizeMetaHistorySync(scope,source.payload as MetaHistoryItem).item;
          if (await sha256Hex(new TextEncoder().encode(JSON.stringify({namespace:'meta_sync_unattributed_v1',scope,kind:source.kind,payload:normalized})))!==eventDigest) return fail();
          const target = {...scope,connectionVersion:parsePostgresPositiveInteger(source.targetVersion)};
          const allowed = requirePostgresRows(await tx.query(postgresMetaSyncGenerationConnectionSql,
            [tenantId,target.wabaId,target.phoneNumberId,target.connectionVersion,source.syncType as string]),1)[0];
          if (!allowed) return 'idle';
          if (parsePostgresPositiveInteger(requireExactPostgresRow(allowed,['tenantId']).tenantId)!==tenantId) return fail();
          const result = contact ? await captureMetaContactInTransaction(tx,target,normalized as MetaContactSyncChange)
            : await captureMetaHistoryInTransaction(tx,target,normalized as MetaHistoryItem);
          outcome = result.outcome==='declined'?'discarded':result.outcome;
        }
        await tx.query(`INSERT INTO meta_sync_attribution_imports(tenant_id,event_digest,outcome) VALUES($1,$2,$3)`,[tenantId,eventDigest,outcome]);
        await tx.query(`INSERT INTO audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
          VALUES($1,NULL,'meta.sync.attribution-imported','meta_sync_event',$2,$3::jsonb)`,[tenantId,eventDigest,JSON.stringify({outcome,connectionVersion:source.targetVersion})]);
        return outcome==='discarded'?'discarded':'imported';
      });
    },
  });
}
