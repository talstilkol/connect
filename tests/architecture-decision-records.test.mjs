import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readProjectFile = (relativePath) =>
  readFileSync(
    new URL(`../${relativePath}`, import.meta.url),
    "utf8",
  );

const adrIndex = readProjectFile(
  "docs/adr/README.md",
);
const hostingAdr = readProjectFile(
  "docs/adr/0001-hosting-topology.md",
);
const repositoryAdr = readProjectFile(
  "docs/adr/0002-repository-authority.md",
);
const aiAccountAdr = readProjectFile(
  "docs/adr/0003-ai-development-account-model.md",
);
const projectReadme = readProjectFile("README.md");
const teamPlan = readProjectFile(
  "docs/team-operating-plan.md",
);

function parseFrontMatter(markdown) {
  const block = markdown.match(
    /^---\n([\s\S]*?)\n---\n/,
  )?.[1];

  assert.ok(block, "ADR front matter is missing");

  const values = Object.create(null);
  for (const line of block.split("\n")) {
    const separator = line.indexOf(":");
    assert.ok(separator > 0, `Invalid ADR metadata line: ${line}`);

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    assert.ok(!(key in values), `Duplicate ADR metadata: ${key}`);
    assert.ok(value.length > 0, `Empty ADR metadata: ${key}`);
    values[key] = value;
  }

  return values;
}

test("keeps the hosting ADR discoverable from the project and Gate 0", () => {
  assert.match(
    projectReadme,
    /\(docs\/adr\/README\.md\)/,
  );
  assert.match(
    adrIndex,
    /\(0001-hosting-topology\.md\)/,
  );
  assert.match(
    teamPlan,
    /\(adr\/0001-hosting-topology\.md\)/,
  );
  assert.match(
    adrIndex,
    /\(0002-repository-authority\.md\)/,
  );
  assert.match(
    adrIndex,
    /\(0003-ai-development-account-model\.md\)/,
  );
  assert.match(
    teamPlan,
    /\(adr\/0002-repository-authority\.md\)/,
  );
  assert.match(
    teamPlan,
    /\(adr\/0003-ai-development-account-model\.md\)/,
  );
});

test("keeps a proposed hosting recommendation fail-closed", () => {
  const metadata = parseFrontMatter(hostingAdr);

  assert.deepEqual(
    Object.keys(metadata),
    [
      "id",
      "title",
      "status",
      "decision_owner",
      "approved_option",
      "approved_at",
      "supersedes",
    ],
  );
  assert.equal(metadata.id, "ADR-0001");
  assert.equal(metadata.status, "proposed");
  assert.equal(
    metadata.approved_option,
    "unknown/unavailable",
  );
  assert.equal(
    metadata.approved_at,
    "unknown/unavailable",
  );
  assert.match(
    teamPlan,
    /`proposed`[\s\S]*Gate 0 אינו `verified`/,
  );
});

test("documents one recommendation, one full migration, and rejects an undocumented hybrid", () => {
  assert.match(
    hostingAdr,
    /אפשרות A — Cloudflare מלא ל־Pilot/,
  );
  assert.match(
    hostingAdr,
    /אפשרות B — Migration מלא ל־Vercel ול־Railway/,
  );
  assert.match(
    hostingAdr,
    /אפשרות C — Hybrid זמני/,
  );
  assert.match(
    hostingAdr,
    /אין לאשר אפשרות C/,
  );
  assert.match(
    hostingAdr,
    /Evidence של חשבון, Staging ו־Deployment חי:[\s\S]*`unknown\/unavailable`/,
  );
});

test("requires real approval metadata before an ADR can be accepted", () => {
  assert.match(
    adrIndex,
    /רק ADR בסטטוס `accepted` יכול לפתוח Gate/,
  );
  assert.match(
    adrIndex,
    /`approved_option` שאינו `unknown\/unavailable`/,
  );
  assert.match(
    adrIndex,
    /זמן UTC קנוני בשדה `approved_at`/,
  );
  assert.match(
    hostingAdr,
    /שמות המאשרים, האפשרות שנבחרה ומועד UTC קנוני נכתבים במסמך/,
  );
});

test("keeps every Gate 0 ADR proposed until external owners approve it", () => {
  for (const adr of [
    hostingAdr,
    repositoryAdr,
    aiAccountAdr,
  ]) {
    const metadata = parseFrontMatter(adr);
    assert.equal(metadata.status, "proposed");
    assert.equal(
      metadata.approved_option,
      "unknown/unavailable",
    );
    assert.equal(
      metadata.approved_at,
      "unknown/unavailable",
    );
  }

  assert.match(
    teamPlan,
    /כל שלושת ה־ADRs[\s\S]*`proposed`[\s\S]*Gate 0[\s\S]*`not verified`/,
  );
});

test("keeps one repository authority and rejects a competing copy", () => {
  assert.match(
    repositoryAdr,
    /אפשרות A — העברת ה־Repository הקיים ל־Organization של החברה/,
  );
  assert.match(
    repositoryAdr,
    /Repository\s+Authority היחיד/,
  );
  assert.match(
    repositoryAdr,
    /אפשרות C — פתיחת Repository חדש והעתקת הקוד/,
  );
  assert.match(
    repositoryAdr,
    /תוכנית GitHub[\s\S]*`unknown\/unavailable`/,
  );
});

test("requires named Claude seats and rejects shared sessions", () => {
  assert.match(
    aiAccountAdr,
    /אפשרות A — Claude Team בבעלות החברה עם Seat אישי/,
  );
  assert.match(
    aiAccountAdr,
    /אפשרות C — חשבון משותף או Session משותף דרך AnyDesk/,
  );
  assert.match(aiAccountAdr, /האפשרות נדחית/);
  assert.match(
    aiAccountAdr,
    /הוא אינו תחליף ל־Seat אישי/,
  );
  assert.match(
    aiAccountAdr,
    /Feedback מפורש הוא חריג/,
  );
  assert.match(
    aiAccountAdr,
    /מחיר מקומי, Seats,[\s\S]*`unknown\/unavailable`/,
  );
});
