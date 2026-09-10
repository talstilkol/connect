import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectTeamInvitationDeadLetter,
  requeueConfirmedTeamInvitationDeadLetter,
  TeamInvitationDeadLetterError,
} from "../server/team/teamInvitationDeadLetter.ts";
import {
  createTeamInvitationQueueMessage,
} from "../server/team/teamInvitationQueueMessage.ts";

const deliveryKey =
  `team_invitation_delivery_v1_${"c".repeat(64)}`;

function deadLetterDelivery(overrides = {}) {
  const actions = [];

  return {
    actions,
    delivery: {
      id: "invitation-queue-message-id",
      timestamp: new Date(
        "2026-08-16T10:00:00.000Z",
      ),
      attempts: 11,
      body: createTeamInvitationQueueMessage(
        7,
        deliveryKey,
      ),
      ack() {
        actions.push("ack");
      },
      retry() {
        actions.push("retry");
      },
      ...overrides,
    },
  };
}

test("inspects invitation dead-letter metadata without exposing its scope", async () => {
  const fixture = deadLetterDelivery();
  const inspection =
    await inspectTeamInvitationDeadLetter(
      fixture.delivery,
    );

  assert.equal(inspection.status, "replayable");
  assert.equal(
    inspection.messageId,
    "invitation-queue-message-id",
  );
  assert.equal(
    inspection.enqueuedAt,
    "2026-08-16T10:00:00.000Z",
  );
  assert.equal(inspection.attempts, 11);
  assert.match(
    inspection.recoveryKey,
    /^[0-9a-f]{64}$/,
  );
  assert.equal(
    Object.hasOwn(inspection, "tenantId"),
    false,
  );
  assert.equal(
    Object.hasOwn(inspection, "deliveryKey"),
    false,
  );
});

test("rejects malformed invitation dead-letter metadata", async () => {
  const fixture = deadLetterDelivery({
    id: " invalid ",
    timestamp: new Date("invalid"),
    attempts: 0,
    body: null,
  });

  assert.deepEqual(
    await inspectTeamInvitationDeadLetter(
      fixture.delivery,
    ),
    {
      status: "invalid",
      messageId: null,
      enqueuedAt: null,
      attempts: null,
      reason: "INVALID_QUEUE_MESSAGE",
    },
  );
});

test("requeues only an explicitly confirmed invitation dead letter", async () => {
  const fixture = deadLetterDelivery();
  const inspection =
    await inspectTeamInvitationDeadLetter(
      fixture.delivery,
    );
  const sent = [];
  const result =
    await requeueConfirmedTeamInvitationDeadLetter(
      fixture.delivery,
      {
        async send(body, options) {
          sent.push({ body, options });
        },
      },
      inspection.recoveryKey,
    );

  assert.deepEqual(result, {
    outcome: "requeued",
    recoveryKey: inspection.recoveryKey,
  });
  assert.deepEqual(sent, [
    {
      body: {
        version: 1,
        tenantId: 7,
        deliveryKey,
      },
      options: { contentType: "json" },
    },
  ]);
  assert.deepEqual(fixture.actions, ["ack"]);
});

test("keeps an invitation dead letter unacknowledged on confirmation or queue failure", async () => {
  const scenarios = [
    {
      expectedRecoveryKey: "invalid",
      queue: {
        async send() {
          throw new Error("must not requeue");
        },
      },
      code: "INVALID_CONFIRMATION",
    },
    {
      expectedRecoveryKey: "0".repeat(64),
      queue: {
        async send() {},
      },
      code: "CONFIRMATION_MISMATCH",
    },
    {
      expectedRecoveryKey: null,
      queue: {
        async send() {
          throw new Error(
            "private invitation queue failure",
          );
        },
      },
      code: "REQUEUE_UNAVAILABLE",
    },
  ];

  for (const scenario of scenarios) {
    const fixture = deadLetterDelivery();
    const inspection =
      await inspectTeamInvitationDeadLetter(
        fixture.delivery,
      );

    await assert.rejects(
      requeueConfirmedTeamInvitationDeadLetter(
        fixture.delivery,
        scenario.queue,
        scenario.expectedRecoveryKey ??
          inspection.recoveryKey,
      ),
      (error) =>
        error instanceof
          TeamInvitationDeadLetterError &&
        error.code === scenario.code,
    );
    assert.deepEqual(fixture.actions, []);
  }
});
