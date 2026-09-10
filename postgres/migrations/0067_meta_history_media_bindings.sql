-- Immutable references only. A binding is not a downloaded file, a malware
-- verdict, ongoing authorization, or proof that history is complete.
ALTER TABLE meta_history_inbox_messages ADD CONSTRAINT meta_history_inbox_message_digest_binding
  UNIQUE (tenant_id, provider_message_id, message_digest);
ALTER TABLE meta_history_sync_media ADD CONSTRAINT meta_history_media_digest_binding
  UNIQUE (tenant_id, provider_message_id, content_digest);

CREATE TABLE meta_history_media_bindings (
  tenant_id BIGINT NOT NULL,
  provider_message_id TEXT NOT NULL,
  message_digest TEXT NOT NULL,
  media_digest TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('milliseconds', clock_timestamp()),
  PRIMARY KEY (tenant_id, provider_message_id),
  FOREIGN KEY (tenant_id, provider_message_id, message_digest)
    REFERENCES meta_history_inbox_messages(tenant_id, provider_message_id, message_digest) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, provider_message_id, media_digest)
    REFERENCES meta_history_sync_media(tenant_id, provider_message_id, content_digest) ON DELETE RESTRICT
);

CREATE FUNCTION guard_meta_history_media_binding_v1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original JSONB; media JSONB;
BEGIN
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
CREATE TRIGGER meta_history_media_binding_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_history_media_bindings
FOR EACH ROW EXECUTE FUNCTION guard_meta_history_media_binding_v1();
