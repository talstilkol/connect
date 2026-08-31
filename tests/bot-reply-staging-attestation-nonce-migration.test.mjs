import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const migration = readFileSync(new URL(
  "../postgres/migrations/0047_bot_reply_staging_attestation_nonce_ledger.sql",
  import.meta.url,
), "utf8");
const foundation = readFileSync(new URL(
  "../server/platform/railwayPostgresFoundation.ts",
  import.meta.url,
), "utf8");
const apiRuntime = readFileSync(new URL(
  "../server/platform/railwayPostgresApiRuntime.ts",
  import.meta.url,
), "utf8");
const workerRuntime = readFileSync(new URL(
  "../server/platform/railwayPostgresWorkerService.ts",
  import.meta.url,
), "utf8");

function runtimeSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return runtimeSourceFiles(path);
      return /\.(?:mjs|ts|tsx)$/.test(entry.name) ? [path] : [];
    });
}

test("stores only bounded payload-free attestation claim evidence", () => {
  assert.match(
    migration,
    /CREATE TABLE public\.bot_reply_staging_attestation_nonces \(/,
  );
  for (const required of [
    /nonce TEXT PRIMARY KEY/,
    /FOREIGN KEY \(run_key\)[\s\S]*REFERENCES public\.bot_reply_staging_runs \(run_key\)/,
    /FOREIGN KEY \(release_id, commit_sha, artifact_digest\)[\s\S]*REFERENCES public\.bot_reply_staging_release_evidence/,
    /UNIQUE \(\s*run_key,\s*claim_version\s*\)/,
    /UNIQUE \(\s*release_id,\s*expected_evidence_version\s*\)/,
    /UNIQUE \(audit_key\)/,
    /UNIQUE \(\s*attestation_payload_digest\s*\)/,
    /nonce_sequence = claim_version/,
    /INTERVAL '60 seconds'/,
    /INTERVAL '900 seconds'/,
  ]) {
    assert.match(migration, required);
  }
  assert.doesNotMatch(
    migration,
    /signature\s+TEXT|receipt_json|private_key|public_key|phone_e164|recipient_phone|message_body/i,
  );
});

test("serializes every collision domain before one exact consume decision", () => {
  assert.match(
    migration,
    /FOR advisory_lock_key IN[\s\S]*hashtextextended\([\s\S]*ORDER BY locks\.lock_key[\s\S]*pg_advisory_xact_lock/,
  );
  assert.match(
    migration,
    /ledger\.nonce = requested_nonce[\s\S]*ledger\.run_key = requested_run_key[\s\S]*ledger\.release_id = requested_release_id[\s\S]*ledger\.audit_key = requested_audit_key[\s\S]*ledger\.attestation_payload_digest/,
  );
  assert.match(
    migration,
    /FOR KEY SHARE[\s\S]*FOR UPDATE[\s\S]*MERGE INTO public\.bot_reply_staging_attestation_nonces/,
  );
  assert.match(
    migration,
    /'replayed'::TEXT[\s\S]*stored_claim\.attestation_payload_digest/,
  );
  assert.match(
    migration,
    /'conflict'::TEXT,\s*NULL::TEXT,\s*NULL::TEXT,\s*NULL::TEXT,\s*NULL::INTEGER,\s*NULL::TEXT/,
  );
});

test("keeps the nonce primitive immutable, dormant and inaccessible", () => {
  assert.match(
    migration,
    /CREATE FUNCTION public\.consume_bot_reply_staging_attestation_nonce\(/,
  );
  assert.match(
    migration,
    /LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog/,
  );
  assert.match(
    migration,
    /BEFORE UPDATE OR DELETE ON public\.bot_reply_staging_attestation_nonces/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.bot_reply_staging_attestation_nonces FROM PUBLIC/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.consume_bot_reply_staging_attestation_nonce\([\s\S]*\) FROM PUBLIC/,
  );
  assert.doesNotMatch(
    migration,
    /\bGRANT\b|\bEXECUTE\s+format\s*\(|production_readiness_release_(?:heads|activation_events)_v2/i,
  );
  for (const runtimeSource of [foundation, apiRuntime, workerRuntime]) {
    assert.doesNotMatch(
      runtimeSource,
      /postgresBotReplyStagingAttestationNonceRepository/,
    );
  }

  const allowedSources = new Set([
    "scripts/verify-bot-reply-staging-attestation-nonce-postgres.mjs",
    "scripts/verify-bot-reply-staging-attested-evidence-postgres.mjs",
    "server/platform/postgresBotReplyStagingAttestationNonceRepository.ts",
    "server/platform/postgresRuntimeCapabilityEvidence.ts",
  ]);
  const candidateProbe = readFileSync(
    resolve(
      repositoryRoot,
      "server/platform/postgresRuntimeCapabilityEvidence.ts",
    ),
    "utf8",
  );
  assert.match(candidateProbe, /readonly activationAllowed: false/);
  assert.match(candidateProbe, /activationAllowed: false/);
  assert.match(candidateProbe, /status: "candidate" \| "blocked"/);
  assert.doesNotMatch(
    candidateProbe,
    /(?:SELECT|PERFORM)\s+public\.consume_bot_reply_staging_attestation_nonce/i,
  );
  const runtimeRoots = [
    "app",
    "db",
    "features",
    "shared",
    "server",
    "worker",
    "scripts",
  ].map((directory) => resolve(repositoryRoot, directory));
  const proxySource = resolve(repositoryRoot, "proxy.ts");
  const runtimeSources = runtimeRoots.flatMap(runtimeSourceFiles);
  if (existsSync(proxySource)) runtimeSources.push(proxySource);
  for (const path of runtimeSources) {
    const repositoryPath = relative(repositoryRoot, path);
    if (allowedSources.has(repositoryPath)) continue;
    assert.doesNotMatch(
      readFileSync(path, "utf8"),
      /postgresBotReplyStagingAttestationNonceRepository|consume_bot_reply_staging_attestation_nonce/,
      `${repositoryPath} must not activate the dormant nonce primitive`,
    );
  }
});

test("uses database time and exact completed-run/release bindings", () => {
  assert.match(
    migration,
    /date_trunc\(\s*'milliseconds',\s*pg_catalog\.clock_timestamp\(\)\s*\)/,
  );
  assert.equal(
    (migration.match(/pg_catalog\.clock_timestamp\(\)/g) ?? []).length >= 4,
    true,
  );
  assert.doesNotMatch(migration, /statement_timestamp\(\)/);
  assert.equal(
    migration.indexOf("pg_catalog.octet_length(requested_policy_version)") <
      migration.indexOf("pg_catalog.hashtextextended("),
    true,
  );
  assert.match(
    migration,
    /stored_run\.status <> 'completed'[\s\S]*stored_run\.claim_version <> requested_claim_version[\s\S]*stored_run\.request_digest <> requested_request_digest/,
  );
  assert.match(
    migration,
    /stored_release\.evidence_version <>\s*requested_expected_evidence_version/,
  );
  assert.doesNotMatch(
    migration,
    /stored_run\.receipt_digest <> requested_receipt_digest/,
  );
});

test("keeps PostgreSQL identifiers and data boundaries safe", () => {
  const identifierPatterns = [
    /\bCONSTRAINT\s+([a-z0-9_]+)/g,
    /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+([a-z0-9_]+)/g,
    /\bCREATE\s+FUNCTION\s+public\.([a-z0-9_]+)/g,
    /\bCREATE\s+TABLE\s+public\.([a-z0-9_]+)/g,
    /\bCREATE\s+TRIGGER\s+([a-z0-9_]+)/g,
  ];
  const identifiers = identifierPatterns.flatMap((pattern) =>
    [...migration.matchAll(pattern)].map((match) => match[1])
  );
  assert.equal(identifiers.length > 0, true);
  assert.equal(
    identifiers.every(
      (identifier) => Buffer.byteLength(identifier, "utf8") <= 63,
    ),
    true,
  );
  assert.match(
    migration,
    /CREATE TABLE public\.bot_reply_staging_attestation_nonces/,
  );
  assert.match(
    migration,
    /MERGE INTO public\.bot_reply_staging_attestation_nonces/,
  );
  assert.doesNotMatch(
    migration,
    /access_token|authorization_header|cookie|credential|secret|Math\.random|randomUUID|gen_random_uuid/i,
  );
});
