-- Ephemeral worker health, not evidence of live provider acceptance or payment.
-- The API receives neither provider credentials nor a caller-supplied readiness flag.
CREATE TABLE ai_runtime_worker_health (
  owner_key TEXT PRIMARY KEY CHECK (owner_key ~ '^scheduler_owner_v1_[a-f0-9]{64}$'),
  ready BOOLEAN NOT NULL,
  rate_card_valid_until TIMESTAMPTZ,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK ((ready AND rate_card_valid_until IS NOT NULL AND isfinite(rate_card_valid_until))
    OR (NOT ready AND rate_card_valid_until IS NULL))
);

CREATE FUNCTION ai_runtime_workers_ready_v1() RETURNS BOOLEAN
LANGUAGE sql VOLATILE SET search_path=pg_catalog,pg_temp AS $$
  SELECT COALESCE(bool_and(ready AND rate_card_valid_until > clock_timestamp()),FALSE)
  FROM public.ai_runtime_worker_health
  WHERE observed_at <= clock_timestamp()
    AND observed_at > clock_timestamp() - INTERVAL '90 seconds';
$$;
