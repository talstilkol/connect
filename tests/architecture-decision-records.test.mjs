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
const targetTopologyAdr = readProjectFile(
  "docs/adr/0004-target-service-topology.md",
);
const releaseEvidenceStorageAdr = readProjectFile(
  "docs/adr/0005-bot-reply-release-evidence-storage.md",
);
const publicRepositoryAdr = readProjectFile(
  "docs/adr/0007-public-repository-authority-and-license.md",
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
    adrIndex,
    /\(0004-target-service-topology\.md\)/,
  );
  assert.match(
    adrIndex,
    /\(0005-bot-reply-release-evidence-storage\.md\)/,
  );
  assert.match(
    adrIndex,
    /\(0007-public-repository-authority-and-license\.md\)/,
  );
  assert.match(
    projectReadme,
    /\(docs\/adr\/0005-bot-reply-release-evidence-storage\.md\)/,
  );
  assert.match(
    teamPlan,
    /\(adr\/0002-repository-authority\.md\)/,
  );
  assert.match(
    teamPlan,
    /\(adr\/0003-ai-development-account-model\.md\)/,
  );
  assert.match(
    teamPlan,
    /\(adr\/0004-target-service-topology\.md\)/,
  );
  assert.match(
    teamPlan,
    /\(adr\/0007-public-repository-authority-and-license\.md\)/,
  );
});

test("keeps the release evidence storage recommendation proposed", () => {
  const metadata = parseFrontMatter(releaseEvidenceStorageAdr);
  assert.equal(metadata.id, "ADR-0005");
  assert.equal(metadata.status, "proposed");
  assert.equal(metadata.approved_option, "unknown/unavailable");
  assert.equal(metadata.approved_at, "unknown/unavailable");
  assert.match(releaseEvidenceStorageAdr, /PostgreSQL/);
  assert.match(releaseEvidenceStorageAdr, /Railway Variables/);
  assert.match(releaseEvidenceStorageAdr, /Compare-and-set/);
});

test("records the accepted hosting direction while deployment remains fail-closed", () => {
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
  assert.equal(metadata.status, "accepted");
  assert.equal(
    metadata.approved_option,
    "full-migration-vercel-railway",
  );
  assert.match(
    metadata.approved_at,
    /^2026-08-17T\d{2}:\d{2}:\d{2}Z$/,
  );
  assert.match(
    teamPlan,
    /ADR-0001[\s\S]*`accepted`[\s\S]*Deployment/,
  );
});

test("selects the full migration and rejects an undocumented hybrid", () => {
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
    /אפשרות C נדחית/,
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
    /טל — החלטת הספקים: `approved` ב־`2026-08-17T\d{2}:\d{2}:\d{2}Z`/,
  );
  assert.match(
    hostingAdr,
    /טל — תקציב, Plans וחשבונות: `unknown\/unavailable`/,
  );
});

test("records public authority while unresolved ADRs remain proposed", () => {
  const hostingMetadata = parseFrontMatter(hostingAdr);
  const repositoryMetadata = parseFrontMatter(repositoryAdr);
  const publicRepositoryMetadata = parseFrontMatter(publicRepositoryAdr);
  const aiMetadata = parseFrontMatter(aiAccountAdr);
  const targetTopologyMetadata = parseFrontMatter(targetTopologyAdr);

  assert.equal(hostingMetadata.status, "accepted");
  assert.equal(repositoryMetadata.status, "superseded");
  assert.equal(publicRepositoryMetadata.status, "accepted");
  assert.equal(
    publicRepositoryMetadata.approved_option,
    "public-no-license-until-legal",
  );
  assert.equal(aiMetadata.status, "proposed");
  assert.equal(
    aiMetadata.approved_option,
    "unknown/unavailable",
  );
  assert.equal(
    aiMetadata.approved_at,
    "unknown/unavailable",
  );
  assert.equal(targetTopologyMetadata.status, "proposed");
  assert.equal(
    targetTopologyMetadata.approved_option,
    "unknown/unavailable",
  );
  assert.equal(
    targetTopologyMetadata.approved_at,
    "unknown/unavailable",
  );

  assert.match(
    teamPlan,
    /ADR-0007[\s\S]*`accepted`[\s\S]*ארבעת המסמכים[\s\S]*`proposed`[\s\S]*Gate 0=`not verified`/,
  );
});

test("proposes one bounded Vercel and Railway service topology without opening deployment", () => {
  assert.match(targetTopologyAdr, /Vercel Web\/BFF/);
  assert.match(targetTopologyAdr, /Railway API/);
  assert.match(targetTopologyAdr, /Railway Worker/);
  assert.match(
    targetTopologyAdr,
    /אינה[\s\S]*פונה ישירות ל־PostgreSQL, ‏Redis או Meta/,
  );
  assert.match(targetTopologyAdr, /Vercel OIDC token קצר־חיים/);
  assert.match(
    targetTopologyAdr,
    /אפשרות שאושרה: `unknown\/unavailable`/,
  );
});

test("rejects Railway Cron for the one-minute scheduler and preserves atomic claims", () => {
  assert.match(
    targetTopologyAdr,
    /Railway Cron מאפשר תדירות[\s\S]*חמש דקות/,
  );
  assert.match(
    targetTopologyAdr,
    /Scheduler המרכזי[\s\S]*Always-on[\s\S]*PostgreSQL Lease אטומי/,
  );
  assert.match(targetTopologyAdr, /Catch-up מוגבל/);
});

test("separates Redis delivery mechanics from durable business truth", () => {
  assert.match(targetTopologyAdr, /Redis \+ BullMQ/);
  assert.match(targetTopologyAdr, /`maxmemory-policy=noeviction`/);
  assert.match(targetTopologyAdr, /AOF persistence/);
  assert.match(
    targetTopologyAdr,
    /Redis משמש Broker[\s\S]*אינו מקור[\s\S]*האמת העסקי/,
  );
  assert.match(
    targetTopologyAdr,
    /תוצאת שליחה[\s\S]*לא ידועה[\s\S]*אינה חוזרת לתור השליחה/,
  );
});

test("keeps object storage unresolved and records the safety gaps of each option", () => {
  assert.match(
    targetTopologyAdr,
    /בחירת הספק נשארת `unknown\/unavailable`/,
  );
  assert.match(targetTopologyAdr, /AWS S3 private bucket/);
  assert.match(targetTopologyAdr, /Vercel Private Blob/);
  assert.match(targetTopologyAdr, /Railway Storage Bucket/);
  assert.match(
    targetTopologyAdr,
    /אינו תומך Server-side encryption, ‏Object versioning, ‏Object Lock/,
  );
});

test("keeps one public repository authority and rejects a competing copy", () => {
  assert.match(
    publicRepositoryAdr,
    /`talstilkol\/connect` נשאר Repository Authority היחיד/,
  );
  assert.match(
    publicRepositoryAdr,
    /Visibility מחייב=`PUBLIC`/,
  );
  assert.match(
    publicRepositoryAdr,
    /אין ליצור Repository רשמי מתחרה/,
  );
  assert.match(
    publicRepositoryAdr,
    /אין להוסיף קובץ `LICENSE` לפני Legal review/,
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
