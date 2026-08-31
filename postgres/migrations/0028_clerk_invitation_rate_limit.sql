ALTER TABLE api_mutation_rate_limit_buckets
  DROP CONSTRAINT api_mutation_rate_limit_policy_valid;

ALTER TABLE api_mutation_rate_limit_buckets
  ADD CONSTRAINT api_mutation_rate_limit_policy_valid CHECK (
    policy_id IN (
      'clerk-organization-invitation',
      'meta-webhook',
      'tenant-mutation',
      'system-admin-mutation'
    )
  );
