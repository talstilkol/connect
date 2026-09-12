-- Connect policy v1: billing recovery and administrative tenant status remain
-- independent of paid execution. A production checkout permanently adopts paid
-- policy; disabling the provider worker must never restore pilot access.
CREATE TRIGGER paddle_checkout_delete_guard BEFORE DELETE ON paddle_checkout_intents
  FOR EACH ROW EXECUTE FUNCTION reject_paddle_receipt_mutation();
CREATE TRIGGER paddle_account_delete_guard BEFORE DELETE ON paddle_accounts
  FOR EACH ROW EXECUTE FUNCTION reject_paddle_receipt_mutation();

CREATE FUNCTION tenant_paid_access_reason_v1(requested_tenant BIGINT)
RETURNS TEXT LANGUAGE plpgsql VOLATILE SET search_path=pg_catalog,pg_temp AS $$
DECLARE account public.paddle_accounts%ROWTYPE; observed_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id=requested_tenant AND status IN ('trial','active','payment_failed'))
    THEN RETURN 'tenant-inactive'; END IF;
  SELECT * INTO account FROM public.paddle_accounts WHERE tenant_id=requested_tenant AND environment='production';
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

CREATE FUNCTION tenant_paid_access_allowed_v1(requested_tenant BIGINT)
RETURNS BOOLEAN LANGUAGE sql VOLATILE SET search_path=pg_catalog,pg_temp AS $$
  SELECT public.tenant_paid_access_reason_v1(requested_tenant) IN ('manual-pilot','paid-active');
$$;

-- Defense in depth for alternate/pinned repository callers. These are execution
-- transitions only: recording accepted outcomes and settling usage stays legal
-- after cancellation. Application callers take the tenant barrier before locks.
CREATE FUNCTION guard_paid_execution_v1() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF NOT public.tenant_paid_access_allowed_v1(NEW.tenant_id) THEN
    RAISE EXCEPTION 'Paid execution is unavailable' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER paid_bot_dispatch_guard BEFORE INSERT ON bot_reply_provider_request_claims
  FOR EACH ROW EXECUTE FUNCTION guard_paid_execution_v1();
CREATE TRIGGER paid_ai_generation_guard BEFORE INSERT ON ai_generation_journal
  FOR EACH ROW EXECUTE FUNCTION guard_paid_execution_v1();
CREATE TRIGGER paid_manual_reply_guard BEFORE UPDATE ON manual_reply_outbox
  FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state AND NEW.state='sending') EXECUTE FUNCTION guard_paid_execution_v1();
CREATE TRIGGER paid_ai_reply_guard BEFORE UPDATE ON ai_reply_deliveries
  FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state AND NEW.state='sending') EXECUTE FUNCTION guard_paid_execution_v1();
CREATE TRIGGER paid_knowledge_upload_guard BEFORE UPDATE ON knowledge_ingestion_jobs
  FOR EACH ROW WHEN (OLD.state IS DISTINCT FROM NEW.state AND NEW.state='uploading') EXECUTE FUNCTION guard_paid_execution_v1();
CREATE TRIGGER paid_campaign_send_guard BEFORE UPDATE ON campaign_recipients
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status='sending') EXECUTE FUNCTION guard_paid_execution_v1();
CREATE TRIGGER paid_template_submission_guard BEFORE UPDATE ON message_template_submission_outbox
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status='submitting') EXECUTE FUNCTION guard_paid_execution_v1();
