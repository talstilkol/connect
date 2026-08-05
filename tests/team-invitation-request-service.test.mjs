import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationKey,
} from "../server/team/teamInvitationKey.ts";
import {
  createTeamInvitationRequestService,
  TeamInvitationRequestError,
  TeamInvitationRequestInputError,
} from "../server/team/teamInvitationRequestService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";

const session = {
  tenantId: 7,
  displayName: "workspace",
  status: "active",
  role: "owner",
  externalUserId: "owner-user",
};
const input = {
  email:
    "member@example.com",
  role: "agent",
};
const requestedAt =
  "2026-08-05T10:00:00.000Z";

async function invitation(
  overrides = {},
) {
  return {
    invitationKey:
      await deriveTeamInvitationKey({
        tenantId: 7,
        email: input.email,
      }),
    tenantId: 7,
    normalizedEmail:
      input.email,
    role: "agent",
    status: "pending",
    version: 1,
    invitedByExternalUserId:
      "owner-user",
    lastActorExternalUserId:
      "owner-user",
    requestedAt,
    expiresAt:
      "2026-08-12T10:00:00.000Z",
    updatedAt: requestedAt,
    ...overrides,
  };
}

function createFixture({
  current = null,
  requestResult,
  transitionResult,
  queueError,
  policy = {
    ttlHours: 168,
    reRequest:
      "after-terminal",
  },
} = {}) {
  const calls = [];
  const repository = {
    async find(
      tenantId,
      invitationKey,
    ) {
      calls.push({
        operation: "find",
        tenantId,
        invitationKey,
      });
      return current;
    },
    async request(command) {
      calls.push({
        operation: "request",
        command,
      });
      return requestResult;
    },
    async transition(command) {
      calls.push({
        operation:
          "transition",
        command,
      });
      return transitionResult;
    },
  };
  const publisher = {
    async publish(
      tenantId,
      deliveryKey,
    ) {
      calls.push({
        operation: "publish",
        tenantId,
        deliveryKey,
      });

      if (queueError) {
        throw queueError;
      }

      return {
        outcome: "queued",
      };
    },
  };

  return {
    calls,
    service:
      createTeamInvitationRequestService(
        repository,
        publisher,
        policy,
        () => requestedAt,
      ),
  };
}

test("persists and queues a new invitation using the configured TTL", async () => {
  const created =
    await invitation();
  const fixture =
    createFixture({
      requestResult: {
        outcome: "created",
        invitation: created,
      },
    });

  assert.deepEqual(
    await fixture.service.invite(
      session,
      input,
    ),
    { status: "queued" },
  );
  const requestCall =
    fixture.calls.find(
      (call) =>
        call.operation ===
        "request",
    );
  const publishCall =
    fixture.calls.find(
      (call) =>
        call.operation ===
        "publish",
    );

  assert.deepEqual(
    requestCall.command,
    {
      tenantId: 7,
      email:
        "member@example.com",
      role: "agent",
      expectedVersion: 0,
      actorExternalUserId:
        "owner-user",
      requestedAt,
      expiresAt:
        "2026-08-12T10:00:00.000Z",
    },
  );
  assert.equal(
    publishCall.deliveryKey,
    await deriveTeamInvitationDeliveryKey(
      {
        tenantId: 7,
        invitationKey:
          created.invitationKey,
        invitationVersion: 1,
      },
    ),
  );
});

test("republishes the existing outbox for an exact pending retry", async () => {
  const current =
    await invitation();
  const fixture =
    createFixture({
      current,
    });

  assert.deepEqual(
    await fixture.service.invite(
      session,
      input,
    ),
    {
      status:
        "already-pending",
    },
  );
  assert.equal(
    fixture.calls.some(
      (call) =>
        call.operation ===
        "request",
    ),
    false,
  );
  assert.equal(
    fixture.calls.filter(
      (call) =>
        call.operation ===
        "publish",
    ).length,
    1,
  );
});

test("re-requests only a terminal invitation when policy explicitly allows it", async () => {
  const current =
    await invitation({
      status: "revoked",
      version: 2,
    });
  const updated =
    await invitation({
      status: "pending",
      version: 3,
    });
  const fixture =
    createFixture({
      current,
      requestResult: {
        outcome: "updated",
        invitation: updated,
      },
    });

  assert.deepEqual(
    await fixture.service.invite(
      session,
      input,
    ),
    { status: "queued" },
  );
  assert.equal(
    fixture.calls.find(
      (call) =>
        call.operation ===
        "request",
    ).command.expectedVersion,
    2,
  );
});

test("expires a due invitation before an allowed re-request", async () => {
  const current =
    await invitation({
      expiresAt:
        requestedAt,
    });
  const expired =
    await invitation({
      status: "expired",
      version: 2,
      expiresAt:
        requestedAt,
    });
  const renewed =
    await invitation({
      version: 3,
    });
  const fixture =
    createFixture({
      current,
      transitionResult: {
        outcome: "updated",
        invitation: expired,
      },
      requestResult: {
        outcome: "updated",
        invitation: renewed,
      },
    });

  assert.deepEqual(
    await fixture.service.invite(
      session,
      input,
    ),
    { status: "queued" },
  );
  assert.deepEqual(
    fixture.calls
      .filter((call) =>
        [
          "transition",
          "request",
          "publish",
        ].includes(
          call.operation,
        ),
      )
      .map(
        (call) =>
          call.operation,
      ),
    [
      "transition",
      "request",
      "publish",
    ],
  );
  assert.equal(
    fixture.calls.find(
      (call) =>
        call.operation ===
        "request",
    ).command.expectedVersion,
    2,
  );
});

test("blocks terminal re-request and pending role changes according to policy", async () => {
  const scenarios = [
    {
      current:
        await invitation({
          status: "revoked",
        }),
      policy: {
        ttlHours: 168,
        reRequest:
          "disabled",
      },
      requestInput: input,
      code:
        "REREQUEST_DISABLED",
    },
    {
      current:
        await invitation(),
      policy: {
        ttlHours: 168,
        reRequest:
          "after-terminal",
      },
      requestInput: {
        ...input,
        role: "manager",
      },
      code: "CONFLICT",
    },
  ];

  for (const scenario of scenarios) {
    const fixture =
      createFixture(
        scenario,
      );

    await assert.rejects(
      fixture.service.invite(
        session,
        scenario.requestInput,
      ),
      (error) =>
        error instanceof
          TeamInvitationRequestError &&
        error.code ===
          scenario.code,
    );
    assert.equal(
      fixture.calls.some(
        (call) =>
          call.operation ===
          "publish",
      ),
      false,
    );
  }
});

test("keeps persisted outbox state retryable when queue publication fails", async () => {
  const created =
    await invitation();
  const fixture =
    createFixture({
      requestResult: {
        outcome: "created",
        invitation: created,
      },
      queueError:
        new Error(
          "private queue failure",
        ),
    });

  await assert.rejects(
    fixture.service.invite(
      session,
      input,
    ),
    (error) =>
      error instanceof
        TeamInvitationRequestError &&
      error.code ===
        "QUEUE_UNAVAILABLE" &&
      !/private/i.test(
        error.message,
      ),
  );
  assert.equal(
    fixture.calls.some(
      (call) =>
        call.operation ===
        "request",
    ),
    true,
  );
});

test("maps repository conflicts and failures to bounded errors", async () => {
  for (
    const requestResult of [
      {
        outcome: "conflict",
        invitation:
          await invitation(),
      },
      {
        outcome:
          "invalid-transition",
        invitation:
          await invitation(),
      },
    ]
  ) {
    const fixture =
      createFixture({
        requestResult,
      });

    await assert.rejects(
      fixture.service.invite(
        session,
        input,
      ),
      (error) =>
        error instanceof
          TeamInvitationRequestError &&
        error.code ===
          "CONFLICT",
    );
  }
});

test("rejects permission and malformed input before persistence", async () => {
  const fixture =
    createFixture();

  await assert.rejects(
    fixture.service.invite(
      {
        ...session,
        role: "agent",
      },
      input,
    ),
    TenantSessionError,
  );
  await assert.rejects(
    fixture.service.invite(
      session,
      {
        ...input,
        tenantId: 7,
      },
    ),
    TeamInvitationRequestInputError,
  );
  assert.deepEqual(
    fixture.calls,
    [],
  );
});
