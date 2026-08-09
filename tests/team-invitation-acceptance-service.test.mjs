import assert from "node:assert/strict";
import test from "node:test";

import {
  createTeamInvitationAcceptanceService,
  TeamInvitationAcceptanceServiceError,
} from "../server/team/teamInvitationAcceptanceService.ts";

const invitationKey =
  `team_invitation_v1_${"a".repeat(64)}`;
const acceptedAt =
  "2026-08-06T10:00:00.000Z";

function fixture({
  verification = {
    status: "verified",
    externalUserId:
      "accepted-user",
    verifiedEmail:
      "MEMBER@EXAMPLE.COM",
  },
  outcome = "created",
  verifierError,
  repositoryError,
} = {}) {
  const calls = [];
  const verifier = {
    async verify(proof) {
      calls.push({
        operation: "verify",
        proof,
      });

      if (verifierError) {
        throw verifierError;
      }

      return verification;
    },
  };
  const repository = {
    async accept(input) {
      calls.push({
        operation: "accept",
        input,
      });

      if (repositoryError) {
        throw repositoryError;
      }

      return {
        outcome,
        invitation: null,
        membership: null,
      };
    },
  };

  return {
    calls,
    service:
      createTeamInvitationAcceptanceService(
        repository,
        verifier,
        {
          now() {
            return new Date(
              acceptedAt,
            );
          },
        },
      ),
  };
}

test("verifies identity before persisting a bounded acceptance command", async () => {
  const testFixture =
    fixture();
  const proof = {
    providerToken:
      "opaque-test-proof",
  };

  assert.deepEqual(
    await testFixture.service
      .accept({
        invitationKey,
        proof,
      }),
    {
      status: "accepted",
    },
  );
  assert.deepEqual(
    testFixture.calls,
    [
      {
        operation: "verify",
        proof,
      },
      {
        operation: "accept",
        input: {
          invitationKey,
          externalUserId:
            "accepted-user",
          verifiedEmail:
            "member@example.com",
          acceptedAt,
        },
      },
    ],
  );
});

test("rejects malformed input before identity access", async () => {
  const invalidInputs = [
    null,
    {},
    {
      invitationKey,
    },
    {
      invitationKey:
        "invalid",
      proof: "proof",
    },
    {
      invitationKey,
      proof: null,
    },
    {
      invitationKey,
      proof: "proof",
      tenantId: 7,
    },
  ];

  for (
    const input of invalidInputs
  ) {
    const testFixture =
      fixture();

    await assert.rejects(
      testFixture.service
        .accept(input),
      (error) =>
        error instanceof
          TeamInvitationAcceptanceServiceError &&
        error.code ===
          "INVALID_INPUT",
    );
    assert.equal(
      testFixture.calls.length,
      0,
    );
  }
});

test("fails closed for rejected, unavailable, thrown, and malformed identity verification", async () => {
  const cases = [
    {
      verification: {
        status: "unauthenticated",
      },
      code:
        "AUTHENTICATION_REQUIRED",
    },
    {
      verification: {
        status: "rejected",
      },
      code:
        "IDENTITY_REJECTED",
    },
    {
      verification: {
        status: "unavailable",
      },
      code:
        "IDENTITY_UNAVAILABLE",
    },
    {
      verifierError:
        new Error(
          "private provider failure",
        ),
      code:
        "IDENTITY_UNAVAILABLE",
    },
    {
      verification: {
        status: "verified",
        externalUserId:
          "accepted-user",
      },
      code:
        "IDENTITY_UNAVAILABLE",
    },
  ];

  for (
    const testCase of cases
  ) {
    const testFixture =
      fixture(testCase);

    await assert.rejects(
      testFixture.service
        .accept({
          invitationKey,
          proof:
            "opaque-test-proof",
        }),
      (error) =>
        error instanceof
          TeamInvitationAcceptanceServiceError &&
        error.code ===
          testCase.code &&
        !error.message.includes(
          "private",
        ),
    );
    assert.equal(
      testFixture.calls.some(
        (call) =>
          call.operation ===
          "accept",
      ),
      false,
    );
  }
});

test("maps repository outcomes and failures to bounded acceptance results", async () => {
  const cases = [
    {
      outcome: "unchanged",
      expectedStatus:
        "already-accepted",
    },
    {
      outcome: "not-found",
      code:
        "INVITATION_NOT_FOUND",
    },
    {
      outcome:
        "email-mismatch",
      code: "EMAIL_MISMATCH",
    },
    {
      outcome:
        "invalid-transition",
      code:
        "INVITATION_INELIGIBLE",
    },
    {
      outcome: "conflict",
      code: "CONFLICT",
    },
    {
      repositoryError:
        new Error(
          "private D1 failure",
        ),
      code:
        "PERSISTENCE_UNAVAILABLE",
    },
  ];

  for (
    const testCase of cases
  ) {
    const testFixture =
      fixture(testCase);
    const promise =
      testFixture.service.accept({
        invitationKey,
        proof:
          "opaque-test-proof",
      });

    if (
      testCase.expectedStatus
    ) {
      assert.deepEqual(
        await promise,
        {
          status:
            testCase
              .expectedStatus,
        },
      );
    } else {
      await assert.rejects(
        promise,
        (error) =>
          error instanceof
            TeamInvitationAcceptanceServiceError &&
          error.code ===
            testCase.code &&
          !error.message.includes(
            "private",
          ),
      );
    }
  }
});
