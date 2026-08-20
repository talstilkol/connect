import {
  readFile,
  readdir,
} from "node:fs/promises";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const migrationNamePattern =
  /^(\d{4})_[a-z0-9_]+\.sql$/;
const requiredTableSequence = Object.freeze([
  "tenants",
  "audit_logs",
  "contacts",
  "railway_api_mutation_receipts",
  "tenant_memberships",
  "tenant_selections",
  "business_profiles",
  "tenant_membership_events",
  "team_invitations",
  "team_invitation_events",
  "team_invitation_deliveries",
  "team_invitation_acceptances",
  "conversations",
  "messages",
  "message_templates",
  "campaigns",
  "bot_flows",
  "bot_flow_versions",
  "bot_reply_deliveries",
  "ai_agents",
  "ai_agent_versions",
  "ai_runtime_cost_authorizations",
  "ai_runtime_usage",
  "ai_runtime_audit_events",
  "contact_tags",
  "contact_lists",
  "contact_tag_assignments",
  "contact_list_memberships",
  "contact_import_jobs",
  "contact_import_rows",
  "meta_connections",
  "meta_webhook_receipts",
  "meta_credential_envelopes",
  "whatsapp_campaign_delivery_policy_events",
  "whatsapp_rate_limit_reservations",
  "whatsapp_pair_rate_limit_state",
  "whatsapp_portfolio_recipient_rate_limit_state",
  "whatsapp_rate_limit_settlements",
  "whatsapp_provider_cooldown_events",
  "whatsapp_provider_cooldown_state",
  "worker_scheduler_leases",
  "campaign_recipients",
  "knowledge_sources",
  "knowledge_passages",
  "ai_agent_version_sources",
  "ai_reply_outbox",
  "tenant_subscriptions",
  "tenant_subscription_events",
  "production_decision_records",
  "production_decision_events",
  "business_profile_admin_events",
  "contact_consent_events",
  "campaign_delivery_provider_links",
  "api_mutation_rate_limit_buckets",
  "data_migration_bundle_receipts",
]);
const requiredMigrationPrefix = Object.freeze([
  "0000_core_contacts.sql",
  "0001_railway_api_mutation_receipts.sql",
  "0002_tenant_access_foundation.sql",
  "0003_tenant_membership_events.sql",
  "0004_team_invitation_lifecycle.sql",
  "0005_conversations_messages.sql",
  "0006_message_templates_campaigns.sql",
  "0007_bot_flows_deliveries.sql",
  "0008_ai_reporting.sql",
  "0009_contact_organization_imports.sql",
  "0010_meta_connection_credentials.sql",
  "0011_whatsapp_delivery_policy.sql",
  "0012_whatsapp_rate_limit_ledger.sql",
  "0013_whatsapp_phone_throughput.sql",
  "0014_worker_scheduler_lease.sql",
  "0015_campaign_dispatch.sql",
  "0016_ai_knowledge.sql",
  "0017_ai_reply_outbox.sql",
  "0018_tenant_subscriptions.sql",
  "0019_production_decisions.sql",
  "0020_system_admin_business_profiles.sql",
  "0021_contact_consent_events.sql",
  "0022_campaign_delivery_provider_links.sql",
  "0023_api_mutation_rate_limits.sql",
  "0024_whatsapp_legacy_reservation_category.sql",
  "0025_data_migration_bundle_receipts.sql",
]);
const forbiddenSyntax = Object.freeze([
  Object.freeze({
    code: "POSTGRES_SQLITE_IDENTIFIER_QUOTE",
    pattern: /`/,
  }),
  Object.freeze({
    code: "POSTGRES_SQLITE_AUTOINCREMENT",
    pattern: /\bAUTOINCREMENT\b/i,
  }),
  Object.freeze({
    code: "POSTGRES_SQLITE_FUNCTION",
    pattern: /\b(?:strftime|unixepoch|instr)\s*\(/i,
  }),
  Object.freeze({
    code: "POSTGRES_SQLITE_OPERATOR",
    pattern: /\bGLOB\b/i,
  }),
  Object.freeze({
    code: "POSTGRES_SQLITE_TRIGGER_ABORT",
    pattern: /\bRAISE\s*\(/i,
  }),
  Object.freeze({
    code: "POSTGRES_SQLITE_PRAGMA",
    pattern: /\bPRAGMA\b/i,
  }),
  Object.freeze({
    code: "POSTGRES_SQLITE_INSERT_MODE",
    pattern: /\bINSERT\s+OR\s+(?:ABORT|FAIL|IGNORE|REPLACE|ROLLBACK)\b/i,
  }),
]);
const destructiveStatement =
  /\b(?:DROP\s+(?:TABLE|INDEX|SCHEMA)|TRUNCATE|DELETE\s+FROM)\b/i;
const randomIdentity =
  /\b(?:random|gen_random_uuid|uuid_generate_v[1-5])\s*\(/i;
const dataInsertion = /\bINSERT\s+INTO\b/i;
const functionDefinition =
  /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b[\s\S]*?\bAS\s+\$\$([\s\S]*?)\$\$\s*;/gi;
const triggerRowReference = /\b(?:NEW|OLD)\.[a-z][a-z0-9_]*/i;

function rootUrl(root) {
  return pathToFileURL(
    root.endsWith("/") ? root : `${root}/`,
  );
}

function finding(code, fileName = null, index = null) {
  return Object.freeze({
    code,
    fileName,
    index,
  });
}

function extractCreatedTables(source) {
  return Array.from(
    source.matchAll(
      /\bCREATE\s+TABLE\s+([a-z][a-z0-9_]*)\s*\(/gi,
    ),
    (match) => match[1].toLowerCase(),
  );
}

function containsSeedData(source) {
  for (const match of source.matchAll(functionDefinition)) {
    const body = match[1];
    const statements = body.split(";");

    if (
      statements.some(
        (statement) =>
          dataInsertion.test(statement) &&
          !triggerRowReference.test(statement),
      )
    ) {
      return true;
    }
  }

  const sourceWithoutFunctionBodies = source.replace(
    functionDefinition,
    "",
  );
  return dataInsertion.test(sourceWithoutFunctionBodies);
}

export function validatePostgresMigrationSources({
  migrationFiles,
  sources,
}) {
  if (
    !Array.isArray(migrationFiles) ||
    !Array.isArray(sources) ||
    migrationFiles.length !== sources.length
  ) {
    return Object.freeze([
      finding("POSTGRES_MIGRATION_INPUT_INVALID"),
    ]);
  }

  const findings = [];
  const createdTables = [];

  if (
    migrationFiles.length < requiredMigrationPrefix.length ||
    requiredMigrationPrefix.some(
      (fileName, index) => migrationFiles[index] !== fileName,
    )
  ) {
    findings.push(
      finding("POSTGRES_REQUIRED_MIGRATION_PREFIX_INVALID"),
    );
  }

  for (
    let index = 0;
    index < migrationFiles.length;
    index += 1
  ) {
    const fileName = migrationFiles[index];
    const source = sources[index];
    const expectedPrefix = String(index).padStart(4, "0");
    const match =
      typeof fileName === "string"
        ? migrationNamePattern.exec(fileName)
        : null;

    if (!match || match[1] !== expectedPrefix) {
      findings.push(
        finding(
          "POSTGRES_MIGRATION_SEQUENCE_INVALID",
          typeof fileName === "string" ? fileName : null,
          index,
        ),
      );
    }

    if (typeof source !== "string" || source.trim().length === 0) {
      findings.push(
        finding(
          "POSTGRES_MIGRATION_SOURCE_INVALID",
          typeof fileName === "string" ? fileName : null,
          index,
        ),
      );
      continue;
    }

    for (const forbidden of forbiddenSyntax) {
      if (forbidden.pattern.test(source)) {
        findings.push(
          finding(forbidden.code, fileName, index),
        );
      }
    }

    if (destructiveStatement.test(source)) {
      findings.push(
        finding(
          "POSTGRES_DESTRUCTIVE_STATEMENT",
          fileName,
          index,
        ),
      );
    }

    if (randomIdentity.test(source)) {
      findings.push(
        finding(
          "POSTGRES_RANDOM_IDENTITY",
          fileName,
          index,
        ),
      );
    }

    if (containsSeedData(source)) {
      findings.push(
        finding(
          "POSTGRES_SEED_DATA_PRESENT",
          fileName,
          index,
        ),
      );
    }

    createdTables.push(...extractCreatedTables(source));
  }

  const requiredTables = createdTables.slice(
    0,
    requiredTableSequence.length,
  );

  if (
    requiredTables.length !== requiredTableSequence.length ||
    requiredTables.some(
      (table, index) => table !== requiredTableSequence[index],
    )
  ) {
    findings.push(
      finding("POSTGRES_REQUIRED_TABLE_SEQUENCE_INVALID"),
    );
  }

  if (
    new Set(createdTables).size !== createdTables.length
  ) {
    findings.push(
      finding("POSTGRES_DUPLICATE_TABLE_CREATION"),
    );
  }

  return Object.freeze(findings);
}

export async function inspectPostgresMigrationContract(
  root = projectRoot,
) {
  const migrationsUrl = new URL(
    "postgres/migrations/",
    rootUrl(root),
  );
  let migrationFiles;

  try {
    migrationFiles = (await readdir(migrationsUrl))
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort();
  } catch {
    return Object.freeze({
      status: "failed",
      migrationCount: 0,
      findings: Object.freeze([
        finding("POSTGRES_MIGRATION_DIRECTORY_UNAVAILABLE"),
      ]),
    });
  }

  const sources = await Promise.all(
    migrationFiles.map((fileName) =>
      readFile(new URL(fileName, migrationsUrl), "utf8"),
    ),
  );
  const findings = validatePostgresMigrationSources({
    migrationFiles,
    sources,
  });

  return Object.freeze({
    status: findings.length === 0 ? "passed" : "failed",
    migrationCount: migrationFiles.length,
    findings,
  });
}

async function runCli() {
  if (process.argv.length !== 2) {
    console.error(
      "PostgreSQL migration contract: INVALID_ARGUMENTS",
    );
    process.exitCode = 1;
    return;
  }

  const report = await inspectPostgresMigrationContract();

  if (report.status !== "passed") {
    console.error(
      `PostgreSQL migration contract: FAIL (${report.findings.length} findings)`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `PostgreSQL migration contract: PASS (${report.migrationCount} critical-path migrations)`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(pathToFileURL(process.argv[1]))
) {
  await runCli();
}
