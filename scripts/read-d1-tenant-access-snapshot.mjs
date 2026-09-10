import {
  POSTGRES_TENANT_ACCESS_DATA_TABLE_CONTRACTS,
  createPostgresTenantAccessDataSnapshot,
} from "../server/platform/postgresTenantAccessDataMigration.ts";
import {
  readD1DataMigrationSnapshot,
} from "./read-d1-data-migration-snapshot.mjs";

export function readD1TenantAccessDataSnapshot(database) {
  return readD1DataMigrationSnapshot({
    database,
    tableContracts: POSTGRES_TENANT_ACCESS_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresTenantAccessDataSnapshot,
  });
}
