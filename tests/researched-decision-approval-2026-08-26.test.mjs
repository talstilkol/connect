import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { HOSTING_MIGRATION_REGISTRY } from
  "../shared/domain/hostingMigrationRegistry.ts";
import { PRODUCTION_DECISION_REGISTRY } from
  "../shared/domain/productionDecisionRegistry.ts";

const approval = readFileSync(
  new URL(
    "../docs/researched-decision-approval-2026-08-26.md",
    import.meta.url,
  ),
  "utf8",
);

test("records every researched decision as selected but not live-ready", () => {
  for (const decisionId of ["D02", "D03", "D05", "D14", "D29", "D30"]) {
    assert.match(approval, new RegExp(`^## \\d+\\. ${decisionId} —`, "m"));
  }

  assert.match(approval, /Research decision selected/);
  assert.match(approval, /אינן מעידות.*תצורה.*Evidence חיים/s);
  assert.match(approval, /אין להסיק.*`selected`.*Production Ready/s);
  assert.match(approval, /Fail-closed/);
});

test("freezes the researched AI, billing and scanner boundaries", () => {
  const details = new Map(
    PRODUCTION_DECISION_REGISTRY.map(({ checkId, detail }) => [
      checkId,
      detail,
    ]),
  );

  const ai = details.get("ai.provider") ?? "";
  assert.match(ai, /OpenAI Responses API/);
  assert.match(ai, /GPT-5\.6 Luna/);
  assert.match(ai, /GPT-5\.6 Terra/);
  assert.match(ai, /store:false/);
  assert.match(ai, /אישור אדם/);
  assert.match(ai, /נשאר חסום/);

  const billing = details.get("billing.provider") ?? "";
  assert.match(billing, /העברה בנקאית/);
  assert.match(billing, /Pilot חינמי/);
  assert.match(billing, /Paddle/);
  assert.match(billing, /Stripe רדום/);
  assert.match(billing, /אין Dual-live/);
  assert.match(billing, /נשאר חסום/);

  const scanner = details.get("security.file-scanner") ?? "";
  assert.match(scanner, /AWS GuardDuty Malware Protection for S3/);
  assert.match(scanner, /bucket, key ו-versionId/);
  assert.match(scanner, /העלאות ידע נשארות כבויות/);
  assert.match(scanner, /אינה Ready/);
});

test("selects AWS S3 in Israel while preserving configuration and evidence blockers", () => {
  const storage = HOSTING_MIGRATION_REGISTRY.find(
    ({ id }) => id === "data.object-storage",
  );

  assert.ok(storage);
  assert.equal(storage.targetProvider, "aws-s3");
  assert.equal(storage.decisionState, "selected");
  assert.equal(storage.nextAction, "configuration-required");
  assert.match(storage.targetContract, /Private AWS S3/);
  assert.match(storage.targetContract, /il-central-1/);
  assert.match(storage.targetContract, /version-bound malware verdicts/);
  assert.match(storage.cutoverBlocker, /No AWS account/);
  assert.match(storage.cutoverBlocker, /only the R2 adapter/i);
  assert.match(storage.cutoverBlocker, /live residency\/security evidence/);
  assert.match(storage.cutoverBlocker, /compliance mode remains prohibited/i);
});

test("records evidence gates for roadmap, enterprise and mobile scope", () => {
  assert.match(approval, /D29 — Roadmap אחרי Pilot/);
  assert.match(approval, /pilot-evidence-ranked/);
  assert.match(approval, /לפחות שלושה SMB משלמים/);
  assert.match(approval, /50% מהקיבולת/);

  assert.match(approval, /D30 — Enterprise, Integrations ו-Mobile/);
  assert.match(approval, /evidence-gated/);
  assert.match(approval, /Web רספונסיבי\/PWA/);
  assert.match(approval, /Public API — שלושה Tenants משלמים/);
  assert.match(approval, /Native mobile.*שלושה Tenants משלמים/s);
});

test("uses official sources and contains neither secrets nor nondeterministic IDs", () => {
  for (const officialOrigin of [
    "https://developers.openai.com/",
    "https://stripe.com/",
    "https://support.stripe.com/",
    "https://www.paddle.com/",
    "https://developer.paddle.com/",
    "https://www.gov.il/",
    "https://docs.aws.amazon.com/",
    "https://aws.amazon.com/",
    "https://docs.clamav.net/",
    "https://spec.openapis.org/",
    "https://www.rfc-editor.org/",
  ]) {
    assert.match(approval, new RegExp(officialOrigin.replaceAll(".", "\\.")));
  }

  assert.doesNotMatch(
    approval,
    /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*\S+/i,
  );
  assert.doesNotMatch(approval, /Math\.random|crypto\.randomUUID/);
});
