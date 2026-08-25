import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const decision = readFileSync(
  new URL("../docs/postgresql-runtime-role-decision.md", import.meta.url),
  "utf8",
);

test("requires four isolated PostgreSQL capabilities before activation", () => {
  assert.match(decision, /סטטוס: החלטה חיצונית חוסמת Activation/);
  for (const capability of [
    "migration owner",
    "api role",
    "worker role",
    "verifier capability role",
  ]) {
    assert.match(decision, new RegExp(`\\b${capability}\\b`, "i"));
  }
  assert.match(
    decision,
    /כל ארבע היכולות קיימות ומוכחות[\s\S]*Fail-closed/,
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
    /Readback function[\s\S]*ללא Grant[\s\S]*ישיר על הטבלאות/,
  );
  assert.match(
    decision,
    /אסור לחבר אותו ל־`POSTGRES_API_URL` או[\s\S]*`POSTGRES_WORKER_URL`/,
  );
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
