CREATE TABLE worker_scheduler_leases (
  scheduler_id TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL,
  fencing_token BIGINT NOT NULL,
  state TEXT NOT NULL,
  current_tick TIMESTAMPTZ NOT NULL,
  last_completed_tick TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ NOT NULL,
  lease_expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  CONSTRAINT worker_scheduler_leases_scheduler_id_valid CHECK (
    scheduler_id = 'connect-railway-worker-scheduler-v1'
  ),
  CONSTRAINT worker_scheduler_leases_owner_key_valid CHECK (
    owner_key ~ '^scheduler_owner_v1_[a-f0-9]{64}$'
  ),
  CONSTRAINT worker_scheduler_leases_fencing_token_valid CHECK (
    fencing_token >= 1
  ),
  CONSTRAINT worker_scheduler_leases_state_valid CHECK (
    state IN ('claimed', 'completed')
  ),
  CONSTRAINT worker_scheduler_leases_tick_is_minute CHECK (
    current_tick = date_trunc('minute', current_tick)
    AND (
      last_completed_tick IS NULL
      OR last_completed_tick = date_trunc('minute', last_completed_tick)
    )
  ),
  CONSTRAINT worker_scheduler_leases_time_order_valid CHECK (
    lease_expires_at > claimed_at
    AND (
      completed_at IS NULL
      OR completed_at >= claimed_at
    )
  ),
  CONSTRAINT worker_scheduler_leases_state_consistent CHECK (
    (
      state = 'claimed'
      AND completed_at IS NULL
      AND (
        last_completed_tick IS NULL
        OR last_completed_tick < current_tick
      )
    )
    OR (
      state = 'completed'
      AND last_completed_tick = current_tick
      AND completed_at IS NOT NULL
    )
  )
);

CREATE INDEX worker_scheduler_leases_expiry_idx
  ON worker_scheduler_leases (lease_expires_at)
  WHERE state = 'claimed';
