-- History is captured separately from live messages. No inbox projection,
-- customer-service window, consent grant or synchronization-complete flag.
ALTER TABLE meta_data_sync_requests ADD CONSTRAINT meta_data_sync_history_binding
  UNIQUE (tenant_id, sync_type, waba_id, phone_number_id, connection_version, started_at);

CREATE TABLE meta_history_sync_sessions (
  tenant_id BIGINT PRIMARY KEY,
  sync_type TEXT NOT NULL DEFAULT 'history' CHECK (sync_type = 'history'),
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  connection_version INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  sharing_state TEXT NOT NULL DEFAULT 'pending' CHECK (sharing_state IN ('pending', 'data_received', 'declined')),
  max_progress INTEGER CHECK (max_progress BETWEEN 0 AND 100),
  has_conflict BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (tenant_id, sync_type, waba_id, phone_number_id, connection_version, started_at)
    REFERENCES meta_data_sync_requests (tenant_id, sync_type, waba_id, phone_number_id, connection_version, started_at) ON DELETE RESTRICT
);

CREATE TABLE meta_history_sync_events (
  tenant_id BIGINT NOT NULL REFERENCES meta_history_sync_sessions(tenant_id) ON DELETE RESTRICT,
  event_digest TEXT NOT NULL CHECK (event_digest ~ '^[0-9a-f]{64}$'),
  kind TEXT NOT NULL CHECK (kind IN ('chunk', 'media', 'declined')),
  PRIMARY KEY (tenant_id, event_digest)
);

CREATE TABLE meta_history_sync_chunks (
  tenant_id BIGINT NOT NULL REFERENCES meta_history_sync_sessions(tenant_id) ON DELETE RESTRICT,
  phase INTEGER NOT NULL CHECK (phase BETWEEN 0 AND 2),
  chunk_order INTEGER NOT NULL CHECK (chunk_order >= 0),
  progress INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
  content_digest TEXT NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  payload JSONB CHECK (jsonb_typeof(payload) = 'object'),
  conflicted BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (NOT conflicted OR payload IS NULL),
  PRIMARY KEY (tenant_id, phase, chunk_order)
);

CREATE TABLE meta_history_sync_media (
  tenant_id BIGINT NOT NULL REFERENCES meta_history_sync_sessions(tenant_id) ON DELETE RESTRICT,
  provider_message_id TEXT NOT NULL CHECK (length(provider_message_id) BETWEEN 1 AND 255 AND provider_message_id = btrim(provider_message_id) AND provider_message_id !~ '[[:cntrl:]]'),
  content_digest TEXT NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  payload JSONB CHECK (jsonb_typeof(payload) = 'object'),
  conflicted BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (NOT conflicted OR payload IS NULL),
  PRIMARY KEY (tenant_id, provider_message_id)
);

CREATE FUNCTION guard_meta_history_session_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'History session cannot be reset'; END IF;
  IF ROW(NEW.tenant_id, NEW.sync_type, NEW.waba_id, NEW.phone_number_id, NEW.connection_version, NEW.started_at)
    IS DISTINCT FROM ROW(OLD.tenant_id, OLD.sync_type, OLD.waba_id, OLD.phone_number_id, OLD.connection_version, OLD.started_at)
    OR (OLD.sharing_state = 'declined' AND NEW.sharing_state <> 'declined')
    OR (OLD.sharing_state = 'data_received' AND NEW.sharing_state = 'pending')
    OR (OLD.has_conflict AND NOT NEW.has_conflict)
    OR (OLD.max_progress IS NOT NULL AND (NEW.max_progress IS NULL OR NEW.max_progress < OLD.max_progress)) THEN
    RAISE EXCEPTION 'Invalid history session transition';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER meta_history_session_guard BEFORE UPDATE OR DELETE ON meta_history_sync_sessions
FOR EACH ROW EXECUTE FUNCTION guard_meta_history_session_v1();

CREATE FUNCTION guard_meta_history_payload_v1() RETURNS trigger LANGUAGE plpgsql AS $$
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
CREATE TRIGGER meta_history_chunk_guard BEFORE UPDATE OR DELETE ON meta_history_sync_chunks
FOR EACH ROW EXECUTE FUNCTION guard_meta_history_payload_v1();
CREATE TRIGGER meta_history_media_guard BEFORE UPDATE OR DELETE ON meta_history_sync_media
FOR EACH ROW EXECUTE FUNCTION guard_meta_history_payload_v1();

CREATE FUNCTION guard_meta_history_event_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'History event receipt is immutable';
END;
$$;
CREATE TRIGGER meta_history_event_guard BEFORE UPDATE OR DELETE ON meta_history_sync_events
FOR EACH ROW EXECUTE FUNCTION guard_meta_history_event_v1();
