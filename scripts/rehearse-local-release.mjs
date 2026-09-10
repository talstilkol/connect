import {
  spawnSync,
} from "node:child_process";
import {
  mkdir,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const outputPath = join(
  projectRoot,
  ".artifacts",
  "local-release-rehearsal.json",
);
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const gitObjectPattern = /^[a-f0-9]{40}$/;
const maximumCapturedOutputBytes =
  64 * 1024 * 1024;
const expectedProductionBlockerCode =
  "DEPENDENCY_AUDIT_ATTESTATION_ARGUMENTS_INVALID";
const expectedProductionFailureLines =
  Object.freeze([
    "Release gate: PASS (tests-and-build)",
    `Dependency audit evidence attestation: FAIL (${expectedProductionBlockerCode})`,
    "Release gate: FAIL (dependency-audit-attestation)",
  ]);
const requiredSteps = Object.freeze([
  Object.freeze({
    id: "local-release-gate",
    command: process.execPath,
    arguments: Object.freeze([
      "scripts/verify-release-gate.mjs",
      "--local",
    ]),
  }),
  Object.freeze({
    id: "release-manifest",
    command: process.execPath,
    arguments: Object.freeze([
      "scripts/create-release-manifest.mjs",
    ]),
  }),
  Object.freeze({
    id: "release-changelog",
    command: process.execPath,
    arguments: Object.freeze([
      "scripts/create-change-log.mjs",
    ]),
  }),
  Object.freeze({
    id: "release-artifacts",
    command: process.execPath,
    arguments: Object.freeze([
      "scripts/verify-release-artifacts.mjs",
    ]),
  }),
]);
const productionEvidenceEnvironmentKeys =
  Object.freeze([
    "DEPENDENCY_AUDIT_ATTESTATION_REPOSITORY",
    "DEPENDENCY_AUDIT_EVIDENCE_JSON",
    "TEAM_INVITATION_BROWSER_ATTESTATION_REPOSITORY",
    "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON",
  ]);

export const localReleaseRehearsalRequiredStepIds =
  Object.freeze(
    requiredSteps.map((step) => step.id),
  );

function hasReleaseIdentity(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    value.schemaVersion === 1 &&
    typeof value.releaseId === "string" &&
    releaseIdPattern.test(value.releaseId) &&
    typeof value.commitSha === "string" &&
    gitObjectPattern.test(value.commitSha) &&
    typeof value.treeSha === "string" &&
    gitObjectPattern.test(value.treeSha) &&
    typeof value.packageLockSha256 === "string" &&
    /^[a-f0-9]{64}$/.test(
      value.packageLockSha256,
    ) &&
    typeof value.migrationSetSha256 === "string" &&
    /^[a-f0-9]{64}$/.test(
      value.migrationSetSha256,
    ) &&
    Array.isArray(value.migrations) &&
    value.migrations.length > 0
  );
}

function hasSuccessfulRequiredSteps(results) {
  return (
    Array.isArray(results) &&
    results.length === requiredSteps.length &&
    results.every(
      (result, index) =>
        typeof result === "object" &&
        result !== null &&
        !Array.isArray(result) &&
        result.id === requiredSteps[index].id &&
        result.status === 0 &&
        result.signal === null,
    )
  );
}

function requireExpectedProductionFailure(result) {
  if (
    typeof result !== "object" ||
    result === null ||
    Array.isArray(result) ||
    typeof result.stdout !== "string" ||
    typeof result.stderr !== "string" ||
    Buffer.byteLength(
      result.stdout,
      "utf8",
    ) > maximumCapturedOutputBytes ||
    Buffer.byteLength(
      result.stderr,
      "utf8",
    ) > maximumCapturedOutputBytes
  ) {
    throw new Error(
      "LOCAL_REHEARSAL_PRODUCTION_GATE_RESULT_INVALID",
    );
  }

  if (
    result.status === 0 &&
    result.signal === null
  ) {
    throw new Error(
      "LOCAL_REHEARSAL_PRODUCTION_GATE_UNEXPECTED_PASS",
    );
  }

  const output =
    `${result.stdout}\n${result.stderr}`;

  if (
    result.status !== 1 ||
    result.signal !== null ||
    output.includes(
      "Release gate: PRODUCTION PASS",
    ) ||
    expectedProductionFailureLines.some(
      (line) => !output.includes(line),
    )
  ) {
    throw new Error(
      "LOCAL_REHEARSAL_PRODUCTION_GATE_UNEXPECTED_FAILURE",
    );
  }
}

export function createFailClosedProbeEnvironment(
  environment,
) {
  if (
    typeof environment !== "object" ||
    environment === null ||
    Array.isArray(environment)
  ) {
    throw new Error(
      "LOCAL_REHEARSAL_ENVIRONMENT_INVALID",
    );
  }

  const isolatedEnvironment = {
    ...environment,
  };

  for (const key of
    productionEvidenceEnvironmentKeys) {
    delete isolatedEnvironment[key];
  }

  return isolatedEnvironment;
}

export function buildLocalReleaseRehearsalReport({
  releaseManifest,
  requiredStepResults,
  productionGateResult,
}) {
  if (!hasReleaseIdentity(releaseManifest)) {
    throw new Error(
      "LOCAL_REHEARSAL_RELEASE_MANIFEST_INVALID",
    );
  }

  if (
    !hasSuccessfulRequiredSteps(
      requiredStepResults,
    )
  ) {
    throw new Error(
      "LOCAL_REHEARSAL_REQUIRED_STEP_FAILED",
    );
  }

  requireExpectedProductionFailure(
    productionGateResult,
  );

  return Object.freeze({
    schemaVersion: 1,
    kind: "local-release-rehearsal",
    authority: "local-only",
    releaseId: releaseManifest.releaseId,
    commitSha: releaseManifest.commitSha,
    treeSha: releaseManifest.treeSha,
    packageLockSha256:
      releaseManifest.packageLockSha256,
    migrationSetSha256:
      releaseManifest.migrationSetSha256,
    migrationCount:
      releaseManifest.migrations.length,
    checks: Object.freeze([
      ...requiredSteps.map((step) =>
        Object.freeze({
          id: step.id,
          status: "passed",
        }),
      ),
      Object.freeze({
        id: "production-fail-closed",
        status: "passed",
        observedBlockerCode:
          expectedProductionBlockerCode,
      }),
    ]),
    productionReady: false,
  });
}

function runRequiredStep(step) {
  console.log(
    `Local release rehearsal: RUN (${step.id})`,
  );

  return spawnSync(
    step.command,
    step.arguments,
    {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    },
  );
}

function runProductionFailClosedProbe() {
  return spawnSync(
    process.execPath,
    ["scripts/verify-release-gate.mjs"],
    {
      cwd: projectRoot,
      env: createFailClosedProbeEnvironment(
        process.env,
      ),
      encoding: "utf8",
      maxBuffer: maximumCapturedOutputBytes,
    },
  );
}

async function runCli() {
  if (process.argv.length !== 2) {
    throw new Error(
      "LOCAL_REHEARSAL_ARGUMENTS_INVALID",
    );
  }

  const releaseManifest =
    await createCurrentReleaseManifest();
  const requiredStepResults = [];

  for (const step of requiredSteps) {
    const result = runRequiredStep(step);

    requiredStepResults.push({
      id: step.id,
      status: result.status,
      signal: result.signal,
    });

    if (
      result.status !== 0 ||
      result.signal !== null
    ) {
      throw new Error(
        "LOCAL_REHEARSAL_REQUIRED_STEP_FAILED",
      );
    }
  }

  console.log(
    "Local release rehearsal: RUN (production-fail-closed)",
  );
  const report =
    buildLocalReleaseRehearsalReport({
      releaseManifest,
      requiredStepResults,
      productionGateResult:
        runProductionFailClosedProbe(),
    });

  await mkdir(dirname(outputPath), {
    recursive: true,
  });
  await writeFile(
    outputPath,
    `${JSON.stringify(report, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "w",
    },
  );

  console.log(
    `Local release rehearsal: PASS (${report.releaseId}, production remains blocked)`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(`file://${process.argv[1]}`),
    )
) {
  try {
    await runCli();
  } catch (error) {
    const code =
      error instanceof Error &&
      /^[A-Z][A-Z0-9_]+$/.test(error.message)
        ? error.message
        : "LOCAL_REHEARSAL_FAILED";

    console.error(
      `Local release rehearsal: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
