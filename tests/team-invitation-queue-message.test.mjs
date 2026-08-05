import assert from "node:assert/strict";
import test from "node:test";

import {
  createTeamInvitationQueueMessage,
  parseTeamInvitationQueueMessage,
} from "../server/team/teamInvitationQueueMessage.ts";

const deliveryKey =
  `team_invitation_delivery_v1_${"a".repeat(64)}`;

test("creates and parses the exact invitation queue contract", () => {
  const message =
    createTeamInvitationQueueMessage(
      7,
      deliveryKey,
    );

  assert.deepEqual(message, {
    version: 1,
    tenantId: 7,
    deliveryKey,
  });
  assert.deepEqual(
    parseTeamInvitationQueueMessage(
      message,
    ),
    message,
  );
});

test("rejects malformed, cross-shape, and extended invitation queue messages", () => {
  for (
    const value of [
      null,
      [],
      {},
      {
        version: 2,
        tenantId: 7,
        deliveryKey,
      },
      {
        version: 1,
        tenantId: "7",
        deliveryKey,
      },
      {
        version: 1,
        tenantId: 7,
        deliveryKey:
          "invalid",
      },
      {
        version: 1,
        tenantId: 7,
        deliveryKey,
        email:
          "must-not-enter-queue",
      },
    ]
  ) {
    assert.equal(
      parseTeamInvitationQueueMessage(
        value,
      ),
      null,
    );
  }
});
