-- Bind newly observed original captions without changing legacy v1 receipts.
-- NULL means the old ingestion contract never observed a caption, not empty text.
-- Only a digest is retained here; edits/deletions replace the visible message text.
ALTER TABLE meta_message_echo_states ADD COLUMN original_caption_digest TEXT;
ALTER TABLE meta_message_echo_states ADD CONSTRAINT meta_message_echo_original_caption_digest_valid CHECK (
  original_caption_digest IS NULL OR
  (original_digest IS NOT NULL AND original_caption_digest ~ '^[0-9a-f]{64}$')
);

ALTER TABLE messages DROP CONSTRAINT messages_content_consistent;
ALTER TABLE messages ADD CONSTRAINT messages_content_consistent CHECK (
  (content_kind = 'text' AND text_content IS NOT NULL AND length(btrim(text_content)) BETWEEN 1 AND 16384) OR
  (content_kind <> 'text' AND text_content IS NULL) OR
  (direction = 'outbound' AND content_state IN ('original', 'edited') AND content_kind IN ('image', 'video', 'document')
    AND text_content IS NOT NULL AND length(text_content) <= 16384 AND length(btrim(text_content)) > 0)
);
