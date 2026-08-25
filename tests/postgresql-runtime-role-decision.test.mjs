import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const decision = readFileSync(
  new URL("../docs/postgresql-runtime-role-decision.md", import.meta.url),
  "utf8",
);

test("requires five principals and four isolated login capabilities before activation", () => {
  assert.match(decision, /סטטוס: החלטה חיצונית חוסמת Activation/);
  for (const principal of [
    "connect_migration_owner",
    "connect_migrator_login",
    "connect_api_runtime",
    "connect_worker_runtime",
    "connect_verifier_runtime",
  ]) {
    assert.match(decision, new RegExp(`\\b${principal}\\b`, "i"));
  }
  assert.match(
    decision,
    /כל חמשת ה־Principals וארבע יכולות ה־Login קיימים ומוכחים[\s\S]*Fail-closed/,
  );
});

test("keeps every privileged database credential in one bounded service", () => {
  for (const variable of [
    "POSTGRES_API_URL",
    "POSTGRES_WORKER_URL",
    "POSTGRES_VERIFIER_URL",
    "POSTGRES_MIGRATION_URL",
  ]) {
    assert.match(decision, new RegExp(`\\b${variable}\\b`));
  }
  assert.match(
    decision,
    /Verifier[\s\S]*`EXECUTE`[\s\S]*Wrapper[\s\S]*0044, 0046 או\s*0047/,
  );
  assert.match(
    decision,
    /ללא `INSERT`,‏ `UPDATE`,‏ `DELETE` או `TRUNCATE` ישיר/,
  );
  assert.match(
    decision,
    /API[\s\S]*ללא גישה ישירה לארבע טבלאות הראיות המוגנות/,
  );
  assert.match(
    decision,
    /Worker — ללא הרשאה לארבע הטבלאות המוגנות[\s\S]*עד אז אין Grant/,
  );
  assert.match(
    decision,
    /Readback function[\s\S]*ללא Grant[\s\S]*ישיר על הטבלאות/,
  );
  assert.match(
    decision,
    /כל Service configuration חייב להעביר Environment[\s\S]*URL אחד בלבד/,
  );
  assert.match(decision, /הפונקציה נשארת `SECURITY INVOKER`/);
  assert.match(decision, /החוזה Dormant ואינו מחובר ל־Startup/);
});

test("leaves real role creation and ownership as an explicit external decision", () => {
  assert.match(
    decision,
    /האם מאשרים את אפשרות A — ארבע יכולות PostgreSQL ו־Verifier מבודד/,
  );
  assert.match(decision, /בעל ביצוע Role creation ו־Grant\/Revoke/);
  assert.match(decision, /חלון Maintenance\/Drain ראשון ל־Staging/);
  assert.doesNotMatch(decision, /postgres(?:ql)?:\/\//i);
});

test("keeps D31-B candidate evidence dormant and unable to activate", () => {
  assert.match(decision, /postgresRuntimeCapabilityEvidence\.ts/);
  assert.match(decision, /`status: "candidate"`/);
  assert.match(decision, /`activationAllowed` נשאר תמיד `false`/);
  assert.match(
    decision,
    /אינו[\s\S]*Live verifier[\s\S]*אסור לחבר אותו[\s\S]*Production readiness/,
  );
  assert.match(
    decision,
    /Source Guard[\s\S]*Dormant ללא Importer מורשה[\s\S]*להפיל את שער הקוד/,
  );
});

test("requires one trusted aggregate across four isolated live connections", () => {
  assert.match(decision, /ה־`query` המוזרק[\s\S]*Dependency לא־מהימן/);
  assert.match(decision, /בדיוק[\s\S]*ארבעה חיבורים/);
  assert.match(decision, /Pinned connection[\s\S]*`REPEATABLE READ READ ONLY`/);
  assert.match(decision, /`search_path` בטוח[\s\S]*בפקודה נפרדת/);
  assert.match(decision, /PostgreSQL field OIDs/);
  assert.match(decision, /`\{ rowCount, rows \}`[\s\S]*`QueryResult` גולמי/);
  assert.match(decision, /Release SHA מדויק[\s\S]*TTL קצר/);
  assert.match(decision, /`system_identifier`[\s\S]*Out-of-band[\s\S]*חתום/);
});

test("records the remaining database and transport proof gaps", () => {
  assert.match(decision, /`pg_stat_ssl` מוכיח רק[\s\S]*`rejectUnauthorized=true`/);
  assert.match(decision, /SHA-256 של `pg_get_functiondef\(\)`/);
  assert.match(decision, /Inventory מלא של[\s\S]*Triggers/);
  assert.match(
    decision,
    /Schema[\s\S]*`public`[\s\S]*`connect_migration_owner`/,
  );
  assert.match(
    decision,
    /הרשאת `CREATE`[\s\S]*`PUBLIC`[\s\S]*Role[\s\S]*אחר/,
  );
  assert.match(
    decision,
    /ניגש ישירות[\s\S]*?ל־`bot_reply_staging_runs`/,
  );
  assert.match(
    decision,
    /Migration ‏`0050_bot_reply_staging_trigger_hardening\.sql`[\s\S]*Migration ‏0033/,
  );
  assert.match(
    decision,
    /`public\.audit_logs`[\s\S]*חמש פונקציות[\s\S]*`pg_catalog, pg_temp`/,
  );
  assert.match(
    decision,
    /Rehearsal מקומי מבודד[\s\S]*PostgreSQL 16\.13[\s\S]*`search_path` עוין/,
  );
  assert.match(
    decision,
    /בדיוק על חמש פונקציות[\s\S]*Migration ‏0033 בלבד[\s\S]*אינה טענה שכל פונקציות/,
  );
  assert.match(
    decision,
    /Migrations ‏0034 ו־0035[\s\S]*שלב נפרד ופתוח/,
  );
  assert.match(
    decision,
    /ה־Blocker הרחב עדיין פתוח[\s\S]*Wrappers מצומצמים[\s\S]*Trigger inventory/,
  );
  assert.match(
    decision,
    /Migration[\s\S]*0050 אינה יוצרת Wrapper, Role,‏ Grant או חיבור Runtime/,
  );
});

test("keeps the 0051 staging-run capabilities database-clocked and dormant", () => {
  assert.match(
    decision,
    /0051_bot_reply_staging_run_capability_wrappers\.sql[\s\S]*Claim\/Reclaim[\s\S]*Read\/Poll[\s\S]*Complete\/Replay/,
  );
  assert.match(
    decision,
    /`SECURITY INVOKER`[\s\S]*Database clock/,
  );
  assert.match(
    decision,
    /60–3,600 שניות[\s\S]*`database_now < lease_expires_at`/,
  );
  assert.match(
    decision,
    /0051 אינה Activation[\s\S]*אין בה[\s\S]*`SECURITY DEFINER`[\s\S]*Role[\s\S]*Grant[\s\S]*Startup/,
  );
  assert.match(
    decision,
    /הקשחת שש פונקציות 0034\/0035[\s\S]*Provider[\s\S]*`requestedAt`[\s\S]*Audit insert[\s\S]*Legacy direct/,
  );
  assert.match(
    decision,
    /API[\s\S]*Claim ו־Read[\s\S]*Worker[\s\S]*Complete[\s\S]*Fence/,
  );
  assert.match(
    decision,
    /Digest קנוני זהה[\s\S]*אותם bytes[\s\S]*JSON שקול סמנטית[\s\S]*Conflict/,
  );
  assert.match(
    decision,
    /serializeCanonicalBotReplyStagingReceipt\(\)[\s\S]*לא באמצעות `JSON\.stringify\(\)`/,
  );
  assert.match(
    decision,
    /Adapter[\s\S]*bytes של JSON קנוני[\s\S]*SHA-256[\s\S]*UTF-8 המדויק/,
  );
  assert.match(
    decision,
    /ה־API[\s\S]*`complete\(\)`[\s\S]*double-complete[\s\S]*Replay נפרד/,
  );
});

test("documents dormant 0052 hardening and its activation blockers", () => {
  assert.match(
    decision,
    /0052_bot_reply_staging_authorization_observation_hardening\.sql[\s\S]*שש פונקציות[\s\S]*SECURITY INVOKER[\s\S]*חצי־פתוח/,
  );
  assert.match(
    decision,
    /ארבע פעולות[\s\S]*Insert ישיר[\s\S]*Trigger זר[\s\S]*Update[\s\S]*53[\s\S]*92/,
  );
  assert.match(
    decision,
    /Authorization[\s\S]*recordedAt[\s\S]*Provider side effect[\s\S]*requestedAt[\s\S]*double-complete[\s\S]*Two-phase[\s\S]*indeterminate/,
  );
  assert.doesNotMatch(
    decision,
    /0052[\s\S]{0,500}(?:Production Ready|Activation Allowed|מוכן ל־Production)/,
  );
});

test("documents the dormant staging-run capability adapter without activation", () => {
  assert.match(
    decision,
    /D31-D1c[\s\S]*Candidate Adapter[\s\S]*claim_bot_reply_staging_run_v1[\s\S]*read_bot_reply_staging_run_v1[\s\S]*complete_bot_reply_staging_run_v1/,
  );
  assert.match(
    decision,
    /Shape[\s\S]*שורה יחידה[\s\S]*Canonical receipt JSON[\s\S]*Digest/,
  );
  assert.match(
    decision,
    /Direct DML[\s\S]*Environment[\s\S]*Startup wiring[\s\S]*Runtime importer/,
  );
  assert.match(
    decision,
    /Source Guard[\s\S]*Dependency closure[\s\S]*Allowlist[\s\S]*NO-GO/,
  );
});

test("keeps D31-C1 as a dormant trusted-driver contract only", () => {
  assert.match(
    decision,
    /postgresRuntimeCapabilityTrustedDriverContract\.ts[\s\S]*Contract בלבד/,
  );
  assert.match(
    decision,
    /BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/,
  );
  assert.match(
    decision,
    /SET LOCAL search_path TO pg_catalog, pg_temp/,
  );
  assert.match(decision, /`public` אינו חלק[\s\S]*`search_path`/);
  assert.match(
    decision,
    /35 עמודות Boolean[\s\S]*`dataTypeID=16`[\s\S]*`rowMode: "array"`/,
  );
  assert.match(decision, /`\[true, true, true, true\]`/);
  assert.match(
    decision,
    /`\$1=expectedDatabaseName`[\s\S]*`\$2=expectedSystemIdentifier`[\s\S]*`\$3=expectedLoginRole`/,
  );
  assert.match(
    decision,
    /`destroy-client`[\s\S]*`Promise\.race` לבדו[\s\S]*אינו עומד בחוזה/,
  );
  assert.match(
    decision,
    /Cleanup deadline[\s\S]*השמדת Client גם בכשל Close/,
  );
  assert.match(
    decision,
    /ארבע היכולות[\s\S]*תוצאה חלקית אסורה[\s\S]*`activationAllowed:false`/,
  );
  assert.match(
    decision,
    /Job מבודד וחד־פעמי[\s\S]*ארבע Attestations חתומות/,
  );
  assert.match(decision, /D31-C2[\s\S]*D31-C3[\s\S]*NO-GO/);
  assert.match(
    decision,
    /`default_transaction_read_only=on`[\s\S]*Extended protocol/,
  );
  assert.match(
    decision,
    /PostgreSQL 16\.13[\s\S]*35\/35[\s\S]*`activationAllowed:false`/,
  );
  assert.match(decision, /הוכחת תאימות מקומית בלבד/);
});
