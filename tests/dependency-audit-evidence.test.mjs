import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  buildDependencyAuditEvidence,
  deriveDependencyAuditEvidenceDigest,
  inspectDependencyAuditEvidence,
} from "../server/operations/dependencyAuditEvidence.ts";
import {
  parseDependencyAuditOutput,
  runProductionDependencyAudit,
} from "../scripts/create-dependency-audit-evidence.mjs";
import {
  inspectCurrentProductionReadiness,
} from "../server/operations/productionReadiness.ts";

const now = new Date(
  "2026-08-09T12:00:00.000Z",
);
const releaseIdentity = Object.freeze({
  schemaVersion: 1,
  commitSha: "a".repeat(40),
  treeSha: "b".repeat(40),
  packageLockSha256: "c".repeat(64),
  migrationSetSha256: "d".repeat(64),
});
const releaseManifest = Object.freeze({
  ...releaseIdentity,
  releaseId:
    `connect_release_v1_${createHash("sha256")
      .update(JSON.stringify(releaseIdentity))
      .digest("hex")}`,
});

function auditReport({
  vulnerabilities = {},
  counts = {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    total: 0,
  },
} = {}) {
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: counts,
      dependencies: {
        prod: 32,
        dev: 656,
        optional: 222,
        peer: 44,
        peerOptional: 0,
        total: 725,
      },
    },
  };
}

function environment(evidence) {
  return {
    APP_DEPLOYED_COMMIT_SHA:
      releaseManifest.commitSha,
    APP_RELEASE_ID: releaseManifest.releaseId,
    DEPENDENCY_AUDIT_EVIDENCE_JSON:
      JSON.stringify(evidence),
  };
}

test("builds and verifies short-lived zero-vulnerability production evidence", () => {
  const evidence = buildDependencyAuditEvidence(
    auditReport(),
    releaseManifest,
    now,
  );

  assert.equal(evidence.scope, "production");
  assert.equal(
    evidence.registry,
    "https://registry.npmjs.org/",
  );
  assert.equal(
    evidence.packageLockSha256,
    releaseManifest.packageLockSha256,
  );
  assert.ok(Object.isFrozen(evidence));
  assert.deepEqual(
    inspectDependencyAuditEvidence(
      environment(evidence),
      now,
    ),
    {
      status: "configured",
      code:
        "DEPENDENCY_AUDIT_EVIDENCE_VERIFIED",
      auditedDependencyCount: 32,
      vulnerabilityCount: 0,
    },
  );
});

test("keeps reported vulnerabilities visible and blocks readiness", () => {
  const evidence = buildDependencyAuditEvidence(
    auditReport({
      vulnerabilities: {
        dependency: {},
      },
      counts: {
        info: 0,
        low: 0,
        moderate: 1,
        high: 0,
        critical: 0,
        total: 1,
      },
    }),
    releaseManifest,
    now,
  );

  assert.deepEqual(
    inspectDependencyAuditEvidence(
      environment(evidence),
      now,
    ),
    {
      status: "vulnerable",
      code:
        "DEPENDENCY_VULNERABILITIES_FOUND",
      auditedDependencyCount: 0,
      vulnerabilityCount: 1,
    },
  );
});

test("drives the production readiness registry from verified evidence", () => {
  const verifiedAt = new Date(
    Date.now() - 1_000,
  );
  const evidence = buildDependencyAuditEvidence(
    auditReport(),
    releaseManifest,
    verifiedAt,
  );
  const report = inspectCurrentProductionReadiness(
    environment(evidence),
    {
      d1: "DB",
      r2: "FILES",
    },
  );

  assert.deepEqual(
    report.checks.find(
      (check) =>
        check.id === "security.dependency-audit",
    ),
    {
      id: "security.dependency-audit",
      category: "security",
      status: "ready",
      code:
        "DEPENDENCY_AUDIT_EVIDENCE_VERIFIED",
    },
  );
});

test("rejects expired, future, and extended evidence", () => {
  const evidence = buildDependencyAuditEvidence(
    auditReport(),
    releaseManifest,
    now,
  );

  assert.equal(
    inspectDependencyAuditEvidence(
      environment(evidence),
      new Date(evidence.expiresAt),
    ).status,
    "expired",
  );
  assert.equal(
    inspectDependencyAuditEvidence(
      environment(evidence),
      new Date(
        now.getTime() - 1,
      ),
    ).status,
    "invalid",
  );

  const extended = {
    ...evidence,
    expiresAt: new Date(
      Date.parse(evidence.expiresAt) + 1,
    ).toISOString(),
  };
  extended.evidenceDigest =
    deriveDependencyAuditEvidenceDigest(
      extended,
    );

  assert.equal(
    inspectDependencyAuditEvidence(
      environment(extended),
      now,
    ).status,
    "invalid",
  );
});

test("rejects release mismatches, digest changes, and malformed reports", () => {
  const evidence = buildDependencyAuditEvidence(
    auditReport(),
    releaseManifest,
    now,
  );

  assert.equal(
    inspectDependencyAuditEvidence(
      {
        ...environment(evidence),
        APP_DEPLOYED_COMMIT_SHA:
          "e".repeat(40),
      },
      now,
    ).status,
    "mismatch",
  );
  assert.equal(
    inspectDependencyAuditEvidence(
      environment({
        ...evidence,
        evidenceDigest:
          `dependency_audit_evidence_v1_${"f".repeat(64)}`,
      }),
      now,
    ).status,
    "invalid",
  );
  assert.throws(
    () =>
      buildDependencyAuditEvidence(
        auditReport({
          counts: {
            info: 0,
            low: 0,
            moderate: 1,
            high: 0,
            critical: 0,
            total: 1,
          },
        }),
        releaseManifest,
        now,
      ),
    /DEPENDENCY_AUDIT_REPORT_INVALID/,
  );
});

test("fails closed without evidence or with an invalid clock", () => {
  assert.equal(
    inspectDependencyAuditEvidence({}, now).status,
    "disabled",
  );
  assert.equal(
    inspectDependencyAuditEvidence(
      environment(
        buildDependencyAuditEvidence(
          auditReport(),
          releaseManifest,
          now,
        ),
      ),
      new Date(Number.NaN),
    ).status,
    "invalid",
  );
});

test("runs only the production audit against the official registry", () => {
  const calls = [];
  const report = runProductionDependencyAudit(
    (...argumentsList) => {
      calls.push(argumentsList);
      return {
        status: 0,
        signal: null,
        stdout: JSON.stringify(auditReport()),
        stderr: "",
      };
    },
  );

  assert.deepEqual(
    calls[0][1],
    [
      "audit",
      "--omit=dev",
      "--json",
      "--registry=https://registry.npmjs.org/",
    ],
  );
  assert.equal(report.auditReportVersion, 2);
});

test("rejects network-shaped and oversized audit output", () => {
  const networkReport =
    runProductionDependencyAudit(
      () => ({
        status: 1,
        signal: null,
        stdout: JSON.stringify({
          message: "registry unavailable",
        }),
        stderr: "",
      }),
    );

  assert.throws(
    () =>
      buildDependencyAuditEvidence(
        networkReport,
        releaseManifest,
        now,
      ),
    /DEPENDENCY_AUDIT_REPORT_INVALID/,
  );
  assert.throws(
    () => parseDependencyAuditOutput("x".repeat(2_097_153)),
    /DEPENDENCY_AUDIT_OUTPUT_INVALID/,
  );
});
