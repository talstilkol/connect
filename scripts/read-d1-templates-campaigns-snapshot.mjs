import {
  POSTGRES_TEMPLATES_CAMPAIGNS_DATA_TABLE_CONTRACTS,
  createPostgresTemplatesCampaignsDataSnapshot,
} from "../server/platform/postgresTemplatesCampaignsDataMigration.ts";
import {
  readD1DataMigrationSnapshot,
} from "./read-d1-data-migration-snapshot.mjs";

export function readD1TemplatesCampaignsSnapshot(database) {
  return readD1DataMigrationSnapshot({
    database,
    tableContracts: POSTGRES_TEMPLATES_CAMPAIGNS_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresTemplatesCampaignsDataSnapshot,
  });
}
