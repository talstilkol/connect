-- PostgreSQL conversation and message sources for operational reports.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE conversations (
  conversation_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  contact_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  assigned_external_user_id TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_key TEXT,
  last_message_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT conversations_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT conversations_contact_fk
    FOREIGN KEY (tenant_id, contact_id)
    REFERENCES contacts (tenant_id, id)
    ON DELETE CASCADE,
  CONSTRAINT conversations_key_valid
    CHECK (conversation_key ~ '^conversation_v1_[0-9a-f]{64}$'),
  CONSTRAINT conversations_status_valid
    CHECK (
      status IN (
        'new',
        'bot_active',
        'waiting_for_agent',
        'agent_active',
        'waiting_for_contact',
        'closed'
      )
    ),
  CONSTRAINT conversations_assignee_valid
    CHECK (
      assigned_external_user_id IS NULL
      OR (
        length(assigned_external_user_id) BETWEEN 1 AND 255
        AND assigned_external_user_id = btrim(assigned_external_user_id)
        AND assigned_external_user_id !~ '[[:cntrl:]]'
      )
    ),
  CONSTRAINT conversations_unread_count_nonnegative
    CHECK (unread_count >= 0),
  CONSTRAINT conversations_last_message_key_valid
    CHECK (
      last_message_key IS NULL
      OR last_message_key ~ '^message_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT conversations_last_message_pair_consistent
    CHECK (
      (last_message_key IS NULL AND last_message_at IS NULL)
      OR
      (last_message_key IS NOT NULL AND last_message_at IS NOT NULL)
    ),
  CONSTRAINT conversations_last_message_at_milliseconds
    CHECK (
      last_message_at IS NULL
      OR last_message_at = date_trunc('milliseconds', last_message_at)
    ),
  CONSTRAINT conversations_version_positive
    CHECK (version >= 1),
  CONSTRAINT conversations_created_at_milliseconds
    CHECK (created_at = date_trunc('milliseconds', created_at)),
  CONSTRAINT conversations_updated_at_valid
    CHECK (
      updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT conversations_tenant_key_uq
    UNIQUE (tenant_id, conversation_key),
  CONSTRAINT conversations_tenant_contact_uq
    UNIQUE (tenant_id, contact_id)
);

CREATE INDEX conversations_tenant_status_activity_idx
  ON conversations (tenant_id, status, last_message_at);

CREATE INDEX conversations_tenant_activity_idx
  ON conversations (tenant_id, last_message_at);

CREATE TABLE messages (
  message_key TEXT PRIMARY KEY,
  conversation_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  provider_message_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  content_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  text_content TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  status_updated_at TIMESTAMPTZ NOT NULL,
  last_status_event_key TEXT,
  last_status_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT messages_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT messages_conversation_fk
    FOREIGN KEY (tenant_id, conversation_key)
    REFERENCES conversations (tenant_id, conversation_key)
    ON DELETE CASCADE,
  CONSTRAINT messages_key_valid
    CHECK (message_key ~ '^message_v1_[0-9a-f]{64}$'),
  CONSTRAINT messages_conversation_key_valid
    CHECK (conversation_key ~ '^conversation_v1_[0-9a-f]{64}$'),
  CONSTRAINT messages_provider_id_valid
    CHECK (
      length(provider_message_id) BETWEEN 1 AND 255
      AND provider_message_id = btrim(provider_message_id)
      AND provider_message_id !~ '[[:cntrl:]]'
    ),
  CONSTRAINT messages_direction_valid
    CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT messages_content_kind_valid
    CHECK (
      content_kind IN (
        'text',
        'image',
        'audio',
        'video',
        'document',
        'sticker',
        'location',
        'contacts',
        'interactive',
        'unsupported'
      )
    ),
  CONSTRAINT messages_status_valid
    CHECK (status IN ('received', 'sent', 'delivered', 'read', 'failed')),
  CONSTRAINT messages_direction_status_consistent
    CHECK (
      (direction = 'inbound' AND status = 'received')
      OR
      (
        direction = 'outbound'
        AND status IN ('sent', 'delivered', 'read', 'failed')
      )
    ),
  CONSTRAINT messages_content_consistent
    CHECK (
      (
        content_kind = 'text'
        AND text_content IS NOT NULL
        AND length(btrim(text_content)) BETWEEN 1 AND 16384
      )
      OR
      (content_kind <> 'text' AND text_content IS NULL)
    ),
  CONSTRAINT messages_occurred_at_milliseconds
    CHECK (occurred_at = date_trunc('milliseconds', occurred_at)),
  CONSTRAINT messages_status_updated_at_valid
    CHECK (
      status_updated_at = date_trunc('milliseconds', status_updated_at)
      AND status_updated_at >= occurred_at
    ),
  CONSTRAINT messages_status_event_key_valid
    CHECK (
      last_status_event_key IS NULL
      OR last_status_event_key ~ '^[0-9a-f]{64}$'
    ),
  CONSTRAINT messages_status_event_pair_consistent
    CHECK (
      (last_status_event_key IS NULL AND last_status_event_at IS NULL)
      OR
      (
        last_status_event_key IS NOT NULL
        AND last_status_event_at IS NOT NULL
      )
    ),
  CONSTRAINT messages_status_event_at_valid
    CHECK (
      last_status_event_at IS NULL
      OR (
        last_status_event_at = date_trunc('milliseconds', last_status_event_at)
        AND last_status_event_at >= occurred_at
      )
    ),
  CONSTRAINT messages_created_at_milliseconds
    CHECK (created_at = date_trunc('milliseconds', created_at)),
  CONSTRAINT messages_updated_at_valid
    CHECK (
      updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT messages_tenant_key_uq
    UNIQUE (tenant_id, message_key),
  CONSTRAINT messages_tenant_provider_id_uq
    UNIQUE (tenant_id, provider_message_id)
);

CREATE INDEX messages_tenant_conversation_time_idx
  ON messages (tenant_id, conversation_key, occurred_at, message_key);

CREATE INDEX messages_tenant_occurred_idx
  ON messages (tenant_id, occurred_at);
