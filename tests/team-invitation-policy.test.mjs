import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectTeamInvitationPolicy,
  requireTeamInvitationPolicy,
  TeamInvitationPolicyConfigurationError,
} from "../server/team/teamInvitationPolicy.ts";

test("accepts one explicit invitation TTL and re-request policy", () => {
  assert.deepEqual(
    inspectTeamInvitationPolicy({
      TEAM_INVITATION_TTL_HOURS:
        "168",
      TEAM_INVITATION_REREQUEST_POLICY:
        "after-terminal",
    }),
    {
      status: "configured",
      policy: {
        ttlHours: 168,
        reRequest:
          "after-terminal",
      },
    },
  );
  assert.deepEqual(
    requireTeamInvitationPolicy({
      TEAM_INVITATION_TTL_HOURS:
        "24",
      TEAM_INVITATION_REREQUEST_POLICY:
        "disabled",
    }),
    {
      ttlHours: 24,
      reRequest: "disabled",
    },
  );
});

test("requires both invitation policy decisions without defaults", () => {
  assert.deepEqual(
    inspectTeamInvitationPolicy({}),
    {
      status:
        "configuration-required",
      issues: [
        "TTL_HOURS_REQUIRED",
        "REREQUEST_POLICY_REQUIRED",
      ],
    },
  );
});

test("rejects malformed and out-of-range invitation policies", () => {
  const scenarios = [
    {
      environment: {
        TEAM_INVITATION_TTL_HOURS:
          "0",
        TEAM_INVITATION_REREQUEST_POLICY:
          "after-terminal",
      },
      issue: "TTL_HOURS_INVALID",
    },
    {
      environment: {
        TEAM_INVITATION_TTL_HOURS:
          "8761",
        TEAM_INVITATION_REREQUEST_POLICY:
          "after-terminal",
      },
      issue: "TTL_HOURS_INVALID",
    },
    {
      environment: {
        TEAM_INVITATION_TTL_HOURS:
          "168",
        TEAM_INVITATION_REREQUEST_POLICY:
          "automatic",
      },
      issue:
        "REREQUEST_POLICY_INVALID",
    },
  ];

  for (const scenario of scenarios) {
    const inspection =
      inspectTeamInvitationPolicy(
        scenario.environment,
      );

    assert.equal(
      inspection.status,
      "configuration-required",
    );
    assert.equal(
      inspection.issues.includes(
        scenario.issue,
      ),
      true,
    );
  }
});

test("fails closed when required invitation policy is absent", () => {
  assert.throws(
    () =>
      requireTeamInvitationPolicy(
        {},
      ),
    TeamInvitationPolicyConfigurationError,
  );
});
