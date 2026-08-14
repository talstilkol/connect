import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  buildCiExecutionEvidence,
  deriveCiExecutionEvidenceDigest,
  inspectCiExecutionEvidence,
} from "../server/operations/ciExecutionEvidence.ts";
import {
  requiredPullRequestStatusChecks,
} from "../server/operations/sourceControlGovernanceEvidence.ts";

const now =
  new Date("2026-07-27T12:00:00.000Z");
const commitSha = "1".repeat(40);
const releaseId =
  `connect_release_v1_${"2".repeat(
    64,
  )}`;

function fingerprint(value) {
  return `sha256:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

function createEvidence() {
  const evidence = {
    schemaVersion: 1,
    verifiedAt:
      "2026-07-27T11:30:00.000Z",
    expiresAt:
      "2026-07-28T11:30:00.000Z",
    releaseId,
    commitSha,
    checks:
      requiredPullRequestStatusChecks.map(
        (name) => ({
          name,
          status: "success",
          completedAt:
            "2026-07-27T11:00:00.000Z",
          runFingerprint:
            fingerprint(
              `ci-run:${name}`,
            ),
          outputDigest:
            fingerprint(
              `ci-output:${name}`,
            ),
        }),
      ),
  };

  return {
    ...evidence,
    evidenceDigest:
      deriveCiExecutionEvidenceDigest(
        evidence,
      ),
  };
}

function createEnvironment(
  evidence = createEvidence(),
) {
  return {
    APP_DEPLOYED_COMMIT_SHA:
      commitSha,
    APP_RELEASE_ID: releaseId,
    CI_EXECUTION_EVIDENCE_JSON:
      JSON.stringify(evidence),
  };
}

function createSnapshot() {
  return {
    verifiedAt:
      "2026-07-27T11:30:00.000Z",
    releaseId,
    commitSha,
    checks:
      [...requiredPullRequestStatusChecks]
        .reverse()
        .map((name) => ({
          name,
          conclusion: "success",
          completedAt:
            "2026-07-27T11:00:00.000Z",
          runIdentity:
            `github-check-run:${name}`,
          outputIdentity:
            `github-check-output:${name}`,
        })),
  };
}

test("builds ordered bounded CI evidence without raw run identities", () => {
  const snapshot = createSnapshot();
  const evidence =
    buildCiExecutionEvidence(snapshot);
  const serialized = JSON.stringify(evidence);

  assert.deepEqual(
    evidence.checks.map(({ name }) => name),
    requiredPullRequestStatusChecks,
  );
  assert.equal(
    serialized.includes(
      snapshot.checks[0].runIdentity,
    ),
    false,
  );
  assert.equal(
    serialized.includes(
      snapshot.checks[0].outputIdentity,
    ),
    false,
  );
  assert.equal(
    evidence.expiresAt,
    "2026-07-28T11:30:00.000Z",
  );
  assert.equal(Object.isFrozen(evidence), true);
  assert.equal(
    inspectCiExecutionEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          commitSha,
        APP_RELEASE_ID: releaseId,
        CI_EXECUTION_EVIDENCE_JSON:
          serialized,
      },
      now,
    ).status,
    "configured",
  );
});

test("refuses failed, duplicate, stale, or extended CI snapshots", () => {
  const snapshot = createSnapshot();
  const variants = [
    {
      ...snapshot,
      checks: snapshot.checks.slice(1),
    },
    {
      ...snapshot,
      checks: snapshot.checks.map(
        (check, index) =>
          index === 0
            ? {
                ...check,
                conclusion: "failure",
              }
            : check,
      ),
    },
    {
      ...snapshot,
      checks: snapshot.checks.map(
        (check, index) =>
          index === 0
            ? {
                ...check,
                completedAt:
                  "2026-07-26T11:29:59.999Z",
              }
            : check,
      ),
    },
    {
      ...snapshot,
      unexpected: true,
    },
  ];

  for (const value of variants) {
    assert.throws(
      () => buildCiExecutionEvidence(value),
      /CI_EXECUTION_SNAPSHOT_INVALID/,
    );
  }
});

test("accepts all nine successful pull request checks for the deployed release", () => {
  assert.deepEqual(
    inspectCiExecutionEvidence(
      createEnvironment(),
      now,
    ),
    {
      status: "configured",
      code:
        "CI_EXECUTION_EVIDENCE_VERIFIED",
      verifiedStatusCheckCount: 9,
    },
  );
});

test("rejects missing, duplicate, or unsuccessful check results", () => {
  const evidence = createEvidence();
  const variants = [
    {
      ...evidence,
      checks: evidence.checks.slice(1),
    },
    {
      ...evidence,
      checks: [
        evidence.checks[0],
        ...evidence.checks.slice(0, -1),
      ],
    },
    {
      ...evidence,
      checks: evidence.checks.map(
        (check, index) =>
          index === 0
            ? {
                ...check,
                status: "failed",
              }
            : check,
      ),
    },
  ];

  for (const variant of variants) {
    variant.evidenceDigest =
      deriveCiExecutionEvidenceDigest(
        variant,
      );

    assert.equal(
      inspectCiExecutionEvidence(
        createEnvironment(variant),
        now,
      ).status,
      "invalid",
    );
  }
});

test("blocks CI evidence for a different commit or release", () => {
  const environment =
    createEnvironment();

  for (const variant of [
    {
      ...environment,
      APP_DEPLOYED_COMMIT_SHA:
        "3".repeat(40),
    },
    {
      ...environment,
      APP_RELEASE_ID:
        `connect_release_v1_${"4".repeat(
          64,
        )}`,
    },
  ]) {
    assert.equal(
      inspectCiExecutionEvidence(
        variant,
        now,
      ).status,
      "mismatch",
    );
  }
});

test("rejects expired, future, stale-check, and digest-mismatched evidence", () => {
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
        checks: evidence.checks.map(
          (check, index) =>
            index === 0
              ? {
                  ...check,
                  completedAt:
                    "2026-07-26T11:29:59.999Z",
                }
              : check,
        ),
      },
    },
  ];

  for (const variant of variants) {
    variant.value.evidenceDigest =
      deriveCiExecutionEvidenceDigest(
        variant.value,
      );

    assert.equal(
      inspectCiExecutionEvidence(
        createEnvironment(
          variant.value,
        ),
        now,
      ).status,
      variant.expectedStatus,
    );
  }

  assert.equal(
    inspectCiExecutionEvidence(
      createEnvironment({
        ...evidence,
        evidenceDigest:
          `ci_execution_evidence_v1_${"5".repeat(
            64,
          )}`,
      }),
      now,
    ).status,
    "invalid",
  );
});

test("fails closed for missing, extended, reused-run, or invalid-clock evidence", () => {
  const evidence = createEvidence();
  const reusedRun = {
    ...evidence,
    checks: evidence.checks.map(
      (check, index) =>
        index === 1
          ? {
              ...check,
              runFingerprint:
                evidence.checks[0]
                  .runFingerprint,
            }
          : check,
    ),
  };
  reusedRun.evidenceDigest =
    deriveCiExecutionEvidenceDigest(
      reusedRun,
    );

  for (const environment of [
    {
      ...createEnvironment(),
      CI_EXECUTION_EVIDENCE_JSON:
        JSON.stringify({
          ...evidence,
          untrusted: true,
        }),
    },
    createEnvironment(reusedRun),
  ]) {
    assert.equal(
      inspectCiExecutionEvidence(
        environment,
        now,
      ).status,
      "invalid",
    );
  }

  assert.equal(
    inspectCiExecutionEvidence(
      {},
      now,
    ).status,
    "disabled",
  );
  assert.equal(
    inspectCiExecutionEvidence(
      createEnvironment(),
      new Date(Number.NaN),
    ).status,
    "invalid",
  );
});
