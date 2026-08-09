import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  deriveTeamInvitationPolicyDigest,
} from "../server/operations/teamInvitationBrowserEvidence.ts";
import {
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";
import {
  createTeamInvitationBrowserCaseInventory,
} from "../scripts/create-team-invitation-browser-case-inventory.mjs";

const now = new Date(
  "2026-08-09T12:00:00.000Z",
);
const releaseManifest = Object.freeze({
  schemaVersion: 1,
  releaseId:
    `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
});

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function cases() {
  return teamInvitationBrowserScenarioRegistry.map(
    (scenario) => {
      const scenarioCase = {
        name: scenario.name,
        invitationKey:
          `team_invitation_v1_${sha256(
            `case:${scenario.name}`,
          )}`,
      };
      const requiresDatabase =
        scenario.assertions.some(
          (assertion) =>
            assertion.source === "database",
        );

      if (!requiresDatabase) {
        return scenarioCase;
      }

      return {
        ...scenarioCase,
        proofScope:
          scenario.name ===
          "unauthenticated-user-rejected"
            ? { kind: "tenant-total" }
            : {
                kind: "external-user",
                externalUserId:
                  `staging_identity_${sha256(
                    scenario.name,
                  )}`,
              },
      };
    },
  );
}

function environment(overrides = {}) {
  return {
    APP_DEPLOYMENT_ARTIFACT_DIGEST:
      `sha256:${"c".repeat(64)}`,
    TEAM_INVITATION_BROWSER_E2E_ORIGIN:
      "https://staging.connect.example",
    TEAM_INVITATION_TTL_HOURS: "72",
    TEAM_INVITATION_REREQUEST_POLICY:
      "after-terminal",
    TEAM_INVITATION_BROWSER_CASE_INPUT_JSON:
      JSON.stringify({
        schemaVersion: 1,
        cases: cases(),
      }),
    ...overrides,
  };
}

test("creates a release-bound secret inventory without accepting timestamps", () => {
  const inventory =
    createTeamInvitationBrowserCaseInventory({
      environment: environment(),
      releaseManifest,
      now,
    });

  assert.deepEqual(
    Object.keys(inventory),
    [
      "schemaVersion",
      "preparedAt",
      "expiresAt",
      "environment",
      "origin",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "policyDigest",
      "cases",
    ],
  );
  assert.equal(
    inventory.releaseId,
    releaseManifest.releaseId,
  );
  assert.equal(
    inventory.expiresAt,
    "2026-08-09T13:00:00.000Z",
  );
  assert.equal(
    inventory.policyDigest,
    deriveTeamInvitationPolicyDigest({
      ttlHours: 72,
      reRequest: "after-terminal",
    }),
  );
});

test("rejects extended, malformed, or incomplete secret case input", () => {
  const invalidInputs = [
    "not-json",
    JSON.stringify({
      schemaVersion: 1,
      cases: cases(),
      preparedAt:
        "2026-08-09T12:00:00.000Z",
    }),
    JSON.stringify({
      schemaVersion: 1,
      cases: cases().slice(1),
    }),
  ];

  for (const caseInput of invalidInputs) {
    assert.throws(
      () =>
        createTeamInvitationBrowserCaseInventory({
          environment: environment({
            TEAM_INVITATION_BROWSER_CASE_INPUT_JSON:
              caseInput,
          }),
          releaseManifest,
          now,
        }),
      /TEAM_INVITATION_BROWSER_CASE_INPUT_INVALID|INVENTORY_INVALID/,
    );
  }
});

test("rejects an invalid deployment digest or policy before inventory creation", () => {
  for (const overrides of [
    {
      APP_DEPLOYMENT_ARTIFACT_DIGEST:
        "invalid",
    },
    {
      TEAM_INVITATION_TTL_HOURS: "0",
    },
    {
      TEAM_INVITATION_REREQUEST_POLICY:
        "unknown",
    },
  ]) {
    assert.throws(
      () =>
        createTeamInvitationBrowserCaseInventory({
          environment: environment(overrides),
          releaseManifest,
          now,
        }),
      /TEAM_INVITATION_BROWSER_CASE_INVENTORY_CONFIGURATION_INVALID/,
    );
  }
});
