import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateTeamInvitationAcceptanceActivation,
  inspectTeamInvitationAcceptanceActivation,
} from "../server/team/teamInvitationAcceptanceActivation.ts";

const configuredClerk = {
  status: "configured",
  missingKeys: [],
};
const configuredPolicy = {
  status: "configured",
  policy: {
    ttlHours: 72,
    reRequest: "after-terminal",
  },
};
const configuredBrowserEvidence = {
  status: "configured",
  code:
    "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_VERIFIED",
  verifiedScenarioCount: 7,
};
const configuredDeploymentProvenance = {
  status: "configured",
  code:
    "DEPLOYMENT_PROVENANCE_EVIDENCE_VERIFIED",
  verifiedAssetCount: 6,
};

function inspection(overrides = {}) {
  return {
    mode: "staging-e2e",
    nodeEnvironment: "production",
    runtimeEnvironment: "staging",
    publicOrigin:
      "https://staging.connect.example",
    stagingOrigin:
      "https://staging.connect.example",
    deploymentIdentityValid: true,
    clerk: configuredClerk,
    policy: configuredPolicy,
    browserEvidence: {
      status: "disabled",
      code:
        "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_REQUIRED",
      verifiedScenarioCount: 0,
    },
    deploymentProvenance: {
      status: "disabled",
      code:
        "DEPLOYMENT_PROVENANCE_EVIDENCE_REQUIRED",
      verifiedAssetCount: 0,
    },
    ...overrides,
  };
}

test("keeps invitation acceptance disabled by default", () => {
  assert.deepEqual(
    evaluateTeamInvitationAcceptanceActivation(
      inspection({
        mode: undefined,
      }),
    ),
    {
      status: "blocked",
      code:
        "TEAM_INVITATION_ACCEPTANCE_ACTIVATION_BLOCKED",
      mode: "disabled",
      blockerCodes: [
        "TEAM_INVITATION_ACCEPTANCE_DISABLED",
      ],
    },
  );

  assert.deepEqual(
    evaluateTeamInvitationAcceptanceActivation(
      inspection({
        mode: "unexpected",
      }),
    ).blockerCodes,
    [
      "TEAM_INVITATION_ACCEPTANCE_CONFIGURATION_INVALID",
    ],
  );
});

test("allows staging E2E only on one remote HTTPS deployment identity", () => {
  assert.deepEqual(
    evaluateTeamInvitationAcceptanceActivation(
      inspection(),
    ),
    {
      status: "ready",
      code:
        "TEAM_INVITATION_ACCEPTANCE_ACTIVATION_VERIFIED",
      mode: "staging-e2e",
      blockerCodes: [],
    },
  );

  const invalidBoundaries = [
    {
      nodeEnvironment: "development",
    },
    {
      runtimeEnvironment: "production",
    },
    {
      publicOrigin: "http://localhost:3000",
      stagingOrigin:
        "http://localhost:3000",
    },
    {
      publicOrigin:
        "https://production.connect.example",
    },
    {
      deploymentIdentityValid: false,
    },
  ];

  for (const boundary of invalidBoundaries) {
    assert.deepEqual(
      evaluateTeamInvitationAcceptanceActivation(
        inspection(boundary),
      ).blockerCodes,
      [
        "TEAM_INVITATION_STAGING_CONFIGURATION_REQUIRED",
      ],
    );
  }
});

test("requires Clerk and invitation policy before either activation mode", () => {
  const report =
    evaluateTeamInvitationAcceptanceActivation(
      inspection({
        clerk: {
          status: "disabled",
          missingKeys: [
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
            "CLERK_SECRET_KEY",
          ],
        },
        policy: {
          status:
            "configuration-required",
          issues: [
            "TTL_HOURS_REQUIRED",
            "REREQUEST_POLICY_REQUIRED",
          ],
        },
      }),
    );

  assert.deepEqual(
    report.blockerCodes,
    [
      "CLERK_CONFIGURATION_REQUIRED",
      "TEAM_INVITATION_POLICY_REQUIRED",
    ],
  );
});

test("allows production only with distinct origins and both verified evidence reports", () => {
  assert.deepEqual(
    evaluateTeamInvitationAcceptanceActivation(
      inspection({
        mode: "production",
        runtimeEnvironment: "production",
        publicOrigin:
          "https://connect.example",
        browserEvidence:
          configuredBrowserEvidence,
        deploymentProvenance:
          configuredDeploymentProvenance,
      }),
    ),
    {
      status: "ready",
      code:
        "TEAM_INVITATION_ACCEPTANCE_ACTIVATION_VERIFIED",
      mode: "production",
      blockerCodes: [],
    },
  );
});

test("preserves bounded evidence failures and fails closed in production", () => {
  const report =
    evaluateTeamInvitationAcceptanceActivation(
      inspection({
        mode: "production",
        runtimeEnvironment: "staging",
        publicOrigin:
          "https://staging.connect.example",
        browserEvidence: {
          status: "expired",
          code:
            "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_EXPIRED",
          verifiedScenarioCount: 0,
        },
        deploymentProvenance: {
          status: "mismatch",
          code:
            "DEPLOYMENT_PROVENANCE_EVIDENCE_MISMATCH",
          verifiedAssetCount: 0,
        },
      }),
    );

  assert.deepEqual(
    report.blockerCodes,
    [
      "TEAM_INVITATION_PRODUCTION_CONFIGURATION_REQUIRED",
      "TEAM_INVITATION_BROWSER_E2E_EVIDENCE_EXPIRED",
      "DEPLOYMENT_PROVENANCE_EVIDENCE_MISMATCH",
    ],
  );
  assert.doesNotMatch(
    JSON.stringify(report),
    /secret|email|invitationKey|artifactDigest/i,
  );
});

test("runtime inspection rejects local, partial, and malformed activation configuration", () => {
  const report =
    inspectTeamInvitationAcceptanceActivation({
      NODE_ENV: "development",
      APP_RUNTIME_ENVIRONMENT: "staging",
      APP_PUBLIC_ORIGIN:
        "http://localhost:3000",
      APP_DEPLOYED_COMMIT_SHA:
        "not-a-commit",
      APP_RELEASE_ID:
        `connect_release_v1_${"a".repeat(64)}`,
      APP_DEPLOYMENT_ARTIFACT_DIGEST:
        `sha256:${"b".repeat(64)}`,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        "configured",
      CLERK_SECRET_KEY: "configured",
      TEAM_INVITATION_ACCEPTANCE_MODE:
        "staging-e2e",
      TEAM_INVITATION_TTL_HOURS: "72",
      TEAM_INVITATION_REREQUEST_POLICY:
        "after-terminal",
      TEAM_INVITATION_BROWSER_E2E_ORIGIN:
        "http://localhost:3000",
    });

  assert.equal(report.status, "blocked");
  assert.deepEqual(report.blockerCodes, [
    "TEAM_INVITATION_STAGING_CONFIGURATION_REQUIRED",
  ]);
});
