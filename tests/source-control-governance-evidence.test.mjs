import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  deriveSourceControlGovernanceEvidenceDigest,
  inspectSourceControlGovernanceEvidence,
} from "../server/operations/sourceControlGovernanceEvidence.ts";

const deployedCommitSha =
  "1".repeat(40);
const now =
  new Date("2026-07-27T12:00:00.000Z");
const requiredStatusChecks = [
  "source-guardrails",
  "secret-hygiene",
  "interface-guardrails",
  "dependency-lock",
  "migrations",
  "typecheck",
  "lint",
  "tests-and-build",
  "dependency-audit",
  "production-readiness",
];

function fingerprint(value) {
  return `sha256:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

function createEvidence() {
  const evidence = {
    schemaVersion: 1,
    verifiedAt:
      "2026-07-27T11:00:00.000Z",
    expiresAt:
      "2026-07-28T11:00:00.000Z",
    repositoryFingerprint:
      fingerprint("repository"),
    defaultBranchFingerprint:
      fingerprint("default-branch"),
    releaseCommitSha:
      deployedCommitSha,
    requiredReviewCount: 1,
    requiredStatusChecks,
    controls: {
      branchProtection: true,
      codeOwnerReview: true,
      dismissStaleApprovals: true,
      conversationResolution: true,
      forcePushBlocked: true,
      branchDeletionBlocked: true,
      secretScanning: true,
      pushProtection: true,
    },
  };

  return {
    ...evidence,
    evidenceDigest:
      deriveSourceControlGovernanceEvidenceDigest(
        evidence,
      ),
  };
}

test("accepts protected source control linked to the deployed commit", () => {
  assert.deepEqual(
    inspectSourceControlGovernanceEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          deployedCommitSha,
        SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
          JSON.stringify(
            createEvidence(),
          ),
      },
      now,
    ),
    {
      status: "configured",
      code:
        "SOURCE_CONTROL_GOVERNANCE_EVIDENCE_VERIFIED",
      requiredStatusCheckCount: 10,
      controlCount: 8,
    },
  );
});

test("rejects a missing required check or disabled repository control", () => {
  const evidence = createEvidence();
  const missingCheck = {
    ...evidence,
    requiredStatusChecks:
      evidence.requiredStatusChecks.slice(
        1,
      ),
  };
  missingCheck.evidenceDigest =
    deriveSourceControlGovernanceEvidenceDigest(
      missingCheck,
    );
  const disabledControl = {
    ...evidence,
    controls: {
      ...evidence.controls,
      pushProtection: false,
    },
  };
  disabledControl.evidenceDigest =
    deriveSourceControlGovernanceEvidenceDigest(
      disabledControl,
    );

  for (const value of [
    missingCheck,
    disabledControl,
  ]) {
    assert.equal(
      inspectSourceControlGovernanceEvidence(
        {
          APP_DEPLOYED_COMMIT_SHA:
            deployedCommitSha,
          SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
            JSON.stringify(value),
        },
        now,
      ).status,
      "invalid",
    );
  }
});

test("blocks missing or mismatched deployed commit identity", () => {
  const evidence = createEvidence();
  const rawEvidence =
    JSON.stringify(evidence);

  assert.equal(
    inspectSourceControlGovernanceEvidence(
      {
        SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
          rawEvidence,
      },
      now,
    ).status,
    "commit-mismatch",
  );
  assert.equal(
    inspectSourceControlGovernanceEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          "2".repeat(40),
        SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
          rawEvidence,
      },
      now,
    ).status,
    "commit-mismatch",
  );
});

test("rejects expired, future, extended, and digest-mismatched evidence", () => {
  const evidence = createEvidence();
  const expired = {
    ...evidence,
    expiresAt:
      "2026-07-27T12:00:00.000Z",
  };
  expired.evidenceDigest =
    deriveSourceControlGovernanceEvidenceDigest(
      expired,
    );
  const future = {
    ...evidence,
    verifiedAt:
      "2026-07-27T13:00:00.000Z",
  };
  future.evidenceDigest =
    deriveSourceControlGovernanceEvidenceDigest(
      future,
    );

  assert.equal(
    inspectSourceControlGovernanceEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          deployedCommitSha,
        SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
          JSON.stringify(expired),
      },
      now,
    ).status,
    "expired",
  );

  for (const value of [
    future,
    {
      ...evidence,
      untrusted: true,
    },
    {
      ...evidence,
      evidenceDigest:
        "source_control_governance_evidence_v1_" +
        "0".repeat(64),
    },
  ]) {
    assert.equal(
      inspectSourceControlGovernanceEvidence(
        {
          APP_DEPLOYED_COMMIT_SHA:
            deployedCommitSha,
          SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
            JSON.stringify(value),
        },
        now,
      ).status,
      "invalid",
    );
  }
});

test("fails closed without governance evidence or with an invalid clock", () => {
  assert.equal(
    inspectSourceControlGovernanceEvidence(
      {},
      now,
    ).status,
    "disabled",
  );
  assert.equal(
    inspectSourceControlGovernanceEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          deployedCommitSha,
        SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
          JSON.stringify(
            createEvidence(),
          ),
      },
      new Date(Number.NaN),
    ).status,
    "invalid",
  );
});
