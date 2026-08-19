import {
  POSTGRES_META_CONNECTION_DATA_TABLE_CONTRACTS,
  createPostgresMetaConnectionDataSnapshot,
} from "../server/platform/postgresMetaConnectionDataMigration.ts";
import {
  readD1DataMigrationSnapshot,
} from "./read-d1-data-migration-snapshot.mjs";

export function readD1MetaConnectionSnapshot(database) {
  return readD1DataMigrationSnapshot({
    database,
    tableContracts: POSTGRES_META_CONNECTION_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresMetaConnectionDataSnapshot,
  });
}
