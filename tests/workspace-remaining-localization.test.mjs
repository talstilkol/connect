import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  readOperationalReportMessages,
} from "../features/reports/operationalReportMessages.ts";
import {
  readTeamDirectoryMessages,
} from "../features/team/teamDirectoryMessages.ts";
import {
  readWorkspaceRemainingMessages,
} from "../features/workspace/workspaceRemainingMessages.ts";
import {
  PRODUCTION_DECISION_REGISTRY,
} from "../shared/domain/productionDecisionRegistry.ts";
import {
  rolePermissions,
} from "../shared/domain/model.ts";

const projectRoot = new URL("../", import.meta.url);

async function readSource(relativePath) {
  return readFile(
    new URL(relativePath, projectRoot),
    "utf8",
  );
}

test("localizes reports, billing, team, and every production decision", () => {
  const decisionIds = PRODUCTION_DECISION_REGISTRY.map(
    (decision) => decision.checkId,
  ).sort();
  const permissionIds = [
    ...new Set(Object.values(rolePermissions).flat()),
  ].sort();

  for (const language of ["he", "en", "ar"]) {
    const reports =
      readOperationalReportMessages(language);
    const team = readTeamDirectoryMessages(language);
    const remaining =
      readWorkspaceRemainingMessages(language);

    assert.ok(reports.page.title.trim().length > 0);
    assert.match(reports.generatedAt("12:30"), /12:30/);
    assert.match(team.activeCount(3), /3/);
    assert.match(team.permissionCount(4), /4/);
    assert.deepEqual(
      Object.keys(team.permissions).sort(),
      permissionIds,
    );
    assert.deepEqual(
      Object.keys(remaining.decisions.content).sort(),
      decisionIds,
    );
    assert.match(
      remaining.decisions.progress(2, 11),
      /2[\s\S]*11/,
    );
    assert.equal(remaining.billing.steps.length, 4);

    for (const content of Object.values(
      remaining.decisions.content,
    )) {
      assert.ok(content.title.trim().length > 0);
      assert.ok(content.detail.trim().length > 0);
      assert.ok(content.owner.trim().length > 0);
    }
  }

  assert.equal(
    readOperationalReportMessages("en").page.title,
    "Reports",
  );
  assert.equal(
    readTeamDirectoryMessages("ar").title,
    "الفريق والصلاحيات",
  );
});

test("passes language through the remaining workspace surfaces", async () => {
  const source = await readSource(
    "features/workspace/WorkspaceSectionContent.tsx",
  );

  assert.match(source, /const OperationalReports = lazy/);
  assert.match(
    source,
    /<Reports[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(source, /<Billing language=\{language\}/);
  assert.match(
    source,
    /<TeamDirectory[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(
    source,
    /<DecisionCenter[\s\S]{0,120}language=\{language\}/,
  );
  assert.match(
    source,
    /<OperationalReports[\s\S]{0,120}language=\{language\}/,
  );
});

test("keeps localized workspace components free of embedded Hebrew UI", async () => {
  const sources = await Promise.all(
    [
      "features/reports/OperationalReports.tsx",
      "features/team/TeamDirectory.tsx",
      "features/workspace/DecisionCenter.tsx",
      "features/workspace/WorkspaceSectionContent.tsx",
    ].map(readSource),
  );

  for (const source of sources) {
    assert.doesNotMatch(source, /[\u0590-\u05ff]/);
  }
});
