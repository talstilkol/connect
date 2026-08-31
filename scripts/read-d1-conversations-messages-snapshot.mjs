import {
  POSTGRES_CONVERSATIONS_MESSAGES_DATA_TABLE_CONTRACTS,
  createPostgresConversationsMessagesDataSnapshot,
} from "../server/platform/postgresConversationsMessagesDataMigration.ts";
import {
  readD1DataMigrationSnapshot,
} from "./read-d1-data-migration-snapshot.mjs";

export function readD1ConversationsMessagesSnapshot(database) {
  return readD1DataMigrationSnapshot({
    database,
    tableContracts: POSTGRES_CONVERSATIONS_MESSAGES_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresConversationsMessagesDataSnapshot,
  });
}
