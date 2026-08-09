import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  chmod,
  mkdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import {
  tmpdir,
} from "node:os";
import {
  join,
} from "node:path";
import test from "node:test";

import {
  deriveTeamInvitationBrowserEvidenceDigest,
  deriveTeamInvitationPolicyDigest,
  requiredTeamInvitationBrowserScenarios,
} from "../server/operations/teamInvitationBrowserEvidence.ts";
import {
  verifyTeamInvitationBrowserEvidenceFile,
  TeamInvitationBrowserEvidenceFileError,
  teamInvitationBrowserEvidenceFileVerificationDependencies,
} from "../scripts/verify-team-invitation-browser-evidence-file.mjs";

const now = new Date(
  "2026-08-09T12:00:00.000Z",
);
const origin =
  "https://staging.connect.test";
const artifactDigest =
  `sha256:${"c".repeat(64)}`;
const releaseManifest = Object.freeze({
  schemaVersion: 1,
  releaseId:
    `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
});
const policy = Object.freeze({
  ttlHours: 72,
  reRequest: "after-terminal",
});
const testRoot = join(
  tmpdir(),
  "connect-team-invitation-browser-evidence-file-tests",
  String(process.pid),
);
let testOrdinal = 0;

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function createEvidence() {
  const evidence = {
    schemaVersion: 1,
    verifiedAt:
      "2026-08-09T11:00:00.000Z",
    expiresAt:
      "2026-08-10T11:00:00.000Z",
    environment: "staging",
    origin,
    releaseId: releaseManifest.releaseId,
    commitSha: releaseManifest.commitSha,
    artifactDigest,
    policyDigest:
      deriveTeamInvitationPolicyDigest(
        policy,
      ),
    scenarios:
      requiredTeamInvitationBrowserScenarios.map(
        (name) => ({
          name,
          status: "passed",
          completedAt:
            "2026-08-09T10:30:00.000Z",
          runFingerprint:
            `sha256:${sha256(`run:${name}`)}`,
          outputDigest:
            `sha256:${sha256(`output:${name}`)}`,
        }),
      ),
  };

  return {
    ...evidence,
    evidenceDigest:
      deriveTeamInvitationBrowserEvidenceDigest(
        evidence,
      ),
  };
}

function environment(overrides = {}) {
  return {
    APP_DEPLOYMENT_ARTIFACT_DIGEST:
      artifactDigest,
    TEAM_INVITATION_TTL_HOURS:
      String(policy.ttlHours),
    TEAM_INVITATION_REREQUEST_POLICY:
      policy.reRequest,
    TEAM_INVITATION_BROWSER_E2E_ORIGIN:
      origin,
    ...overrides,
  };
}

async function createEvidenceFile(
  evidence = createEvidence(),
) {
  testOrdinal += 1;
  const directory = join(
    testRoot,
    String(testOrdinal),
  );
  const filePath = join(
    directory,
    "team-invitation-browser-evidence.json",
  );

  await mkdir(directory, {
    recursive: true,
  });
  await writeFile(
    filePath,
    `${JSON.stringify(evidence)}\n`,
    { mode: 0o644 },
  );

  return {
    directory,
    filePath,
    text: `${JSON.stringify(evidence)}\n`,
  };
}

function configuration(
  filePath,
  overrides = {},
) {
  return {
    filePath,
    environment: environment(),
    releaseManifest,
    clock: () => now,
    dependencies:
      teamInvitationBrowserEvidenceFileVerificationDependencies,
    ...overrides,
  };
}

function expectsError(code) {
  return (error) =>
    error instanceof
      TeamInvitationBrowserEvidenceFileError &&
    error.code === code &&
    error.message === code;
}

test.after(async () => {
  await rm(testRoot, {
    recursive: true,
    force: true,
  });
});

test("accepts an owner-controlled short-lived evidence file for the current release", async () => {
  const file = await createEvidenceFile();

  const result =
    await verifyTeamInvitationBrowserEvidenceFile(
      configuration(file.filePath),
    );

  assert.deepEqual(result, {
    releaseId: releaseManifest.releaseId,
    evidenceFileDigest:
      `sha256:${sha256(file.text)}`,
    verifiedScenarioCount: 7,
  });
  assert.ok(Object.isFrozen(result));
});

test("rejects group-writable and symbolic-link evidence files", async () => {
  const writable = await createEvidenceFile();
  await chmod(writable.filePath, 0o664);

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceFile(
        configuration(writable.filePath),
      ),
    expectsError("BROWSER_EVIDENCE_FILE_INVALID"),
  );

  const linked = await createEvidenceFile();
  const linkPath = join(
    linked.directory,
    "linked-evidence.json",
  );
  await symlink(linked.filePath, linkPath);

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceFile(
        configuration(linkPath),
      ),
    expectsError("BROWSER_EVIDENCE_FILE_INVALID"),
  );
});

test("separates expired evidence from release and artifact mismatches", async () => {
  const file = await createEvidenceFile();

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceFile(
        configuration(file.filePath, {
          clock: () =>
            new Date(
              "2026-08-10T11:00:00.000Z",
            ),
        }),
      ),
    expectsError("BROWSER_EVIDENCE_FILE_EXPIRED"),
  );

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceFile(
        configuration(file.filePath, {
          environment: environment({
            APP_DEPLOYMENT_ARTIFACT_DIGEST:
              `sha256:${"d".repeat(64)}`,
          }),
        }),
      ),
    expectsError("BROWSER_EVIDENCE_FILE_MISMATCH"),
  );
});

test("rejects tampered evidence and invalid release input before trust", async () => {
  const evidence = createEvidence();
  const tampered = await createEvidenceFile({
    ...evidence,
    origin:
      "https://other-staging.connect.test",
  });

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceFile(
        configuration(tampered.filePath),
      ),
    expectsError("BROWSER_EVIDENCE_FILE_INVALID"),
  );

  await assert.rejects(
    () =>
      verifyTeamInvitationBrowserEvidenceFile(
        configuration(tampered.filePath, {
          releaseManifest: {
            ...releaseManifest,
            commitSha: "invalid",
          },
        }),
      ),
    expectsError(
      "BROWSER_EVIDENCE_FILE_CONFIGURATION_INVALID",
    ),
  );
});
