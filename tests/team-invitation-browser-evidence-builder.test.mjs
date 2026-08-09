import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  inspectTeamInvitationBrowserEvidence,
  requiredTeamInvitationBrowserScenarios,
} from "../server/operations/teamInvitationBrowserEvidence.ts";
import {
  deriveTeamInvitationBrowserScenarioOutputDigest,
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";
import {
  createTeamInvitationBrowserEvidenceFromReceipt,
} from "../scripts/create-team-invitation-browser-evidence.mjs";

const verifiedAt =
  "2026-08-09T10:00:00.000Z";
const releaseId =
  `connect_release_v1_${"a".repeat(64)}`;
const commitSha = "b".repeat(40);
const artifactDigest =
  `sha256:${"c".repeat(64)}`;

function digest(value) {
  return `sha256:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

function receipt(overrides = {}) {
  return {
    schemaVersion: 1,
    verifiedAt,
    environment: "staging",
    origin:
      "https://staging.connect.example",
    releaseId,
    commitSha,
    artifactDigest,
    policy: {
      ttlHours: 72,
      reRequest: "after-terminal",
    },
    scenarios:
      requiredTeamInvitationBrowserScenarios.map(
        (name, index) => {
          const definition =
            teamInvitationBrowserScenarioRegistry[
              index
            ];
          const assertions =
            definition.assertions.map(
              (assertion, assertionIndex) => ({
                name: assertion.name,
                source: assertion.source,
                status: "passed",
                outputDigest: digest(
                  `${name}:${assertionIndex}`,
                ),
              }),
            );

          return {
            name,
            status: "passed",
            completedAt:
              "2026-08-09T09:59:00.000Z",
            runFingerprint:
              `sha256:${String(index).repeat(64)}`,
            outputDigest:
              deriveTeamInvitationBrowserScenarioOutputDigest(
                definition.name,
                assertions,
              ),
            assertions,
          };
        },
      ),
    ...overrides,
  };
}

function manifest(overrides = {}) {
  return {
    schemaVersion: 1,
    releaseId,
    commitSha,
    ...overrides,
  };
}

function collectKeys(value) {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectKeys);
  }

  return [
    ...Object.keys(value),
    ...Object.values(value)
      .flatMap(collectKeys),
  ];
}

test("builds one short-lived evidence document from a complete browser receipt", () => {
  const evidence =
    createTeamInvitationBrowserEvidenceFromReceipt({
      receipt: receipt(),
      releaseManifest: manifest(),
      now: new Date(verifiedAt),
    });

  assert.deepEqual(
    Object.keys(evidence),
    [
      "schemaVersion",
      "verifiedAt",
      "expiresAt",
      "environment",
      "origin",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "policyDigest",
      "scenarios",
      "evidenceDigest",
    ],
  );
  assert.equal(
    evidence.expiresAt,
    "2026-08-10T10:00:00.000Z",
  );
  assert.equal(
    evidence.scenarios.length,
    7,
  );
  assert.deepEqual(
    Object.keys(evidence.scenarios[0]),
    [
      "name",
      "status",
      "completedAt",
      "runFingerprint",
      "outputDigest",
    ],
  );
  assert.deepEqual(
    collectKeys(evidence).filter(
      (key) =>
        /^(email|tenantId|externalUserId|invitationKey)$/i.test(
          key,
        ),
    ),
    [],
  );

  assert.equal(
    inspectTeamInvitationBrowserEvidence(
      {
        APP_DEPLOYED_COMMIT_SHA:
          commitSha,
        APP_RELEASE_ID: releaseId,
        APP_DEPLOYMENT_ARTIFACT_DIGEST:
          artifactDigest,
        TEAM_INVITATION_TTL_HOURS:
          "72",
        TEAM_INVITATION_REREQUEST_POLICY:
          "after-terminal",
        TEAM_INVITATION_BROWSER_E2E_ORIGIN:
          evidence.origin,
        TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON:
          JSON.stringify(evidence),
      },
      new Date(verifiedAt),
    ).status,
    "configured",
  );
});

test("rejects receipt extensions and policy extensions instead of stripping them", () => {
  assert.throws(
    () =>
      createTeamInvitationBrowserEvidenceFromReceipt({
        receipt: receipt({
          email: "forbidden",
        }),
        releaseManifest: manifest(),
        now: new Date(verifiedAt),
      }),
    /TEAM_INVITATION_BROWSER_E2E_RECEIPT_INVALID/,
  );

  assert.throws(
    () =>
      createTeamInvitationBrowserEvidenceFromReceipt({
        receipt: receipt({
          policy: {
            ttlHours: 72,
            reRequest:
              "after-terminal",
            defaulted: true,
          },
        }),
        releaseManifest: manifest(),
        now: new Date(verifiedAt),
      }),
    /TEAM_INVITATION_BROWSER_E2E_RECEIPT_INVALID/,
  );
});

test("rejects stale, future, duplicate, and incomplete browser runs", () => {
  const scenarios = receipt().scenarios;
  const cases = [
    {
      now:
        new Date(
          "2026-08-10T10:00:00.000Z",
        ),
    },
    {
      receipt: receipt({
        verifiedAt:
          "2026-08-09T11:00:00.000Z",
      }),
      now: new Date(verifiedAt),
    },
    {
      receipt: receipt({
        scenarios:
          scenarios.map(
            (scenario, index) =>
              index === 1
                ? {
                    ...scenario,
                    runFingerprint:
                      scenarios[0]
                        .runFingerprint,
                  }
                : scenario,
          ),
      }),
    },
    {
      receipt: receipt({
        scenarios:
          scenarios.slice(0, 6),
      }),
    },
  ];

  for (const candidate of cases) {
    assert.throws(
      () =>
        createTeamInvitationBrowserEvidenceFromReceipt({
          receipt:
            candidate.receipt ??
            receipt(),
          releaseManifest:
            manifest(),
          now:
            candidate.now ??
            new Date(verifiedAt),
        }),
      /TEAM_INVITATION_BROWSER_E2E_RECEIPT_INVALID/,
    );
  }
});

test("requires every canonical browser and database assertion with bound output", () => {
  const scenarios = receipt().scenarios;
  const missingAssertion =
    scenarios.map(
      (scenario, index) =>
        index === 0
          ? {
              ...scenario,
              assertions:
                scenario.assertions.slice(1),
            }
          : scenario,
    );
  const wrongSource =
    scenarios.map(
      (scenario, index) =>
        index === 1
          ? {
              ...scenario,
              assertions:
                scenario.assertions.map(
                  (assertion, assertionIndex) =>
                    assertionIndex === 0
                      ? {
                          ...assertion,
                          source: "database",
                        }
                      : assertion,
                ),
            }
          : scenario,
    );
  const unboundOutput =
    scenarios.map(
      (scenario, index) =>
        index === 2
          ? {
              ...scenario,
              outputDigest:
                digest("unbound-output"),
            }
          : scenario,
    );
  const duplicatedAssertionDigest =
    scenarios.map(
      (scenario, index) => {
        if (index !== 3) {
          return scenario;
        }

        const assertions =
          scenario.assertions.map(
            (assertion, assertionIndex) =>
              assertionIndex === 0
                ? {
                    ...assertion,
                    outputDigest:
                      scenarios[0]
                        .assertions[0]
                        .outputDigest,
                  }
                : assertion,
          );

        return {
          ...scenario,
          assertions,
          outputDigest:
            deriveTeamInvitationBrowserScenarioOutputDigest(
              scenario.name,
              assertions,
            ),
        };
      },
    );

  for (
    const candidate of [
      missingAssertion,
      wrongSource,
      unboundOutput,
      duplicatedAssertionDigest,
    ]
  ) {
    assert.throws(
      () =>
        createTeamInvitationBrowserEvidenceFromReceipt({
          receipt: receipt({
            scenarios: candidate,
          }),
          releaseManifest: manifest(),
          now: new Date(verifiedAt),
        }),
      /TEAM_INVITATION_BROWSER_E2E_RECEIPT_INVALID/,
    );
  }
});

test("rejects a browser receipt from a different committed release", () => {
  assert.throws(
    () =>
      createTeamInvitationBrowserEvidenceFromReceipt({
        receipt: receipt(),
        releaseManifest: manifest({
          commitSha:
            "f".repeat(40),
        }),
        now: new Date(verifiedAt),
      }),
    /TEAM_INVITATION_BROWSER_E2E_RELEASE_MISMATCH/,
  );
});
