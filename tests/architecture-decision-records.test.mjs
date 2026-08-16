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
