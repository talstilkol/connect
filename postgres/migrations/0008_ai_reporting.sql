-- PostgreSQL AI runtime sources for operational reports.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE ai_agents (
  ai_agent_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  latest_version_key TEXT NOT NULL,
  latest_version_number INTEGER NOT NULL,
  active_version_key TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT ai_agents_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT ai_agents_key_valid
    CHECK (ai_agent_key ~ '^ai_agent_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_agents_name_valid
    CHECK (
      length(btrim(name)) BETWEEN 1 AND 160
      AND name !~ '[[:cntrl:]]'
    ),
  CONSTRAINT ai_agents_status_valid
    CHECK (status IN ('draft', 'active', 'inactive')),
  CONSTRAINT ai_agents_latest_version_key_valid
    CHECK (
      latest_version_key ~ '^ai_agent_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT ai_agents_active_version_key_valid
    CHECK (
      active_version_key IS NULL
      OR active_version_key ~ '^ai_agent_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT ai_agents_active_state_consistent
    CHECK (
      (status = 'draft' AND active_version_key IS NULL)
      OR
      (
        status IN ('active', 'inactive')
        AND active_version_key IS NOT NULL
      )
    ),
  CONSTRAINT ai_agents_latest_version_positive
    CHECK (latest_version_number >= 1),
  CONSTRAINT ai_agents_version_positive
    CHECK (version >= 1),
  CONSTRAINT ai_agents_timestamps_valid
    CHECK (
      created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT ai_agents_tenant_key_uq
    UNIQUE (tenant_id, ai_agent_key)
);

CREATE INDEX ai_agents_tenant_status_updated_idx
  ON ai_agents (tenant_id, status, updated_at);

CREATE TABLE ai_agent_versions (
  ai_agent_version_key TEXT PRIMARY KEY,
  ai_agent_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  definition_json JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT ai_agent_versions_agent_fk
    FOREIGN KEY (tenant_id, ai_agent_key)
    REFERENCES ai_agents (tenant_id, ai_agent_key)
    ON DELETE CASCADE,
  CONSTRAINT ai_agent_versions_key_valid
    CHECK (
      ai_agent_version_key ~ '^ai_agent_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT ai_agent_versions_agent_key_valid
    CHECK (ai_agent_key ~ '^ai_agent_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_agent_versions_number_positive
    CHECK (version_number >= 1),
  CONSTRAINT ai_agent_versions_status_valid
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT ai_agent_versions_definition_json_bounded
    CHECK (octet_length(definition_json::text) BETWEEN 2 AND 1000000),
  CONSTRAINT ai_agent_versions_publication_consistent
    CHECK (
      (status = 'draft' AND published_at IS NULL)
      OR
      (
        status IN ('published', 'archived')
        AND published_at IS NOT NULL
      )
    ),
  CONSTRAINT ai_agent_versions_timestamps_valid
    CHECK (
      (
        published_at IS NULL
        OR published_at = date_trunc('milliseconds', published_at)
      )
      AND created_at = date_trunc('milliseconds', created_at)
    ),
  CONSTRAINT ai_agent_versions_tenant_key_uq
    UNIQUE (tenant_id, ai_agent_version_key),
  CONSTRAINT ai_agent_versions_tenant_agent_version_key_uq
    UNIQUE (tenant_id, ai_agent_key, ai_agent_version_key),
  CONSTRAINT ai_agent_versions_tenant_number_uq
    UNIQUE (tenant_id, ai_agent_key, version_number)
);

CREATE UNIQUE INDEX ai_agent_versions_one_published_uq
  ON ai_agent_versions (tenant_id, ai_agent_key)
  WHERE status = 'published';

CREATE INDEX ai_agent_versions_tenant_agent_idx
  ON ai_agent_versions (tenant_id, ai_agent_key, version_number);

CREATE TABLE ai_runtime_cost_authorizations (
  request_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  ai_agent_key TEXT NOT NULL,
  period_start DATE NOT NULL,
  monthly_limit_minor_units BIGINT NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT ai_runtime_cost_authorizations_agent_fk
    FOREIGN KEY (tenant_id, ai_agent_key)
    REFERENCES ai_agents (tenant_id, ai_agent_key)
    ON DELETE CASCADE,
  CONSTRAINT ai_runtime_cost_authorizations_request_key_valid
    CHECK (request_key ~ '^ai_provider_request_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_runtime_cost_authorizations_period_start_valid
    CHECK (period_start = date_trunc('month', period_start)::date),
  CONSTRAINT ai_runtime_cost_authorizations_limit_positive
    CHECK (monthly_limit_minor_units BETWEEN 1 AND 9007199254740991),
  CONSTRAINT ai_runtime_cost_authorizations_currency_valid
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT ai_runtime_cost_authorizations_created_at_milliseconds
    CHECK (created_at = date_trunc('milliseconds', created_at)),
  CONSTRAINT ai_runtime_cost_authorizations_tenant_request_uq
    UNIQUE (tenant_id, request_key)
);

CREATE INDEX ai_runtime_cost_authorizations_tenant_agent_period_idx
  ON ai_runtime_cost_authorizations (tenant_id, ai_agent_key, period_start);

CREATE TABLE ai_runtime_usage (
  request_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  ai_agent_key TEXT NOT NULL,
  period_start DATE NOT NULL,
  input_tokens BIGINT NOT NULL,
  output_tokens BIGINT NOT NULL,
  cost_minor_units BIGINT NOT NULL,
  currency TEXT NOT NULL,
  within_limit BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT ai_runtime_usage_authorization_fk
    FOREIGN KEY (tenant_id, request_key)
    REFERENCES ai_runtime_cost_authorizations (tenant_id, request_key)
    ON DELETE CASCADE,
  CONSTRAINT ai_runtime_usage_agent_fk
    FOREIGN KEY (tenant_id, ai_agent_key)
    REFERENCES ai_agents (tenant_id, ai_agent_key)
    ON DELETE CASCADE,
  CONSTRAINT ai_runtime_usage_request_key_valid
    CHECK (request_key ~ '^ai_provider_request_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_runtime_usage_period_start_valid
    CHECK (period_start = date_trunc('month', period_start)::date),
  CONSTRAINT ai_runtime_usage_input_tokens_nonnegative
    CHECK (input_tokens BETWEEN 0 AND 9007199254740991),
  CONSTRAINT ai_runtime_usage_output_tokens_positive
    CHECK (output_tokens BETWEEN 1 AND 9007199254740991),
  CONSTRAINT ai_runtime_usage_cost_nonnegative
    CHECK (cost_minor_units BETWEEN 0 AND 9007199254740991),
  CONSTRAINT ai_runtime_usage_currency_valid
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT ai_runtime_usage_created_at_milliseconds
    CHECK (created_at = date_trunc('milliseconds', created_at)),
  CONSTRAINT ai_runtime_usage_tenant_request_uq
    UNIQUE (tenant_id, request_key)
);

CREATE INDEX ai_runtime_usage_tenant_agent_period_idx
  ON ai_runtime_usage (tenant_id, ai_agent_key, period_start);

CREATE INDEX ai_runtime_usage_tenant_created_idx
  ON ai_runtime_usage (tenant_id, created_at);

CREATE TABLE ai_runtime_audit_events (
  audit_key TEXT PRIMARY KEY,
  request_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  conversation_key TEXT NOT NULL,
  inbound_message_key TEXT NOT NULL,
  ai_agent_key TEXT NOT NULL,
  ai_agent_version_key TEXT NOT NULL,
  expected_conversation_version INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  reason TEXT,
  response_mode TEXT NOT NULL,
  grounding_score_basis_points INTEGER,
  input_tokens BIGINT,
  output_tokens BIGINT,
  cost_minor_units BIGINT,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT ai_runtime_audit_events_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT ai_runtime_audit_events_conversation_fk
    FOREIGN KEY (tenant_id, conversation_key)
    REFERENCES conversations (tenant_id, conversation_key)
    ON DELETE CASCADE,
  CONSTRAINT ai_runtime_audit_events_message_fk
    FOREIGN KEY (tenant_id, inbound_message_key)
    REFERENCES messages (tenant_id, message_key)
    ON DELETE CASCADE,
  CONSTRAINT ai_runtime_audit_events_agent_version_fk
    FOREIGN KEY (tenant_id, ai_agent_key, ai_agent_version_key)
    REFERENCES ai_agent_versions (
      tenant_id,
      ai_agent_key,
      ai_agent_version_key
    )
    ON DELETE CASCADE,
  CONSTRAINT ai_runtime_audit_events_audit_key_valid
    CHECK (audit_key ~ '^ai_runtime_audit_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_runtime_audit_events_request_key_valid
    CHECK (request_key ~ '^ai_provider_request_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_runtime_audit_events_conversation_key_valid
    CHECK (conversation_key ~ '^conversation_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_runtime_audit_events_message_key_valid
    CHECK (inbound_message_key ~ '^message_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_runtime_audit_events_agent_key_valid
    CHECK (ai_agent_key ~ '^ai_agent_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_runtime_audit_events_version_key_valid
    CHECK (
      ai_agent_version_key ~ '^ai_agent_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT ai_runtime_audit_events_expected_version_positive
    CHECK (expected_conversation_version >= 1),
  CONSTRAINT ai_runtime_audit_events_outcome_valid
    CHECK (outcome IN ('reply-planned', 'handoff')),
  CONSTRAINT ai_runtime_audit_events_reason_valid
    CHECK (
      reason IS NULL
      OR reason IN (
        'customer-request',
        'no-approved-knowledge',
        'grounding-below-threshold',
        'provider-unavailable',
        'budget-exhausted',
        'policy-violation'
      )
    ),
  CONSTRAINT ai_runtime_audit_events_response_mode_valid
    CHECK (response_mode IN ('automatic', 'agent-approval')),
  CONSTRAINT ai_runtime_audit_events_grounding_valid
    CHECK (
      grounding_score_basis_points IS NULL
      OR grounding_score_basis_points BETWEEN 0 AND 10000
    ),
  CONSTRAINT ai_runtime_audit_events_usage_valid
    CHECK (
      (
        input_tokens IS NULL
        AND output_tokens IS NULL
        AND cost_minor_units IS NULL
      )
      OR
      (
        input_tokens BETWEEN 0 AND 9007199254740991
        AND output_tokens BETWEEN 1 AND 9007199254740991
        AND cost_minor_units BETWEEN 0 AND 9007199254740991
      )
    ),
  CONSTRAINT ai_runtime_audit_events_currency_valid
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT ai_runtime_audit_events_state_consistent
    CHECK (
      (
        outcome = 'reply-planned'
        AND reason IS NULL
        AND grounding_score_basis_points IS NOT NULL
        AND input_tokens IS NOT NULL
      )
      OR
      (
        outcome = 'handoff'
        AND reason IS NOT NULL
      )
    ),
  CONSTRAINT ai_runtime_audit_events_created_at_milliseconds
    CHECK (created_at = date_trunc('milliseconds', created_at)),
  CONSTRAINT ai_runtime_audit_events_tenant_audit_uq
    UNIQUE (tenant_id, audit_key),
  CONSTRAINT ai_runtime_audit_events_tenant_request_uq
    UNIQUE (tenant_id, request_key)
);

CREATE INDEX ai_runtime_audit_events_tenant_conversation_created_idx
  ON ai_runtime_audit_events (tenant_id, conversation_key, created_at);

CREATE INDEX ai_runtime_audit_events_tenant_agent_created_idx
  ON ai_runtime_audit_events (tenant_id, ai_agent_key, created_at);

CREATE INDEX ai_runtime_audit_events_tenant_created_idx
  ON ai_runtime_audit_events (tenant_id, created_at);
