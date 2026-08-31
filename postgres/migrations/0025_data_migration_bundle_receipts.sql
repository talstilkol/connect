CREATE TABLE data_migration_bundle_receipts (
  execution_scope TEXT PRIMARY KEY,
  bundle_id TEXT NOT NULL UNIQUE,
  bundle_version TEXT NOT NULL,
  source_digest TEXT NOT NULL UNIQUE,
  bundle_digest TEXT NOT NULL UNIQUE,
  plan_created_at TIMESTAMPTZ NOT NULL,
  plan_expires_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  slice_count INTEGER NOT NULL,
  table_count INTEGER NOT NULL,
  total_row_count BIGINT NOT NULL,
  evidence_digest TEXT NOT NULL UNIQUE,
  CONSTRAINT data_migration_bundle_scope_valid CHECK (
    execution_scope = 'full-d1-cutover'
  ),
  CONSTRAINT data_migration_bundle_id_valid CHECK (
    bundle_id ~ '^connect_postgres_full_data_migration_bundle_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT data_migration_bundle_version_valid CHECK (
    bundle_version = 'connect_postgres_full_data_migration_bundle_v1'
  ),
  CONSTRAINT data_migration_bundle_source_digest_valid CHECK (
    source_digest ~ '^hmac_sha256_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT data_migration_bundle_digest_valid CHECK (
    bundle_digest ~ '^hmac_sha256_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT data_migration_bundle_evidence_digest_valid CHECK (
    evidence_digest ~ '^hmac_sha256_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT data_migration_bundle_window_valid CHECK (
    plan_expires_at > plan_created_at
    AND plan_expires_at - plan_created_at <= INTERVAL '15 minutes'
  ),
  CONSTRAINT data_migration_bundle_execution_time_valid CHECK (
    executed_at >= plan_created_at
    AND executed_at <= plan_expires_at
  ),
  CONSTRAINT data_migration_bundle_counts_valid CHECK (
    slice_count = 10
    AND table_count = 51
    AND total_row_count >= 0
  )
);

CREATE INDEX data_migration_bundle_receipts_executed_idx
  ON data_migration_bundle_receipts (executed_at);

CREATE FUNCTION reject_data_migration_bundle_receipt_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Data migration bundle receipts are immutable';
END;
$$;

CREATE TRIGGER data_migration_bundle_receipts_immutable
BEFORE UPDATE OR DELETE ON data_migration_bundle_receipts
FOR EACH ROW
EXECUTE FUNCTION reject_data_migration_bundle_receipt_mutation();
