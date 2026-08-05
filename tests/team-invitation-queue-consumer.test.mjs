import assert from "node:assert/strict";
import test from "node:test";

import {
  QueueBackpressureError,
} from "../server/operations/queueBackpressure.ts";
import {
  createTeamInvitationQueueConsumer,
} from "../server/team/teamInvitationQueueConsumer.ts";
import {
  createTeamInvitationQueueMessage,
} from "../server/team/teamInvitationQueueMessage.ts";

const deliveryKey =
  `team_invitation_delivery_v1_${"c".repeat(64)}`;

function delivery(body) {
  const calls = [];

  return {
    calls,
    value: {
      id: "queue-message-id",
      timestamp:
        new Date(
          "2026-08-05T10:00:00.000Z",
        ),
      attempts: 1,
      body,
      ack() {
        calls.push({
          operation: "ack",
        });
      },
      retry(options) {
        calls.push({
          operation: "retry",
          options,
        });
      },
    },
  };
}

function emptyResult() {
  return {
    submitted: 0,
    blocked: 0,
    ambiguous: 0,
    duplicates: 0,
    cancelled: 0,
    discarded: 0,
    retried: 0,
  };
}

test("retries a valid invitation before claim while provider is unavailable", async () => {
  const item = delivery(
    createTeamInvitationQueueMessage(
      7,
      deliveryKey,
    ),
  );
  let processorCalls = 0;
  const consumer =
    createTeamInvitationQueueConsumer(
      {
        async process() {
          processorCalls += 1;
          return {
            outcome: "submitted",
          };
        },
      },
      {
        isConfigured() {
          return false;
        },
      },
    );

  assert.deepEqual(
    await consumer.handle({
      queue:
        "connect-team-invitations",
      messages: [item.value],
    }),
    {
      ...emptyResult(),
      retried: 1,
    },
  );
  assert.deepEqual(
    item.calls,
    [
      {
        operation: "retry",
        options: {
          delaySeconds: 60,
        },
      },
    ],
  );
  assert.equal(processorCalls, 0);
});

test("acknowledges every bounded terminal dispatch outcome", async () => {
  const scenarios = [
    ["submitted", "submitted"],
    ["blocked", "blocked"],
    ["ambiguous", "ambiguous"],
    ["cancelled", "cancelled"],
    ["duplicate", "duplicates"],
    ["not-found", "duplicates"],
  ];

  for (
    const [
      outcome,
      resultKey,
    ] of scenarios
  ) {
    const item = delivery(
      createTeamInvitationQueueMessage(
        7,
        deliveryKey,
      ),
    );
    const consumer =
      createTeamInvitationQueueConsumer(
        {
          async process(
            tenantId,
            key,
          ) {
            assert.equal(
              tenantId,
              7,
            );
            assert.equal(
              key,
              deliveryKey,
            );
            return { outcome };
          },
        },
        {
          isConfigured() {
            return true;
          },
        },
      );
    const expected =
      emptyResult();

    expected[resultKey] = 1;
    assert.deepEqual(
      await consumer.handle({
        queue:
          "connect-team-invitations",
        messages: [item.value],
      }),
      expected,
    );
    assert.deepEqual(
      item.calls,
      [
        {
          operation: "ack",
        },
      ],
    );
  }
});

test("discards malformed messages and retries bounded processing failures", async () => {
  const malformed =
    delivery({
      version: 1,
      tenantId: 7,
      deliveryKey: "invalid",
    });
  const failed =
    delivery(
      createTeamInvitationQueueMessage(
        7,
        deliveryKey,
      ),
    );
  const consumer =
    createTeamInvitationQueueConsumer(
      {
        async process() {
          throw new Error(
            "private storage failure",
          );
        },
      },
      {
        isConfigured() {
          return true;
        },
      },
    );

  assert.deepEqual(
    await consumer.handle({
      queue:
        "connect-team-invitations",
      messages: [
        malformed.value,
        failed.value,
      ],
    }),
    {
      ...emptyResult(),
      discarded: 1,
      retried: 1,
    },
  );
  assert.deepEqual(
    malformed.calls,
    [
      {
        operation: "ack",
      },
    ],
  );
  assert.deepEqual(
    failed.calls,
    [
      {
        operation: "retry",
        options: {
          delaySeconds: 30,
        },
      },
    ],
  );
});

test("retries malformed provider probes and processor outcomes", async () => {
  const scenarios = [
    {
      provider: {
        isConfigured() {
          return "true";
        },
      },
      processor: {
        async process() {
          throw new Error(
            "must not run",
          );
        },
      },
      delaySeconds: 60,
    },
    {
      provider: {
        isConfigured() {
          return true;
        },
      },
      processor: {
        async process() {
          return {
            outcome: "unknown",
          };
        },
      },
      delaySeconds: 30,
    },
  ];

  for (const scenario of scenarios) {
    const item = delivery(
      createTeamInvitationQueueMessage(
        7,
        deliveryKey,
      ),
    );
    const consumer =
      createTeamInvitationQueueConsumer(
        scenario.processor,
        scenario.provider,
      );

    assert.deepEqual(
      await consumer.handle({
        queue:
          "connect-team-invitations",
        messages: [item.value],
      }),
      {
        ...emptyResult(),
        retried: 1,
      },
    );
    assert.deepEqual(
      item.calls,
      [
        {
          operation: "retry",
          options: {
            delaySeconds:
              scenario
                .delaySeconds,
          },
        },
      ],
    );
  }
});

test("rejects an invitation batch above the configured capacity", async () => {
  const consumer =
    createTeamInvitationQueueConsumer(
      {
        async process() {
          return {
            outcome: "submitted",
          };
        },
      },
      {
        isConfigured() {
          return true;
        },
      },
    );

  await assert.rejects(
    consumer.handle({
      queue:
        "connect-team-invitations",
      messages: Array.from(
        { length: 11 },
        (_, index) =>
          delivery({
            index,
          }).value,
      ),
    }),
    QueueBackpressureError,
  );
});
