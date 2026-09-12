import { requireExactPostgresRow, requirePostgresRows } from '../platform/postgresResultValidation.ts';
import type { PostgresTransactionManager } from '../platform/postgresTransaction.ts';
const keys = ['tenantId','eventDigest','connectionVersion'];
const proposalKeys = [...keys,'schemaVersion','snapshotDigest','operatorRole','preparedAt','providerRequestId','kind','sourceWabaId','sourcePhoneNumberId'];
const fail = (): never => { throw Error('META_SYNC_ATTRIBUTION_BLOCKED'); };
function input(raw: unknown, proposal = false) {
  const row = Object.freeze({...requireExactPostgresRow(raw,proposal ? proposalKeys : keys)});
  if (!Number.isSafeInteger(row.tenantId)||Number(row.tenantId)<1||!Number.isSafeInteger(row.connectionVersion)||Number(row.connectionVersion)<1||
    typeof row.eventDigest!=='string'||!/^[a-f0-9]{64}$/.test(row.eventDigest)) return fail();
  return {row,tenantId: Number(row.tenantId),eventDigest: row.eventDigest,connectionVersion: Number(row.connectionVersion)};
}
export function createMetaSyncAttribution(transactions: PostgresTransactionManager) {
  return Object.freeze({
    async prepare(raw: unknown) {
      const {tenantId,eventDigest,connectionVersion} = input(raw);
      return transactions.transaction({isolationLevel:'read-committed'},async q => {
        const response = requireExactPostgresRow(requirePostgresRows(await q.query(
          'SELECT public.meta_sync_attribution_snapshot_v1($1,$2,$3) AS value',[tenantId,eventDigest,connectionVersion]),1)[0],['value']);
        const snapshot = requireExactPostgresRow(response.value,proposalKeys.filter(k=>!keys.includes(k)&&k!=='schemaVersion'));
        return {schemaVersion:1,tenantId,eventDigest,connectionVersion,...snapshot,preparedAt:new Date(String(snapshot.preparedAt)).toISOString()};
      });
    },
    async apply(raw: unknown, evidenceDigest: string) {
      const {row,tenantId,eventDigest,connectionVersion} = input(raw,true);
      if (row.schemaVersion!==1||typeof row.snapshotDigest!=='string'||!/^[a-f0-9]{64}$/.test(row.snapshotDigest)||
        typeof evidenceDigest!=='string'||!/^[a-f0-9]{64}$/.test(evidenceDigest)||typeof row.operatorRole!=='string'||row.operatorRole.length<1||row.operatorRole.length>63||
        typeof row.providerRequestId!=='string'||row.providerRequestId.length<1||row.providerRequestId.length>255||typeof row.preparedAt!=='string'||
        !Number.isFinite(Date.parse(row.preparedAt))||new Date(row.preparedAt).toISOString()!==row.preparedAt||
        !['chunk','media','contact'].includes(String(row.kind))||typeof row.sourceWabaId!=='string'||!/^[1-9][0-9]{0,254}$/.test(row.sourceWabaId)||
        typeof row.sourcePhoneNumberId!=='string'||!/^[1-9][0-9]{0,254}$/.test(row.sourcePhoneNumberId)) return fail();
      return transactions.transaction({isolationLevel:'read-committed'},async q => {
        // Bind the human-readable proposal identity too. A forged display
        // field must not survive merely because its original digest is valid.
        const current = requireExactPostgresRow(requirePostgresRows(await q.query(
          'SELECT public.meta_sync_attribution_snapshot_v1($1,$2,$3) AS value',[tenantId,eventDigest,connectionVersion]),1)[0],['value']);
        const snapshot = requireExactPostgresRow(current.value,proposalKeys.filter(k=>!keys.includes(k)&&k!=='schemaVersion'));
        if (['kind','sourceWabaId','sourcePhoneNumberId','providerRequestId','operatorRole'].some(k=>row[k]!==snapshot[k])) return fail();
        const saved = requireExactPostgresRow(requirePostgresRows(await q.query(
          'SELECT public.apply_meta_sync_attribution_v1($1,$2,$3,$4,$5::timestamptz,$6,$7,$8) AS key',
          [tenantId,eventDigest,connectionVersion,row.snapshotDigest as string,row.preparedAt as string,row.operatorRole as string,row.providerRequestId as string,evidenceDigest]),1)[0],['key']);
        if (typeof saved.key!=='string'||!/^meta_sync_attribution_v1_[a-f0-9]{64}$/.test(saved.key)) return fail();
        return {outcome:'attributed' as const,attributionKey:saved.key};
      });
    },
  });
}
