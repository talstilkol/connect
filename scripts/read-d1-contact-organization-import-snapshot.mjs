import {
  POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_TABLE_CONTRACTS,
  createPostgresContactOrganizationImportDataSnapshot,
} from "../server/platform/postgresContactOrganizationImportDataMigration.ts";
import {
  readD1DataMigrationSnapshot,
} from "./read-d1-data-migration-snapshot.mjs";

export function readD1ContactOrganizationImportSnapshot(database) {
  return readD1DataMigrationSnapshot({
    database,
    tableContracts:
      POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresContactOrganizationImportDataSnapshot,
  });
}
