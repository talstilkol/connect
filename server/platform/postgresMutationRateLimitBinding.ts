import type {
  RateLimitBinding,
} from "../security/rateLimit.ts";
import {
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

export const postgresMutationRateLimitPolicyIds = Object.freeze([
  "meta-webhook",
  "tenant-mutation",
  "system-admin-mutation",
] as const);

export type PostgresMutationRateLimitPolicyId =
  (typeof postgresMutationRateLimitPolicyIds)[number];

export interface PostgresMutationRateLimitPolicy {
  readonly policyId: PostgresMutationRateLimitPolicyId;
  readonly policyVersion: number;
  readonly capacity: number;
  readonly refillPeriodSeconds: number;
}

const subjectKeyPattern = /^rate_limit_v1_[a-f0-9]{64}$/;
const maximumPolicyVersion = 2_147_483_647;
const maximumCapacity = 1_000_000;
const maximumRefillPeriodSeconds = 86_400;

export const postgresMutationRateLimitSql = Object.freeze({
  lockScope: `
    SELECT pg_advisory_xact_lock(
      hashtextextended(
        'connect:api-mutation-rate-limit:v1:'
          || $1::text || ':' || $2::integer::text || ':' || $3::text,
        0
      )
    ) AS "lockResult"
  `,
  findBucket: `
    SELECT
      capacity,
      refill_period_seconds AS "refillPeriodSeconds"
    FROM api_mutation_rate_limit_buckets
    WHERE policy_id = $1
      AND policy_version = $2
      AND subject_key = $3
    FOR UPDATE
  `,
  insertBucket: `
    INSERT INTO api_mutation_rate_limit_buckets (
      policy_id,
      policy_version,
      subject_key,
      capacity,
      refill_period_seconds,
      available_tokens,
      refilled_at,
      updated_at
    )
    VALUES (
      $1::text,
      $2::integer,
      $3::text,
      $4::integer,
      $5::integer,
      $4::integer::numeric - 1,
      statement_timestamp(),
      statement_timestamp()
    )
    RETURNING TRUE AS success
  `,
  consumeBucket: `
    WITH evaluated AS (
      SELECT
        LEAST(
          capacity::numeric,
          available_tokens
            + GREATEST(
                EXTRACT(
                  EPOCH FROM (statement_timestamp() - refilled_at)
                ),
                0
              )
              * capacity::numeric
              / refill_period_seconds::numeric
        ) AS replenished_tokens,
        GREATEST(statement_timestamp(), refilled_at) AS consumed_at
      FROM api_mutation_rate_limit_buckets
      WHERE policy_id = $1
        AND policy_version = $2
        AND subject_key = $3
    ),
    updated AS (
      UPDATE api_mutation_rate_limit_buckets AS bucket
      SET
        available_tokens = CASE
          WHEN evaluated.replenished_tokens >= 1
            THEN evaluated.replenished_tokens - 1
          ELSE evaluated.replenished_tokens
        END,
        refilled_at = evaluated.consumed_at,
        updated_at = statement_timestamp()
      FROM evaluated
      WHERE bucket.policy_id = $1
        AND bucket.policy_version = $2
        AND bucket.subject_key = $3
      RETURNING evaluated.replenished_tokens >= 1 AS success
    )
    SELECT success FROM updated
  `,
});

function requireBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < minimum ||
    Number(value) > maximum
  ) {
    throw new Error("PostgreSQL mutation rate-limit policy is invalid");
  }

  return Number(value);
}

function requirePolicy(
  value: Readonly<PostgresMutationRateLimitPolicy>,
): Readonly<PostgresMutationRateLimitPolicy> {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).sort().join(",") !==
      "capacity,policyId,policyVersion,refillPeriodSeconds" ||
    !postgresMutationRateLimitPolicyIds.includes(
      value.policyId as PostgresMutationRateLimitPolicyId,
    )
  ) {
    throw new Error("PostgreSQL mutation rate-limit policy is invalid");
  }

  return Object.freeze({
    policyId: value.policyId,
    policyVersion: requireBoundedInteger(
      value.policyVersion,
      1,
      maximumPolicyVersion,
    ),
    capacity: requireBoundedInteger(value.capacity, 1, maximumCapacity),
    refillPeriodSeconds: requireBoundedInteger(
      value.refillPeriodSeconds,
      1,
      maximumRefillPeriodSeconds,
    ),
  });
}

function requireSubjectKey(value: unknown): string {
  if (typeof value !== "string" || !subjectKeyPattern.test(value)) {
    throw new Error("PostgreSQL mutation rate-limit key is invalid");
  }

  return value;
}

function parseSuccess(value: unknown): boolean {
  const row = requireExactPostgresRow(value, ["success"]);

  if (typeof row.success !== "boolean") {
    throw new Error("PostgreSQL returned invalid mutation rate-limit state");
  }

  return row.success;
}

function parseStoredInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error("PostgreSQL returned invalid mutation rate-limit state");
  }

  return Number(value);
}

export function createPostgresMutationRateLimitBinding(
  transactions: PostgresTransactionManager,
  policyInput: Readonly<PostgresMutationRateLimitPolicy>,
): Readonly<RateLimitBinding> {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL mutation rate-limit dependency is invalid");
  }

  const policy = requirePolicy(policyInput);

  return Object.freeze({
    async limit(input: { key: string }) {
      if (
        !input ||
        typeof input !== "object" ||
        Object.keys(input).join(",") !== "key"
      ) {
        throw new Error("PostgreSQL mutation rate-limit input is invalid");
      }

      const subjectKey = requireSubjectKey(input.key);

      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const parameters = [
            policy.policyId,
            policy.policyVersion,
            subjectKey,
            policy.capacity,
            policy.refillPeriodSeconds,
          ] as const;
          const lock = await transaction.query<Record<string, unknown>>(
            postgresMutationRateLimitSql.lockScope,
            parameters.slice(0, 3),
          );
          const lockRows = requirePostgresRows(lock, 1);
          requireExactPostgresRow(lockRows[0], ["lockResult"]);

          const stored = await transaction.query<Record<string, unknown>>(
            postgresMutationRateLimitSql.findBucket,
            parameters.slice(0, 3),
          );
          const storedRows = requirePostgresRows(stored, 1);

          if (storedRows.length === 0) {
            const inserted = await transaction.query<Record<string, unknown>>(
              postgresMutationRateLimitSql.insertBucket,
              parameters,
            );
            const insertedRows = requirePostgresRows(inserted, 1);

            if (insertedRows.length !== 1) {
              throw new Error(
                "PostgreSQL returned invalid mutation rate-limit state",
              );
            }

            return Object.freeze({
              success: parseSuccess(insertedRows[0]),
            });
          }

          const storedRow = requireExactPostgresRow(storedRows[0], [
            "capacity",
            "refillPeriodSeconds",
          ]);

          if (
            parseStoredInteger(storedRow.capacity) !== policy.capacity ||
            parseStoredInteger(storedRow.refillPeriodSeconds) !==
              policy.refillPeriodSeconds
          ) {
            throw new Error(
              "PostgreSQL mutation rate-limit policy version conflicts",
            );
          }

          const consumed = await transaction.query<Record<string, unknown>>(
            postgresMutationRateLimitSql.consumeBucket,
            parameters.slice(0, 3),
          );
          const consumedRows = requirePostgresRows(consumed, 1);

          if (consumedRows.length !== 1) {
            throw new Error(
              "PostgreSQL returned invalid mutation rate-limit state",
            );
          }

          return Object.freeze({
            success: parseSuccess(consumedRows[0]),
          });
        },
      );
    },
  });
}
