import assert from "node:assert/strict";
import test from "node:test";

import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";
import {
  deriveTeamMemberKey,
} from "../server/team/teamMemberKey.ts";
import {
  createTeamMembershipMutationService,
  TeamMembershipMutationError,
  TeamMembershipMutationInputError,
} from "../server/team/teamMembershipMutationService.ts";

const occurredAt =
  "2026-08-05T09:00:00.000Z";
const owner = {
  tenantId: 7,
  externalUserId: "owner-user",
  role: "owner",
  status: "active",
  version: 1,
};
const agent = {
  tenantId: 7,
  externalUserId: "agent-user",
  role: "agent",
  status: "active",
  version: 1,
};
const ownerSession = {
  tenantId: 7,
  displayName: "workspace",
  status: "active",
  role: "owner",
  externalUserId: "owner-user",
};

function createFixture(
  memberships = [
    owner,
    agent,
  ],
) {
  const calls = [];
  const repository = {
    async listByTenantId(
      tenantId,
    ) {
      calls.push({
        operation: "list",
        tenantId,
      });
      return memberships;
    },
    async changeRole(input) {
      calls.push({
        operation: "changeRole",
        input,
      });
      return {
        outcome: "updated",
        membership: {
          ...agent,
          role: input.toRole,
          version: 2,
        },
      };
    },
    async changeStatus(input) {
      calls.push({
        operation: "changeStatus",
        input,
      });
      return {
        outcome: "updated",
        membership: {
          ...agent,
          status: input.toStatus,
          version: 2,
        },
      };
    },
    async transferOwner(input) {
      calls.push({
        operation:
          "transferOwner",
        input,
      });
      return {
        outcome: "updated",
        formerOwner: {
          ...owner,
          role:
            input.formerOwnerRole,
          version: 2,
        },
        newOwner: {
          ...agent,
          role: "owner",
          version: 2,
        },
      };
    },
  };
  const service =
    createTeamMembershipMutationService(
      repository,
      () => occurredAt,
    );

  return {
    calls,
    repository,
    service,
  };
}

test("derives tenant, target, actor, and time on the server", async () => {
  const fixture =
    createFixture();
  const memberKey =
    deriveTeamMemberKey(
      7,
      "agent-user",
    );

  await fixture.service.changeRole(
    ownerSession,
    {
      memberKey,
      expectedVersion: 1,
      role: "viewer",
    },
  );
  await fixture.service.changeStatus(
    ownerSession,
    {
      memberKey,
      expectedVersion: 1,
      status: "suspended",
    },
  );

  for (
    const call of fixture.calls.filter(
      (item) =>
        item.operation !== "list",
    )
  ) {
    assert.equal(
      call.input.tenantId,
      7,
    );
    assert.equal(
      call.input
        .targetExternalUserId,
      "agent-user",
    );
    assert.equal(
      call.input
        .actorExternalUserId,
      "owner-user",
    );
    assert.equal(
      call.input.occurredAt,
      occurredAt,
    );
  }
});

test("transfers only the authenticated owner to one active target", async () => {
  const fixture =
    createFixture();

  await fixture.service.transferOwner(
    ownerSession,
    {
      newOwnerMemberKey:
        deriveTeamMemberKey(
          7,
          "agent-user",
        ),
      formerOwnerExpectedVersion: 1,
      newOwnerExpectedVersion: 1,
      formerOwnerRole: "manager",
    },
  );

  const call =
    fixture.calls.find(
      (item) =>
        item.operation ===
        "transferOwner",
    );

  assert.deepEqual(
    {
      former:
        call.input
          .formerOwnerExternalUserId,
      target:
        call.input
          .newOwnerExternalUserId,
      actor:
        call.input
          .actorExternalUserId,
    },
    {
      former: "owner-user",
      target: "agent-user",
      actor: "owner-user",
    },
  );
});

test("denies managers before membership repository access", async () => {
  const fixture =
    createFixture();

  await assert.rejects(
    fixture.service.changeRole(
      {
        ...ownerSession,
        role: "manager",
      },
      {
        memberKey:
          deriveTeamMemberKey(
            7,
            "agent-user",
          ),
        expectedVersion: 1,
        role: "viewer",
      },
    ),
    (error) =>
      error instanceof
        TenantSessionError &&
      error.code ===
        "PERMISSION_DENIED",
  );
  assert.deepEqual(
    fixture.calls,
    [],
  );
});

test("rejects forged, extended, owner, and stale-session input before mutation", async () => {
  const invalidInputs = [
    {
      memberKey:
        deriveTeamMemberKey(
          7,
          "agent-user",
        ),
      expectedVersion: 1,
      role: "owner",
    },
    {
      memberKey:
        deriveTeamMemberKey(
          7,
          "agent-user",
        ),
      expectedVersion: 1,
      role: "viewer",
      actorExternalUserId:
        "forged-owner",
    },
    {
      memberKey:
        deriveTeamMemberKey(
          8,
          "agent-user",
        ),
      expectedVersion: 1,
      role: "viewer",
    },
  ];

  for (
    const input of invalidInputs
  ) {
    const fixture =
      createFixture();

    await assert.rejects(
      fixture.service.changeRole(
        ownerSession,
        input,
      ),
      (error) =>
        error instanceof
          TeamMembershipMutationInputError ||
        (
          error instanceof
            TeamMembershipMutationError &&
          error.code === "NOT_FOUND"
        ),
    );
    assert.equal(
      fixture.calls.some(
        (call) =>
          call.operation ===
          "changeRole",
      ),
      false,
    );
  }

  const staleFixture =
    createFixture([
      {
        ...owner,
        role: "manager",
      },
      agent,
    ]);

  await assert.rejects(
    staleFixture.service.changeRole(
      ownerSession,
      {
        memberKey:
          deriveTeamMemberKey(
            7,
            "agent-user",
          ),
        expectedVersion: 1,
        role: "viewer",
      },
    ),
    (error) =>
      error instanceof
        TeamMembershipMutationError &&
      error.code ===
        "STALE_SESSION",
  );
});

test("maps state outcomes and sanitizes persistence failures", async () => {
  for (
    const [
      outcome,
      code,
    ] of [
      ["not-found", "NOT_FOUND"],
      ["conflict", "CONFLICT"],
      [
        "invalid-transition",
        "INVALID_TRANSITION",
      ],
    ]
  ) {
    const fixture =
      createFixture();
    fixture.repository.changeRole =
      async () => ({
        outcome,
        membership:
          outcome === "not-found"
            ? null
            : agent,
      });

    await assert.rejects(
      fixture.service.changeRole(
        ownerSession,
        {
          memberKey:
            deriveTeamMemberKey(
              7,
              "agent-user",
            ),
          expectedVersion: 1,
          role: "viewer",
        },
      ),
      (error) =>
        error instanceof
          TeamMembershipMutationError &&
        error.code === code,
    );
  }

  const failedFixture =
    createFixture();
  failedFixture.repository
    .changeRole =
    async () => {
      throw new Error(
        "PRIVATE_D1_DETAILS",
      );
    };

  await assert.rejects(
    failedFixture.service.changeRole(
      ownerSession,
      {
        memberKey:
          deriveTeamMemberKey(
            7,
            "agent-user",
          ),
        expectedVersion: 1,
        role: "viewer",
      },
    ),
    (error) =>
      error instanceof
        TeamMembershipMutationError &&
      error.code ===
        "PERSISTENCE_FAILED" &&
      !error.message.includes(
        "PRIVATE_D1_DETAILS",
      ),
  );
});
