import type { Pool, PoolClient } from "pg";

import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresQueryResult,
  PostgresTransactionManager,
  PostgresTransactionOptions,
} from "./postgresTransaction.ts";

type NodePostgresExecutor = Pick<Pool, "query"> | Pick<PoolClient, "query">;

export type NodePostgresAdapterErrorCode =
  | "invalid-dependency"
  | "invalid-query-result"
  | "invalid-transaction-options"
  | "rollback-failed";

export class NodePostgresAdapterError extends Error {
  readonly code: NodePostgresAdapterErrorCode;

  constructor(
    code: NodePostgresAdapterErrorCode,
    options?: Readonly<{ cause?: unknown }>,
  ) {
    super(`node-postgres adapter failed: ${code}`, {
      cause: options?.cause,
    });
    this.name = "NodePostgresAdapterError";
    this.code = code;
  }
}

function requirePool(pool: Pool): Pool {
  if (
    !pool ||
    typeof pool !== "object" ||
    typeof pool.query !== "function" ||
    typeof pool.connect !== "function"
  ) {
    throw new NodePostgresAdapterError("invalid-dependency");
  }

  return pool;
}

function requireTransactionOptions(
  options: Readonly<PostgresTransactionOptions>,
): void {
  if (
    !options ||
    typeof options !== "object" ||
    options.isolationLevel !== "read-committed" ||
    Object.keys(options).length !== 1
  ) {
    throw new NodePostgresAdapterError(
      "invalid-transaction-options",
    );
  }
}

function destroyClient(client: PoolClient): void {
  client.release(true);
}

async function executeQuery<TRow>(
  executor: NodePostgresExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<Readonly<PostgresQueryResult<TRow>>> {
  const result = await executor.query<Record<string, unknown>>(
    sql,
    [...parameters],
  );

  const commandWithoutRows =
    ["ALTER", "LOCK"].includes(result.command) &&
    result.rowCount === null &&
    Array.isArray(result.rows) &&
    result.rows.length === 0;

  if (
    !Array.isArray(result.rows) ||
    (
      !commandWithoutRows &&
      (
        !Number.isSafeInteger(result.rowCount) ||
        result.rowCount === null ||
        result.rowCount < 0
      )
    )
  ) {
    throw new NodePostgresAdapterError("invalid-query-result");
  }

  const rowCount = result.rowCount ?? 0;

  return Object.freeze({
    rows: Object.freeze([...result.rows]) as readonly TRow[],
    rowCount,
  });
}

function createPinnedExecutor(
  client: PoolClient,
): PostgresQueryExecutor {
  return Object.freeze({
    query<TRow>(
      sql: string,
      parameters: readonly PostgresParameter[],
    ) {
      return executeQuery<TRow>(client, sql, parameters);
    },
  });
}

export function createNodePostgresQueryExecutor(
  pool: Pool,
): PostgresQueryExecutor {
  const checkedPool = requirePool(pool);

  return Object.freeze({
    query<TRow>(
      sql: string,
      parameters: readonly PostgresParameter[],
    ) {
      return executeQuery<TRow>(checkedPool, sql, parameters);
    },
  });
}

export function createNodePostgresTransactionManager(
  pool: Pool,
): PostgresTransactionManager {
  const checkedPool = requirePool(pool);

  return Object.freeze({
    async transaction<TResult>(
      options: Readonly<PostgresTransactionOptions>,
      execute: (
        transaction: PostgresQueryExecutor,
      ) => Promise<TResult>,
    ): Promise<TResult> {
      requireTransactionOptions(options);

      if (typeof execute !== "function") {
        throw new NodePostgresAdapterError("invalid-dependency");
      }

      const client = await checkedPool.connect();
      let transactionStarted = false;
      let commitStarted = false;
      let destroyReason: unknown;

      try {
        await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
        transactionStarted = true;

        const result = await execute(createPinnedExecutor(client));
        commitStarted = true;
        await client.query("COMMIT");
        return result;
      } catch (failure) {
        if (!transactionStarted) {
          destroyReason = failure;
          throw failure;
        }

        if (transactionStarted) {
          try {
            await client.query("ROLLBACK");
          } catch (rollbackFailure) {
            destroyReason = rollbackFailure;
            throw new NodePostgresAdapterError("rollback-failed", {
              cause: new AggregateError([
                failure,
                rollbackFailure,
              ]),
            });
          }
        }

        if (commitStarted) {
          destroyReason = failure;
        }

        throw failure;
      } finally {
        if (destroyReason === undefined) {
          client.release();
        } else {
          destroyClient(client);
        }
      }
    },
  });
}
