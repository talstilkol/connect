import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  join,
} from "node:path";
import test from "node:test";

import {
  verifyTeamInvitationBrowserEvidenceAttestation,
  TeamInvitationBrowserEvidenceAttestationError,
  resolveTeamInvitationBrowserAttestationRepository,
} from "../scripts/verify-team-invitation-browser-evidence-attestation.mjs";

const artifactDirectory = join(
  "/private/tmp",
  "connect-browser-attestation-tests",
  String(process.pid),
);
const evidencePath = join(
  artifactDirectory,
  "team-invitation-browser-evidence.json",
);
const attestationBundlePath = join(
  artifactDirectory,
  "team-invitation-browser-evidence-attestation.json",
);
const repository = "connect-owner/connect";
const releaseManifest = Object.freeze({
  schemaVersion: 1,
  releaseId:
    `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
});
const trustedEvidenceDigest =
  `sha256:${createHash("sha256")
    .update("trusted-file")
    .digest("hex")}`;

function configuration(
  dependencies,
  overrides = {},
) {
  return {
    evidencePath,
    attestationBundlePath,
    repository,
    releaseManifest,
    dependencies,
    ...overrides,
  };
}

function trustedDependencies(runGitHubCli) {
  return {
    async readTrustedEvidenceFile() {
      return "trusted-file";
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
      TeamInvitationBrowserEvidenceAttestationError &&
    error.code === code &&
    error.message === code;
}

test("verifies the exact repository, signer workflow, release commit, and runner class", async () => {
  const calls = [];
  const result =
    await verifyTeamInvitationBrowserEvidenceAttestation(
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
    `${repository}/.github/workflows/team-invitation-browser-e2e.yml`,
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

test("rejects an invalid repository before file or CLI access", async () => {
  let accessCount = 0;

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceAttestation(
        configuration({
          async readTrustedEvidenceFile() {
            accessCount += 1;
          },
          async runGitHubCli() {
            accessCount += 1;
          },
        }, {
          repository: "https://github.com/connect-owner/connect",
        }),
      ),
    expectsError(
      "BROWSER_EVIDENCE_ATTESTATION_CONFIGURATION_INVALID",
    ),
  );

  assert.equal(accessCount, 0);
});

test("stops before cryptographic verification when either local file is untrusted", async () => {
  let fileReads = 0;
  let cliCalls = 0;

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceAttestation(
        configuration({
          async readTrustedEvidenceFile() {
            fileReads += 1;

            if (fileReads === 2) {
              throw new Error("untrusted-bundle");
            }

            return "trusted-file";
          },
          async runGitHubCli() {
            cliCalls += 1;
          },
        }),
      ),
    expectsError(
      "BROWSER_EVIDENCE_ATTESTATION_FILE_INVALID",
    ),
  );

  assert.equal(fileReads, 2);
  assert.equal(cliCalls, 0);
});

test("fails closed for rejected signatures and malformed verification output", async () => {
  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceAttestation(
        configuration(
          trustedDependencies(async () => {
            throw new Error("signature-rejected");
          }),
        ),
      ),
    expectsError(
      "BROWSER_EVIDENCE_ATTESTATION_VERIFICATION_FAILED",
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
        verifyTeamInvitationBrowserEvidenceAttestation(
          configuration(
            trustedDependencies(async () => ({
              stdout,
              stderr: "",
            })),
          ),
        ),
      expectsError(
        "BROWSER_EVIDENCE_ATTESTATION_INVALID",
      ),
    );
  }
});

test("rejects evidence or bundle replacement during cryptographic verification", async () => {
  let reads = 0;

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceAttestation(
        configuration({
          async readTrustedEvidenceFile() {
            reads += 1;
            return reads === 3
              ? "replaced-evidence"
              : "trusted-file";
          },
          async runGitHubCli() {
            return successfulOutput();
          },
        }),
      ),
    expectsError(
      "BROWSER_EVIDENCE_ATTESTATION_FILE_CHANGED",
    ),
  );

  assert.equal(reads, 4);
});

test("resolves one production-gate repository without accepting conflicting input", () => {
  assert.equal(
    resolveTeamInvitationBrowserAttestationRepository(
      [],
      {
        TEAM_INVITATION_BROWSER_ATTESTATION_REPOSITORY:
          repository,
      },
    ),
    repository,
  );
  assert.equal(
    resolveTeamInvitationBrowserAttestationRepository(
      ["--repo", repository],
      {},
    ),
    repository,
  );

  assert.throws(
    () =>
      resolveTeamInvitationBrowserAttestationRepository(
        ["--repo", repository],
        {
          TEAM_INVITATION_BROWSER_ATTESTATION_REPOSITORY:
            "other-owner/connect",
        },
      ),
    expectsError(
      "BROWSER_EVIDENCE_ATTESTATION_ARGUMENTS_INVALID",
    ),
  );
});
