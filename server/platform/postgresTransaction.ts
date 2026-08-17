export type PostgresParameter =
  | boolean
  | number
  | string
  | null;

export interface PostgresQueryResult<TRow> {
  readonly rows: readonly TRow[];
  readonly rowCount: number;
}

export interface PostgresTransaction {
  query<TRow>(
    sql: string,
    parameters: readonly PostgresParameter[],
  ): Promise<Readonly<PostgresQueryResult<TRow>>>;
}

export interface PostgresTransactionOptions {
  readonly isolationLevel: "read-committed";
}

/**
 * A driver adapter must BEGIN before the callback, COMMIT only after it
 * resolves, and ROLLBACK whenever it throws. It must use one pinned database
 * connection for the entire callback.
 */
export interface PostgresTransactionManager {
  transaction<TResult>(
    options: Readonly<PostgresTransactionOptions>,
    execute: (transaction: PostgresTransaction) => Promise<TResult>,
  ): Promise<TResult>;
}
