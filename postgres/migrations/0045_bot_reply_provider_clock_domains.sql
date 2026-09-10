-- Keep Meta's provider occurrence time separate from Connect's local
-- reconciliation time. Provider ordering remains based on
-- last_status_event_at, while updated_at and terminal_settled_at are local,
-- causal timestamps supplied by the trusted reconciliation runtime.

CREATE OR REPLACE FUNCTION public.guard_bot_reply_provider_link_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.delivery_key IS DISTINCT FROM OLD.delivery_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.provider_message_id IS DISTINCT FROM OLD.provider_message_id
    OR NEW.reservation_key IS DISTINCT FROM OLD.reservation_key
    OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Bot reply provider identity is immutable';
  END IF;

  IF OLD.terminal_outcome IS NOT NULL
    AND (
      NEW.terminal_outcome IS DISTINCT FROM OLD.terminal_outcome
      OR NEW.terminal_settled_at IS DISTINCT FROM OLD.terminal_settled_at
    )
  THEN
    RAISE EXCEPTION 'Bot reply terminal outcome is immutable';
  END IF;

  IF NEW.last_status_event_key IS NOT DISTINCT FROM OLD.last_status_event_key
    OR NEW.last_status_event_at IS NULL
    OR (
      OLD.last_status_event_at IS NOT NULL
      AND NEW.last_status_event_at < OLD.last_status_event_at
    )
    OR (
      OLD.last_status_event_at = NEW.last_status_event_at
      AND (
        CASE NEW.provider_status
          WHEN 'accepted' THEN 0 WHEN 'sent' THEN 1
          WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 WHEN 'failed' THEN 4
        END
      ) <= (
        CASE OLD.provider_status
          WHEN 'accepted' THEN 0 WHEN 'sent' THEN 1
          WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 WHEN 'failed' THEN 4
        END
      )
    )
    OR NEW.updated_at < OLD.updated_at
    OR (
      OLD.terminal_outcome IS NULL
      AND NEW.terminal_outcome IS NOT NULL
      AND NEW.terminal_settled_at IS DISTINCT FROM NEW.updated_at
    )
  THEN
    RAISE EXCEPTION 'Bot reply provider status does not advance';
  END IF;

  IF OLD.terminal_outcome IS NULL AND NEW.terminal_outcome IS NOT NULL THEN
    PERFORM 1
    FROM public.whatsapp_rate_limit_reservations
    WHERE reservation_key = NEW.reservation_key
    FOR UPDATE;

    IF EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements
      WHERE reservation_key = NEW.reservation_key
        AND (
          outcome IS DISTINCT FROM NEW.terminal_outcome
          OR settled_at IS DISTINCT FROM NEW.terminal_settled_at
        )
    ) THEN
      RAISE EXCEPTION
        'Bot reply settlement conflicts with rate-limit evidence';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_bot_reply_provider_link_update() IS
  'Orders raw Meta provider events independently from trusted local reconciliation and settlement time.';

CREATE OR REPLACE FUNCTION public.guard_campaign_delivery_provider_link_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.delivery_key IS DISTINCT FROM OLD.delivery_key
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.provider_message_id IS DISTINCT FROM OLD.provider_message_id
    OR NEW.reservation_key IS DISTINCT FROM OLD.reservation_key
    OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Campaign delivery provider identity is immutable';
  END IF;

  IF OLD.terminal_outcome IS NOT NULL
    AND (
      NEW.terminal_outcome IS DISTINCT FROM OLD.terminal_outcome
      OR NEW.terminal_settled_at IS DISTINCT FROM OLD.terminal_settled_at
    )
  THEN
    RAISE EXCEPTION 'Campaign delivery terminal outcome is immutable';
  END IF;

  IF NEW.last_status_event_key IS NOT DISTINCT FROM OLD.last_status_event_key
    OR NEW.last_status_event_at IS NULL
    OR (
      OLD.last_status_event_at IS NOT NULL
      AND NEW.last_status_event_at < OLD.last_status_event_at
    )
    OR (
      OLD.last_status_event_at = NEW.last_status_event_at
      AND (
        CASE NEW.provider_status
          WHEN 'accepted' THEN 0 WHEN 'sent' THEN 1
          WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 WHEN 'failed' THEN 4
        END
      ) <= (
        CASE OLD.provider_status
          WHEN 'accepted' THEN 0 WHEN 'sent' THEN 1
          WHEN 'delivered' THEN 2 WHEN 'read' THEN 3 WHEN 'failed' THEN 4
        END
      )
    )
    OR NEW.updated_at < OLD.updated_at
    OR (
      OLD.terminal_outcome IS NULL
      AND NEW.terminal_outcome IS NOT NULL
      AND NEW.terminal_settled_at IS DISTINCT FROM NEW.updated_at
    )
  THEN
    RAISE EXCEPTION 'Campaign provider status does not advance';
  END IF;

  IF OLD.terminal_outcome IS NULL AND NEW.terminal_outcome IS NOT NULL THEN
    PERFORM 1
    FROM public.whatsapp_rate_limit_reservations
    WHERE reservation_key = NEW.reservation_key
    FOR UPDATE;

    IF EXISTS (
      SELECT 1
      FROM public.whatsapp_rate_limit_settlements
      WHERE reservation_key = NEW.reservation_key
        AND (
          outcome IS DISTINCT FROM NEW.terminal_outcome
          OR settled_at IS DISTINCT FROM NEW.terminal_settled_at
        )
    ) THEN
      RAISE EXCEPTION
        'Campaign delivery settlement conflicts with rate-limit evidence';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_campaign_delivery_provider_link_update() IS
  'Orders raw Meta campaign events independently from trusted local reconciliation and settlement time.';
