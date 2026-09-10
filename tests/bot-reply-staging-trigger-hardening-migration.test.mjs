import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../postgres/migrations/0050_bot_reply_staging_trigger_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

const auditFunctions = Object.freeze([
  "audit_bot_reply_staging_run_completion",
  "audit_bot_reply_staging_run_start",
]);
const existingGuardFunctions = Object.freeze([
  "guard_bot_reply_staging_audit_immutability",
  "guard_bot_reply_staging_run_update",
  "reject_bot_reply_staging_run_delete",
]);
const hardenedFunctions = Object.freeze([
  ...auditFunctions,
  ...existingGuardFunctions,
].sort());

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("hardens exactly the five existing staging trigger functions", () => {
  const replacedFunctions = [...migration.matchAll(
    /CREATE OR REPLACE FUNCTION public\.([a-z0-9_]+)\(\)/g,
  )].map((match) => match[1]).sort();
  const revokedFunctions = [...migration.matchAll(
    /REVOKE ALL ON FUNCTION public\.([a-z0-9_]+)\(\)\s+FROM PUBLIC/g,
  )].map((match) => match[1]).sort();

  assert.deepEqual(replacedFunctions, [...auditFunctions].sort());
  assert.deepEqual(revokedFunctions, hardenedFunctions);
  assert.equal(
    (migration.match(/SECURITY INVOKER/g) ?? []).length,
    5,
  );
  assert.equal(
    (migration.match(/SET search_path = pg_catalog, pg_temp/g) ?? [])
      .length,
    5,
  );

  for (const functionName of auditFunctions) {
    assert.match(
      migration,
      new RegExp(
        `CREATE OR REPLACE FUNCTION public\\.${escapePattern(functionName)}` +
          "\\(\\)[\\s\\S]*?SECURITY INVOKER" +
          "[\\s\\S]*?SET search_path = pg_catalog, pg_temp" +
          "[\\s\\S]*?INSERT INTO public\\.audit_logs",
      ),
    );
  }

  for (const functionName of existingGuardFunctions) {
    const escapedName = escapePattern(functionName);
    assert.match(
      migration,
      new RegExp(
        `ALTER FUNCTION public\\.${escapedName}\\(\\)` +
          "\\s+SECURITY INVOKER;" +
          `[\\s\\S]*?ALTER FUNCTION public\\.${escapedName}\\(\\)` +
          "\\s+SET search_path = pg_catalog, pg_temp;",
      ),
    );
  }
});

test("keeps the hardening forward-only, dormant, and privilege reducing", () => {
  assert.equal(
    (migration.match(/INSERT INTO public\.audit_logs\s*\(/g) ?? []).length,
    2,
  );
  assert.doesNotMatch(migration, /INSERT INTO audit_logs/i);
  assert.doesNotMatch(
    migration,
    /\b(?:GRANT|CREATE ROLE|ALTER ROLE|SECURITY DEFINER)\b/i,
  );
  assert.doesNotMatch(
    migration,
    /\b(?:DROP|TRUNCATE|DELETE FROM|CREATE TRIGGER)\b/i,
  );
  assert.doesNotMatch(
    migration,
    /\b(?:random|gen_random_uuid|uuid_generate_v[1-5])\s*\(/i,
  );
  assert.match(
    migration,
    /D31-D0 precondition failed: functions %, triggers %, bindings %, table triggers %/,
  );
  assert.match(
    migration,
    /D31-D0 postcondition failed: functions %, audit %, triggers %, bindings %, table triggers %/,
  );
  assert.equal(
    (migration.match(/trigger\.tgenabled = 'O'/g) ?? []).length,
    2,
  );
  assert.equal(
    (migration.match(/trigger\.tgtype = expected\.trigger_type/g) ?? [])
      .length,
    2,
  );
  for (const requiredTriggerConstraint of [
    "trigger.tgqual IS NULL",
    "trigger.tgnargs = 0",
    "pg_catalog.cardinality(trigger.tgattr) = 0",
    "pg_catalog.octet_length(trigger.tgargs) = 0",
    "trigger.tgconstraint = 0",
    "trigger.tgdeferrable = false",
    "trigger.tginitdeferred = false",
    "trigger.tgparentid = 0",
    "trigger.tgoldtable IS NULL",
    "trigger.tgnewtable IS NULL",
  ]) {
    assert.equal(
      migration.split(requiredTriggerConstraint).length - 1,
      2,
    );
  }
  assert.equal(
    migration.split(
      "audit_logs_bot_reply_staging_authorization_guard",
    ).length - 1,
    2,
  );
  assert.equal(
    migration.split("protected_table_trigger_count <> 6").length - 1,
    2,
  );
  assert.equal(
    (migration.match(/pg_catalog\.jsonb_build_object\(/g) ?? []).length,
    2,
  );
});
