import {
  railwayWorkerSchedulerId,
  workerSchedulerMaximumCatchUpTicks,
  workerSchedulerMaximumLeaseSeconds,
  workerSchedulerMinimumLeaseSeconds,
  workerSchedulerOwnerKeyPattern,
  type WorkerSchedulerClaim,
  type WorkerSchedulerLeaseRepository,
} from "../../shared/domain/workerScheduler.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const claimRowKeys = Object.freeze([
  "schedulerId",
  "ownerKey",
  "fencingToken",
  "tick",
  "claimedAt",
  "leaseExpiresAt",
]);

export const postgresWorkerSchedulerLeaseSql = Object.freeze({
  claimNext: `
    WITH input AS (
      SELECT
        $1::text AS scheduler_id,
        $2::text AS owner_key,
        $3::timestamptz AS current_tick,
        $4::timestamptz AS observed_at,
        $5::integer AS lease_seconds,
        $3::timestamptz - (($6::integer - 1) * interval '1 minute')
          AS minimum_tick
    ),
    inserted AS (
      INSERT INTO worker_scheduler_leases (
        scheduler_id,
        owner_key,
        fencing_token,
        state,
        current_tick,
        last_completed_tick,
        claimed_at,
        lease_expires_at,
        completed_at
      )
      SELECT
        input.scheduler_id,
        input.owner_key,
        1,
        'claimed',
        input.current_tick,
        NULL,
        input.observed_at,
        input.observed_at + make_interval(secs => input.lease_seconds),
        NULL
      FROM input
      ON CONFLICT (scheduler_id) DO NOTHING
      RETURNING
        scheduler_id AS "schedulerId",
        owner_key AS "ownerKey",
        fencing_token AS "fencingToken",
        current_tick AS "tick",
        claimed_at AS "claimedAt",
        lease_expires_at AS "leaseExpiresAt"
    ),
    eligible AS (
      SELECT leases.scheduler_id
      FROM worker_scheduler_leases AS leases
      CROSS JOIN input
      WHERE leases.scheduler_id = input.scheduler_id
        AND NOT EXISTS (SELECT 1 FROM inserted)
        AND (
          (
            leases.state = 'claimed'
            AND leases.lease_expires_at <= input.observed_at
          )
          OR (
            leases.state = 'completed'
            AND leases.current_tick < input.current_tick
          )
        )
      FOR UPDATE
    ),
    advanced AS (
      UPDATE worker_scheduler_leases AS leases
      SET
        owner_key = input.owner_key,
        fencing_token = leases.fencing_token + 1,
        state = 'claimed',
        current_tick = CASE
          WHEN leases.state = 'claimed' THEN leases.current_tick
          ELSE GREATEST(
            leases.current_tick + interval '1 minute',
            input.minimum_tick
          )
        END,
        claimed_at = input.observed_at,
        lease_expires_at =
          input.observed_at + make_interval(secs => input.lease_seconds),
        completed_at = NULL
      FROM input, eligible
      WHERE leases.scheduler_id = eligible.scheduler_id
      RETURNING
        leases.scheduler_id AS "schedulerId",
        leases.owner_key AS "ownerKey",
        leases.fencing_token AS "fencingToken",
        leases.current_tick AS "tick",
        leases.claimed_at AS "claimedAt",
        leases.lease_expires_at AS "leaseExpiresAt"
    )
    SELECT * FROM inserted
    UNION ALL
    SELECT * FROM advanced
  `,
  complete: `
    UPDATE worker_scheduler_leases
    SET
      state = 'completed',
      last_completed_tick = current_tick,
      completed_at = $5::timestamptz
    WHERE scheduler_id = $1
      AND owner_key = $2
      AND fencing_token = $3
      AND current_tick = $4::timestamptz
      AND state = 'claimed'
    RETURNING current_tick AS "completedTick"
  `,
});

function requireCanonicalTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Worker scheduler timestamp is invalid");
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error("Worker scheduler timestamp is invalid");
  }

  return value;
}

function requireMinuteTimestamp(value: unknown): string {
  const timestamp = requireCanonicalTimestamp(value);
  const date = new Date(timestamp);

  if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) {
    throw new Error("Worker scheduler tick is invalid");
  }

  return timestamp;
}

function requireOwnerKey(value: unknown): string {
  if (typeof value !== "string" || !workerSchedulerOwnerKeyPattern.test(value)) {
    throw new Error("Worker scheduler owner key is invalid");
  }

  return value;
}

function requireSchedulerId(value: unknown): typeof railwayWorkerSchedulerId {
  if (value !== railwayWorkerSchedulerId) {
    throw new Error("Worker scheduler identity is invalid");
  }

  return value;
}

function requireBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  message: string,
): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error(message);
  }

  return Number(value);
}

function parseClaim(value: unknown): Readonly<WorkerSchedulerClaim> {
  const row = requireExactPostgresRow(value, claimRowKeys);
  const claim = Object.freeze({
    schedulerId: requireSchedulerId(row.schedulerId),
    ownerKey: requireOwnerKey(row.ownerKey),
    fencingToken: parsePostgresPositiveInteger(row.fencingToken),
    tick: requireMinuteTimestamp(parsePostgresTimestamp(row.tick)),
    claimedAt: requireCanonicalTimestamp(parsePostgresTimestamp(row.claimedAt)),
    leaseExpiresAt: requireCanonicalTimestamp(
      parsePostgresTimestamp(row.leaseExpiresAt),
    ),
  });

  if (claim.leaseExpiresAt <= claim.claimedAt) {
    throw new Error("PostgreSQL returned an invalid worker scheduler lease");
  }

  return claim;
}

export function createPostgresWorkerSchedulerLeaseRepository(
  queries: PostgresQueryExecutor,
): WorkerSchedulerLeaseRepository {
  if (typeof queries?.query !== "function") {
    throw new Error("PostgreSQL worker scheduler dependency is invalid");
  }

  return Object.freeze({
    async claimNext(
      command: Parameters<WorkerSchedulerLeaseRepository["claimNext"]>[0],
    ) {
      const schedulerId = requireSchedulerId(command?.schedulerId);
      const ownerKey = requireOwnerKey(command?.ownerKey);
      const currentTick = requireMinuteTimestamp(command?.currentTick);
      const observedAt = requireCanonicalTimestamp(command?.observedAt);
      const leaseSeconds = requireBoundedInteger(
        command?.leaseSeconds,
        workerSchedulerMinimumLeaseSeconds,
        workerSchedulerMaximumLeaseSeconds,
        "Worker scheduler lease duration is invalid",
      );
      const maximumCatchUpTicks = requireBoundedInteger(
        command?.maximumCatchUpTicks,
        1,
        workerSchedulerMaximumCatchUpTicks,
        "Worker scheduler catch-up limit is invalid",
      );
      const tickMilliseconds = new Date(currentTick).getTime();
      const observedMilliseconds = new Date(observedAt).getTime();

      if (
        observedMilliseconds < tickMilliseconds ||
        observedMilliseconds >= tickMilliseconds + 60_000
      ) {
        throw new Error("Worker scheduler observation is outside its tick");
      }

      const result = await queries.query<Record<string, unknown>>(
        postgresWorkerSchedulerLeaseSql.claimNext,
        [
          schedulerId,
          ownerKey,
          currentTick,
          observedAt,
          leaseSeconds,
          maximumCatchUpTicks,
        ],
      );
      const rows = requirePostgresRows(result, 1);

      if (rows.length === 0) {
        return Object.freeze({ outcome: "not-claimed", claim: null });
      }

      const claim = parseClaim(rows[0]);
      if (
        claim.schedulerId !== schedulerId ||
        claim.ownerKey !== ownerKey ||
        claim.tick > currentTick ||
        claim.claimedAt !== observedAt
      ) {
        throw new Error("PostgreSQL returned a mismatched worker scheduler claim");
      }

      return Object.freeze({ outcome: "claimed", claim });
    },

    async complete(
      command: Parameters<WorkerSchedulerLeaseRepository["complete"]>[0],
    ) {
      const schedulerId = requireSchedulerId(command?.schedulerId);
      const ownerKey = requireOwnerKey(command?.ownerKey);
      const fencingToken = requireBoundedInteger(
        command?.fencingToken,
        1,
        Number.MAX_SAFE_INTEGER,
        "Worker scheduler fencing token is invalid",
      );
      const tick = requireMinuteTimestamp(command?.tick);
      const completedAt = requireCanonicalTimestamp(command?.completedAt);
      const result = await queries.query<Record<string, unknown>>(
        postgresWorkerSchedulerLeaseSql.complete,
        [schedulerId, ownerKey, fencingToken, tick, completedAt],
      );
      const rows = requirePostgresRows(result, 1);

      if (rows.length === 0) {
        return Object.freeze({ outcome: "claim-lost", completedTick: null });
      }

      const row = requireExactPostgresRow(rows[0], ["completedTick"]);
      const completedTick = requireMinuteTimestamp(
        parsePostgresTimestamp(row.completedTick),
      );

      if (completedTick !== tick) {
        throw new Error("PostgreSQL returned a mismatched scheduler completion");
      }

      return Object.freeze({ outcome: "completed", completedTick });
    },
  });
}
