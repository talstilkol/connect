-- Preserve unknown D1 reservation categories explicitly during cutover.
-- Normal runtime writes must still provide MARKETING or UTILITY.

ALTER TABLE whatsapp_rate_limit_reservations
  ALTER COLUMN template_category DROP NOT NULL,
  DROP CONSTRAINT whatsapp_rate_reservations_category_valid,
  ADD CONSTRAINT whatsapp_rate_reservations_category_valid
    CHECK (
      template_category IS NULL
      OR template_category IN ('MARKETING', 'UTILITY')
    );

CREATE FUNCTION enforce_whatsapp_reservation_category_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.template_category IS NULL THEN
    RAISE EXCEPTION
      'New WhatsApp reservation requires a template category';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_rate_reservations_category_guard
BEFORE INSERT ON whatsapp_rate_limit_reservations
FOR EACH ROW
EXECUTE FUNCTION enforce_whatsapp_reservation_category_insert();
