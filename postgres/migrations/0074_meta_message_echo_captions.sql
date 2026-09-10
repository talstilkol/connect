-- Extend existing revision state; preserve legacy text edit identity and receipts.
ALTER TABLE meta_message_echo_states ADD COLUMN edit_kind TEXT;
UPDATE meta_message_echo_states SET edit_kind = 'text'
  WHERE content_state IN ('edited', 'conflicted');
ALTER TABLE meta_message_echo_states DROP CONSTRAINT meta_message_echo_states_check;
ALTER TABLE meta_message_echo_states ADD CONSTRAINT meta_message_echo_revision_content_valid CHECK (
  (content_state IN ('original', 'deleted') AND edit_at IS NULL AND edit_text IS NULL AND edit_kind IS NULL) OR
  (content_state IN ('edited', 'conflicted') AND edit_at IS NOT NULL AND edit_kind IS NOT NULL
    AND edit_kind IN ('text', 'image', 'video', 'document') AND (
      (content_state = 'conflicted' AND edit_text IS NULL) OR
      (content_state = 'edited' AND (
        (edit_kind = 'text' AND edit_text IS NOT NULL AND length(btrim(edit_text)) BETWEEN 1 AND 16384) OR
        (edit_kind IN ('image', 'video', 'document') AND (edit_text IS NULL OR
          (length(edit_text) <= 16384 AND length(btrim(edit_text)) > 0)))
      ))
    ))
);

ALTER TABLE messages DROP CONSTRAINT messages_content_state_valid;
ALTER TABLE messages ADD CONSTRAINT messages_content_state_valid CHECK (
  content_state = 'original' OR (direction = 'outbound' AND (
    (content_state = 'edited' AND content_kind IN ('text', 'image', 'video', 'document')) OR
    (content_state IN ('deleted', 'conflicted') AND content_kind = 'unsupported' AND text_content IS NULL)
  ))
);
ALTER TABLE messages DROP CONSTRAINT messages_content_consistent;
ALTER TABLE messages ADD CONSTRAINT messages_content_consistent CHECK (
  (content_kind = 'text' AND text_content IS NOT NULL AND length(btrim(text_content)) BETWEEN 1 AND 16384) OR
  (content_kind <> 'text' AND text_content IS NULL) OR
  (direction = 'outbound' AND content_state = 'edited' AND content_kind IN ('image', 'video', 'document')
    AND text_content IS NOT NULL AND length(text_content) <= 16384 AND length(btrim(text_content)) > 0)
);
