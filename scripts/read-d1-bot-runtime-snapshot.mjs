import {
  POSTGRES_BOT_RUNTIME_DATA_TABLE_CONTRACTS,
  createPostgresBotRuntimeDataSnapshot,
} from "../server/platform/postgresBotRuntimeDataMigration.ts";
import {
  readD1DataMigrationSnapshot,
} from "./read-d1-data-migration-snapshot.mjs";

export function readD1BotRuntimeSnapshot(database) {
  return readD1DataMigrationSnapshot({
    database,
    tableContracts: POSTGRES_BOT_RUNTIME_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresBotRuntimeDataSnapshot,
  });
}
