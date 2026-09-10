import assert from "node:assert/strict";
import test from "node:test";

import {
  readFile,
} from "node:fs/promises";

import {
  readCommittedReleaseManifest,
} from "../scripts/create-release-manifest.mjs";
import {
  buildLocalReleaseRehearsalReport,
  createFailClosedProbeEnvironment,
  localReleaseRehearsalRequiredStepIds,
} from "../scripts/rehearse-local-release.mjs";

function passedRequiredSteps() {
  return localReleaseRehearsalRequiredStepIds.map(
    (id) => ({
      id,
      status: 0,
      signal: null,
    }),
  );
}

function expectedProductionFailure() {
  return {
    status: 1,
    signal: null,
    stdout:
      "Release gate: PASS (tests-and-build)\n",
    stderr: [
      "Dependency audit evidence attestation: FAIL (DEPENDENCY_AUDIT_ATTESTATION_ARGUMENTS_INVALID)",
      "Release gate: FAIL (dependency-audit-attestation)",
      "",
    ].join("\n"),
  };
}

test("builds release-bound local rehearsal evidence while keeping production blocked", async () => {
  const releaseManifest =
    await readCommittedReleaseManifest();
  const report =
    buildLocalReleaseRehearsalReport({
      releaseManifest,
      requiredStepResults:
        passedRequiredSteps(),
      productionGateResult:
        expectedProductionFailure(),
    });

  assert.equal(report.schemaVersion, 1);
  assert.equal(
    report.authority,
    "local-only",
  );
  assert.equal(
    report.releaseId,
    releaseManifest.releaseId,
  );
  assert.equal(
    report.commitSha,
    releaseManifest.commitSha,
  );
  assert.equal(
    report.migrationCount,
    releaseManifest.migrations.length,
  );
  assert.equal(report.productionReady, false);
  assert.deepEqual(
    report.checks.map((check) => check.id),
    [
      ...localReleaseRehearsalRequiredStepIds,
      "production-fail-closed",
    ],
  );
  assert.equal(
    report.checks.at(-1).observedBlockerCode,
    "DEPENDENCY_AUDIT_ATTESTATION_ARGUMENTS_INVALID",
  );
});

test("removes production evidence authority from the fail-closed probe", () => {
  const environment = {
    PATH: process.env.PATH,
    DEPENDENCY_AUDIT_ATTESTATION_REPOSITORY:
      "configured",
    DEPENDENCY_AUDIT_EVIDENCE_JSON:
      "configured",
    TEAM_INVITATION_BROWSER_ATTESTATION_REPOSITORY:
      "configured",
    TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON:
      "configured",
  };
  const isolated =
    createFailClosedProbeEnvironment(
      environment,
    );

  assert.equal(isolated.PATH, environment.PATH);
  assert.equal(
    Object.hasOwn(
      isolated,
      "DEPENDENCY_AUDIT_ATTESTATION_REPOSITORY",
    ),
    false,
  );
  assert.equal(
    Object.hasOwn(
      isolated,
      "DEPENDENCY_AUDIT_EVIDENCE_JSON",
    ),
    false,
  );
  assert.equal(
    Object.hasOwn(
      isolated,
      "TEAM_INVITATION_BROWSER_ATTESTATION_REPOSITORY",
    ),
    false,
  );
  assert.equal(
    Object.hasOwn(
      isolated,
      "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON",
    ),
    false,
  );
});

test("rejects an unexpected production pass or unrelated production failure", async () => {
  const releaseManifest =
    await readCommittedReleaseManifest();
  const base = {
    releaseManifest,
    requiredStepResults:
      passedRequiredSteps(),
  };

  assert.throws(
    () =>
      buildLocalReleaseRehearsalReport({
        ...base,
        productionGateResult: {
          status: 0,
          signal: null,
          stdout:
            "Release gate: PRODUCTION PASS\n",
          stderr: "",
        },
      }),
    /LOCAL_REHEARSAL_PRODUCTION_GATE_UNEXPECTED_PASS/,
  );
  assert.throws(
    () =>
      buildLocalReleaseRehearsalReport({
        ...base,
        productionGateResult: {
          status: 1,
          signal: null,
          stdout: "",
          stderr:
            "Release gate: FAIL (unrelated)\n",
        },
      }),
    /LOCAL_REHEARSAL_PRODUCTION_GATE_UNEXPECTED_FAILURE/,
  );
});

test("keeps the operator runbook and package command connected to the rehearsal", async () => {
  const [packageText, runbook] =
    await Promise.all([
      readFile(
        new URL("../package.json", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../docs/release-operator-runbook.md",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);
  const packageJson = JSON.parse(packageText);

  assert.equal(
    packageJson.scripts[
      "release:rehearse:local"
    ],
    "node scripts/rehearse-local-release.mjs",
  );
  assert.match(
    runbook,
    /npm run release:rehearse:local/,
  );
  assert.match(
    runbook,
    /local-only/,
  );
  assert.match(
    runbook,
    /DEPENDENCY_AUDIT_ATTESTATION_ARGUMENTS_INVALID/,
  );
});
