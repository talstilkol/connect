-- PostgreSQL template and campaign sources for operational reports.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE message_templates (
  template_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  meta_template_id TEXT,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  definition_json JSONB NOT NULL,
  submission_key TEXT,
  submission_started_at TIMESTAMPTZ,
  last_submission_error_code TEXT,
  last_status_event_key TEXT,
  last_status_event_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT message_templates_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT message_templates_key_valid
    CHECK (template_key ~ '^template_v1_[0-9a-f]{64}$'),
  CONSTRAINT message_templates_meta_id_valid
    CHECK (
      meta_template_id IS NULL
      OR meta_template_id ~ '^[0-9]{1,255}$'
    ),
  CONSTRAINT message_templates_name_valid
    CHECK (name ~ '^[a-z0-9_]{1,255}$'),
  CONSTRAINT message_templates_language_valid
    CHECK (language IN ('he', 'en_US', 'ar')),
  CONSTRAINT message_templates_category_valid
    CHECK (category IN ('MARKETING', 'UTILITY')),
  CONSTRAINT message_templates_status_valid
    CHECK (
      status IN (
        'draft',
        'submitting',
        'pending_review',
        'approved',
        'rejected',
        'disabled',
        'deleted'
      )
    ),
  CONSTRAINT message_templates_definition_json_bounded
    CHECK (octet_length(definition_json::text) BETWEEN 2 AND 50000),
  CONSTRAINT message_templates_submission_key_valid
    CHECK (
      submission_key IS NULL
      OR submission_key ~ '^template_submission_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT message_templates_submission_error_code_valid
    CHECK (
      last_submission_error_code IS NULL
      OR last_submission_error_code ~ '^[A-Z0-9_]{1,100}$'
    ),
  CONSTRAINT message_templates_status_event_key_valid
    CHECK (
      last_status_event_key IS NULL
      OR last_status_event_key ~ '^[0-9a-f]{64}$'
    ),
  CONSTRAINT message_templates_status_event_pair_consistent
    CHECK (
      (last_status_event_key IS NULL AND last_status_event_at IS NULL)
      OR
      (
        last_status_event_key IS NOT NULL
        AND last_status_event_at IS NOT NULL
      )
    ),
  CONSTRAINT message_templates_timestamps_milliseconds
    CHECK (
      (
        submission_started_at IS NULL
        OR submission_started_at =
          date_trunc('milliseconds', submission_started_at)
      )
      AND (
        last_status_event_at IS NULL
        OR last_status_event_at =
          date_trunc('milliseconds', last_status_event_at)
      )
      AND (
        submitted_at IS NULL
        OR submitted_at = date_trunc('milliseconds', submitted_at)
      )
      AND (
        reviewed_at IS NULL
        OR reviewed_at = date_trunc('milliseconds', reviewed_at)
      )
      AND created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT message_templates_version_positive
    CHECK (version >= 1),
  CONSTRAINT message_templates_lifecycle_consistent
    CHECK (
      (
        status = 'draft'
        AND meta_template_id IS NULL
        AND submission_key IS NULL
        AND submission_started_at IS NULL
        AND last_status_event_key IS NULL
        AND last_status_event_at IS NULL
        AND submitted_at IS NULL
        AND reviewed_at IS NULL
      )
      OR
      (
        status = 'submitting'
        AND meta_template_id IS NULL
        AND submission_key IS NOT NULL
        AND submission_started_at IS NOT NULL
        AND last_submission_error_code IS NULL
        AND last_status_event_key IS NULL
        AND last_status_event_at IS NULL
        AND submitted_at IS NULL
        AND reviewed_at IS NULL
      )
      OR
      (
        status = 'pending_review'
        AND meta_template_id IS NOT NULL
        AND submission_key IS NOT NULL
        AND submission_started_at IS NOT NULL
        AND last_submission_error_code IS NULL
        AND submitted_at IS NOT NULL
        AND reviewed_at IS NULL
      )
      OR
      (
        status IN ('approved', 'rejected', 'disabled', 'deleted')
        AND meta_template_id IS NOT NULL
        AND submission_key IS NOT NULL
        AND submission_started_at IS NOT NULL
        AND last_submission_error_code IS NULL
        AND submitted_at IS NOT NULL
        AND reviewed_at IS NOT NULL
      )
    ),
  CONSTRAINT message_templates_tenant_key_uq
    UNIQUE (tenant_id, template_key),
  CONSTRAINT message_templates_tenant_name_language_uq
    UNIQUE (tenant_id, name, language)
);

CREATE UNIQUE INDEX message_templates_meta_id_uq
  ON message_templates (meta_template_id)
  WHERE meta_template_id IS NOT NULL;

CREATE INDEX message_templates_tenant_status_updated_idx
  ON message_templates (tenant_id, status, updated_at);

CREATE TABLE campaigns (
  campaign_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  delivery_mode TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  timezone TEXT NOT NULL,
  template_key TEXT NOT NULL,
  template_snapshot_json JSONB NOT NULL,
  audience_snapshot_key TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  activated_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT campaigns_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT campaigns_template_fk
    FOREIGN KEY (tenant_id, template_key)
    REFERENCES message_templates (tenant_id, template_key)
    ON DELETE RESTRICT,
  CONSTRAINT campaigns_key_valid
    CHECK (campaign_key ~ '^campaign_v1_[0-9a-f]{64}$'),
  CONSTRAINT campaigns_name_valid
    CHECK (
      length(btrim(name)) BETWEEN 1 AND 160
      AND name !~ '[[:cntrl:]]'
    ),
  CONSTRAINT campaigns_status_valid
    CHECK (
      status IN (
        'draft',
        'scheduled',
        'running',
        'paused',
        'completed',
        'cancelled',
        'failed'
      )
    ),
  CONSTRAINT campaigns_delivery_mode_valid
    CHECK (delivery_mode IN ('immediate', 'scheduled')),
  CONSTRAINT campaigns_schedule_consistent
    CHECK (
      (delivery_mode = 'immediate' AND scheduled_at IS NULL)
      OR
      (delivery_mode = 'scheduled' AND scheduled_at IS NOT NULL)
    ),
  CONSTRAINT campaigns_timezone_valid
    CHECK (
      length(btrim(timezone)) BETWEEN 1 AND 100
      AND timezone !~ '[[:cntrl:]]'
    ),
  CONSTRAINT campaigns_template_key_valid
    CHECK (template_key ~ '^template_v1_[0-9a-f]{64}$'),
  CONSTRAINT campaigns_template_snapshot_json_bounded
    CHECK (octet_length(template_snapshot_json::text) BETWEEN 2 AND 50000),
  CONSTRAINT campaigns_audience_key_valid
    CHECK (audience_snapshot_key ~ '^[0-9a-f]{64}$'),
  CONSTRAINT campaigns_recipient_count_bounded
    CHECK (recipient_count BETWEEN 1 AND 100000),
  CONSTRAINT campaigns_version_positive
    CHECK (version >= 1),
  CONSTRAINT campaigns_error_code_valid
    CHECK (
      last_error_code IS NULL
      OR last_error_code ~ '^[A-Z0-9_]{1,100}$'
    ),
  CONSTRAINT campaigns_timestamps_milliseconds
    CHECK (
      (
        scheduled_at IS NULL
        OR scheduled_at = date_trunc('milliseconds', scheduled_at)
      )
      AND (
        activated_at IS NULL
        OR activated_at = date_trunc('milliseconds', activated_at)
      )
      AND (
        started_at IS NULL
        OR started_at = date_trunc('milliseconds', started_at)
      )
      AND (
        completed_at IS NULL
        OR completed_at = date_trunc('milliseconds', completed_at)
      )
      AND created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
    ),
  CONSTRAINT campaigns_tenant_key_uq
    UNIQUE (tenant_id, campaign_key)
);

CREATE INDEX campaigns_tenant_audience_idx
  ON campaigns (tenant_id, audience_snapshot_key);

CREATE INDEX campaigns_tenant_status_schedule_idx
  ON campaigns (tenant_id, status, scheduled_at);

CREATE INDEX campaigns_tenant_created_idx
  ON campaigns (tenant_id, created_at);
