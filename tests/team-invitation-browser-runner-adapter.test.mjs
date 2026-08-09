import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  buildTeamInvitationBrowserEvidence,
} from "../server/operations/teamInvitationBrowserEvidence.ts";
import {
  buildTeamInvitationBrowserRunnerReceipt,
  TeamInvitationBrowserRunnerAdapterError,
} from "../server/operations/teamInvitationBrowserRunnerAdapter.ts";
import {
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";

function fingerprint(value) {
  return `sha256:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

function proof(overrides = {}) {
  return {
    invitationCount: 1,
    membershipCount: 0,
    activeMembershipCount: 0,
    acceptanceAuditCount: 0,
    ...overrides,
  };
}

function observationFor(name) {
  switch (name) {
    case "sign-in-required":
      return {
        observed: "sign-in-required",
      };
    case "identity-verification-required":
      return {
        observed:
          "identity-verification-required",
      };
    case "acceptance-confirmed":
      return { observed: "accepted" };
    case "generic-unavailable-result":
      return {
        observed:
          "invitation-unavailable",
      };
    case "already-accepted-result":
      return {
        observed: "already-accepted",
      };
    case "private-fields-absent":
      return { exposedFieldCount: 0 };
    case "invitation-details-private":
      return { exposedDetailCount: 0 };
    case "initial-focus-order-valid":
      return { valid: true };
    case "submit-keyboard-operable":
      return { submittedWith: "keyboard" };
    case "status-announced":
      return {
        politeStatusObserved: true,
      };
    case "focus-visible":
      return { visible: true };
    default:
      throw new Error("UNKNOWN_ASSERTION");
  }
}

function databaseStateFor(scenarioName) {
  switch (scenarioName) {
    case "verified-matching-email-accepts":
      return {
        before: proof(),
        after: proof({
          membershipCount: 1,
          activeMembershipCount: 1,
          acceptanceAuditCount: 1,
        }),
      };
    case "identical-retry-idempotent": {
      const accepted = proof({
        membershipCount: 1,
        activeMembershipCount: 1,
        acceptanceAuditCount: 1,
      });

      return {
        before: accepted,
        after: accepted,
      };
    }
    default: {
      const stable = proof({
        membershipCount: 2,
        activeMembershipCount: 1,
      });

      return {
        before: stable,
        after: stable,
      };
    }
  }
}

function createInput() {
  return {
    origin:
      "https://staging.connect.test",
    releaseId:
      `connect_release_v1_${"a".repeat(64)}`,
    commitSha: "b".repeat(40),
    artifactDigest: fingerprint("artifact"),
    policy: {
      ttlHours: 72,
      reRequest: "after-terminal",
    },
    scenarios:
      teamInvitationBrowserScenarioRegistry.map(
        (scenario, scenarioIndex) => {
          const databaseState =
            databaseStateFor(
              scenario.name,
            );

          return {
            name: scenario.name,
            completedAt:
              `2026-08-09T10:0${scenarioIndex}:00.000Z`,
            runFingerprint: fingerprint(
              `run:${scenario.name}`,
            ),
            assertions:
              scenario.assertions.map(
                (assertion) =>
                  assertion.source === "browser"
                    ? {
                        name: assertion.name,
                        source: "browser",
                        observation:
                          observationFor(
                            assertion.name,
                          ),
                      }
                    : {
                        name: assertion.name,
                        source: "database",
                        before:
                          databaseState.before,
                        after:
                          databaseState.after,
                      },
              ),
          };
        },
      ),
  };
}

test("assembles one evidence-compatible receipt from all 22 independently proven assertions", () => {
  const receipt =
    buildTeamInvitationBrowserRunnerReceipt(
      createInput(),
    );
  const assertions =
    receipt.scenarios.flatMap(
      (scenario) => scenario.assertions,
    );

  assert.equal(receipt.scenarios.length, 7);
  assert.equal(assertions.length, 22);
  assert.equal(
    receipt.verifiedAt,
    "2026-08-09T10:06:00.000Z",
  );
  assert.equal(
    new Set(
      assertions.map(
        (assertion) =>
          assertion.outputDigest,
      ),
    ).size,
    22,
  );
  assert.doesNotMatch(
    JSON.stringify(receipt),
    /"(?:email|emailAddress|invitationKey|externalUserId|tenantId)":/i,
  );
  assert.equal(
    buildTeamInvitationBrowserEvidence(
      receipt,
      new Date(receipt.verifiedAt),
    ).scenarios.length,
    7,
  );
  assert.ok(Object.isFrozen(receipt));
  assert.ok(Object.isFrozen(receipt.scenarios));
  assert.ok(
    receipt.scenarios.every(
      (scenario) =>
        Object.isFrozen(scenario) &&
        Object.isFrozen(scenario.assertions),
    ),
  );
});

test("rejects missing, reordered, wrongly sourced, and extended runner input", () => {
  const missing = createInput();
  missing.scenarios[0].assertions.pop();
  const reordered = createInput();
  [
    reordered.scenarios[0],
    reordered.scenarios[1],
  ] = [
    reordered.scenarios[1],
    reordered.scenarios[0],
  ];
  const wrongSource = createInput();
  wrongSource.scenarios[0].assertions[0].source =
    "database";
  const extended = {
    ...createInput(),
    verifiedAt:
      "2026-08-09T10:06:00.000Z",
  };

  for (const input of [
    missing,
    reordered,
    wrongSource,
    extended,
  ]) {
    assert.throws(
      () =>
        buildTeamInvitationBrowserRunnerReceipt(
          input,
        ),
      (error) =>
        error instanceof
          TeamInvitationBrowserRunnerAdapterError &&
        error.code === "INVALID_INPUT",
    );
  }
});

test("fails closed when a browser observation does not prove its assertion", () => {
  const input = createInput();
  input.scenarios[0].assertions[0].observation =
    { observed: "accepted" };

  assert.throws(
    () =>
      buildTeamInvitationBrowserRunnerReceipt(
        input,
      ),
    (error) =>
      error instanceof
        TeamInvitationBrowserRunnerAdapterError &&
      error.code === "ASSERTION_FAILED",
  );
});

test("fails closed when a database transition does not prove its assertion", () => {
  const input = createInput();
  input.scenarios[2].assertions[1].after =
    proof({
      membershipCount: 2,
      activeMembershipCount: 2,
      acceptanceAuditCount: 1,
    });

  assert.throws(
    () =>
      buildTeamInvitationBrowserRunnerReceipt(
        input,
      ),
    (error) =>
      error instanceof
        TeamInvitationBrowserRunnerAdapterError &&
      error.code === "ASSERTION_FAILED",
  );
});

test("rejects duplicate run fingerprints and scenarios spanning more than 24 hours", () => {
  const duplicate = createInput();
  duplicate.scenarios[1].runFingerprint =
    duplicate.scenarios[0].runFingerprint;
  const stale = createInput();
  stale.scenarios[0].completedAt =
    "2026-08-08T09:00:00.000Z";

  for (const input of [duplicate, stale]) {
    assert.throws(
      () =>
        buildTeamInvitationBrowserRunnerReceipt(
          input,
        ),
      (error) =>
        error instanceof
          TeamInvitationBrowserRunnerAdapterError &&
        error.code === "INVALID_INPUT",
    );
  }
});
