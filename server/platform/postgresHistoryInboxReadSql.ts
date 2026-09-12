// This source is used only by inbox reads. Live authorization, bot/AI and
// service-window queries continue to read the live messages table directly.
export const postgresInboxMessageSourceSql = `(
  SELECT message_key, conversation_key, tenant_id, provider_message_id, direction, content_kind,
    status, text_content, occurred_at, status_updated_at, last_status_event_key, last_status_event_at,
    created_at, updated_at, content_state, NULL::text AS history_source, NULL::text AS history_delivery_state
  FROM messages WHERE tenant_id = $1
  UNION ALL
  SELECT history.message_key, history.conversation_key, history.tenant_id, history.provider_message_id,
    captured.message->>'direction' AS direction,
    CASE WHEN echo.content_state IN ('deleted', 'conflicted') THEN 'unsupported'
      WHEN echo.content_state = 'edited' THEN echo.edit_kind ELSE resolved.content_kind END AS content_kind,
    NULL::text AS status,
    CASE WHEN echo.content_state IN ('deleted', 'conflicted') THEN NULL
      WHEN echo.content_state = 'edited' THEN echo.edit_text
      WHEN resolved.content_kind = 'text' THEN resolved.content->>'body'
      WHEN resolved.content_kind IN ('image', 'video', 'document')
        AND jsonb_typeof(resolved.content->'caption') = 'string'
        THEN resolved.content->>'caption' ELSE NULL END AS text_content,
    history.occurred_at, NULL::timestamptz AS status_updated_at, NULL::text AS last_status_event_key,
    NULL::timestamptz AS last_status_event_at, history.created_at, history.created_at AS updated_at,
    COALESCE(echo.content_state, 'original') AS content_state,
    'history'::text AS history_source, captured.message->>'deliveryState' AS history_delivery_state
  FROM meta_history_inbox_messages AS history
  JOIN meta_history_sync_sessions AS session ON session.tenant_id = history.tenant_id AND session.connection_version = history.connection_version
    AND session.sharing_state = 'data_received' AND NOT session.has_conflict
  JOIN meta_history_read_authorizations AS read_access ON read_access.tenant_id = session.tenant_id
    AND read_access.source_connection_version = session.connection_version
  JOIN meta_connections AS connection ON connection.tenant_id = session.tenant_id
    AND connection.waba_id = session.waba_id AND connection.phone_number_id = session.phone_number_id
    AND connection.version = read_access.current_connection_version AND connection.status = 'connected'
  JOIN tenants AS tenant ON tenant.id = session.tenant_id AND tenant.status IN ('active', 'trial', 'payment_failed')
  JOIN meta_data_sync_requests AS request ON request.tenant_id = session.tenant_id AND request.sync_type = 'history'
    AND request.started_at = session.started_at AND request.status IN ('dispatching', 'accepted', 'unknown')
  JOIN meta_history_sync_chunks AS chunk ON chunk.tenant_id = history.tenant_id AND chunk.connection_version = history.connection_version AND chunk.phase = history.phase
    AND chunk.chunk_order = history.chunk_order AND chunk.content_digest = history.content_digest
    AND NOT chunk.conflicted AND chunk.payload IS NOT NULL
  CROSS JOIN LATERAL (SELECT chunk.payload->'messages'->history.message_index AS message) AS captured
  JOIN conversations AS conversation ON conversation.tenant_id = history.tenant_id AND conversation.conversation_key = history.conversation_key
  JOIN contacts AS contact ON contact.tenant_id = conversation.tenant_id AND contact.id = conversation.contact_id
    AND contact.phone_e164 = captured.message->>'threadPhoneNumber'
  LEFT JOIN meta_history_media_bindings AS binding ON binding.tenant_id = history.tenant_id AND binding.connection_version = history.connection_version
    AND binding.provider_message_id = history.provider_message_id AND binding.message_digest = history.message_digest
    AND captured.message->>'contentKind' = 'media_placeholder' AND captured.message->'content' = 'null'::jsonb
  LEFT JOIN meta_history_sync_media AS bound_media ON bound_media.tenant_id = binding.tenant_id AND bound_media.connection_version = binding.connection_version
    AND bound_media.provider_message_id = binding.provider_message_id AND bound_media.content_digest = binding.media_digest
    AND NOT bound_media.conflicted AND bound_media.payload IS NOT NULL
    AND bound_media.payload->>'kind' = 'media' AND bound_media.payload->>'providerMessageId' = history.provider_message_id
    AND bound_media.payload->>'contentKind' IN ('image', 'audio', 'video', 'document', 'sticker')
    AND jsonb_typeof(bound_media.payload->'content') = 'object'
  CROSS JOIN LATERAL (SELECT
    CASE WHEN bound_media.provider_message_id IS NOT NULL THEN bound_media.payload->>'contentKind'
      ELSE captured.message->>'contentKind' END AS content_kind,
    CASE WHEN bound_media.provider_message_id IS NOT NULL THEN bound_media.payload->'content'
      ELSE captured.message->'content' END AS content) AS resolved
  LEFT JOIN meta_message_echo_states AS echo ON echo.tenant_id = history.tenant_id
    AND echo.provider_message_id = history.provider_message_id AND captured.message->>'direction' = 'outbound'
  WHERE history.tenant_id = $1 AND NOT history.conflicted
    AND captured.message->>'providerMessageId' = history.provider_message_id
    AND (echo.tenant_id IS NULL OR (echo.waba_id = session.waba_id AND echo.phone_number_id = session.phone_number_id
      AND echo.recipient_phone = captured.message->>'threadPhoneNumber'))
    AND (echo.content_state IS NULL OR echo.content_state NOT IN ('edited', 'conflicted') OR resolved.content_kind = echo.edit_kind)
    AND NOT EXISTS (SELECT 1 FROM messages AS live WHERE live.tenant_id = history.tenant_id AND live.provider_message_id = history.provider_message_id)
)`;

export const postgresInboxLatestMessageJoinSql = `LEFT JOIN LATERAL (
  SELECT * FROM ${postgresInboxMessageSourceSql} AS inbox_message
  WHERE inbox_message.tenant_id = conversations.tenant_id AND inbox_message.conversation_key = conversations.conversation_key
  ORDER BY inbox_message.occurred_at DESC, inbox_message.message_key DESC LIMIT 1
) AS latest_message ON TRUE`;
