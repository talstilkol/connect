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
const publicRepositoryAdr = readProjectFile(
  "docs/adr/0007-public-repository-authority-and-license.md",
);
const sourceControl = readProjectFile(
  "docs/source-control-and-release.md",
);
const releaseRunbook = readProjectFile(
  "docs/release-operator-runbook.md",
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

test("preserves the private remediation as history and enforces the current public policy", () => {
  for (const document of [
    repositoryAdr,
    sourceControl,
  ]) {
    assert.match(
      document,
      /`public`/,
    );
    assert.match(
      document,
      /`private=true` ו־`visibility=private`/,
    );
  }

  assert.match(
    audit,
    /ממשק GitHub[\s\S]*`private: true` ו־`visibility: private`/,
  );
  assert.match(
    audit,
    /תיקון ה־Visibility[\s\S]*Gate 1 נשאר `blocked`/,
  );

  assert.match(repositoryAdr, /status: superseded/);
  for (const document of [
    publicRepositoryAdr,
    teamPlan,
  ]) {
    assert.match(document, /`PUBLIC`/);
    assert.match(
      document,
      /ללא (?:License|רישיון שימוש)[\s\S]*Legal review/,
    );
  }
  assert.match(
    sourceControl,
    /אינו תואם להחלטת PUBLIC/,
  );
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

test("preserves the original unknown state and records the private-repository follow-up", () => {
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
  assert.match(
    audit,
    /`0` Collaborators[\s\S]*Reviewer עצמאי/,
  );
  assert.match(
    audit,
    /`security_and_analysis: null`[\s\S]*להיכשל סגור/,
  );
  assert.match(
    audit,
    /PR #2 עבר את כל תשעת ה־Checks[\s\S]*49 Commits/,
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

test("keeps zero-step billing failures outside code regression evidence", () => {
  const zeroStepFailure = releaseRunbook.indexOf(
    "ללא Step אחד, ללא Logs",
  );
  const noCodeEvidence = releaseRunbook.indexOf(
    "ראיה שה־Checkout, ההתקנה או הקוד רצו",
  );
  const billingFailure = releaseRunbook.indexOf(
    "כשל תשלום או Spending limit",
  );
  const stopReruns = releaseRunbook.indexOf(
    "עוצרים הפעלות חוזרות",
  );

  assert.ok(zeroStepFailure >= 0);
  assert.ok(noCodeEvidence > zeroStepFailure);
  assert.ok(billingFailure > noCodeEvidence);
  assert.ok(stopReruns > billingFailure);
  assert.match(
    releaseRunbook,
    /אותם Workflows עבור אותו Commit SHA/,
  );
  const selfHosted = releaseRunbook.indexOf(
    "Self-hosted runner",
  );
  const githubHosted = releaseRunbook.indexOf(
    "GitHub-hosted runner",
  );
  const attempts = audit.indexOf("שלושה Attempts");
  const spendingLimit = audit.indexOf("Spending limit");
  const noFurtherAttempt = audit.indexOf(
    "אין להפעיל Attempt נוסף",
  );

  assert.ok(selfHosted >= 0);
  assert.ok(githubHosted > selfHosted);
  assert.ok(attempts >= 0);
  assert.ok(spendingLimit > attempts);
  assert.ok(noFurtherAttempt > spendingLimit);
});
