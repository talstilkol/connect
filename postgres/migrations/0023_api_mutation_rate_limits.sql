CREATE TABLE api_mutation_rate_limit_buckets (
  policy_id TEXT NOT NULL,
  policy_version INTEGER NOT NULL,
  subject_key TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  refill_period_seconds INTEGER NOT NULL,
  available_tokens NUMERIC(20, 9) NOT NULL,
  refilled_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (policy_id, policy_version, subject_key),
  CONSTRAINT api_mutation_rate_limit_policy_valid CHECK (
    policy_id IN (
      'meta-webhook',
      'tenant-mutation',
      'system-admin-mutation'
    )
  ),
  CONSTRAINT api_mutation_rate_limit_policy_version_valid CHECK (
    policy_version BETWEEN 1 AND 2147483647
  ),
  CONSTRAINT api_mutation_rate_limit_subject_key_valid CHECK (
    subject_key ~ '^rate_limit_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT api_mutation_rate_limit_capacity_valid CHECK (
    capacity BETWEEN 1 AND 1000000
  ),
  CONSTRAINT api_mutation_rate_limit_refill_period_valid CHECK (
    refill_period_seconds BETWEEN 1 AND 86400
  ),
  CONSTRAINT api_mutation_rate_limit_tokens_valid CHECK (
    available_tokens >= 0
    AND available_tokens <= capacity
  ),
  CONSTRAINT api_mutation_rate_limit_time_valid CHECK (
    updated_at >= refilled_at
  )
);

CREATE INDEX api_mutation_rate_limit_buckets_updated_idx
  ON api_mutation_rate_limit_buckets (updated_at);
