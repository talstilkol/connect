import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
    stdout: [
      "Release gate: PASS (tests-and-build)",
      "Production readiness v2: BLOCKED",
      "Source: NONE (disabled)",
      "Code: PRODUCTION_READINESS_V2_SOURCE_REQUIRED",
      "",
    ].join("\n"),
    stderr: [
      "Release gate: FAIL (production-infrastructure-readiness-v2)",
      "",
    ].join("\n"),
  };
}

function expectedDependencyFailure() {
  return {
    status: 1,
    signal: null,
    stdout: "",
    stderr: "Dependency audit evidence attestation: FAIL (DEPENDENCY_AUDIT_ATTESTATION_ARGUMENTS_INVALID)\n",
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
      dependencyAttestationProbeResult: expectedDependencyFailure(),
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
      "dependency-attestation-fail-closed",
    ],
  );
  assert.equal(
    report.checks.at(-2).observedBlockerCode,
    "PRODUCTION_READINESS_V2_SOURCE_REQUIRED",
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

test("the isolated probe blocks the real readiness CLI before opening a configured source", () => {
  const inherited = {
    PATH: process.env.PATH,
    PRODUCTION_READINESS_V2_SOURCE: "postgresql",
    APP_RELEASE_ID: "configured",
    APP_DEPLOYED_COMMIT_SHA: "configured",
    PRODUCTION_READINESS_V2_RAILWAY_API_ARTIFACT_DIGEST: "configured",
    PRODUCTION_READINESS_V2_RAILWAY_WORKER_ARTIFACT_DIGEST: "configured",
    PRODUCTION_READINESS_V2_VERCEL_WEB_ARTIFACT_DIGEST: "configured",
  };
  const isolated = createFailClosedProbeEnvironment(inherited);
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL("../scripts/verify-production-readiness.mjs", import.meta.url)),
    "--v2",
  ], { env: isolated, encoding: "utf8", timeout: 15_000 });

  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, [
    "Production readiness v2: BLOCKED",
    "Source: NONE (disabled)",
    "Code: PRODUCTION_READINESS_V2_SOURCE_REQUIRED",
    "",
  ].join("\n"));
  for (const key of Object.keys(inherited).filter((key) => key !== "PATH")) {
    assert.equal(Object.hasOwn(isolated, key), false);
    assert.equal(typeof inherited[key], "string");
  }
});

test("rejects an unexpected production pass or unrelated production failure", async () => {
  const releaseManifest =
    await readCommittedReleaseManifest();
  const base = {
    releaseManifest,
    requiredStepResults:
      passedRequiredSteps(),
    dependencyAttestationProbeResult: expectedDependencyFailure(),
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

test("the isolated dependency attestation CLI fails before reading evidence or contacting GitHub", async () => {
  const isolated = createFailClosedProbeEnvironment({
    PATH: process.env.PATH,
    DEPENDENCY_AUDIT_ATTESTATION_REPOSITORY: "configured",
    DEPENDENCY_AUDIT_EVIDENCE_JSON: "configured",
  });
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL("../scripts/verify-dependency-audit-evidence-attestation.mjs", import.meta.url)),
  ], { env: isolated, encoding: "utf8", timeout: 15_000 });
  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, expectedDependencyFailure().stderr);
  const report = buildLocalReleaseRehearsalReport({
    releaseManifest: await readCommittedReleaseManifest(),
    requiredStepResults: passedRequiredSteps(),
    productionGateResult: expectedProductionFailure(),
    dependencyAttestationProbeResult: result,
  });
  assert.equal(report.productionReady, false);
});

test("requires both exact blockers and rejects partial, successful or interrupted probes", async () => {
  const base = {
    releaseManifest: await readCommittedReleaseManifest(),
    requiredStepResults: passedRequiredSteps(),
    productionGateResult: expectedProductionFailure(),
    dependencyAttestationProbeResult: expectedDependencyFailure(),
  };
  for (const productionGateResult of [
    { ...expectedProductionFailure(), stdout: "" },
    { ...expectedProductionFailure(), stdout: expectedProductionFailure().stdout.replace("Code:", "Embedded Code:") },
    { ...expectedProductionFailure(), stdout: `${expectedProductionFailure().stdout}Release gate: PRODUCTION PASS\n` },
    { ...expectedProductionFailure(), status: null, signal: "SIGTERM" },
  ]) {
    assert.throws(() => buildLocalReleaseRehearsalReport({ ...base, productionGateResult }),
      /LOCAL_REHEARSAL_PRODUCTION_GATE_UNEXPECTED_FAILURE/);
  }
  for (const dependencyAttestationProbeResult of [
    undefined,
    { ...expectedDependencyFailure(), status: 0 },
    { ...expectedDependencyFailure(), status: null, signal: "SIGTERM" },
    { ...expectedDependencyFailure(), stderr: "An unrelated failure\n" },
    { ...expectedDependencyFailure(), stderr: `Embedded ${expectedDependencyFailure().stderr}` },
    { ...expectedDependencyFailure(), stdout: "Dependency audit evidence attestation: PASS (unexpected)\n" },
  ]) {
    assert.throws(() => buildLocalReleaseRehearsalReport({ ...base, dependencyAttestationProbeResult }),
      /LOCAL_REHEARSAL_DEPENDENCY_PROBE_(?:RESULT_INVALID|UNEXPECTED_PASS|UNEXPECTED_FAILURE)/);
  }
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
