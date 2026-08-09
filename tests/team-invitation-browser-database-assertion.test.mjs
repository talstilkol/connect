import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTeamInvitationBrowserDatabaseAssertion,
  TeamInvitationBrowserDatabaseAssertionError,
} from "../server/operations/teamInvitationBrowserDatabaseAssertion.ts";

function proof(overrides = {}) {
  return {
    invitationCount: 1,
    membershipCount: 0,
    activeMembershipCount: 0,
    acceptanceAuditCount: 0,
    ...overrides,
  };
}

test("builds a bounded rejection proof only when all database counts remain unchanged", () => {
  const result =
    buildTeamInvitationBrowserDatabaseAssertion({
      scenarioName:
        "unauthenticated-user-rejected",
      assertionName:
        "membership-count-unchanged",
      before: proof({
        membershipCount: 8,
        activeMembershipCount: 7,
      }),
      after: proof({
        membershipCount: 8,
        activeMembershipCount: 7,
      }),
    });

  assert.deepEqual(
    Object.keys(result),
    [
      "name",
      "source",
      "status",
      "outputDigest",
    ],
  );
  assert.deepEqual(
    {
      ...result,
      outputDigest: "bounded",
    },
    {
      name:
        "membership-count-unchanged",
      source: "database",
      status: "passed",
      outputDigest: "bounded",
    },
  );
  assert.match(
    result.outputDigest,
    /^sha256:[a-f0-9]{64}$/,
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /invitationCount|membershipCount|tenantId|externalUserId|email/i,
  );
});

test("proves one membership and one acceptance audit creation independently", () => {
  const before = proof();
  const after = proof({
    membershipCount: 1,
    activeMembershipCount: 1,
    acceptanceAuditCount: 1,
  });
  const membership =
    buildTeamInvitationBrowserDatabaseAssertion({
      scenarioName:
        "verified-matching-email-accepts",
      assertionName:
        "membership-created-once",
      before,
      after,
    });
  const acceptance =
    buildTeamInvitationBrowserDatabaseAssertion({
      scenarioName:
        "verified-matching-email-accepts",
      assertionName:
        "acceptance-audit-created-once",
      before,
      after,
    });

  assert.equal(
    membership.status,
    "passed",
  );
  assert.equal(
    acceptance.status,
    "passed",
  );
  assert.notEqual(
    membership.outputDigest,
    acceptance.outputDigest,
  );
});

test("proves an idempotent retry only after an existing acceptance remains singular", () => {
  const accepted = proof({
    membershipCount: 1,
    activeMembershipCount: 1,
    acceptanceAuditCount: 1,
  });
  const membership =
    buildTeamInvitationBrowserDatabaseAssertion({
      scenarioName:
        "identical-retry-idempotent",
      assertionName:
        "membership-count-unchanged",
      before: accepted,
      after: accepted,
    });
  const acceptance =
    buildTeamInvitationBrowserDatabaseAssertion({
      scenarioName:
        "identical-retry-idempotent",
      assertionName:
        "acceptance-audit-count-unchanged",
      before: accepted,
      after: accepted,
    });

  assert.notEqual(
    membership.outputDigest,
    acceptance.outputDigest,
  );
});

test("rejects browser assertions, unknown assertions, and extended proof input", () => {
  const inputs = [
    null,
    {
      scenarioName:
        "verified-matching-email-accepts",
      assertionName:
        "acceptance-confirmed",
      before: proof(),
      after: proof(),
    },
    {
      scenarioName:
        "verified-matching-email-accepts",
      assertionName: "unknown",
      before: proof(),
      after: proof(),
    },
    {
      scenarioName:
        "verified-matching-email-accepts",
      assertionName:
        "membership-created-once",
      before: {
        ...proof(),
        tenantId: 1,
      },
      after: proof(),
    },
  ];

  for (const input of inputs) {
    assert.throws(
      () =>
        buildTeamInvitationBrowserDatabaseAssertion(
          input,
        ),
      (error) =>
        error instanceof
          TeamInvitationBrowserDatabaseAssertionError &&
        error.code === "INVALID_INPUT",
    );
  }
});

test("fails the assertion for a missing invitation or an unsafe state transition", () => {
  const cases = [
    {
      scenarioName:
        "mismatched-email-remains-private",
      assertionName:
        "membership-count-unchanged",
      before: proof({
        invitationCount: 0,
      }),
      after: proof({
        invitationCount: 0,
      }),
    },
    {
      scenarioName:
        "verified-matching-email-accepts",
      assertionName:
        "membership-created-once",
      before: proof(),
      after: proof({
        membershipCount: 2,
        activeMembershipCount: 2,
      }),
    },
    {
      scenarioName:
        "identical-retry-idempotent",
      assertionName:
        "acceptance-audit-count-unchanged",
      before: proof(),
      after: proof(),
    },
  ];

  for (const input of cases) {
    assert.throws(
      () =>
        buildTeamInvitationBrowserDatabaseAssertion(
          input,
        ),
      (error) =>
        error instanceof
          TeamInvitationBrowserDatabaseAssertionError &&
        error.code ===
          "ASSERTION_FAILED",
    );
  }
});
