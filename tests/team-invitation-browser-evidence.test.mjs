import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  deriveTeamInvitationBrowserEvidenceDigest,
  deriveTeamInvitationPolicyDigest,
  inspectTeamInvitationBrowserEvidence,
  requiredTeamInvitationBrowserScenarios,
} from "../server/operations/teamInvitationBrowserEvidence.ts";

const now =
  new Date(
    "2026-08-09T12:00:00.000Z",
  );
const policy = {
  ttlHours: 72,
  reRequest:
    "after-terminal",
};

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function fingerprint(value) {
  return `sha256:${sha256(
    value,
  )}`;
}

function createEvidence() {
  const evidence = {
    schemaVersion: 1,
    verifiedAt:
      "2026-08-09T11:00:00.000Z",
    expiresAt:
      "2026-08-10T11:00:00.000Z",
    environment: "staging",
    origin:
      "https://staging.connect.test",
    releaseId:
      `connect_release_v1_${"a".repeat(
        64,
      )}`,
    commitSha:
      "b".repeat(40),
    artifactDigest:
      fingerprint(
        "staging-artifact",
      ),
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
            fingerprint(
              `run:${name}`,
            ),
          outputDigest:
            fingerprint(
              `output:${name}`,
            ),
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
    TEAM_INVITATION_TTL_HOURS:
      String(policy.ttlHours),
    TEAM_INVITATION_REREQUEST_POLICY:
      policy.reRequest,
    TEAM_INVITATION_BROWSER_E2E_ORIGIN:
      evidence.origin,
    TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON:
      JSON.stringify(evidence),
  };
}

test("accepts seven short-lived browser scenarios linked to one release and policy", () => {
  assert.deepEqual(
    inspectTeamInvitationBrowserEvidence(
      createEnvironment(),
      now,
    ),
    {
      status: "configured",
      code:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_VERIFIED",
      verifiedScenarioCount: 7,
    },
  );
});

test("rejects missing, malformed, extended, and PII-bearing evidence", () => {
  const evidence =
    createEvidence();
  const invalidValues = [
    "not-json",
    JSON.stringify({
      ...evidence,
      email:
        "forbidden@connect.test",
    }),
    JSON.stringify({
      ...evidence,
      scenarios:
        evidence.scenarios.slice(
          1,
        ),
    }),
  ];

  assert.equal(
    inspectTeamInvitationBrowserEvidence(
      {},
      now,
    ).status,
    "disabled",
  );

  for (const rawValue of invalidValues) {
    assert.equal(
      inspectTeamInvitationBrowserEvidence(
        {
          ...createEnvironment(),
          TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON:
            rawValue,
        },
        now,
      ).status,
      "invalid",
    );
  }
});

test("rejects duplicate scenarios and non-unique run evidence", () => {
  const evidence =
    createEvidence();
  const variants = [
    {
      ...evidence,
      scenarios:
        evidence.scenarios.map(
          (scenario, index) =>
            index === 1
              ? {
                  ...scenario,
                  name:
                    evidence
                      .scenarios[0]
                      .name,
                }
              : scenario,
        ),
    },
    {
      ...evidence,
      scenarios:
        evidence.scenarios.map(
          (scenario, index) =>
            index === 1
              ? {
                  ...scenario,
                  runFingerprint:
                    evidence
                      .scenarios[0]
                      .runFingerprint,
                }
              : scenario,
        ),
    },
  ];

  for (const variant of variants) {
    variant.evidenceDigest =
      deriveTeamInvitationBrowserEvidenceDigest(
        variant,
      );

    assert.equal(
      inspectTeamInvitationBrowserEvidence(
        createEnvironment(
          variant,
        ),
        now,
      ).status,
      "invalid",
    );
  }
});

test("blocks evidence that does not match runtime release, artifact, origin, or policy", () => {
  const environment =
    createEnvironment();
  const mismatches = [
    {
      ...environment,
      APP_DEPLOYED_COMMIT_SHA:
        "c".repeat(40),
    },
    {
      ...environment,
      APP_RELEASE_ID:
        `connect_release_v1_${"d".repeat(
          64,
        )}`,
    },
    {
      ...environment,
      APP_DEPLOYMENT_ARTIFACT_DIGEST:
        fingerprint(
          "other-artifact",
        ),
    },
    {
      ...environment,
      TEAM_INVITATION_BROWSER_E2E_ORIGIN:
        "https://other.connect.test",
    },
    {
      ...environment,
      TEAM_INVITATION_TTL_HOURS:
        "48",
    },
  ];

  for (const mismatch of mismatches) {
    assert.equal(
      inspectTeamInvitationBrowserEvidence(
        mismatch,
        now,
      ).status,
      "mismatch",
    );
  }
});

test("rejects expired, future, stale, extended, and digest-mismatched evidence", () => {
  const evidence =
    createEvidence();
  const variants = [
    {
      expected: "expired",
      value: {
        ...evidence,
        expiresAt:
          "2026-08-09T12:00:00.000Z",
      },
    },
    {
      expected: "invalid",
      value: {
        ...evidence,
        verifiedAt:
          "2026-08-09T13:00:00.000Z",
      },
    },
    {
      expected: "invalid",
      value: {
        ...evidence,
        expiresAt:
          "2026-08-10T11:00:00.001Z",
      },
    },
    {
      expected: "invalid",
      value: {
        ...evidence,
        scenarios:
          evidence.scenarios.map(
            (scenario, index) =>
              index === 0
                ? {
                    ...scenario,
                    completedAt:
                      "2026-08-08T10:59:59.999Z",
                  }
                : scenario,
          ),
      },
    },
  ];

  for (const variant of variants) {
    variant.value.evidenceDigest =
      deriveTeamInvitationBrowserEvidenceDigest(
        variant.value,
      );

    assert.equal(
      inspectTeamInvitationBrowserEvidence(
        createEnvironment(
          variant.value,
        ),
        now,
      ).status,
      variant.expected,
    );
  }

  assert.equal(
    inspectTeamInvitationBrowserEvidence(
      createEnvironment({
        ...evidence,
        evidenceDigest:
          `team_invitation_browser_evidence_v1_${"e".repeat(
            64,
          )}`,
      }),
      now,
    ).status,
    "invalid",
  );
});

test("accepts only a canonical HTTPS staging origin and passed scenarios", () => {
  const evidence =
    createEvidence();
  const variants = [
    {
      ...evidence,
      origin:
        "http://staging.connect.test",
    },
    {
      ...evidence,
      origin:
        "https://staging.connect.test/path",
    },
    {
      ...evidence,
      origin:
        "https://localhost",
    },
    {
      ...evidence,
      environment:
        "production",
    },
    {
      ...evidence,
      scenarios:
        evidence.scenarios.map(
          (scenario, index) =>
            index === 0
              ? {
                  ...scenario,
                  status: "failed",
                }
              : scenario,
        ),
    },
  ];

  for (const variant of variants) {
    assert.equal(
      inspectTeamInvitationBrowserEvidence(
        {
          ...createEnvironment(),
          TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON:
            JSON.stringify(
              variant,
            ),
        },
        now,
      ).status,
      "invalid",
    );
  }
});
