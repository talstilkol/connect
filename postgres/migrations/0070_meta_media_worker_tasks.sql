-- Durable scheduling is separate from the one-shot upload dispatch journal.
-- Retry/reclaim here never resets an S3 upload or changes its source identity.
CREATE TABLE meta_media_tasks (
  job_key TEXT NOT NULL CHECK (job_key ~ '^media_upload_v1_[0-9a-f]{64}$'),
  kind TEXT NOT NULL CHECK (kind IN ('upload','inspect')),
  tenant_id BIGINT NOT NULL,
  actor_external_user_id TEXT NOT NULL CHECK (length(actor_external_user_id) BETWEEN 1 AND 512),
  message_key TEXT NOT NULL,
  connection_version INTEGER NOT NULL CHECK (connection_version > 0),
  source_sha256 TEXT NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','blocked','recovery-required','cancelled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND CASE WHEN kind='upload' THEN 3 ELSE 12 END),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  lease_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (job_key,kind),
  UNIQUE (tenant_id,message_key,connection_version,kind),
  FOREIGN KEY (tenant_id,message_key) REFERENCES meta_history_inbox_messages(tenant_id,message_key) ON DELETE RESTRICT,
  CHECK ((status='running') = (lease_expires_at IS NOT NULL))
);
CREATE INDEX meta_media_tasks_due ON meta_media_tasks(kind,next_attempt_at,job_key) WHERE status IN ('pending','running');

CREATE FUNCTION guard_meta_media_task_v1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Media tasks are retained'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'pending' OR NEW.version<>1 OR NEW.attempts<>0 THEN RAISE EXCEPTION 'Invalid initial media task'; END IF;
    PERFORM 1 FROM meta_history_inbox_messages AS message
      JOIN meta_history_media_bindings AS binding ON binding.tenant_id=message.tenant_id AND binding.provider_message_id=message.provider_message_id
      WHERE message.tenant_id=NEW.tenant_id AND message.message_key=NEW.message_key;
    IF NOT FOUND THEN RAISE EXCEPTION 'Media task requires a bound source'; END IF;
    IF NEW.kind='inspect' THEN
      PERFORM 1 FROM meta_media_upload_jobs WHERE job_key=NEW.job_key AND tenant_id=NEW.tenant_id
        AND actor_external_user_id=NEW.actor_external_user_id AND message_key=NEW.message_key
        AND connection_version=NEW.connection_version AND source_sha256=NEW.source_sha256
        AND status IN ('dispatching','reconciliation-required','quarantined') FOR SHARE;
    ELSE
      PERFORM 1 FROM meta_data_sync_onboardings AS onboarding
        JOIN meta_history_sync_sessions AS session ON session.tenant_id=onboarding.tenant_id AND session.started_at=onboarding.started_at
        WHERE onboarding.tenant_id=NEW.tenant_id AND session.connection_version=NEW.connection_version
          AND (onboarding.actor_external_user_id=NEW.actor_external_user_id OR EXISTS (
            SELECT 1 FROM meta_media_upload_jobs WHERE job_key=NEW.job_key AND tenant_id=NEW.tenant_id
              AND actor_external_user_id=NEW.actor_external_user_id AND message_key=NEW.message_key
              AND connection_version=NEW.connection_version AND source_sha256=NEW.source_sha256));
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'Media task requires its original actor and source'; END IF;
  ELSE
    IF (NEW.job_key,NEW.kind,NEW.tenant_id,NEW.actor_external_user_id,NEW.message_key,NEW.connection_version,NEW.source_sha256,NEW.created_at)
      IS DISTINCT FROM (OLD.job_key,OLD.kind,OLD.tenant_id,OLD.actor_external_user_id,OLD.message_key,OLD.connection_version,OLD.source_sha256,OLD.created_at)
      OR NEW.version<>OLD.version+1 OR OLD.status NOT IN ('pending','running') THEN RAISE EXCEPTION 'Invalid media task identity or version'; END IF;
    IF NEW.status='running' THEN
      IF (OLD.status='running' AND OLD.lease_expires_at>clock_timestamp()) OR (OLD.status='pending' AND OLD.next_attempt_at>clock_timestamp())
        OR NEW.attempts<>OLD.attempts+1 OR NEW.lease_expires_at<=clock_timestamp()
        OR NEW.lease_expires_at>clock_timestamp()+INTERVAL '10 minutes' THEN RAISE EXCEPTION 'Invalid media task claim'; END IF;
    ELSE
      IF NEW.attempts<>OLD.attempts OR NOT (
        (OLD.status='running' AND OLD.lease_expires_at>clock_timestamp()) OR
        (NEW.status='recovery-required' AND OLD.attempts=CASE WHEN OLD.kind='upload' THEN 3 ELSE 12 END
          AND ((OLD.status='pending' AND OLD.next_attempt_at<=clock_timestamp()) OR (OLD.status='running' AND OLD.lease_expires_at<=clock_timestamp())))) THEN
        RAISE EXCEPTION 'Invalid media task completion';
      END IF;
      IF NEW.status='pending' AND (NEW.next_attempt_at<=clock_timestamp() OR NEW.next_attempt_at>clock_timestamp()+INTERVAL '15 minutes') THEN
        RAISE EXCEPTION 'Invalid media task delay';
      END IF;
    END IF;
  END IF;
  NEW.updated_at:=clock_timestamp(); RETURN NEW;
END;
$$;
CREATE TRIGGER meta_media_task_guard BEFORE INSERT OR UPDATE OR DELETE ON meta_media_tasks
FOR EACH ROW EXECUTE FUNCTION guard_meta_media_task_v1();
