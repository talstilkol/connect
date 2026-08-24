import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../postgres/migrations/0041_production_readiness_release_evidence_v2.sql",
    import.meta.url,
  ),
  "utf8",
);

test("creates an independent candidate-head-activation v2 schema", () => {
  assert.match(
    migration,
    /CREATE TABLE production_readiness_release_heads_v2/,
  );
  assert.match(
    migration,
    /CREATE TABLE production_readiness_release_candidates_v2/,
  );
  assert.match(
    migration,
    /CREATE TABLE production_readiness_release_activation_events_v2/,
  );
  assert.doesNotMatch(
    migration,
    /REFERENCES\s+bot_reply_staging_release_evidence/i,
  );
  assert.doesNotMatch(migration, /random|uuid/i);
});

test("binds each head to one exact composite release identity", () => {
  assert.match(
    migration,
    /PRIMARY KEY \(environment, release_id\)/,
  );
  assert.match(
    migration,
    /environment IN \(\s*'development',\s*'preview',\s*'production',\s*'staging'/,
  );
  assert.match(migration, /CHECK \(registry_version = 2\)/);
  assert.match(
    migration,
    /production_readiness_registry_v2_\[0-9a-f\]\{64\}/,
  );
  assert.match(migration, /release_manifest_digest TEXT NOT NULL/);
  assert.match(migration, /railway_api_artifact_digest TEXT NOT NULL/);
  assert.match(migration, /railway_worker_artifact_digest TEXT NOT NULL/);
  assert.match(migration, /vercel_web_artifact_digest TEXT NOT NULL/);
  assert.match(
    migration,
    /railway_api_artifact_digest <> railway_worker_artifact_digest/,
  );
  assert.match(
    migration,
    /active_version = 0\s*AND active_candidate_digest IS NULL/,
  );
});

test("stages one immutable bounded candidate with exactly six envelopes", () => {
  assert.match(
    migration,
    /PRIMARY KEY \(environment, release_id, candidate_digest\)/,
  );
  assert.match(
    migration,
    /production_readiness_candidate_v2_\[0-9a-f\]\{64\}/,
  );
  assert.match(
    migration,
    /octet_length\(evidence_set_json\) BETWEEN 2 AND 49159/,
  );
  assert.match(
    migration,
    /jsonb_array_length\(evidence_set_json::jsonb\) = 6/,
  );
  assert.match(
    migration,
    /candidate requires exactly six envelopes/,
  );
  assert.match(migration, /valid_until > staged_at/);
  assert.match(
    migration,
    /NEW\.valid_until <> earliest_expiry/,
  );
  assert.match(
    migration,
    /Production readiness v2 candidates are immutable/,
  );
  assert.match(
    migration,
    /production_readiness_candidates_v2_update_guard/,
  );
  assert.match(
    migration,
    /production_readiness_candidates_v2_delete_guard/,
  );
});

test("rejects incomplete, duplicate and cross-release evidence sets", () => {
  for (const checkId of [
    "queue.redis-bullmq",
    "runtime.railway-api",
    "runtime.railway-worker",
    "runtime.vercel-web",
    "storage.object",
    "storage.postgresql",
  ]) {
    assert.match(migration, new RegExp(checkId.replace(".", "\\.")));
  }
  assert.match(
    migration,
    /envelope_check_id = ANY\(seen_check_ids\)/,
  );
  assert.match(
    migration,
    /envelope ->> 'registryDigest' <> release_head\.registry_digest/,
  );
  assert.match(
    migration,
    /envelope ->> 'releaseId' <> release_head\.release_id/,
  );
  assert.match(
    migration,
    /envelope ->> 'commitSha' <> release_head\.commit_sha/,
  );
  assert.match(
    migration,
    /release_head\.railway_api_artifact_digest/,
  );
  assert.match(
    migration,
    /release_head\.railway_worker_artifact_digest/,
  );
  assert.match(
    migration,
    /release_head\.vercel_web_artifact_digest/,
  );
  assert.match(
    migration,
    /production_readiness_evidence_v2_\[0-9a-f\]\{64\}/,
  );
  assert.match(migration, /envelope ->> 'outcome' <> 'passed'/);
});

test("requires every head CAS activation to have one matching event", () => {
  assert.match(
    migration,
    /NEW\.active_version <> OLD\.active_version \+ 1/,
  );
  assert.match(
    migration,
    /NEW\.active_candidate_digest IS NOT DISTINCT FROM\s*OLD\.active_candidate_digest/,
  );
  assert.match(
    migration,
    /active_candidate\.valid_until <= NEW\.updated_at/,
  );
  assert.match(
    migration,
    /CREATE CONSTRAINT TRIGGER production_readiness_heads_v2_event_guard[\s\S]*DEFERRABLE INITIALLY DEFERRED/,
  );
  assert.match(
    migration,
    /event\.previous_candidate_digest IS NOT DISTINCT FROM\s*OLD\.active_candidate_digest/,
  );
  assert.match(
    migration,
    /event\.activated_candidate_digest =\s*NEW\.active_candidate_digest/,
  );
});

test("keeps activation history append-only and chained", () => {
  assert.match(
    migration,
    /PRIMARY KEY \(environment, release_id, active_version\)/,
  );
  assert.match(
    migration,
    /active_version = 1\s*AND previous_candidate_digest IS NULL/,
  );
  assert.match(
    migration,
    /active_version = NEW\.active_version - 1/,
  );
  assert.match(
    migration,
    /prior_event\.activated_candidate_digest <>\s*NEW\.previous_candidate_digest/,
  );
  assert.match(
    migration,
    /CREATE CONSTRAINT TRIGGER production_readiness_activation_events_v2_head_guard[\s\S]*DEFERRABLE INITIALLY DEFERRED/,
  );
  assert.match(
    migration,
    /Production readiness v2 activation events are append-only/,
  );
  assert.match(
    migration,
    /production_readiness_activation_events_v2_update_guard/,
  );
  assert.match(
    migration,
    /production_readiness_activation_events_v2_delete_guard/,
  );
});

test("uses a deferred head pointer and never exposes an expired candidate", () => {
  assert.match(
    migration,
    /ADD CONSTRAINT production_readiness_heads_v2_active_candidate_fk[\s\S]*DEFERRABLE INITIALLY DEFERRED/,
  );
  assert.match(
    migration,
    /activated_candidate\.valid_until <= NEW\.activated_at/,
  );
  assert.match(
    migration,
    /release_head\.active_candidate_digest <>\s*NEW\.activated_candidate_digest/,
  );
});
