import {
  spawnSync,
} from "node:child_process";
import {
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const packageLockPath = join(
  projectRoot,
  "package-lock.json",
);
const maximumAuditOutputBytes = 2_097_152;
const officialRegistryArgument =
  "--registry=https://registry.npmjs.org/";
const patchedEsbuildVersion = "0.25.12";

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function fail() {
  throw new Error(
    "DEVELOPMENT_DEPENDENCY_AUDIT_UNAPPROVED",
  );
}

function normalizeVia(value) {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    fail();
  }

  return {
    source: value.source,
    name: value.name,
    dependency: value.dependency,
    url: value.url,
    severity: value.severity,
    range: value.range,
  };
}

function normalizeFixAvailable(value) {
  if (!isRecord(value)) {
    fail();
  }

  return {
    name: value.name,
    version: value.version,
    isSemVerMajor: value.isSemVerMajor,
  };
}

function buildAuditFingerprint(report) {
  if (
    !isRecord(report) ||
    report.auditReportVersion !== 2 ||
    !isRecord(report.vulnerabilities) ||
    !isRecord(report.metadata) ||
    !isRecord(report.metadata.vulnerabilities)
  ) {
    fail();
  }

  const counts = {
    info: report.metadata.vulnerabilities.info,
    low: report.metadata.vulnerabilities.low,
    moderate: report.metadata.vulnerabilities.moderate,
    high: report.metadata.vulnerabilities.high,
    critical: report.metadata.vulnerabilities.critical,
    total: report.metadata.vulnerabilities.total,
  };
  const vulnerabilities = Object.entries(
    report.vulnerabilities,
  )
    .map(([packageName, vulnerability]) => {
      if (
        !isRecord(vulnerability) ||
        !Array.isArray(vulnerability.via) ||
        !Array.isArray(vulnerability.effects) ||
        !Array.isArray(vulnerability.nodes)
      ) {
        fail();
      }

      return {
        packageName,
        severity: vulnerability.severity,
        isDirect: vulnerability.isDirect,
        via: vulnerability.via.map(
          normalizeVia,
        ),
        effects: [...vulnerability.effects],
        range: vulnerability.range,
        nodes: [...vulnerability.nodes],
        fixAvailable: normalizeFixAvailable(
          vulnerability.fixAvailable,
        ),
      };
    })
    .sort((left, right) =>
      left.packageName.localeCompare(
        right.packageName,
      ),
    );

  return {
    counts,
    vulnerabilities,
  };
}

function assertLockfileBoundary(
  packageLock,
  packageJson,
) {
  if (
    !isRecord(packageLock) ||
    !isRecord(packageLock.packages) ||
    packageLock.packages[
      "node_modules/image-size"
    ] !== undefined
  ) {
    fail();
  }

  const rootPackage = packageLock.packages[""];
  const drizzleKit = packageLock.packages[
    "node_modules/drizzle-kit"
  ];
  const patchedEsbuild =
    packageLock.packages[
      "node_modules/@esbuild-kit/core-utils/node_modules/esbuild"
    ];
  const expectedOverrides = {
    "@esbuild-kit/core-utils": {
      esbuild: patchedEsbuildVersion,
    },
  };

  if (
    !isRecord(packageJson) ||
    JSON.stringify(packageJson.overrides) !==
      JSON.stringify(expectedOverrides) ||
    !isRecord(rootPackage) ||
    !isRecord(rootPackage.devDependencies) ||
    rootPackage.devDependencies["drizzle-kit"] !==
      "0.31.10" ||
    !isRecord(drizzleKit) ||
    drizzleKit.version !== "0.31.10" ||
    !isRecord(patchedEsbuild) ||
    patchedEsbuild.version !==
      patchedEsbuildVersion ||
    patchedEsbuild.dev !== true
  ) {
    fail();
  }
}

export function parseDevelopmentDependencyAuditOutput(
  rawValue,
) {
  if (
    typeof rawValue !== "string" ||
    rawValue.length === 0 ||
    rawValue.length > maximumAuditOutputBytes
  ) {
    throw new Error(
      "DEVELOPMENT_DEPENDENCY_AUDIT_OUTPUT_INVALID",
    );
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    throw new Error(
      "DEVELOPMENT_DEPENDENCY_AUDIT_OUTPUT_INVALID",
    );
  }
}

export function inspectDevelopmentDependencyAudit(
  report,
  packageLock,
  packageJson,
) {
  assertLockfileBoundary(
    packageLock,
    packageJson,
  );
  const fingerprint = buildAuditFingerprint(
    report,
  );
  const cleanFingerprint = {
    counts: {
      info: 0,
      low: 0,
      moderate: 0,
      high: 0,
      critical: 0,
      total: 0,
    },
    vulnerabilities: [],
  };

  if (
    JSON.stringify(fingerprint) !==
    JSON.stringify(cleanFingerprint)
  ) {
    fail();
  }

  return {
    status: "clean",
    vulnerabilityCount: 0,
    advisory: null,
  };
}

export function runDevelopmentDependencyAudit(
  runCommand = spawnSync,
) {
  const result = runCommand(
    "npm",
    [
      "audit",
      "--include=dev",
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
      "DEVELOPMENT_DEPENDENCY_AUDIT_EXECUTION_FAILED",
    );
  }

  return parseDevelopmentDependencyAuditOutput(
    result.stdout,
  );
}

async function runCli() {
  if (process.argv.length !== 2) {
    throw new Error(
      "DEVELOPMENT_DEPENDENCY_AUDIT_ARGUMENTS_INVALID",
    );
  }

  const [
    report,
    rawPackageLock,
    rawPackageJson,
  ] =
    await Promise.all([
      Promise.resolve(
        runDevelopmentDependencyAudit(),
      ),
      readFile(packageLockPath, "utf8"),
      readFile(
        join(projectRoot, "package.json"),
        "utf8",
      ),
    ]);
  const packageLock = JSON.parse(
    rawPackageLock,
  );
  const packageJson = JSON.parse(
    rawPackageJson,
  );
  inspectDevelopmentDependencyAudit(
    report,
    packageLock,
    packageJson,
  );

  console.log(
    "Development dependency audit: PASS (0 vulnerabilities)",
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
        : "DEVELOPMENT_DEPENDENCY_AUDIT_FAILED";

    console.error(
      `Development dependency audit: FAIL (${code})`,
    );
    process.exitCode = 1;
  }
}
