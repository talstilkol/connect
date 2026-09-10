import {
  POSTGRES_DATA_MIGRATION_SLICES,
} from "../postgres/postgresDataMigrationSliceRegistry.mjs";
import {
  POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_TABLE_CONTRACTS,
  createPostgresAiKnowledgeRuntimeDataSnapshot,
} from "../server/platform/postgresAiKnowledgeRuntimeDataMigration.ts";
import {
  POSTGRES_BOT_RUNTIME_DATA_TABLE_CONTRACTS,
  createPostgresBotRuntimeDataSnapshot,
} from "../server/platform/postgresBotRuntimeDataMigration.ts";
import {
  POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_TABLE_CONTRACTS,
  createPostgresContactOrganizationImportDataSnapshot,
} from "../server/platform/postgresContactOrganizationImportDataMigration.ts";
import {
  POSTGRES_CONVERSATIONS_MESSAGES_DATA_TABLE_CONTRACTS,
  createPostgresConversationsMessagesDataSnapshot,
} from "../server/platform/postgresConversationsMessagesDataMigration.ts";
import {
  POSTGRES_CORE_DATA_TABLE_CONTRACTS,
  createPostgresCoreDataSnapshot,
} from "../server/platform/postgresCoreDataMigration.ts";
import {
  POSTGRES_GOVERNANCE_BILLING_DATA_TABLE_CONTRACTS,
  createPostgresGovernanceBillingDataSnapshot,
} from "../server/platform/postgresGovernanceBillingDataMigration.ts";
import {
  POSTGRES_META_CONNECTION_DATA_TABLE_CONTRACTS,
  createPostgresMetaConnectionDataSnapshot,
} from "../server/platform/postgresMetaConnectionDataMigration.ts";
import {
  POSTGRES_TEMPLATES_CAMPAIGNS_DATA_TABLE_CONTRACTS,
  createPostgresTemplatesCampaignsDataSnapshot,
} from "../server/platform/postgresTemplatesCampaignsDataMigration.ts";
import {
  POSTGRES_TENANT_ACCESS_DATA_TABLE_CONTRACTS,
  createPostgresTenantAccessDataSnapshot,
} from "../server/platform/postgresTenantAccessDataMigration.ts";
import {
  POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS,
  createPostgresWhatsappDeliveryPolicyDataSnapshot,
} from "../server/platform/postgresWhatsappDeliveryPolicyDataMigration.ts";
import {
  readD1DataMigrationSnapshots,
} from "./read-d1-data-migration-snapshot.mjs";

export const D1_FULL_DATA_MIGRATION_SNAPSHOT_VERSION =
  "connect_d1_full_data_migration_snapshot_v2";

const sliceConfigurations = Object.freeze([
  Object.freeze({
    id: "core",
    tableContracts: POSTGRES_CORE_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresCoreDataSnapshot,
  }),
  Object.freeze({
    id: "tenant-access",
    tableContracts: POSTGRES_TENANT_ACCESS_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresTenantAccessDataSnapshot,
  }),
  Object.freeze({
    id: "contact-organization-import",
    tableContracts: POSTGRES_CONTACT_ORGANIZATION_IMPORT_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresContactOrganizationImportDataSnapshot,
  }),
  Object.freeze({
    id: "meta-connection",
    tableContracts: POSTGRES_META_CONNECTION_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresMetaConnectionDataSnapshot,
  }),
  Object.freeze({
    id: "templates-campaigns",
    tableContracts: POSTGRES_TEMPLATES_CAMPAIGNS_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresTemplatesCampaignsDataSnapshot,
  }),
  Object.freeze({
    id: "conversations-messages",
    tableContracts: POSTGRES_CONVERSATIONS_MESSAGES_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresConversationsMessagesDataSnapshot,
  }),
  Object.freeze({
    id: "bot-runtime",
    tableContracts: POSTGRES_BOT_RUNTIME_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresBotRuntimeDataSnapshot,
  }),
  Object.freeze({
    id: "ai-knowledge-runtime",
    tableContracts: POSTGRES_AI_KNOWLEDGE_RUNTIME_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresAiKnowledgeRuntimeDataSnapshot,
  }),
  Object.freeze({
    id: "governance-billing",
    tableContracts: POSTGRES_GOVERNANCE_BILLING_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresGovernanceBillingDataSnapshot,
  }),
  Object.freeze({
    id: "whatsapp-delivery-policy",
    tableContracts: POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS,
    createSnapshot: createPostgresWhatsappDeliveryPolicyDataSnapshot,
  }),
]);

function sorted(values) {
  return [...values].sort();
}

function requireExactRegistryCoverage() {
  if (
    POSTGRES_DATA_MIGRATION_SLICES.length !== sliceConfigurations.length ||
    POSTGRES_DATA_MIGRATION_SLICES.some((registrySlice, index) => {
      const configuration = sliceConfigurations[index];
      return registrySlice.id !== configuration.id ||
        registrySlice.status !== "rehearsed" ||
        JSON.stringify(sorted(registrySlice.tables)) !== JSON.stringify(
          sorted(configuration.tableContracts.map(({ name }) => name)),
        );
    })
  ) {
    throw new Error("D1 full migration snapshot registry is inconsistent");
  }

  const tableNames = sliceConfigurations.flatMap(({ tableContracts }) =>
    tableContracts.map(({ name }) => name));
  if (tableNames.length !== 55 || new Set(tableNames).size !== 55) {
    throw new Error("D1 full migration snapshot table coverage is invalid");
  }
}

requireExactRegistryCoverage();

export const D1_FULL_DATA_MIGRATION_SLICE_CONTRACTS = Object.freeze(
  sliceConfigurations.map(({ id, tableContracts }, index) => Object.freeze({
    id,
    requires: Object.freeze([
      ...POSTGRES_DATA_MIGRATION_SLICES[index].requires,
    ]),
    tables: Object.freeze(tableContracts.map(({ name }) => name)),
  })),
);

export function readD1FullDataMigrationSnapshot(database) {
  const snapshots = readD1DataMigrationSnapshots({
    database,
    slices: sliceConfigurations,
  });
  const slices = Object.freeze(snapshots.map(({ id, snapshot }, index) =>
    Object.freeze({
      id,
      requires: D1_FULL_DATA_MIGRATION_SLICE_CONTRACTS[index].requires,
      snapshot,
    })));
  const totalRowCount = slices.reduce(
    (total, slice) => total + Object.values(slice.snapshot.tables)
      .reduce((sliceTotal, rows) => sliceTotal + rows.length, 0),
    0,
  );

  return Object.freeze({
    version: D1_FULL_DATA_MIGRATION_SNAPSHOT_VERSION,
    tableCount: D1_FULL_DATA_MIGRATION_SLICE_CONTRACTS.reduce(
      (total, slice) => total + slice.tables.length,
      0,
    ),
    totalRowCount,
    slices,
  });
}
