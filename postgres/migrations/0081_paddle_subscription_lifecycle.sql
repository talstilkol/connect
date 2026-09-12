-- Sequential purchases retain the canceled subscription and its verified identity.
ALTER TABLE paddle_checkout_intents DROP CONSTRAINT paddle_checkout_intents_tenant_id_environment_key;
ALTER TABLE paddle_checkout_intents ADD COLUMN generation INTEGER NOT NULL DEFAULT 1 CHECK (generation > 0 AND generation < 2147483647);
ALTER TABLE paddle_checkout_intents ADD COLUMN previous_intent_key TEXT;
ALTER TABLE paddle_checkout_intents ADD UNIQUE (tenant_id,environment,generation);
ALTER TABLE paddle_checkout_intents ADD FOREIGN KEY (tenant_id,environment,previous_intent_key)
  REFERENCES paddle_checkout_intents(tenant_id,environment,intent_key) ON DELETE RESTRICT;
ALTER TABLE paddle_accounts DROP CONSTRAINT paddle_accounts_pkey;
ALTER TABLE paddle_accounts ADD PRIMARY KEY (tenant_id,environment,intent_key);
-- A buyer may pay for several workspaces; each subscription is still unique.
ALTER TABLE paddle_accounts DROP CONSTRAINT paddle_accounts_environment_customer_id_key;

CREATE FUNCTION paddle_checkout_can_advance_v1(requested_tenant BIGINT, requested_environment TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE SET search_path=pg_catalog,pg_temp AS $$
DECLARE latest public.paddle_checkout_intents%ROWTYPE; observed_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  SELECT * INTO latest FROM public.paddle_checkout_intents WHERE tenant_id=requested_tenant AND environment=requested_environment ORDER BY generation DESC LIMIT 1;
  IF NOT FOUND THEN RETURN TRUE; END IF;
  RETURN latest.state='completed' AND EXISTS (
    SELECT 1 FROM public.paddle_accounts a WHERE a.tenant_id=latest.tenant_id AND a.environment=latest.environment AND a.intent_key=latest.intent_key
      AND a.provider_status='canceled' AND NOT a.needs_review
      AND a.verified_at <= observed_at AND a.verified_at > observed_at - INTERVAL '15 minutes');
END;
$$;
CREATE FUNCTION guard_paddle_checkout_generation_v1() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$
DECLARE latest public.paddle_checkout_intents%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF (NEW.generation,NEW.previous_intent_key) IS DISTINCT FROM (OLD.generation,OLD.previous_intent_key)
      THEN RAISE EXCEPTION 'Paddle checkout generation is immutable'; END IF;
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1(NEW.tenant_id));
  SELECT * INTO latest FROM public.paddle_checkout_intents WHERE tenant_id=NEW.tenant_id AND environment=NEW.environment ORDER BY generation DESC LIMIT 1;
  IF NEW.generation IS DISTINCT FROM COALESCE(latest.generation,0)+1 OR NEW.previous_intent_key IS DISTINCT FROM latest.intent_key
    OR NOT public.paddle_checkout_can_advance_v1(NEW.tenant_id,NEW.environment)
    THEN RAISE EXCEPTION 'Paddle checkout requires a fresh canceled predecessor'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER paddle_checkout_generation_guard BEFORE INSERT OR UPDATE ON paddle_checkout_intents
  FOR EACH ROW EXECUTE FUNCTION guard_paddle_checkout_generation_v1();
CREATE FUNCTION guard_paddle_canceled_terminal_v1() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF OLD.provider_status='canceled' AND NEW.provider_status <> 'canceled'
    THEN RAISE EXCEPTION 'Canceled Paddle subscription cannot reactivate'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER paddle_canceled_terminal_guard BEFORE UPDATE ON paddle_accounts
  FOR EACH ROW EXECUTE FUNCTION guard_paddle_canceled_terminal_v1();

CREATE OR REPLACE FUNCTION tenant_paid_access_reason_v1(requested_tenant BIGINT)
RETURNS TEXT LANGUAGE plpgsql VOLATILE SET search_path=pg_catalog,pg_temp AS $$
DECLARE account public.paddle_accounts%ROWTYPE; observed_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id=requested_tenant AND status IN ('trial','active','payment_failed'))
    THEN RETURN 'tenant-inactive'; END IF;
  SELECT a.* INTO account FROM public.paddle_accounts a
    WHERE a.tenant_id=requested_tenant AND a.environment='production' AND a.intent_key=(
      SELECT c.intent_key FROM public.paddle_checkout_intents c WHERE c.tenant_id=requested_tenant AND c.environment='production' ORDER BY c.generation DESC LIMIT 1);
  -- Existing manually authorized pilots retain their administrative policy.
  -- Sandbox records can neither grant nor revoke production access.
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.paddle_checkout_intents WHERE tenant_id=requested_tenant AND environment='production')
      THEN RETURN 'payment-pending'; END IF;
    RETURN 'manual-pilot';
  END IF;
  IF account.needs_review THEN RETURN 'review-required'; END IF;
  IF account.provider_status <> 'active' THEN RETURN 'subscription-inactive'; END IF;
  IF account.period_starts_at > observed_at OR account.period_ends_at <= observed_at
    OR account.period_starts_at IS NULL OR account.period_ends_at IS NULL THEN RETURN 'period-inactive'; END IF;
  IF account.scheduled_action IN ('cancel','pause') AND account.scheduled_effective_at <= observed_at
    THEN RETURN 'scheduled-stop'; END IF;
  -- This 15-minute allowance is a Connect operational policy, not a Paddle SLA.
  -- Normal reconciliation is every five minutes. A provider outage never
  -- extends the paid period or grants an indefinite cached entitlement.
  IF account.verified_at > observed_at OR account.verified_at <= observed_at - INTERVAL '15 minutes'
    THEN RETURN 'verification-stale'; END IF;
  RETURN 'paid-active';
END;
$$;
