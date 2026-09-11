import { lockMetaSyncAttribution, retainUnattributedMetaSync } from './postgresMetaSyncUnattributed.ts';
import { normalizeMetaContactSync, reduceMetaContactSync, type MetaContactSyncRepository, type MetaContactSyncState, type MetaContactSyncScope, type MetaContactSyncChange } from "../meta/metaContactSync.ts";
import { MetaWebhookProcessorError } from "../meta/metaWebhookIngress.ts";
import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
import { isWhatsAppDisplayName } from "../../shared/domain/contactDisplayName.ts";
import { parsePostgresPositiveInteger, parsePostgresTimestamp, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";

// Correlated to contacts. A disconnected or different Meta account cannot
// supply the display name, and local first/last names retain their precedence.
export const postgresWhatsAppContactNameSql = `SELECT COALESCE(sync.full_name, sync.first_name)
  FROM meta_contact_sync_states AS sync JOIN meta_connections AS connection
    ON connection.tenant_id = sync.tenant_id AND connection.waba_id = sync.waba_id
      AND connection.phone_number_id = sync.phone_number_id AND connection.status = 'connected'
  WHERE sync.tenant_id = contacts.tenant_id AND sync.contact_phone = contacts.phone_e164 AND sync.status = 'present'`;

export const postgresMetaContactSyncSql = Object.freeze({
  lockConnection: `SELECT connection.tenant_id AS "tenantId" FROM meta_connections AS connection
    JOIN tenants AS tenant ON tenant.id = connection.tenant_id AND tenant.status IN ('active', 'trial', 'payment_failed')
    WHERE connection.tenant_id = $1 AND connection.waba_id = $2 AND connection.phone_number_id = $3
      AND connection.version = $4 AND connection.status = 'connected' FOR SHARE OF connection, tenant`,
  insertState: `INSERT INTO meta_contact_sync_states (tenant_id, waba_id, phone_number_id, contact_phone, occurred_at, status, full_name, first_name)
    VALUES ($1, $2, $3, $4, $5::timestamptz, $6, $7, $8) ON CONFLICT DO NOTHING RETURNING contact_phone AS "phoneNumber"`,
  lockState: `SELECT occurred_at AS "occurredAt", status, full_name AS "fullName", first_name AS "firstName"
    FROM meta_contact_sync_states WHERE tenant_id = $1 AND waba_id = $2 AND phone_number_id = $3 AND contact_phone = $4 FOR UPDATE`,
  claimEvent: `INSERT INTO meta_contact_sync_events (tenant_id, event_key, waba_id, phone_number_id, contact_phone)
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING event_key AS "eventKey"`,
  updateState: `UPDATE meta_contact_sync_states SET occurred_at = $5::timestamptz, status = $6, full_name = $7, first_name = $8
    WHERE tenant_id = $1 AND waba_id = $2 AND phone_number_id = $3 AND contact_phone = $4 RETURNING contact_phone AS "phoneNumber"`,
  ensureContact: `INSERT INTO contacts (tenant_id, phone_e164) VALUES ($1, $2)
    ON CONFLICT (tenant_id, phone_e164) DO NOTHING RETURNING id`,
});

async function one(tx: PostgresTransaction, sql: string, parameters: readonly PostgresParameter[]) {
  return requirePostgresRows(await tx.query(sql, parameters), 1)[0] ?? null;
}
function requireKey(value: unknown, field: string, expected: string) {
  if (requireExactPostgresRow(value, [field])[field] !== expected) throw new MetaWebhookProcessorError("CONTACT_SYNC_STORAGE_FAILED");
}
function parseState(value: unknown): MetaContactSyncState {
  const row = requireExactPostgresRow(value, ["occurredAt", "status", "fullName", "firstName"]);
  if (!["present", "removed", "conflicted"].includes(String(row.status)) ||
    (row.fullName !== null && !isWhatsAppDisplayName(row.fullName)) ||
    (row.firstName !== null && !isWhatsAppDisplayName(row.firstName)) ||
    (row.status !== "present" && (row.fullName !== null || row.firstName !== null))) {
    throw new MetaWebhookProcessorError("CONTACT_SYNC_STORAGE_FAILED");
  }
  return { occurredAt: parsePostgresTimestamp(row.occurredAt), status: row.status as MetaContactSyncState["status"],
    fullName: row.fullName as string | null, firstName: row.firstName as string | null };
}

export function createPostgresMetaContactSyncRepository(transactions: PostgresTransactionManager): MetaContactSyncRepository {
  return Object.freeze({
    async record(rawScope: MetaContactSyncScope, rawChange: MetaContactSyncChange) {
      const { scope, change } = normalizeMetaContactSync(rawScope, rawChange);
      const eventKey = await sha256Hex(new TextEncoder().encode(JSON.stringify({
        namespace: "whatsapp_contact_sync_v1", tenantId: scope.tenantId, wabaId: scope.wabaId,
        phoneNumberId: scope.phoneNumberId, change,
      })));
      const keys = [scope.tenantId, scope.wabaId, scope.phoneNumberId, change.phoneNumber] as const;
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await lockMetaSyncAttribution(tx,scope.tenantId);
        const connection = await one(tx, postgresMetaContactSyncSql.lockConnection,
          [scope.tenantId, scope.wabaId, scope.phoneNumberId, scope.connectionVersion]);
        if (connection === null || parsePostgresPositiveInteger(requireExactPostgresRow(connection, ["tenantId"]).tenantId) !== scope.tenantId) {
          throw new MetaWebhookProcessorError("CONTACT_SYNC_CONNECTION_CHANGED");
        }
        if (await retainUnattributedMetaSync(tx, scope, 'contact', change)) return { outcome: 'unattributed' as const };
        const initial = reduceMetaContactSync(null, change);
        const inserted = await one(tx, postgresMetaContactSyncSql.insertState,
          [...keys, initial.occurredAt, initial.status, initial.fullName, initial.firstName]);
        if (inserted !== null) requireKey(inserted, "phoneNumber", change.phoneNumber);
        const state = parseState(await one(tx, postgresMetaContactSyncSql.lockState, keys));
        const claimed = await one(tx, postgresMetaContactSyncSql.claimEvent,
          [scope.tenantId, eventKey, scope.wabaId, scope.phoneNumberId, change.phoneNumber]);
        if (claimed === null) return { outcome: "duplicate" as const };
        requireKey(claimed, "eventKey", eventKey);
        const next = reduceMetaContactSync(state, change);
        if (inserted === null && next === state) return { outcome: "ignored" as const };
        requireKey(await one(tx, postgresMetaContactSyncSql.updateState,
          [...keys, next.occurredAt, next.status, next.fullName, next.firstName]), "phoneNumber", change.phoneNumber);
        if (next.status === "present") {
          const contact = await one(tx, postgresMetaContactSyncSql.ensureContact, [scope.tenantId, change.phoneNumber]);
          if (contact !== null) parsePostgresPositiveInteger(requireExactPostgresRow(contact, ["id"]).id);
        }
        return { outcome: "updated" as const };
      });
    },
  });
}
