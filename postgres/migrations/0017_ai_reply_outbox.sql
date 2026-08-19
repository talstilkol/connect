-- PostgreSQL AI reply approval outbox.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE ai_reply_outbox (
  outbox_key TEXT PRIMARY KEY,
  request_key TEXT NOT NULL,
  audit_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  conversation_key TEXT NOT NULL,
  inbound_message_key TEXT NOT NULL,
  ai_agent_key TEXT NOT NULL,
  ai_agent_version_key TEXT NOT NULL,
  expected_conversation_version INTEGER NOT NULL,
  recipient_phone_e164 TEXT NOT NULL,
  response_mode TEXT NOT NULL,
  reply_text TEXT NOT NULL,
  grounded_source_keys_json JSONB NOT NULL,
  grounding_score_basis_points INTEGER NOT NULL,
  status TEXT NOT NULL,
  decided_by_external_user_id TEXT,
  decided_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT ai_reply_outbox_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT ai_reply_outbox_audit_fk
    FOREIGN KEY (tenant_id, audit_key)
    REFERENCES ai_runtime_audit_events (tenant_id, audit_key)
    ON DELETE CASCADE,
  CONSTRAINT ai_reply_outbox_key_valid
    CHECK (outbox_key ~ '^ai_reply_outbox_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_reply_outbox_request_key_valid
    CHECK (request_key ~ '^ai_provider_request_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_reply_outbox_audit_key_valid
    CHECK (audit_key ~ '^ai_runtime_audit_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_reply_outbox_conversation_key_valid
    CHECK (conversation_key ~ '^conversation_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_reply_outbox_message_key_valid
    CHECK (inbound_message_key ~ '^message_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_reply_outbox_agent_key_valid
    CHECK (ai_agent_key ~ '^ai_agent_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_reply_outbox_agent_version_key_valid
    CHECK (
      ai_agent_version_key ~ '^ai_agent_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT ai_reply_outbox_expected_version_positive
    CHECK (expected_conversation_version >= 1),
  CONSTRAINT ai_reply_outbox_phone_valid
    CHECK (recipient_phone_e164 ~ '^\+[1-9][0-9]{0,14}$'),
  CONSTRAINT ai_reply_outbox_response_mode_valid
    CHECK (response_mode IN ('automatic', 'agent-approval')),
  CONSTRAINT ai_reply_outbox_reply_text_bounded
    CHECK (
      length(btrim(reply_text)) BETWEEN 1 AND 4096
      AND reply_text !~ '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]'
    ),
  CONSTRAINT ai_reply_outbox_sources_json_valid
    CHECK (
      jsonb_typeof(grounded_source_keys_json) = 'array'
      AND jsonb_array_length(grounded_source_keys_json) BETWEEN 1 AND 100
      AND octet_length(grounded_source_keys_json::text) <= 100000
    ),
  CONSTRAINT ai_reply_outbox_grounding_valid
    CHECK (grounding_score_basis_points BETWEEN 0 AND 10000),
  CONSTRAINT ai_reply_outbox_status_valid
    CHECK (
      status IN ('awaiting-approval', 'ready-for-delivery', 'rejected')
    ),
  CONSTRAINT ai_reply_outbox_decider_bounded
    CHECK (
      decided_by_external_user_id IS NULL
      OR (
        length(btrim(decided_by_external_user_id)) BETWEEN 1 AND 255
        AND decided_by_external_user_id = btrim(decided_by_external_user_id)
        AND decided_by_external_user_id !~ '[[:cntrl:]]'
      )
    ),
  CONSTRAINT ai_reply_outbox_version_positive
    CHECK (version >= 1),
  CONSTRAINT ai_reply_outbox_state_consistent
    CHECK (
      (
        response_mode = 'automatic'
        AND status = 'ready-for-delivery'
        AND decided_by_external_user_id IS NULL
        AND decided_at IS NULL
        AND version = 1
      )
      OR
      (
        response_mode = 'agent-approval'
        AND status = 'awaiting-approval'
        AND decided_by_external_user_id IS NULL
        AND decided_at IS NULL
        AND version = 1
      )
      OR
      (
        response_mode = 'agent-approval'
        AND status IN ('ready-for-delivery', 'rejected')
        AND decided_by_external_user_id IS NOT NULL
        AND decided_at IS NOT NULL
        AND version >= 2
      )
    ),
  CONSTRAINT ai_reply_outbox_timestamps_valid
    CHECK (
      created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
      AND (
        decided_at IS NULL
        OR (
          decided_at = date_trunc('milliseconds', decided_at)
          AND decided_at >= created_at
          AND updated_at = decided_at
        )
      )
    ),
  CONSTRAINT ai_reply_outbox_tenant_key_uq
    UNIQUE (tenant_id, outbox_key),
  CONSTRAINT ai_reply_outbox_tenant_request_uq
    UNIQUE (tenant_id, request_key),
  CONSTRAINT ai_reply_outbox_tenant_inbound_uq
    UNIQUE (tenant_id, inbound_message_key)
);

CREATE INDEX ai_reply_outbox_tenant_status_created_idx
  ON ai_reply_outbox (tenant_id, status, created_at, outbox_key);
