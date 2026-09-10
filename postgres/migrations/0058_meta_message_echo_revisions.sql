-- Durable, out-of-order Business App edits/revocations; no seed data.
ALTER TABLE messages ADD COLUMN content_state TEXT NOT NULL DEFAULT 'original';
ALTER TABLE messages ADD CONSTRAINT messages_content_state_valid CHECK (
  content_state = 'original' OR
  (direction = 'outbound' AND (
    (content_state = 'edited' AND content_kind = 'text') OR
    (content_state IN ('deleted', 'conflicted') AND content_kind = 'unsupported' AND text_content IS NULL)
  ))
);

CREATE TABLE meta_message_echo_states (
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  recipient_phone TEXT NOT NULL CHECK (recipient_phone ~ '^\+[1-9][0-9]{0,14}$'),
  original_digest TEXT CHECK (original_digest ~ '^[0-9a-f]{64}$'),
  content_state TEXT NOT NULL DEFAULT 'original' CHECK (content_state IN ('original', 'edited', 'deleted', 'conflicted')),
  edit_at TIMESTAMPTZ,
  edit_text TEXT,
  PRIMARY KEY (tenant_id, provider_message_id),
  CHECK (tenant_id > 0),
  CHECK (length(provider_message_id) BETWEEN 1 AND 255 AND provider_message_id = btrim(provider_message_id) AND provider_message_id !~ '[[:cntrl:]]'),
  CHECK (length(waba_id) BETWEEN 1 AND 255 AND waba_id = btrim(waba_id) AND waba_id !~ '[[:cntrl:]]'),
  CHECK (length(phone_number_id) BETWEEN 1 AND 255 AND phone_number_id = btrim(phone_number_id) AND phone_number_id !~ '[[:cntrl:]]'),
  CHECK (edit_at IS NULL OR (edit_at > '1970-01-01'::timestamptz AND edit_at = date_trunc('milliseconds', edit_at))),
  CHECK (
    (content_state IN ('original', 'deleted') AND edit_at IS NULL AND edit_text IS NULL) OR
    (content_state = 'edited' AND edit_at IS NOT NULL AND edit_text IS NOT NULL AND length(btrim(edit_text)) BETWEEN 1 AND 16384) OR
    (content_state = 'conflicted' AND edit_at IS NOT NULL AND edit_text IS NULL)
  )
);

CREATE TABLE meta_message_echo_events (
  tenant_id BIGINT NOT NULL,
  event_key TEXT NOT NULL CHECK (event_key ~ '^[0-9a-f]{64}$'),
  request_digest TEXT NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  provider_message_id TEXT NOT NULL,
  PRIMARY KEY (tenant_id, event_key),
  FOREIGN KEY (tenant_id, provider_message_id) REFERENCES meta_message_echo_states(tenant_id, provider_message_id) ON DELETE CASCADE
);
