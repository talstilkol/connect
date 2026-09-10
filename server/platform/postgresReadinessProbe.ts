import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

export type PostgresReadinessState =
  | Readonly<{ status: "ready" }>
  | Readonly<{ status: "unavailable" }>;

export interface PostgresReadinessProbe {
  readonly check: () => Promise<PostgresReadinessState>;
}

const READY = Object.freeze({ status: "ready" as const });
const UNAVAILABLE = Object.freeze({
  status: "unavailable" as const,
});

export function createPostgresReadinessProbe(
  queries: PostgresQueryExecutor,
): Readonly<PostgresReadinessProbe> {
  if (typeof queries?.query !== "function") {
    throw new Error("PostgreSQL readiness dependency is invalid");
  }

  return Object.freeze({
    async check() {
      try {
        const result = await queries.query<{ ready: number }>(
          "SELECT 1::integer AS ready",
          [],
        );

        return result.rowCount === 1 &&
          result.rows.length === 1 &&
          Object.keys(result.rows[0] ?? {}).length === 1 &&
          result.rows[0]?.ready === 1
          ? READY
          : UNAVAILABLE;
      } catch {
        return UNAVAILABLE;
      }
    },
  });
}
