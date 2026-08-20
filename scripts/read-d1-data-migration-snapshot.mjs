export class D1DataMigrationSnapshotError extends Error {
  constructor(code, table = null, options = {}) {
    super(`D1 data migration snapshot failed: ${code}`, options);
    this.name = "D1DataMigrationSnapshotError";
    this.code = code;
    this.table = table;
  }
}

function fail(code, table = null, options = {}) {
  throw new D1DataMigrationSnapshotError(code, table, options);
}

function requireDependency(configuration) {
  const { database, tableContracts, createSnapshot } = configuration ?? {};
  if (
    !database ||
    typeof database !== "object" ||
    typeof database.exec !== "function" ||
    typeof database.prepare !== "function" ||
    !Array.isArray(tableContracts) ||
    tableContracts.length === 0 ||
    typeof createSnapshot !== "function"
  ) {
    fail("dependency-invalid");
  }
  return { database, tableContracts, createSnapshot };
}

function requireSliceDefinitions(configuration) {
  const { database, slices } = configuration ?? {};
  if (
    !database ||
    typeof database !== "object" ||
    typeof database.exec !== "function" ||
    typeof database.prepare !== "function" ||
    !Array.isArray(slices) ||
    slices.length === 0 ||
    slices.length > 20
  ) {
    fail("dependency-invalid");
  }

  const sliceIds = new Set();
  const tableNames = new Set();
  for (const slice of slices) {
    if (
      !slice ||
      typeof slice !== "object" ||
      typeof slice.id !== "string" ||
      !/^[a-z][a-z0-9-]*$/.test(slice.id) ||
      sliceIds.has(slice.id) ||
      !Array.isArray(slice.tableContracts) ||
      slice.tableContracts.length === 0 ||
      typeof slice.createSnapshot !== "function"
    ) {
      fail("dependency-invalid");
    }
    sliceIds.add(slice.id);
    for (const table of slice.tableContracts) {
      if (
        !table ||
        typeof table !== "object" ||
        typeof table.name !== "string" ||
        tableNames.has(table.name)
      ) {
        fail("dependency-invalid", table?.name ?? null);
      }
      tableNames.add(table.name);
    }
  }

  return { database, slices };
}

function requireCurrentSchema(database, tableContracts) {
  for (const table of tableContracts) {
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

function selectSourceRows(database, tableContracts) {
  return Object.fromEntries(tableContracts.map((table) => [
    table.name,
    database.prepare(
      `SELECT ${table.columns.map(({ name }) => name).join(", ")}
       FROM ${table.name}
       ORDER BY ${table.orderBy.join(", ")}`,
    ).all(),
  ]));
}

export function readD1DataMigrationSnapshot(configuration) {
  const { database, tableContracts, createSnapshot } =
    requireDependency(configuration);
  return readD1DataMigrationSnapshots({
    database,
    slices: [{
      id: "single-slice",
      tableContracts,
      createSnapshot,
    }],
  })[0].snapshot;
}

export function readD1DataMigrationSnapshots(configuration) {
  const { database, slices } = requireSliceDefinitions(configuration);
  let transactionStarted = false;

  try {
    database.exec("BEGIN DEFERRED");
    transactionStarted = true;
    requireCurrentSchema(
      database,
      slices.flatMap(({ tableContracts }) => tableContracts),
    );
    requireSourceIntegrity(database);
    const snapshots = Object.freeze(slices.map((slice) => Object.freeze({
      id: slice.id,
      snapshot: slice.createSnapshot(
        selectSourceRows(database, slice.tableContracts),
      ),
    })));
    database.exec("COMMIT");
    transactionStarted = false;
    return snapshots;
  } catch (error) {
    if (transactionStarted) {
      try {
        database.exec("ROLLBACK");
      } catch (rollbackFailure) {
        throw new D1DataMigrationSnapshotError(
          "rollback-failed",
          null,
          { cause: new AggregateError([error, rollbackFailure]) },
        );
      }
    }
    throw error;
  }
}
