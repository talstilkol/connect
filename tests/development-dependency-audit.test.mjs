import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

import {
  inspectDevelopmentDependencyAudit,
  parseDevelopmentDependencyAuditOutput,
  runDevelopmentDependencyAudit,
} from "../scripts/verify-development-dependency-audit.mjs";

const advisoryUrl =
  "https://github.com/advisories/GHSA-67mh-4wv8-2f99";

function currentPackageLock() {
  return {
    packages: {
      "": {
        devDependencies: {
          "drizzle-kit": "0.31.10",
        },
      },
      "node_modules/drizzle-kit": {
        version: "0.31.10",
        dev: true,
      },
      "node_modules/@esbuild-kit/core-utils/node_modules/esbuild": {
        version: "0.25.12",
        dev: true,
      },
    },
  };
}

function currentPackageJson() {
  return {
    overrides: {
      "@esbuild-kit/core-utils": {
        esbuild: "0.25.12",
      },
    },
  };
}

function currentAcceptedAuditReport() {
  const fixAvailable = {
    name: "drizzle-kit",
    version: "0.18.1",
    isSemVerMajor: true,
  };

  return {
    auditReportVersion: 2,
    vulnerabilities: {
      "@esbuild-kit/core-utils": {
        name: "@esbuild-kit/core-utils",
        severity: "moderate",
        isDirect: false,
        via: ["esbuild"],
        effects: ["@esbuild-kit/esm-loader"],
        range: "*",
        nodes: [
          "node_modules/@esbuild-kit/core-utils",
        ],
        fixAvailable,
      },
      "@esbuild-kit/esm-loader": {
        name: "@esbuild-kit/esm-loader",
        severity: "moderate",
        isDirect: false,
        via: ["@esbuild-kit/core-utils"],
        effects: ["drizzle-kit"],
        range: "*",
        nodes: [
          "node_modules/@esbuild-kit/esm-loader",
        ],
        fixAvailable,
      },
      "drizzle-kit": {
        name: "drizzle-kit",
        severity: "moderate",
        isDirect: true,
        via: ["@esbuild-kit/esm-loader"],
        effects: [],
        range:
          "0.19.0 - 1.0.0-beta.1-fd8bfcc",
        nodes: ["node_modules/drizzle-kit"],
        fixAvailable,
      },
      esbuild: {
        name: "esbuild",
        severity: "moderate",
        isDirect: false,
        via: [
          {
            source: 1102341,
            name: "esbuild",
            dependency: "esbuild",
            title:
              "esbuild enables any website to send any requests to the development server and read the response",
            url: advisoryUrl,
            severity: "moderate",
            cwe: ["CWE-346"],
            cvss: {
              score: 5.3,
              vectorString:
                "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N",
            },
            range: "<=0.24.2",
          },
        ],
        effects: ["@esbuild-kit/core-utils"],
        range: "<=0.24.2",
        nodes: [
          "node_modules/@esbuild-kit/core-utils/node_modules/esbuild",
        ],
        fixAvailable,
      },
    },
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 4,
        high: 0,
        critical: 0,
        total: 4,
      },
      dependencies: {
        prod: 38,
        dev: 652,
        optional: 222,
        peer: 44,
        peerOptional: 0,
        total: 727,
      },
    },
  };
}

function cleanAuditReport() {
  return {
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        total: 0,
      },
      dependencies: {
        prod: 38,
        dev: 652,
        optional: 222,
        peer: 44,
        peerOptional: 0,
        total: 727,
      },
    },
  };
}

function expectsUnapproved() {
  return {
    message:
      "DEVELOPMENT_DEPENDENCY_AUDIT_UNAPPROVED",
  };
}

test("accepts a clean audit with the exact reviewed esbuild override", () => {
  assert.deepEqual(
    inspectDevelopmentDependencyAudit(
      cleanAuditReport(),
      currentPackageLock(),
      currentPackageJson(),
    ),
    {
      status: "clean",
      vulnerabilityCount: 0,
      advisory: null,
    },
  );
});

test("rejects the previously accepted Drizzle esbuild advisory chain", () => {
  assert.throws(
    () =>
      inspectDevelopmentDependencyAudit(
        currentAcceptedAuditReport(),
        currentPackageLock(),
        currentPackageJson(),
      ),
    expectsUnapproved(),
  );
});

test("rejects a duplicate advisory or a severity increase", () => {
  const newAdvisory =
    currentAcceptedAuditReport();
  newAdvisory.vulnerabilities.esbuild.via.push({
    ...newAdvisory.vulnerabilities.esbuild.via[0],
    severity: "high",
  });
  newAdvisory.vulnerabilities.esbuild.severity =
    "high";
  newAdvisory.metadata.vulnerabilities.moderate =
    3;
  newAdvisory.metadata.vulnerabilities.high = 1;

  assert.throws(
    () =>
      inspectDevelopmentDependencyAudit(
        newAdvisory,
        currentPackageLock(),
        currentPackageJson(),
      ),
    expectsUnapproved(),
  );
});

test("rejects a reintroduced image-size package before audit evaluation", () => {
  const packageLock = currentPackageLock();
  packageLock.packages[
    "node_modules/image-size"
  ] = {
    version: "2.0.2",
    dev: true,
  };

  assert.throws(
    () =>
      inspectDevelopmentDependencyAudit(
        currentAcceptedAuditReport(),
        packageLock,
        currentPackageJson(),
      ),
    expectsUnapproved(),
  );
});

test("rejects a missing override or unreviewed nested esbuild version", () => {
  const packageLock = currentPackageLock();
  packageLock.packages[
    "node_modules/@esbuild-kit/core-utils/node_modules/esbuild"
  ].version = "0.25.11";

  assert.throws(
    () =>
      inspectDevelopmentDependencyAudit(
        cleanAuditReport(),
        packageLock,
        currentPackageJson(),
      ),
    expectsUnapproved(),
  );

  const packageJson = currentPackageJson();
  delete packageJson.overrides;

  assert.throws(
    () =>
      inspectDevelopmentDependencyAudit(
        cleanAuditReport(),
        currentPackageLock(),
        packageJson,
      ),
    expectsUnapproved(),
  );
});

test("runs a full development audit only against the official registry", () => {
  let invocation;
  const report = currentAcceptedAuditReport();
  const result = runDevelopmentDependencyAudit(
    (command, args, options) => {
      invocation = {
        command,
        args,
        options,
      };

      return {
        status: 1,
        signal: null,
        stdout: JSON.stringify(report),
      };
    },
  );

  assert.deepEqual(result, report);
  assert.equal(invocation.command, "npm");
  assert.deepEqual(invocation.args, [
    "audit",
    "--include=dev",
    "--json",
    "--registry=https://registry.npmjs.org/",
  ]);
  assert.equal(invocation.options.stdio[0], "ignore");
  assert.throws(
    () =>
      parseDevelopmentDependencyAuditOutput(
        "not-json",
      ),
    {
      message:
        "DEVELOPMENT_DEPENDENCY_AUDIT_OUTPUT_INVALID",
    },
  );
});

test("runs the development audit before production evidence in GitHub CI", async () => {
  const workflow = await readFile(
    new URL(
      "../.github/workflows/dependency-audit-evidence.yml",
      import.meta.url,
    ),
    "utf8",
  );
  const developmentGate = workflow.indexOf(
    "npm run verify:dependency-audit:development",
  );
  const productionEvidence = workflow.indexOf(
    "npm run evidence:dependency-audit",
  );

  assert.notEqual(developmentGate, -1);
  assert.notEqual(productionEvidence, -1);
  assert.equal(
    developmentGate < productionEvidence,
    true,
  );
  assert.doesNotMatch(
    workflow,
    /npm audit fix|npm audit --force/,
  );
});
