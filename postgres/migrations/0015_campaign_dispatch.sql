-- PostgreSQL campaign-recipient state required by the Railway scheduler.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE campaign_recipients (
  campaign_key TEXT NOT NULL,
  tenant_id BIGINT NOT NULL,
  contact_id BIGINT NOT NULL,
  contact_version INTEGER NOT NULL,
  phone_e164 TEXT NOT NULL,
  personalization_json JSONB NOT NULL,
  personalization_key TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  queued_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT campaign_recipients_pk
    PRIMARY KEY (campaign_key, contact_id),
  CONSTRAINT campaign_recipients_campaign_fk
    FOREIGN KEY (tenant_id, campaign_key)
    REFERENCES campaigns (tenant_id, campaign_key)
    ON DELETE CASCADE,
  CONSTRAINT campaign_recipients_contact_fk
    FOREIGN KEY (tenant_id, contact_id)
    REFERENCES contacts (tenant_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT campaign_recipients_campaign_key_valid
    CHECK (campaign_key ~ '^campaign_v1_[0-9a-f]{64}$'),
  CONSTRAINT campaign_recipients_contact_version_positive
    CHECK (contact_version >= 1),
  CONSTRAINT campaign_recipients_phone_e164_valid
    CHECK (phone_e164 ~ '^\+[1-9][0-9]{0,14}$'),
  CONSTRAINT campaign_recipients_personalization_json_bounded
    CHECK (
      jsonb_typeof(personalization_json) = 'object'
      AND octet_length(personalization_json::text) BETWEEN 2 AND 50000
    ),
  CONSTRAINT campaign_recipients_personalization_key_valid
    CHECK (personalization_key ~ '^[0-9a-f]{64}$'),
  CONSTRAINT campaign_recipients_delivery_key_valid
    CHECK (delivery_key ~ '^campaign_delivery_v1_[0-9a-f]{64}$'),
  CONSTRAINT campaign_recipients_status_valid
    CHECK (
      status IN (
        'pending',
        'queued',
        'sending',
        'accepted',
        'delivered',
        'read',
        'failed',
        'skipped',
        'cancelled'
      )
    ),
  CONSTRAINT campaign_recipients_attempt_count_nonnegative
    CHECK (attempt_count >= 0),
  CONSTRAINT campaign_recipients_error_code_valid
    CHECK (
      last_error_code IS NULL
      OR last_error_code ~ '^[A-Z0-9_]{1,100}$'
    ),
  CONSTRAINT campaign_recipients_timestamps_milliseconds
    CHECK (
      (
        queued_at IS NULL
        OR queued_at = date_trunc('milliseconds', queued_at)
      )
      AND (
        accepted_at IS NULL
        OR accepted_at = date_trunc('milliseconds', accepted_at)
      )
      AND created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT campaign_recipients_queue_state_consistent
    CHECK (
      (status = 'pending' AND queued_at IS NULL AND accepted_at IS NULL)
      OR
      (
        status IN ('queued', 'sending', 'failed', 'skipped', 'cancelled')
        AND accepted_at IS NULL
      )
      OR
      (
        status IN ('accepted', 'delivered', 'read')
        AND queued_at IS NOT NULL
        AND accepted_at IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX campaign_recipients_delivery_key_uq
  ON campaign_recipients (delivery_key);

CREATE INDEX campaign_recipients_dispatch_idx
  ON campaign_recipients (status, campaign_key, contact_id);

CREATE INDEX campaign_recipients_tenant_status_idx
  ON campaign_recipients (tenant_id, status, contact_id);
