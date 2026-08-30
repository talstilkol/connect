import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { HOSTING_MIGRATION_REGISTRY } from
  "../shared/domain/hostingMigrationRegistry.ts";
import { PRODUCTION_DECISION_REGISTRY } from
  "../shared/domain/productionDecisionRegistry.ts";

const intake = readFileSync(
  new URL("../docs/decision-intake-2026-08-21.md", import.meta.url),
  "utf8",
);

test("records all thirty exported decision groups without secrets", () => {
  const tableRows = [
    ...intake.matchAll(/^\| (D\d{2}) \|/gm),
  ].map((match) => match[1]);

  assert.equal(tableRows.length, 30);
  assert.deepEqual(
    tableRows,
    Array.from(
      { length: 30 },
      (_, index) => `D${String(index + 1).padStart(2, "0")}`,
    ),
  );
  assert.match(intake, /25 מתוך 30/);
  assert.match(intake, /26 תשובות או הנחיות/);
  assert.match(intake, /D05, ‏D14,\s*D29 ו־D30/);
  assert.match(intake, /מסמך היסטורי/);
  assert.match(
    intake,
    /researched-decision-approval-2026-08-26\.md/,
  );
  assert.doesNotMatch(
    intake,
    /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*\S+/i,
  );
});

test("keeps selected production directions visible but fail-closed", () => {
  const details = new Map(
    PRODUCTION_DECISION_REGISTRY.map(({ checkId, detail }) => [
      checkId,
      detail,
    ]),
  );

  assert.match(details.get("identity.team-invitation-policy"), /72 שעות/);
  assert.match(details.get("ai.provider"), /OpenAI Responses API/);
  assert.match(details.get("ai.provider"), /GPT-5\.6 Luna/);
  assert.match(details.get("ai.provider"), /אישור אדם/);
  assert.match(details.get("billing.provider"), /העברה בנקאית/);
  assert.match(details.get("billing.provider"), /Paddle/);
  assert.match(details.get("billing.provider"), /Stripe רדום/);
  assert.match(details.get("security.rate-limit-policy"), /מצב Meta חי/);
  assert.match(details.get("security.knowledge-upload-policy"), /10 MiB/);
  assert.match(details.get("operations.knowledge-scan-recovery"), /15 דקות/);
  assert.match(details.get("operations.backup-policy"), /90 יום/);
  assert.match(details.get("operations.slo-measurement"), /Better Stack/);
  assert.match(details.get("operations.slo-alert-policy"), /Primary ו-Backup/);
  assert.match(details.get("governance.data-retention-policy"), /Legal review/);
  assert.match(
    details.get("security.file-scanner"),
    /AWS GuardDuty Malware Protection for S3/,
  );
  assert.match(details.get("security.file-scanner"), /העלאות ידע נשארות כבויות/);
});

test("selects the answered hosting directions without claiming readiness", () => {
  const capabilities = new Map(
    HOSTING_MIGRATION_REGISTRY.map((capability) => [
      capability.id,
      capability,
    ]),
  );

  const database = capabilities.get("data.relational-database");
  assert.equal(database?.targetProvider, "railway");
  assert.equal(database?.decisionState, "selected");

  for (const queueId of [
    "queue.meta-webhook",
    "queue.campaign-delivery",
    "queue.team-invitation",
    "queue.message-template-submission",
  ]) {
    const queue = capabilities.get(queueId);
    assert.equal(queue?.targetProvider, "railway");
    assert.equal(queue?.decisionState, "selected");
    assert.match(queue?.targetContract ?? "", /BullMQ/);
  }

  const observability = capabilities.get("operations.observability");
  assert.equal(observability?.targetProvider, "better-stack");
  assert.equal(observability?.decisionState, "selected");

  const storage = capabilities.get("data.object-storage");
  assert.equal(storage?.targetProvider, "aws-s3");
  assert.equal(storage?.decisionState, "selected");
  assert.equal(storage?.nextAction, "configuration-required");
  assert.match(storage?.targetContract ?? "", /il-central-1/);
  assert.match(storage?.cutoverBlocker ?? "", /only the R2 adapter/i);
  assert.match(storage?.cutoverBlocker ?? "", /No .*configured/i);
});

test("keeps the intake and registries deterministic", () => {
  for (const source of [
    intake,
    readFileSync(
      new URL("../shared/domain/hostingMigrationRegistry.ts", import.meta.url),
      "utf8",
    ),
    readFileSync(
      new URL("../shared/domain/productionDecisionRegistry.ts", import.meta.url),
      "utf8",
    ),
  ]) {
    assert.doesNotMatch(source, /Math\.random|crypto\.randomUUID/);
  }
});
