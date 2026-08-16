import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (relativePath) =>
  readFileSync(
    new URL(`../${relativePath}`, import.meta.url),
    "utf8",
  );

const audit = readProjectFile(
  "docs/github-governance-live-audit.md",
);
const repositoryAdr = readProjectFile(
  "docs/adr/0002-repository-authority.md",
);
const sourceControl = readProjectFile(
  "docs/source-control-and-release.md",
);
const teamPlan = readProjectFile(
  "docs/team-operating-plan.md",
);

test("records the observed public and unprotected repository state without marking Gate 1 ready", () => {
  assert.match(
    audit,
    /`2026-08-16T19:20:20Z`/,
  );
  assert.match(
    audit,
    /`private: false` ו־`visibility: public`/,
  );
  assert.match(
    audit,
    /ארבעת הענפים[\s\S]*`protected: false`/,
  );
  assert.match(
    audit,
    /אין Rulesets:[\s\S]*החזירה רשימה ריקה/,
  );
  assert.match(audit, /Gate 1 נשאר `blocked`/);
});

test("removes the stale claim that the live Connect repository is private", () => {
  for (const document of [
    repositoryAdr,
    sourceControl,
    teamPlan,
  ]) {
    assert.doesNotMatch(
      document,
      /קיים Repository פרטי(?: פעיל)? בשם `talstilkol\/connect`/,
    );
    assert.match(
      document,
      /`public`[\s\S]*`private`/,
    );
  }
});

test("records all nine successful jobs without treating them as required checks", () => {
  for (const check of [
    "source-guardrails",
    "secret-hygiene",
    "interface-guardrails",
    "dependency-lock",
    "migrations",
    "typecheck",
    "lint",
    "tests-and-build",
    "dependency-audit",
  ]) {
    assert.ok(audit.includes(`\`${check}\``));
  }

  assert.match(
    audit,
    /Checks קיימים אך אינם Required/,
  );
  assert.match(
    sourceControl,
    /ה־Checks[\s\S]*אינם Required/,
  );
});

test("keeps unavailable security settings unknown and orders privacy before transfer", () => {
  assert.match(
    audit,
    /רשימת Collaborators והרשאותיהם: `unknown\/unavailable`/,
  );
  assert.match(
    audit,
    /מצב 2FA[\s\S]*`unknown\/unavailable`/,
  );
  assert.match(
    audit,
    /Secret scanning ו־Push protection:[\s\S]*`unknown\/unavailable`/,
  );

  const privacyStep = audit.indexOf(
    "5.1 **עצירת חשיפה:**",
  );
  const transferStep = audit.indexOf(
    "5.5 **Transfer:**",
  );
  assert.ok(privacyStep >= 0);
  assert.ok(transferStep > privacyStep);
});
