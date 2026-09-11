import type { PostgresQueryExecutor, PostgresTransactionManager } from "./postgresTransaction.ts";

export const paidAccessTenantBarrier = "SELECT pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1($1))";
// Call after the tenant barrier. The second statement takes a fresh snapshot
// after waiting for a concurrent billing reconciliation or suspension.
export const paidAccessTenantSql = "SELECT id FROM tenants WHERE id=$1 AND public.tenant_paid_access_allowed_v1(id) FOR SHARE";
export function createPostgresPaidAccess(deps: { transactions: PostgresTransactionManager }) {
  return {
    async allowed(tenantId: number): Promise<boolean> {
      if (!Number.isSafeInteger(tenantId) || tenantId < 1) throw new Error("Paid access tenant is invalid");
      return deps.transactions.transaction({ isolationLevel: "read-committed" }, async (tx: PostgresQueryExecutor) => {
        await tx.query(paidAccessTenantBarrier, [tenantId]);
        const result = await tx.query(paidAccessTenantSql, [tenantId]);
        if (result.rowCount !== result.rows.length || result.rowCount > 1) throw new Error("Paid access result is invalid");
        return result.rowCount === 1;
      });
    },
  };
}

// Keep reads and actions that stop activity available for recovery. The default
// for every other core mutation, including newly added mutations, is paid.
export function requiresPaidAccess(operation: string, kind: "query" | "mutation", payload: Readonly<Record<string, unknown>> = {}): boolean {
  if (operation === "campaigns.control" && ["pause", "cancel"].includes(String(payload.action))) return false;
  return kind === "mutation" && ![
    "contacts.consent.unsubscribe", "conversations.mark-read", "conversations.assignment.change",
  ].includes(operation);
}
