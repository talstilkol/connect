-- References into immutable captured chunks, without another copy of message
-- text. The live messages table remains the source of automation/window data.
ALTER TABLE meta_history_sync_chunks ADD CONSTRAINT meta_history_chunk_digest_binding
  UNIQUE (tenant_id, phase, chunk_order, content_digest);

CREATE TABLE meta_history_inbox_cursors (
  tenant_id BIGINT NOT NULL,
  phase INTEGER NOT NULL,
  chunk_order INTEGER NOT NULL,
  content_digest TEXT NOT NULL,
  next_index INTEGER NOT NULL DEFAULT 0 CHECK (next_index BETWEEN 0 AND 10000),
  PRIMARY KEY (tenant_id, phase, chunk_order),
  FOREIGN KEY (tenant_id, phase, chunk_order, content_digest)
    REFERENCES meta_history_sync_chunks(tenant_id, phase, chunk_order, content_digest) ON DELETE RESTRICT
);

CREATE TABLE meta_history_inbox_messages (
  tenant_id BIGINT NOT NULL,
  provider_message_id TEXT NOT NULL CHECK (length(provider_message_id) BETWEEN 1 AND 255 AND provider_message_id = btrim(provider_message_id) AND provider_message_id !~ '[[:cntrl:]]'),
  message_key TEXT NOT NULL CHECK (message_key ~ '^message_v1_[0-9a-f]{64}$'),
  conversation_key TEXT NOT NULL,
  phase INTEGER NOT NULL,
  chunk_order INTEGER NOT NULL,
  content_digest TEXT NOT NULL,
  message_index INTEGER NOT NULL CHECK (message_index BETWEEN 0 AND 9999),
  message_digest TEXT NOT NULL CHECK (message_digest ~ '^[0-9a-f]{64}$'),
  occurred_at TIMESTAMPTZ NOT NULL CHECK (occurred_at > '1970-01-01'::timestamptz AND occurred_at = date_trunc('milliseconds', occurred_at)),
  conflicted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', clock_timestamp()),
  PRIMARY KEY (tenant_id, provider_message_id),
  UNIQUE (tenant_id, message_key),
  FOREIGN KEY (tenant_id, conversation_key) REFERENCES conversations(tenant_id, conversation_key) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, phase, chunk_order, content_digest)
    REFERENCES meta_history_sync_chunks(tenant_id, phase, chunk_order, content_digest) ON DELETE RESTRICT
);
CREATE INDEX meta_history_inbox_conversation_time ON meta_history_inbox_messages(tenant_id, conversation_key, occurred_at, message_key);

CREATE FUNCTION guard_meta_history_inbox_cursor_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'History projection cursor cannot be reset'; END IF;
  IF ROW(NEW.tenant_id, NEW.phase, NEW.chunk_order, NEW.content_digest) IS DISTINCT FROM ROW(OLD.tenant_id, OLD.phase, OLD.chunk_order, OLD.content_digest)
    OR NEW.next_index < OLD.next_index THEN RAISE EXCEPTION 'Invalid history projection cursor'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_history_inbox_cursor_guard BEFORE UPDATE OR DELETE ON meta_history_inbox_cursors
FOR EACH ROW EXECUTE FUNCTION guard_meta_history_inbox_cursor_v1();

CREATE FUNCTION guard_meta_history_inbox_message_v1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE captured JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'History projection cannot be reset'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'conflicted') IS DISTINCT FROM (to_jsonb(OLD) - 'conflicted') OR (OLD.conflicted AND NOT NEW.conflicted) THEN
      RAISE EXCEPTION 'History projection identity is immutable';
    END IF;
    RETURN NEW;
  END IF;
  SELECT chunk.payload->'messages'->NEW.message_index INTO captured
    FROM meta_history_sync_chunks AS chunk
    JOIN conversations AS conversation ON conversation.tenant_id = NEW.tenant_id AND conversation.conversation_key = NEW.conversation_key
    JOIN contacts AS contact ON contact.tenant_id = conversation.tenant_id AND contact.id = conversation.contact_id
    WHERE chunk.tenant_id = NEW.tenant_id AND chunk.phase = NEW.phase AND chunk.chunk_order = NEW.chunk_order
      AND chunk.content_digest = NEW.content_digest AND NOT chunk.conflicted
      AND chunk.payload->'messages'->NEW.message_index->>'threadPhoneNumber' = contact.phone_e164;
  IF captured IS NULL OR captured->>'providerMessageId' IS DISTINCT FROM NEW.provider_message_id
    OR (captured->>'occurredAt')::timestamptz IS DISTINCT FROM NEW.occurred_at THEN
    RAISE EXCEPTION 'History projection does not match captured data';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_history_inbox_message_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_history_inbox_messages
FOR EACH ROW EXECUTE FUNCTION guard_meta_history_inbox_message_v1();
