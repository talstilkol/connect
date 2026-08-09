import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveTeamInvitationBrowserScenarioOutputDigest,
  findTeamInvitationBrowserScenario,
  requiredTeamInvitationBrowserScenarios,
  teamInvitationBrowserScenarioRegistry,
} from "../server/operations/teamInvitationBrowserScenarioRegistry.ts";

test("defines seven unique invitation scenarios with exact ordered assertions", () => {
  assert.equal(
    teamInvitationBrowserScenarioRegistry.length,
    7,
  );
  assert.deepEqual(
    teamInvitationBrowserScenarioRegistry.map(
      (scenario) => scenario.name,
    ),
    requiredTeamInvitationBrowserScenarios,
  );
  assert.equal(
    new Set(
      requiredTeamInvitationBrowserScenarios,
    ).size,
    7,
  );

  const assertionCount =
    teamInvitationBrowserScenarioRegistry.reduce(
      (total, scenario) => {
        assert.equal(
          new Set(
            scenario.assertions.map(
              (assertion) =>
                assertion.name,
            ),
          ).size,
          scenario.assertions.length,
        );
        assert.equal(
          scenario.assertions.length >= 3,
          true,
        );

        return (
          total +
          scenario.assertions.length
        );
      },
      0,
    );

  assert.equal(assertionCount, 22);
});

test("requires database evidence for every state-changing or rejection scenario", () => {
  for (
    const scenario of
      teamInvitationBrowserScenarioRegistry.slice(
        0,
        6,
      )
  ) {
    assert.equal(
      scenario.assertions.some(
        (assertion) =>
          assertion.source ===
          "database",
      ),
      true,
    );
  }

  assert.equal(
    teamInvitationBrowserScenarioRegistry[6]
      .assertions.every(
        (assertion) =>
          assertion.source ===
          "browser",
      ),
    true,
  );
});

test("binds the scenario digest to ordered assertion names, sources, statuses, and outputs", () => {
  const scenario =
    teamInvitationBrowserScenarioRegistry[0];
  const assertions =
    scenario.assertions.map(
      (assertion, index) => ({
        ...assertion,
        status: "passed",
        outputDigest:
          `sha256:${String(index).repeat(64)}`,
      }));
  const digest =
    deriveTeamInvitationBrowserScenarioOutputDigest(
      scenario.name,
      assertions,
    );

  assert.match(
    digest,
    /^sha256:[a-f0-9]{64}$/,
  );
  assert.notEqual(
    digest,
    deriveTeamInvitationBrowserScenarioOutputDigest(
      scenario.name,
      [...assertions].reverse(),
    ),
  );
  assert.equal(
    findTeamInvitationBrowserScenario(
      scenario.name,
    ),
    scenario,
  );
  assert.equal(
    findTeamInvitationBrowserScenario(
      "unknown",
    ),
    null,
  );
});
