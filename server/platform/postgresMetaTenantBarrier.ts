// Materialized and referenced by each write, so the database-derived lock is
// acquired before its row mutation. The xact lock remains until COMMIT/ROLLBACK,
// including when a caller runs the statement in an explicit larger transaction.
export const postgresMetaTenantBarrierCte = `tenant_barrier AS MATERIALIZED (
  SELECT pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1($1)) AS acquired
)`;
