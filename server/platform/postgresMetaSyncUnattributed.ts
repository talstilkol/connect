import type { MetaContactSyncScope } from '../meta/metaContactSync.ts';
import { sha256Hex } from '../meta/metaWebhookSecurity.ts';
import { requireExactPostgresRow, requirePostgresRows } from './postgresResultValidation.ts';
import type { PostgresTransaction } from './postgresTransaction.ts';

// Separate serialization for capture/refusal; no tenant row-lock upgrade while
// media workers hold a history session. Hash collisions only serialize work.
export async function lockMetaSyncAttribution(tx: PostgresTransaction, tenantId: number) {
  await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('meta_sync_attribution_v1:' || $1::text,0))",[tenantId]);
}

// The caller already holds the current connection/tenant scope lock. Observed
// connection identity is receiver context, never a provider generation token.
export async function retainUnattributedMetaSync(tx: PostgresTransaction, scope: MetaContactSyncScope,
  kind: 'chunk' | 'media' | 'declined' | 'contact', payload: object): Promise<boolean> {
  const prior = requirePostgresRows(await tx.query(`SELECT EXISTS (SELECT 1 FROM meta_data_sync_requests
    WHERE tenant_id=$1 AND connection_version<>$2 AND dispatched_at IS NOT NULL) AS ambiguous`,
    [scope.tenantId,scope.connectionVersion]),1);
  const ambiguous = requireExactPostgresRow(prior[0],['ambiguous']).ambiguous;
  if (typeof ambiguous !== 'boolean') throw new Error('Invalid sync attribution state');
  if (!ambiguous) return false;
  const digest = await sha256Hex(new TextEncoder().encode(JSON.stringify({ namespace:'meta_sync_unattributed_v1',scope,kind,payload })));
  // Serialize refusal and ingestion, including before the new signup's Worker
  // has created its requests. Refusal is deliberately conservative across the
  // unresolved generations of the same business phone.
  if (kind==='declined') await tx.query(`UPDATE meta_sync_unattributed_events SET payload=NULL
    WHERE tenant_id=$1 AND waba_id=$2 AND phone_number_id=$3 AND payload IS NOT NULL`,[scope.tenantId,scope.wabaId,scope.phoneNumberId]);
  await tx.query(`INSERT INTO meta_sync_unattributed_events
    (tenant_id,event_digest,waba_id,phone_number_id,observed_connection_version,kind,payload)
    VALUES ($1,$2,$3,$4,$5,$6,CASE WHEN $6='declined' OR EXISTS (SELECT 1 FROM meta_sync_unattributed_events
      WHERE tenant_id=$1 AND waba_id=$3 AND phone_number_id=$4 AND kind='declined') THEN NULL ELSE $7::jsonb END)
    ON CONFLICT DO NOTHING`,[scope.tenantId,digest,scope.wabaId,scope.phoneNumberId,scope.connectionVersion,kind,JSON.stringify(payload)]);
  return true;
}
