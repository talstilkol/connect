-- Legacy attempts are conservatively considered dispatched until a queued
-- attempt is freshly claimed. No guessed backfill can authorize another POST.
ALTER TABLE paddle_checkout_intents ADD COLUMN dispatch_sealed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE paddle_checkout_intents ALTER COLUMN dispatch_sealed SET DEFAULT FALSE;
ALTER TABLE paddle_checkout_intents DROP CONSTRAINT paddle_checkout_intents_state_check;
ALTER TABLE paddle_checkout_intents ADD CHECK (state IN ('queued','creating','unknown','ready','rejected','completed','closed'));
ALTER TABLE paddle_checkout_intents DROP CONSTRAINT paddle_checkout_intents_check;
ALTER TABLE paddle_checkout_intents ADD CHECK (
  (state IN ('ready','completed') AND transaction_id IS NOT NULL AND checkout_url IS NOT NULL) OR
  (state IN ('queued','creating','unknown','rejected') AND transaction_id IS NULL AND checkout_url IS NULL) OR
  (state='closed' AND (transaction_id IS NULL)=(checkout_url IS NULL)));

CREATE TABLE paddle_creation_observations (
  intent_key TEXT PRIMARY KEY REFERENCES paddle_checkout_intents(intent_key) ON DELETE RESTRICT,
  request_id TEXT CHECK (request_id ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'),
  http_status INTEGER NOT NULL CHECK (http_status BETWEEN 100 AND 599),
  transaction_id TEXT CHECK (transaction_id ~ '^txn_[a-z0-9]{26}$'),
  response_digest TEXT NOT NULL CHECK (response_digest ~ '^[a-f0-9]{64}$'),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (transaction_id IS NULL OR http_status BETWEEN 200 AND 299)
);
CREATE TABLE paddle_checkout_closures (
  intent_key TEXT PRIMARY KEY REFERENCES paddle_checkout_intents(intent_key) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (reason IN ('not-dispatched','transaction-canceled')),
  transaction_id TEXT CHECK (transaction_id ~ '^txn_[a-z0-9]{26}$'),
  provider_updated_at TIMESTAMPTZ,
  projection_digest TEXT CHECK (projection_digest ~ '^[a-f0-9]{64}$'),
  closed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK ((reason='not-dispatched' AND transaction_id IS NULL AND provider_updated_at IS NULL AND projection_digest IS NULL) OR
    (reason='transaction-canceled' AND transaction_id IS NOT NULL AND provider_updated_at IS NOT NULL AND projection_digest IS NOT NULL))
);
CREATE TRIGGER paddle_creation_observation_immutable BEFORE UPDATE OR DELETE ON paddle_creation_observations FOR EACH ROW EXECUTE FUNCTION reject_paddle_receipt_mutation();
CREATE TRIGGER paddle_creation_observation_no_truncate BEFORE TRUNCATE ON paddle_creation_observations FOR EACH STATEMENT EXECUTE FUNCTION reject_paddle_receipt_mutation();
CREATE TRIGGER paddle_checkout_closure_immutable BEFORE UPDATE OR DELETE ON paddle_checkout_closures FOR EACH ROW EXECUTE FUNCTION reject_paddle_receipt_mutation();
CREATE TRIGGER paddle_checkout_closure_no_truncate BEFORE TRUNCATE ON paddle_checkout_closures FOR EACH STATEMENT EXECUTE FUNCTION reject_paddle_receipt_mutation();
CREATE FUNCTION guard_paddle_recovery_evidence_v1() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$
DECLARE checkout public.paddle_checkout_intents%ROWTYPE;
BEGIN
  SELECT * INTO checkout FROM public.paddle_checkout_intents WHERE intent_key=NEW.intent_key;
  IF TG_TABLE_NAME='paddle_creation_observations' THEN
    IF checkout.state NOT IN ('creating','unknown') OR NOT checkout.dispatch_sealed
      THEN RAISE EXCEPTION 'Creation observation requires a dispatched attempt'; END IF;
  ELSIF NEW.reason='not-dispatched' THEN
    IF checkout.state NOT IN ('creating','unknown','rejected') OR checkout.dispatch_sealed
      THEN RAISE EXCEPTION 'Uncertain dispatch cannot be closed'; END IF;
  ELSE
    IF checkout.state <> 'ready' OR checkout.transaction_id IS DISTINCT FROM NEW.transaction_id
      OR EXISTS(SELECT 1 FROM public.paddle_accounts a WHERE a.intent_key=checkout.intent_key)
      THEN RAISE EXCEPTION 'Cancellation must match an unpaid confirmed transaction'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER paddle_creation_observation_guard BEFORE INSERT ON paddle_creation_observations FOR EACH ROW EXECUTE FUNCTION guard_paddle_recovery_evidence_v1();
CREATE TRIGGER paddle_checkout_closure_guard BEFORE INSERT ON paddle_checkout_closures FOR EACH ROW EXECUTE FUNCTION guard_paddle_recovery_evidence_v1();

CREATE OR REPLACE FUNCTION guard_paddle_checkout() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.dispatch_sealed OR NEW.state <> 'queued' OR NEW.transaction_id IS NOT NULL OR NEW.checkout_url IS NOT NULL OR NEW.reconcile_revision <> 0 THEN RAISE EXCEPTION 'Paddle checkout must start queued'; END IF;
  ELSE
    IF (OLD.intent_key,OLD.tenant_id,OLD.environment,OLD.actor_external_user_id,OLD.price_id,OLD.product_id,OLD.checkout_base_url,OLD.created_at)
      IS DISTINCT FROM (NEW.intent_key,NEW.tenant_id,NEW.environment,NEW.actor_external_user_id,NEW.price_id,NEW.product_id,NEW.checkout_base_url,NEW.created_at)
      OR (OLD.transaction_id IS NOT NULL AND (OLD.transaction_id,OLD.checkout_url) IS DISTINCT FROM (NEW.transaction_id,NEW.checkout_url))
      OR (OLD.state,NEW.state) NOT IN (('queued','queued'),('queued','creating'),('queued','rejected'),('creating','creating'),('creating','unknown'),('creating','ready'),('creating','rejected'),('unknown','unknown'),('unknown','ready'),('ready','ready'),('ready','completed'),('completed','completed'),('rejected','rejected'),('creating','closed'),('unknown','closed'),('rejected','closed'),('ready','closed'),('closed','closed'))
      OR NEW.reconcile_revision < OLD.reconcile_revision THEN RAISE EXCEPTION 'Paddle checkout identity or transition invalid'; END IF;
  END IF;
  IF TG_OP='UPDATE' AND NEW.dispatch_sealed IS DISTINCT FROM OLD.dispatch_sealed AND NOT (
    (NOT OLD.dispatch_sealed AND NEW.dispatch_sealed AND OLD.state='creating' AND NEW.state='creating') OR
    (OLD.state='queued' AND NEW.state IN ('creating','rejected') AND NOT NEW.dispatch_sealed))
    THEN RAISE EXCEPTION 'Paddle dispatch fence is irreversible'; END IF;
  IF NEW.state IN ('ready','completed') AND NOT NEW.dispatch_sealed THEN RAISE EXCEPTION 'Checkout has no dispatch seal'; END IF;
  IF NEW.state='closed' AND NOT EXISTS(SELECT 1 FROM public.paddle_checkout_closures WHERE intent_key=NEW.intent_key)
    THEN RAISE EXCEPTION 'Checkout closure needs immutable evidence'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION paddle_checkout_can_advance_v1(requested_tenant BIGINT, requested_environment TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE SET search_path=pg_catalog,pg_temp AS $$
DECLARE latest public.paddle_checkout_intents%ROWTYPE; observed_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  SELECT * INTO latest FROM public.paddle_checkout_intents WHERE tenant_id=requested_tenant AND environment=requested_environment ORDER BY generation DESC LIMIT 1;
  IF NOT FOUND THEN RETURN TRUE; END IF;
  IF latest.state='closed' THEN RETURN EXISTS(SELECT 1 FROM public.paddle_checkout_closures WHERE intent_key=latest.intent_key); END IF;
  RETURN latest.state='completed' AND EXISTS (
    SELECT 1 FROM public.paddle_accounts a WHERE a.tenant_id=latest.tenant_id AND a.environment=latest.environment AND a.intent_key=latest.intent_key
      AND a.provider_status='canceled' AND NOT a.needs_review
      AND a.verified_at <= observed_at AND a.verified_at > observed_at - INTERVAL '15 minutes');
END;
$$;
