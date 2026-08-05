import assert from "node:assert/strict";
import test from "node:test";

import {
  createTeamInvitationQueuePublisher,
  TeamInvitationQueuePublisherError,
} from "../server/team/teamInvitationQueuePublisher.ts";

const deliveryKey =
  `team_invitation_delivery_v1_${"b".repeat(64)}`;

test("publishes one bounded invitation identity as JSON", async () => {
  const calls = [];
  const publisher =
    createTeamInvitationQueuePublisher(
      {
        async send(body, options) {
          calls.push({
            body,
            options,
          });
        },
      },
    );

  assert.deepEqual(
    await publisher.publish(
      7,
      deliveryKey,
    ),
    { outcome: "queued" },
  );
  assert.deepEqual(calls, [
    {
      body: {
        version: 1,
        tenantId: 7,
        deliveryKey,
      },
      options: {
        contentType: "json",
      },
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(calls),
    /email|externalUserId|role/,
  );
});

test("fails closed and sanitizes invalid input or queue errors", async () => {
  for (
    const scenario of [
      {
        tenantId: "7",
        deliveryKey,
        queue: {
          async send() {
            throw new Error(
              "must not run",
            );
          },
        },
      },
      {
        tenantId: 7,
        deliveryKey,
        queue: {
          async send() {
            throw new Error(
              "private queue detail",
            );
          },
        },
      },
    ]
  ) {
    const publisher =
      createTeamInvitationQueuePublisher(
        scenario.queue,
      );

    await assert.rejects(
      publisher.publish(
        scenario.tenantId,
        scenario.deliveryKey,
      ),
      (error) =>
        error instanceof
          TeamInvitationQueuePublisherError &&
        !/private|must not run/i.test(
          error.message,
        ),
    );
  }
});
