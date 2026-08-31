import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import test from "node:test";

import {
  DependencyAuditEvidenceAttestationError,
  resolveDependencyAuditAttestationRepository,
  verifyDependencyAuditEvidenceAttestation,
} from "../scripts/verify-dependency-audit-evidence-attestation.mjs";

const artifactDirectory = join(
  "/private/tmp",
  "connect-dependency-attestation-tests",
  String(process.pid),
);
const evidencePath = join(
  artifactDirectory,
  "dependency-audit-evidence.json",
);
const attestationBundlePath = join(
  artifactDirectory,
  "dependency-audit-evidence-attestation.json",
);
const repository = "connect-owner/connect";
const evidenceJson = JSON.stringify({
  schemaVersion: 1,
  evidenceDigest:
    `dependency_audit_evidence_v1_${"c".repeat(64)}`,
});
const bundleJson = JSON.stringify({
  mediaType: "application/vnd.dev.sigstore.bundle.v0.3+json",
});
const releaseManifest = Object.freeze({
  schemaVersion: 1,
  releaseId:
    `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
});
const trustedEvidenceDigest =
  `sha256:${createHash("sha256")
    .update(evidenceJson)
    .digest("hex")}`;

function configuration(
  dependencies,
  overrides = {},
) {
  return {
    evidencePath,
    attestationBundlePath,
    evidenceJson,
    repository,
    releaseManifest,
    dependencies,
    ...overrides,
  };
}

function trustedDependencies(runGitHubCli) {
  return {
    async readTrustedEvidenceFile({ filePath }) {
      return filePath === evidencePath
        ? evidenceJson
        : bundleJson;
    },
    runGitHubCli,
  };
}

function successfulOutput(count = 1) {
  return {
    stdout: JSON.stringify(
      Array.from(
        { length: count },
        () => ({
          attestation: {},
          verificationResult: {},
        }),
      ),
    ),
    stderr: "",
  };
}

function expectsError(code) {
  return (error) =>
    error instanceof
      DependencyAuditEvidenceAttestationError &&
    error.code === code &&
    error.message === code;
}

test("verifies the signed evidence against the exact repository, workflow, and release commit", async () => {
  const calls = [];
  const result =
    await verifyDependencyAuditEvidenceAttestation(
      configuration(
        trustedDependencies(
          async (argumentsList) => {
            calls.push(argumentsList);
            return successfulOutput();
          },
        ),
      ),
    );

  assert.deepEqual(calls, [[
    "attestation",
    "verify",
    evidencePath,
    "--repo",
    repository,
    "--bundle",
    attestationBundlePath,
    "--signer-workflow",
    `${repository}/.github/workflows/dependency-audit-evidence.yml`,
    "--source-digest",
    releaseManifest.commitSha,
    "--deny-self-hosted-runners",
    "--format",
    "json",
  ]]);
  assert.deepEqual(result, {
    repository,
    releaseId: releaseManifest.releaseId,
    evidenceFileDigest:
      trustedEvidenceDigest,
    verifiedAttestationCount: 1,
  });
  assert.ok(Object.isFrozen(result));
});

test("requires the environment evidence to equal the signed file before GitHub access", async () => {
  let cliCalls = 0;

  await assert.rejects(
    () =>
      verifyDependencyAuditEvidenceAttestation(
        configuration(
          trustedDependencies(async () => {
            cliCalls += 1;
          }),
          {
            evidenceJson: JSON.stringify({
              schemaVersion: 1,
              evidenceDigest:
                `dependency_audit_evidence_v1_${"d".repeat(64)}`,
            }),
          },
        ),
      ),
    expectsError(
      "DEPENDENCY_AUDIT_ATTESTATION_EVIDENCE_MISMATCH",
    ),
  );

  assert.equal(cliCalls, 0);
});

test("rejects invalid configuration and untrusted files before signature verification", async () => {
  let accessCount = 0;

  await assert.rejects(
    () =>
      verifyDependencyAuditEvidenceAttestation(
        configuration({
          async readTrustedEvidenceFile() {
            accessCount += 1;
          },
          async runGitHubCli() {
            accessCount += 1;
          },
        }, {
          repository:
            "https://github.com/connect-owner/connect",
        }),
      ),
    expectsError(
      "DEPENDENCY_AUDIT_ATTESTATION_CONFIGURATION_INVALID",
    ),
  );
  assert.equal(accessCount, 0);

  await assert.rejects(
    () =>
      verifyDependencyAuditEvidenceAttestation(
        configuration({
          async readTrustedEvidenceFile({ filePath }) {
            if (filePath === attestationBundlePath) {
              throw new Error("untrusted-bundle");
            }

            return evidenceJson;
          },
          async runGitHubCli() {
            accessCount += 1;
          },
        }),
      ),
    expectsError(
      "DEPENDENCY_AUDIT_ATTESTATION_FILE_INVALID",
    ),
  );
  assert.equal(accessCount, 0);
});

test("fails closed for rejected signatures and malformed verification output", async () => {
  await assert.rejects(
    () =>
      verifyDependencyAuditEvidenceAttestation(
        configuration(
          trustedDependencies(async () => {
            throw new Error("signature-rejected");
          }),
        ),
      ),
    expectsError(
      "DEPENDENCY_AUDIT_ATTESTATION_VERIFICATION_FAILED",
    ),
  );

  for (const stdout of [
    "not-json",
    "[]",
    JSON.stringify([{
      attestation: {},
    }]),
  ]) {
    await assert.rejects(
      () =>
        verifyDependencyAuditEvidenceAttestation(
          configuration(
            trustedDependencies(async () => ({
              stdout,
              stderr: "",
            })),
          ),
        ),
      expectsError(
        "DEPENDENCY_AUDIT_ATTESTATION_INVALID",
      ),
    );
  }
});

test("rejects evidence or bundle replacement during signature verification", async () => {
  let evidenceReads = 0;

  await assert.rejects(
    () =>
      verifyDependencyAuditEvidenceAttestation(
        configuration({
          async readTrustedEvidenceFile({ filePath }) {
            if (filePath === evidencePath) {
              evidenceReads += 1;
              return evidenceReads === 2
                ? JSON.stringify({ schemaVersion: 2 })
                : evidenceJson;
            }

            return bundleJson;
          },
          async runGitHubCli() {
            return successfulOutput();
          },
        }),
      ),
    expectsError(
      "DEPENDENCY_AUDIT_ATTESTATION_FILE_CHANGED",
    ),
  );

  assert.equal(evidenceReads, 2);
});

test("resolves one configured repository without accepting conflicting input", () => {
  assert.equal(
    resolveDependencyAuditAttestationRepository(
      [],
      {
        DEPENDENCY_AUDIT_ATTESTATION_REPOSITORY:
          repository,
      },
    ),
    repository,
  );
  assert.equal(
    resolveDependencyAuditAttestationRepository(
      ["--repo", repository],
      {},
    ),
    repository,
  );

  assert.throws(
    () =>
      resolveDependencyAuditAttestationRepository(
        ["--repo", repository],
        {
          DEPENDENCY_AUDIT_ATTESTATION_REPOSITORY:
            "other-owner/connect",
        },
      ),
    expectsError(
      "DEPENDENCY_AUDIT_ATTESTATION_ARGUMENTS_INVALID",
    ),
  );
});

test("pins the GitHub dependency audit workflow and retains only bounded evidence", async () => {
  const source = await readFile(
    new URL(
      "../.github/workflows/dependency-audit-evidence.yml",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /pull_request:/);
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /name: dependency-audit/);
  assert.match(
    source,
    /npm run evidence:dependency-audit/,
  );
  assert.match(
    source,
    /actions\/attest@508db95dd578ae2727ebd6217d5ba78e4fbda05d/,
  );
  assert.match(
    source,
    /dependency-audit-evidence-attestation\.json/,
  );
  assert.match(
    source,
    /github\.event\.repository\.private == true && vars\.CONNECT_PRIVATE_ARTIFACT_ATTESTATIONS_ENABLED != 'true'/,
  );
  assert.match(
    source,
    /DEPENDENCY_AUDIT_ATTESTATION_PRIVATE_REPOSITORY_CAPABILITY_REQUIRED/,
  );
  assert.match(
    source,
    /GitHub Artifact Attestations for private repositories require GitHub Enterprise Cloud/,
  );
  assert.doesNotMatch(
    source,
    /github\.event\.repository\.private == false/,
  );
  assert.match(source, /if: \$\{\{ always\(\) \}\}/);
  assert.match(source, /retention-days: 1/);
  assert.doesNotMatch(source, /pull_request_target:/);
});
