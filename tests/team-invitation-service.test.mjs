import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveTeamInvitationRequestKey,
} from "../server/team/teamInvitationKey.ts";
import {
  createUnavailableTeamInvitationProvider,
} from "../server/team/teamInvitationProvider.ts";
import {
  createTeamInvitationService,
  TeamInvitationError,
  TeamInvitationInputError,
} from "../server/team/teamInvitationService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const ownerSession = {
  tenantId: 7,
  displayName: "workspace",
  status: "active",
  role: "owner",
  externalUserId: "owner-user",
};
const managerSession = {
  ...ownerSession,
  role: "manager",
  externalUserId: "manager-user",
};
const requestedAt =
  "2026-08-05T10:00:00.000Z";

function fixture(
  providerResult = {
    status: "submitted",
  },
) {
  const calls = [];
  const provider = {
    async invite(command) {
      calls.push(command);

      if (
        providerResult instanceof
        Error
      ) {
        throw providerResult;
      }

      return providerResult;
    },
  };
  const service =
    createTeamInvitationService(
      provider,
      () => requestedAt,
    );

  return {
    calls,
    service,
  };
}

test("submits a normalized non-owner invitation with a deterministic request key", async () => {
  const testFixture = fixture();

  assert.deepEqual(
    await testFixture.service.invite(
      managerSession,
      {
        email:
          "  TEAM.MEMBER@EXAMPLE.COM ",
        role: "agent",
      },
    ),
    {
      status: "submitted",
    },
  );
  assert.equal(
    testFixture.calls.length,
    1,
  );
  assert.deepEqual(
    testFixture.calls[0],
    {
      requestKey:
        await deriveTeamInvitationRequestKey(
          {
            tenantId: 7,
            email:
              "team.member@example.com",
          },
        ),
      tenantId: 7,
      inviterExternalUserId:
        "manager-user",
      email:
        "team.member@example.com",
      role: "agent",
      requestedAt,
    },
  );
  assert.match(
    testFixture.calls[0]
      .requestKey,
    /^team_invitation_request_v1_[0-9a-f]{64}$/,
  );
});

test("returns an idempotent already-pending provider outcome", async () => {
  const testFixture =
    fixture({
      status:
        "already-pending",
    });

  assert.deepEqual(
    await testFixture.service.invite(
      ownerSession,
      {
        email:
          "member@example.com",
        role: "viewer",
      },
    ),
    {
      status:
        "already-pending",
    },
  );
});

test("fails closed while the invitation provider is unavailable", async () => {
  const service =
    createTeamInvitationService(
      createUnavailableTeamInvitationProvider(),
      () => requestedAt,
    );

  await assert.rejects(
    service.invite(
      ownerSession,
      {
        email:
          "member@example.com",
        role: "manager",
      },
    ),
    (error) =>
      error instanceof
        TeamInvitationError &&
      error.code ===
        "PROVIDER_UNAVAILABLE",
  );
});

test("rejects invalid input before calling the provider", async () => {
  const invalidInputs = [
    null,
    {},
    {
      email:
        "member@example.com",
      role: "owner",
    },
    {
      email: "not-an-email",
      role: "agent",
    },
    {
      email:
        "member@example.com",
      role: "agent",
      tenantId: 7,
    },
  ];

  for (
    const input of invalidInputs
  ) {
    const testFixture =
      fixture();

    await assert.rejects(
      testFixture.service.invite(
        ownerSession,
        input,
      ),
      TeamInvitationInputError,
    );
    assert.deepEqual(
      testFixture.calls,
      [],
    );
  }
});

test("requires team management permission before validating input or calling the provider", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.invite(
      {
        ...ownerSession,
        role: "viewer",
      },
      {},
    ),
    (error) =>
      error instanceof
        TenantSessionError &&
      error.code ===
        "PERMISSION_DENIED",
  );
  assert.deepEqual(
    testFixture.calls,
    [],
  );
});

test("rejects malformed, excessive, and failed provider responses", async () => {
  const responses = [
    null,
    {},
    {
      status: "submitted",
      providerId: "private",
    },
    {
      status: "accepted",
    },
    new Error("provider detail"),
  ];

  for (
    const response of responses
  ) {
    const testFixture =
      fixture(response);

    await assert.rejects(
      testFixture.service.invite(
        ownerSession,
        {
          email:
            "member@example.com",
          role: "manager",
        },
      ),
      (error) =>
        error instanceof
          TeamInvitationError &&
        error.code ===
          "PROVIDER_FAILED",
    );
  }
});

test("rejects a non-canonical server clock before calling the provider", async () => {
  const calls = [];
  const service =
    createTeamInvitationService(
      {
        async invite(command) {
          calls.push(command);
          return {
            status:
              "submitted",
          };
        },
      },
      () =>
        "2026-08-05T10:00:00Z",
    );

  await assert.rejects(
    service.invite(
      ownerSession,
      {
        email:
          "member@example.com",
        role: "manager",
      },
    ),
    (error) =>
      error instanceof
        TeamInvitationError &&
      error.code ===
        "PROVIDER_FAILED",
  );
  assert.deepEqual(calls, []);
});

test("derives the same key for canonical email variants and isolates tenants", async () => {
  const normalized =
    await deriveTeamInvitationRequestKey(
      {
        tenantId: 7,
        email:
          "member@example.com",
      },
    );
  const variant =
    await deriveTeamInvitationRequestKey(
      {
        tenantId: 7,
        email:
          " MEMBER@EXAMPLE.COM ",
      },
    );
  const otherTenant =
    await deriveTeamInvitationRequestKey(
      {
        tenantId: 8,
        email:
          "member@example.com",
      },
    );

  assert.equal(
    normalized,
    variant,
  );
  assert.notEqual(
    normalized,
    otherTenant,
  );
});
