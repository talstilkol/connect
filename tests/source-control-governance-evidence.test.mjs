import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  buildSourceControlGovernanceEvidence,
  deriveSourceControlGovernanceEvidenceDigest,
  inspectSourceControlGovernanceEvidence,
  requiredPullRequestStatusChecks,
} from "../server/operations/sourceControlGovernanceEvidence.ts";

const deployedCommitSha =
  "1".repeat(40);
const now =
  new Date("2026-07-27T12:00:00.000Z");
function fingerprint(value) {
  return `sha256:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

function createEvidence() {
  const evidence = {
    schemaVersion: 5,
    verifiedAt:
      "2026-07-27T11:00:00.000Z",
    expiresAt:
      "2026-07-28T11:00:00.000Z",
    repositoryFingerprint:
      fingerprint("repository:talstilkol/connect"),
    defaultBranchFingerprint:
      fingerprint("default-branch:talstilkol/connect:main"),
    releaseCommitSha:
      deployedCommitSha,
    reviewPolicy: "single-owner",
    requiredReviewCount: 0,
    requiredStatusChecks:
      requiredPullRequestStatusChecks,
    controls: {
      repositoryPublic: true,
      branchProtection: true,
      pullRequestsRequired: true,
      singleOwner: true,
      codeOwnershipDeclared: true,
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

function createSnapshot() {
  return {
    verifiedAt:
      "2026-07-27T11:00:00.000Z",
    repositoryIdentity:
      "talstilkol/connect",
    defaultBranchIdentity:
      "talstilkol/connect:main",
    releaseCommitSha:
      deployedCommitSha,
    reviewPolicy: "single-owner",
    requiredReviewCount: 0,
    requiredStatusChecks:
      requiredPullRequestStatusChecks,
    controls: {
      repositoryPublic: true,
      branchProtection: true,
      pullRequestsRequired: true,
      singleOwner: true,
      codeOwnershipDeclared: true,
      dismissStaleApprovals: true,
      conversationResolution: true,
      forcePushBlocked: true,
      branchDeletionBlocked: true,
      secretScanning: true,
      pushProtection: true,
    },
  };
}

test("builds bounded governance evidence without repository identities", () => {
  const snapshot = createSnapshot();
  const evidence =
    buildSourceControlGovernanceEvidence(
      snapshot,
    );
  const serialized = JSON.stringify(evidence);

  assert.equal(
    serialized.includes(
      snapshot.repositoryIdentity,
    ),
    false,
  );
  assert.equal(
    serialized.includes(
      snapshot.defaultBranchIdentity,
    ),
    false,
  );
  assert.equal(
    evidence.expiresAt,
    "2026-07-28T11:00:00.000Z",
  );
  assert.equal(Object.isFrozen(evidence), true);
  assert.equal(
    inspectSourceControlGovernanceEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          deployedCommitSha,
        SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
          serialized,
      },
      now,
    ).status,
    "configured",
  );
});

test("refuses to build governance evidence from incomplete controls or checks", () => {
  const snapshot = createSnapshot();

  for (const value of [
    {
      ...snapshot,
      requiredStatusChecks:
        snapshot.requiredStatusChecks.filter((check) => check !== "meta-coexistence"),
    },
    {
      ...snapshot,
      requiredStatusChecks:
        snapshot.requiredStatusChecks.slice(1),
    },
    {
      ...snapshot,
      controls: {
        ...snapshot.controls,
        pushProtection: false,
      },
    },
    {
      ...snapshot,
      controls: {
        ...snapshot.controls,
        repositoryPublic: false,
      },
    },
    {
      ...snapshot,
      repositoryIdentity:
        snapshot.defaultBranchIdentity,
    },
  ]) {
    assert.throws(
      () =>
        buildSourceControlGovernanceEvidence(
          value,
        ),
      /SOURCE_CONTROL_GOVERNANCE_SNAPSHOT_INVALID/,
    );
  }
});

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
      controlCount: 11,
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
  const excessiveLifetime = {
    ...evidence,
    expiresAt:
      "2026-07-28T11:00:00.001Z",
  };
  excessiveLifetime.evidenceDigest =
    deriveSourceControlGovernanceEvidenceDigest(
      excessiveLifetime,
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
    excessiveLifetime,
    {
      ...evidence,
      untrusted: true,
    },
    {
      ...evidence,
      evidenceDigest:
        "source_control_governance_evidence_v5_" +
        "0".repeat(64),
    },
    {
      ...evidence,
      schemaVersion: 1,
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

test("rejects legacy v2 evidence that cannot attest public visibility", () => {
  const evidence = createEvidence();
  const legacyEvidence = {
    ...evidence,
    schemaVersion: 2,
    controls: Object.fromEntries(
      Object.entries(evidence.controls).filter(
        ([name]) => name !== "repositoryPublic",
      ),
    ),
    evidenceDigest:
      "source_control_governance_evidence_v2_" +
      "0".repeat(64),
  };

  assert.equal(
    inspectSourceControlGovernanceEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          deployedCommitSha,
        SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON:
          JSON.stringify(legacyEvidence),
      },
      now,
    ).status,
    "invalid",
  );
});

test("rejects v3 private evidence and self-consistent evidence for a different repository or branch", () => {
  const current = createEvidence();
  const oldControls = Object.fromEntries(
    Object.entries(current.controls).filter(([key]) => key !== "repositoryPublic"),
  );
  const candidates = [
    { ...current, schemaVersion: 3, controls: { repositoryPrivate: true, ...oldControls } },
    { ...current, repositoryFingerprint: fingerprint("repository:another-owner/connect") },
    { ...current, defaultBranchFingerprint: fingerprint("default-branch:talstilkol/connect:other") },
  ];
  for (const candidate of candidates) {
    const evidence = { ...candidate, evidenceDigest: deriveSourceControlGovernanceEvidenceDigest(candidate) };
    assert.equal(inspectSourceControlGovernanceEvidence({
      APP_DEPLOYED_COMMIT_SHA: deployedCommitSha,
      SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON: JSON.stringify(evidence),
    }, now).status, "invalid");
  }
  for (const snapshot of [
    { ...createSnapshot(), repositoryIdentity: "another-owner/connect" },
    { ...createSnapshot(), defaultBranchIdentity: "talstilkol/connect:other" },
  ]) {
    assert.throws(() => buildSourceControlGovernanceEvidence(snapshot), /SOURCE_CONTROL_GOVERNANCE_SNAPSHOT_INVALID/);
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

test("single-owner evidence rejects another review policy, review counts and every missing control", () => {
  const snapshot = createSnapshot();
  const invalid = [
    ...[undefined, "", "team"].map((reviewPolicy) => ({...snapshot, reviewPolicy})),
    ...[-1, 1, null, "0"].map((requiredReviewCount) => ({...snapshot, requiredReviewCount})),
    ...Object.keys(snapshot.controls).map((key) => ({...snapshot, controls: {...snapshot.controls, [key]: false}})),
  ];
  for (const value of invalid) {
    assert.throws(() => buildSourceControlGovernanceEvidence(value), /SOURCE_CONTROL_GOVERNANCE_SNAPSHOT_INVALID/);
    const current = createEvidence();
    const changed = {...current, reviewPolicy: value.reviewPolicy, requiredReviewCount: value.requiredReviewCount, controls: value.controls};
    changed.evidenceDigest = deriveSourceControlGovernanceEvidenceDigest(changed);
    assert.equal(inspectSourceControlGovernanceEvidence({APP_DEPLOYED_COMMIT_SHA: deployedCommitSha,
      SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON: JSON.stringify(changed)}, now).status, "invalid");
  }
});

test("legacy v4 cannot be relabeled as proof of the single-owner policy", () => {
  const current = createEvidence();
  for (const changed of [
    {...current, schemaVersion: 4},
    {...current, controls: {...current.controls, codeOwnerReview: true}},
  ]) {
    changed.evidenceDigest = deriveSourceControlGovernanceEvidenceDigest(changed);
    assert.equal(inspectSourceControlGovernanceEvidence({APP_DEPLOYED_COMMIT_SHA: deployedCommitSha,
      SOURCE_CONTROL_GOVERNANCE_EVIDENCE_JSON: JSON.stringify(changed)}, now).status, "invalid");
  }
});
