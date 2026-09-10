-- Durable agent replies. No provider call occurs inside an API transaction.
-- An expired preparing claim is reclaimable; sending/unknown is never reclaimable.
CREATE TABLE manual_reply_outbox (
  delivery_key TEXT PRIMARY KEY CHECK (delivery_key ~ '^manual_reply_delivery_v1_[a-f0-9]{64}$'),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  conversation_key TEXT NOT NULL,
  actor_external_user_id TEXT NOT NULL CHECK (length(actor_external_user_id) BETWEEN 1 AND 255 AND actor_external_user_id = btrim(actor_external_user_id) AND actor_external_user_id !~ '[[:cntrl:]]'),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('owner', 'manager', 'agent')),
  expected_version INTEGER NOT NULL CHECK (expected_version > 0 AND expected_version < 2147483647),
  contact_id BIGINT NOT NULL,
  contact_version INTEGER NOT NULL CHECK (contact_version > 0),
  recipient_phone_number TEXT NOT NULL CHECK (recipient_phone_number ~ '^\+[1-9][0-9]{0,14}$'),
  text_content TEXT NOT NULL CHECK (length(btrim(text_content)) BETWEEN 1 AND 4096),
  business_portfolio_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  connection_version INTEGER NOT NULL CHECK (connection_version > 0),
  credential_revision BIGINT NOT NULL CHECK (credential_revision > 0),
  envelope_digest TEXT NOT NULL CHECK (envelope_digest ~ '^sha256:[a-f0-9]{64}$'),
  service_window_expires_at TIMESTAMPTZ NOT NULL,
  policy_event_key TEXT NOT NULL REFERENCES whatsapp_campaign_delivery_policy_events(event_key) ON DELETE RESTRICT,
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'preparing', 'sending', 'sent', 'failed', 'unknown')),
  claim_version INTEGER NOT NULL DEFAULT 0 CHECK (claim_version >= 0),
  claim_expires_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  reservation_key TEXT CHECK (reservation_key ~ '^whatsapp_rate_reservation_v1_[a-f0-9]{64}$'),
  provider_started_at TIMESTAMPTZ,
  provider_message_id TEXT CHECK (length(provider_message_id) BETWEEN 1 AND 255 AND provider_message_id = btrim(provider_message_id) AND provider_message_id !~ '[[:cntrl:]]'),
  error_code TEXT CHECK (error_code ~ '^[A-Z0-9_]{1,100}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  FOREIGN KEY (tenant_id, conversation_key) REFERENCES conversations(tenant_id, conversation_key) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, contact_id) REFERENCES contacts(tenant_id, id) ON DELETE RESTRICT,
  UNIQUE (tenant_id, delivery_key),
  UNIQUE (tenant_id, provider_message_id),
  CHECK (updated_at >= created_at),
  CHECK ((state = 'preparing') = (claim_expires_at IS NOT NULL)),
  CHECK ((state = 'sent') = (provider_message_id IS NOT NULL)),
  CHECK (state NOT IN ('sending', 'sent', 'unknown') OR (provider_started_at IS NOT NULL AND reservation_key IS NOT NULL))
);
CREATE INDEX manual_reply_outbox_claim_idx ON manual_reply_outbox (next_attempt_at, created_at, delivery_key) WHERE state IN ('queued', 'preparing');
CREATE INDEX manual_reply_outbox_conversation_idx ON manual_reply_outbox (tenant_id, conversation_key, created_at);
CREATE UNIQUE INDEX manual_reply_outbox_unresolved_conversation_uq ON manual_reply_outbox (tenant_id, conversation_key) WHERE state IN ('queued', 'preparing', 'sending', 'unknown');
CREATE INDEX manual_reply_outbox_sending_idx ON manual_reply_outbox (provider_started_at) WHERE state = 'sending';
