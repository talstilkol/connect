import type {
  PostgresQueryResult,
} from "./postgresTransaction.ts";

export function requirePostgresRows<TRow>(
  result: Readonly<PostgresQueryResult<TRow>>,
  maximum: number,
): readonly TRow[] {
  if (
    !Number.isSafeInteger(maximum) ||
    maximum < 0 ||
    !Number.isSafeInteger(result.rowCount) ||
    result.rowCount < 0 ||
    result.rowCount > maximum ||
    !Array.isArray(result.rows) ||
    result.rows.length !== result.rowCount
  ) {
    throw new Error("PostgreSQL returned an invalid result");
  }

  return result.rows;
}

export function requireExactPostgresRow(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("PostgreSQL returned an invalid row");
  }

  const row = value as Record<string, unknown>;
  const actualKeys = Object.keys(row).sort();
  const normalizedExpectedKeys = [...expectedKeys].sort();

  if (
    actualKeys.length !== normalizedExpectedKeys.length ||
    actualKeys.some(
      (key, index) => key !== normalizedExpectedKeys[index],
    )
  ) {
    throw new Error("PostgreSQL returned an invalid row shape");
  }

  return row;
}

export function parsePostgresPositiveInteger(
  value: unknown,
): number {
  const normalized =
    typeof value === "string" && /^[1-9][0-9]*$/.test(value)
      ? Number(value)
      : value;

  if (
    !Number.isSafeInteger(normalized) ||
    Number(normalized) <= 0
  ) {
    throw new Error("PostgreSQL returned an invalid positive integer");
  }

  return Number(normalized);
}

export function parsePostgresNonnegativeInteger(
  value: unknown,
): number {
  const normalized =
    typeof value === "string" && /^(?:0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;

  if (
    !Number.isSafeInteger(normalized) ||
    Number(normalized) < 0
  ) {
    throw new Error(
      "PostgreSQL returned an invalid nonnegative integer",
    );
  }

  return Number(normalized);
}

export function parsePostgresTimestamp(
  value: unknown,
): string {
  if (
    !(value instanceof Date) &&
    (typeof value !== "string" || value.length > 64)
  ) {
    throw new Error("PostgreSQL returned an invalid timestamp");
  }

  const parsed = value instanceof Date
    ? value
    : new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    throw new Error("PostgreSQL returned an invalid timestamp");
  }

  return parsed.toISOString();
}
