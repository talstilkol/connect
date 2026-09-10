import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  buildDeploymentProvenanceEvidence,
  deriveDeploymentProvenanceEvidenceDigest,
  inspectDeploymentProvenanceEvidence,
} from "../server/operations/deploymentProvenanceEvidence.ts";
import {
  buildReleaseManifest,
} from "../scripts/create-release-manifest.mjs";

const now =
  new Date("2026-07-27T12:00:00.000Z");

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function fingerprint(value) {
  return `sha256:${sha256(value)}`;
}

function createReleaseManifest() {
  return buildReleaseManifest({
    commitSha: "1".repeat(40),
    treeSha: "2".repeat(40),
    packageJson: {
      name:
        "connect-whatsapp-platform",
      version: "0.1.0",
      engines: {
        node: ">=20",
      },
    },
    packageLockText:
      "deployment-provenance-lock",
    migrations: [
      {
        file: "0000_initial.sql",
        sha256:
          sha256(
            "deployment-provenance-migration",
          ),
      },
    ],
  });
}

function createEvidence() {
  const manifest =
    createReleaseManifest();
  const evidence = {
    schemaVersion: 1,
    verifiedAt:
      "2026-07-27T11:00:00.000Z",
    expiresAt:
      "2026-07-28T11:00:00.000Z",
    environment: "production",
    releaseId: manifest.releaseId,
    commitSha: manifest.commitSha,
    treeSha: manifest.treeSha,
    packageLockSha256:
      manifest.packageLockSha256,
    migrationSetSha256:
      manifest.migrationSetSha256,
    artifactDigest:
      fingerprint(
        "deployment-artifact",
      ),
    deploymentFingerprint:
      fingerprint(
        "provider-deployment",
      ),
  };

  return {
    ...evidence,
    evidenceDigest:
      deriveDeploymentProvenanceEvidenceDigest(
        evidence,
      ),
  };
}

function createEnvironment(
  evidence = createEvidence(),
) {
  return {
    APP_DEPLOYED_COMMIT_SHA:
      evidence.commitSha,
    APP_RELEASE_ID:
      evidence.releaseId,
    APP_DEPLOYMENT_ARTIFACT_DIGEST:
      evidence.artifactDigest,
    DEPLOYMENT_PROVENANCE_EVIDENCE_JSON:
      JSON.stringify(evidence),
  };
}

test("accepts production deployment provenance linked to one release", () => {
  assert.deepEqual(
    inspectDeploymentProvenanceEvidence(
      createEnvironment(),
      now,
    ),
    {
      status: "configured",
      code:
        "DEPLOYMENT_PROVENANCE_EVIDENCE_VERIFIED",
      verifiedAssetCount: 6,
    },
  );
});

test("builds release-bound deployment provenance from a verified provider identity", () => {
  const manifest = createReleaseManifest();
  const evidence =
    buildDeploymentProvenanceEvidence({
      verifiedAt:
        "2026-07-27T11:00:00.000Z",
      releaseManifest: {
        releaseId: manifest.releaseId,
        commitSha: manifest.commitSha,
        treeSha: manifest.treeSha,
        packageLockSha256:
          manifest.packageLockSha256,
        migrationSetSha256:
          manifest.migrationSetSha256,
      },
      artifactDigest:
        fingerprint("artifact"),
      deploymentIdentity:
        "production:deployment:version:etag",
    });

  assert.equal(
    inspectDeploymentProvenanceEvidence(
      createEnvironment(evidence),
      now,
    ).status,
    "configured",
  );
  assert.throws(
    () =>
      buildDeploymentProvenanceEvidence({
        verifiedAt:
          "2026-07-27T11:00:00.000Z",
        releaseManifest: {
          releaseId:
            `connect_release_v1_${"9".repeat(
              64,
            )}`,
          commitSha: manifest.commitSha,
          treeSha: manifest.treeSha,
          packageLockSha256:
            manifest.packageLockSha256,
          migrationSetSha256:
            manifest.migrationSetSha256,
        },
        artifactDigest:
          fingerprint("artifact"),
        deploymentIdentity:
          "production:deployment:version:etag",
      }),
    /DEPLOYMENT_PROVENANCE_SNAPSHOT_INVALID/,
  );
});

test("rejects a release identity that does not match its manifest inputs", () => {
  const evidence = {
    ...createEvidence(),
    releaseId:
      `connect_release_v1_${"3".repeat(
        64,
      )}`,
  };
  evidence.evidenceDigest =
    deriveDeploymentProvenanceEvidenceDigest(
      evidence,
    );

  assert.equal(
    inspectDeploymentProvenanceEvidence(
      createEnvironment(evidence),
      now,
    ).status,
    "invalid",
  );
});

test("blocks a deployment that does not match the runtime release", () => {
  const environment =
    createEnvironment();

  for (const mismatch of [
    {
      ...environment,
      APP_DEPLOYED_COMMIT_SHA:
        "4".repeat(40),
    },
    {
      ...environment,
      APP_RELEASE_ID:
        `connect_release_v1_${"5".repeat(
          64,
        )}`,
    },
    {
      ...environment,
      APP_DEPLOYMENT_ARTIFACT_DIGEST:
        fingerprint(
          "different-artifact",
        ),
    },
  ]) {
    assert.equal(
      inspectDeploymentProvenanceEvidence(
        mismatch,
        now,
      ).status,
      "mismatch",
    );
  }
});

test("rejects expired, future, extended, and digest-mismatched evidence", () => {
  const evidence = createEvidence();
  const variants = [
    {
      expectedStatus: "expired",
      value: {
        ...evidence,
        expiresAt:
          "2026-07-27T12:00:00.000Z",
      },
    },
    {
      expectedStatus: "invalid",
      value: {
        ...evidence,
        verifiedAt:
          "2026-07-27T13:00:00.000Z",
      },
    },
    {
      expectedStatus: "invalid",
      value: {
        ...evidence,
        expiresAt:
          "2026-07-28T11:00:00.001Z",
      },
    },
  ];

  for (const variant of variants) {
    variant.value.evidenceDigest =
      deriveDeploymentProvenanceEvidenceDigest(
        variant.value,
      );

    assert.equal(
      inspectDeploymentProvenanceEvidence(
        createEnvironment(
          variant.value,
        ),
        now,
      ).status,
      variant.expectedStatus,
    );
  }

  assert.equal(
    inspectDeploymentProvenanceEvidence(
      createEnvironment({
        ...evidence,
        evidenceDigest:
          `deployment_provenance_evidence_v1_${"6".repeat(
            64,
          )}`,
      }),
      now,
    ).status,
    "invalid",
  );
});

test("fails closed for absent, extended, non-production, or invalid-clock evidence", () => {
  const evidence = createEvidence();

  assert.equal(
    inspectDeploymentProvenanceEvidence(
      {},
      now,
    ).status,
    "disabled",
  );
  assert.equal(
    inspectDeploymentProvenanceEvidence(
      {
        ...createEnvironment(),
        DEPLOYMENT_PROVENANCE_EVIDENCE_JSON:
          JSON.stringify({
            ...evidence,
            untrusted: true,
          }),
      },
      now,
    ).status,
    "invalid",
  );
  assert.equal(
    inspectDeploymentProvenanceEvidence(
      {
        ...createEnvironment(),
        DEPLOYMENT_PROVENANCE_EVIDENCE_JSON:
          JSON.stringify({
            ...evidence,
            environment: "staging",
          }),
      },
      now,
    ).status,
    "invalid",
  );
  assert.equal(
    inspectDeploymentProvenanceEvidence(
      createEnvironment(),
      new Date(Number.NaN),
    ).status,
    "invalid",
  );
});
