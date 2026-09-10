import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../postgres/migrations/0052_bot_reply_staging_authorization_observation_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

const existingFunctions = Object.freeze([
  "audit_bot_reply_staging_authorization_insert",
  "enforce_bot_reply_staging_authorization_insert",
  "enforce_bot_reply_staging_observation_insert",
  "guard_bot_reply_staging_authorization_audit_immutability",
  "guard_bot_reply_staging_audit_immutability",
  "reject_bot_reply_staging_authorization_mutation",
  "reject_bot_reply_staging_observation_mutation",
].sort());
const newFunction = "guard_bot_reply_staging_audit_insert";
const allFunctions = Object.freeze([...existingFunctions, newFunction].sort());

test("hardens six 0034/0035 functions plus both audit mutation guards", () => {
  const replacedFunctions = [...migration.matchAll(
    /CREATE OR REPLACE FUNCTION public\.([a-z0-9_]+)\(\)/g,
  )].map((match) => match[1]).sort();
  const createdFunctions = [...migration.matchAll(
    /CREATE FUNCTION public\.([a-z0-9_]+)\(\)/g,
  )].map((match) => match[1]).sort();
  const revokedFunctions = [...migration.matchAll(
    /REVOKE ALL ON FUNCTION public\.([a-z0-9_]+)\(\)\s+FROM PUBLIC/g,
  )].map((match) => match[1]).sort();

  assert.deepEqual(replacedFunctions, existingFunctions);
  assert.deepEqual(createdFunctions, [newFunction]);
  assert.deepEqual(revokedFunctions, allFunctions);
  assert.equal((migration.match(/SECURITY INVOKER/g) ?? []).length, 8);
  assert.equal(
    (migration.match(/SET search_path = pg_catalog, pg_temp/g) ?? []).length,
    8,
  );
  assert.doesNotMatch(
    migration,
    /\b(?:GRANT|CREATE ROLE|ALTER ROLE|SECURITY DEFINER)\b/i,
  );
  assert.doesNotMatch(
    migration,
    /\b(?:random|gen_random_uuid|uuid_generate_v[1-5])\s*\(/i,
  );
});

test("fully qualifies protected relations under the locked catalog path", () => {
  for (const requiredSource of [
    "FROM public.meta_connections AS connection",
    "FROM public.bot_reply_staging_authorization_events AS authorization_event",
    "FROM public.whatsapp_campaign_delivery_policy_events AS policy",
    "FROM public.meta_credential_envelopes AS credential",
    "INSERT INTO public.audit_logs",
    "FROM public.bot_reply_staging_runs AS staging_run",
    "FROM public.bot_reply_deliveries AS delivery",
    "BEFORE INSERT ON public.audit_logs",
    "EXECUTE FUNCTION public.guard_bot_reply_staging_audit_insert()",
  ]) {
    assert.match(migration, new RegExp(requiredSource.replaceAll(".", "\\.")));
  }

  assert.doesNotMatch(migration, /INSERT INTO audit_logs/i);
  assert.doesNotMatch(migration, /FROM meta_connections\b/i);
  assert.doesNotMatch(
    migration,
    /FROM bot_reply_staging_(?:authorization|observation|runs)\b/i,
  );
  assert.doesNotMatch(migration, /FROM bot_reply_deliveries\b/i);
  assert.doesNotMatch(migration, /pg_catalog\.coalesce\s*\(/i);
});

test("uses a half-open database-clocked observation lease", () => {
  assert.match(
    migration,
    /database_now := pg_catalog\.date_trunc\([\s\S]*pg_catalog\.clock_timestamp\(\)/,
  );
  assert.match(
    migration,
    /NEW\.observed_at >= active_run\.lease_expires_at/,
  );
  assert.match(migration, /NEW\.observed_at > database_now/);
  assert.match(migration, /database_now >= active_run\.lease_expires_at/);
  assert.doesNotMatch(
    migration,
    /NEW\.observed_at > active_run\.lease_expires_at/,
  );
});

test("rejects direct spoofing of exactly the four trigger-owned audit actions", () => {
  assert.match(
    migration,
    /CREATE FUNCTION public\.guard_bot_reply_staging_audit_insert\(\)[\s\S]*pg_catalog\.pg_trigger_depth\(\) < 2/,
  );
  assert.match(
    migration,
    /guard_bot_reply_staging_audit_insert\(\)[\s\S]*FROM public\.bot_reply_staging_runs AS staging_run[\s\S]*FROM public\.bot_reply_staging_authorization_events AS authorization_event/,
  );
  for (const action of [
    "bot-reply-staging.started",
    "bot-reply-staging.completed",
    "bot-reply-staging.authorization-approved",
    "bot-reply-staging.authorization-revoked",
  ]) {
    assert.match(migration, new RegExp(action.replaceAll(".", "\\.")));
  }
  assert.equal(
    (migration.match(/CREATE TRIGGER audit_logs_bot_reply_staging_insert_guard/g) ?? [])
      .length,
    1,
  );
  assert.match(
    migration,
    /guard_bot_reply_staging_audit_immutability\(\)[\s\S]*OLD\.action IN[\s\S]*OR NEW\.action IN/,
  );
  assert.match(
    migration,
    /guard_bot_reply_staging_authorization_audit_immutability\(\)[\s\S]*OLD\.action IN[\s\S]*OR NEW\.action IN/,
  );
});

test("fails closed on ACL, trigger topology, bindings, and column grants", () => {
  assert.match(
    migration,
    /D31-D1b precondition failed: named functions %, functions %, triggers %, bindings %, table triggers %, protected tables %, existing audit insert guard %, unsafe default ACLs %/,
  );
  assert.match(
    migration,
    /D31-D1b postcondition failed: named functions %, functions %, qualified bodies %, triggers %, bindings %, table triggers %, protected tables %/,
  );
  assert.equal(
    migration.split("named_function_count <> 7").length - 1,
    1,
  );
  assert.equal(
    migration.split("named_function_count <> 8").length - 1,
    1,
  );
  assert.equal(
    migration.split("privilege.grantee <> relation.relowner").length - 1,
    4,
  );
  assert.equal(
    migration.split("attribute.attacl IS NOT NULL").length - 1,
    2,
  );
  assert.equal(
    migration.split("trigger.tgenabled = 'O'").length - 1,
    2,
  );
  assert.equal(
    migration.split("trigger.tgtype = expected.trigger_type").length - 1,
    2,
  );
  assert.equal(
    migration.split("protected_table_trigger_count <> 9").length - 1,
    1,
  );
  assert.equal(
    migration.split("protected_table_trigger_count <> 10").length - 1,
    1,
  );
});
