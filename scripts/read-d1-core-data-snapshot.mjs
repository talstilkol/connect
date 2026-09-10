import {
  POSTGRES_CORE_DATA_TABLE_CONTRACTS,
  createPostgresCoreDataSnapshot,
} from "../server/platform/postgresCoreDataMigration.ts";

export class D1CoreDataSnapshotError extends Error {
  constructor(code, table = null, options = {}) {
    super(`D1 core data snapshot failed: ${code}`, options);
    this.name = "D1CoreDataSnapshotError";
    this.code = code;
    this.table = table;
  }
}

function fail(code, table = null, options = {}) {
  throw new D1CoreDataSnapshotError(code, table, options);
}

function requireDatabase(database) {
  if (
    !database ||
    typeof database !== "object" ||
    typeof database.exec !== "function" ||
    typeof database.prepare !== "function"
  ) {
    fail("dependency-invalid");
  }
  return database;
}

function requireCurrentSchema(database) {
  for (const table of POSTGRES_CORE_DATA_TABLE_CONTRACTS) {
    const actualColumns = database
      .prepare(`PRAGMA table_info(${table.name})`)
      .all()
      .map(({ name }) => name);
    const expectedColumns = table.columns.map(({ name }) => name);
    if (
      actualColumns.length !== expectedColumns.length ||
      !expectedColumns.every(
        (columnName, index) => columnName === actualColumns[index],
      )
    ) {
      fail("schema-mismatch", table.name);
    }
  }
}

function requireSourceIntegrity(database) {
  const integrity = database.prepare("PRAGMA integrity_check").get();
  if (integrity?.integrity_check !== "ok") {
    fail("integrity-check-failed");
  }
  const foreignKeyViolation = database
    .prepare("PRAGMA foreign_key_check")
    .get();
  if (foreignKeyViolation) {
    fail("foreign-key-check-failed");
  }
}

function selectSourceRows(database) {
  return Object.fromEntries(
    POSTGRES_CORE_DATA_TABLE_CONTRACTS.map((table) => [
      table.name,
      database.prepare(
        `SELECT ${table.columns.map(({ name }) => name).join(", ")}
         FROM ${table.name}
         ORDER BY ${table.orderBy.join(", ")}`,
      ).all(),
    ]),
  );
}

export function readD1CoreDataSnapshot(databaseDependency) {
  const database = requireDatabase(databaseDependency);
  let transactionStarted = false;

  try {
    database.exec("BEGIN DEFERRED");
    transactionStarted = true;
    requireCurrentSchema(database);
    requireSourceIntegrity(database);
    const snapshot = createPostgresCoreDataSnapshot(
      selectSourceRows(database),
    );
    database.exec("COMMIT");
    transactionStarted = false;
    return snapshot;
  } catch (error) {
    if (transactionStarted) {
      try {
        database.exec("ROLLBACK");
      } catch (rollbackFailure) {
        throw new D1CoreDataSnapshotError(
          "rollback-failed",
          null,
          {
            cause: new AggregateError([error, rollbackFailure]),
          },
        );
      }
    }
    throw error;
  }
}
