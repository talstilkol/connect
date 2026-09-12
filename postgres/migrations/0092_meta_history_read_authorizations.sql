-- Read authorization is distinct from a source's immutable capture identity.
-- Reconnecting the same business may expose already imported history; it never
-- attributes another webhook or authorizes another provider download/POST.
CREATE VIEW meta_history_read_authorizations AS
SELECT session.tenant_id, session.waba_id, session.phone_number_id,
  session.connection_version AS source_connection_version,
  connection.version AS current_connection_version
FROM meta_history_sync_sessions AS session
JOIN tenants AS tenant ON tenant.id = session.tenant_id
  AND tenant.status IN ('active', 'trial', 'payment_failed')
JOIN meta_connections AS connection ON connection.tenant_id = session.tenant_id
  AND connection.waba_id = session.waba_id AND connection.phone_number_id = session.phone_number_id
  AND connection.status = 'connected'
WHERE session.sharing_state = 'data_received' AND NOT session.has_conflict
  AND NOT EXISTS (SELECT 1 FROM meta_sync_import_refusals AS refusal
    WHERE refusal.tenant_id = session.tenant_id AND refusal.waba_id = session.waba_id
      AND refusal.phone_number_id = session.phone_number_id)
  AND (connection.version = session.connection_version OR
    (connection.version > session.connection_version AND EXISTS (
      SELECT 1 FROM meta_signup_launches AS launch
      JOIN railway_api_mutation_receipts AS receipt ON receipt.tenant_id = launch.tenant_id
        AND receipt.operation = launch.operation AND receipt.idempotency_key = launch.claim_key
        AND receipt.request_digest = launch.request_digest
        AND receipt.actor_external_user_id = launch.actor_external_user_id
      WHERE launch.tenant_id = session.tenant_id AND launch.status = 'finished'
        AND receipt.status = 'completed'
        AND receipt.response_json = jsonb_build_object('status', 'connected', 'connectionVersion', connection.version)
    )));
