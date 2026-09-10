import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL(
  "../postgres/migrations/0044_bot_reply_staging_release_evidence_atomic_publish.sql",
  import.meta.url,
), "utf8");
const deploymentContract = readFileSync(new URL(
  "../docs/bot-reply-staging-release-evidence-database-fence.md",
  import.meta.url,
), "utf8");

test("defines one locked security-definer CAS plus operator-audit boundary", () => {
  assert.match(
    migration,
    /CREATE FUNCTION public\.publish_bot_reply_staging_release_evidence_with_operator_audit\(/,
  );
  assert.match(
    migration,
    /LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog/,
  );
  assert.match(
    migration,
    /UPDATE public\.bot_reply_staging_release_evidence AS evidence[\s\S]*MERGE INTO public\.bot_reply_staging_release_evidence_operator_events/,
  );
  assert.equal(
    (migration.match(/SET search_path = pg_catalog/g) ?? []).length,
    3,
  );
  assert.doesNotMatch(
    migration,
    /\b(?:FROM|UPDATE|INTO)\s+bot_reply_staging_release_evidence(?:_operator_events)?\b/,
  );
  assert.doesNotMatch(
    migration,
    /\bEXECUTE\s+(?:IMMEDIATE|format\s*\(|\()/i,
  );
});

test("returns replay without another event and conflict without any event", () => {
  assert.match(
    migration,
    /IF FOUND THEN[\s\S]*'replayed'::TEXT[\s\S]*'conflict'::TEXT[\s\S]*RETURN;/,
  );
  assert.match(
    migration,
    /UPDATE public\.bot_reply_staging_release_evidence[\s\S]*IF NOT FOUND THEN[\s\S]*'replayed'::TEXT[\s\S]*'conflict'::TEXT[\s\S]*RETURN;[\s\S]*MERGE INTO/,
  );
  assert.match(
    migration,
    /WHEN NOT MATCHED THEN\s+INSERT[\s\S]*SELECT operator_event\.\*[\s\S]*INTO stored_event[\s\S]*'stored'::TEXT/,
  );
});

test("keeps audit failure inside the same PostgreSQL statement rollback", () => {
  const updateIndex = migration.indexOf(
    "UPDATE public.bot_reply_staging_release_evidence",
  );
  const mergeIndex = migration.indexOf(
    "MERGE INTO public.bot_reply_staging_release_evidence_operator_events",
  );
  const auditFailureIndex = migration.indexOf(
    "Bot reply staging release evidence audit persistence failed",
  );
  const functionEndIndex = migration.indexOf(
    "\nEND;\n$$;",
    auditFailureIndex,
  );

  assert.equal(updateIndex >= 0, true);
  assert.equal(mergeIndex > updateIndex, true);
  assert.equal(auditFailureIndex > mergeIndex, true);
  assert.equal(functionEndIndex > auditFailureIndex, true);
  assert.doesNotMatch(
    migration.slice(updateIndex, functionEndIndex),
    /EXCEPTION\s+WHEN|\b(?:COMMIT|ROLLBACK|SAVEPOINT)\b/i,
  );
});

test("keeps the new function dormant without pretending direct DML is fenced", () => {
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.publish_bot_reply_staging_release_evidence_with_operator_audit\([\s\S]*\) FROM PUBLIC/,
  );
  assert.doesNotMatch(
    migration,
    /REVOKE[\s\S]{0,120}ON (?:TABLE )?public\.bot_reply_staging_release_evidence/i,
  );
  assert.doesNotMatch(migration, /\bGRANT\b/);
  assert.match(
    deploymentContract,
    /does not wire the function into the\s+Railway runtime[\s\S]*does not authorize Bot reply staging activation/,
  );
  assert.match(
    deploymentContract,
    /does not\s+separate a migration owner from a restricted runtime role/,
  );
  assert.match(
    deploymentContract,
    /pre-0044 repository SQL remains a known direct compare-and-set path/,
  );
});

test("contains no activation mutation, secret field, or randomized identity", () => {
  assert.doesNotMatch(
    migration,
    /production_readiness_release_(?:heads|activation_events)_v2|authorization_events/i,
  );
  assert.doesNotMatch(
    migration,
    /access_token|authorization_header|cookie|credential|phone_e164|recipient_phone|secret|Math\.random|randomUUID|gen_random_uuid/i,
  );
});
