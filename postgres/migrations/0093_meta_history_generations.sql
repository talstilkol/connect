-- Preserve every original value, digest, cursor and media receipt. The added
-- source version is derived only from the pre-migration single session.
ALTER TABLE meta_history_sync_events ADD COLUMN connection_version INTEGER;
ALTER TABLE meta_history_sync_chunks ADD COLUMN connection_version INTEGER;
ALTER TABLE meta_history_sync_media ADD COLUMN connection_version INTEGER;
ALTER TABLE meta_history_inbox_cursors ADD COLUMN connection_version INTEGER;
ALTER TABLE meta_history_inbox_messages ADD COLUMN connection_version INTEGER;
ALTER TABLE meta_history_media_bindings ADD COLUMN connection_version INTEGER;

CREATE OR REPLACE FUNCTION guard_meta_history_event_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only the additive migration can encounter a NULL original generation.
  -- All columns are made NOT NULL below; future identity changes remain denied.
  IF TG_OP='UPDATE' AND OLD.connection_version IS NULL
    AND (to_jsonb(NEW)-'connection_version')=(to_jsonb(OLD)-'connection_version')
    AND NEW.connection_version=(SELECT connection_version FROM meta_history_sync_sessions WHERE tenant_id=OLD.tenant_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'History event receipt is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION guard_meta_history_payload_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only the additive migration can encounter a NULL original generation.
  -- All columns are made NOT NULL below; future identity changes remain denied.
  IF TG_OP='UPDATE' AND OLD.connection_version IS NULL
    AND (to_jsonb(NEW)-'connection_version')=(to_jsonb(OLD)-'connection_version')
    AND NEW.connection_version=(SELECT connection_version FROM meta_history_sync_sessions WHERE tenant_id=OLD.tenant_id) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'History receipt cannot be reset'; END IF;
  IF (to_jsonb(NEW) - 'payload' - 'conflicted') IS DISTINCT FROM (to_jsonb(OLD) - 'payload' - 'conflicted')
    OR (NEW.payload IS NOT NULL AND NEW.payload IS DISTINCT FROM OLD.payload)
    OR (OLD.conflicted AND NOT NEW.conflicted) THEN
    RAISE EXCEPTION 'History content cannot be replaced or restored';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_meta_history_inbox_cursor_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only the additive migration can encounter a NULL original generation.
  -- All columns are made NOT NULL below; future identity changes remain denied.
  IF TG_OP='UPDATE' AND OLD.connection_version IS NULL
    AND (to_jsonb(NEW)-'connection_version')=(to_jsonb(OLD)-'connection_version')
    AND NEW.connection_version=(SELECT connection_version FROM meta_history_sync_sessions WHERE tenant_id=OLD.tenant_id) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'History projection cursor cannot be reset'; END IF;
  IF ROW(NEW.tenant_id, NEW.phase, NEW.chunk_order, NEW.content_digest) IS DISTINCT FROM ROW(OLD.tenant_id, OLD.phase, OLD.chunk_order, OLD.content_digest)
    OR NEW.next_index < OLD.next_index THEN RAISE EXCEPTION 'Invalid history projection cursor'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_meta_history_inbox_message_v1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE captured JSONB;
BEGIN
  -- Only the additive migration can encounter a NULL original generation.
  -- All columns are made NOT NULL below; future identity changes remain denied.
  IF TG_OP='UPDATE' AND OLD.connection_version IS NULL
    AND (to_jsonb(NEW)-'connection_version')=(to_jsonb(OLD)-'connection_version')
    AND NEW.connection_version=(SELECT connection_version FROM meta_history_sync_sessions WHERE tenant_id=OLD.tenant_id) THEN
    RETURN NEW;
  END IF;
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

CREATE OR REPLACE FUNCTION guard_meta_history_media_binding_v1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original JSONB; media JSONB;
BEGIN
  -- Only the additive migration can encounter a NULL original generation.
  -- All columns are made NOT NULL below; future identity changes remain denied.
  IF TG_OP='UPDATE' AND OLD.connection_version IS NULL
    AND (to_jsonb(NEW)-'connection_version')=(to_jsonb(OLD)-'connection_version')
    AND NEW.connection_version=(SELECT connection_version FROM meta_history_sync_sessions WHERE tenant_id=OLD.tenant_id) THEN
    RETURN NEW;
  END IF;
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'History media binding is immutable'; END IF;
  SELECT chunk.payload->'messages'->message.message_index, asset.payload INTO original, media
    FROM meta_history_inbox_messages AS message
    JOIN meta_history_sync_chunks AS chunk ON chunk.tenant_id = message.tenant_id AND chunk.phase = message.phase
      AND chunk.chunk_order = message.chunk_order AND chunk.content_digest = message.content_digest AND NOT chunk.conflicted
    JOIN meta_history_sync_media AS asset ON asset.tenant_id = message.tenant_id
      AND asset.provider_message_id = message.provider_message_id AND asset.content_digest = NEW.media_digest AND NOT asset.conflicted
    JOIN meta_history_sync_sessions AS session ON session.tenant_id = message.tenant_id
      AND session.sharing_state = 'data_received' AND NOT session.has_conflict
    WHERE message.tenant_id = NEW.tenant_id AND message.provider_message_id = NEW.provider_message_id
      AND message.message_digest = NEW.message_digest AND NOT message.conflicted;
  IF original IS NULL OR media IS NULL OR original->>'providerMessageId' IS DISTINCT FROM NEW.provider_message_id
    OR media->>'providerMessageId' IS DISTINCT FROM NEW.provider_message_id OR media->>'kind' IS DISTINCT FROM 'media'
    OR COALESCE(media->>'contentKind', '') NOT IN ('image', 'audio', 'video', 'document', 'sticker')
    OR ((original->>'contentKind' = 'media_placeholder' AND original->'content' = 'null'::jsonb)
      OR (original->>'contentKind' = media->>'contentKind' AND jsonb_typeof(original->'content') = 'object')) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'History media sources do not match';
  END IF;
  IF original->>'contentKind' <> 'media_placeholder' AND EXISTS (
    SELECT 1 FROM jsonb_each(original->'content') AS field
    WHERE media->'content' ? field.key AND media->'content'->field.key IS DISTINCT FROM field.value
  ) THEN RAISE EXCEPTION 'History media content conflicts'; END IF;
  RETURN NEW;
END;
$$;
UPDATE meta_history_sync_events AS item SET connection_version=session.connection_version FROM meta_history_sync_sessions AS session WHERE session.tenant_id=item.tenant_id;
ALTER TABLE meta_history_sync_events ALTER COLUMN connection_version SET NOT NULL, ADD CHECK(connection_version>0);
UPDATE meta_history_sync_chunks AS item SET connection_version=session.connection_version FROM meta_history_sync_sessions AS session WHERE session.tenant_id=item.tenant_id;
ALTER TABLE meta_history_sync_chunks ALTER COLUMN connection_version SET NOT NULL, ADD CHECK(connection_version>0);
UPDATE meta_history_sync_media AS item SET connection_version=session.connection_version FROM meta_history_sync_sessions AS session WHERE session.tenant_id=item.tenant_id;
ALTER TABLE meta_history_sync_media ALTER COLUMN connection_version SET NOT NULL, ADD CHECK(connection_version>0);
UPDATE meta_history_inbox_cursors AS item SET connection_version=session.connection_version FROM meta_history_sync_sessions AS session WHERE session.tenant_id=item.tenant_id;
ALTER TABLE meta_history_inbox_cursors ALTER COLUMN connection_version SET NOT NULL, ADD CHECK(connection_version>0);
UPDATE meta_history_inbox_messages AS item SET connection_version=session.connection_version FROM meta_history_sync_sessions AS session WHERE session.tenant_id=item.tenant_id;
ALTER TABLE meta_history_inbox_messages ALTER COLUMN connection_version SET NOT NULL, ADD CHECK(connection_version>0);
UPDATE meta_history_media_bindings AS item SET connection_version=session.connection_version FROM meta_history_sync_sessions AS session WHERE session.tenant_id=item.tenant_id;
ALTER TABLE meta_history_media_bindings ALTER COLUMN connection_version SET NOT NULL, ADD CHECK(connection_version>0);

DO $$
DECLARE relation REGCLASS; reference REGCLASS; constraint_name NAME;
BEGIN
  FOR relation,reference IN SELECT * FROM (VALUES
    ('meta_history_sync_events'::regclass,'meta_history_sync_sessions'::regclass),
    ('meta_history_sync_chunks'::regclass,'meta_history_sync_sessions'::regclass),
    ('meta_history_sync_media'::regclass,'meta_history_sync_sessions'::regclass),
    ('meta_history_inbox_cursors'::regclass,'meta_history_sync_chunks'::regclass),
    ('meta_history_inbox_messages'::regclass,'meta_history_sync_chunks'::regclass),
    ('meta_history_media_bindings'::regclass,'meta_history_sync_media'::regclass),
    ('meta_history_media_bindings'::regclass,'meta_history_inbox_messages'::regclass)
  ) AS replacements(relation,reference) LOOP
    FOR constraint_name IN SELECT conname FROM pg_constraint WHERE conrelid=relation AND confrelid=reference AND contype='f' LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',relation,constraint_name);
    END LOOP;
  END LOOP;
END;
$$;
ALTER TABLE meta_history_sync_sessions DROP CONSTRAINT meta_history_sync_sessions_pkey,
  ADD PRIMARY KEY(tenant_id,connection_version), ADD UNIQUE(tenant_id,started_at);
ALTER TABLE meta_history_sync_chunks DROP CONSTRAINT meta_history_sync_chunks_pkey,
  DROP CONSTRAINT meta_history_chunk_digest_binding,
  ADD PRIMARY KEY(tenant_id,connection_version,phase,chunk_order),
  ADD UNIQUE(tenant_id,connection_version,phase,chunk_order,content_digest);
ALTER TABLE meta_history_sync_media DROP CONSTRAINT meta_history_sync_media_pkey,
  DROP CONSTRAINT meta_history_media_digest_binding,
  ADD PRIMARY KEY(tenant_id,connection_version,provider_message_id),
  ADD UNIQUE(tenant_id,connection_version,provider_message_id,content_digest);
ALTER TABLE meta_history_inbox_cursors DROP CONSTRAINT meta_history_inbox_cursors_pkey,
  ADD PRIMARY KEY(tenant_id,connection_version,phase,chunk_order);
-- Inbox identity remains tenant/provider-message unique across all cycles.
-- A duplicate in a newer cycle does not replace an earlier immutable source.
ALTER TABLE meta_history_inbox_messages ADD UNIQUE(tenant_id,provider_message_id,message_digest,connection_version);
ALTER TABLE meta_history_sync_events ADD FOREIGN KEY(tenant_id,connection_version) REFERENCES meta_history_sync_sessions(tenant_id,connection_version) ON DELETE RESTRICT;
ALTER TABLE meta_history_sync_chunks ADD FOREIGN KEY(tenant_id,connection_version) REFERENCES meta_history_sync_sessions(tenant_id,connection_version) ON DELETE RESTRICT;
ALTER TABLE meta_history_sync_media ADD FOREIGN KEY(tenant_id,connection_version) REFERENCES meta_history_sync_sessions(tenant_id,connection_version) ON DELETE RESTRICT;
ALTER TABLE meta_history_inbox_cursors ADD FOREIGN KEY(tenant_id,connection_version,phase,chunk_order,content_digest) REFERENCES meta_history_sync_chunks(tenant_id,connection_version,phase,chunk_order,content_digest) ON DELETE RESTRICT;
ALTER TABLE meta_history_inbox_messages ADD FOREIGN KEY(tenant_id,connection_version,phase,chunk_order,content_digest) REFERENCES meta_history_sync_chunks(tenant_id,connection_version,phase,chunk_order,content_digest) ON DELETE RESTRICT;
ALTER TABLE meta_history_media_bindings
  ADD FOREIGN KEY(tenant_id,provider_message_id,message_digest,connection_version) REFERENCES meta_history_inbox_messages(tenant_id,provider_message_id,message_digest,connection_version) ON DELETE RESTRICT,
  ADD FOREIGN KEY(tenant_id,connection_version,provider_message_id,media_digest) REFERENCES meta_history_sync_media(tenant_id,connection_version,provider_message_id,content_digest) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION guard_meta_history_event_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'History event receipt is immutable';
END;
$$;

CREATE OR REPLACE FUNCTION guard_meta_history_payload_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'History receipt cannot be reset'; END IF;
  IF (to_jsonb(NEW) - 'payload' - 'conflicted') IS DISTINCT FROM (to_jsonb(OLD) - 'payload' - 'conflicted')
    OR (NEW.payload IS NOT NULL AND NEW.payload IS DISTINCT FROM OLD.payload)
    OR (OLD.conflicted AND NOT NEW.conflicted) THEN
    RAISE EXCEPTION 'History content cannot be replaced or restored';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_meta_history_inbox_cursor_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'History projection cursor cannot be reset'; END IF;
  IF ROW(NEW.tenant_id, NEW.connection_version, NEW.phase, NEW.chunk_order, NEW.content_digest) IS DISTINCT FROM ROW(OLD.tenant_id, OLD.connection_version, OLD.phase, OLD.chunk_order, OLD.content_digest)
    OR NEW.next_index < OLD.next_index THEN RAISE EXCEPTION 'Invalid history projection cursor'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_meta_history_inbox_message_v1() RETURNS trigger LANGUAGE plpgsql AS $$
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
    WHERE chunk.tenant_id = NEW.tenant_id AND chunk.connection_version = NEW.connection_version AND chunk.phase = NEW.phase AND chunk.chunk_order = NEW.chunk_order
      AND chunk.content_digest = NEW.content_digest AND NOT chunk.conflicted
      AND chunk.payload->'messages'->NEW.message_index->>'threadPhoneNumber' = contact.phone_e164;
  IF captured IS NULL OR captured->>'providerMessageId' IS DISTINCT FROM NEW.provider_message_id
    OR (captured->>'occurredAt')::timestamptz IS DISTINCT FROM NEW.occurred_at THEN
    RAISE EXCEPTION 'History projection does not match captured data';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION guard_meta_history_media_binding_v1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original JSONB; media JSONB;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'History media binding is immutable'; END IF;
  SELECT chunk.payload->'messages'->message.message_index, asset.payload INTO original, media
    FROM meta_history_inbox_messages AS message
    JOIN meta_history_sync_chunks AS chunk ON chunk.tenant_id = message.tenant_id AND chunk.connection_version = message.connection_version AND chunk.phase = message.phase
      AND chunk.chunk_order = message.chunk_order AND chunk.content_digest = message.content_digest AND NOT chunk.conflicted
    JOIN meta_history_sync_media AS asset ON asset.tenant_id = message.tenant_id AND asset.connection_version = message.connection_version
      AND asset.provider_message_id = message.provider_message_id AND asset.content_digest = NEW.media_digest AND NOT asset.conflicted
    JOIN meta_history_sync_sessions AS session ON session.tenant_id = message.tenant_id AND session.connection_version = message.connection_version
      AND session.sharing_state = 'data_received' AND NOT session.has_conflict
    WHERE message.tenant_id = NEW.tenant_id AND message.connection_version = NEW.connection_version AND message.provider_message_id = NEW.provider_message_id
      AND message.message_digest = NEW.message_digest AND NOT message.conflicted;
  IF original IS NULL OR media IS NULL OR original->>'providerMessageId' IS DISTINCT FROM NEW.provider_message_id
    OR media->>'providerMessageId' IS DISTINCT FROM NEW.provider_message_id OR media->>'kind' IS DISTINCT FROM 'media'
    OR COALESCE(media->>'contentKind', '') NOT IN ('image', 'audio', 'video', 'document', 'sticker')
    OR ((original->>'contentKind' = 'media_placeholder' AND original->'content' = 'null'::jsonb)
      OR (original->>'contentKind' = media->>'contentKind' AND jsonb_typeof(original->'content') = 'object')) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'History media sources do not match';
  END IF;
  IF original->>'contentKind' <> 'media_placeholder' AND EXISTS (
    SELECT 1 FROM jsonb_each(original->'content') AS field
    WHERE media->'content' ? field.key AND media->'content'->field.key IS DISTINCT FROM field.value
  ) THEN RAISE EXCEPTION 'History media content conflicts'; END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE meta_history_inbox_messages ADD UNIQUE(tenant_id,message_key,connection_version);
ALTER TABLE meta_media_upload_jobs ADD FOREIGN KEY(tenant_id,message_key,connection_version)
  REFERENCES meta_history_inbox_messages(tenant_id,message_key,connection_version) ON DELETE RESTRICT;
ALTER TABLE meta_media_tasks ADD FOREIGN KEY(tenant_id,message_key,connection_version)
  REFERENCES meta_history_inbox_messages(tenant_id,message_key,connection_version) ON DELETE RESTRICT;
