import {
  POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_TABLE_CONTRACTS,
  createPostgresAiKnowledgeRuntimeDataSnapshot,
} from "../server/platform/postgresAiKnowledgeRuntimeDataMigration.ts";
import {
  readD1DataMigrationSnapshot,
} from "./read-d1-data-migration-snapshot.mjs";

export function readD1AiKnowledgeRuntimeSnapshot(database) {
  return readD1DataMigrationSnapshot({
    database,
    tableContracts: POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresAiKnowledgeRuntimeDataSnapshot,
  });
}
