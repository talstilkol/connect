-- Recovery is a private, scoped operator capability. No role is granted it by
-- this migration. In particular, tenant owners and runtime logins do not gain it.
CREATE TABLE paddle_recovery_authorizations (
  database_role NAME NOT NULL,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
  expires_at TIMESTAMPTZ NOT NULL CHECK (isfinite(expires_at)),
  PRIMARY KEY (database_role,tenant_id,environment),
  CHECK (database_role NOT IN ('connect_api_runtime','connect_worker_runtime','connect_verifier_runtime','connect_migrator_login','connect_migration_owner'))
);
REVOKE ALL ON paddle_recovery_authorizations FROM PUBLIC;
CREATE FUNCTION paddle_recovery_authorize_v1(requested_tenant BIGINT, requested_environment TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  -- The actual authenticated login is authoritative, including through SET ROLE.
  PERFORM 1 FROM public.paddle_recovery_authorizations
    WHERE database_role=session_user AND tenant_id=requested_tenant
      AND environment=requested_environment AND expires_at>clock_timestamp() FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paddle recovery authorization required'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION paddle_recovery_authorize_v1(BIGINT,TEXT) FROM PUBLIC;

ALTER TABLE paddle_accounts ADD COLUMN review_revision BIGINT NOT NULL DEFAULT 0 CHECK (review_revision>=0);
CREATE TABLE paddle_operator_recoveries (
  recovery_key TEXT PRIMARY KEY CHECK (recovery_key ~ '^paddle_recovery_v1_[a-f0-9]{64}$'),
  tenant_id BIGINT NOT NULL,
  environment TEXT NOT NULL,
  intent_key TEXT NOT NULL,
  operator_role NAME NOT NULL DEFAULT session_user,
  action TEXT NOT NULL CHECK (action IN ('bind-transaction','close-absent','resolve-review')),
  evidence_digest TEXT NOT NULL CHECK (evidence_digest ~ '^[a-f0-9]{64}$'),
  snapshot_digest TEXT NOT NULL CHECK (snapshot_digest ~ '^[a-f0-9]{64}$'),
  transaction_id TEXT CHECK (transaction_id ~ '^txn_[a-z0-9]{26}$'),
  prior_review_revision BIGINT CHECK (prior_review_revision>=0),
  subscription_digest TEXT CHECK (subscription_digest ~ '^[a-f0-9]{64}$'),
  subscription_updated_at TIMESTAMPTZ CHECK (isfinite(subscription_updated_at)),
  provider_digest TEXT CHECK (provider_digest ~ '^[a-f0-9]{64}$'),
  applied_xid XID8 NOT NULL DEFAULT pg_current_xact_id(),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id,environment,intent_key) REFERENCES paddle_checkout_intents(tenant_id,environment,intent_key) ON DELETE RESTRICT,
  CHECK ((action='close-absent' AND transaction_id IS NULL AND provider_digest IS NULL) OR
    (action IN ('bind-transaction','resolve-review') AND transaction_id IS NOT NULL AND provider_digest IS NOT NULL)),
  CHECK ((action='resolve-review' AND prior_review_revision IS NOT NULL AND subscription_digest IS NOT NULL AND subscription_updated_at IS NOT NULL) OR
    (action<>'resolve-review' AND prior_review_revision IS NULL AND subscription_digest IS NULL AND subscription_updated_at IS NULL))
);
REVOKE ALL ON paddle_operator_recoveries FROM PUBLIC;
CREATE TRIGGER paddle_operator_recovery_immutable BEFORE UPDATE OR DELETE ON paddle_operator_recoveries FOR EACH ROW EXECUTE FUNCTION reject_paddle_receipt_mutation();
CREATE TRIGGER paddle_operator_recovery_no_truncate BEFORE TRUNCATE ON paddle_operator_recoveries FOR EACH STATEMENT EXECUTE FUNCTION reject_paddle_receipt_mutation();
CREATE FUNCTION guard_paddle_operator_recovery_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE checkout public.paddle_checkout_intents%ROWTYPE;
BEGIN
  PERFORM public.paddle_recovery_authorize_v1(NEW.tenant_id,NEW.environment);
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(NEW.tenant_id));
  SELECT * INTO checkout FROM public.paddle_checkout_intents WHERE intent_key=NEW.intent_key FOR UPDATE;
  IF (checkout.tenant_id,checkout.environment) IS DISTINCT FROM (NEW.tenant_id,NEW.environment) THEN RAISE EXCEPTION 'Recovery scope mismatch'; END IF;
  IF NEW.action IN ('bind-transaction','close-absent') THEN
    IF checkout.state<>'unknown' OR NOT checkout.dispatch_sealed OR checkout.transaction_id IS NOT NULL
      OR EXISTS(SELECT 1 FROM public.paddle_creation_observations WHERE intent_key=NEW.intent_key AND transaction_id IS NOT NULL)
      THEN RAISE EXCEPTION 'Recovery requires an unresolved dispatched creation'; END IF;
  ELSE
    IF checkout.state<>'completed' OR checkout.transaction_id IS DISTINCT FROM NEW.transaction_id OR NOT EXISTS(
      SELECT 1 FROM public.paddle_accounts a WHERE a.intent_key=NEW.intent_key AND a.needs_review AND a.review_revision=NEW.prior_review_revision)
      THEN RAISE EXCEPTION 'Review resolution is not current'; END IF;
  END IF;
  NEW.operator_role := session_user;
  NEW.applied_xid := pg_current_xact_id();
  NEW.applied_at := clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER paddle_operator_recovery_guard BEFORE INSERT ON paddle_operator_recoveries FOR EACH ROW EXECUTE FUNCTION guard_paddle_operator_recovery_v1();

ALTER TABLE paddle_checkout_closures DROP CONSTRAINT paddle_checkout_closures_reason_check;
ALTER TABLE paddle_checkout_closures ADD CHECK (reason IN ('not-dispatched','transaction-canceled','support-confirmed-absent'));
ALTER TABLE paddle_checkout_closures DROP CONSTRAINT paddle_checkout_closures_check;
ALTER TABLE paddle_checkout_closures ADD CHECK (
  (reason IN ('not-dispatched','support-confirmed-absent') AND transaction_id IS NULL AND provider_updated_at IS NULL AND projection_digest IS NULL) OR
  (reason='transaction-canceled' AND transaction_id IS NOT NULL AND provider_updated_at IS NOT NULL AND projection_digest IS NOT NULL));
CREATE OR REPLACE FUNCTION guard_paddle_recovery_evidence_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE checkout public.paddle_checkout_intents%ROWTYPE;
BEGIN
  SELECT * INTO checkout FROM public.paddle_checkout_intents WHERE intent_key=NEW.intent_key;
  IF TG_TABLE_NAME='paddle_creation_observations' THEN
    IF checkout.state NOT IN ('creating','unknown') OR NOT checkout.dispatch_sealed THEN RAISE EXCEPTION 'Creation observation requires a dispatched attempt'; END IF;
  ELSIF NEW.reason='not-dispatched' THEN
    IF checkout.state NOT IN ('creating','unknown','rejected') OR checkout.dispatch_sealed THEN RAISE EXCEPTION 'Uncertain dispatch cannot be closed'; END IF;
  ELSIF NEW.reason='support-confirmed-absent' THEN
    IF checkout.state<>'unknown' OR NOT EXISTS(SELECT 1 FROM public.paddle_operator_recoveries r
      WHERE r.intent_key=NEW.intent_key AND r.action='close-absent' AND r.operator_role=session_user AND r.applied_xid=pg_current_xact_id())
      THEN RAISE EXCEPTION 'Absence closure requires an atomic operator attestation'; END IF;
  ELSE
    IF checkout.state<>'ready' OR checkout.transaction_id IS DISTINCT FROM NEW.transaction_id
      OR EXISTS(SELECT 1 FROM public.paddle_accounts a WHERE a.intent_key=checkout.intent_key)
      THEN RAISE EXCEPTION 'Cancellation must match an unpaid confirmed transaction'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION guard_paddle_unknown_binding_v1() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF OLD.state='unknown' AND NEW.state='ready' AND NOT EXISTS(
    SELECT 1 FROM public.paddle_creation_observations o WHERE o.intent_key=OLD.intent_key AND o.transaction_id=NEW.transaction_id)
    AND NOT EXISTS(SELECT 1 FROM public.paddle_operator_recoveries r WHERE r.intent_key=OLD.intent_key AND r.action='bind-transaction'
      AND r.transaction_id=NEW.transaction_id AND r.operator_role=session_user AND r.applied_xid=pg_current_xact_id())
    THEN RAISE EXCEPTION 'Unknown checkout requires original identity or atomic operator evidence'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER paddle_unknown_binding_guard BEFORE UPDATE ON paddle_checkout_intents FOR EACH ROW EXECUTE FUNCTION guard_paddle_unknown_binding_v1();

CREATE OR REPLACE FUNCTION guard_paddle_account() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE resolved BOOLEAN := FALSE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.paddle_checkout_intents c WHERE c.tenant_id=NEW.tenant_id AND c.environment=NEW.environment AND c.intent_key=NEW.intent_key AND c.state IN ('ready','completed') AND c.transaction_id IS NOT NULL) THEN RAISE EXCEPTION 'Paddle account requires confirmed checkout'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.needs_review AND NOT NEW.needs_review THEN
      SELECT EXISTS(SELECT 1 FROM public.paddle_operator_recoveries r WHERE r.intent_key=OLD.intent_key AND r.action='resolve-review'
        AND r.prior_review_revision=OLD.review_revision AND r.subscription_digest=NEW.projection_digest AND r.subscription_updated_at=NEW.provider_updated_at
        AND r.operator_role=session_user AND r.applied_xid=pg_current_xact_id()) INTO resolved;
      IF NOT resolved THEN RAISE EXCEPTION 'Review clearance requires atomic version-bound evidence'; END IF;
    END IF;
    IF (OLD.tenant_id,OLD.environment,OLD.intent_key,OLD.customer_id,OLD.subscription_id) IS DISTINCT FROM (NEW.tenant_id,NEW.environment,NEW.intent_key,NEW.customer_id,NEW.subscription_id)
      OR NEW.provider_updated_at<OLD.provider_updated_at
      OR (OLD.provider_status='canceled' AND NEW.provider_status<>'canceled')
      OR (NOT resolved AND NEW.provider_updated_at=OLD.provider_updated_at AND
        (NEW.projection_digest,NEW.provider_status,NEW.period_starts_at,NEW.period_ends_at,NEW.scheduled_action,NEW.scheduled_effective_at) IS DISTINCT FROM
        (OLD.projection_digest,OLD.provider_status,OLD.period_starts_at,OLD.period_ends_at,OLD.scheduled_action,OLD.scheduled_effective_at))
      THEN RAISE EXCEPTION 'Paddle account identity or version invalid'; END IF;
    NEW.review_revision := OLD.review_revision + CASE WHEN OLD.needs_review OR NEW.needs_review THEN 1 ELSE 0 END;
  ELSE
    NEW.review_revision := 0;
  END IF;
  RETURN NEW;
END;
$$;
