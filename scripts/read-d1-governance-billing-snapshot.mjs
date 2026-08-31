import {
  POSTGRES_GOVERNANCE_BILLING_DATA_TABLE_CONTRACTS,
  createPostgresGovernanceBillingDataSnapshot,
} from "../server/platform/postgresGovernanceBillingDataMigration.ts";
import {
  readD1DataMigrationSnapshot,
} from "./read-d1-data-migration-snapshot.mjs";

export function readD1GovernanceBillingSnapshot(database) {
  return readD1DataMigrationSnapshot({
    database,
    tableContracts: POSTGRES_GOVERNANCE_BILLING_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresGovernanceBillingDataSnapshot,
  });
}
