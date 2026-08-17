-- PostgreSQL bot flow and delivery sources for operational reports.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE bot_flows (
  bot_flow_key TEXT PRIMARY KEY,
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
  CONSTRAINT bot_flows_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT bot_flows_key_valid
    CHECK (bot_flow_key ~ '^bot_flow_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_flows_name_valid
    CHECK (
      length(btrim(name)) BETWEEN 1 AND 160
      AND name !~ '[[:cntrl:]]'
    ),
  CONSTRAINT bot_flows_status_valid
    CHECK (status IN ('draft', 'active', 'inactive')),
  CONSTRAINT bot_flows_latest_version_key_valid
    CHECK (
      latest_version_key ~ '^bot_flow_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_flows_active_version_key_valid
    CHECK (
      active_version_key IS NULL
      OR active_version_key ~ '^bot_flow_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_flows_active_state_consistent
    CHECK (
      (status = 'draft' AND active_version_key IS NULL)
      OR
      (
        status IN ('active', 'inactive')
        AND active_version_key IS NOT NULL
      )
    ),
  CONSTRAINT bot_flows_latest_version_positive
    CHECK (latest_version_number >= 1),
  CONSTRAINT bot_flows_version_positive
    CHECK (version >= 1),
  CONSTRAINT bot_flows_timestamps_valid
    CHECK (
      created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT bot_flows_tenant_key_uq
    UNIQUE (tenant_id, bot_flow_key)
);

CREATE INDEX bot_flows_tenant_status_updated_idx
  ON bot_flows (tenant_id, status, updated_at);

CREATE TABLE bot_flow_versions (
  bot_flow_version_key TEXT PRIMARY KEY,
  bot_flow_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  definition_json JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT bot_flow_versions_flow_fk
    FOREIGN KEY (tenant_id, bot_flow_key)
    REFERENCES bot_flows (tenant_id, bot_flow_key)
    ON DELETE CASCADE,
  CONSTRAINT bot_flow_versions_key_valid
    CHECK (
      bot_flow_version_key ~ '^bot_flow_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_flow_versions_flow_key_valid
    CHECK (bot_flow_key ~ '^bot_flow_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_flow_versions_number_positive
    CHECK (version_number >= 1),
  CONSTRAINT bot_flow_versions_status_valid
    CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT bot_flow_versions_definition_json_bounded
    CHECK (octet_length(definition_json::text) BETWEEN 2 AND 1000000),
  CONSTRAINT bot_flow_versions_publication_consistent
    CHECK (
      (status = 'draft' AND published_at IS NULL)
      OR
      (
        status IN ('published', 'archived')
        AND published_at IS NOT NULL
      )
    ),
  CONSTRAINT bot_flow_versions_timestamps_valid
    CHECK (
      (
        published_at IS NULL
        OR published_at = date_trunc('milliseconds', published_at)
      )
      AND created_at = date_trunc('milliseconds', created_at)
    ),
  CONSTRAINT bot_flow_versions_tenant_key_uq
    UNIQUE (tenant_id, bot_flow_version_key),
  CONSTRAINT bot_flow_versions_tenant_flow_version_key_uq
    UNIQUE (tenant_id, bot_flow_key, bot_flow_version_key),
  CONSTRAINT bot_flow_versions_tenant_number_uq
    UNIQUE (tenant_id, bot_flow_key, version_number)
);

CREATE UNIQUE INDEX bot_flow_versions_one_published_uq
  ON bot_flow_versions (tenant_id, bot_flow_key)
  WHERE status = 'published';

CREATE INDEX bot_flow_versions_tenant_flow_idx
  ON bot_flow_versions (tenant_id, bot_flow_key, version_number);

CREATE TABLE bot_reply_deliveries (
  delivery_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  conversation_key TEXT NOT NULL,
  inbound_message_key TEXT NOT NULL,
  bot_flow_key TEXT NOT NULL,
  bot_flow_version_key TEXT NOT NULL,
  reply_index INTEGER NOT NULL,
  recipient_phone_e164 TEXT NOT NULL,
  reply_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  provider_message_id TEXT,
  last_error_code TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT bot_reply_deliveries_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT bot_reply_deliveries_conversation_fk
    FOREIGN KEY (tenant_id, conversation_key)
    REFERENCES conversations (tenant_id, conversation_key)
    ON DELETE CASCADE,
  CONSTRAINT bot_reply_deliveries_inbound_message_fk
    FOREIGN KEY (tenant_id, inbound_message_key)
    REFERENCES messages (tenant_id, message_key)
    ON DELETE CASCADE,
  CONSTRAINT bot_reply_deliveries_flow_version_fk
    FOREIGN KEY (tenant_id, bot_flow_key, bot_flow_version_key)
    REFERENCES bot_flow_versions (
      tenant_id,
      bot_flow_key,
      bot_flow_version_key
    )
    ON DELETE RESTRICT,
  CONSTRAINT bot_reply_deliveries_key_valid
    CHECK (delivery_key ~ '^bot_reply_delivery_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_deliveries_conversation_key_valid
    CHECK (conversation_key ~ '^conversation_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_deliveries_inbound_key_valid
    CHECK (inbound_message_key ~ '^message_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_deliveries_flow_key_valid
    CHECK (bot_flow_key ~ '^bot_flow_v1_[0-9a-f]{64}$'),
  CONSTRAINT bot_reply_deliveries_version_key_valid
    CHECK (
      bot_flow_version_key ~ '^bot_flow_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT bot_reply_deliveries_reply_index_positive
    CHECK (reply_index >= 1),
  CONSTRAINT bot_reply_deliveries_phone_valid
    CHECK (recipient_phone_e164 ~ '^\+[1-9][0-9]{0,14}$'),
  CONSTRAINT bot_reply_deliveries_reply_json_bounded
    CHECK (octet_length(reply_json::text) BETWEEN 2 AND 50000),
  CONSTRAINT bot_reply_deliveries_status_valid
    CHECK (
      status IN ('pending', 'sending', 'accepted', 'rejected', 'ambiguous')
    ),
  CONSTRAINT bot_reply_deliveries_attempt_count_nonnegative
    CHECK (attempt_count >= 0),
  CONSTRAINT bot_reply_deliveries_provider_id_valid
    CHECK (
      provider_message_id IS NULL
      OR (
        length(btrim(provider_message_id)) BETWEEN 1 AND 255
        AND provider_message_id !~ '[[:cntrl:]]'
      )
    ),
  CONSTRAINT bot_reply_deliveries_error_code_valid
    CHECK (
      last_error_code IS NULL
      OR last_error_code ~ '^[A-Z0-9_]{1,100}$'
    ),
  CONSTRAINT bot_reply_deliveries_state_consistent
    CHECK (
      (
        status = 'pending'
        AND attempt_count = 0
        AND provider_message_id IS NULL
        AND last_error_code IS NULL
        AND accepted_at IS NULL
      )
      OR
      (
        status = 'sending'
        AND attempt_count >= 1
        AND provider_message_id IS NULL
        AND last_error_code IS NULL
        AND accepted_at IS NULL
      )
      OR
      (
        status = 'accepted'
        AND attempt_count >= 1
        AND provider_message_id IS NOT NULL
        AND last_error_code IS NULL
        AND accepted_at IS NOT NULL
      )
      OR
      (
        status IN ('rejected', 'ambiguous')
        AND attempt_count >= 1
        AND provider_message_id IS NULL
        AND last_error_code IS NOT NULL
        AND accepted_at IS NULL
      )
    ),
  CONSTRAINT bot_reply_deliveries_timestamps_valid
    CHECK (
      (
        accepted_at IS NULL
        OR accepted_at = date_trunc('milliseconds', accepted_at)
      )
      AND created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT bot_reply_deliveries_tenant_key_uq
    UNIQUE (tenant_id, delivery_key),
  CONSTRAINT bot_reply_deliveries_inbound_reply_uq
    UNIQUE (tenant_id, inbound_message_key, reply_index)
);

CREATE UNIQUE INDEX bot_reply_deliveries_provider_id_uq
  ON bot_reply_deliveries (tenant_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX bot_reply_deliveries_tenant_status_idx
  ON bot_reply_deliveries (tenant_id, status, created_at);

CREATE INDEX bot_reply_deliveries_tenant_created_idx
  ON bot_reply_deliveries (tenant_id, created_at);
