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
const knownAdvisoryUrl =
  "https://github.com/advisories/GHSA-67mh-4wv8-2f99";

const acceptedRiskFingerprint = Object.freeze({
  counts: {
    info: 0,
    low: 0,
    moderate: 4,
    high: 0,
    critical: 0,
    total: 4,
  },
  vulnerabilities: [
    {
      packageName: "@esbuild-kit/core-utils",
      severity: "moderate",
      isDirect: false,
      via: ["esbuild"],
      effects: ["@esbuild-kit/esm-loader"],
      range: "*",
      nodes: ["node_modules/@esbuild-kit/core-utils"],
      fixAvailable: {
        name: "drizzle-kit",
        version: "0.18.1",
        isSemVerMajor: true,
      },
    },
    {
      packageName: "@esbuild-kit/esm-loader",
      severity: "moderate",
      isDirect: false,
      via: ["@esbuild-kit/core-utils"],
      effects: ["drizzle-kit"],
      range: "*",
      nodes: ["node_modules/@esbuild-kit/esm-loader"],
      fixAvailable: {
        name: "drizzle-kit",
        version: "0.18.1",
        isSemVerMajor: true,
      },
    },
    {
      packageName: "drizzle-kit",
      severity: "moderate",
      isDirect: true,
      via: ["@esbuild-kit/esm-loader"],
      effects: [],
      range: "0.19.0 - 1.0.0-beta.1-fd8bfcc",
      nodes: ["node_modules/drizzle-kit"],
      fixAvailable: {
        name: "drizzle-kit",
        version: "0.18.1",
        isSemVerMajor: true,
      },
    },
    {
      packageName: "esbuild",
      severity: "moderate",
      isDirect: false,
      via: [
        {
          source: 1102341,
          name: "esbuild",
          dependency: "esbuild",
          url: knownAdvisoryUrl,
          severity: "moderate",
          range: "<=0.24.2",
        },
      ],
      effects: ["@esbuild-kit/core-utils"],
      range: "<=0.24.2",
      nodes: [
        "node_modules/@esbuild-kit/core-utils/node_modules/esbuild",
      ],
      fixAvailable: {
        name: "drizzle-kit",
        version: "0.18.1",
        isSemVerMajor: true,
      },
    },
  ],
});

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

function assertLockfileBoundary(packageLock) {
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
  const vulnerableEsbuild =
    packageLock.packages[
      "node_modules/@esbuild-kit/core-utils/node_modules/esbuild"
    ];

  if (
    !isRecord(rootPackage) ||
    !isRecord(rootPackage.devDependencies) ||
    rootPackage.devDependencies["drizzle-kit"] !==
      "0.31.10" ||
    !isRecord(drizzleKit) ||
    drizzleKit.version !== "0.31.10" ||
    !isRecord(vulnerableEsbuild) ||
    vulnerableEsbuild.version !== "0.18.20" ||
    vulnerableEsbuild.dev !== true
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
) {
  assertLockfileBoundary(packageLock);
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
    JSON.stringify(fingerprint) ===
    JSON.stringify(cleanFingerprint)
  ) {
    return {
      status: "clean",
      vulnerabilityCount: 0,
      advisory: null,
    };
  }

  if (
    JSON.stringify(fingerprint) !==
    JSON.stringify(acceptedRiskFingerprint)
  ) {
    fail();
  }

  return {
    status: "accepted-risk",
    vulnerabilityCount: 4,
    advisory: "GHSA-67mh-4wv8-2f99",
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

  const [report, rawPackageLock] =
    await Promise.all([
      Promise.resolve(
        runDevelopmentDependencyAudit(),
      ),
      readFile(packageLockPath, "utf8"),
    ]);
  const packageLock = JSON.parse(
    rawPackageLock,
  );
  const result =
    inspectDevelopmentDependencyAudit(
      report,
      packageLock,
    );

  console.log(
    result.status === "clean"
      ? "Development dependency audit: PASS (0 vulnerabilities)"
      : `Development dependency audit: ACCEPTED RISK (${result.advisory}, ${result.vulnerabilityCount} transitive findings, development only)`,
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
