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
  "message_template_submission_outbox",
  "message_template_submission_events",
  "team_invitation_delivery_deferrals",
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
  "0026_message_template_submission_outbox.sql",
  "0027_clerk_organization_binding.sql",
  "0028_clerk_invitation_rate_limit.sql",
  "0029_team_invitation_delivery_deferrals.sql",
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
const reviewedMetaCredentialTruncateTrigger =
  /CREATE\s+TRIGGER\s+meta_credential_revision_events_truncate_guard\s+BEFORE\s+TRUNCATE\s+ON\s+public\.meta_credential_revision_events\s+FOR\s+EACH\s+STATEMENT\s+EXECUTE\s+FUNCTION\s+public\.reject_meta_credential_revision_event_mutation\(\)\s*;/gi;
const randomIdentity =
  /\b(?:random|gen_random_uuid|uuid_generate_v[1-5])\s*\(/i;
const dataInsertion = /\bINSERT\s+INTO\b/i;
const functionDefinition =
  /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b[\s\S]*?\bAS\s+\$\$([\s\S]*?)\$\$\s*;/gi;
const triggerRowReference = /\b(?:NEW|OLD)\.[a-z][a-z0-9_]*/i;
const reviewedMetaCredentialRevisionBackfill = `
INSERT INTO public.meta_credential_revision_events (
  event_key,
  tenant_id,
  credential_revision,
  envelope_digest,
  key_version,
  recorded_at,
  created_at
)
SELECT
  public.derive_meta_credential_revision_event_key_v1(
    credential.tenant_id,
    credential.credential_revision,
    credential.envelope_digest
  ),
  credential.tenant_id,
  credential.credential_revision,
  credential.envelope_digest,
  credential.key_version,
  credential.updated_at,
  credential.updated_at
FROM public.meta_credential_envelopes AS credential
ORDER BY credential.tenant_id;
`;
const metaCredentialRevisionBackfillCandidate =
  /INSERT\s+INTO\s+public\.meta_credential_revision_events\b[\s\S]*?ORDER\s+BY\s+credential\.tenant_id\s*;/gi;
const stagingRunCapabilityInsert =
  /^\s*INSERT\s+INTO\s+public\.bot_reply_staging_runs\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)\s*ON\s+CONFLICT\s+DO\s+NOTHING\s+RETURNING\s+\*\s+INTO\s+stored_run\s*$/i;
const stagingRunCapabilityColumns = Object.freeze([
  "run_key",
  "tenant_id",
  "request_digest",
  "actor_external_user_id",
  "connection_version",
  "policy_version",
  "release_id",
  "commit_sha",
  "artifact_digest",
  "graph_api_version",
  "recipient_fingerprint",
  "rate_limit_method_fingerprint",
  "lease_expires_at",
  "audit_key",
  "started_at",
  "created_at",
  "updated_at",
]);
const stagingRunCapabilityValues = Object.freeze([
  "requested_run_key",
  "requested_tenant_id",
  "requested_request_digest",
  "requested_actor_external_user_id",
  "requested_connection_version",
  "requested_policy_version",
  "requested_release_id",
  "requested_commit_sha",
  "requested_artifact_digest",
  "requested_graph_api_version",
  "requested_recipient_fingerprint",
  "requested_rate_limit_method_fingerprint",
  "database_lease_expires_at",
  "requested_audit_key",
  "database_now",
  "database_now",
  "database_now",
]);
const providerOperationReservationColumns = Object.freeze([
  "operation_key",
  "run_key",
  "tenant_id",
  "request_digest",
  "audit_key",
  "release_id",
  "commit_sha",
  "artifact_digest",
  "run_claim_version",
  "run_lease_expires_at",
  "operation_kind",
  "delivery_key",
  "delivery_claim_version",
  "reservation_key",
  "provider_request_key",
  "requested_at",
  "created_at",
]);
const providerOperationReservationValues = Object.freeze([
  "requested_operation_key",
  "requested_run_key",
  "requested_tenant_id",
  "requested_request_digest",
  "requested_audit_key",
  "requested_release_id",
  "requested_commit_sha",
  "requested_artifact_digest",
  "requested_run_claim_version",
  "requested_run_lease_expires_at",
  "requested_operation_kind",
  "requested_delivery_key",
  "requested_delivery_claim_version",
  "requested_reservation_key",
  "provider_request_key",
  "database_now",
  "database_now",
]);
const providerRequestFenceColumns = Object.freeze([
  "request_key",
  "delivery_key",
  "tenant_id",
  "claim_version",
  "reservation_key",
  "requested_at",
  "created_at",
]);
const providerRequestFenceValues = Object.freeze([
  "provider_request_key",
  "requested_delivery_key",
  "requested_tenant_id",
  "requested_delivery_claim_version",
  "requested_reservation_key",
  "database_now",
  "database_now",
]);
const providerOperationOutcomeColumns = Object.freeze([
  "observation_key",
  "operation_key",
  "run_key",
  "tenant_id",
  "provider_request_key",
  "operation_kind",
  "state",
  "provider_outcome_kind",
  "evidence_key",
  "observed_at",
  "finalized_at",
  "created_at",
]);
const providerOperationOutcomeValues = Object.freeze([
  "derived_observation_key",
  "stored_operation.operation_key",
  "stored_operation.run_key",
  "stored_operation.tenant_id",
  "stored_operation.provider_request_key",
  "stored_operation.operation_kind",
  "derived_state",
  "derived_outcome_kind",
  "derived_evidence_key",
  "derived_observed_at",
  "database_now",
  "database_now",
]);

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

function commaSeparatedIdentifiers(value) {
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

function isReviewedStagingRunCapabilityInsert(statement) {
  const match = stagingRunCapabilityInsert.exec(statement);
  if (!match) return false;
  const columns = commaSeparatedIdentifiers(match[1]);
  const values = commaSeparatedIdentifiers(match[2]);
  return columns.length === stagingRunCapabilityColumns.length &&
    values.length === stagingRunCapabilityValues.length &&
    columns.every(
      (column, index) => column === stagingRunCapabilityColumns[index],
    ) &&
    values.every(
      (value, index) => value === stagingRunCapabilityValues[index],
    );
}

function exactSqlLists(match, columns, values) {
  if (!match) return false;
  const actualColumns = commaSeparatedIdentifiers(match[1]);
  const actualValues = commaSeparatedIdentifiers(match[2]);
  return actualColumns.length === columns.length &&
    actualValues.length === values.length &&
    actualColumns.every((column, index) => column === columns[index]) &&
    actualValues.every((value, index) => value === values[index]);
}

function stripSqlCommentsAndQuotedLiterals(value) {
  let result = "";
  let index = 0;

  const blank = (character) => character === "\n" ? "\n" : " ";

  while (index < value.length) {
    if (value.startsWith("--", index)) {
      while (index < value.length && value[index] !== "\n") {
        result += " ";
        index += 1;
      }
      continue;
    }

    if (value.startsWith("/*", index)) {
      let depth = 1;
      result += "  ";
      index += 2;
      while (index < value.length && depth > 0) {
        if (value.startsWith("/*", index)) {
          depth += 1;
          result += "  ";
          index += 2;
        } else if (value.startsWith("*/", index)) {
          depth -= 1;
          result += "  ";
          index += 2;
        } else {
          result += blank(value[index]);
          index += 1;
        }
      }
      continue;
    }

    if (value[index] === "'" || value[index] === '"') {
      const quote = value[index];
      result += " ";
      index += 1;
      while (index < value.length) {
        result += blank(value[index]);
        if (value[index] === quote) {
          if (value[index + 1] === quote) {
            result += " ";
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (value[index] === "$") {
      const tag = value.slice(index).match(
        /^\$(?:[a-z_][a-z0-9_]*)?\$/i,
      )?.[0];
      if (tag) {
        const closingIndex = value.indexOf(tag, index + tag.length);
        const literalEnd = closingIndex < 0
          ? value.length
          : closingIndex + tag.length;
        while (index < literalEnd) {
          result += blank(value[index]);
          index += 1;
        }
        continue;
      }
    }

    result += value[index];
    index += 1;
  }

  return result;
}

function reviewedProviderOperationInsert(functionName, statement) {
  if (
    functionName === "reserve_bot_reply_staging_provider_operation_v1"
  ) {
    const reservation = statement.match(
      /^\s*INSERT\s+INTO\s+public\.bot_reply_staging_provider_operations\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)\s*ON\s+CONFLICT\s+DO\s+NOTHING\s+RETURNING\s+\*\s+INTO\s+inserted_operation\s*$/i,
    );
    if (
      exactSqlLists(
        reservation,
        providerOperationReservationColumns,
        providerOperationReservationValues,
      )
    ) {
      return true;
    }

    const requestFence = statement.match(
      /^\s*WITH\s+inserted_request\s+AS\s*\(\s*INSERT\s+INTO\s+public\.bot_reply_provider_request_claims\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)\s*ON\s+CONFLICT\s+DO\s+NOTHING\s+RETURNING\s+request_key\s*\)\s*SELECT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+inserted_request\s*\)\s+INTO\s+provider_request_inserted\s*$/i,
    );
    return exactSqlLists(
      requestFence,
      providerRequestFenceColumns,
      providerRequestFenceValues,
    );
  }

  if (
    functionName === "finalize_bot_reply_staging_provider_operation_v1"
  ) {
    return exactSqlLists(
      statement.match(
        /^\s*INSERT\s+INTO\s+public\.bot_reply_staging_provider_operation_outcomes\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)\s*RETURNING\s+\*\s+INTO\s+stored_outcome\s*$/i,
      ),
      providerOperationOutcomeColumns,
      providerOperationOutcomeValues,
    );
  }

  return false;
}

function containsSeedData(source, fileName) {
  for (const match of source.matchAll(functionDefinition)) {
    const body = match[1];
    const statements = body.split(";");
    const bodyDelimiterIndex = match[0].search(/\bAS\s+\$\$/i);
    const functionHeader = bodyDelimiterIndex < 0
      ? ""
      : match[0].slice(0, bodyDelimiterIndex);
    const sanitizedFunctionHeader =
      stripSqlCommentsAndQuotedLiterals(functionHeader);
    const isTriggerFunction =
      /\bRETURNS\s+(?:pg_catalog\.)?trigger\b/i.test(
        sanitizedFunctionHeader,
      );
    const functionName = match[0].match(
      /^CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-z][a-z0-9_]*)/i,
    )?.[1]?.toLowerCase() ?? null;

    if (
      statements.some(
        (statement) => {
          const hasLiveTriggerRowReference =
            isTriggerFunction && triggerRowReference.test(
              stripSqlCommentsAndQuotedLiterals(statement),
            );
          return dataInsertion.test(statement) &&
          !hasLiveTriggerRowReference &&
          !(
            fileName ===
              "0051_bot_reply_staging_run_capability_wrappers.sql" &&
            isReviewedStagingRunCapabilityInsert(statement)
          ) &&
          !(
            fileName ===
              "0053_bot_reply_staging_provider_operation_fence.sql" &&
            reviewedProviderOperationInsert(functionName, statement)
          );
        },
      )
    ) {
      return true;
    }
  }

  let sourceWithoutFunctionBodies = source.replace(
    functionDefinition,
    "",
  );

  if (
    fileName ===
      "0054_meta_credential_revision_ledger.sql"
  ) {
    const candidates = Array.from(
      sourceWithoutFunctionBodies.matchAll(
        metaCredentialRevisionBackfillCandidate,
      ),
    );
    const normalizeReviewedSql = (value) =>
      value.replace(/\s+/g, " ").trim();

    if (
      candidates.length === 1 &&
      normalizeReviewedSql(candidates[0][0]) ===
        normalizeReviewedSql(
          reviewedMetaCredentialRevisionBackfill,
        )
    ) {
      sourceWithoutFunctionBodies =
        sourceWithoutFunctionBodies.replace(
          candidates[0][0],
          "",
        );
    }
  }

  return dataInsertion.test(sourceWithoutFunctionBodies);
}

function containsDestructiveStatement(source, fileName) {
  let reviewedSource = source;

  if (
    fileName ===
      "0054_meta_credential_revision_ledger.sql"
  ) {
    const reviewedTriggers =
      source.match(reviewedMetaCredentialTruncateTrigger) ?? [];
    if (reviewedTriggers.length === 1) {
      reviewedSource = reviewedSource.replace(
        reviewedTriggers[0],
        "",
      );
    }
  }

  return destructiveStatement.test(reviewedSource);
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

    if (containsDestructiveStatement(source, fileName)) {
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

    if (containsSeedData(source, fileName)) {
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
