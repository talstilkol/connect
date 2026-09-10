-- PostgreSQL AI knowledge sources and immutable processed passages.
-- This migration intentionally contains no seed or demonstration data.

CREATE TABLE knowledge_sources (
  source_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  content_sha256 TEXT NOT NULL,
  file_name TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_object_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending-validation',
  last_error_code TEXT,
  ready_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT knowledge_sources_tenant_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants (id)
    ON DELETE CASCADE,
  CONSTRAINT knowledge_sources_key_valid
    CHECK (source_key ~ '^knowledge_source_v1_[0-9a-f]{64}$'),
  CONSTRAINT knowledge_sources_digest_valid
    CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT knowledge_sources_file_name_valid
    CHECK (
      length(file_name) BETWEEN 1 AND 512
      AND file_name = btrim(file_name)
      AND file_name !~ '[[:cntrl:]]'
    ),
  CONSTRAINT knowledge_sources_media_type_valid
    CHECK (
      length(media_type) BETWEEN 3 AND 255
      AND media_type = lower(btrim(media_type))
      AND media_type ~ '^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$'
    ),
  CONSTRAINT knowledge_sources_size_positive
    CHECK (size_bytes BETWEEN 1 AND 9007199254740991),
  CONSTRAINT knowledge_sources_storage_key_valid
    CHECK (
      length(storage_object_key) BETWEEN 1 AND 1024
      AND storage_object_key = 'knowledge/v1/' || source_key
    ),
  CONSTRAINT knowledge_sources_status_valid
    CHECK (
      status IN (
        'pending-upload',
        'pending-validation',
        'pending-scan',
        'scanning',
        'ready',
        'rejected',
        'archived'
      )
    ),
  CONSTRAINT knowledge_sources_error_code_valid
    CHECK (
      last_error_code IS NULL
      OR last_error_code ~ '^[A-Z0-9_]{1,100}$'
    ),
  CONSTRAINT knowledge_sources_state_consistent
    CHECK (
      (
        status IN (
          'pending-upload',
          'pending-validation',
          'pending-scan',
          'scanning'
        )
        AND last_error_code IS NULL
        AND ready_at IS NULL
      )
      OR
      (
        status = 'ready'
        AND last_error_code IS NULL
        AND ready_at IS NOT NULL
      )
      OR
      (
        status = 'rejected'
        AND last_error_code IS NOT NULL
        AND ready_at IS NULL
      )
      OR
      (
        status = 'archived'
        AND (
          (last_error_code IS NULL AND ready_at IS NOT NULL)
          OR
          (last_error_code IS NOT NULL AND ready_at IS NULL)
        )
      )
    ),
  CONSTRAINT knowledge_sources_version_positive
    CHECK (version >= 1),
  CONSTRAINT knowledge_sources_timestamps_valid
    CHECK (
      created_at = date_trunc('milliseconds', created_at)
      AND updated_at = date_trunc('milliseconds', updated_at)
      AND updated_at >= created_at
      AND (
        ready_at IS NULL
        OR ready_at = date_trunc('milliseconds', ready_at)
      )
    ),
  CONSTRAINT knowledge_sources_tenant_key_uq
    UNIQUE (tenant_id, source_key),
  CONSTRAINT knowledge_sources_tenant_digest_uq
    UNIQUE (tenant_id, content_sha256),
  CONSTRAINT knowledge_sources_storage_key_uq
    UNIQUE (storage_object_key)
);

CREATE INDEX knowledge_sources_tenant_status_updated_idx
  ON knowledge_sources (tenant_id, status, updated_at);

CREATE TABLE knowledge_passages (
  passage_key TEXT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  source_key TEXT NOT NULL,
  passage_ordinal INTEGER NOT NULL,
  content_sha256 TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT knowledge_passages_source_fk
    FOREIGN KEY (tenant_id, source_key)
    REFERENCES knowledge_sources (tenant_id, source_key)
    ON DELETE CASCADE,
  CONSTRAINT knowledge_passages_key_valid
    CHECK (passage_key ~ '^knowledge_passage_v1_[0-9a-f]{64}$'),
  CONSTRAINT knowledge_passages_source_key_valid
    CHECK (source_key ~ '^knowledge_source_v1_[0-9a-f]{64}$'),
  CONSTRAINT knowledge_passages_ordinal_positive
    CHECK (passage_ordinal >= 1),
  CONSTRAINT knowledge_passages_digest_valid
    CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT knowledge_passages_content_valid
    CHECK (
      length(content) BETWEEN 1 AND 16384
      AND content = btrim(content)
    ),
  CONSTRAINT knowledge_passages_created_at_milliseconds
    CHECK (created_at = date_trunc('milliseconds', created_at)),
  CONSTRAINT knowledge_passages_tenant_key_uq
    UNIQUE (tenant_id, passage_key),
  CONSTRAINT knowledge_passages_tenant_source_ordinal_uq
    UNIQUE (tenant_id, source_key, passage_ordinal)
);

CREATE INDEX knowledge_passages_tenant_source_idx
  ON knowledge_passages (tenant_id, source_key, passage_ordinal);

CREATE TABLE ai_agent_version_sources (
  tenant_id BIGINT NOT NULL,
  ai_agent_version_key TEXT NOT NULL,
  source_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
    DEFAULT date_trunc('milliseconds', CURRENT_TIMESTAMP),
  CONSTRAINT ai_agent_version_sources_pk
    PRIMARY KEY (tenant_id, ai_agent_version_key, source_key),
  CONSTRAINT ai_agent_version_sources_version_fk
    FOREIGN KEY (tenant_id, ai_agent_version_key)
    REFERENCES ai_agent_versions (tenant_id, ai_agent_version_key)
    ON DELETE CASCADE,
  CONSTRAINT ai_agent_version_sources_source_fk
    FOREIGN KEY (tenant_id, source_key)
    REFERENCES knowledge_sources (tenant_id, source_key)
    ON DELETE RESTRICT,
  CONSTRAINT ai_agent_version_sources_version_key_valid
    CHECK (
      ai_agent_version_key ~ '^ai_agent_version_v1_[0-9a-f]{64}$'
    ),
  CONSTRAINT ai_agent_version_sources_source_key_valid
    CHECK (source_key ~ '^knowledge_source_v1_[0-9a-f]{64}$'),
  CONSTRAINT ai_agent_version_sources_created_at_milliseconds
    CHECK (created_at = date_trunc('milliseconds', created_at))
);

CREATE INDEX ai_agent_version_sources_tenant_version_idx
  ON ai_agent_version_sources (tenant_id, ai_agent_version_key);

CREATE INDEX ai_agent_version_sources_tenant_source_idx
  ON ai_agent_version_sources (tenant_id, source_key);
