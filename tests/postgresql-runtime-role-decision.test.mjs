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
