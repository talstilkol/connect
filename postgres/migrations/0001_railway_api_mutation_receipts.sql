-- PostgreSQL receipt schema for the provider-neutral Railway mutation executor.

CREATE TABLE railway_api_mutation_receipts (
  tenant_id BIGINT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  actor_external_user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  CONSTRAINT railway_api_mutation_receipts_pk
    PRIMARY KEY (tenant_id, operation, idempotency_key),
  CONSTRAINT railway_api_mutation_receipts_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE RESTRICT,
  CONSTRAINT railway_api_mutation_receipts_tenant_check
    CHECK (tenant_id > 0),
  CONSTRAINT railway_api_mutation_receipts_operation_check
    CHECK (
      operation ~ '^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){1,3}$'
    ),
  CONSTRAINT railway_api_mutation_receipts_idempotency_check
    CHECK (
      idempotency_key ~ '^connect_idempotency_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT railway_api_mutation_receipts_digest_check
    CHECK (
      request_digest ~ '^railway_mutation_request_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT railway_api_mutation_receipts_actor_check
    CHECK (
      length(actor_external_user_id) BETWEEN 1 AND 512
      AND actor_external_user_id = btrim(actor_external_user_id)
      AND actor_external_user_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT railway_api_mutation_receipts_status_check
    CHECK (status IN ('processing', 'completed')),
  CONSTRAINT railway_api_mutation_receipts_completion_check
    CHECK (
      (
        status = 'processing'
        AND response_json IS NULL
        AND completed_at IS NULL
      )
      OR
      (
        status = 'completed'
        AND response_json IS NOT NULL
        AND completed_at IS NOT NULL
        AND completed_at >= created_at
      )
    )
);
