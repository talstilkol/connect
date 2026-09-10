import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL(
  "../postgres/migrations/0046_bot_reply_staging_release_evidence_atomic_initialize.sql",
  import.meta.url,
), "utf8");
const integrationDriver = readFileSync(new URL(
  "../scripts/verify-node-postgres-integration.mjs",
  import.meta.url,
), "utf8");

test("initializes version zero and publishes through one locked function", () => {
  assert.match(
    migration,
    /CREATE FUNCTION public\.initialize_publish_bot_reply_staging_evidence_with_audit\(/,
  );
  assert.match(
    migration,
    /LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog/,
  );
  assert.match(
    migration,
    /IF requested_expected_version = 0\s+AND requested_expected_evidence_digest IS NULL\s+THEN[\s\S]*MERGE INTO public\.bot_reply_staging_release_evidence[\s\S]*WHEN NOT MATCHED THEN\s+INSERT/,
  );
  assert.match(
    migration,
    /RETURN QUERY\s+SELECT published\.\*[\s\S]*FROM public\.publish_bot_reply_staging_release_evidence_with_operator_audit\(/,
  );
});

test("keeps initialization and publication in the same statement boundary", () => {
  const insertIndex = migration.indexOf(
    "MERGE INTO public.bot_reply_staging_release_evidence",
  );
  const publishIndex = migration.indexOf(
    "FROM public.publish_bot_reply_staging_release_evidence_with_operator_audit",
  );
  const functionEndIndex = migration.indexOf("\nEND;\n$$;", publishIndex);

  assert.equal(insertIndex >= 0, true);
  assert.equal(publishIndex > insertIndex, true);
  assert.equal(functionEndIndex > publishIndex, true);
  assert.doesNotMatch(
    migration.slice(insertIndex, functionEndIndex),
    /EXCEPTION\s+WHEN|\b(?:COMMIT|ROLLBACK|SAVEPOINT)\b/i,
  );
});

test("keeps the wrapper dormant and free of direct runtime grants", () => {
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.initialize_publish_bot_reply_staging_evidence_with_audit\([\s\S]*\) FROM PUBLIC/,
  );
  assert.doesNotMatch(migration, /\bGRANT\b/);
  assert.doesNotMatch(
    migration,
    /production_readiness_release_(?:heads|activation_events)_v2|authorization_events/i,
  );
});

test("keeps every declared function identifier within PostgreSQL limits", () => {
  const identifiers = [...migration.matchAll(
    /(?:CREATE|COMMENT ON|REVOKE ALL ON) FUNCTION public\.([a-z0-9_]+)\(/g,
  )].map((match) => match[1]);

  assert.equal(identifiers.length, 3);
  assert.equal(identifiers.every((identifier) => identifier.length <= 63), true);
});

test("contains no secret, personal data, or randomized identity", () => {
  assert.doesNotMatch(
    migration,
    /access_token|authorization_header|cookie|credential|phone_e164|recipient_phone|secret|Math\.random|randomUUID|gen_random_uuid/i,
  );
});

test("keeps the real PostgreSQL driver on the atomic initializer migration", () => {
  assert.match(
    integrationDriver,
    /0046_bot_reply_staging_release_evidence_atomic_initialize\.sql/,
  );
});
