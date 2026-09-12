-- Provider billing identity is separate from administrative tenant status.
-- A signed webhook/custom_data cannot create this binding: only the recorded
-- response to the server's transaction creation can identify the transaction.
CREATE TABLE paddle_checkout_intents (
  intent_key TEXT PRIMARY KEY CHECK (intent_key ~ '^paddle_checkout_v1_[a-f0-9]{64}$'),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
  actor_external_user_id TEXT NOT NULL CHECK (length(actor_external_user_id) BETWEEN 1 AND 512),
  price_id TEXT NOT NULL CHECK (price_id ~ '^pri_[a-z0-9]{26}$'),
  product_id TEXT NOT NULL CHECK (product_id ~ '^pro_[a-z0-9]{26}$'),
  checkout_base_url TEXT NOT NULL CHECK (length(checkout_base_url) BETWEEN 1 AND 2048),
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','creating','unknown','ready','rejected','completed')),
  transaction_id TEXT CHECK (transaction_id ~ '^txn_[a-z0-9]{26}$'),
  checkout_url TEXT CHECK (length(checkout_url) BETWEEN 1 AND 2048),
  error_code TEXT CHECK (error_code ~ '^[A-Z_]{1,100}$'),
  reconcile_revision BIGINT NOT NULL DEFAULT 0 CHECK (reconcile_revision >= 0),
  next_reconcile_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  UNIQUE (tenant_id, environment),
  UNIQUE (environment, transaction_id),
  UNIQUE (tenant_id, environment, intent_key),
  CHECK ((state IN ('ready','completed')) = (transaction_id IS NOT NULL AND checkout_url IS NOT NULL)),
  CHECK (state <> 'rejected' OR error_code IS NOT NULL)
);
CREATE INDEX paddle_checkout_due_idx ON paddle_checkout_intents(environment,next_reconcile_at) WHERE state IN ('queued','creating','ready','completed');

CREATE TABLE paddle_accounts (
  tenant_id BIGINT NOT NULL,
  environment TEXT NOT NULL,
  intent_key TEXT NOT NULL,
  customer_id TEXT NOT NULL CHECK (customer_id ~ '^ctm_[a-z0-9]{26}$'),
  subscription_id TEXT NOT NULL CHECK (subscription_id ~ '^sub_[a-z0-9]{26}$'),
  provider_updated_at TIMESTAMPTZ NOT NULL,
  projection_digest TEXT NOT NULL CHECK (projection_digest ~ '^[a-f0-9]{64}$'),
  provider_status TEXT NOT NULL CHECK (provider_status IN ('active','trialing','past_due','paused','canceled')),
  period_starts_at TIMESTAMPTZ,
  period_ends_at TIMESTAMPTZ,
  scheduled_action TEXT CHECK (scheduled_action IN ('cancel','pause','resume')),
  scheduled_effective_at TIMESTAMPTZ,
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (tenant_id,environment),
  UNIQUE (environment,customer_id),
  UNIQUE (environment,subscription_id),
  FOREIGN KEY (tenant_id,environment,intent_key) REFERENCES paddle_checkout_intents(tenant_id,environment,intent_key) ON DELETE RESTRICT,
  CHECK ((period_starts_at IS NULL) = (period_ends_at IS NULL)),
  CHECK (period_starts_at < period_ends_at),
  CHECK ((scheduled_action IS NULL) = (scheduled_effective_at IS NULL)),
  CHECK (provider_status NOT IN ('active','trialing','past_due') OR period_ends_at IS NOT NULL)
);
CREATE TABLE paddle_webhook_receipts (
  environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
  event_id TEXT NOT NULL CHECK (event_id ~ '^evt_[a-z0-9]{26}$'),
  event_type TEXT NOT NULL CHECK (event_type ~ '^[a-z_]{1,64}\.[a-z_]{1,64}$'),
  entity_id TEXT CHECK (entity_id ~ '^(txn|sub)_[a-z0-9]{26}$'),
  occurred_at TIMESTAMPTZ NOT NULL,
  event_digest TEXT NOT NULL CHECK (event_digest ~ '^[a-f0-9]{64}$'),
  received_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (environment,event_id)
);
CREATE FUNCTION guard_paddle_checkout() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.state <> 'queued' OR NEW.transaction_id IS NOT NULL OR NEW.checkout_url IS NOT NULL OR NEW.reconcile_revision <> 0 THEN RAISE EXCEPTION 'Paddle checkout must start queued'; END IF;
  ELSE
    IF (OLD.intent_key,OLD.tenant_id,OLD.environment,OLD.actor_external_user_id,OLD.price_id,OLD.product_id,OLD.checkout_base_url,OLD.created_at)
      IS DISTINCT FROM (NEW.intent_key,NEW.tenant_id,NEW.environment,NEW.actor_external_user_id,NEW.price_id,NEW.product_id,NEW.checkout_base_url,NEW.created_at)
      OR (OLD.transaction_id IS NOT NULL AND (OLD.transaction_id,OLD.checkout_url) IS DISTINCT FROM (NEW.transaction_id,NEW.checkout_url))
      OR (OLD.state,NEW.state) NOT IN (('queued','queued'),('queued','creating'),('queued','rejected'),('creating','creating'),('creating','unknown'),('creating','ready'),('creating','rejected'),('unknown','unknown'),('unknown','ready'),('ready','ready'),('ready','completed'),('completed','completed'),('rejected','rejected'))
      OR NEW.reconcile_revision < OLD.reconcile_revision THEN RAISE EXCEPTION 'Paddle checkout identity or transition invalid'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER paddle_checkout_guard BEFORE INSERT OR UPDATE ON paddle_checkout_intents FOR EACH ROW EXECUTE FUNCTION guard_paddle_checkout();
CREATE FUNCTION guard_paddle_account() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.paddle_checkout_intents c WHERE c.tenant_id=NEW.tenant_id AND c.environment=NEW.environment AND c.intent_key=NEW.intent_key AND c.state IN ('ready','completed') AND c.transaction_id IS NOT NULL) THEN RAISE EXCEPTION 'Paddle account requires confirmed checkout'; END IF;
  IF TG_OP='UPDATE' AND ((OLD.tenant_id,OLD.environment,OLD.intent_key,OLD.customer_id,OLD.subscription_id) IS DISTINCT FROM (NEW.tenant_id,NEW.environment,NEW.intent_key,NEW.customer_id,NEW.subscription_id)
    OR NEW.provider_updated_at < OLD.provider_updated_at OR (NEW.provider_updated_at=OLD.provider_updated_at AND (NEW.projection_digest,NEW.provider_status,NEW.period_starts_at,NEW.period_ends_at,NEW.scheduled_action,NEW.scheduled_effective_at) IS DISTINCT FROM (OLD.projection_digest,OLD.provider_status,OLD.period_starts_at,OLD.period_ends_at,OLD.scheduled_action,OLD.scheduled_effective_at))) THEN RAISE EXCEPTION 'Paddle account identity or version invalid'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER paddle_account_guard BEFORE INSERT OR UPDATE ON paddle_accounts FOR EACH ROW EXECUTE FUNCTION guard_paddle_account();
CREATE FUNCTION reject_paddle_receipt_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Paddle receipt is immutable'; END; $$;
CREATE TRIGGER paddle_receipt_guard BEFORE UPDATE OR DELETE ON paddle_webhook_receipts FOR EACH ROW EXECUTE FUNCTION reject_paddle_receipt_mutation();
CREATE FUNCTION audit_paddle_checkout() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' OR OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO public.audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    VALUES(NEW.tenant_id,NEW.actor_external_user_id,'billing.checkout.state','paddle_checkout',NEW.intent_key,jsonb_build_object('environment',NEW.environment,'state',NEW.state,'errorCode',NEW.error_code));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER paddle_checkout_audit AFTER INSERT OR UPDATE ON paddle_checkout_intents FOR EACH ROW EXECUTE FUNCTION audit_paddle_checkout();
CREATE FUNCTION audit_paddle_account() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' OR (OLD.projection_digest,OLD.needs_review) IS DISTINCT FROM (NEW.projection_digest,NEW.needs_review) THEN
    INSERT INTO public.audit_logs(tenant_id,actor_external_user_id,action,target_type,target_id,metadata_json)
    SELECT NEW.tenant_id,c.actor_external_user_id,'billing.subscription.reconciled','paddle_checkout',NEW.intent_key,
      jsonb_build_object('environment',NEW.environment,'status',NEW.provider_status,'needsReview',NEW.needs_review,'projectionDigest',NEW.projection_digest)
      FROM public.paddle_checkout_intents c WHERE c.intent_key=NEW.intent_key;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER paddle_account_audit AFTER INSERT OR UPDATE ON paddle_accounts FOR EACH ROW EXECUTE FUNCTION audit_paddle_account();
