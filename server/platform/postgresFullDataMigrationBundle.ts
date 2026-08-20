import {
  createPostgresAiKnowledgeRuntimeDataMigrationPlan,
  executePostgresAiKnowledgeRuntimeDataMigration,
} from "./postgresAiKnowledgeRuntimeDataMigration.ts";
import {
  createPostgresBotRuntimeDataMigrationPlan,
  executePostgresBotRuntimeDataMigration,
} from "./postgresBotRuntimeDataMigration.ts";
import {
  createPostgresContactOrganizationImportDataMigrationPlan,
  executePostgresContactOrganizationImportDataMigration,
} from "./postgresContactOrganizationImportDataMigration.ts";
import {
  createPostgresConversationsMessagesDataMigrationPlan,
  executePostgresConversationsMessagesDataMigration,
} from "./postgresConversationsMessagesDataMigration.ts";
import {
  createPostgresCoreDataMigrationPlan,
  executePostgresCoreDataMigration,
} from "./postgresCoreDataMigration.ts";
import type {
  PostgresCoreDataMigrationPlan,
  PostgresCoreDataSnapshot,
} from "./postgresCoreDataMigration.ts";
import {
  createPostgresDataMigrationBundleProtocol,
} from "./postgresDataMigrationBundleProtocol.ts";
import type {
  PostgresDataMigrationBundleConfiguration,
  PostgresDataMigrationBundleEvidence,
  PostgresDataMigrationBundlePlan,
} from "./postgresDataMigrationBundleProtocol.ts";
import {
  createPostgresGovernanceBillingDataMigrationPlan,
  executePostgresGovernanceBillingDataMigration,
} from "./postgresGovernanceBillingDataMigration.ts";
import {
  createPostgresMetaConnectionDataMigrationPlan,
  executePostgresMetaConnectionDataMigration,
} from "./postgresMetaConnectionDataMigration.ts";
import {
  createPostgresTemplatesCampaignsDataMigrationPlan,
  executePostgresTemplatesCampaignsDataMigration,
} from "./postgresTemplatesCampaignsDataMigration.ts";
import {
  createPostgresTenantAccessDataMigrationPlan,
  executePostgresTenantAccessDataMigration,
} from "./postgresTenantAccessDataMigration.ts";
import {
  createPostgresWhatsappDeliveryPolicyDataMigrationPlan,
  executePostgresWhatsappDeliveryPolicyDataMigration,
} from "./postgresWhatsappDeliveryPolicyDataMigration.ts";

export const POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION =
  "connect_postgres_full_data_migration_bundle_v1";

const configuration = {
  version: POSTGRES_FULL_DATA_MIGRATION_BUNDLE_VERSION,
  planKind: "postgres-full-data-migration-bundle-plan",
  evidenceKind: "postgres-full-data-migration-bundle-evidence",
  advisoryLockKeys: [
    [1129270867, 1],
    [1129270867, 2],
    [1129270867, 3],
    [1129270867, 4],
    [1129270867, 5],
    [1129270867, 6],
  ],
  slices: [
    {
      id: "core",
      requires: [],
      version: "connect_postgres_core_data_v1",
      planKind: "postgres-core-data-migration-plan",
      evidenceKind: "postgres-core-data-migration-evidence",
      createPlan: (input) => createPostgresCoreDataMigrationPlan({
        ...input,
        snapshot: input.snapshot as PostgresCoreDataSnapshot,
      }),
      execute: (input) => executePostgresCoreDataMigration({
        ...input,
        plan: input.plan as PostgresCoreDataMigrationPlan,
      }),
    },
    {
      id: "tenant-access",
      requires: ["core"],
      version: "connect_postgres_tenant_access_data_v1",
      planKind: "postgres-tenant-access-data-migration-plan",
      evidenceKind: "postgres-tenant-access-data-migration-evidence",
      createPlan: createPostgresTenantAccessDataMigrationPlan,
      execute: executePostgresTenantAccessDataMigration,
    },
    {
      id: "contact-organization-import",
      requires: ["core"],
      version: "connect_postgres_contact_organization_import_data_v1",
      planKind: "postgres-contact-organization-import-data-migration-plan",
      evidenceKind:
        "postgres-contact-organization-import-data-migration-evidence",
      createPlan: createPostgresContactOrganizationImportDataMigrationPlan,
      execute: executePostgresContactOrganizationImportDataMigration,
    },
    {
      id: "meta-connection",
      requires: ["core"],
      version: "connect_postgres_meta_connection_data_v1",
      planKind: "postgres-meta-connection-data-migration-plan",
      evidenceKind: "postgres-meta-connection-data-migration-evidence",
      createPlan: createPostgresMetaConnectionDataMigrationPlan,
      execute: executePostgresMetaConnectionDataMigration,
    },
    {
      id: "templates-campaigns",
      requires: ["core", "contact-organization-import", "meta-connection"],
      version: "connect_postgres_templates_campaigns_data_v1",
      planKind: "postgres-templates-campaigns-data-migration-plan",
      evidenceKind: "postgres-templates-campaigns-data-migration-evidence",
      createPlan: createPostgresTemplatesCampaignsDataMigrationPlan,
      execute: executePostgresTemplatesCampaignsDataMigration,
    },
    {
      id: "conversations-messages",
      requires: ["core", "meta-connection"],
      version: "connect_postgres_conversations_messages_data_v1",
      planKind: "postgres-conversations-messages-data-migration-plan",
      evidenceKind:
        "postgres-conversations-messages-data-migration-evidence",
      createPlan: createPostgresConversationsMessagesDataMigrationPlan,
      execute: executePostgresConversationsMessagesDataMigration,
    },
    {
      id: "bot-runtime",
      requires: ["core", "conversations-messages"],
      version: "connect_postgres_bot_runtime_data_v1",
      planKind: "postgres-bot-runtime-data-migration-plan",
      evidenceKind: "postgres-bot-runtime-data-migration-evidence",
      createPlan: createPostgresBotRuntimeDataMigrationPlan,
      execute: executePostgresBotRuntimeDataMigration,
    },
    {
      id: "ai-knowledge-runtime",
      requires: ["core", "conversations-messages"],
      version: "connect_postgres_ai_knowledge_runtime_data_v1",
      planKind: "postgres-ai-knowledge-runtime-data-migration-plan",
      evidenceKind:
        "postgres-ai-knowledge-runtime-data-migration-evidence",
      createPlan: createPostgresAiKnowledgeRuntimeDataMigrationPlan,
      execute: executePostgresAiKnowledgeRuntimeDataMigration,
    },
    {
      id: "governance-billing",
      requires: ["core"],
      version: "connect_postgres_governance_billing_data_v1",
      planKind: "postgres-governance-billing-data-migration-plan",
      evidenceKind: "postgres-governance-billing-data-migration-evidence",
      createPlan: createPostgresGovernanceBillingDataMigrationPlan,
      execute: executePostgresGovernanceBillingDataMigration,
    },
    {
      id: "whatsapp-delivery-policy",
      requires: ["core", "meta-connection", "templates-campaigns"],
      version: "connect_postgres_whatsapp_delivery_policy_data_v1",
      planKind: "postgres-whatsapp-delivery-policy-migration-plan",
      evidenceKind: "postgres-whatsapp-delivery-policy-migration-evidence",
      createPlan: createPostgresWhatsappDeliveryPolicyDataMigrationPlan,
      execute: executePostgresWhatsappDeliveryPolicyDataMigration,
    },
  ],
} satisfies PostgresDataMigrationBundleConfiguration;

const protocol = createPostgresDataMigrationBundleProtocol(configuration);

export const POSTGRES_FULL_DATA_MIGRATION_BUNDLE_SLICES =
  protocol.sliceDefinitions;

export type PostgresFullDataMigrationBundlePlan =
  PostgresDataMigrationBundlePlan;
export type PostgresFullDataMigrationBundleEvidence =
  PostgresDataMigrationBundleEvidence;

export const createPostgresFullDataMigrationBundlePlan =
  protocol.createPlan;
export const executePostgresFullDataMigrationBundle = protocol.execute;
