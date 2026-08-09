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
  buildDependencyAuditEvidence,
} from "../server/operations/dependencyAuditEvidence.ts";
import {
  createCurrentReleaseManifest,
} from "./create-release-manifest.mjs";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const outputPath = join(
  projectRoot,
  ".artifacts",
  "dependency-audit-evidence.json",
);
const maximumAuditOutputBytes = 2_097_152;
const officialRegistryArgument =
  "--registry=https://registry.npmjs.org/";

export function parseDependencyAuditOutput(
  rawValue,
) {
  if (
    typeof rawValue !== "string" ||
    rawValue.length === 0 ||
    rawValue.length > maximumAuditOutputBytes
  ) {
    throw new Error(
      "DEPENDENCY_AUDIT_OUTPUT_INVALID",
    );
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    throw new Error(
      "DEPENDENCY_AUDIT_OUTPUT_INVALID",
    );
  }
}

export function runProductionDependencyAudit(
  runCommand = spawnSync,
) {
  const result = runCommand(
    "npm",
    [
      "audit",
      "--omit=dev",
      "--json",
      officialRegistryArgument,
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 60_000,
      maxBuffer: maximumAuditOutputBytes,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (
    !result ||
    result.error ||
    result.signal !== null ||
    ![0, 1].includes(result.status) ||
    typeof result.stdout !== "string"
  ) {
    throw new Error(
      "DEPENDENCY_AUDIT_EXECUTION_FAILED",
    );
  }

  return parseDependencyAuditOutput(
    result.stdout,
  );
}

async function runCli() {
  if (process.argv.length !== 2) {
    throw new Error(
      "DEPENDENCY_AUDIT_ARGUMENTS_INVALID",
    );
  }

  const [auditReport, releaseManifest] =
    await Promise.all([
      Promise.resolve(
        runProductionDependencyAudit(),
      ),
      createCurrentReleaseManifest(),
    ]);
  const evidence =
    buildDependencyAuditEvidence(
      auditReport,
      releaseManifest,
    );

  await mkdir(dirname(outputPath), {
    recursive: true,
  });
  await writeFile(
    outputPath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "w",
      mode: 0o644,
    },
  );

  if (evidence.vulnerabilities.total > 0) {
    throw new Error(
      "DEPENDENCY_VULNERABILITIES_FOUND",
    );
  }

  console.log(
    `Dependency audit evidence: PASS (${evidence.evidenceDigest}, ${evidence.productionDependencyCount} production dependencies)`,
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
      /^[A-Z][A-Z0-9_]+$/.test(
        error.message,
      )
        ? error.message
        : "DEPENDENCY_AUDIT_EVIDENCE_FAILED";

    console.error(
      `Dependency audit evidence: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
